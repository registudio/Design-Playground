import { describe, expect, it } from "vitest";
import { createProject } from "@/schema/defaults";
import { darkThemeFor, resolveSemantic, suggestPalette } from "@/color/semantic";
import { contrastRatio } from "@/color/contrast";
import { generateCss } from "@/export/css";
import { buildExport } from "@/export/bundle";
import { normalize } from "@/color/oklch";

describe("the dark theme", () => {
  it("regenerates exactly what the palette suggestion produces", () => {
    const primaries = new Set<string>();
    for (const hex of [{ l: 0.55, c: 0.2, h: 260 }, { l: 0.8, c: 0.15, h: 90 }, { l: 0.3, c: 0.1, h: 20 }]) {
      const palette = suggestPalette({ detected: [{ color: normalize(hex), weight: 1, role: "dominant", label: "brand" }] });
      expect(darkThemeFor(palette.scales)).toEqual(palette.dark!.semantic);
      primaries.add(JSON.stringify(palette.scales.brand![500]));
    }
    // Three different brands, so three different palettes were actually compared.
    expect(primaries.size).toBe(3);
  });

  it("keeps body and muted text legible on the dark surfaces", () => {
    const colors = createProject("Dark").tokens.colors;
    colors.dark = { semantic: darkThemeFor(colors.scales) };
    const fg = resolveSemantic(colors, "dark", "foreground");
    const muted = resolveSemantic(colors, "dark", "muted");
    for (const bg of [resolveSemantic(colors, "dark", "background"), resolveSemantic(colors, "dark", "surface")]) {
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(muted, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("copes with hand-built scales that lack the usual names", () => {
    const colors = createProject("Sparse").tokens.colors;
    const theme = darkThemeFor({ brand: colors.scales.brand!, neutral: colors.scales.neutral! });
    expect(theme.accent).toMatchObject({ kind: "scale", scale: "brand" });
    expect(theme.success).toMatchObject({ kind: "scale", scale: "brand" });
  });

  it("left out, leaves the export with no dark theme at all", () => {
    const project = createProject("Light only");
    delete project.tokens.colors.dark;
    expect(generateCss(project.tokens)).not.toMatch(/\.dark|prefers-color-scheme: dark/);
    const tokens = JSON.parse(buildExport(project).files.find(f => f.path === "design/design.tokens.json")!.content as string);
    expect(tokens.colors.dark).toBeUndefined();
  });
});
