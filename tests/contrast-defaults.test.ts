import { describe, expect, it } from "vitest";
import { suggestPalette, resolveSemantic } from "@/color/semantic";
import { contrastRatio } from "@/color/contrast";
import { fromCss } from "@/color/oklch";
import { describe as describeColor } from "@/color/extract";
import type { SemanticToken } from "@/schema/primitives";

/**
 * The playground checks the user's palette against WCAG AA, so its own suggestion has
 * to clear the same bar before anyone touches it. These run the real pairs the Colour
 * editor reports on, over a spread of brand colours chosen to stress different parts of
 * the lightness range — a light amber and a near-black both used to fail, at opposite
 * ends.
 */
const PAIRS: Array<[string, SemanticToken, SemanticToken]> = [
  ["Body text on background", "foreground", "background"],
  ["Body text on surface", "foreground", "surface"],
  ["Secondary text on background", "muted", "background"],
  ["Secondary text on surface", "muted", "surface"],
  ["Button label on primary", "background", "primary"],
  ["Link on background", "primary", "background"],
];

const SEEDS = [
  ["no logo — the plain default", null],
  ["a mid blue", "#1d4ed8"],
  ["a dark teal", "#0f4c4c"],
  ["a light amber", "#d4a24e"],
  ["a near-black", "#111111"],
  ["a vivid rose", "#e11d48"],
  ["a pale mint", "#a7f3d0"],
  ["a deep violet", "#2e1065"],
] as const;

function paletteFor(hex: string | null) {
  if (!hex) return suggestPalette({ detected: [] });
  const color = fromCss(hex)!;
  return suggestPalette({
    detected: [{ color, weight: 1, role: "dominant", label: describeColor(color, 0) }],
  });
}

describe("the suggested palette clears the bar it enforces", () => {
  for (const [label, hex] of SEEDS) {
    for (const theme of ["light", "dark"] as const) {
      it(`${label}, ${theme} mode`, () => {
        const colors = paletteFor(hex);
        const failures = PAIRS.filter(([, fg, bg]) =>
          contrastRatio(resolveSemantic(colors, theme, fg), resolveSemantic(colors, theme, bg)) < 4.5,
        ).map(([name]) => name);
        expect(failures).toEqual([]);
      });
    }
  }

  it("keeps primary as close to the brand colour as legibility allows", () => {
    // A brand colour that already passes must not be darkened for no reason.
    const color = fromCss("#1d4ed8")!;
    const colors = paletteFor("#1d4ed8");
    const primary = resolveSemantic(colors, "light", "primary");
    // Same hue family, not swapped for something arbitrary.
    expect(Math.abs(primary.h - color.h)).toBeLessThan(12);
  });

  it("still clears AA when the brand colour is too light to use as-is", () => {
    // The amber case: anchoring at its own rung gave 2.13:1, so it has to darken.
    const colors = paletteFor("#d4a24e");
    const ratio = contrastRatio(
      resolveSemantic(colors, "light", "primary"),
      resolveSemantic(colors, "light", "background"),
    );
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
