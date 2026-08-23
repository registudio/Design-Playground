import { z } from "zod";
import { ColorScale, Oklch, SemanticMap } from "./primitives";

/**
 * design.tokens.json — the authoritative global visual values consumed by
 * web-stack-init to generate globals.css (§15.1).
 *
 * The example in §15.1 of the build spec is illustrative and emits only flat
 * semantic colours plus single geometry values. That is not sufficient to
 * generate a Tailwind v4 theme: §10.2 requires primitive tonal scales and an
 * optional dark theme, §10.3 requires a nine-step type scale, and §10.4
 * requires radius/spacing/shadow *scales*. This schema is the reconciled
 * superset. It stays a strict superset of the spec's example so anything
 * written against that example still resolves.
 */

export const TOKENS_SCHEMA_ID = "design-tokens/v1" as const;

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

export const ColorTheme = z.object({
  /** Semantic token -> primitive scale rung (or a pinned raw colour). */
  semantic: SemanticMap,
});

export const ColorTokens = z.object({
  /** Named primitive ramps, e.g. "brand", "neutral", "success". */
  scales: z.record(z.string(), ColorScale),
  light: ColorTheme,
  /** Dark theme is optional per §10.2 ("support optional dark theme"). */
  dark: ColorTheme.optional(),
});
export type ColorTokens = z.infer<typeof ColorTokens>;

// ---------------------------------------------------------------------------
// Typography (§10.3)
// ---------------------------------------------------------------------------

export const FontSource = z.enum(["system", "google", "custom"]);

export const FontRole = z.object({
  family: z.string(),
  /** Fallback stack appended after `family` in the generated CSS. */
  fallback: z.array(z.string()).default([]),
  source: FontSource,
  /** Weights to load. Self-hosting the build needs to know these explicitly. */
  weights: z.array(z.number().int().min(1).max(1000)).default([400]),
  /** Variable-font axis ranges, when the face is variable. */
  variable: z
    .object({ axes: z.record(z.string(), z.tuple([z.number(), z.number()])) })
    .optional(),
  subsets: z.array(z.string()).default(["latin"]),
  /**
   * Licensing note for uploaded faces (§10.1 "where licensing permits").
   * Required for `custom` so an unlicensed face cannot silently reach a client build.
   */
  license: z.string().optional(),
});
export type FontRole = z.infer<typeof FontRole>;

/** The nine steps named in §10.3. */
export const TYPE_STEPS = [
  "displayXl",
  "displayL",
  "heading1",
  "heading2",
  "heading3",
  "bodyL",
  "body",
  "small",
  "caption",
] as const;
export type TypeStep = (typeof TYPE_STEPS)[number];

export const TypeStepValue = z.object({
  /** rem */
  size: z.number().positive(),
  /** unitless multiplier */
  lineHeight: z.number().positive(),
  /** em */
  letterSpacing: z.number(),
  weight: z.number().int().min(1).max(1000),
  transform: z.enum(["none", "uppercase", "lowercase", "capitalize"]).default("none"),
  /** Which of the three global roles this step renders in. */
  role: z.enum(["display", "body", "mono"]),
});

export const TypographyTokens = z.object({
  display: FontRole,
  body: FontRole,
  mono: FontRole,
  scale: z.object(
    Object.fromEntries(TYPE_STEPS.map((s) => [s, TypeStepValue])) as Record<
      TypeStep,
      typeof TypeStepValue
    >,
  ),
});
export type TypographyTokens = z.infer<typeof TypographyTokens>;

// ---------------------------------------------------------------------------
// Geometry (§10.4)
// ---------------------------------------------------------------------------

export const RADIUS_STEPS = ["none", "sm", "md", "lg", "xl", "full"] as const;
export const SHADOW_STEPS = ["none", "sm", "md", "lg", "xl"] as const;
export const SPACING_STEPS = [
  "0", "1", "2", "3", "4", "6", "8", "12", "16", "24", "32", "48", "64",
] as const;

export const ShadowValue = z.object({
  x: z.number(),
  y: z.number(),
  blur: z.number(),
  spread: z.number(),
  color: Oklch,
});

export const GeometryTokens = z.object({
  /** rem, keyed by step name */
  radius: z.object(
    Object.fromEntries(RADIUS_STEPS.map((s) => [s, z.number().min(0)])) as Record<
      (typeof RADIUS_STEPS)[number],
      z.ZodNumber
    >,
  ),
  /** px */
  borderWidth: z.object({ hairline: z.number(), default: z.number(), thick: z.number() }),
  shadow: z.object(
    Object.fromEntries(SHADOW_STEPS.map((s) => [s, z.array(ShadowValue)])) as Record<
      (typeof SHADOW_STEPS)[number],
      z.ZodArray<typeof ShadowValue>
    >,
  ),
  /** rem */
  spacing: z.object(
    Object.fromEntries(SPACING_STEPS.map((s) => [s, z.number().min(0)])) as Record<
      (typeof SPACING_STEPS)[number],
      z.ZodNumber
    >,
  ),
});
export type GeometryTokens = z.infer<typeof GeometryTokens>;

// ---------------------------------------------------------------------------
// Layout (§10.5)
// ---------------------------------------------------------------------------

export const LayoutTokens = z.object({
  density: z.enum(["compact", "balanced", "spacious", "editorial"]),
  /** rem */
  maxWidth: z.number().positive(),
  gutter: z.number().min(0),
  sectionSpacing: z.number().min(0),
  gridColumns: z.number().int().min(1).max(24),
  alignment: z.enum(["left", "center"]),
});
export type LayoutTokens = z.infer<typeof LayoutTokens>;

// ---------------------------------------------------------------------------
// Imagery (§10.6)
// ---------------------------------------------------------------------------

export const ImageryTokens = z.object({
  radius: z.enum(RADIUS_STEPS),
  border: z.boolean(),
  shadow: z.enum(SHADOW_STEPS),
  aspectRatios: z.array(z.string()).default(["16/9", "4/3", "1/1"]),
  treatment: z.enum(["contained", "full-bleed"]),
  overlay: z.object({ enabled: z.boolean(), color: Oklch, opacity: z.number().min(0).max(1) }),
});
export type ImageryTokens = z.infer<typeof ImageryTokens>;

// ---------------------------------------------------------------------------
// Motion (§12.1) — durations/easings live in tokens; recipe choices live in site.recipe.json
// ---------------------------------------------------------------------------

export const MotionTokens = z.object({
  profile: z.enum(["none", "subtle", "professional", "expressive", "cinematic"]),
  /** ms */
  duration: z.object({ fast: z.number(), base: z.number(), slow: z.number() }),
  easing: z.object({ standard: z.string(), enter: z.string(), exit: z.string() }),
  /** px */
  distance: z.number().min(0),
  scale: z.number().min(0),
  /** ms between staggered children */
  stagger: z.number().min(0),
});
export type MotionTokens = z.infer<typeof MotionTokens>;

// ---------------------------------------------------------------------------

export const DesignTokens = z.object({
  schema: z.literal(TOKENS_SCHEMA_ID),
  colors: ColorTokens,
  typography: TypographyTokens,
  geometry: GeometryTokens,
  layout: LayoutTokens,
  imagery: ImageryTokens,
  motion: MotionTokens,
});
export type DesignTokens = z.infer<typeof DesignTokens>;
