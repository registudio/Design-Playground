import type { DesignProject } from "@/schema/project";
import { fromCss } from "@/color/oklch";
import { suggestPalette } from "@/color/semantic";
import { findFont, FONT_PAIRINGS } from "@/fonts/catalogue";

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
  /** Grouping shown in the UI. */
  family: "Professional" | "Editorial" | "Expressive" | "Technical";
  description: string;
  /** Seed colour used only when no logo has been analysed. */
  seed: string;
  /** Font pairing id from the catalogue. */
  pairing: string;
  apply: (draft: DesignProject) => void;
}

// --- shared helpers --------------------------------------------------------

const setPairing = (draft: DesignProject, pairingId: string) => {
  const pairing = FONT_PAIRINGS.find((p) => p.id === pairingId);
  if (!pairing) return;
  for (const role of ["display", "body", "mono"] as const) {
    const entry = findFont(pairing[role]);
    if (!entry) continue;
    draft.tokens.typography[role] = {
      ...draft.tokens.typography[role],
      family: entry.family,
      fallback: entry.fallback,
      source: entry.source,
      weights: entry.weights,
    };
  }
};

const setRadius = (draft: DesignProject, md: number) => {
  draft.tokens.geometry.radius = {
    none: 0, sm: md * 0.5, md, lg: md * 1.5, xl: md * 2, full: 9999,
  };
};

/** Brand colours from an uploaded logo survive preset application. */
const setPalette = (draft: DesignProject, hex: string) => {
  if (draft.analysis) return;
  const seed = fromCss(hex);
  if (!seed) return;
  draft.tokens.colors = suggestPalette({
    detected: [{ color: seed, weight: 1, role: "dominant", label: "Preset" }],
  });
};

/** Scales the whole type ladder around the body size. */
const setTypeScale = (draft: DesignProject, ratio: number, bodySize = 1) => {
  const offsets = {
    displayXl: 6, displayL: 5, heading1: 4, heading2: 3, heading3: 2,
    bodyL: 0.5, body: 0, small: -1, caption: -2,
  } as const;
  draft.tokens.typography.scale.body.size = bodySize;
  for (const [step, offset] of Object.entries(offsets)) {
    draft.tokens.typography.scale[step as keyof typeof offsets].size =
      Math.round(bodySize * ratio ** offset * 1000) / 1000;
  }
};

// --- presets ---------------------------------------------------------------

export const PRESETS: Preset[] = [
  {
    id: "modern-startup",
    name: "Modern Startup",
    family: "Professional",
    description: "Geometric sans, medium radius, generous whitespace, moderate motion",
    seed: "#4f46e5",
    pairing: "geometric-tech",
    apply: (draft) => {
      setPairing(draft, "geometric-tech");
      setPalette(draft, "#4f46e5");
      setRadius(draft, 0.625);
      setTypeScale(draft, 1.28);
      draft.tokens.layout = { ...draft.tokens.layout, density: "spacious", maxWidth: 76, gutter: 2, sectionSpacing: 8, alignment: "left" };
      draft.tokens.imagery = { ...draft.tokens.imagery, radius: "lg", shadow: "md", treatment: "contained", border: false };
      draft.recipe.components = { ...draft.recipe.components, hero: "bento", features: "bento", navbar: "floating", card: "elevated", button: "solid", socialProof: "logo-cloud", pricing: "tiers", faq: "accordion", team: "none", cta: "banner", footer: "columns", cursor: "default" };
      draft.recipe.motion.profile = "professional";
    },
  },
  {
    id: "corporate",
    name: "Corporate",
    family: "Professional",
    description: "Neutral typography, low radius, restrained motion, higher density",
    seed: "#1e40af",
    pairing: "clean-corporate",
    apply: (draft) => {
      setPairing(draft, "clean-corporate");
      setPalette(draft, "#1e40af");
      setRadius(draft, 0.25);
      setTypeScale(draft, 1.2);
      draft.tokens.layout = { ...draft.tokens.layout, density: "compact", maxWidth: 68, gutter: 1.5, sectionSpacing: 4, alignment: "left" };
      draft.tokens.imagery = { ...draft.tokens.imagery, radius: "sm", shadow: "none", treatment: "contained", border: true };
      draft.recipe.components = { ...draft.recipe.components, hero: "split", features: "grid", navbar: "split", card: "bordered", button: "solid", socialProof: "metrics", pricing: "comparison", faq: "two-column", team: "grid", cta: "contact-form", footer: "expanded", cursor: "default" };
      draft.recipe.motion.profile = "subtle";
    },
  },
  {
    id: "consultancy",
    name: "Consultancy",
    family: "Professional",
    description: "Considered serif headings, calm palette, evidence-led sections",
    seed: "#155e63",
    pairing: "quiet-editorial",
    apply: (draft) => {
      setPairing(draft, "quiet-editorial");
      setPalette(draft, "#155e63");
      setRadius(draft, 0.375);
      setTypeScale(draft, 1.25);
      draft.tokens.layout = { ...draft.tokens.layout, density: "balanced", maxWidth: 70, gutter: 2, sectionSpacing: 7, alignment: "left" };
      draft.tokens.imagery = { ...draft.tokens.imagery, radius: "md", shadow: "sm", treatment: "contained", border: false };
      draft.recipe.components = { ...draft.recipe.components, hero: "split", features: "alternating", navbar: "minimal", card: "bordered", button: "outline", socialProof: "case-study", pricing: "none", faq: "accordion", team: "list", cta: "booking", footer: "columns", cursor: "default" };
      draft.recipe.motion.profile = "subtle";
    },
  },
  {
    id: "saas-product",
    name: "SaaS Product",
    family: "Professional",
    description: "Dashboard-led hero, feature grid, pricing tiers front and centre",
    seed: "#0ea5e9",
    pairing: "startup-energetic",
    apply: (draft) => {
      setPairing(draft, "startup-energetic");
      setPalette(draft, "#0ea5e9");
      setRadius(draft, 0.5);
      setTypeScale(draft, 1.26);
      draft.tokens.layout = { ...draft.tokens.layout, density: "balanced", maxWidth: 74, gutter: 2, sectionSpacing: 7, alignment: "center" };
      draft.tokens.imagery = { ...draft.tokens.imagery, radius: "lg", shadow: "lg", treatment: "contained", border: false };
      draft.recipe.components = { ...draft.recipe.components, hero: "dashboard", features: "tabs", navbar: "floating", card: "elevated", button: "solid", socialProof: "logo-cloud", pricing: "toggle", faq: "grid", team: "none", cta: "newsletter", footer: "columns", cursor: "default" };
      draft.recipe.motion.profile = "professional";
    },
  },
  {
    id: "editorial",
    name: "Editorial",
    family: "Editorial",
    description: "Display serif, large type, extreme whitespace, image-led, slow motion",
    seed: "#1c1917",
    pairing: "editorial-serif",
    apply: (draft) => {
      setPairing(draft, "editorial-serif");
      setPalette(draft, "#1c1917");
      setRadius(draft, 0);
      setTypeScale(draft, 1.34);
      draft.tokens.layout = { ...draft.tokens.layout, density: "editorial", maxWidth: 56, gutter: 2.5, sectionSpacing: 12, alignment: "left" };
      draft.tokens.imagery = { ...draft.tokens.imagery, radius: "none", shadow: "none", treatment: "full-bleed", border: false };
      draft.recipe.components = { ...draft.recipe.components, hero: "editorial", features: "alternating", navbar: "centered", card: "minimal", button: "text", socialProof: "testimonial-grid", pricing: "none", faq: "two-column", team: "featured", cta: "newsletter", footer: "minimal", cursor: "dot" };
      draft.recipe.motion.profile = "cinematic";
    },
  },
  {
    id: "luxury",
    name: "Luxury",
    family: "Editorial",
    description: "Restrained palette, large imagery, sharp geometry, cinematic motion",
    seed: "#0c0a09",
    pairing: "luxury-contrast",
    apply: (draft) => {
      setPairing(draft, "luxury-contrast");
      setPalette(draft, "#0c0a09");
      setRadius(draft, 0);
      setTypeScale(draft, 1.32);
      draft.tokens.layout = { ...draft.tokens.layout, density: "spacious", maxWidth: 80, gutter: 3, sectionSpacing: 12, alignment: "center" };
      draft.tokens.imagery = { ...draft.tokens.imagery, radius: "none", shadow: "none", treatment: "full-bleed", border: false };
      draft.recipe.components = { ...draft.recipe.components, hero: "image-led", features: "alternating", navbar: "minimal", card: "minimal", button: "outline", socialProof: "case-study", pricing: "single", faq: "none", team: "featured", cta: "booking", footer: "minimal", cursor: "ring" };
      draft.recipe.motion.profile = "cinematic";
    },
  },
  {
    id: "classic-publishing",
    name: "Classic Publishing",
    family: "Editorial",
    description: "Old-style serif, narrow measure, built for long-form reading",
    seed: "#3f3f46",
    pairing: "classic-publishing",
    apply: (draft) => {
      setPairing(draft, "classic-publishing");
      setPalette(draft, "#3f3f46");
      setRadius(draft, 0.125);
      setTypeScale(draft, 1.29, 1.125);
      draft.tokens.layout = { ...draft.tokens.layout, density: "editorial", maxWidth: 48, gutter: 2, sectionSpacing: 10, alignment: "left" };
      draft.tokens.imagery = { ...draft.tokens.imagery, radius: "none", shadow: "none", treatment: "contained", border: true };
      draft.recipe.components = { ...draft.recipe.components, hero: "editorial", features: "alternating", navbar: "centered", card: "minimal", button: "text", socialProof: "testimonial-grid", pricing: "none", faq: "two-column", team: "list", cta: "newsletter", footer: "minimal", cursor: "default" };
      draft.recipe.motion.profile = "subtle";
    },
  },
  {
    id: "warm-organic",
    name: "Warm Organic",
    family: "Editorial",
    description: "Earthy palette, soft serif, rounded imagery, unhurried motion",
    seed: "#b45309",
    pairing: "warm-humanist",
    apply: (draft) => {
      setPairing(draft, "warm-humanist");
      setPalette(draft, "#b45309");
      setRadius(draft, 0.875);
      setTypeScale(draft, 1.27);
      draft.tokens.layout = { ...draft.tokens.layout, density: "spacious", maxWidth: 68, gutter: 2.5, sectionSpacing: 9, alignment: "left" };
      draft.tokens.imagery = { ...draft.tokens.imagery, radius: "xl", shadow: "sm", treatment: "contained", border: false };
      draft.recipe.components = { ...draft.recipe.components, hero: "split", features: "cards", navbar: "minimal", card: "feature", button: "pill", socialProof: "testimonial-carousel", pricing: "tiers", faq: "accordion", team: "grid", cta: "contact-form", footer: "columns", cursor: "default" };
      draft.recipe.motion.profile = "professional";
    },
  },
  {
    id: "playful",
    name: "Playful",
    family: "Expressive",
    description: "Bold palette, high radius, asymmetric composition, expressive animation",
    seed: "#db2777",
    pairing: "friendly-rounded",
    apply: (draft) => {
      setPairing(draft, "friendly-rounded");
      setPalette(draft, "#db2777");
      setRadius(draft, 1);
      setTypeScale(draft, 1.3);
      draft.tokens.layout = { ...draft.tokens.layout, density: "balanced", maxWidth: 74, gutter: 2, sectionSpacing: 7, alignment: "center" };
      draft.tokens.imagery = { ...draft.tokens.imagery, radius: "xl", shadow: "lg", treatment: "contained", border: false };
      draft.recipe.components = { ...draft.recipe.components, hero: "centered", features: "cards", navbar: "floating", card: "elevated", button: "pill", socialProof: "testimonial-carousel", pricing: "tiers", faq: "grid", team: "grid", cta: "newsletter", footer: "columns", cursor: "magnetic" };
      draft.recipe.motion.profile = "expressive";
    },
  },
  {
    id: "bold-statement",
    name: "Bold Statement",
    family: "Expressive",
    description: "Oversized condensed headlines, high contrast, unmissable",
    seed: "#dc2626",
    pairing: "bold-statement",
    apply: (draft) => {
      setPairing(draft, "bold-statement");
      setPalette(draft, "#dc2626");
      setRadius(draft, 0);
      setTypeScale(draft, 1.42);
      draft.tokens.layout = { ...draft.tokens.layout, density: "compact", maxWidth: 78, gutter: 2, sectionSpacing: 8, alignment: "left" };
      draft.tokens.imagery = { ...draft.tokens.imagery, radius: "none", shadow: "none", treatment: "full-bleed", border: false };
      draft.recipe.components = { ...draft.recipe.components, hero: "video-led", features: "demo", navbar: "mega", card: "bordered", button: "solid", socialProof: "metrics", pricing: "single", faq: "accordion", team: "none", cta: "banner", footer: "expanded", cursor: "label" };
      draft.recipe.motion.profile = "expressive";
    },
  },
  {
    id: "creative-studio",
    name: "Creative Studio",
    family: "Expressive",
    description: "Characterful display type, image-forward, portfolio-shaped",
    seed: "#7c3aed",
    pairing: "expressive-display",
    apply: (draft) => {
      setPairing(draft, "expressive-display");
      setPalette(draft, "#7c3aed");
      setRadius(draft, 0.75);
      setTypeScale(draft, 1.36);
      draft.tokens.layout = { ...draft.tokens.layout, density: "spacious", maxWidth: 80, gutter: 2.5, sectionSpacing: 10, alignment: "left" };
      draft.tokens.imagery = { ...draft.tokens.imagery, radius: "lg", shadow: "xl", treatment: "full-bleed", border: false };
      draft.recipe.components = { ...draft.recipe.components, hero: "bento", features: "bento", navbar: "floating", card: "image", button: "pill", socialProof: "case-study", pricing: "none", faq: "none", team: "featured", cta: "booking", footer: "expanded", cursor: "image-aware" };
      draft.recipe.motion.profile = "cinematic";
    },
  },
  {
    id: "retro",
    name: "Retro",
    family: "Expressive",
    description: "Warm saturated palette, chunky geometry, nostalgic energy",
    seed: "#ea580c",
    pairing: "bold-statement",
    apply: (draft) => {
      setPairing(draft, "bold-statement");
      setPalette(draft, "#ea580c");
      setRadius(draft, 0.5);
      setTypeScale(draft, 1.33);
      draft.tokens.layout = { ...draft.tokens.layout, density: "balanced", maxWidth: 70, gutter: 2, sectionSpacing: 7, alignment: "center" };
      draft.tokens.imagery = { ...draft.tokens.imagery, radius: "md", shadow: "md", treatment: "contained", border: true };
      draft.tokens.geometry.borderWidth = { hairline: 2, default: 2, thick: 4 };
      draft.recipe.components = { ...draft.recipe.components, hero: "centered", features: "grid", navbar: "centered", card: "bordered", button: "solid", socialProof: "metrics", pricing: "tiers", faq: "accordion", team: "grid", cta: "banner", footer: "columns", cursor: "dot" };
      draft.recipe.motion.profile = "expressive";
    },
  },
  {
    id: "brutalist",
    name: "Brutalist",
    family: "Technical",
    description: "Monospace headings, hard edges, visible structure, near-zero motion",
    seed: "#171717",
    pairing: "brutalist-mono",
    apply: (draft) => {
      setPairing(draft, "brutalist-mono");
      setPalette(draft, "#171717");
      setRadius(draft, 0);
      setTypeScale(draft, 1.22);
      draft.tokens.layout = { ...draft.tokens.layout, density: "compact", maxWidth: 72, gutter: 1.5, sectionSpacing: 5, alignment: "left" };
      draft.tokens.imagery = { ...draft.tokens.imagery, radius: "none", shadow: "none", treatment: "contained", border: true };
      draft.tokens.geometry.borderWidth = { hairline: 2, default: 2, thick: 4 };
      draft.recipe.components = { ...draft.recipe.components, hero: "split", features: "grid", navbar: "split", card: "bordered", button: "outline", socialProof: "metrics", pricing: "comparison", faq: "grid", team: "list", cta: "contact-form", footer: "expanded", cursor: "default" };
      draft.recipe.motion.profile = "none";
    },
  },
  {
    id: "swiss",
    name: "Swiss",
    family: "Technical",
    description: "Objective grid, tight type, no decoration",
    seed: "#e11d48",
    pairing: "swiss-grid",
    apply: (draft) => {
      setPairing(draft, "swiss-grid");
      setPalette(draft, "#e11d48");
      setRadius(draft, 0);
      setTypeScale(draft, 1.24);
      draft.tokens.layout = { ...draft.tokens.layout, density: "compact", maxWidth: 76, gutter: 1.5, sectionSpacing: 6, gridColumns: 12, alignment: "left" };
      draft.tokens.imagery = { ...draft.tokens.imagery, radius: "none", shadow: "none", treatment: "contained", border: false };
      draft.recipe.components = { ...draft.recipe.components, hero: "editorial", features: "grid", navbar: "split", card: "minimal", button: "text", socialProof: "logo-cloud", pricing: "comparison", faq: "two-column", team: "grid", cta: "banner", footer: "columns", cursor: "default" };
      draft.recipe.motion.profile = "subtle";
    },
  },
  {
    id: "tech-dark",
    name: "Tech Dark",
    family: "Technical",
    description: "Dark-first surfaces, cool accent, product-led hero",
    seed: "#22d3ee",
    pairing: "geometric-tech",
    apply: (draft) => {
      setPairing(draft, "geometric-tech");
      setPalette(draft, "#22d3ee");
      setRadius(draft, 0.5);
      setTypeScale(draft, 1.27);
      // Swap the light theme onto dark surfaces so the preview opens dark by default.
      const colors = draft.tokens.colors;
      if (colors.dark) colors.light = { semantic: { ...colors.dark.semantic } };
      draft.tokens.layout = { ...draft.tokens.layout, density: "balanced", maxWidth: 76, gutter: 2, sectionSpacing: 7, alignment: "left" };
      draft.tokens.imagery = { ...draft.tokens.imagery, radius: "lg", shadow: "xl", treatment: "contained", border: false };
      draft.recipe.components = { ...draft.recipe.components, hero: "product", features: "demo", navbar: "floating", card: "glass", button: "solid", socialProof: "logo-cloud", pricing: "toggle", faq: "grid", team: "none", cta: "newsletter", footer: "expanded", cursor: "ring" };
      draft.recipe.motion.profile = "professional";
    },
  },
  {
    id: "minimal-mono",
    name: "Minimal Mono",
    family: "Technical",
    description: "Almost no colour, one accent, maximum restraint",
    seed: "#404040",
    pairing: "neutral-modern",
    apply: (draft) => {
      setPairing(draft, "neutral-modern");
      setPalette(draft, "#404040");
      setRadius(draft, 0.25);
      setTypeScale(draft, 1.2);
      draft.tokens.layout = { ...draft.tokens.layout, density: "spacious", maxWidth: 62, gutter: 2, sectionSpacing: 9, alignment: "left" };
      draft.tokens.imagery = { ...draft.tokens.imagery, radius: "sm", shadow: "none", treatment: "contained", border: false };
      draft.recipe.components = { ...draft.recipe.components, hero: "centered", features: "grid", navbar: "minimal", card: "minimal", button: "outline", socialProof: "logo-cloud", pricing: "single", faq: "accordion", team: "none", cta: "newsletter", footer: "minimal", cursor: "default" };
      draft.recipe.motion.profile = "subtle";
    },
  },
];

export const PRESET_FAMILIES = ["Professional", "Editorial", "Expressive", "Technical"] as const;
