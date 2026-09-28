import { produce } from "immer";
import type { DesignProject } from "@/schema/project";
import { fromCss, toHex } from "@/color/oklch";
import { resolveSemantic, suggestPalette } from "@/color/semantic";
import { findFont, FONT_PAIRINGS } from "@/fonts/catalogue";
import { SEMANTIC_TOKENS } from "@/schema/primitives";
import { createProject } from "@/schema/defaults";
import type { CustomPreset } from "@/schema/customPreset";
import { markProvenance } from "@/store/provenance";
import { SECTION_ORDER } from "@/schema/composition";
import type { CopyPackId } from "./copy";

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
  /**
   * Grouping shown in the UI. Grouped by the kind of client first, because that is the
   * question asked when a project starts — "it's a tuition centre" — and by mood only
   * for the style starters, which are for when the client type does not decide much.
   */
  family: "Startups" | "Education" | "Agencies" | "Local business" | "Hospitality & retail" | "Professional services" | "Styles" | "Custom";
  description: string;
  /** Who this template is shaped for, in the client's own terms. */
  bestFor?: string;
  /** Sample copy the Sample Page shows while this template is applied. */
  copy?: CopyPackId;
  /** Seed colour used only when no logo has been analysed. */
  seed: string;
  /** Font pairing id from the catalogue. */
  pairing: string;
  facets: Record<PresetFacet, (draft: DesignProject) => void>;
}

/** Applies every facet — the "normal" full preset application. */
export function applyPreset(draft: DesignProject, preset: Preset): void {
  for (const facet of PRESET_FACETS) preset.facets[facet](draft);
  if (draft.recipe.sectionOrder) draft.recipe.sectionOrder = SECTION_ORDER.filter(key => draft.recipe.components[key] !== "none");
  if (draft.recipe.unset) draft.recipe.unset = [];
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
  bestFor?: string;
  copy?: CopyPackId;
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
    bestFor: config.bestFor,
    copy: config.copy,
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
    family: "Startups",
    copy: "startup",
    bestFor: "B2B software, early-stage product companies",
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
    family: "Styles",
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
    family: "Professional services",
    copy: "consulting",
    bestFor: "Strategy and management consultancies",
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
    family: "Startups",
    copy: "saas",
    bestFor: "SaaS products with self-serve pricing",
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
    id: "studio",
    name: "Studio",
    family: "Agencies",
    copy: "agency",
    bestFor: "Web and design studios selling their own services",
    description: "Two precise sans faces, tight scale steps, a design studio's own site",
    seed: "#27272a",
    pairing: "considered-sans",
    typeScale: 1.31,
    radius: 0.25,
    layout: { density: "balanced", maxWidth: 72, gutter: 2, sectionSpacing: 8, alignment: "left" },
    imagery: { radius: "sm", shadow: "sm", treatment: "contained", border: false },
    components: { hero: "split", features: "grid", navbar: "minimal", card: "bordered", button: "text", socialProof: "case-study", pricing: "none", faq: "two-column", team: "list", cta: "contact-form", footer: "minimal", cursor: "ring" },
    motion: "professional",
  }),
  definePreset({
    id: "editorial",
    name: "Editorial",
    family: "Styles",
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
    family: "Styles",
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
    family: "Styles",
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
    family: "Styles",
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
    id: "think-tank",
    name: "Think Tank",
    family: "Styles",
    description: "Two considered serifs, evidence-led sections, authoritative without shouting",
    seed: "#1e2a3a",
    pairing: "refined-serif",
    typeScale: 1.3,
    bodySize: 1.0625,
    radius: 0.125,
    layout: { density: "editorial", maxWidth: 64, gutter: 2, sectionSpacing: 9, alignment: "left" },
    imagery: { radius: "sm", shadow: "none", treatment: "contained", border: true },
    components: { hero: "editorial", features: "alternating", navbar: "centered", card: "bordered", button: "outline", socialProof: "metrics", pricing: "none", faq: "accordion", team: "list", cta: "newsletter", footer: "expanded", cursor: "default" },
    motion: "subtle",
  }),
  definePreset({
    id: "atelier",
    name: "Atelier",
    family: "Styles",
    description: "An expressive variable serif leads, dramatic scale, a design practice's own voice",
    seed: "#292524",
    pairing: "type-forward",
    typeScale: 1.4,
    radius: 0,
    layout: { density: "editorial", maxWidth: 60, gutter: 3, sectionSpacing: 13, alignment: "left" },
    imagery: { radius: "none", shadow: "none", treatment: "full-bleed", border: false },
    components: { hero: "image-led", features: "alternating", navbar: "minimal", card: "minimal", button: "text", socialProof: "case-study", pricing: "none", faq: "none", team: "featured", cta: "newsletter", footer: "minimal", cursor: "ring" },
    motion: "cinematic",
  }),
  definePreset({
    id: "playful",
    name: "Playful",
    family: "Styles",
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
    family: "Styles",
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
    name: "Creative Agency",
    family: "Agencies",
    copy: "creative",
    bestFor: "Branding, campaign and creative agencies",
    description: "Characterful display type, work-first, awards and case studies up front",
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
    family: "Styles",
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
    family: "Styles",
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
    family: "Styles",
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
    family: "Styles",
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
    family: "Styles",
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
    family: "Professional services",
    copy: "law",
    bestFor: "Law practices advising businesses and families",
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
    name: "Café & Restaurant",
    family: "Local business",
    copy: "cafe",
    bestFor: "Cafés, restaurants and bars",
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
    family: "Styles",
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
    name: "Clinic",
    family: "Local business",
    copy: "clinic",
    bestFor: "GP clinics, dental and allied health",
    description: "Calming palette, accessible type, services, screenings and same-day booking",
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
    name: "Property Agent",
    family: "Professional services",
    copy: "property",
    bestFor: "Property agents and developers",
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

// --- Client templates: shaped around a kind of business, with copy to match ---------
PRESETS.push(
  definePreset({
    id: "seed-launch", name: "Pre-launch Waitlist", family: "Startups", copy: "waitlist",
    bestFor: "Pre-seed and seed startups collecting sign-ups before launch",
    description: "One loud promise, a waitlist form above the fold, founders and backers for credibility",
    seed: "#ff5a36", pairing: "startup-energetic", typeScale: 1.34, radius: 1,
    layout: { density: "spacious", maxWidth: 68, gutter: 2, sectionSpacing: 8, alignment: "center" },
    imagery: { radius: "xl", shadow: "lg", treatment: "contained", border: false },
    components: { announcement: "banner", hero: "centered", features: "cards", navbar: "floating", card: "elevated", button: "pill", socialProof: "logo-cloud", pricing: "none", faq: "accordion", team: "featured", blog: "none", cta: "newsletter", footer: "minimal", cursor: "default" },
    motion: "expressive",
  }),
  definePreset({
    id: "fintech", name: "Fintech & Trust", family: "Startups", copy: "fintech",
    bestFor: "Payments, banking, insurance and regulated startups",
    description: "Sober palette, product-led hero, hard numbers and security answered early",
    seed: "#0f6e5a", pairing: "considered-sans", typeScale: 1.24, radius: 0.5,
    layout: { density: "balanced", maxWidth: 74, gutter: 2, sectionSpacing: 7, alignment: "left" },
    imagery: { radius: "lg", shadow: "lg", treatment: "contained", border: false },
    components: { announcement: "none", hero: "product", features: "grid", navbar: "split", card: "bordered", button: "solid", socialProof: "metrics", pricing: "toggle", faq: "grid", team: "list", blog: "grid", cta: "banner", footer: "expanded", cursor: "default" },
    motion: "professional",
  }),
  definePreset({
    id: "mobile-app", name: "App Launch", family: "Startups", copy: "app",
    bestFor: "Consumer mobile apps and their download pages",
    description: "Rounded and bright, device-first hero, reviews and a download push",
    seed: "#6d3fe0", pairing: "friendly-rounded", typeScale: 1.3, radius: 1.25,
    layout: { density: "balanced", maxWidth: 72, gutter: 2, sectionSpacing: 7, alignment: "center" },
    imagery: { radius: "xl", shadow: "xl", treatment: "contained", border: false },
    components: { announcement: "floating", hero: "product", features: "tabs", navbar: "floating", card: "elevated", button: "pill", socialProof: "testimonial-carousel", pricing: "tiers", faq: "accordion", team: "none", blog: "none", cta: "banner", footer: "social", cursor: "default" },
    motion: "expressive",
  }),

  definePreset({
    id: "tuition", name: "Tuition Centre", family: "Education", copy: "tuition",
    bestFor: "Tuition and learning centres for primary, secondary and JC students",
    description: "Reassuring and clear: results, small classes, tutors by name and an easy trial booking",
    seed: "#1f5fbf", pairing: "friendly-rounded", typeScale: 1.24, radius: 0.625,
    layout: { density: "balanced", maxWidth: 72, gutter: 2, sectionSpacing: 7, alignment: "left" },
    imagery: { radius: "lg", shadow: "sm", treatment: "contained", border: false },
    components: { announcement: "banner", hero: "split", features: "cards", navbar: "split", card: "bordered", button: "solid", socialProof: "metrics", pricing: "tiers", faq: "accordion", team: "grid", blog: "grid", cta: "booking", footer: "columns", cursor: "default" },
    motion: "subtle",
  }),
  definePreset({
    id: "enrichment-kids", name: "Enrichment & Kids", family: "Education", copy: "enrichment",
    bestFor: "Enrichment classes, preschools, holiday camps and kids' activities",
    description: "Playful colour and big rounded shapes, programmes by age, parent reviews and a free trial",
    seed: "#f2600c", pairing: "friendly-rounded", typeScale: 1.3, radius: 1.25,
    layout: { density: "spacious", maxWidth: 72, gutter: 2, sectionSpacing: 8, alignment: "center" },
    imagery: { radius: "xl", shadow: "md", treatment: "contained", border: false },
    components: { announcement: "banner", hero: "centered", features: "cards", navbar: "floating", card: "feature", button: "pill", socialProof: "testimonial-carousel", pricing: "tiers", faq: "accordion", team: "grid", blog: "grid", cta: "booking", footer: "columns", cursor: "default" },
    motion: "expressive",
  }),
  definePreset({
    id: "online-academy", name: "Online Academy", family: "Education", copy: "academy",
    bestFor: "Online courses, bootcamps, cohorts and professional training",
    description: "Curriculum laid out week by week, outcomes and alumni up front, one clear enrol action",
    seed: "#2447d6", pairing: "modern-serif-mix", typeScale: 1.3, radius: 0.5,
    layout: { density: "balanced", maxWidth: 74, gutter: 2, sectionSpacing: 8, alignment: "left" },
    imagery: { radius: "lg", shadow: "md", treatment: "contained", border: false },
    components: { announcement: "banner", hero: "split", features: "alternating", navbar: "floating", card: "bordered", button: "solid", socialProof: "metrics", pricing: "tiers", faq: "two-column", team: "featured", blog: "grid", cta: "newsletter", footer: "columns", cursor: "default" },
    motion: "professional",
  }),
  definePreset({
    id: "private-tutor", name: "Private Tutor", family: "Education", copy: "tutor",
    bestFor: "Independent tutors and coaches marketing themselves",
    description: "A personal, credible one-pager: who you are, how lessons work, reviews and rates",
    seed: "#1c3f73", pairing: "quiet-editorial", typeScale: 1.27, radius: 0.375,
    layout: { density: "editorial", maxWidth: 62, gutter: 2, sectionSpacing: 9, alignment: "left" },
    imagery: { radius: "md", shadow: "none", treatment: "contained", border: true },
    components: { announcement: "none", hero: "split", features: "grid", navbar: "minimal", card: "minimal", button: "solid", socialProof: "testimonial-grid", pricing: "tiers", faq: "accordion", team: "none", blog: "list", cta: "booking", footer: "minimal", cursor: "default" },
    motion: "subtle",
  }),

  definePreset({
    id: "growth-agency", name: "Performance Agency", family: "Agencies", copy: "growth",
    bestFor: "Digital marketing, paid media and growth agencies",
    description: "Numbers-first: results as the hero, services, retainers and a free-audit hook",
    seed: "#14804a", pairing: "geometric-tech", typeScale: 1.28, radius: 0.5,
    layout: { density: "balanced", maxWidth: 76, gutter: 2, sectionSpacing: 7, alignment: "left" },
    imagery: { radius: "lg", shadow: "md", treatment: "contained", border: false },
    components: { announcement: "banner", hero: "dashboard", features: "grid", navbar: "split", card: "elevated", button: "solid", socialProof: "metrics", pricing: "tiers", faq: "accordion", team: "grid", blog: "grid", cta: "contact-form", footer: "columns", cursor: "default" },
    motion: "professional",
  }),
  definePreset({
    id: "freelancer", name: "Freelance Portfolio", family: "Agencies", copy: "freelancer",
    bestFor: "Independent designers, developers, photographers and consultants",
    description: "Work first and big, a personal voice, a short list of engagements and one way to get in touch",
    seed: "#1b1b1b", pairing: "type-forward", typeScale: 1.38, radius: 0,
    layout: { density: "editorial", maxWidth: 64, gutter: 2.5, sectionSpacing: 11, alignment: "left" },
    imagery: { radius: "none", shadow: "none", treatment: "full-bleed", border: false },
    components: { announcement: "none", hero: "editorial", features: "alternating", navbar: "minimal", card: "minimal", button: "text", socialProof: "testimonial-grid", pricing: "single", faq: "two-column", team: "none", blog: "list", cta: "contact-form", footer: "minimal", cursor: "ring" },
    motion: "cinematic",
  }),

  definePreset({
    id: "fitness-studio", name: "Fitness Studio", family: "Local business", copy: "fitness",
    bestFor: "Gyms, boutique fitness, yoga, pilates and martial arts studios",
    description: "High energy: condensed headlines, class timetable, memberships and a free first class",
    seed: "#e0312d", pairing: "bold-statement", typeScale: 1.4, radius: 0.25,
    layout: { density: "compact", maxWidth: 76, gutter: 2, sectionSpacing: 7, alignment: "left" },
    imagery: { radius: "sm", shadow: "none", treatment: "full-bleed", border: false },
    components: { announcement: "banner", hero: "video-led", features: "cards", navbar: "split", card: "image", button: "solid", socialProof: "testimonial-carousel", pricing: "toggle", faq: "accordion", team: "grid", blog: "grid", cta: "booking", footer: "social", cursor: "default" },
    motion: "expressive",
  }),
  definePreset({
    id: "beauty-wellness", name: "Beauty & Wellness", family: "Local business", copy: "beauty",
    bestFor: "Salons, spas, aesthetics clinics and wellness studios",
    description: "Soft and calm: generous imagery, a treatment menu, therapists and online booking",
    seed: "#9b5470", pairing: "luxury-contrast", typeScale: 1.3, radius: 1,
    layout: { density: "spacious", maxWidth: 70, gutter: 2.5, sectionSpacing: 10, alignment: "center" },
    imagery: { radius: "xl", shadow: "sm", treatment: "contained", border: false },
    components: { announcement: "banner", hero: "image-led", features: "cards", navbar: "centered", card: "minimal", button: "pill", socialProof: "testimonial-grid", pricing: "tiers", faq: "accordion", team: "grid", blog: "featured", cta: "booking", footer: "columns", cursor: "default" },
    motion: "subtle",
  }),

  definePreset({
    id: "charity", name: "Charity & Community", family: "Local business", copy: "charity",
    bestFor: "Charities, non-profits, community groups and social enterprises",
    description: "Warm and plain-spoken: the cause up front, impact in numbers, monthly giving and volunteering",
    seed: "#d9480f", pairing: "warm-humanist", typeScale: 1.28, radius: 0.75,
    layout: { density: "balanced", maxWidth: 70, gutter: 2, sectionSpacing: 8, alignment: "left" },
    imagery: { radius: "lg", shadow: "sm", treatment: "contained", border: false },
    components: { announcement: "banner", hero: "image-led", features: "cards", navbar: "split", card: "feature", button: "solid", socialProof: "metrics", pricing: "toggle", faq: "accordion", team: "grid", blog: "featured", cta: "newsletter", footer: "columns", cursor: "default" },
    motion: "subtle",
  }),

  definePreset({
    id: "online-shop", name: "Online Shop", family: "Hospitality & retail", copy: "shop",
    bestFor: "Independent shops and brands selling online, with or without a physical store",
    description: "Product-first and easy to buy from: new arrivals, delivery and returns answered, gift bundles",
    seed: "#2f5d50", pairing: "neutral-modern", typeScale: 1.25, radius: 0.5,
    layout: { density: "balanced", maxWidth: 78, gutter: 2, sectionSpacing: 7, alignment: "left" },
    imagery: { radius: "md", shadow: "none", treatment: "contained", border: false },
    components: { announcement: "banner", hero: "image-led", features: "grid", navbar: "split", card: "image", button: "solid", socialProof: "testimonial-grid", pricing: "tiers", faq: "two-column", team: "none", blog: "grid", cta: "newsletter", footer: "columns", cursor: "default" },
    motion: "subtle",
  }),
  definePreset({
    id: "boutique-hotel", name: "Boutique Hotel", family: "Hospitality & retail", copy: "hotel",
    bestFor: "Boutique hotels, guesthouses, serviced apartments and resorts",
    description: "Unhurried and photographic: the place first, rooms and rates clearly laid out, book direct",
    seed: "#6b4f3a", pairing: "refined-serif", typeScale: 1.32, radius: 0.25,
    layout: { density: "spacious", maxWidth: 76, gutter: 2.5, sectionSpacing: 10, alignment: "center" },
    imagery: { radius: "sm", shadow: "none", treatment: "full-bleed", border: false },
    components: { announcement: "floating", hero: "image-led", features: "alternating", navbar: "centered", card: "image", button: "outline", socialProof: "testimonial-carousel", pricing: "tiers", faq: "accordion", team: "minimal", blog: "featured", cta: "booking", footer: "columns", cursor: "default" },
    motion: "cinematic",
  }),
  definePreset({
    id: "events-weddings", name: "Events & Weddings", family: "Hospitality & retail", copy: "events",
    bestFor: "Wedding planners, event companies, venues and celebrants",
    description: "Romantic but organised: real events, packages by scope, and a date check as the first step",
    seed: "#a14d62", pairing: "luxury-contrast", typeScale: 1.34, radius: 0.75,
    layout: { density: "spacious", maxWidth: 72, gutter: 2.5, sectionSpacing: 10, alignment: "center" },
    imagery: { radius: "lg", shadow: "sm", treatment: "contained", border: false },
    components: { announcement: "banner", hero: "centered", features: "cards", navbar: "centered", card: "minimal", button: "pill", socialProof: "testimonial-grid", pricing: "tiers", faq: "accordion", team: "grid", blog: "featured", cta: "contact-form", footer: "social", cursor: "default" },
    motion: "subtle",
  }),

  definePreset({
    id: "accounting-firm", name: "Accounting & Advisory", family: "Professional services", copy: "accounting",
    bestFor: "Accountants, bookkeepers, tax and corporate secretarial firms",
    description: "Steady and reassuring: services, fixed monthly packages, deadlines handled",
    seed: "#17508a", pairing: "clean-corporate", typeScale: 1.22, radius: 0.375,
    layout: { density: "balanced", maxWidth: 70, gutter: 2, sectionSpacing: 7, alignment: "left" },
    imagery: { radius: "md", shadow: "sm", treatment: "contained", border: false },
    components: { announcement: "banner", hero: "split", features: "grid", navbar: "split", card: "bordered", button: "solid", socialProof: "metrics", pricing: "comparison", faq: "two-column", team: "list", blog: "list", cta: "contact-form", footer: "expanded", cursor: "default" },
    motion: "subtle",
  }),
  definePreset({
    id: "interior-design", name: "Interior Design", family: "Professional services", copy: "interior",
    bestFor: "Interior designers, renovation firms and architects working on homes",
    description: "Warm neutrals and large photography, projects told as stories, consultation-led",
    seed: "#8a6444", pairing: "modern-serif-mix", typeScale: 1.34, radius: 0.25,
    layout: { density: "spacious", maxWidth: 78, gutter: 3, sectionSpacing: 11, alignment: "left" },
    imagery: { radius: "sm", shadow: "none", treatment: "full-bleed", border: false },
    components: { announcement: "none", hero: "image-led", features: "alternating", navbar: "minimal", card: "image", button: "outline", socialProof: "testimonial-grid", pricing: "tiers", faq: "accordion", team: "featured", blog: "featured", cta: "booking", footer: "minimal", cursor: "ring" },
    motion: "cinematic",
  }),
);

export const PRESET_FAMILIES = ["Startups", "Education", "Agencies", "Local business", "Hospitality & retail", "Professional services", "Styles", "Custom"] as const;

// --- Custom presets (§Wave D Templating-1) --------------------------------------
// Unlike the parametric presets above, a custom preset is built directly from a
// live project's concrete values — captured once, then reapplied verbatim.

/** Captures the current project's facet values, ready to persist as a CustomPreset. */
export function captureCustomPresetFacets(project: DesignProject): CustomPreset["facets"] {
  return {
    palette: structuredClone(project.tokens.colors),
    typography: structuredClone(project.tokens.typography),
    geometry: {
      radius: structuredClone(project.tokens.geometry.radius),
      borderWidth: structuredClone(project.tokens.geometry.borderWidth),
      layout: structuredClone(project.tokens.layout),
      imagery: structuredClone(project.tokens.imagery),
    },
    components: structuredClone(project.recipe.components),
    motion: structuredClone(project.recipe.motion),
  };
}

/** Wraps a stored CustomPreset back into the same Preset shape the built-ins use, so
 *  the rest of the UI (application, facet picker, thumbnails) never has to know the
 *  difference. */
export function customPresetToPreset(preset: CustomPreset): Preset {
  const primaryHex = toHex(resolveSemantic(preset.facets.palette, "light", "primary"));
  return {
    id: preset.id,
    name: preset.name,
    family: "Custom",
    description: preset.description || "Saved from a project",
    seed: primaryHex,
    pairing: "",
    facets: {
      palette: (draft) => {
        // Brand colours from an uploaded logo still outrank a saved starting point.
        if (draft.analysis) return;
        draft.tokens.colors = structuredClone(preset.facets.palette);
        markProvenance(draft, SEMANTIC_TOKENS.map((t) => `tokens.colors.${t}`), "preset");
      },
      typography: (draft) => {
        draft.tokens.typography = structuredClone(preset.facets.typography);
        markProvenance(draft, [
          "tokens.typography.display", "tokens.typography.body", "tokens.typography.mono",
          "tokens.typography.scale",
        ], "preset");
      },
      geometry: (draft) => {
        draft.tokens.geometry.radius = structuredClone(preset.facets.geometry.radius);
        draft.tokens.geometry.borderWidth = structuredClone(preset.facets.geometry.borderWidth);
        draft.tokens.layout = structuredClone(preset.facets.geometry.layout);
        draft.tokens.imagery = structuredClone(preset.facets.geometry.imagery);
        markProvenance(draft, [
          "tokens.geometry.radius", "tokens.geometry.spacing", "tokens.imagery.shadow",
          "tokens.layout.density", "tokens.layout.alignment",
          "tokens.imagery.radius", "tokens.imagery.treatment", "tokens.imagery.border",
        ], "preset");
      },
      components: (draft) => {
        draft.recipe.components = structuredClone(preset.facets.components);
        markProvenance(draft, Object.keys(preset.facets.components).map((k) => `recipe.components.${k}`), "preset");
      },
      motion: (draft) => {
        draft.recipe.motion = structuredClone(preset.facets.motion);
        markProvenance(draft, ["recipe.motion.profile"], "preset");
      },
    },
  };
}

// --- Thumbnails (§Wave D Templating-2) ------------------------------------------
// A colour dot and a name don't scan well past a handful of presets. Rather than
// hand-maintain separate thumbnail metadata per preset, apply just the palette and
// geometry facets to a scratch project and read the result back — the same facet
// functions that already define the preset, so a thumbnail can never drift from what
// applying the preset actually produces.

export interface PresetThumbnail {
  background: string;
  primary: string;
  accent: string;
  /** rem */
  radius: number;
  foreground: string;
  surface: string;
  muted: string;
  /** Font families, so a thumbnail can be set in the template's own type. */
  display: string;
  body: string;
  hero: DesignProject["recipe"]["components"]["hero"];
}

const thumbnailCache = new Map<string, PresetThumbnail>();

export function presetThumbnail(preset: Preset): PresetThumbnail {
  const cached = thumbnailCache.get(preset.id);
  if (cached) return cached;

  const scratch = produce(createProject("", ""), (draft) => {
    preset.facets.palette(draft);
    preset.facets.geometry(draft);
    preset.facets.typography(draft);
    preset.facets.components(draft);
  });
  const colour = (token: Parameters<typeof resolveSemantic>[2]) =>
    toHex(resolveSemantic(scratch.tokens.colors, "light", token));

  const thumb: PresetThumbnail = {
    background: colour("background"),
    primary: colour("primary"),
    accent: colour("accent"),
    radius: scratch.tokens.geometry.radius.md,
    foreground: colour("foreground"),
    surface: colour("surface"),
    muted: colour("muted"),
    display: scratch.tokens.typography.display.family,
    body: scratch.tokens.typography.body.family,
    hero: scratch.recipe.components.hero,
  };
  thumbnailCache.set(preset.id, thumb);
  return thumb;
}
