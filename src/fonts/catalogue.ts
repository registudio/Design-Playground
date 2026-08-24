import type { FontRole } from "@/schema/tokens";

/**
 * Font catalogue (§10.3).
 *
 * Static metadata rather than a live Google Fonts API call, so the playground works
 * offline and the picker is instant. The export records family, weights and subsets
 * explicitly, which is what lets the build self-host the faces rather than depending
 * on the Google CDN at runtime.
 */

export interface CatalogueEntry {
  family: string;
  fallback: string[];
  source: FontRole["source"];
  weights: number[];
  category: "sans" | "serif" | "mono" | "display";
}

const SANS_FALLBACK = ["ui-sans-serif", "system-ui", "sans-serif"];
const SERIF_FALLBACK = ["ui-serif", "Georgia", "serif"];
const MONO_FALLBACK = ["ui-monospace", "SFMono-Regular", "monospace"];

export const SYSTEM_FONTS: CatalogueEntry[] = [
  { family: "Inter", fallback: SANS_FALLBACK, source: "system", weights: [400, 500, 600, 700], category: "sans" },
  { family: "system-ui", fallback: SANS_FALLBACK, source: "system", weights: [400, 600], category: "sans" },
  { family: "Georgia", fallback: SERIF_FALLBACK, source: "system", weights: [400, 700], category: "serif" },
  { family: "JetBrains Mono", fallback: MONO_FALLBACK, source: "system", weights: [400, 500], category: "mono" },
];

export const GOOGLE_FONTS: CatalogueEntry[] = [
  // Sans — workhorses
  { family: "Geist", fallback: SANS_FALLBACK, source: "google", weights: [400, 500, 600, 700], category: "sans" },
  { family: "Manrope", fallback: SANS_FALLBACK, source: "google", weights: [400, 500, 700, 800], category: "sans" },
  { family: "Plus Jakarta Sans", fallback: SANS_FALLBACK, source: "google", weights: [400, 500, 700, 800], category: "sans" },
  { family: "DM Sans", fallback: SANS_FALLBACK, source: "google", weights: [400, 500, 700], category: "sans" },
  { family: "Work Sans", fallback: SANS_FALLBACK, source: "google", weights: [400, 500, 600, 700], category: "sans" },
  { family: "Figtree", fallback: SANS_FALLBACK, source: "google", weights: [400, 500, 600, 800], category: "sans" },
  { family: "Outfit", fallback: SANS_FALLBACK, source: "google", weights: [400, 500, 600, 700], category: "sans" },
  { family: "Public Sans", fallback: SANS_FALLBACK, source: "google", weights: [400, 500, 700], category: "sans" },
  { family: "Karla", fallback: SANS_FALLBACK, source: "google", weights: [400, 500, 700, 800], category: "sans" },
  { family: "Rubik", fallback: SANS_FALLBACK, source: "google", weights: [400, 500, 600, 700], category: "sans" },
  { family: "Nunito Sans", fallback: SANS_FALLBACK, source: "google", weights: [400, 600, 700, 900], category: "sans" },
  { family: "Source Sans 3", fallback: SANS_FALLBACK, source: "google", weights: [400, 600, 700], category: "sans" },

  // Display / geometric — for headlines with personality
  { family: "Space Grotesk", fallback: SANS_FALLBACK, source: "google", weights: [400, 500, 700], category: "display" },
  { family: "Sora", fallback: SANS_FALLBACK, source: "google", weights: [400, 600, 800], category: "display" },
  { family: "Bricolage Grotesque", fallback: SANS_FALLBACK, source: "google", weights: [400, 600, 800], category: "display" },
  { family: "Archivo", fallback: SANS_FALLBACK, source: "google", weights: [400, 600, 700, 900], category: "display" },
  { family: "Chivo", fallback: SANS_FALLBACK, source: "google", weights: [400, 700, 900], category: "display" },
  { family: "Syne", fallback: SANS_FALLBACK, source: "google", weights: [400, 600, 700, 800], category: "display" },
  { family: "Unbounded", fallback: SANS_FALLBACK, source: "google", weights: [400, 600, 800], category: "display" },
  { family: "Anton", fallback: SANS_FALLBACK, source: "google", weights: [400], category: "display" },
  { family: "Bebas Neue", fallback: SANS_FALLBACK, source: "google", weights: [400], category: "display" },
  { family: "Righteous", fallback: SANS_FALLBACK, source: "google", weights: [400], category: "display" },

  // Serif — editorial and traditional
  { family: "Instrument Serif", fallback: SERIF_FALLBACK, source: "google", weights: [400], category: "serif" },
  { family: "Fraunces", fallback: SERIF_FALLBACK, source: "google", weights: [400, 600, 700, 900], category: "serif" },
  { family: "Playfair Display", fallback: SERIF_FALLBACK, source: "google", weights: [400, 600, 700, 900], category: "serif" },
  { family: "Libre Baskerville", fallback: SERIF_FALLBACK, source: "google", weights: [400, 700], category: "serif" },
  { family: "Lora", fallback: SERIF_FALLBACK, source: "google", weights: [400, 500, 600, 700], category: "serif" },
  { family: "Source Serif 4", fallback: SERIF_FALLBACK, source: "google", weights: [400, 600, 700], category: "serif" },
  { family: "Crimson Pro", fallback: SERIF_FALLBACK, source: "google", weights: [400, 600, 700], category: "serif" },
  { family: "Newsreader", fallback: SERIF_FALLBACK, source: "google", weights: [400, 500, 600, 700], category: "serif" },
  { family: "Spectral", fallback: SERIF_FALLBACK, source: "google", weights: [400, 600, 700], category: "serif" },
  { family: "DM Serif Display", fallback: SERIF_FALLBACK, source: "google", weights: [400], category: "serif" },
  { family: "Cormorant Garamond", fallback: SERIF_FALLBACK, source: "google", weights: [400, 600, 700], category: "serif" },
  { family: "EB Garamond", fallback: SERIF_FALLBACK, source: "google", weights: [400, 500, 600, 700], category: "serif" },

  // Mono
  { family: "IBM Plex Mono", fallback: MONO_FALLBACK, source: "google", weights: [400, 500], category: "mono" },
  { family: "JetBrains Mono", fallback: MONO_FALLBACK, source: "google", weights: [400, 500, 700], category: "mono" },
  { family: "Space Mono", fallback: MONO_FALLBACK, source: "google", weights: [400, 700], category: "mono" },
  { family: "Geist Mono", fallback: MONO_FALLBACK, source: "google", weights: [400, 500], category: "mono" },
];

export const ALL_FONTS = [...SYSTEM_FONTS, ...GOOGLE_FONTS];

export function findFont(family: string): CatalogueEntry | undefined {
  return ALL_FONTS.find((f) => f.family === family);
}

/**
 * Curated display/body pairings (§10.3).
 *
 * Pairing type well is a skill, and picking two families independently from a long
 * list mostly produces mismatches. These are combinations that hold together, so the
 * common case is one click rather than two informed guesses.
 */
export interface FontPairing {
  id: string;
  name: string;
  description: string;
  display: string;
  body: string;
  mono: string;
}

export const FONT_PAIRINGS: FontPairing[] = [
  {
    id: "neutral-modern",
    name: "Neutral Modern",
    description: "One family throughout — quiet, safe, works anywhere",
    display: "Inter", body: "Inter", mono: "JetBrains Mono",
  },
  {
    id: "geometric-tech",
    name: "Geometric Tech",
    description: "Distinctive headlines over a neutral body",
    display: "Space Grotesk", body: "Inter", mono: "JetBrains Mono",
  },
  {
    id: "editorial-serif",
    name: "Editorial Serif",
    description: "Serif display over a readable serif body",
    display: "Fraunces", body: "Libre Baskerville", mono: "IBM Plex Mono",
  },
  {
    id: "luxury-contrast",
    name: "Luxury Contrast",
    description: "High-contrast serif headlines, clean sans body",
    display: "Playfair Display", body: "DM Sans", mono: "IBM Plex Mono",
  },
  {
    id: "warm-humanist",
    name: "Warm Humanist",
    description: "Soft serif headings with a friendly sans",
    display: "Lora", body: "Karla", mono: "Space Mono",
  },
  {
    id: "swiss-grid",
    name: "Swiss Grid",
    description: "Tight, objective, grid-friendly",
    display: "Archivo", body: "Public Sans", mono: "Space Mono",
  },
  {
    id: "bold-statement",
    name: "Bold Statement",
    description: "Condensed poster headlines, plain body",
    display: "Anton", body: "Work Sans", mono: "Space Mono",
  },
  {
    id: "expressive-display",
    name: "Expressive Display",
    description: "Characterful headlines with a rounded body",
    display: "Syne", body: "Figtree", mono: "Geist Mono",
  },
  {
    id: "classic-publishing",
    name: "Classic Publishing",
    description: "Old-style serif for long-form reading",
    display: "EB Garamond", body: "Source Serif 4", mono: "IBM Plex Mono",
  },
  {
    id: "clean-corporate",
    name: "Clean Corporate",
    description: "Restrained and institutional",
    display: "Source Sans 3", body: "Source Sans 3", mono: "IBM Plex Mono",
  },
  {
    id: "modern-serif-mix",
    name: "Modern Serif Mix",
    description: "Contemporary serif headings, geometric sans body",
    display: "Instrument Serif", body: "Geist", mono: "Geist Mono",
  },
  {
    id: "friendly-rounded",
    name: "Friendly Rounded",
    description: "Approachable and open",
    display: "Outfit", body: "Nunito Sans", mono: "Space Mono",
  },
  {
    id: "brutalist-mono",
    name: "Brutalist Mono",
    description: "Monospace headlines, utilitarian body",
    display: "Space Mono", body: "Chivo", mono: "Space Mono",
  },
  {
    id: "quiet-editorial",
    name: "Quiet Editorial",
    description: "Understated serif with a neutral companion",
    display: "Newsreader", body: "Inter", mono: "IBM Plex Mono",
  },
  {
    id: "startup-energetic",
    name: "Startup Energetic",
    description: "Punchy headlines, highly legible body",
    display: "Bricolage Grotesque", body: "Plus Jakarta Sans", mono: "Geist Mono",
  },
  {
    id: "considered-sans",
    name: "Considered Sans",
    description: "Two precise sans faces, built for design-led professional work",
    display: "Manrope", body: "Public Sans", mono: "IBM Plex Mono",
  },
  {
    id: "refined-serif",
    name: "Refined Serif",
    description: "Two considered serifs — authoritative without shouting",
    display: "Spectral", body: "Source Serif 4", mono: "IBM Plex Mono",
  },
  {
    id: "type-forward",
    name: "Type Forward",
    description: "An expressive variable serif over a quiet reading serif",
    display: "Fraunces", body: "Newsreader", mono: "Space Mono",
  },
];

/**
 * Google Fonts CSS URL for the preview only. The export never points a client build
 * at this — it records family and weights so the build self-hosts them.
 */
export function googleFontUrl(entries: CatalogueEntry[]): string | null {
  // A pairing can reuse the same family for two roles (e.g. Space Mono as both
  // display and mono), so dedupe by family before building the request.
  const byFamily = new Map<string, CatalogueEntry>();
  for (const entry of entries) {
    if (entry.source !== "google") continue;
    byFamily.set(entry.family, entry);
  }
  if (byFamily.size === 0) return null;
  const families = [...byFamily.values()]
    .map((e) => `family=${e.family.replace(/ /g, "+")}:wght@${[...new Set(e.weights)].sort((a, b) => a - b).join(";")}`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}
