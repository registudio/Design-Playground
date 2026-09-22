"use client";

import { useEffect, useRef, useState } from "react";
import {
  ACTIVATION_MARGIN_PX,
  MAX_LIVE_PREVIEWS,
  OFFSCREEN_GRACE_MS,
} from "@/elements/preview-budget";
import type { DesignElement } from "@/registry/schema";
import { previewKey, recordPreview, type PreviewStatus } from "@/elements/preview-status";

/**
 * A live preview of one published registry component.
 *
 * Every card in the grid wants to run third-party React, and several hundred of them
 * doing it at once would be a stalled tab. Three things bound that, and they are
 * deliberately separate: proximity decides *whether* a preview is worth having, the
 * queue decides *how many* may run at once, and the grace period decides *when* one is
 * given up. Removing any of the three moves the cost somewhere else rather than saving it.
 */

/**
 * Module-level rather than per-component: the budget is a property of the page, not of
 * any one card, and a queue each card kept its own copy of would not be a queue.
 *
 * Keyed by element id throughout. An earlier version queued bare callbacks, which meant
 * a card that unmounted while waiting — a fast scroll, or React's development
 * double-mount — left a callback behind that later claimed a slot for a component no
 * longer on the page. Those slots were never returned, so after enough churn nothing
 * could start at all.
 */
const live = new Set<string>();
const waiting = new Map<string, { start: () => void; priority: () => number }>();

function requestSlot(id: string, start: () => void, priority = () => 0): void {
  if (live.has(id)) return;
  if (live.size < MAX_LIVE_PREVIEWS) {
    live.add(id);
    start();
    return;
  }
  // Keyed, so re-entering the viewport twice cannot queue the same card twice.
  waiting.set(id, { start, priority });
}

function releaseSlot(id: string): void {
  waiting.delete(id);
  if (!live.delete(id)) return;
  // FIFO: the card waiting longest is the one nearest to being scrolled past, so
  // serving it first is also what keeps the grid feeling continuous.
  const next = [...waiting.entries()].sort((a,b) => a[1].priority() - b[1].priority())[0];
  if (!next) return;
  const [nextId, entry] = next;
  waiting.delete(nextId);
  live.add(nextId);
  entry.start();
}

/**
 * The nearest scrolling ancestor, or null for the viewport.
 *
 * IntersectionObserver clips the intersection against every scrolling ancestor, and
 * `rootMargin` only expands the *root* — it does not widen that clipping. With the
 * default root the studio's scrolling main element cropped every card below the fold to
 * "not intersecting", so no preview outside the visible area ever activated and the
 * 700px activation margin did nothing at all. Naming the scroller as the root is what
 * makes the margin mean what it says.
 */
function scrollParent(node: HTMLElement): HTMLElement | null {
  for (let parent = node.parentElement; parent; parent = parent.parentElement) {
    const overflow = getComputedStyle(parent).overflowY;
    if (overflow === "auto" || overflow === "scroll") return parent;
  }
  return null;
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
}: {
  element: Pick<DesignElement, "id" | "source" | "name" | "title" | "category" | "variant">;
  eager?: boolean;
  paused?: boolean;
}) {
  const [active, setActive] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<PreviewStatus>("queued");
  const [attempt, setAttempt] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const instance = useRef(Math.random().toString(36).slice(2));
  const interested = useRef(false);
  const observationKey = previewKey(element);
  const host = useRef<HTMLDivElement>(null);
  const teardown = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    const id = `${element.id}:${instance.current}`;
    const start = () => { setActive(true); setStatus("rendering"); recordPreview(observationKey, "rendering"); };
    const priority = () => { if (interested.current) return -2; const rect = node.getBoundingClientRect(); const root = scrollParent(node)?.getBoundingClientRect(); return Math.max(0, rect.top - (root?.bottom ?? innerHeight), (root?.top ?? 0) - rect.bottom); };

    // Paused: give up the slot outright rather than merely declining new ones, so
    // pausing frees whatever is already running.
    if (paused) {
      releaseSlot(id);
      setActive(false);
      setLoaded(false);
      return;
    }

    const cancelTeardown = () => {
      if (teardown.current) clearTimeout(teardown.current);
      teardown.current = null;
    };

    if (eager) {
      requestSlot(id, start, () => -1);
      return () => {
        cancelTeardown();
        releaseSlot(id);
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const near = entries[0]?.isIntersecting ?? false;
        if (near) {
          cancelTeardown();
          requestSlot(id, start, priority);
          return;
        }
        // Not torn down immediately: a small reverse scroll would otherwise unmount and
        // remount every preview it passes, which costs far more than holding them.
        waiting.delete(id);
        if (teardown.current) return;
        teardown.current = setTimeout(() => {
          teardown.current = null;
          releaseSlot(id);
          setActive(false);
          setLoaded(false);
          setStatus("queued");
        }, OFFSCREEN_GRACE_MS);
      },
      { root: scrollParent(node), rootMargin: `${ACTIVATION_MARGIN_PX}px` },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelTeardown();
      releaseSlot(id);
    };
  }, [element.id, eager, paused, observationKey]);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.data?.type !== "dp-preview-status") return;
      const next = event.data.status as PreviewStatus;
      if (!["ready", "fallback", "failed", "rendering"].includes(next)) return;
      setStatus(next); setLoaded(next !== "rendering"); recordPreview(observationKey, next);
    };
    window.addEventListener("message", receive);
    const timeout = active ? setTimeout(() => { setStatus(current => { if (current !== "rendering") return current; recordPreview(observationKey, "failed"); return "failed"; }); }, 15000) : undefined;
    return () => { window.removeEventListener("message", receive); clearTimeout(timeout); };
  }, [observationKey, active, attempt]);

  // React Bits collapses four published variants into one catalogue record. The
  // preview route needs the concrete registry item, just like the install command.
  const concreteName = element.source === "react-bits" && element.variant
    ? `${element.name}-${element.variant.language}-${element.variant.styling}`
    : element.name;
  const src = `/api/element-preview?v=5&source=${encodeURIComponent(element.source)}&name=${encodeURIComponent(concreteName)}&retry=${attempt}`;

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
      <div className="preview-status" role="status">{paused ? "Paused" : status === "fallback" ? "Fallback demo" : status}{(status === "failed" || status === "fallback") && <button onClick={() => { setLoaded(false); setStatus("rendering"); setAttempt(n => n + 1); }}>Retry</button>}</div>
    </div>
  );
}

/** Exposed for the browser check, which asserts the concurrency budget is respected. */
export function livePreviewCount(): number {
  return live.size;
}
