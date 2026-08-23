import type { FontRole } from "@/schema/tokens";

/**
 * Font catalogue (§10.3).
 *
 * Kept as static metadata rather than fetched from the Google Fonts API, so the
 * playground works offline and the picker is instant. The export records family,
 * weights and subsets explicitly, which is what lets the build self-host the faces
 * rather than depending on the Google CDN at runtime.
 */

export interface CatalogueEntry {
  family: string;
  fallback: string[];
  source: FontRole["source"];
  weights: number[];
  /** Rough character, used to group the picker. */
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
  { family: "Geist", fallback: SANS_FALLBACK, source: "google", weights: [400, 500, 600, 700], category: "sans" },
  { family: "Manrope", fallback: SANS_FALLBACK, source: "google", weights: [400, 500, 700, 800], category: "sans" },
  { family: "Plus Jakarta Sans", fallback: SANS_FALLBACK, source: "google", weights: [400, 500, 700, 800], category: "sans" },
  { family: "Space Grotesk", fallback: SANS_FALLBACK, source: "google", weights: [400, 500, 700], category: "display" },
  { family: "Instrument Serif", fallback: SERIF_FALLBACK, source: "google", weights: [400], category: "serif" },
  { family: "Fraunces", fallback: SERIF_FALLBACK, source: "google", weights: [400, 600, 700, 900], category: "serif" },
  { family: "Playfair Display", fallback: SERIF_FALLBACK, source: "google", weights: [400, 600, 700, 900], category: "serif" },
  { family: "Libre Baskerville", fallback: SERIF_FALLBACK, source: "google", weights: [400, 700], category: "serif" },
  { family: "DM Sans", fallback: SANS_FALLBACK, source: "google", weights: [400, 500, 700], category: "sans" },
  { family: "Sora", fallback: SANS_FALLBACK, source: "google", weights: [400, 600, 800], category: "display" },
  { family: "IBM Plex Mono", fallback: MONO_FALLBACK, source: "google", weights: [400, 500], category: "mono" },
  { family: "JetBrains Mono", fallback: MONO_FALLBACK, source: "google", weights: [400, 500, 700], category: "mono" },
];

export const ALL_FONTS = [...SYSTEM_FONTS, ...GOOGLE_FONTS];

/**
 * Google Fonts CSS URL for the preview only. The export never points a client build at
 * this — it records the family and weights so the build self-hosts them.
 */
export function googleFontUrl(entries: CatalogueEntry[]): string | null {
  const google = entries.filter((e) => e.source === "google");
  if (google.length === 0) return null;
  const families = google
    .map((e) => `family=${e.family.replace(/ /g, "+")}:wght@${[...new Set(e.weights)].sort((a, b) => a - b).join(";")}`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}
