"use client";

import { unzipSync, zipSync, type Zippable } from "fflate";
import { DesignProject, Snapshot } from "@/schema/project";
import { CustomPreset } from "@/schema/customPreset";
import { stableStringify } from "./serialize";
import {
  getAllAssets, putAsset, listSnapshots, putSnapshot, listCustomPresets, saveCustomPreset,
} from "@/store/persistence";

/**
 * Portable project files (.dpproj.zip).
 *
 * IndexedDB alone leaves a project one cleared cache away from gone, and the success
 * criterion in §15.9 is a live client meeting. A project file gives backup, transfer
 * between machines, and a git-versionable artefact — for very little code, and with
 * no backend.
 *
 * Also the only sync mechanism this app has (§Wave F2) for the two things that live
 * outside any single project: named snapshots (project-scoped, but IndexedDB-only) and
 * custom presets (global). Bundling both into every export means opening a project file
 * on a second machine brings its checkpoints and — the first time any project file from
 * that library is opened — its saved presets along with it.
 *
 * Layout:
 *   project.json           the full DesignProject document
 *   assets/<hash>.<ext>    binaries, keyed by the content hash the manifest records
 *   snapshots/<id>.json    this project's own named snapshots, if any
 *   custom-presets.json    every custom preset saved on the exporting machine, if any
 */

const PROJECT_ENTRY = "project.json";
const ASSET_DIR = "assets";
const SNAPSHOT_DIR = "snapshots";
const CUSTOM_PRESETS_ENTRY = "custom-presets.json";

export async function packProject(project: DesignProject): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const zippable: Zippable = {
    [PROJECT_ENTRY]: encoder.encode(stableStringify(project)),
  };

  // Only pack assets this project actually references.
  const referenced = new Set(
    [...project.assets.images, ...project.assets.fonts].map((entry) => entry.hash),
  );
  for (const asset of await getAllAssets()) {
    if (!referenced.has(asset.hash)) continue;
    const bytes = new Uint8Array(await asset.blob.arrayBuffer());
    zippable[`${ASSET_DIR}/${asset.hash}`] = bytes;
  }

  for (const snapshot of await listSnapshots(project.id)) {
    zippable[`${SNAPSHOT_DIR}/${snapshot.id}.json`] = encoder.encode(stableStringify(snapshot));
  }

  const customPresets = await listCustomPresets();
  if (customPresets.length > 0) {
    zippable[CUSTOM_PRESETS_ENTRY] = encoder.encode(stableStringify(customPresets));
  }

  return zipSync(zippable, { level: 6, mtime: new Date(Date.UTC(1980, 0, 1)) });
}

export async function unpackProject(bytes: Uint8Array): Promise<DesignProject> {
  const entries = unzipSync(bytes);

  const raw = entries[PROJECT_ENTRY];
  if (!raw) throw new Error("Not a Design Playground project file: project.json is missing");

  const parsed = DesignProject.safeParse(JSON.parse(new TextDecoder().decode(raw)));
  if (!parsed.success) {
    throw new Error(`Project file failed validation: ${parsed.error.issues[0]?.message ?? "unknown"}`);
  }
  const project = parsed.data;

  // Restore binaries first so the UI never renders a project with missing assets.
  const mimeByHash = new Map(
    [...project.assets.images, ...project.assets.fonts].map((e) => [e.hash, e.mime]),
  );
  for (const [path, content] of Object.entries(entries)) {
    if (!path.startsWith(`${ASSET_DIR}/`)) continue;
    const hash = path.slice(ASSET_DIR.length + 1);
    const mime = mimeByHash.get(hash) ?? "application/octet-stream";
    await putAsset(hash, mime, new Blob([content.slice()], { type: mime }));
  }

  // Snapshots and custom presets (§Wave F2) are restored best-effort: a bad or
  // hand-edited entry is skipped rather than failing the whole import, since the
  // project itself already parsed successfully above. `put`-by-id makes re-importing
  // the same project file, or several project files that bundle the same preset,
  // idempotent rather than piling up duplicates.
  const decoder = new TextDecoder();
  for (const [path, content] of Object.entries(entries)) {
    if (!path.startsWith(`${SNAPSHOT_DIR}/`)) continue;
    const parsedSnapshot = Snapshot.safeParse(JSON.parse(decoder.decode(content)));
    if (parsedSnapshot.success) await putSnapshot(parsedSnapshot.data);
  }

  const customPresetsRaw = entries[CUSTOM_PRESETS_ENTRY];
  if (customPresetsRaw) {
    const rawList: unknown = JSON.parse(decoder.decode(customPresetsRaw));
    if (Array.isArray(rawList)) {
      for (const item of rawList) {
        const parsedPreset = CustomPreset.safeParse(item);
        if (parsedPreset.success) await saveCustomPreset(parsedPreset.data);
      }
    }
  }

  return project;
}

export function downloadProject(project: DesignProject, bytes: Uint8Array): void {
  const safeName = project.name.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "project";
  const blob = new Blob([bytes.slice()], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeName}.dpproj.zip`;
  anchor.click();
  URL.revokeObjectURL(url);
}
