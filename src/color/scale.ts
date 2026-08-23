import {
  SCALE_STEPS,
  type ColorScale,
  type Oklch,
  type ScaleStep,
} from "@/schema/primitives";
import { gamutMap, normalize } from "./oklch";

/**
 * Generates an 11-rung tonal ramp around a brand colour (§10.2).
 *
 * Approach: hold hue, walk lightness along a fixed perceptual ramp, and shape chroma
 * as a curve that peaks in the mid-tones and falls off at both ends. Naive
 * constant-chroma ramps produce muddy lights and clipped darks; the falloff is what
 * makes the 50 and 950 rungs read as tints and shades of the same colour rather than
 * as washed-out or crushed variants.
 *
 * The source colour is not merely inserted into the ramp — it is *anchored*: the rung
 * closest to its own lightness is replaced by the exact input, so the brand colour is
 * always present verbatim somewhere in the scale.
 */

/** Target lightness per rung. Slightly compressed at the ends to keep steps even. */
const LIGHTNESS: Record<ScaleStep, number> = {
  50: 0.971,
  100: 0.936,
  200: 0.885,
  300: 0.808,
  400: 0.704,
  500: 0.637,
  600: 0.577,
  700: 0.505,
  800: 0.444,
  900: 0.396,
  950: 0.269,
};

/**
 * Chroma multiplier per rung. Peaks around 500-600 where the eye tolerates the most
 * saturation, tapering toward the near-white and near-black ends.
 */
const CHROMA_CURVE: Record<ScaleStep, number> = {
  50: 0.16,
  100: 0.28,
  200: 0.48,
  300: 0.72,
  400: 0.92,
  500: 1.0,
  600: 0.98,
  700: 0.88,
  800: 0.74,
  900: 0.62,
  950: 0.42,
};

export interface ScaleOptions {
  /** Neutral ramps keep a trace of the brand hue so greys feel related to the brand. */
  neutral?: boolean;
}

export function generateScale(source: Oklch, options: ScaleOptions = {}): ColorScale {
  const { neutral = false } = options;

  // Peak chroma the ramp is shaped around. For neutrals, collapse to a faint tint.
  const peakChroma = neutral ? Math.min(source.c, 0.012) : source.c;

  const anchor = nearestStep(source.l);

  const entries = SCALE_STEPS.map((step) => {
    if (step === anchor && !neutral) {
      // Keep the brand colour exactly as chosen somewhere in its own ramp.
      return [step, normalize(source)] as const;
    }
    const candidate: Oklch = {
      l: LIGHTNESS[step],
      c: peakChroma * CHROMA_CURVE[step],
      h: source.h,
    };
    return [step, gamutMap(candidate)] as const;
  });

  return Object.fromEntries(entries) as unknown as ColorScale;
}

/** The rung whose target lightness sits closest to `l`. */
export function nearestStep(l: number): ScaleStep {
  let best: ScaleStep = 500;
  let bestDelta = Infinity;
  for (const step of SCALE_STEPS) {
    const delta = Math.abs(LIGHTNESS[step] - l);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = step;
    }
  }
  return best;
}

/** Builds the neutral ramp that backgrounds, surfaces, borders and muted text use. */
export function generateNeutralScale(brandHue: number): ColorScale {
  return generateScale({ l: 0.637, c: 0.01, h: brandHue }, { neutral: true });
}

/** Status ramps use conventional hues rather than the brand hue. */
export const STATUS_HUES = { success: 145, warning: 75, error: 27 } as const;

export function generateStatusScale(kind: keyof typeof STATUS_HUES): ColorScale {
  return generateScale({ l: 0.637, c: 0.15, h: STATUS_HUES[kind] });
}
