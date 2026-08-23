"use client";

import { useEffect, useRef, useState } from "react";
import { useProjectStore } from "@/store/project-store";
import { generateCss } from "@/export/css";
import {
  DEVICE_WIDTHS, isPreviewMessage, PREVIEW_ORIGIN_MARKER, type HostMessage,
} from "@/preview/bridge";

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
export function PreviewFrame() {
  const project = useProjectStore((s) => s.project);
  const mode = useProjectStore((s) => s.previewMode);
  const device = useProjectStore((s) => s.device);
  const theme = useProjectStore((s) => s.theme);

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
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Full state on connect and whenever anything structural changes.
  useEffect(() => {
    if (!ready || !project) return;
    post({
      marker: PREVIEW_ORIGIN_MARKER,
      type: "state",
      payload: { project, mode, device, theme },
    });
  }, [ready, project, mode, device, theme]);

  // Fast path: tokens alone, applied as CSS with no remount.
  useEffect(() => {
    if (!ready || !project) return;
    post({
      marker: PREVIEW_ORIGIN_MARKER,
      type: "tokens",
      payload: { css: generateCss(project.tokens, { tailwindTheme: false }) },
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
    <div ref={containerRef} className="min-h-0 flex-1 overflow-hidden p-6">
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
