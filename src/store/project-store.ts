"use client";

import { create } from "zustand";
import type { DesignProject } from "@/schema/project";
import type { ProjectMeta } from "@/schema/project";
import { createProject } from "@/schema/defaults";
import {
  canRedo, canUndo, commit, emptyHistory, redo, undo, type History,
} from "./history";
import { listProjects, loadProject, saveProject } from "./persistence";

/**
 * Single source of truth for the open project. The preview iframe subscribes to this
 * through the postMessage bridge rather than sharing a React tree, so the preview's
 * DOM stays fully isolated from the playground chrome.
 */

const AUTOSAVE_DEBOUNCE_MS = 400;

export type Theme = "light" | "dark";
export type Device = "desktop" | "tablet" | "mobile";
export type PreviewMode = "system" | "components" | "sample";
export type Section = "foundation" | "components" | "animations";

interface ProjectState {
  project: DesignProject | null;
  history: History;
  projects: ProjectMeta[];
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
  canUndo: () => boolean;
  canRedo: () => boolean;
  setSection: (s: Section) => void;
  setPreviewMode: (m: PreviewMode) => void;
  setDevice: (d: Device) => void;
  setTheme: (t: Theme) => void;
  setAdvanced: (v: boolean) => void;
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
  status: "idle",
  dirty: false,
  section: "foundation",
  previewMode: "system",
  device: "desktop",
  theme: "light",
  advanced: false,

  refreshProjects: async () => set({ projects: await listProjects() }),

  newProject: async (name, client = "") => {
    const project = createProject(name, client);
    await saveProject(project);
    set({ project, history: emptyHistory(), status: "ready", dirty: false });
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
    });
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

  canUndo: () => canUndo(get().history),
  canRedo: () => canRedo(get().history),
  setSection: (section) => set({ section }),
  setPreviewMode: (previewMode) => set({ previewMode }),
  setDevice: (device) => set({ device }),
  setTheme: (theme) => set({ theme }),
  setAdvanced: (advanced) => set({ advanced }),
}));
