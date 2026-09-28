"use client";

import { useEffect, useRef, useState } from "react";
import type { DesignProject } from "@/schema/project";
import {
  isHostMessage, PREVIEW_ORIGIN_MARKER, type PreviewMessage, type PreviewState,
} from "@/preview/bridge";
import { watchContrast } from "@/preview/contrast-lens";
import { useCustomFonts } from "@/fonts/use-custom-fonts";
import { findFont, googleFontUrl } from "@/fonts/catalogue";
import { System } from "@/preview/surfaces/System";
import { Components } from "@/preview/surfaces/Components";
import { SamplePage } from "@/preview/surfaces/SamplePage";
import "./preview.css";

/**
 * The preview document. Runs inside a same-origin iframe and receives all of its state
 * over postMessage — it never imports the playground's store, which is what keeps the
 * two DOMs genuinely independent.
 *
 * Token updates arrive as a CSS string and are applied to a single <style> element.
 * That is the fast path: dragging a slider rewrites variables with no React reconcile
 * and no animation restart, which is what makes §13's "update immediately" feel
 * immediate rather than merely correct.
 */
export default function PreviewPage() {
  const [state, setState] = useState<PreviewState | null>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    const style = document.createElement("style");
    style.dataset.dpTokens = "";
    document.head.appendChild(style);
    styleRef.current = style;

    const onMessage = (event: MessageEvent) => {
      // Same-origin iframe: reject anything from another origin outright.
      if (event.origin !== window.location.origin) return;
      if (!isHostMessage(event.data)) return;

      if (event.data.type === "tokens") {
        style.textContent = event.data.payload.css;
        return;
      }
      if (event.data.type === "state") {
        setState(event.data.payload);
      }
      if (event.data.type === "contrastLens") {
        stopLens?.();
        stopLens = event.data.payload.on
          ? watchContrast(document, (report) => window.parent.postMessage({
              marker: PREVIEW_ORIGIN_MARKER,
              type: "contrast",
              payload: { checked: report.checked, failing: report.failing.length, unknown: report.unknown },
            } satisfies PreviewMessage, window.location.origin))
          : undefined;
      }
    };
    let stopLens: (() => void) | undefined;

    window.addEventListener("message", onMessage);
    window.parent.postMessage({ marker: PREVIEW_ORIGIN_MARKER, type: "ready" }, window.location.origin);

    return () => {
      window.removeEventListener("message", onMessage);
      stopLens?.();
      style.remove();
    };
  }, []);

  useEffect(() => {
    if (!state) return;
    document.documentElement.classList.toggle("dark", state.theme === "dark");
    document.documentElement.classList.toggle("light", state.theme === "light");
  }, [state?.theme]);

  /**
   * Load the selected Google faces into the iframe. Without this the type tokens
   * resolve to family names the document has never fetched, so every pairing renders
   * as the fallback stack and the typography controls appear to do nothing.
   *
   * This is preview-only: the export records families and weights so the real build
   * self-hosts them rather than depending on the Google CDN at runtime.
   */
  const fontKey = state
    ? [state.project.tokens.typography.display.family,
       state.project.tokens.typography.body.family,
       state.project.tokens.typography.mono.family].join("|")
    : "";

  useEffect(() => {
    if (!fontKey) return;
    const entries = fontKey
      .split("|")
      .map(findFont)
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

    const href = googleFontUrl(entries);
    if (!href) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
    return () => link.remove();
  }, [fontKey]);

  useCustomFonts(state?.project);

  if (!state) return null;

  return <Surface project={state.project} mode={state.mode} advanced={state.advanced} />;
}

function Surface({
  project, mode, advanced,
}: {
  project: DesignProject;
  mode: PreviewState["mode"];
  advanced: boolean;
}) {
  switch (mode) {
    case "components":
      return <Components project={project} advanced={advanced} />;
    case "sample":
      return <SamplePage project={project} editable />;
    default:
      return <System project={project} advanced={advanced} />;
  }
}
