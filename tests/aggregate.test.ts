import { describe, expect, it } from "vitest";
import { aggregateAssetColors } from "@/color/aggregate";
import { fromCss, toHex } from "@/color/oklch";
import type { AssetEntry } from "@/schema/assets";

const asset = (over: Partial<AssetEntry>): AssetEntry => ({
  file: "x", kind: "other", mime: "image/svg+xml", bytes: 100, hash: Math.random().toString(),
  ...over,
});

describe("colour aggregation", () => {
  it("returns nothing when no asset has detected colours", () => {
    expect(aggregateAssetColors([asset({ kind: "photography" })])).toEqual([]);
  });

  it("ranks a logo colour above a decorative colour of equal rank", () => {
    const brandBlue = fromCss("#1d4ed8")!;
    const decorPink = fromCss("#ec4899")!;
    const result = aggregateAssetColors([
      asset({ kind: "logo", detectedColors: [brandBlue] }),
      asset({ kind: "photography", detectedColors: [decorPink] }),
    ]);
    expect(toHex(result[0]!.color).toLowerCase()).toBe(toHex(brandBlue).toLowerCase());
  });

  it("lets a colour recurring across many assets outrank a single high-weight logo colour", () => {
    const logoOnce = fromCss("#1d4ed8")!;
    const recurring = fromCss("#16a34a")!;
    const result = aggregateAssetColors([
      asset({ kind: "logo", detectedColors: [logoOnce] }),
      asset({ kind: "photography", detectedColors: [recurring] }),
      asset({ kind: "illustration", detectedColors: [recurring] }),
      asset({ kind: "hero-image", detectedColors: [recurring] }),
      asset({ kind: "product-screenshot", detectedColors: [recurring] }),
    ]);
    // logo weight 3 vs four assets each contributing ~0.7-1.0: recurrence wins.
    expect(toHex(result[0]!.color).toLowerCase()).toBe(toHex(recurring).toLowerCase());
  });

  it("merges near-identical colours from different assets into one ranked entry", () => {
    const a = fromCss("#1d4ed8")!;
    const bNear = { l: a.l + 0.01, c: a.c + 0.005, h: a.h + 2 };
    const result = aggregateAssetColors([
      asset({ kind: "logo", detectedColors: [a] }),
      asset({ kind: "logo-mark", detectedColors: [bNear] }),
    ]);
    // Two near-duplicate inputs collapse to one output colour, not two.
    expect(result).toHaveLength(1);
  });

  it("keeps visually distinct colours from a very different asset", () => {
    const brandBlue = fromCss("#1d4ed8")!;
    const gradientOrange = fromCss("#f97316")!;
    const result = aggregateAssetColors([
      asset({ kind: "logo", detectedColors: [brandBlue] }),
      asset({ kind: "other", detectedColors: [gradientOrange] }),
    ]);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it("weights ignore fonts, which never carry colour", () => {
    const result = aggregateAssetColors([asset({ kind: "font", detectedColors: undefined })]);
    expect(result).toEqual([]);
  });

  it("caps output at maxColors", () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      asset({ kind: "other", detectedColors: [{ l: 0.5, c: 0.15, h: i * 30 }] }),
    );
    expect(aggregateAssetColors(many, 4)).toHaveLength(4);
  });

  it("normalises weights to sum to roughly 1", () => {
    const result = aggregateAssetColors([
      asset({ kind: "logo", detectedColors: [fromCss("#1d4ed8")!] }),
      asset({ kind: "other", detectedColors: [fromCss("#f97316")!] }),
    ]);
    const total = result.reduce((sum, c) => sum + c.weight, 0);
    expect(total).toBeCloseTo(1, 5);
  });
});
