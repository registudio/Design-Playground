import { describe, expect, it } from "vitest";
import { fromCss, toCss, toHex, isOutOfGamut, gamutMap, normalize } from "@/color/oklch";
import { generateScale, nearestStep, generateNeutralScale } from "@/color/scale";
import { contrastRatio, wcagLevel, evaluatePair } from "@/color/contrast";
import { extractFromSvg, extractFromPixels, polarityOf, describe as label } from "@/color/extract";
import { suggestPalette, resolveSemantic } from "@/color/semantic";
import { SCALE_STEPS } from "@/schema/primitives";

describe("oklch", () => {
  it("round-trips a hex colour", () => {
    const color = fromCss("#1d4ed8")!;
    expect(toHex(color).toLowerCase()).toBe("#1d4ed8");
  });

  it("pins hue to 0 for achromatic colours so they round-trip", () => {
    expect(fromCss("#ffffff")!.h).toBe(0);
    expect(fromCss("#000000")!.h).toBe(0);
  });

  it("normalises -0 out of existence", () => {
    expect(Object.is(normalize({ l: -0, c: -0, h: -0 }).l, -0)).toBe(false);
  });

  it("emits alpha only when it is meaningful", () => {
    expect(toCss({ l: 0.5, c: 0.1, h: 250 })).toBe("oklch(0.5 0.1 250)");
    expect(toCss({ l: 0.5, c: 0.1, h: 250, alpha: 0.5 })).toBe("oklch(0.5 0.1 250 / 0.5)");
  });

  it("maps out-of-gamut colours back into sRGB", () => {
    const wild = { l: 0.5, c: 0.4, h: 250 };
    expect(isOutOfGamut(wild)).toBe(true);
    expect(isOutOfGamut(gamutMap(wild))).toBe(false);
  });
});

describe("tonal scales", () => {
  const source = fromCss("#1d4ed8")!;
  const scale = generateScale(source);

  it("produces all eleven rungs", () => {
    expect(Object.keys(scale).map(Number).sort((a, b) => a - b)).toEqual([...SCALE_STEPS]);
  });

  it("decreases in lightness monotonically from 50 to 950", () => {
    const lightness = SCALE_STEPS.map((s) => scale[s].l);
    for (let i = 1; i < lightness.length; i++) {
      expect(lightness[i]!).toBeLessThan(lightness[i - 1]!);
    }
  });

  it("keeps every rung inside sRGB", () => {
    for (const step of SCALE_STEPS) expect(isOutOfGamut(scale[step])).toBe(false);
  });

  it("anchors the source colour verbatim at its nearest rung", () => {
    expect(scale[nearestStep(source.l)]).toEqual(normalize(source));
  });

  it("tapers chroma toward both ends rather than holding it constant", () => {
    expect(scale[50].c).toBeLessThan(scale[500].c);
    expect(scale[950].c).toBeLessThan(scale[500].c);
  });

  it("keeps neutral ramps nearly achromatic", () => {
    const neutral = generateNeutralScale(250);
    for (const step of SCALE_STEPS) expect(neutral[step].c).toBeLessThan(0.02);
  });
});

describe("contrast", () => {
  const white = fromCss("#ffffff")!;
  const black = fromCss("#000000")!;

  it("computes the known black-on-white ratio", () => {
    expect(contrastRatio(black, white)).toBeCloseTo(21, 1);
  });

  it("is symmetric", () => {
    expect(contrastRatio(black, white)).toBeCloseTo(contrastRatio(white, black), 6);
  });

  it("grades against WCAG AA", () => {
    expect(wcagLevel(black, white)).toBe("AAA");
    expect(wcagLevel(fromCss("#999999")!, white)).toBe("fail");
  });

  it("accepts 3:1 for large text only", () => {
    const grey = fromCss("#949494")!;
    expect(wcagLevel(grey, white, false)).toBe("fail");
    expect(wcagLevel(grey, white, true)).toBe("AA-large");
  });

  it("advises rather than overriding when a pair fails", () => {
    const finding = evaluatePair("Secondary text on surface", fromCss("#aaaaaa")!, white);
    expect(finding.level).toBe("fail");
    expect(finding.message).toMatch(/does not meet WCAG AA/);
    expect(finding.suggestion).toBeDefined();
  });
});

describe("logo extraction", () => {
  it("reads exact colours from SVG presentation attributes", () => {
    const svg = '<svg><path fill="#1d4ed8"/><path fill="#06b6d4"/><rect fill="none"/></svg>';
    const colors = extractFromSvg(svg);
    expect(colors).toHaveLength(2);
    expect(toHex(colors[0]!.color).toLowerCase()).toBe("#1d4ed8");
  });

  it("reads colours from inline style declarations", () => {
    const colors = extractFromSvg('<svg><path style="fill: #1d4ed8; stroke: #06b6d4"/></svg>');
    expect(colors.map((c) => toHex(c.color).toLowerCase()).sort()).toEqual(["#06b6d4", "#1d4ed8"]);
  });

  it("ignores none, transparent, currentColor and url() paints", () => {
    const svg =
      '<svg><path fill="none"/><path fill="transparent"/><path fill="currentColor"/><path fill="url(#g)"/></svg>';
    expect(extractFromSvg(svg)).toHaveLength(0);
  });

  it("weights colours by how often they appear", () => {
    const svg = '<svg><path fill="#1d4ed8"/><path fill="#1d4ed8"/><path fill="#06b6d4"/></svg>';
    const colors = extractFromSvg(svg);
    expect(colors[0]!.weight).toBeGreaterThan(colors[1]!.weight);
  });

  it("classifies near-white and low-chroma colours as neutral", () => {
    const colors = extractFromSvg('<svg><path fill="#ffffff"/><path fill="#1d4ed8"/></svg>');
    expect(colors.find((c) => label(c.color, 9) === "White")!.role).toBe("neutral");
    expect(colors.find((c) => c.role === "dominant")).toBeDefined();
  });

  it("drops transparent pixels rather than letting them swamp the palette", () => {
    // Three opaque blue pixels, one fully transparent.
    const pixels = new Uint8ClampedArray([
      29, 78, 216, 255, 29, 78, 216, 255, 29, 78, 216, 255, 0, 0, 0, 0,
    ]);
    const { colors, hasTransparency } = extractFromPixels(pixels, 2);
    expect(hasTransparency).toBe(true);
    expect(colors.length).toBeGreaterThan(0);
    expect(toHex(colors[0]!.color).toLowerCase()).toBe("#1d4ed8");
  });

  it("reports overall polarity of the mark", () => {
    const dark = extractFromSvg('<svg><path fill="#0b1020"/></svg>');
    const light = extractFromSvg('<svg><path fill="#f7f7f7"/></svg>');
    expect(polarityOf(dark)).toBe("dark");
    expect(polarityOf(light)).toBe("light");
  });
});

describe("semantic suggestion", () => {
  const blue = fromCss("#1d4ed8")!;
  const cyan = fromCss("#06b6d4")!;
  const tokens = suggestPalette({
    detected: [
      { color: blue, weight: 0.6, role: "dominant", label: "Brand Blue" },
      { color: cyan, weight: 0.4, role: "dominant", label: "Brand Cyan" },
    ],
  });

  it("maps primary to the brand colour that was detected", () => {
    expect(resolveSemantic(tokens, "light", "primary")).toEqual(normalize(blue));
  });

  it("keeps body text legible on the suggested background", () => {
    const fg = resolveSemantic(tokens, "light", "foreground");
    const bg = resolveSemantic(tokens, "light", "background");
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps body text legible in dark theme too", () => {
    const fg = resolveSemantic(tokens, "dark", "foreground");
    const bg = resolveSemantic(tokens, "dark", "background");
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("gives accent real hue separation from primary", () => {
    const primary = resolveSemantic(tokens, "light", "primary");
    const accent = resolveSemantic(tokens, "light", "accent");
    const distance = Math.abs(primary.h - accent.h) % 360;
    expect(Math.min(distance, 360 - distance)).toBeGreaterThan(20);
  });

  it("still yields a usable palette when the logo has no colours at all", () => {
    const fallback = suggestPalette({ detected: [] });
    const fg = resolveSemantic(fallback, "light", "foreground");
    const bg = resolveSemantic(fallback, "light", "background");
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("google font url", () => {
  it("deduplicates a family reused across roles", async () => {
    const { googleFontUrl } = await import("@/fonts/catalogue");
    const url = googleFontUrl([
      { family: "Space Mono", fallback: [], source: "google", weights: [400, 700], category: "mono" },
      { family: "Chivo", fallback: [], source: "google", weights: [400], category: "sans" },
      { family: "Space Mono", fallback: [], source: "google", weights: [400, 700], category: "mono" },
    ]);
    expect(url!.match(/family=Space\+Mono/g)).toHaveLength(1);
    expect(url).toContain("family=Chivo");
  });
});
