import { fetchRegistryIndex } from "@/registry/fetch";
import { readSnapshot, writeSnapshot } from "@/registry/snapshot";

/**
 * The Elements index (spec §3, §4).
 *
 * GET  — the current snapshot, served immediately so the browser always has something
 *        to render, even offline or on a first run.
 * POST — a live refresh against the five registries, persisted back to the snapshot.
 *
 * Splitting them keeps the expensive, failure-prone work behind an explicit user
 * action. Refreshing on every page load would make opening the Elements tab depend on
 * five third-party hosts being up, which is precisely the fragility that makes the
 * snapshot worth keeping.
 */

export async function GET() {
  return Response.json(await readSnapshot(), { headers: { "Cache-Control": "no-store" } });
}

export async function POST() {
  // The previous index is passed in so sources that fail this refresh keep their last
  // known entries instead of vanishing from the browser.
  const previous = await readSnapshot();
  const index = await fetchRegistryIndex(previous);
  const persisted = await writeSnapshot(index);

  return Response.json(
    { ...index, persisted },
    { headers: { "Cache-Control": "no-store" } },
  );
}
