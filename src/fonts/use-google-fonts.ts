"use client";

import { useEffect } from "react";
import { findFont, googleFontUrl } from "./catalogue";

/**
 * Loads Google faces into the studio itself, not just the preview frame.
 *
 * The preview iframe has always fetched the project's fonts, but the studio chrome did
 * not — so every place that *talked about* a typeface (the pairing list, the template
 * cards) showed its name in the studio's own sans. You were choosing type by reading
 * its name. This makes those surfaces show the face.
 *
 * One stylesheet per family rather than one combined request: Google Fonts answers a
 * multi-family request with a 400 if any single family or weight is off, which would
 * take every face down with it. Families already requested stay requested — the
 * stylesheets are small and cached, and the actual font files only download for faces
 * something on the page is set in.
 */
const requested = new Set<string>();

export function useGoogleFonts(families: readonly string[]): void {
  const key = [...new Set(families)].sort().join("|");
  useEffect(() => {
    for (const family of key.split("|")) {
      if (!family || requested.has(family)) continue;
      const entry = findFont(family);
      const href = entry ? googleFontUrl([entry]) : null;
      if (!href) continue;
      requested.add(family);
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.dataset.dpStudioFont = family;
      document.head.appendChild(link);
    }
  }, [key]);
}

/** A CSS font-family value for a catalogue family, with its fallbacks. */
export function fontStack(family: string): string {
  const entry = findFont(family);
  const quote = (name: string) => (/^[\w-]+$/.test(name) && !/^\d/.test(name) ? name : `"${name}"`);
  return [family, ...(entry?.fallback ?? ["system-ui", "sans-serif"])].map(quote).join(", ");
}
