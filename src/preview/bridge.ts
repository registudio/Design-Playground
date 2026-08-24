import type { DesignProject } from "@/schema/project";
import type { Device, PreviewMode, Theme } from "@/store/project-store";

/**
 * postMessage protocol between the playground and the preview iframe.
 *
 * The preview runs in a same-origin iframe rather than inline in the playground's React
 * tree. That isolation is doing four jobs at once, and losing any of them would be a
 * real defect:
 *
 *   1. Project tokens cannot collide with the playground's own UI variables.
 *   2. Device modes get *real* media queries — a 375px-wide div still matches
 *      desktop breakpoints, so inline previews lie about responsive behaviour.
 *   3. A custom cursor stays inside the preview instead of hijacking the whole app.
 *   4. GSAP ScrollTrigger binds to the preview's own scroll container.
 */

export const PREVIEW_ORIGIN_MARKER = "design-playground";

export interface PreviewState {
  project: DesignProject;
  mode: PreviewMode;
  device: Device;
  theme: Theme;
  /** Gates the Advanced-tier primitives (Modal, Table, Toast, etc.) in the Style
   * Guide and Element Gallery surfaces — implementation-detail components a client
   * doesn't need to see by default. */
  advanced: boolean;
}

export type HostMessage =
  /** Full state — sent on connect and whenever something structural changes. */
  | { marker: typeof PREVIEW_ORIGIN_MARKER; type: "state"; payload: PreviewState }
  /**
   * Token-only update. Applied by rewriting CSS variables, with no React remount, so
   * dragging a slider stays smooth and running animations are not restarted.
   */
  | { marker: typeof PREVIEW_ORIGIN_MARKER; type: "tokens"; payload: { css: string } };

export type PreviewMessage =
  | { marker: typeof PREVIEW_ORIGIN_MARKER; type: "ready" }
  /** Reports rendered geometry back for the interactive-target-size check (§13.3). */
  | {
      marker: typeof PREVIEW_ORIGIN_MARKER;
      type: "measurements";
      payload: Array<{ label: string; width: number; height: number }>;
    }
  /**
   * Click-to-edit (§Wave E): the Element Gallery and Sample Page surfaces let a click
   * on a button/card/section pick a new structural variant right there, instead of
   * requiring a trip to the Components panel. The popover itself renders inside the
   * preview document (it needs the click position), but the actual edit has to happen
   * in the host — the iframe has no access to the Zustand store, only this message.
   */
  | {
      marker: typeof PREVIEW_ORIGIN_MARKER;
      type: "setComponent";
      payload: { field: string; value: string };
    };

export const isHostMessage = (data: unknown): data is HostMessage =>
  typeof data === "object" &&
  data !== null &&
  (data as { marker?: unknown }).marker === PREVIEW_ORIGIN_MARKER;

export const isPreviewMessage = (data: unknown): data is PreviewMessage => isHostMessage(data);

/** Sends a click-to-edit selection up to the host. A no-op outside the preview iframe
 *  (e.g. during the static-page export's server render, which never fires an event
 *  handler anyway, but this keeps the helper safe to import from anywhere). */
export function postSetComponent(field: string, value: string): void {
  if (typeof window === "undefined" || window === window.parent) return;
  window.parent.postMessage(
    { marker: PREVIEW_ORIGIN_MARKER, type: "setComponent", payload: { field, value } } satisfies PreviewMessage,
    window.location.origin,
  );
}

export const DEVICE_WIDTHS: Record<Device, number> = {
  desktop: 1440,
  tablet: 834,
  mobile: 390,
};
