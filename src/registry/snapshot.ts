import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { emptyIndex, RegistryIndex } from "./schema";

/**
 * Reads and writes the committed registry snapshot (spec §3).
 *
 * The snapshot is the offline fallback, not the source of truth — §4's live
 * server-side fetch is. It exists so the browser has something to show before the
 * first refresh, so tests are not network-dependent, and so a session that cannot
 * reach the registries (a sandbox with a restrictive egress policy, an aeroplane)
 * still opens rather than showing an error where the UI should be.
 *
 * A verified snapshot ships with the app. Live refresh updates it without inventing
 * component names or losing entries when a source is temporarily unreachable.
 *
 * Server-only: imports node:fs.
 */

/**
 * Overridable so a test run can point at a fixture index, and so a deployment can keep
 * the snapshot on a writable volume rather than inside the read-only app directory.
 */
const SNAPSHOT_PATH =
  process.env.DP_REGISTRY_SNAPSHOT ?? path.join(process.cwd(), "data/registry-snapshot.json");

export async function readSnapshot(): Promise<RegistryIndex> {
  try {
    const parsed = RegistryIndex.safeParse(JSON.parse(await readFile(SNAPSHOT_PATH, "utf-8")));
    // A snapshot written by an older schema is discarded rather than patched: it is a
    // cache, so the cost of rebuilding it is one refresh.
    return parsed.success ? parsed.data : emptyIndex();
  } catch {
    return emptyIndex();
  }
}

/**
 * Persists a refreshed index. Returns false when the filesystem is read-only.
 *
 * A failed write is not a failed refresh — the caller still has the fetched index in
 * memory and can serve it for this session. Only the persistence across restarts is
 * lost, so this reports rather than throws.
 */
export async function writeSnapshot(index: RegistryIndex): Promise<boolean> {
  try {
    await mkdir(path.dirname(SNAPSHOT_PATH), { recursive: true });
    await writeFile(SNAPSHOT_PATH, `${JSON.stringify(index, null, 2)}\n`, "utf-8");
    return true;
  } catch {
    return false;
  }
}
