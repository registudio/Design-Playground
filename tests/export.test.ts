import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildExport, toZip, validate } from "@/export/bundle";
import { stableStringify, assertDeterministic } from "@/export/serialize";
import { generateCss } from "@/export/css";
import { DesignTokens } from "@/schema/tokens";
import { fixtureProject } from "./fixture";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

  // Regression for a real bug: toKebab("heading2") produced "heading2" (no dash),
  // because its regex only inserted a dash at a lower->upper case boundary — a bare
  // letter-then-digit boundary never matched. preview.css's .dp-type-heading-{1,2,3}
  // selectors reference --dp-text-heading-{1,2,3} (with the dash), so the variable
  // this generated could never be found. Inside the `font` shorthand, one var() that
  // fails to resolve invalidates the whole declaration at computed-value time, so
  // every heading silently rendered at the browser default (16px/400) instead of the
  // token's real size and weight — with no visible error anywhere.
  it("emits heading step variables with the dash preview.css's selectors expect", () => {
    for (const step of ["heading-1", "heading-2", "heading-3"]) {
      expect(css).toContain(`--dp-text-${step}:`);
      expect(css).toContain(`--dp-text-${step}--line-height:`);
      expect(css).toContain(`--dp-text-${step}--letter-spacing:`);
      expect(css).toContain(`--dp-text-${step}--font-weight:`);
    }
  });

  it("emits every custom property preview.css's typography selectors reference", () => {
    const previewCss = readFileSync(join(__dirname, "..", "app", "preview", "preview.css"), "utf-8");
    const referenced = new Set(
      [...previewCss.matchAll(/var\((--dp-text-[a-z0-9-]+)\)/g)].map((m) => m[1]),
    );
    expect(referenced.size).toBeGreaterThan(0);
    for (const name of referenced) {
      expect(css, name).toContain(`${name}:`);
    }
  });
});
