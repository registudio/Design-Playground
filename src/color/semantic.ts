import type { ColorTokens } from "@/schema/tokens";
import type { DetectedColor } from "@/schema/project";
import { SCALE_STEPS, type ColorScale, type Oklch, type ScaleStep, type SemanticMap, type SemanticToken } from "@/schema/primitives";
import { generateNeutralScale, generateScale, generateStatusScale, nearestStep } from "./scale";
import { normalize } from "./oklch";
import { contrastRatio } from "./contrast";

/**
 * Proposes an initial semantic palette from detected logo colours (§10.1).
 *
 * This only ever *proposes*. The spec is explicit that detection must never lock the
 * design, so the result is stored as a suggestion snapshot the user can return to,
 * and every assignment stays editable.
 */

export interface SuggestionInput {
  detected: DetectedColor[];
  /** Fall back to this hue when the logo yields no chromatic colours at all. */
  fallbackHue?: number;
}

/**
 * Which semantic token is the canonical owner of each generated ramp.
 *
 * Editing (or resetting) one of these regenerates the whole ramp rather than pinning a
 * single raw colour, so the scale never develops one rung that's out of step with the
 * rest. Shared by the colour editor and the reset-to-baseline path, which have to agree
 * about this or resetting would leave the ramp behind.
 */
export const OWNS_SCALE: Partial<Record<SemanticToken, string>> = {
  primary: "brand",
  accent: "accent",
  secondary: "secondary",
  success: "success",
  warning: "warning",
  error: "error",
};

/**
 * Walks a scale from `from` until a rung clears WCAG AA against `background`.
 *
 * Both themes need this and they need it in opposite directions, so it is one function
 * with a direction rather than two near-copies. "Darker" means a higher step number,
 * since SCALE_STEPS runs light to dark.
 *
 * Dark-mode primary used to be `max(floor, lightModeStep - 200)` — a fixed offset from
 * wherever the light-mode anchor happened to land. For a logo dark enough to anchor
 * near step 900 that lands on 700, which measures 2.6:1 against the generated dark
 * background: a failing, largely illegible primary button and link colour, shipped as
 * the *suggested* default. Light mode had the mirror of the same problem — a light
 * brand colour (an amber at 2.13:1) anchored wherever it fell and was never checked.
 *
 * Searching for a rung that actually clears AA, rather than assuming an offset will,
 * fixes both by construction while staying as close to the brand's own intensity as
 * the contrast requirement allows.
 */
function accessibleStep(
  scale: ColorScale,
  background: Oklch,
  from: ScaleStep,
  direction: "darker" | "lighter",
  bound: ScaleStep,
): ScaleStep {
  const ordered = direction === "darker" ? SCALE_STEPS : [...SCALE_STEPS].reverse();
  const candidates = ordered.filter((step) =>
    direction === "darker" ? step >= from && step <= bound : step <= from && step >= bound,
  );
  for (const step of candidates) {
    if (contrastRatio(scale[step], background) >= 4.5) return step;
  }
  // Every candidate failed, which an extreme hue/chroma combination can still produce.
  // The bound is the highest-contrast rung tried, so it is the closest available.
  return candidates[candidates.length - 1] ?? bound;
}

export function suggestPalette({ detected, fallbackHue = 250 }: SuggestionInput): ColorTokens {
  const chromatic = detected.filter((c) => c.role === "dominant");

  const primarySource = chromatic[0]?.color ?? normalize({ l: 0.55, c: 0.16, h: fallbackHue });
  // A distinct accent needs real hue separation, otherwise it reads as a mistake.
  const accentSource =
    chromatic.find((c) => hueDistance(c.color.h, primarySource.h) > 25)?.color ??
    normalize({ l: primarySource.l, c: primarySource.c, h: (primarySource.h + 32) % 360 });
  const secondarySource =
    chromatic[1]?.color ?? normalize({ ...primarySource, l: Math.min(0.85, primarySource.l + 0.12) });

  const scales = {
    brand: generateScale(primarySource),
    accent: generateScale(accentSource),
    secondary: generateScale(secondarySource),
    neutral: generateNeutralScale(primarySource.h),
    success: generateStatusScale("success"),
    warning: generateStatusScale("warning"),
    error: generateStatusScale("error"),
  };

  // Anchor primary at whichever rung actually holds the brand colour, then darken only
  // as far as legibility demands. Checked against `background` rather than `surface`:
  // surface is pure white and background is a step off it, so background is the
  // stricter of the two and clearing it clears both.
  const lightBackground = scales.neutral[50];
  const primaryStep = accessibleStep(
    scales.brand, lightBackground, nearestStep(primarySource.l), "darker", 900,
  );

  const light: SemanticMap = {
    primary: { kind: "scale", scale: "brand", step: primaryStep },
    secondary: { kind: "scale", scale: "secondary", step: 600 },
    accent: { kind: "scale", scale: "accent", step: 500 },
    background: { kind: "scale", scale: "neutral", step: 50 },
    surface: { kind: "raw", color: normalize({ l: 1, c: 0, h: primarySource.h }) },
    foreground: { kind: "scale", scale: "neutral", step: 950 },
    // Secondary text, so it carries the same AA duty as body text.
    muted: { kind: "scale", scale: "neutral", step: accessibleStep(scales.neutral, lightBackground, 600, "darker", 800) },
    border: { kind: "scale", scale: "neutral", step: 200 },
    success: { kind: "scale", scale: "success", step: 600 },
    warning: { kind: "scale", scale: "warning", step: 600 },
    error: { kind: "scale", scale: "error", step: 600 },
  };

  const dark = darkThemeFor(scales);

  return { scales, light: { semantic: light }, dark: { semantic: dark } };
}

/**
 * The dark theme for a set of scales: the same brand, read off the other end of each
 * ramp, with primary and muted text stepped only as far as legibility on the dark
 * background demands.
 *
 * Separate from the palette suggestion so a project can get its dark theme back — after
 * hand edits, or after leaving it out — from the scales it has now, without re-deriving
 * the palette from a logo.
 */
export function darkThemeFor(scales: Record<string, ColorScale>): SemanticMap {
  // A project's scales can be hand-built; anything missing reads from brand or neutral.
  const pick = (name: string, fallback: string) => (scales[name] ? name : fallback);
  const neutral = scales[pick("neutral", "brand")]!;
  const brand = pick("brand", "neutral");
  const darkBackground = neutral[950];
  return {
    primary: { kind: "scale", scale: brand, step: accessibleStep(scales[brand]!, darkBackground, 950, "lighter", 300) },
    secondary: { kind: "scale", scale: pick("secondary", brand), step: 400 },
    accent: { kind: "scale", scale: pick("accent", brand), step: 400 },
    background: { kind: "scale", scale: pick("neutral", brand), step: 950 },
    surface: { kind: "scale", scale: pick("neutral", brand), step: 900 },
    foreground: { kind: "scale", scale: pick("neutral", brand), step: 50 },
    // Checked against surface, not background: surface (900) is one rung lighter than
    // the dark background (950), so it is the harder of the two to sit legibly on.
    muted: { kind: "scale", scale: pick("neutral", brand), step: accessibleStep(neutral, neutral[900], 400, "lighter", 200) },
    border: { kind: "scale", scale: pick("neutral", brand), step: 800 },
    success: { kind: "scale", scale: pick("success", brand), step: 400 },
    warning: { kind: "scale", scale: pick("warning", brand), step: 400 },
    error: { kind: "scale", scale: pick("error", brand), step: 400 },
  };
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Resolves a semantic token to a concrete colour. */
export function resolveSemantic(tokens: ColorTokens, theme: "light" | "dark", key: keyof SemanticMap): Oklch {
  const themeTokens = theme === "dark" ? tokens.dark : tokens.light;
  const ref = (themeTokens ?? tokens.light).semantic[key];
  if (ref.kind === "raw") return ref.color;
  const scale = tokens.scales[ref.scale];
  if (!scale) return normalize({ l: 0.5, c: 0, h: 0 });
  return (scale as Record<number, Oklch>)[ref.step] ?? normalize({ l: 0.5, c: 0, h: 0 });
}
