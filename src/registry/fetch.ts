import { normalizeDocument } from "./normalize";
import { REGISTRY_INDEX_SCHEMA_ID, type RegistryIndex, type SourceStatus } from "./schema";
import { REGISTRY_SOURCES, type RegistrySource } from "./sources";

/**
 * Fetches and merges the five registries (spec §3).
 *
 * Server-side by design. §4 walks through the hosting decision and lands on this
 * being the version without a staleness problem at all: a Claude Artifact cannot
 * reach any of the five hosts because none is on the Artifact sandbox's CSP
 * allowlist, but a Next.js route handler has no such restriction. Since the
 * playground is already a real Next.js app, live fetch is simply available, and the
 * committed snapshot degrades to an offline fallback rather than the primary source.
 *
 * Not imported from client components — it would leak into the browser bundle and
 * then fail CORS against registries that do not send permissive headers.
 */

/** Long enough for a cold registry, short enough that one dead host cannot hang a refresh. */
const FETCH_TIMEOUT_MS = 15_000;

async function fetchSource(
  source: RegistrySource,
  lastVerified: string,
): Promise<{ elements: RegistryIndex["elements"]; status: SourceStatus }> {
  try {
    const response = await fetch(source.endpoint, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        elements: [],
        status: {
          id: source.id,
          ok: false,
          itemCount: 0,
          skipped: 0,
          lastVerified: null,
          error: `HTTP ${response.status} ${response.statusText}`.trim(),
        },
      };
    }

    return normalizeDocument(source, await response.json(), lastVerified);
  } catch (error) {
    return {
      elements: [],
      status: {
        id: source.id,
        ok: false,
        itemCount: 0,
        skipped: 0,
        lastVerified: null,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

/**
 * Refreshes every source.
 *
 * Sources are fetched concurrently and failures are per-source: one unreachable
 * registry costs its own entries and shows up as a failed source in the UI, rather
 * than blanking an index the other four could still fill.
 *
 * A previous index may be passed to retain the entries of sources that fail this
 * time — losing four days of working data because one host had a bad minute is the
 * wrong trade. Those entries keep their older `lastVerified`, so they are correctly
 * reported as the stale ones.
 */
export async function fetchRegistryIndex(previous?: RegistryIndex): Promise<RegistryIndex> {
  const lastVerified = new Date().toISOString();
  const results = await Promise.all(
    REGISTRY_SOURCES.map((source) => fetchSource(source, lastVerified)),
  );

  const elements = results.flatMap((result) => result.elements);
  const statuses = results.map((result) => result.status);

  if (previous) {
    for (const status of statuses) {
      if (status.ok) continue;
      const retained = previous.elements.filter((element) => element.source === status.id);
      if (!retained.length) continue;
      elements.push(...retained);
      const previousStatus = previous.sources.find((s) => s.id === status.id);
      status.itemCount = retained.length;
      status.lastVerified = previousStatus?.lastVerified ?? null;
    }
  }

  elements.sort((a, b) => a.id.localeCompare(b.id));

  return {
    schema: REGISTRY_INDEX_SCHEMA_ID,
    // Reflects when the index was last *successfully* touched, so an all-failed
    // refresh cannot reset the staleness clock and make old data look current.
    fetchedAt: statuses.some((status) => status.ok) ? lastVerified : (previous?.fetchedAt ?? null),
    sources: statuses,
    elements,
  };
}
