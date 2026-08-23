import {
  converter,
  formatHex,
  parse,
  clampChroma,
  type Oklch as CuloriOklch,
} from "culori";
import type { Oklch } from "@/schema/primitives";

const toOklch = converter("oklch");
const toRgb = converter("rgb");

/** Fixed precision keeps exports byte-stable across runs (§15.7 determinism). */
export const L_PRECISION = 4;
export const C_PRECISION = 4;
export const H_PRECISION = 2;

const round = (n: number, places: number) => {
  const f = 10 ** places;
  // `+ 0` normalises -0 to 0 so serialisation never emits "-0".
  return Math.round(n * f) / f + 0;
};

/** Normalises to our stored shape with fixed precision. */
export function normalize(c: { l: number; c: number; h?: number; alpha?: number }): Oklch {
  const out: Oklch = {
    l: round(Math.min(1, Math.max(0, c.l)), L_PRECISION),
    c: round(Math.max(0, c.c), C_PRECISION),
    // Achromatic colours have undefined hue in culori; pin to 0 so it round-trips.
    h: round(((c.h ?? 0) % 360 + 360) % 360, H_PRECISION),
  };
  if (c.alpha !== undefined && c.alpha < 1) out.alpha = round(c.alpha, 3);
  return out;
}

export function fromCss(input: string): Oklch | null {
  const parsed = parse(input);
  if (!parsed) return null;
  const converted = toOklch(parsed);
  if (!converted) return null;
  return normalize(converted);
}

export function toCuloriOklch(c: Oklch): CuloriOklch {
  return { mode: "oklch", l: c.l, c: c.c, h: c.h, alpha: c.alpha };
}

/**
 * Emits an `oklch()` CSS value. Tailwind v4 and every current browser handle this
 * natively, so no sRGB fallback is emitted — keeping one representation end to end.
 */
export function toCss(c: Oklch): string {
  const base = `oklch(${c.l} ${c.c} ${c.h}`;
  return c.alpha !== undefined && c.alpha < 1 ? `${base} / ${c.alpha})` : `${base})`;
}

export function toHex(c: Oklch): string {
  return formatHex(clampChroma(toCuloriOklch(c), "oklch")) ?? "#000000";
}

/** True when the colour cannot be shown in sRGB without clipping. */
export function isOutOfGamut(c: Oklch): boolean {
  const rgb = toRgb(toCuloriOklch(c));
  if (!rgb) return true;
  const eps = 1e-4;
  return [rgb.r, rgb.g, rgb.b].some((v) => v < -eps || v > 1 + eps);
}

/**
 * Reduces chroma until the colour fits sRGB, preserving lightness and hue. This is
 * what keeps generated ramps from washing out or clipping at the light and dark ends.
 */
export function gamutMap(c: Oklch): Oklch {
  if (!isOutOfGamut(c)) return normalize(c);
  const clamped = clampChroma(toCuloriOklch(c), "oklch");
  return normalize({ l: clamped.l, c: clamped.c ?? 0, h: clamped.h ?? c.h, alpha: c.alpha });
}

/** Relative luminance (WCAG 2.1), computed from the sRGB projection. */
export function luminance(c: Oklch): number {
  const { r, g, b } = toSrgb(c);
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** sRGB channels in 0..1, gamut-clamped. Shared by the WCAG and APCA contrast maths. */
export function toSrgb(c: Oklch): { r: number; g: number; b: number } {
  const rgb = toRgb(clampChroma(toCuloriOklch(c), "oklch"));
  if (!rgb) return { r: 0, g: 0, b: 0 };
  const cl = (v: number) => Math.min(1, Math.max(0, v));
  return { r: cl(rgb.r), g: cl(rgb.g), b: cl(rgb.b) };
}
