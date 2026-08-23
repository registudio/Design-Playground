import type { RecipeBinding } from "@/schema/recipe";

/**
 * The motion recipe catalogue (§12).
 *
 * Each recipe declares its engine and the properties it drives. The engine is chosen
 * here, not by the user, following §12.6: Motion for React-state-driven transitions,
 * hovers, springs and simple entrances; GSAP for ScrollTrigger, pinning, scrubbing and
 * multi-element choreography.
 *
 * Declaring `properties` is what makes the "never animate the same property with two
 * engines" rule checkable instead of merely stated.
 */

export const MOTION_PROFILES = ["none", "subtle", "professional", "expressive", "cinematic"] as const;

export interface MotionRecipe {
  id: string;
  label: string;
  binding: RecipeBinding;
}

export const ENTRANCE_RECIPES: MotionRecipe[] = [
  {
    id: "animation.entrance.none",
    label: "None",
    binding: { recipe: "animation.entrance.none", engine: "css", properties: [], reducedMotion: "none" },
  },
  {
    id: "animation.entrance.fade",
    label: "Fade",
    binding: { recipe: "animation.entrance.fade", engine: "motion", properties: ["opacity"], reducedMotion: "instant" },
  },
  {
    id: "animation.entrance.fade-up",
    label: "Fade up",
    binding: { recipe: "animation.entrance.fade-up", engine: "motion", properties: ["opacity", "y"], reducedMotion: "fade-only" },
  },
  {
    id: "animation.entrance.blur-in",
    label: "Blur in",
    binding: { recipe: "animation.entrance.blur-in", engine: "motion", properties: ["opacity", "filter"], reducedMotion: "fade-only" },
  },
  {
    id: "animation.entrance.scale",
    label: "Scale",
    binding: { recipe: "animation.entrance.scale", engine: "motion", properties: ["opacity", "scale"], reducedMotion: "fade-only" },
  },
  {
    id: "animation.text.mask-reveal",
    // Character-level choreography is squarely GSAP territory (§12.6).
    label: "Mask reveal",
    binding: { recipe: "animation.text.mask-reveal", engine: "gsap", properties: ["clipPath", "y"], reducedMotion: "fade-only" },
  },
];

export const HOVER_RECIPES: Record<"button" | "card", MotionRecipe[]> = {
  button: [
    { id: "animation.button.none", label: "None", binding: { recipe: "animation.button.none", engine: "css", properties: [], reducedMotion: "none" } },
    { id: "animation.button.arrow-shift", label: "Arrow shift", binding: { recipe: "animation.button.arrow-shift", engine: "motion", properties: ["x"], reducedMotion: "none" } },
    { id: "animation.button.fill", label: "Fill", binding: { recipe: "animation.button.fill", engine: "css", properties: ["backgroundColor"], reducedMotion: "none" } },
    { id: "animation.button.scale", label: "Scale", binding: { recipe: "animation.button.scale", engine: "motion", properties: ["scale"], reducedMotion: "none" } },
    { id: "animation.button.magnetic", label: "Magnetic", binding: { recipe: "animation.button.magnetic", engine: "motion", properties: ["x", "y"], reducedMotion: "none" } },
    { id: "animation.button.glow", label: "Glow", binding: { recipe: "animation.button.glow", engine: "css", properties: ["boxShadow"], reducedMotion: "none" } },
  ],
  card: [
    { id: "animation.card.none", label: "None", binding: { recipe: "animation.card.none", engine: "css", properties: [], reducedMotion: "none" } },
    { id: "animation.card.lift", label: "Lift", binding: { recipe: "animation.card.lift", engine: "motion", properties: ["y", "boxShadow"], reducedMotion: "none" } },
    { id: "animation.card.tilt", label: "Tilt", binding: { recipe: "animation.card.tilt", engine: "motion", properties: ["rotateX", "rotateY"], reducedMotion: "none" } },
    { id: "animation.card.image-zoom", label: "Image zoom", binding: { recipe: "animation.card.image-zoom", engine: "css", properties: ["scale"], reducedMotion: "none" } },
    { id: "animation.card.border-reveal", label: "Border reveal", binding: { recipe: "animation.card.border-reveal", engine: "css", properties: ["borderColor"], reducedMotion: "none" } },
    { id: "animation.card.spotlight", label: "Spotlight", binding: { recipe: "animation.card.spotlight", engine: "gsap", properties: ["backgroundImage"], reducedMotion: "none" } },
  ],
};

export const SCROLL_RECIPES: MotionRecipe[] = [
  { id: "animation.scroll.none", label: "None", binding: { recipe: "animation.scroll.none", engine: "css", properties: [], reducedMotion: "none" } },
  { id: "animation.scroll.reveal", label: "Reveal on scroll", binding: { recipe: "animation.scroll.reveal", engine: "gsap", properties: ["opacity", "y"], reducedMotion: "instant" } },
  { id: "animation.scroll.parallax", label: "Parallax", binding: { recipe: "animation.scroll.parallax", engine: "gsap", properties: ["y"], reducedMotion: "instant" } },
  { id: "animation.scroll.progress", label: "Scroll progress", binding: { recipe: "animation.scroll.progress", engine: "gsap", properties: ["scaleX"], reducedMotion: "none" } },
  { id: "animation.scroll.pinned", label: "Pinned section", binding: { recipe: "animation.scroll.pinned", engine: "gsap", properties: ["position", "y"], reducedMotion: "instant" } },
  { id: "animation.scroll.sticky", label: "Sticky transition", binding: { recipe: "animation.scroll.sticky", engine: "gsap", properties: ["opacity", "scale"], reducedMotion: "instant" } },
  { id: "animation.scroll.scrubbed", label: "Scrubbed sequence", binding: { recipe: "animation.scroll.scrubbed", engine: "gsap", properties: ["y", "rotate"], reducedMotion: "instant" } },
  { id: "animation.scroll.horizontal", label: "Horizontal sequence", binding: { recipe: "animation.scroll.horizontal", engine: "gsap", properties: ["x"], reducedMotion: "instant" } },
];

export const ALL_RECIPES = [
  ...ENTRANCE_RECIPES,
  ...HOVER_RECIPES.button,
  ...HOVER_RECIPES.card,
  ...SCROLL_RECIPES,
];
