import { applyPatches, enablePatches, produceWithPatches, type Patch } from "immer";

enablePatches();

/**
 * Patch-based undo/redo (§13.4).
 *
 * Storing whole-document snapshots would be simple but wasteful, and — more
 * importantly — would give the wrong *granularity*. Dragging a radius slider must not
 * leave 200 entries in the history, and applying a preset must collapse to one entry
 * even though it rewrites most of the document. Both are handled by coalescing on a
 * caller-supplied key within a time window.
 */

export interface HistoryEntry {
  patches: Patch[];
  inverse: Patch[];
  label: string;
  /** Entries sharing a key inside COALESCE_WINDOW_MS merge into one. */
  coalesceKey?: string;
  at: number;
}

export const COALESCE_WINDOW_MS = 500;
const MAX_ENTRIES = 200;

export interface History {
  past: HistoryEntry[];
  future: HistoryEntry[];
}

export const emptyHistory = (): History => ({ past: [], future: [] });

export interface CommitResult<T> {
  state: T;
  history: History;
}

/**
 * Applies `recipe` to `state`, recording the change in history.
 * Passing a `coalesceKey` merges rapid successive edits to the same control.
 */
export function commit<T extends object>(
  state: T,
  history: History,
  label: string,
  recipe: (draft: T) => void,
  coalesceKey?: string,
): CommitResult<T> {
  const [next, patches, inverse] = produceWithPatches(state, recipe);
  if (patches.length === 0) return { state, history };

  const now = Date.now();
  const last = history.past[history.past.length - 1];
  const canCoalesce =
    coalesceKey !== undefined &&
    last?.coalesceKey === coalesceKey &&
    now - last.at < COALESCE_WINDOW_MS;

  if (canCoalesce && last) {
    // Keep the *original* inverse so undo jumps back past the whole drag, not one frame.
    const merged: HistoryEntry = {
      patches: [...last.patches, ...patches],
      inverse: [...inverse, ...last.inverse],
      label,
      coalesceKey,
      at: now,
    };
    return {
      state: next,
      history: { past: [...history.past.slice(0, -1), merged], future: [] },
    };
  }

  const past = [...history.past, { patches, inverse, label, coalesceKey, at: now }];
  return {
    state: next,
    history: { past: past.slice(-MAX_ENTRIES), future: [] },
  };
}

export function undo<T extends object>(state: T, history: History): CommitResult<T> {
  const entry = history.past[history.past.length - 1];
  if (!entry) return { state, history };
  return {
    state: applyPatches(state, entry.inverse),
    history: { past: history.past.slice(0, -1), future: [entry, ...history.future] },
  };
}

export function redo<T extends object>(state: T, history: History): CommitResult<T> {
  const [entry, ...rest] = history.future;
  if (!entry) return { state, history };
  return {
    state: applyPatches(state, entry.patches),
    history: { past: [...history.past, entry], future: rest },
  };
}

export const canUndo = (h: History) => h.past.length > 0;
export const canRedo = (h: History) => h.future.length > 0;
export const undoLabel = (h: History) => h.past[h.past.length - 1]?.label;
export const redoLabel = (h: History) => h.future[0]?.label;
