/**
 * Resource budgets for the element preview runtime.
 *
 * Centralised beside the implementation, as the visualisation contract asks, because
 * they interact: raising the concurrency limit without also widening the activation
 * margin just means four previews start later and all at once. They bound different
 * resources — proximity bounds relevance, the queue bounds concurrent work, caching
 * bounds repeated work, batching and teardown bound DOM and memory — so they should be
 * tuned against a profile rather than raised to make more previews appear at once.
 */

/** Registry previews allowed to be live at the same time. */
// Covers a full large-screen grid plus one approaching row. A cap of four left visible
// cards waiting behind other visible cards, which made their prose posters look like
// the final preview rather than a loading state.
export const MAX_LIVE_PREVIEWS = 12;

/** How far outside the viewport a card starts loading. */
export const ACTIVATION_MARGIN_PX = 320;

/**
 * How long an offscreen preview is kept before teardown. Long enough that a small
 * reverse scroll does not unmount and remount everything it passes.
 */
export const OFFSCREEN_GRACE_MS = 8000;

/**
 * A preview that has not reached a terminal state is never torn down before this.
 *
 * Compiling a registry component takes seconds. With a short grace period alone, a card
 * nudged just outside the activation margin lost its slot mid-compile, and scrolling
 * back restarted it from nothing — so a preview in a busy part of the grid could churn
 * indefinitely without ever finishing. Work already in flight is protected until it
 * resolves or this cap expires.
 */
export const IN_FLIGHT_PROTECTION_MS = 25_000;

/**
 * A search this narrow is taken as "show me these", so its results activate without
 * waiting to be scrolled into range.
 */
export const NARROW_SEARCH_LIMIT = 8;

/**
 * How long the search box must be still before the catalogue re-filters.
 *
 * Long enough to skip the intermediate states of a typed word, short enough that the
 * grid still feels answerable to the keyboard.
 */
export const SEARCH_DEBOUNCE_MS = 180;

/** Cards added to the DOM per scroll batch. */
export const CATALOGUE_BATCH = 36;

/**
 * The most cards allowed in the DOM at once, as a multiple of the batch.
 *
 * Batching alone only ever grew the list: scrolling to the end of "All elements" left
 * every one of ~490 cards mounted, each with its own listeners and layout. Four batches
 * is enough to cover a tall screen plus a screenful of slack above and below, so the
 * window never catches up with a fast scroll.
 */
export const MAX_MOUNTED_BATCHES = 4;

export interface CatalogueWindow {
  start: number;
  end: number;
}

const mountedLimit = CATALOGUE_BATCH * MAX_MOUNTED_BATCHES;

/** Moves the bounded card window down, or directly to the final rows after an End jump. */
export function advanceCatalogueWindow(
  current: CatalogueWindow,
  total: number,
  jumpToEnd = false,
): CatalogueWindow {
  const end = jumpToEnd ? total : Math.min(total, current.end + CATALOGUE_BATCH);
  return { start: Math.max(current.start, end - mountedLimit), end };
}

/** Moves the bounded card window up, or directly to the first rows after a Home jump. */
export function retreatCatalogueWindow(
  current: CatalogueWindow,
  total: number,
  jumpToStart = false,
): CatalogueWindow {
  const start = jumpToStart ? 0 : Math.max(0, current.start - CATALOGUE_BATCH);
  return { start, end: Math.min(total, start + mountedLimit) };
}

/** Compiled documents held on the server. */
export const DOCUMENT_CACHE_ENTRIES = 96;

/**
 * Compiled documents kept on disk, behind the memory cache.
 *
 * Larger than the memory tier because a file is far cheaper to hold than a live entry,
 * and the whole point is surviving restarts — a cache that only held the last session's
 * few previews would rarely hit.
 */
export const DISK_CACHE_ENTRIES = 400;

/** Browser freshness, then how long a stale copy may be served while revalidating. */
export const BROWSER_FRESH_SECONDS = 60 * 60;
export const BROWSER_STALE_SECONDS = 60 * 60 * 24;
