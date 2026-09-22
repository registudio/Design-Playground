"use client";

import { create } from "zustand";
import type { DesignProject, Snapshot } from "@/schema/project";
import type { ProjectMeta } from "@/schema/project";
import type { CustomPreset } from "@/schema/customPreset";
import type { SelectedElement } from "@/schema/selection";
import { emptyIndex, RegistryIndex, type DesignElement } from "@/registry/schema";
import { createProject } from "@/schema/defaults";
import { engineRequirements, type EngineId } from "@/schema/engines";
import { captureCustomPresetFacets } from "@/presets";
import { baselineDescription, baselineFor, resetPath } from "./baseline";
import {
  loadLastProjectId, loadPreferences, samePreferences, savePreferences, saveLastProjectId,
  type ViewPreferences,
} from "./preferences";
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
export type Section = "components" | "animations" | "elements";

interface ProjectState {
  project: DesignProject | null;
  history: History;
  projects: ProjectMeta[];
  snapshots: Snapshot[];
  customPresets: CustomPreset[];
  status: "idle" | "loading" | "ready";
  dirty: boolean;
  /** Why the last autosave failed, if it did. Null whenever the project is safely stored. */
  saveError: string | null;

  // View state — deliberately outside the document so it never lands in the export.
  section: Section;
  previewMode: PreviewMode;
  device: Device;
  theme: Theme;
  advanced: boolean;

  refreshProjects: () => Promise<void>;
  newProject: (name: string, client?: string) => Promise<void>;
  open: (id: string) => Promise<void>;
  /**
   * Returns to the project directory. Before this existed, reloading the page was the
   * only way back — which stopped working the moment the last project was reopened
   * automatically.
   */
  closeProject: () => void;
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
   * Restores remembered view preferences and keeps them saved from then on. Called
   * from an effect on mount rather than at module load: the server render has no
   * localStorage, so seeding the store from it up front would mismatch on hydration.
   */
  hydratePreferences: () => void;

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

  /**
   * The aggregated registry index (§1a–§3).
   *
   * Cache, not document: it belongs to the machine rather than to any one project, is
   * rebuilt from upstream on demand, and must never reach the export. The selections
   * made *from* it live on the project, which is why they survive an empty index.
   */
  registry: RegistryIndex;
  registryState: "idle" | "loading" | "refreshing" | "ready";
  /** Why the last load or refresh failed. Null when the index is trustworthy. */
  registryError: string | null;
  /** Reads the committed snapshot. Cheap, offline, runs on first open of the tab. */
  loadRegistry: () => Promise<void>;
  /** Re-fetches all five registries. Explicit, because it depends on five third parties. */
  refreshRegistry: () => Promise<void>;

  // Element selections (§5).
  selectElement: (element: DesignElement, intendedUse?: string) => void;
  deselectElement: (id: string) => void;
  setIntendedUse: (id: string, intendedUse: string) => void;
  setEngine: (engine: "motion" | "gsap" | "lenis" | "vanta", enabled: boolean) => void;
}

/** Set once hydratePreferences has attached the save subscription, so it attaches once. */
let unsubscribePreferences: (() => void) | null = null;

const viewPreferencesOf = (state: ProjectState): ViewPreferences => ({
  section: state.section,
  previewMode: state.previewMode,
  device: state.device,
  theme: state.theme,
  advanced: state.advanced,
  collapsedPanels: state.collapsedPanels,
});

let saveTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Debounced autosave.
 *
 * A rejected save used to be an unhandled promise: `dirty` stayed true, so the header
 * read "Saving…" indefinitely while the user carried on believing their work was being
 * kept. Storage genuinely can refuse — a private window, a blocked origin, a full quota
 * — and silently losing a client's project is the worst thing this app could do, so the
 * failure is reported to the store and surfaced in the header instead.
 */
function scheduleSave(project: DesignProject, report: (update: Partial<ProjectState>) => void) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void saveProject(project).then(
      () => report({ dirty: false, saveError: null }),
      (cause: unknown) =>
        report({ saveError: cause instanceof Error ? cause.message : "Could not save to this browser" }),
    );
  }, AUTOSAVE_DEBOUNCE_MS);
}

/**
 * Recomputes `recipe.engines` from the project's own contents.
 *
 * Lenis and Vanta are left as the user set them: nothing in a selection or a motion
 * recipe implies either, so deriving them would mean silently switching off something
 * deliberately turned on.
 */
function syncEngines(draft: DesignProject): void {
  const motionEngines = ["entrance", "interaction", "scroll"]
    .flatMap((group) => Object.values(draft.recipe.motion[group as "entrance"]))
    .map((binding) => binding.engine);
  for (const requirement of engineRequirements(motionEngines, draft.selections)) {
    if (requirement.id === "lenis" || requirement.id === "vanta") continue;
    draft.recipe.engines[requirement.id as EngineId] = requirement.required;
  }
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: null,
  history: emptyHistory(),
  projects: [],
  snapshots: [],
  customPresets: [],
  status: "idle",
  dirty: false,
  saveError: null,
  section: "components",
  previewMode: "system",
  device: "desktop",
  theme: "light",
  advanced: false,
  collapsedPanels: [],
  registry: emptyIndex(),
  registryState: "idle",
  registryError: null,

  refreshProjects: async () => set({ projects: await listProjects() }),

  newProject: async (name, client = "") => {
    const project = createProject(name, client);
    await saveProject(project);
    set({ project, history: emptyHistory(), status: "ready", dirty: false, snapshots: [] });
    saveLastProjectId(project.id);
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
    // Only remember it if it actually loaded — a stale id (deleted elsewhere, or a
    // cleared database) should fall back to the picker instead of retrying forever.
    saveLastProjectId(project ? id : null);
    if (project) await get().refreshSnapshots();
  },

  closeProject: () => {
    saveLastProjectId(null);
    set({ project: null, history: emptyHistory(), status: "idle", dirty: false, snapshots: [] });
    void get().refreshProjects();
  },

  edit: (label, recipe, coalesceKey) => {
    const { project, history } = get();
    if (!project) return;
    const result = commit(project, history, label, (draft) => {
      recipe(draft);
      for (const key of ["colors", "typography"] as const) {
        if (!label.startsWith("Leave ") && project.recipe.unset?.includes(key) && JSON.stringify(project.tokens[key]) !== JSON.stringify(draft.tokens[key])) {
          draft.recipe.unset = draft.recipe.unset?.filter(item => item !== key);
        }
      }
      // Engines follow from what the project contains, so they are recomputed after
      // every edit rather than being a question the user has to answer. Doing it here,
      // inside the same commit, keeps it on the undo stack with the change that caused
      // it — a separate write would make undo leave the engine list out of step.
      syncEngines(draft);
    }, coalesceKey);
    if (result.state === project) return;
    set({ project: result.state, history: result.history, dirty: true });
    scheduleSave(result.state, set);
  },

  undo: () => {
    const { project, history } = get();
    if (!project) return;
    const result = undo(project, history);
    set({ project: result.state, history: result.history, dirty: true });
    scheduleSave(result.state, set);
  },

  redo: () => {
    const { project, history } = get();
    if (!project) return;
    const result = redo(project, history);
    set({ project: result.state, history: result.history, dirty: true });
    scheduleSave(result.state, set);
  },

  jumpToHistory: (position) => {
    const { project, history } = get();
    if (!project) return;
    const result = jumpTo(project, history, position);
    set({ project: result.state, history: result.history, dirty: true });
    scheduleSave(result.state, set);
  },

  historyTimeline: () => timeline(get().history),

  canUndo: () => canUndo(get().history),
  canRedo: () => canRedo(get().history),
  setSection: (section) => set({ section }),
  setPreviewMode: (previewMode) => set({ previewMode }),
  setDevice: (device) => set({ device }),
  setTheme: (theme) => set({ theme }),
  setAdvanced: (advanced) => set({ advanced }),

  hydratePreferences: () => {
    set(loadPreferences());

    // Reopen where they left off. Losing your place on every refresh is the loudest
    // papercut here — and until now a refresh was also the only route back to the
    // project list, which is why `closeProject` exists alongside this.
    const lastProjectId = loadLastProjectId();
    if (lastProjectId && !get().project) void get().open(lastProjectId);

    if (unsubscribePreferences) return;
    unsubscribePreferences = useProjectStore.subscribe((state, previous) => {
      const next = viewPreferencesOf(state);
      if (samePreferences(next, viewPreferencesOf(previous))) return;
      savePreferences(next);
    });
  },

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
    scheduleSave(result.state, set);
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
    if (get().project?.id === id) {
      saveLastProjectId(null);
      set({ project: null, history: emptyHistory(), snapshots: [] });
    }
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

  loadRegistry: async () => {
    // Already loaded or in flight — opening the tab repeatedly shouldn't re-request.
    if (get().registryState !== "idle") return;
    set({ registryState: "loading", registryError: null });
    try {
      const response = await fetch("/api/registry");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const parsed = RegistryIndex.safeParse(await response.json());
      if (!parsed.success) throw new Error("The stored index could not be read");
      set({ registry: parsed.data, registryState: "ready" });
    } catch (cause) {
      // An empty index is a valid state the UI already handles (it prompts a refresh),
      // so a failed load degrades to "nothing indexed yet" plus a visible reason.
      set({
        registryState: "ready",
        registryError: cause instanceof Error ? cause.message : "Could not read the element index",
      });
    }
  },

  refreshRegistry: async () => {
    set({ registryState: "refreshing", registryError: null });
    try {
      const response = await fetch("/api/registry", { method: "POST" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body: unknown = await response.json();
      const parsed = RegistryIndex.safeParse(body);
      if (!parsed.success) throw new Error("The refreshed index could not be read");

      // A refresh where every source failed keeps whatever was already indexed: the
      // per-source errors are reported through registry.sources, and replacing good
      // data with nothing would be a worse outcome than showing it as stale.
      const persisted = (body as { persisted?: boolean }).persisted;
      set({
        registry: parsed.data,
        registryState: "ready",
        registryError: persisted === false
          ? "Refreshed, but the index could not be written to disk — it will be re-fetched next time."
          : null,
      });
    } catch (cause) {
      set({
        registryState: "ready",
        registryError: cause instanceof Error ? cause.message : "Could not reach the registries",
      });
    }
  },

  selectElement: (element, intendedUse = "") => {
    get().edit(`Select ${element.title}`, (draft) => {
      if (draft.selections.some((s) => s.id === element.id)) return;
      const selection: SelectedElement = {
        id: element.id,
        name: element.name,
        title: element.title,
        description: element.description,
        source: element.source,
        category: element.category,
        installCommand: element.installCommand,
        intendedUse,
        referenceOnly: element.referenceOnly,
        variant: element.variant,
        engineDependency: element.engineDependency,
        addedAt: Date.now(),
      };
      draft.selections.push(selection);
    });
  },

  deselectElement: (id) => {
    const title = get().project?.selections.find((s) => s.id === id)?.title ?? id;
    get().edit(`Remove ${title}`, (draft) => {
      draft.selections = draft.selections.filter((s) => s.id !== id);
    });
  },

  setIntendedUse: (id, intendedUse) => {
    // Coalesced on the selection id so typing a sentence is one undo step, not thirty.
    get().edit(
      "Set intended use",
      (draft) => {
        const selection = draft.selections.find((s) => s.id === id);
        if (selection) selection.intendedUse = intendedUse;
      },
      `intended-use:${id}`,
    );
  },

  setEngine: (engine, enabled) => {
    // Only Lenis and Vanta remain switchable; Motion and GSAP are derived by syncEngines
    // and would be overwritten on the very next edit anyway.
    get().edit(`${enabled ? "Enable" : "Disable"} ${engine}`, (draft) => {
      draft.recipe.engines[engine] = enabled;
    });
  },
}));
