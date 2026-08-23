import type { DesignProject } from "@/schema/project";
import { fromCss } from "@/color/oklch";
import { suggestPalette } from "@/color/semantic";
import { GOOGLE_FONTS, SYSTEM_FONTS } from "@/fonts/catalogue";

/**
 * Design presets (§14).
 *
 * Presets are starting points, not templates: applying one populates Foundation,
 * Components and Animations, after which everything stays editable. Applying one is a
 * single history entry, so a client can say "show me editorial" and one undo returns
 * to where they were.
 *
 * A preset never overwrites colours derived from an uploaded logo — brand colours
 * outrank a stylistic starting point.
 */

export interface Preset {
  id: string;
  name: string;
  description: string;
  apply: (draft: DesignProject) => void;
}

const font = (family: string) =>
  [...SYSTEM_FONTS, ...GOOGLE_FONTS].find((f) => f.family === family)!;

const setFonts = (draft: DesignProject, display: string, body: string) => {
  const d = font(display);
  const b = font(body);
  draft.tokens.typography.display = {
    ...draft.tokens.typography.display,
    family: d.family, fallback: d.fallback, source: d.source, weights: d.weights,
  };
  draft.tokens.typography.body = {
    ...draft.tokens.typography.body,
    family: b.family, fallback: b.fallback, source: b.source, weights: b.weights,
  };
};

const setRadius = (draft: DesignProject, md: number) => {
  draft.tokens.geometry.radius = {
    none: 0, sm: md * 0.5, md, lg: md * 1.5, xl: md * 2, full: 9999,
  };
};

/** Brand colours from an uploaded logo survive preset application. */
const applyPaletteIfUnbranded = (draft: DesignProject, hex: string) => {
  if (draft.analysis) return;
  const seed = fromCss(hex);
  if (!seed) return;
  draft.tokens.colors = suggestPalette({
    detected: [{ color: seed, weight: 1, role: "dominant", label: "Preset" }],
  });
};

export const PRESETS: Preset[] = [
  {
    id: "modern-startup",
    name: "Modern Startup",
    description: "Geometric sans, medium radius, high whitespace, moderate motion",
    apply: (draft) => {
      setFonts(draft, "Space Grotesk", "Inter");
      setRadius(draft, 0.625);
      applyPaletteIfUnbranded(draft, "#4f46e5");
      draft.tokens.layout = { ...draft.tokens.layout, density: "spacious", maxWidth: 76, gutter: 2, sectionSpacing: 8 };
      draft.tokens.imagery.radius = "lg";
      draft.recipe.components = { ...draft.recipe.components, hero: "bento", features: "bento", navbar: "floating", card: "elevated" };
      draft.recipe.motion.profile = "professional";
    },
  },
  {
    id: "corporate",
    name: "Corporate",
    description: "Neutral typography, low radius, restrained motion, higher density",
    apply: (draft) => {
      setFonts(draft, "Inter", "Inter");
      setRadius(draft, 0.25);
      applyPaletteIfUnbranded(draft, "#1e40af");
      draft.tokens.layout = { ...draft.tokens.layout, density: "compact", maxWidth: 68, gutter: 1.5, sectionSpacing: 4 };
      draft.tokens.imagery.radius = "sm";
      draft.recipe.components = { ...draft.recipe.components, hero: "split", features: "grid", navbar: "split", card: "bordered" };
      draft.recipe.motion.profile = "subtle";
    },
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "Display serif, large type, extreme whitespace, image-led, slow motion",
    apply: (draft) => {
      setFonts(draft, "Fraunces", "Libre Baskerville");
      setRadius(draft, 0);
      applyPaletteIfUnbranded(draft, "#1c1917");
      draft.tokens.layout = { ...draft.tokens.layout, density: "editorial", maxWidth: 56, gutter: 2.5, sectionSpacing: 12 };
      draft.tokens.typography.scale.displayL.size = 5;
      draft.tokens.typography.scale.heading1.size = 3.5;
      draft.tokens.imagery.radius = "none";
      draft.recipe.components = { ...draft.recipe.components, hero: "editorial", features: "alternating", navbar: "centered", card: "minimal" };
      draft.recipe.motion.profile = "cinematic";
    },
  },
  {
    id: "luxury",
    name: "Luxury",
    description: "Restrained palette, large imagery, sharp geometry, cinematic motion",
    apply: (draft) => {
      setFonts(draft, "Playfair Display", "DM Sans");
      setRadius(draft, 0);
      applyPaletteIfUnbranded(draft, "#0c0a09");
      draft.tokens.layout = { ...draft.tokens.layout, density: "spacious", maxWidth: 80, gutter: 3, sectionSpacing: 12 };
      draft.tokens.imagery = { ...draft.tokens.imagery, radius: "none", treatment: "full-bleed", shadow: "none" };
      draft.recipe.components = { ...draft.recipe.components, hero: "image-led", features: "alternating", navbar: "minimal", card: "minimal" };
      draft.recipe.motion.profile = "cinematic";
    },
  },
  {
    id: "playful",
    name: "Playful",
    description: "Bold palette, high radius, asymmetric composition, expressive animation",
    apply: (draft) => {
      setFonts(draft, "Sora", "Plus Jakarta Sans");
      setRadius(draft, 1);
      applyPaletteIfUnbranded(draft, "#db2777");
      draft.tokens.layout = { ...draft.tokens.layout, density: "balanced", maxWidth: 74, gutter: 2, sectionSpacing: 7 };
      draft.tokens.imagery.radius = "xl";
      draft.recipe.components = { ...draft.recipe.components, hero: "centered", features: "cards", navbar: "floating", card: "elevated", button: "pill" };
      draft.recipe.motion.profile = "expressive";
    },
  },
];
