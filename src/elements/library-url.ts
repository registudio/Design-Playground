import { BROWSE_CATEGORIES } from "./taxonomy";

/**
 * The element library's view, as it is written into the page URL.
 *
 * The filters used to live in component state only, so "look at these" meant describing
 * a combination of chips to a colleague, and the browser's Back button left the page
 * instead of closing the full-screen view it had just opened. With the view in the URL a
 * link reproduces it exactly, and Back closes what was opened.
 *
 * Defaults are left out of the URL, so an untouched library stays at a bare `/`.
 */
export const COLLECTIONS = [
  "All collections",
  "Hero effects",
  "Subtle interactions",
  "CSS-only originals",
  "Text & feedback originals",
] as const;

export const ALL_TYPES = "All elements";

export interface LibraryView {
  query: string;
  category: string;
  /** A source id, "playground" for the originals, or null for every source. */
  source: string | null;
  collection: string;
  onlySelected: boolean;
  /** Hooks and utilities are hidden unless asked for: they can never show a preview. */
  utilities: boolean;
  /** The element open full screen. */
  open: string | null;
}

export const DEFAULT_VIEW: LibraryView = {
  query: "",
  category: ALL_TYPES,
  source: null,
  collection: COLLECTIONS[0],
  onlySelected: false,
  utilities: false,
  open: null,
};

/** The parameters this module owns; any other parameter in the URL is left alone. */
const KEYS = ["q", "type", "source", "collection", "selected", "utilities", "open"] as const;

export function readLibraryView(search: string): LibraryView {
  const params = new URLSearchParams(search);
  const type = params.get("type");
  const collection = params.get("collection");
  return {
    query: params.get("q") ?? "",
    // Unknown values fall back rather than filtering to nothing: a link made before a
    // category was renamed should still open the library.
    category: type && (BROWSE_CATEGORIES as readonly string[]).includes(type) ? type : ALL_TYPES,
    source: params.get("source") || null,
    collection: collection && (COLLECTIONS as readonly string[]).includes(collection) ? collection : COLLECTIONS[0],
    onlySelected: params.get("selected") === "1",
    utilities: params.get("utilities") === "1",
    open: params.get("open") || null,
  };
}

/** `search` with the view written into it; returns "" or a string starting with "?". */
export function writeLibraryView(view: LibraryView, search = ""): string {
  const params = new URLSearchParams(search);
  for (const key of KEYS) params.delete(key);
  if (view.query.trim()) params.set("q", view.query.trim());
  if (view.category !== ALL_TYPES) params.set("type", view.category);
  if (view.source) params.set("source", view.source);
  if (view.collection !== COLLECTIONS[0]) params.set("collection", view.collection);
  if (view.onlySelected) params.set("selected", "1");
  if (view.utilities) params.set("utilities", "1");
  if (view.open) params.set("open", view.open);
  const text = params.toString();
  return text ? `?${text}` : "";
}

/** `search` with every parameter this module owns removed, for when the library closes. */
export function clearLibraryView(search: string): string {
  return writeLibraryView(DEFAULT_VIEW, search);
}

/**
 * True when `search` describes a library view — a shared link. The page opens straight
 * into the library for one, rather than on the launch screen with the view waiting
 * behind a click the recipient has no reason to make.
 */
export function hasLibraryView(search: string): boolean {
  return writeLibraryView(readLibraryView(search)) !== "";
}
