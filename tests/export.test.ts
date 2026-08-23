import { describe, expect, it } from "vitest";
import { buildExport, toZip, validate } from "@/export/bundle";
import { stableStringify, assertDeterministic } from "@/export/serialize";
import { generateCss } from "@/export/css";
import { DesignTokens } from "@/schema/tokens";
import { fixtureProject } from "./fixture";

describe("deterministic export", () => {
  it("produces byte-identical files across runs", () => {
    const a = buildExport(fixtureProject());
    const b = buildExport(fixtureProject());
    expect(a.files.map((f) => f.path)).toEqual(b.files.map((f) => f.path));
    for (let i = 0; i < a.files.length; i++) {
      expect(a.files[i]!.content).toEqual(b.files[i]!.content);
    }
  });

  it("produces byte-identical zip archives", () => {
    const a = toZip(buildExport(fixtureProject()).files);
    const b = toZip(buildExport(fixtureProject()).files);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it("sorts object keys at every depth", () => {
    const out = stableStringify({ b: 1, a: { d: 2, c: 3 } });
    expect(out).toBe('{\n  "a": {\n    "c": 3,\n    "d": 2\n  },\n  "b": 1\n}\n');
  });

  it("emits files in a stable order", () => {
    const paths = buildExport(fixtureProject()).files.map((f) => f.path);
    expect(paths).toEqual([...paths].sort());
  });

  it("rejects time-varying fields that would break reproducibility", () => {
    expect(() => assertDeterministic({ nested: { generatedAt: 1 } })).toThrow(/generatedAt/);
    expect(() => assertDeterministic({ ok: 1 })).not.toThrow();
  });

  it("normalises -0 so it never serialises as \"-0\"", () => {
    expect(stableStringify({ v: -0 })).toBe('{\n  "v": 0\n}\n');
  });
});

describe("export contents", () => {
  it("emits the three schema files plus generated css", () => {
    const paths = buildExport(fixtureProject()).files.map((f) => f.path);
    expect(paths).toContain("design/design.tokens.json");
    expect(paths).toContain("design/site.recipe.json");
    expect(paths).toContain("design/asset-manifest.json");
    expect(paths).toContain("design/globals.css");
  });

  it("round-trips tokens through the schema", () => {
    const { files } = buildExport(fixtureProject());
    const raw = files.find((f) => f.path === "design/design.tokens.json")!.content as string;
    expect(DesignTokens.safeParse(JSON.parse(raw)).success).toBe(true);
  });

  it("validates a default project without errors", () => {
    const errors = validate(fixtureProject()).filter((i) => i.severity === "error");
    expect(errors).toEqual([]);
  });
});

describe("globals.css generation", () => {
  const css = generateCss(fixtureProject().tokens);

  it("emits every semantic token", () => {
    for (const token of ["primary", "background", "foreground", "border", "error"]) {
      expect(css).toContain(`--dp-color-${token}:`);
    }
  });

  it("namespaces variables so project tokens cannot collide with playground chrome", () => {
    // A bare --primary would collide with shadcn's own variables.
    expect(css).not.toMatch(/^\s*--primary:/m);
  });

  it("emits primitive ramps as well as semantic tokens", () => {
    expect(css).toContain("--dp-color-brand-500:");
    expect(css).toContain("--dp-color-neutral-950:");
  });

  it("emits a dark theme block when a dark theme exists", () => {
    expect(css).toContain(".dark {");
    expect(css).toContain("prefers-color-scheme: dark");
  });

  it("includes a reduced-motion fallback", () => {
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("--dp-motion-distance: 0px;");
  });

  it("emits the full type scale", () => {
    expect(css).toContain("--dp-text-display-xl:");
    expect(css).toContain("--dp-text-caption:");
  });

  it("quotes font families that need it", () => {
    expect(css).toContain('"JetBrains Mono"');
  });
});
