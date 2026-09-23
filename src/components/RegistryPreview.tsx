"use client";

import { useEffect, useRef, useState } from "react";
import type { DesignElement } from "@/registry/schema";
import { previewKey, recordPreview, type PreviewStatus } from "@/elements/preview-status";
import { useLiveSlot } from "./use-live-slot";

/**
 * A live preview of one published registry component.
 *
 * Every card in the grid wants to run third-party React, and several hundred of them
 * doing it at once would be a stalled tab. Three things bound that, and they are
 * deliberately separate: proximity decides *whether* a preview is worth having, the
 * queue decides *how many* may run at once, and the grace period decides *when* one is
 * given up. Removing any of the three moves the cost somewhere else rather than saving it.
 * All three live in use-live-slot.ts, shared with the authored previews, so the two kinds
 * of card draw on one budget.
 */

/**
 * The URL of a registry item's preview document — for the card and the full-screen view
 * alike.
 *
 * The two used to build it separately, and only the card's carried the document version.
 * Documents are browser-cached for a day, so after a format change the full-screen view
 * could be served the old one while the card showed the new; and with two different
 * URLs the full-screen view never reused what the card had just downloaded. One function
 * means one URL: a retry is the only thing that changes it.
 */
export function previewSrc(
  element: Pick<DesignElement, "source" | "name" | "variant">,
  attempt = 0,
): string {
  // React Bits collapses four published variants into one catalogue record. The
  // preview route needs the concrete registry item, just like the install command.
  const concreteName = element.source === "react-bits" && element.variant
    ? `${element.name}-${element.variant.language}-${element.variant.styling}`
    : element.name;
  return `/api/element-preview?v=6&source=${encodeURIComponent(element.source)}&name=${encodeURIComponent(concreteName)}&retry=${attempt}`;
}

export function RegistryPreview({
  element,
  /** Set when a narrow search has already decided this is one of a handful of results. */
  eager = false,
  /**
   * Set while previews are paused. The pause control used to reach only the authored
   * iframes, so someone who paused because their machine was working hard stopped the
   * 54 cheap previews and left every compiled one running — the opposite of what they
   * asked for.
   */
  paused = false,
  onExpand,
}: {
  element: Pick<DesignElement, "id" | "source" | "name" | "title" | "category" | "variant">;
  eager?: boolean;
  paused?: boolean;
  /** Opens this preview full size. Registry cards had no way to do that at all. */
  onExpand?: () => void;
}) {
  const [active, setActive] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<PreviewStatus>("queued");
  /**
   * Why a stand-in is showing. A failed download, a component that threw on mount and
   * one that painted nothing all put the same visual on the card, so without this the
   * only thing anyone could report was "it isn't rendering".
   */
  const [reason, setReason] = useState("");
  const [attempt, setAttempt] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const interested = useRef(false);
  const observationKey = previewKey(element);
  const host = useRef<HTMLDivElement>(null);
  /** When this preview began work, for the in-flight protection below. */
  const startedAt = useRef(0);
  /** True once the document has reported something final — ready, blank, fallback, failed. */
  const settled = useRef(false);

  useLiveSlot(host, `${element.id}|${observationKey}`, { paused, eager }, { startedAt, settled, interested }, {
    start: () => { setActive(true); setStatus("rendering"); recordPreview(observationKey, "rendering"); },
    stop: () => { setActive(false); setLoaded(false); setStatus("queued"); },
  });

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.data?.type !== "dp-preview-status") return;
      // The previous document lives on for a few seconds after the src changes and
      // keeps reporting; without this its stale answer lands on top of the retry.
      if (String(event.data.attempt ?? "0") !== String(attempt)) return;
      const next = event.data.status as PreviewStatus;
      if (!["ready", "fallback", "blank", "failed", "rendering"].includes(next)) return;
      if (next !== "rendering") settled.current = true;
      setStatus(next);
      setReason(typeof event.data.reason === "string" ? event.data.reason : "");
      // The frame is only revealed once something is actually on it. A blank surface
      // keeps the placeholder, because showing an empty rectangle and calling it done
      // is worse than admitting there is nothing to see.
      setLoaded(next === "ready" || next === "fallback");
      recordPreview(observationKey, next);
    };
    window.addEventListener("message", receive);

    // Asked rather than awaited. The document reports on its own too, but a single
    // announcement can land before this listener exists, and a component that renders
    // once and never mutates never sends another.
    const ping = active
      ? setInterval(() => frame.current?.contentWindow?.postMessage({ type: "dp-preview-ping" }, "*"), 600)
      : undefined;
    const timeout = active
      ? setTimeout(() => {
          setStatus((current) => {
            if (current !== "rendering" && current !== "queued") return current;
            recordPreview(observationKey, "failed");
            settled.current = true;
            return "failed";
          });
        }, 20000)
      : undefined;
    return () => {
      window.removeEventListener("message", receive);
      clearInterval(ping);
      clearTimeout(timeout);
    };
  }, [observationKey, active, attempt]);

  const src = previewSrc(element, attempt);

  return (
    <div className="registry-canvas" ref={host} data-active={active ? "yes" : "no"} onPointerEnter={() => { interested.current = true; }} onPointerLeave={() => { interested.current = false; }}>
      {active && (
        // sandbox without allow-same-origin: the frame gets no access to this origin,
        // no forms, no popups and no top-level navigation.
        <iframe
          ref={frame}
          title={`${element.title} preview`}
          sandbox="allow-scripts"
          src={src}
          // Proximity and the global slot queue already decide when this frame may
          // exist. Native lazy loading added a second, opaque delay after a slot was
          // granted, so an on-screen card could still sit on its poster.
          loading="eager"
          onError={() => { setStatus("failed"); recordPreview(observationKey, "failed"); }}
        />
      )}
      {!loaded && (
        <div className="registry-placeholder" data-category={element.category} aria-label={paused ? "Preview paused" : "Preparing visual preview"}>
          <div className="placeholder-orbit"><i/><i/><i/></div>
          <div className="placeholder-bars"><i/><i/><i/><i/><i/></div>
        </div>
      )}
      <div className="preview-status" role="status" title={reason || undefined}>
        {paused ? "Paused" : STATUS_LABEL[status]}
        {!paused && (status === "failed" || status === "fallback" || status === "blank") && (
          <button
            onClick={() => {
              settled.current = false;
              startedAt.current = Date.now();
              setLoaded(false);
              setStatus("rendering");
              setReason("");
              setAttempt((n) => n + 1);
            }}
          >
            Retry
          </button>
        )}
      </div>
      {reason && !paused && (status === "fallback" || status === "failed") && (
        <p className="preview-reason">{reason}</p>
      )}
      {onExpand && (
        <button
          type="button"
          className="expand-demo"
          aria-label={`Expand ${element.title}`}
          onClick={() => onExpand()}
        >
          ↗
        </button>
      )}
    </div>
  );
}

/** Plain words rather than the internal state name, which read as jargon on a card. */
const STATUS_LABEL: Record<PreviewStatus, string> = {
  queued: "Queued",
  rendering: "Rendering…",
  ready: "Ready",
  fallback: "Fallback demo",
  blank: "Nothing to show",
  failed: "Failed",
};
