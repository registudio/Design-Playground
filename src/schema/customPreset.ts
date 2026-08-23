import { z } from "zod";
import { ColorTokens, GeometryTokens, ImageryTokens, LayoutTokens, TypographyTokens } from "./tokens";
import { ComponentChoices, MotionChoices } from "./recipe";

/**
 * A user-savable custom preset (§Wave D Templating-1): captures the current design's
 * concrete values for each facet, rather than the parametric "seed colour + ratios"
 * recipe the built-in presets use. After a few real client projects an agency wants to
 * save its own starting points — this is that, built directly from a live project
 * instead of requiring someone to reverse-engineer a new `definePreset` config.
 */
export const CustomPreset = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().default(""),
  createdAt: z.number(),
  facets: z.object({
    palette: ColorTokens,
    typography: TypographyTokens,
    geometry: z.object({
      radius: GeometryTokens.shape.radius,
      borderWidth: GeometryTokens.shape.borderWidth,
      layout: LayoutTokens,
      imagery: ImageryTokens,
    }),
    components: ComponentChoices,
    motion: MotionChoices,
  }),
});
export type CustomPreset = z.infer<typeof CustomPreset>;
