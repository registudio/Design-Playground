import type { DesignTokens } from "./tokens";
import type { SiteRecipe } from "./recipe";
import type { AssetManifest } from "./assets";
import type { DesignProject } from "./project";
import { ASSET_ROOT } from "./assets";
import { PROJECT_SCHEMA_ID } from "./project";
import { TOKENS_SCHEMA_ID } from "./tokens";
import { RECIPE_SCHEMA_ID } from "./recipe";
import { suggestPalette } from "@/color/semantic";

/**
 * A neutral, professional starting point. Deliberately unopinionated: presets (§14)
 * are what carry a point of view, and this is what they start from.
 */

export function defaultTokens(): DesignTokens {
  return {
    schema: TOKENS_SCHEMA_ID,
    colors: suggestPalette({ detected: [] }),
    typography: {
      display: {
        family: "Inter",
        fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
        source: "system",
        weights: [600, 700],
        subsets: ["latin"],
      },
      body: {
        family: "Inter",
        fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
        source: "system",
        weights: [400, 500],
        subsets: ["latin"],
      },
      mono: {
        family: "JetBrains Mono",
        fallback: ["ui-monospace", "SFMono-Regular", "monospace"],
        source: "system",
        weights: [400],
        subsets: ["latin"],
      },
      // Sizes in rem, matching the px ladder in §10.3 at a 16px root.
      scale: {
        displayXl: { size: 4.5, lineHeight: 1.05, letterSpacing: -0.02, weight: 700, transform: "none", role: "display" },
        displayL: { size: 3.5, lineHeight: 1.1, letterSpacing: -0.02, weight: 700, transform: "none", role: "display" },
        heading1: { size: 3, lineHeight: 1.15, letterSpacing: -0.015, weight: 700, transform: "none", role: "display" },
        heading2: { size: 2.25, lineHeight: 1.2, letterSpacing: -0.01, weight: 600, transform: "none", role: "display" },
        heading3: { size: 1.75, lineHeight: 1.3, letterSpacing: -0.005, weight: 600, transform: "none", role: "display" },
        bodyL: { size: 1.125, lineHeight: 1.6, letterSpacing: 0, weight: 400, transform: "none", role: "body" },
        body: { size: 1, lineHeight: 1.6, letterSpacing: 0, weight: 400, transform: "none", role: "body" },
        small: { size: 0.875, lineHeight: 1.5, letterSpacing: 0, weight: 400, transform: "none", role: "body" },
        caption: { size: 0.75, lineHeight: 1.4, letterSpacing: 0.01, weight: 500, transform: "none", role: "body" },
      },
    },
    geometry: {
      radius: { none: 0, sm: 0.25, md: 0.5, lg: 0.75, xl: 1, full: 9999 },
      borderWidth: { hairline: 1, default: 1, thick: 2 },
      shadow: {
        none: [],
        sm: [{ x: 0, y: 1, blur: 2, spread: 0, color: { l: 0, c: 0, h: 0, alpha: 0.05 } }],
        md: [
          { x: 0, y: 4, blur: 6, spread: -1, color: { l: 0, c: 0, h: 0, alpha: 0.1 } },
          { x: 0, y: 2, blur: 4, spread: -2, color: { l: 0, c: 0, h: 0, alpha: 0.1 } },
        ],
        lg: [
          { x: 0, y: 10, blur: 15, spread: -3, color: { l: 0, c: 0, h: 0, alpha: 0.1 } },
          { x: 0, y: 4, blur: 6, spread: -4, color: { l: 0, c: 0, h: 0, alpha: 0.1 } },
        ],
        xl: [
          { x: 0, y: 20, blur: 25, spread: -5, color: { l: 0, c: 0, h: 0, alpha: 0.1 } },
          { x: 0, y: 8, blur: 10, spread: -6, color: { l: 0, c: 0, h: 0, alpha: 0.1 } },
        ],
      },
      spacing: {
        "0": 0, "1": 0.25, "2": 0.5, "3": 0.75, "4": 1, "6": 1.5, "8": 2,
        "12": 3, "16": 4, "24": 6, "32": 8, "48": 12, "64": 16,
      },
    },
    layout: {
      density: "balanced",
      maxWidth: 72,
      gutter: 1.5,
      sectionSpacing: 6,
      gridColumns: 12,
      alignment: "left",
    },
    imagery: {
      radius: "lg",
      border: false,
      shadow: "none",
      aspectRatios: ["16/9", "4/3", "1/1"],
      treatment: "contained",
      overlay: { enabled: false, color: { l: 0, c: 0, h: 0 }, opacity: 0.3 },
    },
    motion: {
      profile: "professional",
      duration: { fast: 150, base: 320, slow: 600 },
      easing: {
        standard: "cubic-bezier(0.4, 0, 0.2, 1)",
        enter: "cubic-bezier(0, 0, 0.2, 1)",
        exit: "cubic-bezier(0.4, 0, 1, 1)",
      },
      distance: 24,
      scale: 0.96,
      stagger: 60,
    },
  };
}

export function defaultRecipe(): SiteRecipe {
  return {
    schema: RECIPE_SCHEMA_ID,
    components: {
      button: "solid",
      card: "bordered",
      input: "bordered",
      navbar: "minimal",
      hero: "split",
      features: "grid",
      cta: "banner",
      footer: "columns",
      cursor: "default",
    },
    motion: {
      profile: "professional",
      entrance: {
        default: {
          recipe: "animation.entrance.fade-up",
          engine: "motion",
          properties: ["opacity", "y"],
          reducedMotion: "fade-only",
        },
      },
      interaction: {
        button: {
          recipe: "animation.button.arrow-shift",
          engine: "motion",
          properties: ["x"],
          reducedMotion: "none",
        },
        card: {
          recipe: "animation.card.lift",
          engine: "motion",
          properties: ["y", "boxShadow"],
          reducedMotion: "none",
        },
      },
      scroll: {
        default: {
          recipe: "animation.scroll.reveal",
          engine: "gsap",
          properties: ["opacity", "y"],
          reducedMotion: "instant",
        },
      },
    },
  };
}

export function defaultManifest(): AssetManifest {
  return { schema: "asset-manifest/v1", root: ASSET_ROOT, logo: {}, fonts: [], images: [] };
}

export function createProject(name: string, client = ""): DesignProject {
  return {
    schema: PROJECT_SCHEMA_ID,
    id: crypto.randomUUID(),
    name,
    client,
    notes: "",
    appliedPreset: null,
    tokens: defaultTokens(),
    recipe: defaultRecipe(),
    assets: defaultManifest(),
    analysis: null,
    suggestion: null,
    provenance: {},
  };
}
