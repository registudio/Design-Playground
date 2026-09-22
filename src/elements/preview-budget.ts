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
export const MAX_LIVE_PREVIEWS = 4;

/** How far outside the viewport a card starts loading. */
export const ACTIVATION_MARGIN_PX = 700;

/**
 * How long an offscreen preview is kept before teardown. Long enough that a small
 * reverse scroll does not unmount and remount everything it passes.
 */
export const OFFSCREEN_GRACE_MS = 12_000;

/**
 * A search this narrow is taken as "show me these", so its results activate without
 * waiting to be scrolled into range.
 */
export const NARROW_SEARCH_LIMIT = 8;

/** Cards added to the DOM per scroll batch. */
export const CATALOGUE_BATCH = 36;

/** Compiled documents held on the server. */
export const DOCUMENT_CACHE_ENTRIES = 96;

/** Browser freshness, then how long a stale copy may be served while revalidating. */
export const BROWSER_FRESH_SECONDS = 60 * 60;
export const BROWSER_STALE_SECONDS = 60 * 60 * 24;
