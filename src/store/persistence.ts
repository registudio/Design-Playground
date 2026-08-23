import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { DesignProject, Snapshot, type ProjectMeta } from "@/schema/project";
import type { CustomPreset } from "@/schema/customPreset";

/**
 * IndexedDB persistence (§13.5).
 *
 * localStorage is not viable here: it caps around 5MB and a single client's brand
 * photography plus a couple of woff2 faces exceeds that immediately. Binaries live in
 * their own store keyed by content hash, so re-uploading the same file is free and the
 * asset manifest can reference it by hash.
 */

const DB_NAME = "design-playground";
const DB_VERSION = 3;

interface PlaygroundDB extends DBSchema {
  projects: { key: string; value: DesignProject };
  meta: { key: string; value: ProjectMeta; indexes: { updatedAt: number } };
  assets: { key: string; value: { hash: string; mime: string; blob: Blob } };
  snapshots: { key: string; value: Snapshot; indexes: { projectId: string } };
  customPresets: { key: string; value: CustomPreset };
}

let dbPromise: Promise<IDBPDatabase<PlaygroundDB>> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<PlaygroundDB>(DB_NAME, DB_VERSION, {
      upgrade(database, oldVersion) {
        if (oldVersion < 1) {
          database.createObjectStore("projects", { keyPath: "id" });
          const meta = database.createObjectStore("meta", { keyPath: "id" });
          meta.createIndex("updatedAt", "updatedAt");
          database.createObjectStore("assets", { keyPath: "hash" });
        }
        if (oldVersion < 2) {
          const snapshots = database.createObjectStore("snapshots", { keyPath: "id" });
          snapshots.createIndex("projectId", "projectId");
        }
        if (oldVersion < 3) {
          database.createObjectStore("customPresets", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveProject(project: DesignProject): Promise<void> {
  const database = await db();
  const tx = database.transaction(["projects", "meta"], "readwrite");
  const existing = await tx.objectStore("meta").get(project.id);
  await tx.objectStore("projects").put(project);
  await tx.objectStore("meta").put({
    id: project.id,
    name: project.name,
    client: project.client,
    createdAt: existing?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
    tags: existing?.tags ?? [],
    archived: existing?.archived ?? false,
  });
  await tx.done;
}

export async function loadProject(id: string): Promise<DesignProject | null> {
  const raw = await (await db()).get("projects", id);
  if (!raw) return null;
  // Validate on read so a schema change surfaces here rather than deep in the UI.
  const parsed = DesignProject.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** Every project's metadata, most recently updated first. */
export async function listProjects(): Promise<ProjectMeta[]> {
  const all = await (await db()).getAllFromIndex("meta", "updatedAt");
  return all.reverse();
}

export async function deleteProject(id: string): Promise<void> {
  const database = await db();
  const tx = database.transaction(["projects", "meta", "snapshots"], "readwrite");
  await tx.objectStore("projects").delete(id);
  await tx.objectStore("meta").delete(id);
  const snapshotKeys = await tx.objectStore("snapshots").index("projectId").getAllKeys(id);
  for (const key of snapshotKeys) await tx.objectStore("snapshots").delete(key);
  await tx.done;
}

export async function setProjectArchived(id: string, archived: boolean): Promise<void> {
  const database = await db();
  const tx = database.transaction("meta", "readwrite");
  const existing = await tx.store.get(id);
  if (existing) await tx.store.put({ ...existing, archived });
  await tx.done;
}

export async function setProjectTags(id: string, tags: string[]): Promise<void> {
  const database = await db();
  const tx = database.transaction("meta", "readwrite");
  const existing = await tx.store.get(id);
  if (existing) await tx.store.put({ ...existing, tags });
  await tx.done;
}

// --- Binary assets -----------------------------------------------------------

export async function putAsset(hash: string, mime: string, blob: Blob): Promise<void> {
  await (await db()).put("assets", { hash, mime, blob });
}

export async function getAsset(hash: string): Promise<Blob | null> {
  const record = await (await db()).get("assets", hash);
  return record?.blob ?? null;
}

export async function getAllAssets(): Promise<Array<{ hash: string; mime: string; blob: Blob }>> {
  return (await db()).getAll("assets");
}

/** SHA-256 content hash, used as the asset key and recorded in the manifest. */
export async function hashBlob(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// --- Snapshots -----------------------------------------------------------------
// Distinct from undo history: a deliberate, named checkpoint that survives across
// sessions, long after the undo stack that produced it is gone (see Snapshot's
// doc comment in schema/project.ts).

export async function saveSnapshot(projectId: string, name: string, project: DesignProject): Promise<Snapshot> {
  const snapshot: Snapshot = {
    id: crypto.randomUUID(),
    projectId,
    name,
    createdAt: Date.now(),
    project,
  };
  await (await db()).put("snapshots", snapshot);
  return snapshot;
}

export async function listSnapshots(projectId: string): Promise<Snapshot[]> {
  const all = await (await db()).getAllFromIndex("snapshots", "projectId", projectId);
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteSnapshot(id: string): Promise<void> {
  await (await db()).delete("snapshots", id);
}

// --- Custom presets --------------------------------------------------------------
// Global, not scoped to a project (§Wave D Templating-1) — a starting point saved on
// one client's project should be reusable on the next.

export async function saveCustomPreset(preset: CustomPreset): Promise<void> {
  await (await db()).put("customPresets", preset);
}

export async function listCustomPresets(): Promise<CustomPreset[]> {
  const all = await (await db()).getAll("customPresets");
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteCustomPreset(id: string): Promise<void> {
  await (await db()).delete("customPresets", id);
}
