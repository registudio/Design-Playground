import type { Device, PreviewMode, Section, Theme } from "./project-store";

/**
 * View preferences, remembered between sessions.
 *
 * These deliberately live outside the project document — they describe how someone
 * likes to work, not what the design is, and must never reach the export. But keeping
 * them purely in memory meant every reload dropped you back to Style Guide, desktop,
 * light, Advanced off, with every panel re-expanded. For a tool opened repeatedly
 * against the same project that is a small tax paid over and over, and it got worse
 * the moment panels became collapsible.
 *
 * Storage is best-effort by design: it can be unavailable (private windows, blocked
 * site data) or hold something stale from an older build, and neither is worth failing
 * a page load over. Anything unreadable or unrecognised is simply ignored, leaving the
 * defaults in place.
 */

const STORAGE_KEY = "design-playground:view-preferences:v1";

export interface ViewPreferences {
  section: Section;
  previewMode: PreviewMode;
  device: Device;
  theme: Theme;
  advanced: boolean;
  collapsedPanels: string[];
}

const SECTIONS: Section[] = ["components", "animations"];
const PREVIEW_MODES: PreviewMode[] = ["system", "components", "sample"];
const DEVICES: Device[] = ["desktop", "tablet", "mobile"];
const THEMES: Theme[] = ["light", "dark"];

const oneOf = <T extends string>(allowed: T[], value: unknown): T | undefined =>
  typeof value === "string" && (allowed as string[]).includes(value) ? (value as T) : undefined;

/**
 * Reads back whatever is still valid, field by field.
 *
 * Validated rather than trusted: this is the one input to the store that survives a
 * deploy, so a value dropped from an enum in a later build would otherwise persist
 * forever in someone's browser and put the UI in a state the code no longer handles.
 */
export function loadPreferences(): Partial<ViewPreferences> {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const source = parsed as Record<string, unknown>;

    const preferences: Partial<ViewPreferences> = {};
    const section = oneOf(SECTIONS, source.section);
    if (section) preferences.section = section;
    const previewMode = oneOf(PREVIEW_MODES, source.previewMode);
    if (previewMode) preferences.previewMode = previewMode;
    const device = oneOf(DEVICES, source.device);
    if (device) preferences.device = device;
    const theme = oneOf(THEMES, source.theme);
    if (theme) preferences.theme = theme;
    if (typeof source.advanced === "boolean") preferences.advanced = source.advanced;
    if (Array.isArray(source.collapsedPanels)) {
      preferences.collapsedPanels = source.collapsedPanels.filter((p): p is string => typeof p === "string");
    }
    return preferences;
  } catch {
    return {};
  }
}

/**
 * The project to reopen on next load.
 *
 * Kept in its own entry and written explicitly rather than derived from store state:
 * the open project is null for a moment during startup, and a state-derived write would
 * race that window and clear the very id it is meant to restore.
 */
const LAST_PROJECT_KEY = "design-playground:last-project:v1";

export function loadLastProjectId(): string | null {
  try {
    return globalThis.localStorage?.getItem(LAST_PROJECT_KEY) ?? null;
  } catch {
    return null;
  }
}

export function saveLastProjectId(id: string | null): void {
  try {
    if (id) globalThis.localStorage?.setItem(LAST_PROJECT_KEY, id);
    else globalThis.localStorage?.removeItem(LAST_PROJECT_KEY);
  } catch {
    // Same best-effort contract as the view preferences above.
  }
}

export function savePreferences(preferences: ViewPreferences): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Storage full, blocked, or unavailable — preferences simply don't persist.
  }
}

/** True when nothing worth persisting changed, so writes stay off the hot path. */
export function samePreferences(a: ViewPreferences, b: ViewPreferences): boolean {
  return (
    a.section === b.section &&
    a.previewMode === b.previewMode &&
    a.device === b.device &&
    a.theme === b.theme &&
    a.advanced === b.advanced &&
    a.collapsedPanels.length === b.collapsedPanels.length &&
    a.collapsedPanels.every((panel, i) => panel === b.collapsedPanels[i])
  );
}
