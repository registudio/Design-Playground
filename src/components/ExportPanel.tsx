"use client";

import { useState } from "react";
import { useProjectStore } from "@/store/project-store";
import { buildExport, type ValidationIssue } from "@/export/bundle";
import {
  downloadZip, pickDirectory, supportsDirectoryAccess, writeToDirectory, ensureWritable,
} from "@/export/deliver";
import { packProject, downloadProject } from "@/export/project-file";
import { getAsset } from "@/store/persistence";

/**
 * Export (§15). Schema validation runs first and errors block the export, per §15.7.
 *
 * Two delivery paths: a ZIP download that always works, and a "save to folder" that
 * writes straight into the client project directory once it has been picked. The
 * directory handle is kept in memory for the session.
 */
export function ExportPanel({ onClose }: { onClose: () => void }) {
  const project = useProjectStore((s) => s.project);
  const [issues, setIssues] = useState<ValidationIssue[] | null>(null);
  const [directory, setDirectory] = useState<FileSystemDirectoryHandle | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  if (!project) return null;

  /** Binary assets keyed by manifest filename, so the bundle can carry them. */
  const collectAssets = async () => {
    const map = new Map<string, Uint8Array>();
    for (const entry of [...project.assets.images, ...project.assets.fonts]) {
      const blob = await getAsset(entry.hash);
      if (blob) map.set(entry.file, new Uint8Array(await blob.arrayBuffer()));
    }
    return map;
  };

  const run = async (deliver: (files: ReturnType<typeof buildExport>["files"]) => Promise<void> | void) => {
    setStatus(null);
    const result = buildExport(project, await collectAssets());
    setIssues(result.issues);
    if (result.issues.some((i) => i.severity === "error")) return;
    await deliver(result.files);
  };

  const errors = issues?.filter((i) => i.severity === "error") ?? [];
  const warnings = issues?.filter((i) => i.severity === "warning") ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl border border-chrome-border bg-chrome-panel p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[15px] font-semibold">Export design</h2>
        <p className="mt-1 text-[13px] text-chrome-muted">
          Writes design.tokens.json, site.recipe.json, asset-manifest.json and a generated
          globals.css into a <code className="font-mono">design/</code> folder.
        </p>

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => run((files) => downloadZip(files, `${slug(project.name)}-design.zip`))}
            className="rounded-md bg-chrome-accent px-4 py-2.5 text-[13px] font-medium text-white hover:opacity-90"
          >
            Download ZIP
          </button>

          {supportsDirectoryAccess() && (
            <button
              type="button"
              onClick={async () => {
                let handle = directory;
                if (!handle) {
                  handle = await pickDirectory();
                  if (!handle) return;
                  setDirectory(handle);
                }
                if (!(await ensureWritable(handle))) {
                  setStatus("Write permission was declined.");
                  return;
                }
                await run(async (files) => {
                  await writeToDirectory(handle!, files);
                  setStatus(`Written to ${handle!.name}/design`);
                });
              }}
              className="rounded-md border border-chrome-border px-4 py-2.5 text-[13px] hover:bg-chrome-hover"
            >
              {directory ? `Save to ${directory.name}` : "Save to project folder…"}
            </button>
          )}

          <button
            type="button"
            onClick={async () => downloadProject(project, await packProject(project))}
            className="rounded-md border border-chrome-border px-4 py-2.5 text-[13px] hover:bg-chrome-hover"
          >
            Save project file (backup)
          </button>
        </div>

        {status && <p className="mt-4 text-[12px] text-chrome-accent">{status}</p>}

        {errors.length > 0 && (
          <div className="mt-4 rounded-md border border-chrome-danger px-3 py-2.5">
            <p className="text-[12px] font-medium text-chrome-danger">Export blocked</p>
            {errors.map((issue, i) => (
              <p key={i} className="mt-1 font-mono text-[11px] text-chrome-danger">{issue.message}</p>
            ))}
          </div>
        )}

        {errors.length === 0 && warnings.length > 0 && (
          <div className="mt-4 rounded-md border border-chrome-border px-3 py-2.5">
            {warnings.map((issue, i) => (
              <p key={i} className="font-mono text-[11px] text-chrome-muted">⚠ {issue.message}</p>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-5 text-[12px] text-chrome-muted hover:text-chrome-text"
        >
          Close
        </button>
      </div>
    </div>
  );
}

const slug = (s: string) => s.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "project";
