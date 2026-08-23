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

/**
 * Jumps directly to a point in the timeline, expressed as how many entries should sit
 * in `past` when it's done. This is what makes a real history list possible (§13.4) —
 * without it, returning to "the second preset I tried" means clicking Undo six times
 * and hoping you counted right, rather than clicking that entry once.
 */
export function jumpTo<T extends object>(state: T, history: History, targetPastLength: number): CommitResult<T> {
  let result: CommitResult<T> = { state, history };
  while (result.history.past.length > targetPastLength) result = undo(result.state, result.history);
  while (result.history.past.length < targetPastLength) result = redo(result.state, result.history);
  return result;
}

/** One entry in a flattened, chronological view of the whole timeline. */
export interface TimelineEntry {
  label: string;
  /** past.length this entry represents — the value to pass to jumpTo. */
  position: number;
  /** Whether this is where the project currently sits. */
  current: boolean;
}

/** Flattens past + future into one ordered list for a history list UI. */
export function timeline(history: History): TimelineEntry[] {
  const past = history.past.map((entry, i) => ({ label: entry.label, position: i + 1, current: false }));
  const future = history.future
    .slice()
    .reverse()
    .map((entry, i) => ({
      label: entry.label,
      position: history.past.length + (history.future.length - i),
      current: false,
    }));
  // A synthetic entry at position 0, so "back to the very start" is reachable even
  // once earlier entries have scrolled out of view or been trimmed at MAX_ENTRIES.
  const start = { label: "Start", position: 0, current: false };
  const entries = [start, ...past, ...future];
  const currentPosition = history.past.length;
  const withCurrent = entries.map((e) => ({ ...e, current: e.position === currentPosition }));
  // Oldest last, so "what I just did" reads at the top like a normal activity feed.
  return withCurrent.reverse();
}
