"use client";

import { create } from "zustand";
import type { DesignProject, Snapshot } from "@/schema/project";
import type { ProjectMeta } from "@/schema/project";
import type { CustomPreset } from "@/schema/customPreset";
import { createProject } from "@/schema/defaults";
import { captureCustomPresetFacets } from "@/presets";
import { baselineDescription, baselineFor, resetPath } from "./baseline";
import {
  canRedo, canUndo, commit, emptyHistory, jumpTo, redo, timeline, undo,
  type History, type TimelineEntry,
} from "./history";
import {
  deleteCustomPreset, deleteProject, deleteSnapshot, listCustomPresets, listProjects,
  listSnapshots, loadProject, saveCustomPreset, saveProject, saveSnapshot,
  setProjectArchived, setProjectTags,
} from "./persistence";

/**
 * Single source of truth for the open project. The preview iframe subscribes to this
 * through the postMessage bridge rather than sharing a React tree, so the preview's
 * DOM stays fully isolated from the playground chrome.
 */

const AUTOSAVE_DEBOUNCE_MS = 400;

export type Theme = "light" | "dark";
export type Device = "desktop" | "tablet" | "mobile";
export type PreviewMode = "system" | "components" | "sample";
export type Section = "components" | "animations";

interface ProjectState {
  project: DesignProject | null;
  history: History;
  projects: ProjectMeta[];
  snapshots: Snapshot[];
  customPresets: CustomPreset[];
  status: "idle" | "loading" | "ready";
  dirty: boolean;

  // View state — deliberately outside the document so it never lands in the export.
  section: Section;
  previewMode: PreviewMode;
  device: Device;
  theme: Theme;
  advanced: boolean;

  refreshProjects: () => Promise<void>;
  newProject: (name: string, client?: string) => Promise<void>;
  open: (id: string) => Promise<void>;
  /** Mutates the project through immer, recording one history entry. */
  edit: (label: string, recipe: (draft: DesignProject) => void, coalesceKey?: string) => void;
  undo: () => void;
  redo: () => void;
  /** Jumps directly to a point in the timeline (see history.ts's jumpTo). */
  jumpToHistory: (position: number) => void;
  /** A flattened, current-position-aware view of the whole undo/redo timeline. */
  historyTimeline: () => TimelineEntry[];
  canUndo: () => boolean;
  canRedo: () => boolean;
  setSection: (s: Section) => void;
  setPreviewMode: (m: PreviewMode) => void;
  setDevice: (d: Device) => void;
  setTheme: (t: Theme) => void;
  setAdvanced: (v: boolean) => void;
  /** Collapsed control panels, by title. View state, so it stays out of the export. */
  collapsedPanels: string[];
  togglePanel: (title: string) => void;

  /**
   * Restores one tracked value to what it would be untouched (see store/baseline.ts),
   * as a normal undoable edit. Paths are the same ones provenance is keyed by.
   */
  resetField: (path: string) => void;
  /** How a reset on the open project would be phrased, for the control's tooltip. */
  resetLabel: () => string;
  /** Paths the user has overridden by hand — what "Reset all" would clear. */
  overriddenPaths: () => string[];
  /** Reverts every hand-set value at once, as a single undoable edit. */
  resetAllOverrides: () => void;

  // Named snapshots (distinct from linear undo — see schema/project.ts's Snapshot).
  refreshSnapshots: () => Promise<void>;
  createSnapshot: (name: string) => Promise<void>;
  /** Restores a snapshot's full state as a single undoable edit. */
  restoreSnapshot: (id: string) => void;
  removeSnapshot: (id: string) => Promise<void>;

  // Project directory: tags and archive state, kept in meta (§Wave D).
  setProjectTags: (id: string, tags: string[]) => Promise<void>;
  setProjectArchived: (id: string, archived: boolean) => Promise<void>;
  removeProject: (id: string) => Promise<void>;

  // User-savable custom presets, global across projects (§Wave D Templating-1).
  refreshCustomPresets: () => Promise<void>;
  saveCurrentAsPreset: (name: string, description?: string) => Promise<void>;
  removeCustomPreset: (id: string) => Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(project: DesignProject, done: () => void) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void saveProject(project).then(done);
  }, AUTOSAVE_DEBOUNCE_MS);
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: null,
  history: emptyHistory(),
  projects: [],
  snapshots: [],
  customPresets: [],
  status: "idle",
  dirty: false,
  section: "components",
  previewMode: "system",
  device: "desktop",
  theme: "light",
  advanced: false,
  collapsedPanels: [],

  refreshProjects: async () => set({ projects: await listProjects() }),

  newProject: async (name, client = "") => {
    const project = createProject(name, client);
    await saveProject(project);
    set({ project, history: emptyHistory(), status: "ready", dirty: false, snapshots: [] });
    await get().refreshProjects();
  },

  open: async (id) => {
    set({ status: "loading" });
    const project = await loadProject(id);
    set({
      project,
      history: emptyHistory(),
      status: project ? "ready" : "idle",
      dirty: false,
      snapshots: [],
    });
    if (project) await get().refreshSnapshots();
  },

  edit: (label, recipe, coalesceKey) => {
    const { project, history } = get();
    if (!project) return;
    const result = commit(project, history, label, recipe, coalesceKey);
    if (result.state === project) return;
    set({ project: result.state, history: result.history, dirty: true });
    scheduleSave(result.state, () => set({ dirty: false }));
  },

  undo: () => {
    const { project, history } = get();
    if (!project) return;
    const result = undo(project, history);
    set({ project: result.state, history: result.history, dirty: true });
    scheduleSave(result.state, () => set({ dirty: false }));
  },

  redo: () => {
    const { project, history } = get();
    if (!project) return;
    const result = redo(project, history);
    set({ project: result.state, history: result.history, dirty: true });
    scheduleSave(result.state, () => set({ dirty: false }));
  },

  jumpToHistory: (position) => {
    const { project, history } = get();
    if (!project) return;
    const result = jumpTo(project, history, position);
    set({ project: result.state, history: result.history, dirty: true });
    scheduleSave(result.state, () => set({ dirty: false }));
  },

  historyTimeline: () => timeline(get().history),

  canUndo: () => canUndo(get().history),
  canRedo: () => canRedo(get().history),
  setSection: (section) => set({ section }),
  setPreviewMode: (previewMode) => set({ previewMode }),
  setDevice: (device) => set({ device }),
  setTheme: (theme) => set({ theme }),
  setAdvanced: (advanced) => set({ advanced }),

  togglePanel: (title) =>
    set((state) => ({
      collapsedPanels: state.collapsedPanels.includes(title)
        ? state.collapsedPanels.filter((t) => t !== title)
        : [...state.collapsedPanels, title],
    })),

  resetField: (path) => {
    const { project, customPresets, theme } = get();
    if (!project) return;
    const baseline = baselineFor(project, customPresets);
    // A path that resolves to nothing leaves the draft untouched, and `edit` already
    // drops edits that changed nothing — so a failed reset never reaches the history.
    get().edit(`Reset ${path.split(".").pop() ?? path}`, (draft) => {
      resetPath(draft, baseline, path, theme);
    });
  },

  resetLabel: () => {
    const { project, customPresets } = get();
    return project ? baselineDescription(project, customPresets) : "Reset";
  },

  overriddenPaths: () => {
    const { project } = get();
    if (!project) return [];
    return Object.keys(project.provenance).filter((path) => project.provenance[path] === "user");
  },

  resetAllOverrides: () => {
    const { project, customPresets, theme } = get();
    if (!project) return;
    // Snapshot the paths before editing: resetPath rewrites provenance as it goes, so
    // iterating the live map would skip entries.
    const paths = get().overriddenPaths();
    if (paths.length === 0) return;
    const baseline = baselineFor(project, customPresets);
    get().edit(`Reset ${paths.length} manual ${paths.length === 1 ? "override" : "overrides"}`, (draft) => {
      for (const path of paths) resetPath(draft, baseline, path, theme);
    });
  },

  refreshSnapshots: async () => {
    const { project } = get();
    if (!project) return;
    set({ snapshots: await listSnapshots(project.id) });
  },

  createSnapshot: async (name) => {
    const { project } = get();
    if (!project) return;
    await saveSnapshot(project.id, name, project);
    await get().refreshSnapshots();
  },

  restoreSnapshot: (id) => {
    const { project, history, snapshots } = get();
    const snapshot = snapshots.find((s) => s.id === id);
    if (!project || !snapshot) return;
    const result = commit(project, history, `Restore snapshot "${snapshot.name}"`, (draft) => {
      Object.assign(draft, snapshot.project);
    });
    if (result.state === project) return;
    set({ project: result.state, history: result.history, dirty: true });
    scheduleSave(result.state, () => set({ dirty: false }));
  },

  removeSnapshot: async (id) => {
    await deleteSnapshot(id);
    await get().refreshSnapshots();
  },

  setProjectTags: async (id, tags) => {
    await setProjectTags(id, tags);
    await get().refreshProjects();
  },

  setProjectArchived: async (id, archived) => {
    await setProjectArchived(id, archived);
    await get().refreshProjects();
  },

  removeProject: async (id) => {
    await deleteProject(id);
    if (get().project?.id === id) set({ project: null, history: emptyHistory(), snapshots: [] });
    await get().refreshProjects();
  },

  refreshCustomPresets: async () => set({ customPresets: await listCustomPresets() }),

  saveCurrentAsPreset: async (name, description = "") => {
    const { project } = get();
    if (!project) return;
    const preset: CustomPreset = {
      id: crypto.randomUUID(),
      name,
      description,
      createdAt: Date.now(),
      facets: captureCustomPresetFacets(project),
    };
    await saveCustomPreset(preset);
    await get().refreshCustomPresets();
  },

  removeCustomPreset: async (id) => {
    await deleteCustomPreset(id);
    await get().refreshCustomPresets();
  },
}));
