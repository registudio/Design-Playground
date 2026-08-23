"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useProjectStore } from "@/store/project-store";
import { saveProject } from "@/store/persistence";
import { unpackProject } from "@/export/project-file";
import type { ProjectMeta } from "@/schema/project";

/**
 * Project creation, loading, and the project directory (§15.7 Phase A, §Wave D
 * Features-5). Tags and archive state turn a flat "recent" list into something that
 * still works once a studio has a few dozen projects on file — search narrows by
 * name/client/tag, archive hides finished work without deleting it.
 *
 * Also the import path for a .dpproj.zip, which is what makes a project portable
 * between machines and recoverable if browser storage is cleared.
 */
export function ProjectPicker() {
  const projects = useProjectStore((s) => s.projects);
  const refresh = useProjectStore((s) => s.refreshProjects);
  const newProject = useProjectStore((s) => s.newProject);
  const open = useProjectStore((s) => s.open);
  const setProjectTags = useProjectStore((s) => s.setProjectTags);
  const setProjectArchived = useProjectStore((s) => s.setProjectArchived);
  const removeProject = useProjectStore((s) => s.removeProject);
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
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

  const allTags = useMemo(
    () => Array.from(new Set(projects.flatMap((p) => p.tags))).sort(),
    [projects],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects
      .filter((p) => (showArchived ? true : !p.archived))
      .filter((p) => {
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          p.client.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
        );
      });
  }, [projects, query, showArchived]);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-8 px-6 py-16">
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
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, client or tag…"
              className="min-w-0 flex-1 rounded-md border border-chrome-border bg-chrome-panel px-3 py-2 text-[12px]"
            />
            <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[11px] text-chrome-muted">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="accent-chrome-accent"
              />
              Show archived
            </label>
          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setQuery(query === tag ? "" : tag)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] ${
                    query === tag
                      ? "border-chrome-accent bg-chrome-accent text-white"
                      : "border-chrome-border text-chrome-muted hover:bg-chrome-hover"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-chrome-muted">
              {query ? `${visible.length} match${visible.length === 1 ? "" : "es"}` : "Projects"}
            </span>
            {visible.length === 0 && (
              <p className="px-1 py-2 text-[12px] text-chrome-muted">No projects match.</p>
            )}
            {visible.map((meta) => (
              <ProjectRow
                key={meta.id}
                meta={meta}
                onOpen={() => void open(meta.id)}
                onSetTags={(tags) => void setProjectTags(meta.id, tags)}
                onToggleArchived={() => void setProjectArchived(meta.id, !meta.archived)}
                onDelete={() => void removeProject(meta.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectRow({
  meta, onOpen, onSetTags, onToggleArchived, onDelete,
}: {
  meta: ProjectMeta;
  onOpen: () => void;
  onSetTags: (tags: string[]) => void;
  onToggleArchived: () => void;
  onDelete: () => void;
}) {
  const [editingTags, setEditingTags] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !meta.tags.includes(trimmed)) onSetTags([...meta.tags, trimmed]);
    setTagInput("");
  };

  return (
    <div
      className={`rounded-md border border-chrome-border bg-chrome-panel px-3 py-2.5 ${meta.archived ? "opacity-60" : ""}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <span className="text-[13px]">{meta.name}</span>
        </button>
        <span className="shrink-0 text-[11px] text-chrome-muted">
          {meta.client || new Date(meta.updatedAt).toLocaleDateString()}
        </span>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {meta.tags.map((tag) => (
          <span
            key={tag}
            className="group flex items-center gap-1 rounded-full border border-chrome-border px-2 py-0.5 text-[10px] text-chrome-muted"
          >
            {tag}
            <button
              type="button"
              onClick={() => onSetTags(meta.tags.filter((t) => t !== tag))}
              className="text-chrome-muted opacity-0 group-hover:opacity-100 hover:text-chrome-danger"
              aria-label={`Remove tag ${tag}`}
            >
              ×
            </button>
          </span>
        ))}

        {editingTags ? (
          <input
            autoFocus
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addTag(); }
              if (e.key === "Escape") setEditingTags(false);
            }}
            onBlur={() => { addTag(); setEditingTags(false); }}
            placeholder="tag…"
            className="w-20 rounded-full border border-chrome-border bg-chrome-bg px-2 py-0.5 text-[10px]"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingTags(true)}
            className="rounded-full border border-dashed border-chrome-border px-2 py-0.5 text-[10px] text-chrome-muted hover:bg-chrome-hover"
          >
            + tag
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleArchived}
            className="text-[10px] text-chrome-muted hover:text-chrome-text"
          >
            {meta.archived ? "Unarchive" : "Archive"}
          </button>
          {confirmDelete ? (
            <>
              <button type="button" onClick={onDelete} className="text-[10px] font-medium text-chrome-danger">
                Confirm delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-[10px] text-chrome-muted hover:text-chrome-text"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-[10px] text-chrome-muted hover:text-chrome-danger"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
