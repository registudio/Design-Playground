import type { ColorTokens } from "@/schema/tokens";
import type { DetectedColor } from "@/schema/project";
import type { Oklch, SemanticMap } from "@/schema/primitives";
import { generateNeutralScale, generateScale, generateStatusScale, nearestStep } from "./scale";
import { normalize } from "./oklch";

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

  // Anchor primary at whichever rung actually holds the brand colour.
  const primaryStep = nearestStep(primarySource.l);

  const light: SemanticMap = {
    primary: { kind: "scale", scale: "brand", step: primaryStep },
    secondary: { kind: "scale", scale: "secondary", step: 600 },
    accent: { kind: "scale", scale: "accent", step: 500 },
    background: { kind: "scale", scale: "neutral", step: 50 },
    surface: { kind: "raw", color: normalize({ l: 1, c: 0, h: primarySource.h }) },
    foreground: { kind: "scale", scale: "neutral", step: 950 },
    muted: { kind: "scale", scale: "neutral", step: 600 },
    border: { kind: "scale", scale: "neutral", step: 200 },
    success: { kind: "scale", scale: "success", step: 600 },
    warning: { kind: "scale", scale: "warning", step: 600 },
    error: { kind: "scale", scale: "error", step: 600 },
  };

  const dark: SemanticMap = {
    primary: { kind: "scale", scale: "brand", step: Math.max(300, primaryStep - 200) },
    secondary: { kind: "scale", scale: "secondary", step: 400 },
    accent: { kind: "scale", scale: "accent", step: 400 },
    background: { kind: "scale", scale: "neutral", step: 950 },
    surface: { kind: "scale", scale: "neutral", step: 900 },
    foreground: { kind: "scale", scale: "neutral", step: 50 },
    muted: { kind: "scale", scale: "neutral", step: 400 },
    border: { kind: "scale", scale: "neutral", step: 800 },
    success: { kind: "scale", scale: "success", step: 400 },
    warning: { kind: "scale", scale: "warning", step: 400 },
    error: { kind: "scale", scale: "error", step: 400 },
  };

  return { scales, light: { semantic: light }, dark: { semantic: dark } };
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
