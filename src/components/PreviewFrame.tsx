"use client";

import { useEffect, useRef, useState } from "react";
import { useProjectStore } from "@/store/project-store";
import { generateCss } from "@/export/css";
import {
  DEVICE_WIDTHS, isPreviewMessage, PREVIEW_ORIGIN_MARKER, type ContrastSummary, type HostMessage,
} from "@/preview/bridge";
import type { DesignProject } from "@/schema/project";

/** How long token edits must pause before the frame gets the full state as well. */
const TOKEN_STATE_DELAY_MS = 200;

/**
 * True when the only things that differ between two project versions are `tokens` and
 * `provenance`. A slider's first tick marks its token as the user's, and the preview never
 * reads provenance, so counting it as structural would put that tick on the slow path.
 */
export function onlyTokensChanged(previous: DesignProject, next: DesignProject): boolean {
  if (previous === next || previous.tokens === next.tokens) return false;
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]) as Set<keyof DesignProject>;
  for (const key of keys) {
    if (key !== "tokens" && key !== "provenance" && previous[key] !== next[key]) return false;
  }
  return true;
}

/**
 * Hosts the preview iframe and keeps it in sync.
 *
 * Two update paths, deliberately separated:
 *   - Token changes send CSS only. No remount, so a slider drag stays at 60fps and
 *     any running animation keeps its state.
 *   - Structural changes (recipe, mode, theme) send full state and re-render.
 *
 * The frame is rendered at its true device width and scaled down to fit, so media
 * queries evaluate against the real width rather than a scaled-down lie.
 */
export function PreviewFrame({
  contrastLens = false,
  onContrast,
  themeOverride,
  label,
}: {
  /** Outline text that fails WCAG AA against what is behind it, in the page itself. */
  contrastLens?: boolean;
  onContrast?: (summary: ContrastSummary | null) => void;
  /** Pins this frame to one theme, for the side-by-side light and dark view. */
  themeOverride?: "light" | "dark";
  /** Shown above the frame when two are side by side. */
  label?: string;
} = {}) {
  const project = useProjectStore((s) => s.project);
  const mode = useProjectStore((s) => s.previewMode);
  const device = useProjectStore((s) => s.device);
  const storeTheme = useProjectStore((s) => s.theme);
  const theme = themeOverride ?? storeTheme;
  const advanced = useProjectStore((s) => s.advanced);
  const edit = useProjectStore((s) => s.edit);

  const frameRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [available, setAvailable] = useState({ width: 0, height: 0 });

  const width = DEVICE_WIDTHS[device];

  const post = (message: HostMessage) => {
    frameRef.current?.contentWindow?.postMessage(message, window.location.origin);
  };

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!isPreviewMessage(event.data)) return;
      if (event.data.type === "ready") setReady(true);
      if (event.data.type === "contrast") contrastRef.current?.(event.data.payload);
      if (event.data.type === "setComponent") {
        const { field, value } = event.data.payload;
        // Same pattern as ComponentsPanel's own set() helper, so a click in the
        // preview is indistinguishable from the matching sidebar control — one
        // history entry, provenance marked "user".
        edit(`Set ${field}`, (draft) => {
          (draft.recipe.components as Record<string, string>)[field] = value;
          draft.provenance[`recipe.components.${field}`] = "user";
        });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [edit]);

  const contrastRef = useRef(onContrast);
  contrastRef.current = onContrast;
  // After the state message below on first connect, so the lens scans a rendered page.
  useEffect(() => {
    if (!ready) return;
    post({ marker: PREVIEW_ORIGIN_MARKER, type: "contrastLens", payload: { on: contrastLens } });
    if (!contrastLens) contrastRef.current?.(null);
  }, [ready, contrastLens]);

  // Full state on connect and whenever anything structural changes.
  //
  // A token edit gives the project a new identity too, so this used to fire on every
  // tick of a slider drag: alongside the CSS fast path below, the frame re-rendered the
  // whole sample page sixty times a second, which is what made dragging stutter. The
  // surfaces do still read tokens (font loading, the style guide's printed values), so a
  // token-only change is not dropped — it is sent once the drag has paused. Anything
  // else goes immediately. Immer keeps unchanged branches by reference, so comparing
  // everything but `tokens` by identity is exact.
  const sent = useRef<{ project: DesignProject; mode: unknown; device: unknown; theme: unknown; advanced: unknown } | null>(null);
  useEffect(() => {
    if (!ready || !project) return;
    const send = () => {
      sent.current = { project, mode, device, theme, advanced };
      post({
        marker: PREVIEW_ORIGIN_MARKER,
        type: "state",
        payload: { project, mode, device, theme, advanced },
      });
    };
    const last = sent.current;
    const tokensOnly = !!last && last.mode === mode && last.device === device && last.theme === theme
      && last.advanced === advanced && onlyTokensChanged(last.project, project);
    if (!tokensOnly) { send(); return; }
    const timer = setTimeout(send, TOKEN_STATE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [ready, project, mode, device, theme, advanced]);

  // Fast path: tokens alone, applied as CSS with no remount.
  useEffect(() => {
    if (!ready || !project) return;
    post({
      marker: PREVIEW_ORIGIN_MARKER,
      type: "tokens",
      // Uploaded faces are registered inside the frame from stored bytes; no URL here.
      payload: { css: generateCss(project.tokens, { tailwindTheme: false, fontUrl: () => null }) },
    });
  }, [ready, project?.tokens]);

  // Measure the space available so the frame can be scaled to fit it exactly.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      const box = entry!.contentRect;
      setAvailable({ width: box.width, height: box.height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Render at the true device width, then scale down to fit. Scaling rather than
  // resizing is what keeps media queries evaluating against the real width.
  const scale = available.width > 0 ? Math.min(1, available.width / width) : 1;
  // Compensating the height by 1/scale means the scaled frame fills the panel exactly,
  // with no clipped content and no dead space below it.
  const frameHeight = scale > 0 ? available.height / scale : available.height;

  return (
    <div ref={containerRef} className="relative min-h-0 min-w-0 flex-1 overflow-hidden p-6">
      {label && <span className="preview-frame-label">{label}</span>}
      <div
        className="mx-auto overflow-hidden rounded-lg border border-chrome-border shadow-sm"
        style={{ width: width * scale, height: available.height }}
      >
        <iframe
          ref={frameRef}
          src="/preview"
          title="Live preview"
          className="border-0"
          style={{
            width,
            height: frameHeight,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
          // Same-origin is required: the bridge and real media queries both depend on it.
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
}
