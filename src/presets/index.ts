import type { DesignProject } from "@/schema/project";
import { fromCss } from "@/color/oklch";
import { suggestPalette } from "@/color/semantic";
import { findFont, FONT_PAIRINGS } from "@/fonts/catalogue";
import { SEMANTIC_TOKENS } from "@/schema/primitives";
import { markProvenance } from "@/store/provenance";

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
 *
 * Each preset is split into five independent facets (palette, typography, geometry,
 * components, motion) rather than one monolithic function. That's what makes partial
 * application possible: "use Luxury's palette but keep my current typography" is just
 * calling one facet instead of all five, which a single `apply` function could never
 * express without a parallel, hand-maintained partial-application path.
 */

export type PresetFacet = "palette" | "typography" | "geometry" | "components" | "motion";
export const PRESET_FACETS: PresetFacet[] = ["palette", "typography", "geometry", "components", "motion"];

export const FACET_LABELS: Record<PresetFacet, string> = {
  palette: "Colour palette",
  typography: "Typography",
  geometry: "Geometry & layout",
  components: "Component choices",
  motion: "Motion profile",
};

export interface Preset {
  id: string;
  name: string;
  /** Grouping shown in the UI. */
  family: "Professional" | "Editorial" | "Expressive" | "Technical" | "Industry";
  description: string;
  /** Seed colour used only when no logo has been analysed. */
  seed: string;
  /** Font pairing id from the catalogue. */
  pairing: string;
  facets: Record<PresetFacet, (draft: DesignProject) => void>;
}

/** Applies every facet — the "normal" full preset application. */
export function applyPreset(draft: DesignProject, preset: Preset): void {
  for (const facet of PRESET_FACETS) preset.facets[facet](draft);
}

/** Applies only the chosen facets, leaving everything else as it was. */
export function applyPresetFacets(draft: DesignProject, preset: Preset, facets: PresetFacet[]): void {
  for (const facet of facets) preset.facets[facet](draft);
}

// --- shared helpers ----------------------------------------------------------

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
  markProvenance(draft, ["tokens.typography.display", "tokens.typography.body", "tokens.typography.mono"], "preset");
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
  markProvenance(draft, ["tokens.typography.scale"], "preset");
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
  markProvenance(draft, SEMANTIC_TOKENS.map((t) => `tokens.colors.${t}`), "preset");
};

type LayoutPatch = Partial<DesignProject["tokens"]["layout"]>;
type ImageryPatch = Partial<DesignProject["tokens"]["imagery"]>;

const setGeometry = (
  draft: DesignProject,
  radiusMd: number,
  layout: LayoutPatch,
  imagery: ImageryPatch,
  borderWidth?: DesignProject["tokens"]["geometry"]["borderWidth"],
) => {
  setRadius(draft, radiusMd);
  draft.tokens.layout = { ...draft.tokens.layout, ...layout };
  draft.tokens.imagery = { ...draft.tokens.imagery, ...imagery };
  if (borderWidth) draft.tokens.geometry.borderWidth = borderWidth;
  markProvenance(draft, [
    "tokens.geometry.radius", "tokens.geometry.spacing", "tokens.imagery.shadow",
    "tokens.layout.density", "tokens.layout.alignment",
    "tokens.imagery.radius", "tokens.imagery.treatment", "tokens.imagery.border",
  ], "preset");
};

type ComponentPatch = Partial<DesignProject["recipe"]["components"]>;

const setComponents = (draft: DesignProject, patch: ComponentPatch) => {
  draft.recipe.components = { ...draft.recipe.components, ...patch };
  markProvenance(draft, Object.keys(patch).map((k) => `recipe.components.${k}`), "preset");
};

const setMotionProfile = (draft: DesignProject, profile: DesignProject["recipe"]["motion"]["profile"]) => {
  draft.recipe.motion.profile = profile;
  markProvenance(draft, ["recipe.motion.profile"], "preset");
};

/** Builds a preset's five facet functions from a flat description. */
function definePreset(config: {
  id: string;
  name: string;
  family: Preset["family"];
  description: string;
  seed: string;
  pairing: string;
  typeScale: number;
  bodySize?: number;
  radius: number;
  layout: LayoutPatch;
  imagery: ImageryPatch;
  borderWidth?: DesignProject["tokens"]["geometry"]["borderWidth"];
  components: ComponentPatch;
  motion: DesignProject["recipe"]["motion"]["profile"];
  /** Extra palette-facet work beyond the seed colour (e.g. tech-dark's theme swap). */
  extraPalette?: (draft: DesignProject) => void;
}): Preset {
  return {
    id: config.id,
    name: config.name,
    family: config.family,
    description: config.description,
    seed: config.seed,
    pairing: config.pairing,
    facets: {
      palette: (draft) => {
        setPalette(draft, config.seed);
        config.extraPalette?.(draft);
      },
      typography: (draft) => {
        setPairing(draft, config.pairing);
        setTypeScale(draft, config.typeScale, config.bodySize);
      },
      geometry: (draft) => setGeometry(draft, config.radius, config.layout, config.imagery, config.borderWidth),
      components: (draft) => setComponents(draft, config.components),
      motion: (draft) => setMotionProfile(draft, config.motion),
    },
  };
}

// --- presets -------------------------------------------------------------------

export const PRESETS: Preset[] = [
  definePreset({
    id: "modern-startup",
    name: "Modern Startup",
    family: "Professional",
    description: "Geometric sans, medium radius, generous whitespace, moderate motion",
    seed: "#4f46e5",
    pairing: "geometric-tech",
    typeScale: 1.28,
    radius: 0.625,
    layout: { density: "spacious", maxWidth: 76, gutter: 2, sectionSpacing: 8, alignment: "left" },
    imagery: { radius: "lg", shadow: "md", treatment: "contained", border: false },
    components: { hero: "bento", features: "bento", navbar: "floating", card: "elevated", button: "solid", socialProof: "logo-cloud", pricing: "tiers", faq: "accordion", team: "none", cta: "banner", footer: "columns", cursor: "default" },
    motion: "professional",
  }),
  definePreset({
    id: "corporate",
    name: "Corporate",
    family: "Professional",
    description: "Neutral typography, low radius, restrained motion, higher density",
    seed: "#1e40af",
    pairing: "clean-corporate",
    typeScale: 1.2,
    radius: 0.25,
    layout: { density: "compact", maxWidth: 68, gutter: 1.5, sectionSpacing: 4, alignment: "left" },
    imagery: { radius: "sm", shadow: "none", treatment: "contained", border: true },
    components: { hero: "split", features: "grid", navbar: "split", card: "bordered", button: "solid", socialProof: "metrics", pricing: "comparison", faq: "two-column", team: "grid", cta: "contact-form", footer: "expanded", cursor: "default" },
    motion: "subtle",
  }),
  definePreset({
    id: "consultancy",
    name: "Consultancy",
    family: "Professional",
    description: "Considered serif headings, calm palette, evidence-led sections",
    seed: "#155e63",
    pairing: "quiet-editorial",
    typeScale: 1.25,
    radius: 0.375,
    layout: { density: "balanced", maxWidth: 70, gutter: 2, sectionSpacing: 7, alignment: "left" },
    imagery: { radius: "md", shadow: "sm", treatment: "contained", border: false },
    components: { hero: "split", features: "alternating", navbar: "minimal", card: "bordered", button: "outline", socialProof: "case-study", pricing: "none", faq: "accordion", team: "list", cta: "booking", footer: "columns", cursor: "default" },
    motion: "subtle",
  }),
  definePreset({
    id: "saas-product",
    name: "SaaS Product",
    family: "Professional",
    description: "Dashboard-led hero, feature grid, pricing tiers front and centre",
    seed: "#0ea5e9",
    pairing: "startup-energetic",
    typeScale: 1.26,
    radius: 0.5,
    layout: { density: "balanced", maxWidth: 74, gutter: 2, sectionSpacing: 7, alignment: "center" },
    imagery: { radius: "lg", shadow: "lg", treatment: "contained", border: false },
    components: { hero: "dashboard", features: "tabs", navbar: "floating", card: "elevated", button: "solid", socialProof: "logo-cloud", pricing: "toggle", faq: "grid", team: "none", cta: "newsletter", footer: "columns", cursor: "default" },
    motion: "professional",
  }),
  definePreset({
    id: "editorial",
    name: "Editorial",
    family: "Editorial",
    description: "Display serif, large type, extreme whitespace, image-led, slow motion",
    seed: "#1c1917",
    pairing: "editorial-serif",
    typeScale: 1.34,
    radius: 0,
    layout: { density: "editorial", maxWidth: 56, gutter: 2.5, sectionSpacing: 12, alignment: "left" },
    imagery: { radius: "none", shadow: "none", treatment: "full-bleed", border: false },
    components: { hero: "editorial", features: "alternating", navbar: "centered", card: "minimal", button: "text", socialProof: "testimonial-grid", pricing: "none", faq: "two-column", team: "featured", cta: "newsletter", footer: "minimal", cursor: "dot" },
    motion: "cinematic",
  }),
  definePreset({
    id: "luxury",
    name: "Luxury",
    family: "Editorial",
    description: "Restrained palette, large imagery, sharp geometry, cinematic motion",
    seed: "#0c0a09",
    pairing: "luxury-contrast",
    typeScale: 1.32,
    radius: 0,
    layout: { density: "spacious", maxWidth: 80, gutter: 3, sectionSpacing: 12, alignment: "center" },
    imagery: { radius: "none", shadow: "none", treatment: "full-bleed", border: false },
    components: { hero: "image-led", features: "alternating", navbar: "minimal", card: "minimal", button: "outline", socialProof: "case-study", pricing: "single", faq: "none", team: "featured", cta: "booking", footer: "minimal", cursor: "ring" },
    motion: "cinematic",
  }),
  definePreset({
    id: "classic-publishing",
    name: "Classic Publishing",
    family: "Editorial",
    description: "Old-style serif, narrow measure, built for long-form reading",
    seed: "#3f3f46",
    pairing: "classic-publishing",
    typeScale: 1.29,
    bodySize: 1.125,
    radius: 0.125,
    layout: { density: "editorial", maxWidth: 48, gutter: 2, sectionSpacing: 10, alignment: "left" },
    imagery: { radius: "none", shadow: "none", treatment: "contained", border: true },
    components: { hero: "editorial", features: "alternating", navbar: "centered", card: "minimal", button: "text", socialProof: "testimonial-grid", pricing: "none", faq: "two-column", team: "list", cta: "newsletter", footer: "minimal", cursor: "default" },
    motion: "subtle",
  }),
  definePreset({
    id: "warm-organic",
    name: "Warm Organic",
    family: "Editorial",
    description: "Earthy palette, soft serif, rounded imagery, unhurried motion",
    seed: "#b45309",
    pairing: "warm-humanist",
    typeScale: 1.27,
    radius: 0.875,
    layout: { density: "spacious", maxWidth: 68, gutter: 2.5, sectionSpacing: 9, alignment: "left" },
    imagery: { radius: "xl", shadow: "sm", treatment: "contained", border: false },
    components: { hero: "split", features: "cards", navbar: "minimal", card: "feature", button: "pill", socialProof: "testimonial-carousel", pricing: "tiers", faq: "accordion", team: "grid", cta: "contact-form", footer: "columns", cursor: "default" },
    motion: "professional",
  }),
  definePreset({
    id: "playful",
    name: "Playful",
    family: "Expressive",
    description: "Bold palette, high radius, asymmetric composition, expressive animation",
    seed: "#db2777",
    pairing: "friendly-rounded",
    typeScale: 1.3,
    radius: 1,
    layout: { density: "balanced", maxWidth: 74, gutter: 2, sectionSpacing: 7, alignment: "center" },
    imagery: { radius: "xl", shadow: "lg", treatment: "contained", border: false },
    components: { hero: "centered", features: "cards", navbar: "floating", card: "elevated", button: "pill", socialProof: "testimonial-carousel", pricing: "tiers", faq: "grid", team: "grid", cta: "newsletter", footer: "columns", cursor: "magnetic" },
    motion: "expressive",
  }),
  definePreset({
    id: "bold-statement",
    name: "Bold Statement",
    family: "Expressive",
    description: "Oversized condensed headlines, high contrast, unmissable",
    seed: "#dc2626",
    pairing: "bold-statement",
    typeScale: 1.42,
    radius: 0,
    layout: { density: "compact", maxWidth: 78, gutter: 2, sectionSpacing: 8, alignment: "left" },
    imagery: { radius: "none", shadow: "none", treatment: "full-bleed", border: false },
    components: { hero: "video-led", features: "demo", navbar: "mega", card: "bordered", button: "solid", socialProof: "metrics", pricing: "single", faq: "accordion", team: "none", cta: "banner", footer: "expanded", cursor: "label" },
    motion: "expressive",
  }),
  definePreset({
    id: "creative-studio",
    name: "Creative Studio",
    family: "Expressive",
    description: "Characterful display type, image-forward, portfolio-shaped",
    seed: "#7c3aed",
    pairing: "expressive-display",
    typeScale: 1.36,
    radius: 0.75,
    layout: { density: "spacious", maxWidth: 80, gutter: 2.5, sectionSpacing: 10, alignment: "left" },
    imagery: { radius: "lg", shadow: "xl", treatment: "full-bleed", border: false },
    components: { hero: "bento", features: "bento", navbar: "floating", card: "image", button: "pill", socialProof: "case-study", pricing: "none", faq: "none", team: "featured", cta: "booking", footer: "expanded", cursor: "image-aware" },
    motion: "cinematic",
  }),
  definePreset({
    id: "retro",
    name: "Retro",
    family: "Expressive",
    description: "Warm saturated palette, chunky geometry, nostalgic energy",
    seed: "#ea580c",
    pairing: "bold-statement",
    typeScale: 1.33,
    radius: 0.5,
    layout: { density: "balanced", maxWidth: 70, gutter: 2, sectionSpacing: 7, alignment: "center" },
    imagery: { radius: "md", shadow: "md", treatment: "contained", border: true },
    borderWidth: { hairline: 2, default: 2, thick: 4 },
    components: { hero: "centered", features: "grid", navbar: "centered", card: "bordered", button: "solid", socialProof: "metrics", pricing: "tiers", faq: "accordion", team: "grid", cta: "banner", footer: "columns", cursor: "dot" },
    motion: "expressive",
  }),
  definePreset({
    id: "brutalist",
    name: "Brutalist",
    family: "Technical",
    description: "Monospace headings, hard edges, visible structure, near-zero motion",
    seed: "#171717",
    pairing: "brutalist-mono",
    typeScale: 1.22,
    radius: 0,
    layout: { density: "compact", maxWidth: 72, gutter: 1.5, sectionSpacing: 5, alignment: "left" },
    imagery: { radius: "none", shadow: "none", treatment: "contained", border: true },
    borderWidth: { hairline: 2, default: 2, thick: 4 },
    components: { hero: "split", features: "grid", navbar: "split", card: "bordered", button: "outline", socialProof: "metrics", pricing: "comparison", faq: "grid", team: "list", cta: "contact-form", footer: "expanded", cursor: "default" },
    motion: "none",
  }),
  definePreset({
    id: "swiss",
    name: "Swiss",
    family: "Technical",
    description: "Objective grid, tight type, no decoration",
    seed: "#e11d48",
    pairing: "swiss-grid",
    typeScale: 1.24,
    radius: 0,
    layout: { density: "compact", maxWidth: 76, gutter: 1.5, sectionSpacing: 6, gridColumns: 12, alignment: "left" },
    imagery: { radius: "none", shadow: "none", treatment: "contained", border: false },
    components: { hero: "editorial", features: "grid", navbar: "split", card: "minimal", button: "text", socialProof: "logo-cloud", pricing: "comparison", faq: "two-column", team: "grid", cta: "banner", footer: "columns", cursor: "default" },
    motion: "subtle",
  }),
  definePreset({
    id: "tech-dark",
    name: "Tech Dark",
    family: "Technical",
    description: "Dark-first surfaces, cool accent, product-led hero",
    seed: "#22d3ee",
    pairing: "geometric-tech",
    typeScale: 1.27,
    radius: 0.5,
    layout: { density: "balanced", maxWidth: 76, gutter: 2, sectionSpacing: 7, alignment: "left" },
    imagery: { radius: "lg", shadow: "xl", treatment: "contained", border: false },
    components: { hero: "product", features: "demo", navbar: "floating", card: "glass", button: "solid", socialProof: "logo-cloud", pricing: "toggle", faq: "grid", team: "none", cta: "newsletter", footer: "expanded", cursor: "ring" },
    motion: "professional",
    // Swaps the light theme onto dark surfaces so the preview opens dark by default.
    extraPalette: (draft) => {
      const colors = draft.tokens.colors;
      if (colors.dark) colors.light = { semantic: { ...colors.dark.semantic } };
    },
  }),
  definePreset({
    id: "minimal-mono",
    name: "Minimal Mono",
    family: "Technical",
    description: "Almost no colour, one accent, maximum restraint",
    seed: "#404040",
    pairing: "neutral-modern",
    typeScale: 1.2,
    radius: 0.25,
    layout: { density: "spacious", maxWidth: 62, gutter: 2, sectionSpacing: 9, alignment: "left" },
    imagery: { radius: "sm", shadow: "none", treatment: "contained", border: false },
    components: { hero: "centered", features: "grid", navbar: "minimal", card: "minimal", button: "outline", socialProof: "logo-cloud", pricing: "single", faq: "accordion", team: "none", cta: "newsletter", footer: "minimal", cursor: "default" },
    motion: "subtle",
  }),

  // --- Industry: structural defaults for specific verticals, not just moods (§11.3) ---
  definePreset({
    id: "law-firm",
    name: "Law Firm",
    family: "Industry",
    description: "Navy and gold, authoritative serif, restrained motion, evidence-led",
    seed: "#1e3a5f",
    pairing: "classic-publishing",
    typeScale: 1.22,
    radius: 0.125,
    layout: { density: "compact", maxWidth: 68, gutter: 2, sectionSpacing: 6, alignment: "left" },
    imagery: { radius: "sm", shadow: "none", treatment: "contained", border: true },
    components: { hero: "split", features: "alternating", navbar: "split", card: "bordered", button: "outline", socialProof: "case-study", pricing: "none", faq: "accordion", team: "list", cta: "contact-form", footer: "expanded", cursor: "default" },
    motion: "subtle",
  }),
  definePreset({
    id: "restaurant",
    name: "Restaurant",
    family: "Industry",
    description: "Warm palette, image-led hero, menu-style features, reservation-focused",
    seed: "#7c2d12",
    pairing: "warm-humanist",
    typeScale: 1.3,
    radius: 0.75,
    layout: { density: "spacious", maxWidth: 70, gutter: 2.5, sectionSpacing: 9, alignment: "center" },
    imagery: { radius: "lg", shadow: "sm", treatment: "full-bleed", border: false },
    components: { hero: "image-led", features: "cards", navbar: "centered", card: "image", button: "pill", socialProof: "testimonial-carousel", pricing: "none", faq: "accordion", team: "grid", cta: "booking", footer: "columns", cursor: "default" },
    motion: "professional",
  }),
  definePreset({
    id: "architecture-studio",
    name: "Architecture Studio",
    family: "Industry",
    description: "Monochrome, oversized imagery, minimal type, slow cinematic motion",
    seed: "#18181b",
    pairing: "modern-serif-mix",
    typeScale: 1.35,
    radius: 0,
    layout: { density: "editorial", maxWidth: 60, gutter: 3, sectionSpacing: 14, alignment: "left" },
    imagery: { radius: "none", shadow: "none", treatment: "full-bleed", border: false },
    components: { hero: "image-led", features: "alternating", navbar: "minimal", card: "minimal", button: "text", socialProof: "case-study", pricing: "none", faq: "none", team: "featured", cta: "newsletter", footer: "minimal", cursor: "ring" },
    motion: "cinematic",
  }),
  definePreset({
    id: "healthcare",
    name: "Healthcare",
    family: "Industry",
    description: "Calming palette, accessible sans, high-contrast, FAQ-heavy",
    seed: "#0d9488",
    pairing: "friendly-rounded",
    typeScale: 1.22,
    radius: 0.625,
    layout: { density: "balanced", maxWidth: 68, gutter: 2, sectionSpacing: 7, alignment: "left" },
    imagery: { radius: "lg", shadow: "sm", treatment: "contained", border: false },
    components: { hero: "split", features: "grid", navbar: "minimal", card: "bordered", button: "solid", socialProof: "metrics", pricing: "tiers", faq: "grid", team: "grid", cta: "contact-form", footer: "expanded", cursor: "default" },
    motion: "subtle",
  }),
  definePreset({
    id: "real-estate",
    name: "Real Estate",
    family: "Industry",
    description: "Elevated listing cards, image-led hero, agent-forward",
    seed: "#334155",
    pairing: "luxury-contrast",
    typeScale: 1.28,
    radius: 0.375,
    layout: { density: "spacious", maxWidth: 76, gutter: 2.5, sectionSpacing: 9, alignment: "left" },
    imagery: { radius: "lg", shadow: "lg", treatment: "contained", border: false },
    components: { hero: "image-led", features: "cards", navbar: "split", card: "elevated", button: "solid", socialProof: "metrics", pricing: "none", faq: "accordion", team: "grid", cta: "contact-form", footer: "columns", cursor: "default" },
    motion: "professional",
  }),
];

export const PRESET_FAMILIES = ["Professional", "Editorial", "Expressive", "Technical", "Industry"] as const;
