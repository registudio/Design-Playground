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
    };

export const isHostMessage = (data: unknown): data is HostMessage =>
  typeof data === "object" &&
  data !== null &&
  (data as { marker?: unknown }).marker === PREVIEW_ORIGIN_MARKER;

export const isPreviewMessage = (data: unknown): data is PreviewMessage => isHostMessage(data);

export const DEVICE_WIDTHS: Record<Device, number> = {
  desktop: 1440,
  tablet: 834,
  mobile: 390,
};
