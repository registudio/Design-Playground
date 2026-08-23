"use client";

import type { ExportFile } from "./bundle";
import { toZip } from "./bundle";

/**
 * Getting the export onto disk next to the client project (§15.5).
 *
 * Two paths, per the agreed workflow:
 *  - ZIP download always works, anywhere.
 *  - File System Access lets the designer pick the project folder once and re-export
 *    straight into it thereafter. Chromium-only, which is fine for an internal tool.
 *
 * The directory handle is persisted in IndexedDB (handles are structured-cloneable),
 * so the folder choice survives a reload.
 */

export function downloadZip(files: ExportFile[], filename: string): void {
  const zip = toZip(files);
  // Copy into a fresh buffer: the fflate result may be a view over a larger pool.
  const blob = new Blob([zip.slice()], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function supportsDirectoryAccess(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

interface DirectoryPickerWindow {
  showDirectoryPicker(options?: { mode?: "read" | "readwrite" }): Promise<FileSystemDirectoryHandle>;
}

export async function pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!supportsDirectoryAccess()) return null;
  try {
    return await (window as unknown as DirectoryPickerWindow).showDirectoryPicker({
      mode: "readwrite",
    });
  } catch {
    // The user dismissed the picker; not an error worth surfacing.
    return null;
  }
}

/** Re-requests write permission, which lapses between sessions. */
export async function ensureWritable(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const withPerms = handle as FileSystemDirectoryHandle & {
    queryPermission?(d: { mode: string }): Promise<PermissionState>;
    requestPermission?(d: { mode: string }): Promise<PermissionState>;
  };
  const descriptor = { mode: "readwrite" };
  if ((await withPerms.queryPermission?.(descriptor)) === "granted") return true;
  return (await withPerms.requestPermission?.(descriptor)) === "granted";
}

export async function writeToDirectory(
  root: FileSystemDirectoryHandle,
  files: ExportFile[],
): Promise<void> {
  const encoder = new TextEncoder();
  for (const file of files) {
    const segments = file.path.split("/");
    const name = segments.pop()!;
    let directory = root;
    for (const segment of segments) {
      directory = await directory.getDirectoryHandle(segment, { create: true });
    }
    const handle = await directory.getFileHandle(name, { create: true });
    const writable = await handle.createWritable();
    const bytes =
      typeof file.content === "string" ? encoder.encode(file.content) : file.content;
    await writable.write(bytes.slice());
    await writable.close();
  }
}
