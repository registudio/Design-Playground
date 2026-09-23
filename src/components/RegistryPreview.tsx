"use client";

import { useEffect, useRef, useState } from "react";
import {
  ACTIVATION_MARGIN_PX,
  IN_FLIGHT_PROTECTION_MS,
  MAX_LIVE_PREVIEWS,
  OFFSCREEN_GRACE_MS,
} from "@/elements/preview-budget";
import type { DesignElement } from "@/registry/schema";
import { previewKey, recordPreview, type PreviewStatus } from "@/elements/preview-status";
import { createSlotQueue } from "@/elements/preview-queue";

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
 * any one card, and a queue each card kept its own copy of would not be a queue. The
 * rules for who gets a slot, and who gives one up, live in preview-queue.ts.
 */
const slots = createSlotQueue(MAX_LIVE_PREVIEWS);

/**
 * Scrollers already re-balancing on scrollend. Settling is the moment the set of cards
 * on screen is final, so it is when the queue should be checked again — not only when
 * a card happens to cross an observer threshold on the way.
 */
const pumpedRoots = new WeakSet<EventTarget>();
function pumpOnSettle(root: EventTarget): void {
  if (pumpedRoots.has(root)) return;
  pumpedRoots.add(root);
  root.addEventListener("scrollend", slots.pump, { passive: true });
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
  const instance = useRef(Math.random().toString(36).slice(2));
  const interested = useRef(false);
  /** Inside the activation margin: still wanted, even while it has no slot. */
  const near = useRef(false);
  const observationKey = previewKey(element);
  const host = useRef<HTMLDivElement>(null);
  const teardown = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** When this preview began work, for the in-flight protection below. */
  const startedAt = useRef(0);
  /** True once the document has reported something final — ready, blank, fallback, failed. */
  const settled = useRef(false);

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    const id = `${element.id}:${instance.current}`;
    const start = () => { startedAt.current = Date.now(); settled.current = false; setActive(true); setStatus("rendering"); recordPreview(observationKey, "rendering"); };
    const root = scrollParent(node);
    pumpOnSettle(root ?? window);
    const priority = () => {
      if (interested.current) return -2;
      if (eager) return -1;
      const rect = node.getBoundingClientRect();
      const box = root?.getBoundingClientRect();
      // Measured to the card's centre line so a card half on screen counts as on screen.
      const middle = (rect.top + rect.bottom) / 2;
      return Math.max(0, middle - (box?.bottom ?? innerHeight), (box?.top ?? 0) - middle);
    };
    const evict = () => {
      if (teardown.current) clearTimeout(teardown.current);
      teardown.current = null;
      setActive(false);
      setLoaded(false);
      setStatus("queued");
      // Still wanted if it comes back, so it waits again at its (now low) priority.
      return near.current;
    };
    slots.register(id, { priority, settled: () => settled.current, evict, start });

    // Paused: give up the slot outright rather than merely declining new ones, so
    // pausing frees whatever is already running.
    if (paused) {
      slots.unregister(id);
      setActive(false);
      setLoaded(false);
      return;
    }

    const cancelTeardown = () => {
      if (teardown.current) clearTimeout(teardown.current);
      teardown.current = null;
    };

    if (eager) {
      slots.request(id);
      return () => {
        cancelTeardown();
        slots.unregister(id);
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        near.current = entries[0]?.isIntersecting ?? false;
        if (near.current) {
          cancelTeardown();
          slots.request(id);
          return;
        }
        // Not torn down immediately: a small reverse scroll would otherwise unmount and
        // remount every preview it passes, which costs far more than holding them.
        if (slots.isWaiting(id)) slots.release(id);
        if (teardown.current) return;
        // Work in flight is protected: tearing a compile down at the grace period and
        // restarting it on the way back is how a card ends up loading forever.
        const inFlight = !settled.current && startedAt.current > 0;
        const elapsed = Date.now() - startedAt.current;
        const delay = inFlight
          ? Math.max(OFFSCREEN_GRACE_MS, IN_FLIGHT_PROTECTION_MS - elapsed)
          : OFFSCREEN_GRACE_MS;
        teardown.current = setTimeout(() => {
          teardown.current = null;
          slots.release(id);
          setActive(false);
          setLoaded(false);
          setStatus("queued");
        }, delay);
      },
      { root, rootMargin: `${ACTIVATION_MARGIN_PX}px` },
    );

    // A card already queued asks again once it is actually on screen, since reaching the
    // activation margin is not the same as being looked at — and only a card on screen
    // may take a slot from another.
    const onScreen = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || slots.isLive(id)) return;
        slots.request(id);
      },
      { root, threshold: 0.5 },
    );

    observer.observe(node);
    onScreen.observe(node);
    return () => {
      observer.disconnect();
      onScreen.disconnect();
      cancelTeardown();
      slots.unregister(id);
    };
  }, [element.id, eager, paused, observationKey]);

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

  // React Bits collapses four published variants into one catalogue record. The
  // preview route needs the concrete registry item, just like the install command.
  const concreteName = element.source === "react-bits" && element.variant
    ? `${element.name}-${element.variant.language}-${element.variant.styling}`
    : element.name;
  const src = `/api/element-preview?v=6&source=${encodeURIComponent(element.source)}&name=${encodeURIComponent(concreteName)}&retry=${attempt}`;

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

/** Exposed for the browser check, which asserts the concurrency budget is respected. */
export function livePreviewCount(): number {
  return slots.liveCount();
}
