import { z } from "zod";

/**
 * Every value the user can influence carries its provenance. This is what makes
 * "reset to the company-asset suggestion" (§10.2) possible, lets the UI show what a
 * preset changed, and leaves room for the public-submission import in §15A.8.
 */
export const ValueSource = z.enum([
  "default", // shipped default, never touched
  "extracted", // derived from an uploaded asset
  "preset", // came from applying a design preset (§14)
  "user", // explicitly set by a human
  "imported", // carried in from a public playground submission
]);
export type ValueSource = z.infer<typeof ValueSource>;

/** A value plus where it came from. */
export const tracked = <T extends z.ZodTypeAny>(inner: T) =>
  z.object({ value: inner, source: ValueSource.default("default") });

export type Tracked<T> = { value: T; source: ValueSource };

export const track = <T>(value: T, source: ValueSource = "default"): Tracked<T> => ({
  value,
  source,
});

/**
 * Colours are stored as OKLCH triples rather than hex so tonal ramps, contrast maths
 * and gamut mapping all operate on the same representation the export emits (§10.2).
 * l: 0..1, c: 0..0.4ish, h: 0..360 degrees.
 */
export const Oklch = z.object({
  l: z.number().min(0).max(1),
  c: z.number().min(0),
  h: z.number().min(0).max(360),
  alpha: z.number().min(0).max(1).optional(),
});
export type Oklch = z.infer<typeof Oklch>;

/** The 11 rungs of a primitive tonal scale (§10.2). */
export const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type ScaleStep = (typeof SCALE_STEPS)[number];

export const ColorScale = z.object({
  50: Oklch,
  100: Oklch,
  200: Oklch,
  300: Oklch,
  400: Oklch,
  500: Oklch,
  600: Oklch,
  700: Oklch,
  800: Oklch,
  900: Oklch,
  950: Oklch,
});
export type ColorScale = z.infer<typeof ColorScale>;

/** A semantic token points at a rung of a primitive scale, or pins a raw colour. */
export const SemanticRef = z.union([
  z.object({ kind: z.literal("scale"), scale: z.string(), step: z.number() }),
  z.object({ kind: z.literal("raw"), color: Oklch }),
]);
export type SemanticRef = z.infer<typeof SemanticRef>;

/** The 11 required semantic tokens from §10.2. */
export const SEMANTIC_TOKENS = [
  "primary",
  "secondary",
  "accent",
  "background",
  "surface",
  "foreground",
  "muted",
  "border",
  "success",
  "warning",
  "error",
] as const;
export type SemanticToken = (typeof SEMANTIC_TOKENS)[number];

export const SemanticMap = z.object(
  Object.fromEntries(SEMANTIC_TOKENS.map((t) => [t, SemanticRef])) as Record<
    SemanticToken,
    typeof SemanticRef
  >,
);
export type SemanticMap = z.infer<typeof SemanticMap>;
