"use client";

import { useEffect, useRef, useState } from "react";
import { useProjectStore, type Section } from "@/store/project-store";
import { PreviewFrame } from "@/components/PreviewFrame";
import { Foundation } from "@/components/Foundation";
import { ComponentsPanel } from "@/components/ComponentsPanel";
import { AnimationsPanel } from "@/components/AnimationsPanel";
import { ExportPanel } from "@/components/ExportPanel";
import { ProjectPicker } from "@/components/ProjectPicker";
import { CommandPalette, openCommandPalette } from "@/components/CommandPalette";
import {
  applyPreset, applyPresetFacets, FACET_LABELS, PRESET_FACETS, PRESET_FAMILIES, PRESETS,
  type Preset, type PresetFacet,
} from "@/presets";

/**
 * The playground shell (§9).
 *
 * Layout follows the recommended arrangement: a narrow control rail, the live preview
 * taking most of the screen, and device switching along the bottom.
 */
const SECTIONS: Array<{ id: Section; label: string }> = [
  { id: "foundation", label: "Foundation" },
  { id: "components", label: "Components" },
  { id: "animations", label: "Animations" },
];

export default function Playground() {
  const project = useProjectStore((s) => s.project);
  const section = useProjectStore((s) => s.section);
  const setSection = useProjectStore((s) => s.setSection);
  const [exporting, setExporting] = useState(false);

  useKeyboardShortcuts();

  if (!project) return <ProjectPicker />;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopBar onExport={() => setExporting(true)} />

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[320px] shrink-0 flex-col border-r border-chrome-border bg-chrome-panel">
          <nav className="flex shrink-0 border-b border-chrome-border">
            {SECTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`flex-1 px-3 py-3 text-[13px] transition-colors ${
                  section === item.id
                    ? "border-b-2 border-chrome-accent font-medium text-chrome-text"
                    : "text-chrome-muted hover:text-chrome-text"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {section === "foundation" && <Foundation />}
            {section === "components" && <ComponentsPanel />}
            {section === "animations" && <AnimationsPanel />}
          </div>

          <PresetBar />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <PreviewFrame />
          <DeviceBar />
        </main>
      </div>

      {exporting && <ExportPanel onClose={() => setExporting(false)} />}
      <CommandPalette />
    </div>
  );
}

function TopBar({ onExport }: { onExport: () => void }) {
  const project = useProjectStore((s) => s.project)!;
  const dirty = useProjectStore((s) => s.dirty);
  const advanced = useProjectStore((s) => s.advanced);
  const setAdvanced = useProjectStore((s) => s.setAdvanced);
  const previewMode = useProjectStore((s) => s.previewMode);
  const setPreviewMode = useProjectStore((s) => s.setPreviewMode);
  const theme = useProjectStore((s) => s.theme);
  const setTheme = useProjectStore((s) => s.setTheme);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const history = useProjectStore((s) => s.history);

  return (
    <header className="flex shrink-0 items-center gap-4 border-b border-chrome-border bg-chrome-panel px-4 py-2.5">
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-[13px] font-medium">{project.name}</span>
        {project.client && (
          <span className="truncate text-[11px] text-chrome-muted">{project.client}</span>
        )}
      </div>

      <span className="text-[11px] text-chrome-muted">{dirty ? "Saving…" : "Saved"}</span>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={openCommandPalette}
          className="flex items-center gap-1.5 rounded-md border border-chrome-border px-2.5 py-1.5 text-[12px] text-chrome-muted hover:bg-chrome-hover hover:text-chrome-text"
          title="Search presets, components and actions"
        >
          Search
          <kbd className="rounded border border-chrome-border px-1 font-mono text-[10px]">⌘K</kbd>
        </button>

        {/* Labelled "Viewing" because the left rail also has a "Components" tab, and
            two identically-named controls doing different jobs is genuinely confusing.
            The rail picks what you edit; this picks what the preview renders. */}
        <span className="text-[11px] text-chrome-muted">Viewing</span>
        <Segmented
          options={[
            { value: "system", label: "Style Guide" },
            { value: "components", label: "Element Gallery" },
            { value: "sample", label: "Sample Page" },
          ]}
          value={previewMode}
          onChange={(v) => setPreviewMode(v as typeof previewMode)}
        />

        <button
          type="button"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="rounded-md border border-chrome-border px-2.5 py-1.5 text-[12px] hover:bg-chrome-hover"
          title="Toggle preview theme"
        >
          {theme === "light" ? "Light" : "Dark"}
        </button>

        <button
          type="button"
          onClick={() => undo()}
          disabled={history.past.length === 0}
          className="rounded-md border border-chrome-border px-2.5 py-1.5 text-[12px] hover:bg-chrome-hover disabled:opacity-40"
          title="Undo (⌘Z)"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={() => redo()}
          disabled={history.future.length === 0}
          className="rounded-md border border-chrome-border px-2.5 py-1.5 text-[12px] hover:bg-chrome-hover disabled:opacity-40"
          title="Redo (⇧⌘Z)"
        >
          Redo
        </button>

        <HistoryButton />
        <SnapshotButton />

        <label className="ml-1 flex cursor-pointer items-center gap-1.5 text-[12px] text-chrome-muted">
          <input
            type="checkbox"
            checked={advanced}
            onChange={(e) => setAdvanced(e.target.checked)}
            className="accent-chrome-accent"
          />
          Advanced
        </label>

        <button
          type="button"
          onClick={onExport}
          className="rounded-md bg-chrome-accent px-3 py-1.5 text-[12px] font-medium text-white hover:opacity-90"
        >
          Export
        </button>
      </div>
    </header>
  );
}

/**
 * A real history list (§13.4), not just Undo/Redo buttons. After trying three
 * presets in a row, "undo six times and hope I counted right" isn't how anyone wants
 * to get back to a specific earlier state — clicking that entry directly is.
 */
function HistoryButton() {
  const history = useProjectStore((s) => s.history);
  const historyTimeline = useProjectStore((s) => s.historyTimeline);
  const jumpToHistory = useProjectStore((s) => s.jumpToHistory);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const entries = open ? historyTimeline() : [];
  const isEmpty = history.past.length === 0 && history.future.length === 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isEmpty}
        className="rounded-md border border-chrome-border px-2.5 py-1.5 text-[12px] hover:bg-chrome-hover disabled:opacity-40"
        title="History"
      >
        History
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 max-h-80 w-64 overflow-y-auto rounded-md border border-chrome-border bg-chrome-panel py-1 shadow-lg">
          {entries.map((entry) => (
            <button
              key={entry.position}
              type="button"
              onClick={() => { jumpToHistory(entry.position); setOpen(false); }}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] hover:bg-chrome-hover ${
                entry.current ? "text-chrome-accent" : "text-chrome-text"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${entry.current ? "bg-chrome-accent" : "bg-transparent"}`}
                aria-hidden="true"
              />
              {entry.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Named snapshots (§Wave D) — a deliberate, named checkpoint that survives across
 * sessions, distinct from the linear undo history above. "Before client feedback",
 * "After client feedback": states worth returning to long after the undo stack that
 * produced them is gone.
 */
function SnapshotButton() {
  const snapshots = useProjectStore((s) => s.snapshots);
  const refreshSnapshots = useProjectStore((s) => s.refreshSnapshots);
  const createSnapshot = useProjectStore((s) => s.createSnapshot);
  const restoreSnapshot = useProjectStore((s) => s.restoreSnapshot);
  const removeSnapshot = useProjectStore((s) => s.removeSnapshot);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    void refreshSnapshots();
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open, refreshSnapshots]);

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    void createSnapshot(trimmed);
    setName("");
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border border-chrome-border px-2.5 py-1.5 text-[12px] hover:bg-chrome-hover"
        title="Named snapshots"
      >
        Snapshots
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-md border border-chrome-border bg-chrome-panel p-2 shadow-lg">
          <div className="flex gap-1.5">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="Snapshot name…"
              className="min-w-0 flex-1 rounded-md border border-chrome-border bg-chrome-bg px-2.5 py-1.5 text-[12px]"
            />
            <button
              type="button"
              onClick={save}
              disabled={!name.trim()}
              className="shrink-0 rounded-md bg-chrome-accent px-2.5 py-1.5 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              Save
            </button>
          </div>

          <div className="mt-2 max-h-64 overflow-y-auto">
            {snapshots.length === 0 ? (
              <p className="px-1 py-2 text-[12px] text-chrome-muted">No snapshots yet.</p>
            ) : (
              snapshots.map((snap) => (
                <div
                  key={snap.id}
                  className="group flex items-center justify-between gap-2 rounded-md px-1.5 py-1.5 hover:bg-chrome-hover"
                >
                  <button
                    type="button"
                    onClick={() => { restoreSnapshot(snap.id); setOpen(false); }}
                    className="min-w-0 flex-1 text-left"
                    title={`Restore "${snap.name}"`}
                  >
                    <span className="block truncate text-[12px] text-chrome-text">{snap.name}</span>
                    <span className="block text-[10px] text-chrome-muted">
                      {new Date(snap.createdAt).toLocaleString()}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeSnapshot(snap.id)}
                    className="shrink-0 text-[11px] text-chrome-muted opacity-0 hover:text-chrome-danger group-hover:opacity-100"
                    title="Delete snapshot"
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DeviceBar() {
  const device = useProjectStore((s) => s.device);
  const setDevice = useProjectStore((s) => s.setDevice);
  return (
    <div className="flex shrink-0 justify-center gap-1 border-t border-chrome-border bg-chrome-panel py-2">
      <Segmented
        options={[
          { value: "desktop", label: "Desktop" },
          { value: "tablet", label: "Tablet" },
          { value: "mobile", label: "Mobile" },
        ]}
        value={device}
        onChange={(v) => setDevice(v as typeof device)}
      />
    </div>
  );
}

function PresetBar() {
  const edit = useProjectStore((s) => s.edit);
  const applied = useProjectStore((s) => s.project?.appliedPreset);
  const advanced = useProjectStore((s) => s.advanced);
  // Which preset's facet picker is open, if any — only one at a time.
  const [pickerOpenFor, setPickerOpenFor] = useState<string | null>(null);
  // Families start expanded (unchanged default); a header click can compact one away
  // once the list of twenty-plus presets gets in the way — the command palette (⌘K)
  // is the other half of this: jump straight to a preset by name instead of scrolling.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleFamily = (family: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(family)) next.delete(family);
      else next.add(family);
      return next;
    });

  const applyFull = (preset: Preset) =>
    edit(`Apply ${preset.name}`, (draft) => {
      applyPreset(draft, preset);
      draft.appliedPreset = preset.id;
    });

  const applyPartial = (preset: Preset, facets: PresetFacet[]) =>
    edit(`Apply ${preset.name} (${facets.map((f) => FACET_LABELS[f]).join(", ")})`, (draft) => {
      applyPresetFacets(draft, preset, facets);
      // A partial application isn't "the preset" anymore, so don't claim credit for it.
      draft.appliedPreset = null;
    });

  return (
    <div className="max-h-[38vh] shrink-0 overflow-y-auto border-t border-chrome-border px-5 py-4">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-chrome-muted">
        Start from a direction
      </span>
      {/* Grouped by family — twenty-two ungrouped chips is a wall, and the families
          are how a designer actually narrows down in front of a client. */}
      {PRESET_FAMILIES.map((family) => (
        <div key={family} className="mt-3">
          <button
            type="button"
            onClick={() => toggleFamily(family)}
            className="flex w-full items-center gap-1 text-[10px] uppercase tracking-[0.06em] text-chrome-muted opacity-70 hover:opacity-100"
          >
            <span aria-hidden="true">{collapsed.has(family) ? "▸" : "▾"}</span>
            {family}
          </button>
          {!collapsed.has(family) && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {PRESETS.filter((p) => p.family === family).map((preset) => (
              <div key={preset.id} className="flex flex-col">
                <div
                  className={`flex items-center rounded-md border transition-colors ${
                    applied === preset.id
                      ? "border-chrome-accent text-chrome-accent"
                      : "border-chrome-border text-chrome-muted hover:text-chrome-text"
                  }`}
                >
                  <button
                    type="button"
                    title={preset.description}
                    // One history entry, so a client can try a direction and undo once.
                    onClick={() => applyFull(preset)}
                    className="flex items-center gap-1.5 rounded-l-md px-2.5 py-1.5 text-[12px] hover:bg-chrome-hover"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: preset.seed }}
                      aria-hidden="true"
                    />
                    {preset.name}
                  </button>
                  {/* Partial application is power-user territory — mixing just one
                      facet of a preset into an already-customised project — so it
                      stays behind Advanced rather than cluttering the default view. */}
                  {advanced && (
                    <button
                      type="button"
                      title="Apply only some of this preset"
                      onClick={() => setPickerOpenFor(pickerOpenFor === preset.id ? null : preset.id)}
                      className="border-l border-chrome-border px-1.5 py-1.5 text-[11px] hover:bg-chrome-hover"
                    >
                      ⋯
                    </button>
                  )}
                </div>
                {pickerOpenFor === preset.id && (
                  <FacetPicker
                    onApply={(facets) => {
                      applyPartial(preset, facets);
                      setPickerOpenFor(null);
                    }}
                    onCancel={() => setPickerOpenFor(null)}
                  />
                )}
              </div>
            ))}
          </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FacetPicker({
  onApply, onCancel,
}: {
  onApply: (facets: PresetFacet[]) => void;
  onCancel: () => void;
}) {
  const [checked, setChecked] = useState<Set<PresetFacet>>(new Set(PRESET_FACETS));
  const toggle = (facet: PresetFacet) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(facet)) next.delete(facet);
      else next.add(facet);
      return next;
    });

  return (
    <div className="mt-1 flex flex-col gap-1.5 rounded-md border border-chrome-border bg-chrome-panel p-2.5">
      {PRESET_FACETS.map((facet) => (
        <label key={facet} className="flex items-center gap-2 text-[11px] text-chrome-text">
          <input
            type="checkbox"
            checked={checked.has(facet)}
            onChange={() => toggle(facet)}
            className="accent-chrome-accent"
          />
          {FACET_LABELS[facet]}
        </label>
      ))}
      <div className="mt-1 flex gap-1.5">
        <button
          type="button"
          onClick={() => onApply([...checked])}
          disabled={checked.size === 0}
          className="flex-1 rounded-md bg-chrome-accent px-2 py-1 text-[11px] font-medium text-white hover:opacity-90 disabled:opacity-40"
        >
          Apply selected
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-chrome-border px-2 py-1 text-[11px] text-chrome-muted hover:bg-chrome-hover"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex rounded-md border border-chrome-border p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded px-2.5 py-1 text-[12px] transition-colors ${
            option.value === value
              ? "bg-chrome-accent text-white"
              : "text-chrome-muted hover:text-chrome-text"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function useKeyboardShortcuts() {
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") return;
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);
}
