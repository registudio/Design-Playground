"use client";

import { useEffect, useRef, useState } from "react";
import { useProjectStore } from "@/store/project-store";
import { saveProject } from "@/store/persistence";
import { unpackProject } from "@/export/project-file";

/**
 * Project creation and loading (§15.7 Phase A).
 *
 * Also the import path for a .dpproj.zip, which is what makes a project portable
 * between machines and recoverable if browser storage is cleared.
 */
export function ProjectPicker() {
  const projects = useProjectStore((s) => s.projects);
  const refresh = useProjectStore((s) => s.refreshProjects);
  const newProject = useProjectStore((s) => s.newProject);
  const open = useProjectStore((s) => s.open);
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { void refresh(); }, [refresh]);

  const importFile = async (file: File) => {
    setError(null);
    try {
      const project = await unpackProject(new Uint8Array(await file.arrayBuffer()));
      await saveProject(project);
      await open(project.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read that project file");
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-8 px-6">
      <div>
        <h1 className="text-[22px] font-semibold">Design Playground</h1>
        <p className="mt-1 text-[13px] text-chrome-muted">
          Turn brand inputs into a structured design specification.
        </p>
      </div>

      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) void newProject(name.trim(), client.trim());
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name"
          className="rounded-md border border-chrome-border bg-chrome-panel px-3 py-2.5 text-[13px]"
        />
        <input
          value={client}
          onChange={(e) => setClient(e.target.value)}
          placeholder="Client (optional)"
          className="rounded-md border border-chrome-border bg-chrome-panel px-3 py-2.5 text-[13px]"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="rounded-md bg-chrome-accent px-4 py-2.5 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-40"
        >
          New project
        </button>
      </form>

      <div className="flex flex-col gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importFile(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="self-start text-[12px] text-chrome-accent hover:underline"
        >
          Open a project file (.dpproj.zip)
        </button>
        {error && <p className="text-[12px] text-chrome-danger">{error}</p>}
      </div>

      {projects.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-chrome-muted">
            Recent
          </span>
          {projects.map((meta) => (
            <button
              key={meta.id}
              type="button"
              onClick={() => void open(meta.id)}
              className="flex items-baseline justify-between rounded-md border border-chrome-border bg-chrome-panel px-3 py-2.5 text-left hover:bg-chrome-hover"
            >
              <span className="text-[13px]">{meta.name}</span>
              <span className="text-[11px] text-chrome-muted">
                {meta.client || new Date(meta.updatedAt).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
