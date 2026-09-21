import type { DesignElement, RegistryIndex } from "./schema";
import type { RoutingCategory, SourceId } from "./sources";

/**
 * Search, faceting and staleness for the Elements browser.
 *
 * Kept away from React so the counts shown on the filter chips are computed by the
 * same code that filters the results — a chip claiming "12" next to a list of 9 is
 * the classic way faceted browsers lose trust.
 */

export interface ElementQuery {
  text: string;
  sources: SourceId[];
  categories: RoutingCategory[];
  /** Hide Componentry's reference-only entries (§1c). */
  installableOnly: boolean;
  engines: Array<"motion" | "gsap">;
}

export function emptyQuery(): ElementQuery {
  return { text: "", sources: [], categories: [], installableOnly: false, engines: [] };
}

/**
 * Substring match over the fields a person would actually type.
 *
 * Deliberately not fuzzy: with ~400 entries and real filter chips, fuzzy matching
 * mostly produces confident-looking wrong answers. Every term must match somewhere,
 * so typing more words narrows rather than widens.
 */
function matchesText(element: DesignElement, text: string): boolean {
  const query = text.trim().toLowerCase();
  if (!query) return true;
  const haystack = `${element.title} ${element.name} ${element.description}`.toLowerCase();
  return query.split(/\s+/).every((term) => haystack.includes(term));
}

export function filterElements(
  elements: DesignElement[],
  query: ElementQuery,
): DesignElement[] {
  return elements.filter((element) => {
    if (!matchesText(element, query.text)) return false;
    if (query.sources.length && !query.sources.includes(element.source)) return false;
    if (query.categories.length && !query.categories.includes(element.category)) return false;
    if (query.installableOnly && element.referenceOnly) return false;
    if (query.engines.length && !query.engines.some((e) => element.engineDependency.includes(e)))
      return false;
    return true;
  });
}

/**
 * Counts for one facet, computed with that facet's own selection lifted.
 *
 * Without the lift, selecting "Bklit" would drive every other source's chip to 0 and
 * the user could never tell what else exists — the chips stop being navigation and
 * become a dead end.
 */
export function sourceCounts(
  elements: DesignElement[],
  query: ElementQuery,
): Record<string, number> {
  const base = filterElements(elements, { ...query, sources: [] });
  return tally(base, (element) => element.source);
}

export function categoryCounts(
  elements: DesignElement[],
  query: ElementQuery,
): Record<string, number> {
  const base = filterElements(elements, { ...query, categories: [] });
  return tally(base, (element) => element.category);
}

function tally<T>(items: T[], key: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) counts[key(item)] = (counts[key(item)] ?? 0) + 1;
  return counts;
}

/**
 * Registry contents move week to week — Sora UI was observed going 139 -> 69 inside
 * one week — so a week is the point past which an index should be treated as a guess.
 */
export const STALE_AFTER_DAYS = 7;

export interface Staleness {
  /** No successful fetch has ever run, so there is nothing to browse yet. */
  empty: boolean;
  stale: boolean;
  daysOld: number | null;
  /** Sources whose last refresh failed — their entries may be gone upstream. */
  failed: SourceId[];
}

/**
 * §3 is emphatic that staleness is surfaced rather than hidden: showing a component
 * as available after its upstream entry is gone yields a broken install command,
 * which is worse than not indexing it at all.
 */
export function stalenessOf(index: RegistryIndex, now = new Date()): Staleness {
  const failed = index.sources.filter((s) => !s.ok).map((s) => s.id);
  if (!index.fetchedAt) return { empty: true, stale: true, daysOld: null, failed };

  const fetched = new Date(index.fetchedAt).getTime();
  // An unparseable timestamp is treated as stale rather than fresh: the failure mode
  // of a false "up to date" badge is a broken install command.
  if (Number.isNaN(fetched)) return { empty: false, stale: true, daysOld: null, failed };

  const daysOld = Math.floor((now.getTime() - fetched) / 86_400_000);
  return { empty: false, stale: daysOld >= STALE_AFTER_DAYS, daysOld, failed };
}
