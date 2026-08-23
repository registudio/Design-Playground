import type { Oklch } from "@/schema/primitives";
import type { DetectedColor, LogoAnalysis } from "@/schema/project";
import { fromCss, normalize, toSrgb } from "./oklch";

/**
 * Logo colour extraction (§10.1).
 *
 * The spec treats this as one feature, but SVG and raster are genuinely different
 * problems and SVG is by far the better path: reading fill/stroke attributes yields
 * the *exact* brand colours the designer specified, with no antialiasing artefacts
 * and no clustering guesswork. Raster quantization is the fallback, not the default.
 */

const NEUTRAL_CHROMA = 0.03;

/** Colours a designer never means as brand colours. */
function classify(color: Oklch): DetectedColor["role"] {
  if (color.c < NEUTRAL_CHROMA || color.l > 0.95 || color.l < 0.08) return "neutral";
  return "dominant";
}

// ---------------------------------------------------------------------------
// SVG
// ---------------------------------------------------------------------------

const PAINT_ATTRS = ["fill", "stroke", "stop-color", "flood-color", "lighting-color"];

/**
 * Pulls paint values out of SVG markup. Handles both presentation attributes and
 * inline `style` declarations, and follows `<style>` blocks for simple declarations.
 */
export function extractFromSvg(svgText: string): DetectedColor[] {
  const counts = new Map<string, { color: Oklch; hits: number }>();

  const record = (raw: string) => {
    const value = raw.trim();
    if (!value || value === "none" || value === "transparent" || value.startsWith("url(")) return;
    if (value === "currentColor" || value === "inherit") return;
    const color = fromCss(value);
    if (!color) return;
    const key = `${color.l}|${color.c}|${color.h}`;
    const existing = counts.get(key);
    if (existing) existing.hits += 1;
    else counts.set(key, { color, hits: 1 });
  };

  // Presentation attributes: fill="#0af"
  for (const attr of PAINT_ATTRS) {
    const re = new RegExp(`\\b${attr}\\s*=\\s*["']([^"']+)["']`, "gi");
    for (const m of svgText.matchAll(re)) record(m[1]!);
  }
  // Declarations in style="" and <style> blocks: fill: #0af
  for (const attr of PAINT_ATTRS) {
    const re = new RegExp(`\\b${attr}\\s*:\\s*([^;"'}]+)`, "gi");
    for (const m of svgText.matchAll(re)) record(m[1]!);
  }

  const total = [...counts.values()].reduce((sum, e) => sum + e.hits, 0) || 1;
  return [...counts.values()]
    .sort((a, b) => b.hits - a.hits)
    .map((entry, index) => ({
      color: entry.color,
      weight: entry.hits / total,
      role: classify(entry.color),
      label: describe(entry.color, index),
    }));
}

// ---------------------------------------------------------------------------
// Raster
// ---------------------------------------------------------------------------

/**
 * Median-cut quantization over decoded pixels. Fully transparent and near-transparent
 * pixels are dropped — a logo on a transparent canvas is mostly nothing, and counting
 * those pixels would swamp the real brand colours.
 */
export function extractFromPixels(
  pixels: Uint8ClampedArray,
  maxColors = 6,
): { colors: DetectedColor[]; hasTransparency: boolean } {
  const samples: Array<[number, number, number]> = [];
  let transparent = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3]!;
    if (alpha < 200) {
      if (alpha < 16) transparent++;
      continue;
    }
    samples.push([pixels[i]!, pixels[i + 1]!, pixels[i + 2]!]);
  }

  if (samples.length === 0) {
    return { colors: [], hasTransparency: transparent > 0 };
  }

  const buckets = medianCut(samples, maxColors);
  const total = buckets.reduce((sum, b) => sum + b.length, 0) || 1;

  const colors = buckets
    .filter((b) => b.length > 0)
    .map((bucket) => {
      const avg = bucket.reduce(
        (acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]] as [number, number, number],
        [0, 0, 0] as [number, number, number],
      );
      const n = bucket.length;
      const hex = rgbToHex(avg[0] / n, avg[1] / n, avg[2] / n);
      return { color: fromCss(hex)!, weight: n / total };
    })
    .sort((a, b) => b.weight - a.weight)
    .map((entry, index) => ({
      color: entry.color,
      weight: entry.weight,
      role: classify(entry.color),
      label: describe(entry.color, index),
    }));

  return { colors, hasTransparency: transparent > 0 };
}

function medianCut(
  samples: Array<[number, number, number]>,
  target: number,
): Array<Array<[number, number, number]>> {
  let buckets = [samples];
  while (buckets.length < target) {
    // Split whichever bucket currently spans the widest single channel.
    let widestIndex = -1;
    let widestRange = -1;
    let widestChannel = 0;

    buckets.forEach((bucket, index) => {
      if (bucket.length < 2) return;
      for (let ch = 0; ch < 3; ch++) {
        let min = 255;
        let max = 0;
        for (const p of bucket) {
          const v = p[ch]!;
          if (v < min) min = v;
          if (v > max) max = v;
        }
        const range = max - min;
        if (range > widestRange) {
          widestRange = range;
          widestIndex = index;
          widestChannel = ch;
        }
      }
    });

    if (widestIndex === -1 || widestRange <= 0) break;

    const bucket = buckets[widestIndex]!;
    bucket.sort((a, b) => a[widestChannel]! - b[widestChannel]!);
    const mid = Math.floor(bucket.length / 2);
    buckets = [
      ...buckets.slice(0, widestIndex),
      bucket.slice(0, mid),
      bucket.slice(mid),
      ...buckets.slice(widestIndex + 1),
    ];
  }
  return buckets;
}

const rgbToHex = (r: number, g: number, b: number) =>
  "#" +
  [r, g, b]
    .map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0"))
    .join("");

// ---------------------------------------------------------------------------
// Analysis summary
// ---------------------------------------------------------------------------

/** Human-readable name for a detected colour, used in the swatch list of §10.1. */
export function describe(color: Oklch, index: number): string {
  if (color.c < NEUTRAL_CHROMA) {
    if (color.l > 0.92) return "White";
    if (color.l < 0.15) return "Black";
    return color.l > 0.5 ? "Light Grey" : "Dark Grey";
  }
  const hueName = HUE_NAMES.find((h) => color.h >= h.from && color.h < h.to)?.name ?? "Brand";
  const tone = color.l > 0.7 ? "Light " : color.l < 0.4 ? "Deep " : "";
  return index === 0 ? `Brand ${hueName}` : `${tone}${hueName}`.trim();
}

const HUE_NAMES = [
  { from: 0, to: 20, name: "Red" },
  { from: 20, to: 45, name: "Orange" },
  { from: 45, to: 80, name: "Amber" },
  { from: 80, to: 145, name: "Green" },
  { from: 145, to: 195, name: "Teal" },
  { from: 195, to: 240, name: "Cyan" },
  { from: 240, to: 280, name: "Blue" },
  { from: 280, to: 320, name: "Violet" },
  { from: 320, to: 350, name: "Magenta" },
  { from: 350, to: 361, name: "Red" },
];

/** Overall light/dark reading of the mark (§10.1). */
export function polarityOf(colors: DetectedColor[]): LogoAnalysis["polarity"] {
  const weighted = colors.reduce((sum, c) => sum + c.color.l * c.weight, 0);
  const totalWeight = colors.reduce((sum, c) => sum + c.weight, 0) || 1;
  const mean = weighted / totalWeight;
  if (mean > 0.62) return "light";
  if (mean < 0.38) return "dark";
  return "mixed";
}

/** Surfaces the mark sits comfortably on, derived from its dominant hue. */
export function suitableSurfaces(colors: DetectedColor[]): { light: Oklch; dark: Oklch } {
  const brand = colors.find((c) => c.role === "dominant")?.color;
  const hue = brand?.h ?? 250;
  return {
    light: normalize({ l: 0.99, c: 0.002, h: hue }),
    dark: normalize({ l: 0.18, c: 0.012, h: hue }),
  };
}

/** True when any sampled pixel carried partial alpha. */
export function hasAlpha(pixels: Uint8ClampedArray): boolean {
  for (let i = 3; i < pixels.length; i += 4) if (pixels[i]! < 250) return true;
  return false;
}

export { toSrgb };
