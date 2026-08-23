"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useProjectStore, type Device, type PreviewMode, type Section } from "@/store/project-store";
import { PRESETS, applyPreset } from "@/presets";
import { ComponentChoices } from "@/schema/recipe";

/**
 * Cmd/Ctrl+K command palette (§9's "significantly less cluttered" principle, applied
 * to navigation itself). Twenty-one presets plus fifteen component slots is a lot of
 * chrome to scroll through by hand — this is the fast path once a designer knows what
 * they want, complementing rather than replacing the browsable rail.
 */

interface Action {
  id: string;
  label: string;
  group: string;
  keywords?: string;
  run: () => void;
}

const kebabToWords = (s: string) => s.replace(/-/g, " ");

function useActions(onDone: () => void): Action[] {
  const edit = useProjectStore((s) => s.edit);
  const setSection = useProjectStore((s) => s.setSection);
  const setPreviewMode = useProjectStore((s) => s.setPreviewMode);
  const setDevice = useProjectStore((s) => s.setDevice);
  const setTheme = useProjectStore((s) => s.setTheme);
  const setAdvanced = useProjectStore((s) => s.setAdvanced);
  const advanced = useProjectStore((s) => s.advanced);
  const theme = useProjectStore((s) => s.theme);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);

  return useMemo(() => {
    const actions: Action[] = [];

    for (const preset of PRESETS) {
      actions.push({
        id: `preset:${preset.id}`,
        label: preset.name,
        group: `Preset — ${preset.family}`,
        keywords: preset.description,
        run: () => {
          edit(`Apply ${preset.name}`, (draft) => {
            applyPreset(draft, preset);
            draft.appliedPreset = preset.id;
          });
          onDone();
        },
      });
    }

    // Every component slot's variants, read straight from the schema so a new variant
    // shows up here automatically rather than needing a second hand-maintained list.
    for (const [field, schema] of Object.entries(ComponentChoices.shape)) {
      const options = (schema as { options?: readonly string[] }).options;
      if (!options) continue;
      const fieldLabel = kebabToWords(field.replace(/([a-z])([A-Z])/g, "$1 $2"));
      for (const option of options) {
        actions.push({
          id: `component:${field}:${option}`,
          label: `${fieldLabel}: ${kebabToWords(option)}`,
          group: "Components",
          run: () => {
            edit(`Set ${fieldLabel}`, (draft) => {
              (draft.recipe.components as Record<string, string>)[field] = option;
              draft.provenance[`recipe.components.${field}`] = "user";
            });
            onDone();
          },
        });
      }
    }

    const sections: Array<{ id: Section; label: string }> = [
      { id: "foundation", label: "Foundation" },
      { id: "components", label: "Components" },
      { id: "animations", label: "Animations" },
    ];
    for (const s of sections) {
      actions.push({
        id: `section:${s.id}`,
        label: `Go to ${s.label}`,
        group: "Navigate",
        run: () => { setSection(s.id); onDone(); },
      });
    }

    const modes: Array<{ id: PreviewMode; label: string }> = [
      { id: "system", label: "Style Guide" },
      { id: "components", label: "Element Gallery" },
      { id: "sample", label: "Sample Page" },
    ];
    for (const m of modes) {
      actions.push({
        id: `mode:${m.id}`,
        label: `View ${m.label}`,
        group: "Navigate",
        run: () => { setPreviewMode(m.id); onDone(); },
      });
    }

    const devices: Device[] = ["desktop", "tablet", "mobile"];
    for (const d of devices) {
      actions.push({
        id: `device:${d}`,
        label: `Preview on ${d}`,
        group: "Navigate",
        run: () => { setDevice(d); onDone(); },
      });
    }

    actions.push(
      {
        id: "action:theme",
        label: theme === "light" ? "Switch to dark theme" : "Switch to light theme",
        group: "Actions",
        run: () => { setTheme(theme === "light" ? "dark" : "light"); onDone(); },
      },
      {
        id: "action:advanced",
        label: advanced ? "Turn off Advanced mode" : "Turn on Advanced mode",
        group: "Actions",
        run: () => { setAdvanced(!advanced); onDone(); },
      },
      { id: "action:undo", label: "Undo", group: "Actions", run: () => { undo(); onDone(); } },
      { id: "action:redo", label: "Redo", group: "Actions", run: () => { redo(); onDone(); } },
    );

    return actions;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit, setSection, setPreviewMode, setDevice, setTheme, setAdvanced, advanced, theme, undo, redo, onDone]);
}

export const COMMAND_PALETTE_OPEN_EVENT = "dp:open-command-palette";

/** Fired by any visible trigger (e.g. the top-bar hint button) to open the palette. */
export function openCommandPalette() {
  window.dispatchEvent(new Event(COMMAND_PALETTE_OPEN_EVENT));
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const project = useProjectStore((s) => s.project);

  const close = () => { setOpen(false); setQuery(""); setActiveIndex(0); };
  const actions = useActions(close);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        close();
      }
    };
    // A visible trigger button (COMMAND_PALETTE_OPEN_EVENT) shares this same open
    // path, for anyone who would not otherwise discover the keyboard shortcut.
    const onOpenEvent = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(COMMAND_PALETTE_OPEN_EVENT, onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(COMMAND_PALETTE_OPEN_EVENT, onOpenEvent);
    };
  }, [open]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((a) =>
      `${a.label} ${a.group} ${a.keywords ?? ""}`.toLowerCase().includes(q),
    );
  }, [actions, query]);

  useEffect(() => setActiveIndex(0), [query]);

  if (!open || !project) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); filtered[activeIndex]?.run(); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 pt-24" onClick={close}>
      <div
        className="flex max-h-[60vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-chrome-border bg-chrome-panel shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Jump to a preset, component, or action…"
          className="border-b border-chrome-border bg-transparent px-4 py-3 text-[14px] outline-none placeholder:text-chrome-muted"
        />
        <div className="overflow-y-auto py-1">
          {filtered.length === 0 && (
            <p className="px-4 py-6 text-center text-[12px] text-chrome-muted">No matches</p>
          )}
          {filtered.map((action, index) => (
            <button
              key={action.id}
              type="button"
              onClick={action.run}
              onMouseEnter={() => setActiveIndex(index)}
              className={`flex w-full items-center justify-between px-4 py-2 text-left text-[13px] ${
                index === activeIndex ? "bg-chrome-hover text-chrome-text" : "text-chrome-text"
              }`}
            >
              <span>{action.label}</span>
              <span className="text-[11px] text-chrome-muted">{action.group}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
