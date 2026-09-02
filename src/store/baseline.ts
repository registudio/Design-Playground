import type { DesignProject } from "@/schema/project";
import type { CustomPreset } from "@/schema/customPreset";
import { SEMANTIC_TOKENS, type SemanticToken } from "@/schema/primitives";
import { createProject } from "@/schema/defaults";
import { applyPreset, customPresetToPreset, PRESETS } from "@/presets";
import { OWNS_SCALE } from "@/color/semantic";

/**
 * Reset-to-baseline (§10.2's "reset to suggestion", generalised to every tracked value).
 *
 * Provenance already tells you where a value came from; until now that was all it did.
 * The missing half is being able to *go back* — without this, trying an idea is a
 * one-way door unless you can find the exact undo step that preceded it, which stops
 * being findable after a few more edits. A playground people are afraid to poke at is
 * not doing its job.
 *
 * "Baseline" means: what this value would be if the user had never touched it. That is
 * a fresh project with the same assets, carrying the last global direction the user
 * actually chose — the applied preset if there is one, otherwise the palette suggested
 * by their logo. It is recomputed rather than remembered, so it can't drift out of date
 * or bloat the saved document.
 */

/** Resolves the applied preset id against both built-in and user-saved presets. */
function findAppliedPreset(project: DesignProject, customPresets: CustomPreset[]) {
  const id = project.appliedPreset;
  if (!id) return null;
  return (
    PRESETS.find((p) => p.id === id) ??
    customPresets.map(customPresetToPreset).find((p) => p.id === id) ??
    null
  );
}

/**
 * The project as it would stand with no manual edits at all.
 *
 * `analysis` and `suggestion` are carried over before the preset is applied because
 * preset palettes deliberately step aside for an uploaded logo (see `setPalette` in
 * presets/index.ts). Replaying the preset against a project that had forgotten the logo
 * would reset brand colours to the preset's generic seed — the opposite of what §10.1
 * requires.
 */
export function baselineFor(project: DesignProject, customPresets: CustomPreset[]): DesignProject {
  // Cloned, not aliased: the baseline is a snapshot to restore *from*, so it must not
  // share structure with the live project. Sharing would let an in-place edit quietly
  // rewrite the very value a reset is supposed to bring back, turning reset into a no-op.
  const base = createProject(project.name, project.client);
  base.analysis = structuredClone(project.analysis);
  base.suggestion = structuredClone(project.suggestion);
  base.assets = structuredClone(project.assets);
  if (base.suggestion) base.tokens.colors = structuredClone(base.suggestion);

  const preset = findAppliedPreset(project, customPresets);
  if (preset) applyPreset(base, preset);
  return base;
}

/** What a reset on this project would restore to, phrased for a tooltip. */
export function baselineDescription(project: DesignProject, customPresets: CustomPreset[]): string {
  const preset = findAppliedPreset(project, customPresets);
  if (preset) return `Reset to ${preset.name}`;
  if (project.suggestion) return "Reset to the palette from your logo";
  return "Reset to the default";
}

// --- path access -------------------------------------------------------------
// Provenance paths are dotted paths into the project document, with one exception:
// colours are tracked as `tokens.colors.<token>`, which is a *semantic* address rather
// than a real object path (the value actually lives under the active theme, and may be
// a rung of a shared ramp). That case is handled separately below.

const COLOR_PREFIX = "tokens.colors.";

function isColorPath(path: string): SemanticToken | null {
  if (!path.startsWith(COLOR_PREFIX)) return null;
  const token = path.slice(COLOR_PREFIX.length);
  return (SEMANTIC_TOKENS as readonly string[]).includes(token) ? (token as SemanticToken) : null;
}

function valueAt(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>(
    (node, key) => (node && typeof node === "object" ? (node as Record<string, unknown>)[key] : undefined),
    source,
  );
}

/** Writes `value` at a dotted path, doing nothing if any parent along the way is absent. */
function setAt(target: unknown, path: string, value: unknown): boolean {
  const keys = path.split(".");
  const last = keys.pop();
  if (!last) return false;
  let node: unknown = target;
  for (const key of keys) {
    if (!node || typeof node !== "object") return false;
    node = (node as Record<string, unknown>)[key];
  }
  if (!node || typeof node !== "object") return false;
  (node as Record<string, unknown>)[last] = value;
  return true;
}

/**
 * Restores one tracked value from `baseline` into `draft`, clearing its provenance so
 * the field reads as unmodified again. Returns false when the path resolves to nothing,
 * so the caller can skip recording an empty history entry.
 */
export function resetPath(
  draft: DesignProject,
  baseline: DesignProject,
  path: string,
  theme: "light" | "dark",
): boolean {
  const token = isColorPath(path);

  if (token) {
    // Match the colour editor's own model: a token that owns a ramp restores the whole
    // ramp, so the scale stays internally consistent instead of keeping user-generated
    // rungs under a reset semantic entry.
    const themeKey = theme === "dark" && draft.tokens.colors.dark ? "dark" : "light";
    const from = themeKey === "dark" ? baseline.tokens.colors.dark : baseline.tokens.colors.light;
    const to = themeKey === "dark" ? draft.tokens.colors.dark : draft.tokens.colors.light;
    const entry = from?.semantic[token];
    if (!from || !to || !entry) return false;

    to.semantic[token] = structuredClone(entry);
    const owned = OWNS_SCALE[token];
    const ramp = owned ? baseline.tokens.colors.scales[owned] : undefined;
    if (owned && ramp) draft.tokens.colors.scales[owned] = structuredClone(ramp);
  } else {
    const value = valueAt(baseline, path);
    if (value === undefined) return false;
    if (!setAt(draft, path, structuredClone(value))) return false;
  }

  // Restore the source the baseline itself carries rather than just dropping the entry.
  // After resetting a value a preset had set, the dot should read "From a preset" —
  // deleting would make it claim to be a default, which is exactly the kind of quiet
  // dishonesty provenance exists to prevent.
  const restoredSource = baseline.provenance[path];
  if (restoredSource) draft.provenance[path] = restoredSource;
  else delete draft.provenance[path];
  return true;
}
