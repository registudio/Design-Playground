import type { Oklch } from "@/schema/primitives";
import { luminance, toSrgb } from "./oklch";

/**
 * §13.3 asks for continuous contrast evaluation and names WCAG AA. WCAG 2.1 ratios
 * are what clients and auditors actually ask for, so those drive pass/fail. APCA is
 * a better perceptual model, so it is computed alongside and surfaced as advisory —
 * never as the thing that fails a build.
 */

export type ContrastLevel = "AAA" | "AA" | "AA-large" | "fail";

/** WCAG 2.1 contrast ratio, 1..21. */
export function contrastRatio(fg: Oklch, bg: Oklch): number {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

export function wcagLevel(fg: Oklch, bg: Oklch, largeText = false): ContrastLevel {
  const ratio = contrastRatio(fg, bg);
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (largeText && ratio >= 3) return "AA-large";
  return "fail";
}

/**
 * APCA (WCAG 3 draft) lightness contrast, roughly -108..106. Sign indicates polarity:
 * negative is light text on dark. Advisory only.
 */
export function apcaContrast(fg: Oklch, bg: Oklch): number {
  const Ytxt = apcaY(fg);
  const Ybg = apcaY(bg);
  const normBG = 0.56, normTXT = 0.57, revTXT = 0.62, revBG = 0.65;
  const blkThrs = 0.022, blkClmp = 1.414, scale = 1.14, loClip = 0.1, deltaYmin = 0.0005;

  const clampBlack = (y: number) => (y > blkThrs ? y : y + (blkThrs - y) ** blkClmp);
  const txt = clampBlack(Ytxt);
  const bg2 = clampBlack(Ybg);
  if (Math.abs(bg2 - txt) < deltaYmin) return 0;

  let result: number;
  if (bg2 > txt) {
    result = (bg2 ** normBG - txt ** normTXT) * scale;
    result = result < loClip ? 0 : result - 0.027;
  } else {
    result = (bg2 ** revBG - txt ** revTXT) * scale;
    result = result > -loClip ? 0 : result + 0.027;
  }
  return result * 100;
}

function apcaY(c: Oklch): number {
  // APCA uses simple 2.4 exponent sRGB, not the piecewise WCAG curve.
  const { r, g, b } = toSrgb(c);
  return 0.2126729 * r ** 2.4 + 0.7151522 * g ** 2.4 + 0.072175 * b ** 2.4;
}

export interface ContrastFinding {
  /** Dotted token path pair being compared, e.g. "muted on surface". */
  label: string;
  ratio: number;
  apca: number;
  level: ContrastLevel;
  /** Advisory message shown inline (§13.3 — warnings never auto-override). */
  message?: string;
  suggestion?: string;
}

export function evaluatePair(
  label: string,
  fg: Oklch,
  bg: Oklch,
  largeText = false,
): ContrastFinding {
  const ratio = contrastRatio(fg, bg);
  const level = wcagLevel(fg, bg, largeText);
  const finding: ContrastFinding = {
    label,
    ratio: Math.round(ratio * 100) / 100,
    apca: Math.round(apcaContrast(fg, bg) * 10) / 10,
    level,
  };
  if (level === "fail") {
    finding.message = `${label} does not meet WCAG AA (${finding.ratio}:1, needs ${
      largeText ? "3" : "4.5"
    }:1).`;
    finding.suggestion = "Darken the foreground or lighten the surface.";
  }
  return finding;
}
