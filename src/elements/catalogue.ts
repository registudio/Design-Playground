import type { ElementCategory, ElementSlotId } from "@/schema/elements";

/**
 * The element catalogue (§Wave G).
 *
 * Code, not schema, and deliberately so — see the note in schema/elements.ts. This is
 * the single list the browser UI, the preview renderer and the export all read, so an
 * element is added in exactly one place.
 *
 * Every entry declares the properties it animates and which engine drives them, for the
 * same reason motion recipes do (§12.6): so `findEngineConflicts` can catch two engines
 * fighting over one property at selection time rather than at build time. And every
 * entry declares a reduced-motion fallback, because §12.7 requires one and an element
 * that ignores the preference is not shippable to a client site.
 */

export type ElementEngine = "css" | "motion" | "gsap";

/** How an element degrades under `prefers-reduced-motion: reduce` (§12.7). */
export type ReducedMotionFallback =
  /** Renders fully but without movement — the usual choice for decorative motion. */
  | "static"
  /** Cross-fades instead of moving. */
  | "fade-only"
  /** Not rendered at all; appropriate where the whole point is the movement. */
  | "off";

export interface ElementParamDef {
  key: string;
  label: string;
  /** Rendered as a slider; the value reaches the preview as a CSS custom property. */
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
}

export interface ElementDefinition {
  id: string;
  name: string;
  category: ElementCategory;
  /** One line, shown on the catalogue card. */
  description: string;
  /** Free-text search terms beyond name/category. */
  tags: string[];
  engine: ElementEngine;
  /** CSS properties this element drives, for the engine-conflict check. */
  properties: string[];
  reducedMotion: ReducedMotionFallback;
  params?: ElementParamDef[];
  /** Marks recent additions in the browser, like the reference libraries do. */
  isNew?: boolean;
  /**
   * Costly elements (continuous rAF, large particle counts) so the UI can warn before
   * a client site ships something that pins a laptop fan.
   */
  heavy?: boolean;
}

const speed = (def = 1, label = "Speed"): ElementParamDef => ({
  key: "speed", label, min: 0.25, max: 3, step: 0.05, default: def, unit: "x",
});
const intensity = (def = 1, label = "Intensity"): ElementParamDef => ({
  key: "intensity", label, min: 0, max: 2, step: 0.05, default: def, unit: "x",
});

export const ELEMENTS: ElementDefinition[] = [
  // --- Text animations ------------------------------------------------------
  {
    id: "text.char-stagger",
    name: "Char Stagger",
    category: "text",
    description: "Letters rise into place one after another.",
    tags: ["stagger", "reveal", "letters", "entrance"],
    engine: "motion",
    properties: ["opacity", "y"],
    reducedMotion: "fade-only",
    params: [speed(), { key: "stagger", label: "Stagger", min: 0, max: 120, step: 5, default: 35, unit: "ms" }],
  },
  {
    id: "text.mask-reveal",
    name: "Masked Heading",
    category: "text",
    description: "Lines wipe up from behind a clipping mask.",
    tags: ["mask", "clip", "reveal", "editorial"],
    engine: "motion",
    properties: ["y", "clip-path"],
    reducedMotion: "fade-only",
    params: [speed()],
  },
  {
    id: "text.scramble",
    name: "Scramble Text",
    category: "text",
    description: "Characters settle out of random glyphs.",
    tags: ["decode", "glitch", "terminal", "cypher"],
    engine: "css",
    properties: ["content"],
    reducedMotion: "static",
    params: [speed()],
    isNew: true,
  },
  {
    id: "text.split-flap",
    name: "Split Flap",
    category: "text",
    description: "Departure-board flaps tumble to the final word.",
    tags: ["flip", "board", "airport", "retro"],
    engine: "css",
    properties: ["transform"],
    reducedMotion: "static",
    params: [speed()],
    isNew: true,
  },
  {
    id: "text.loop",
    name: "Text Loop",
    category: "text",
    description: "A rotating list of words in a fixed sentence.",
    tags: ["rotate", "cycle", "words", "headline"],
    engine: "css",
    properties: ["transform", "opacity"],
    reducedMotion: "static",
    params: [{ key: "hold", label: "Hold", min: 600, max: 4000, step: 100, default: 1800, unit: "ms" }],
  },
  {
    id: "text.gradient-flow",
    name: "Gradient Flow",
    category: "text",
    description: "A brand gradient drifts across the letterforms.",
    tags: ["gradient", "shimmer", "colour"],
    engine: "css",
    properties: ["background-position"],
    reducedMotion: "static",
    params: [speed(0.6)],
  },
  {
    id: "text.stroke",
    name: "Stroke Text",
    category: "text",
    description: "Outlined type that fills on entrance.",
    tags: ["outline", "hollow", "fill"],
    engine: "css",
    properties: ["background-size"],
    reducedMotion: "static",
    params: [speed()],
  },
  {
    id: "text.depth",
    name: "Depth Text",
    category: "text",
    description: "Stacked layers give the heading extruded depth.",
    tags: ["3d", "extrude", "layers", "shadow"],
    engine: "css",
    properties: ["text-shadow"],
    reducedMotion: "static",
    params: [intensity()],
    isNew: true,
  },

  // --- Backgrounds ----------------------------------------------------------
  {
    id: "bg.aurora",
    name: "Aurora",
    category: "background",
    description: "Soft brand-coloured light drifting behind content.",
    tags: ["gradient", "glow", "ambient", "northern lights"],
    engine: "css",
    properties: ["background-position", "filter"],
    reducedMotion: "static",
    params: [speed(0.5), intensity()],
  },
  {
    id: "bg.grid-glow",
    name: "Grid Glow",
    category: "background",
    description: "A technical grid with light sweeping through it.",
    tags: ["grid", "lines", "technical", "blueprint"],
    engine: "css",
    properties: ["background-position", "opacity"],
    reducedMotion: "static",
    params: [speed(0.7), { key: "size", label: "Cell size", min: 16, max: 120, step: 4, default: 48, unit: "px" }],
  },
  {
    id: "bg.dot-matrix",
    name: "Dot Matrix",
    category: "background",
    description: "A dot field that parts around the pointer.",
    tags: ["dots", "halftone", "parallax", "interactive"],
    engine: "css",
    properties: ["background-position"],
    reducedMotion: "static",
    params: [{ key: "size", label: "Spacing", min: 12, max: 64, step: 2, default: 24, unit: "px" }, intensity()],
  },
  {
    id: "bg.spotlight",
    name: "Spotlight",
    category: "background",
    description: "A soft light tracks the pointer across the section.",
    tags: ["cursor", "light", "reveal", "focus"],
    engine: "css",
    properties: ["background-position"],
    reducedMotion: "static",
    params: [intensity(), { key: "size", label: "Radius", min: 120, max: 720, step: 20, default: 340, unit: "px" }],
  },
  {
    id: "bg.starfield",
    name: "Starfield",
    category: "background",
    description: "Drifting particles with parallax depth.",
    tags: ["particles", "space", "stars", "depth"],
    engine: "css",
    properties: ["transform", "opacity"],
    reducedMotion: "static",
    params: [speed(0.6), { key: "density", label: "Density", min: 20, max: 160, step: 10, default: 70 }],
    heavy: true,
    isNew: true,
  },
  {
    id: "bg.noise",
    name: "Film Grain",
    category: "background",
    description: "Fine analogue grain over the whole surface.",
    tags: ["grain", "texture", "analogue", "film"],
    engine: "css",
    properties: ["opacity"],
    reducedMotion: "static",
    params: [intensity(0.6)],
  },
  {
    id: "bg.waves",
    name: "Waves",
    category: "background",
    description: "Slow layered waves along the section edge.",
    tags: ["waves", "organic", "flow", "curves"],
    engine: "css",
    properties: ["transform"],
    reducedMotion: "static",
    params: [speed(0.5)],
  },

  // --- Scroll ---------------------------------------------------------------
  {
    id: "scroll.smooth",
    name: "Smooth Scroll",
    category: "scroll",
    description: "Eases the page's own scrolling with inertia.",
    tags: ["lenis", "inertia", "smoothing", "momentum"],
    engine: "css",
    properties: ["scroll"],
    reducedMotion: "off",
    params: [{ key: "ease", label: "Glide", min: 0.05, max: 0.5, step: 0.01, default: 0.12 }],
    isNew: true,
  },
  {
    id: "scroll.reveal",
    name: "Scroll Reveal",
    category: "scroll",
    description: "Sections fade and rise as they enter the viewport.",
    tags: ["enter", "viewport", "fade", "appear"],
    engine: "motion",
    properties: ["opacity", "y"],
    reducedMotion: "fade-only",
    params: [speed(), { key: "distance", label: "Distance", min: 0, max: 96, step: 4, default: 28, unit: "px" }],
  },
  {
    id: "scroll.parallax",
    name: "Parallax Layers",
    category: "scroll",
    description: "Foreground and background drift at different rates.",
    tags: ["depth", "layers", "drift"],
    engine: "gsap",
    properties: ["y"],
    reducedMotion: "off",
    params: [intensity(0.6)],
  },
  {
    id: "scroll.progress",
    name: "Scroll Progress",
    category: "scroll",
    description: "A bar across the top tracking read position.",
    tags: ["indicator", "reading", "bar", "position"],
    engine: "css",
    properties: ["transform"],
    reducedMotion: "static",
  },
  {
    id: "scroll.pinned",
    name: "Pinned Section",
    category: "scroll",
    description: "A section holds while its content advances.",
    tags: ["sticky", "pin", "hold", "storytelling"],
    engine: "gsap",
    properties: ["position", "y"],
    reducedMotion: "off",
  },
  {
    id: "scroll.scrub-text",
    name: "Scrubbed Copy",
    category: "scroll",
    description: "Words brighten line by line as you scroll past.",
    tags: ["highlight", "read", "scrub", "editorial"],
    engine: "gsap",
    properties: ["color", "opacity"],
    reducedMotion: "static",
    isNew: true,
  },
  {
    id: "scroll.counter",
    name: "Count Up",
    category: "scroll",
    description: "Metrics count to their value when scrolled into view.",
    tags: ["number", "stats", "metrics", "tally"],
    engine: "motion",
    properties: ["content"],
    reducedMotion: "static",
    params: [speed()],
  },

  // --- Cursor ---------------------------------------------------------------
  {
    id: "cursor.trail",
    name: "Cursor Trail",
    category: "cursor",
    description: "A soft trail follows the pointer with lag.",
    tags: ["follow", "lag", "smear", "comet"],
    engine: "css",
    properties: ["transform"],
    reducedMotion: "off",
    params: [{ key: "ease", label: "Lag", min: 0.05, max: 0.6, step: 0.01, default: 0.18 }],
  },
  {
    id: "cursor.spotlight",
    name: "Cursor Spotlight",
    category: "cursor",
    description: "The pointer lights the surface beneath it.",
    tags: ["glow", "light", "halo"],
    engine: "css",
    properties: ["background-position"],
    reducedMotion: "off",
    params: [{ key: "size", label: "Radius", min: 80, max: 480, step: 20, default: 220, unit: "px" }],
  },
  {
    id: "cursor.blend",
    name: "Blend Cursor",
    category: "cursor",
    description: "An inverting disc that reads over any colour.",
    tags: ["difference", "invert", "contrast", "disc"],
    engine: "css",
    properties: ["transform", "mix-blend-mode"],
    reducedMotion: "off",
    params: [{ key: "size", label: "Size", min: 12, max: 80, step: 2, default: 28, unit: "px" }],
    isNew: true,
  },

  // --- Hover ----------------------------------------------------------------
  {
    id: "hover.magnetic",
    name: "Magnetic Pull",
    category: "hover",
    description: "Targets lean toward an approaching pointer.",
    tags: ["attract", "pull", "gsap", "button"],
    engine: "gsap",
    properties: ["x", "y"],
    reducedMotion: "off",
    params: [intensity(0.5)],
  },
  {
    id: "hover.tilt",
    name: "Tilt",
    category: "hover",
    description: "Cards tip in 3D toward the pointer.",
    tags: ["3d", "perspective", "parallax", "card"],
    engine: "css",
    properties: ["transform"],
    reducedMotion: "off",
    params: [intensity(0.6)],
  },
  {
    id: "hover.shine",
    name: "Shine Sweep",
    category: "hover",
    description: "A highlight sweeps across on hover.",
    tags: ["gloss", "sheen", "sweep", "light"],
    engine: "css",
    properties: ["background-position"],
    reducedMotion: "static",
    params: [speed()],
  },
  {
    id: "hover.underline-sweep",
    name: "Underline Sweep",
    category: "hover",
    description: "An underline grows from the leading edge.",
    tags: ["link", "underline", "wipe", "text"],
    engine: "css",
    properties: ["transform"],
    reducedMotion: "static",
    params: [speed()],
  },
  {
    id: "hover.glow-border",
    name: "Glow Border",
    category: "hover",
    description: "The border lights up in the brand colour.",
    tags: ["border", "glow", "outline", "focus"],
    engine: "css",
    properties: ["box-shadow", "border-color"],
    reducedMotion: "static",
    params: [intensity()],
  },

  // --- Loaders --------------------------------------------------------------
  {
    id: "loader.comet-dial",
    name: "Comet Dial",
    category: "loader",
    description: "A ring with a comet head tracing progress.",
    tags: ["ring", "circular", "progress", "orbit"],
    engine: "css",
    properties: ["transform"],
    reducedMotion: "static",
    params: [speed()],
    isNew: true,
  },
  {
    id: "loader.bars",
    name: "Pulse Bars",
    category: "loader",
    description: "Bars pulsing in sequence.",
    tags: ["equaliser", "bars", "pulse"],
    engine: "css",
    properties: ["transform"],
    reducedMotion: "static",
    params: [speed()],
  },
  {
    id: "loader.skeleton",
    name: "Skeleton Shimmer",
    category: "loader",
    description: "Placeholder blocks with a travelling sheen.",
    tags: ["placeholder", "shimmer", "ghost", "pending"],
    engine: "css",
    properties: ["background-position"],
    reducedMotion: "static",
    params: [speed()],
  },
];

export const ELEMENTS_BY_ID = new Map(ELEMENTS.map((e) => [e.id, e]));
export const ELEMENT_IDS = new Set(ELEMENTS.map((e) => e.id));

export function elementById(id: string): ElementDefinition | undefined {
  return ELEMENTS_BY_ID.get(id);
}

export function elementsInCategory(category: ElementCategory): ElementDefinition[] {
  return ELEMENTS.filter((e) => e.category === category);
}

/** Catalogue entries a given slot will accept, for the picker and the browser. */
export function elementsForSlot(
  slot: ElementSlotId,
  categories: readonly ElementCategory[],
): ElementDefinition[] {
  void slot;
  return ELEMENTS.filter((e) => categories.includes(e.category));
}

/**
 * Free-text search across name, description and tags.
 *
 * Tags exist precisely so that searching "lenis" finds Smooth Scroll and "airport"
 * finds Split Flap — the words someone reaches for are rarely the element's own name.
 */
export function searchElements(query: string, pool: ElementDefinition[] = ELEMENTS): ElementDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) return pool;
  return pool.filter((e) =>
    `${e.name} ${e.description} ${e.category} ${e.tags.join(" ")}`.toLowerCase().includes(q),
  );
}

/** Default params for an element, as declared in the catalogue. */
export function defaultParams(id: string): Record<string, number> {
  const element = elementById(id);
  if (!element?.params) return {};
  return Object.fromEntries(element.params.map((p) => [p.key, p.default]));
}
