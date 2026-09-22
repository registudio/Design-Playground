"use client";

import { useEffect, useRef, useState } from "react";
import {
  ACTIVATION_MARGIN_PX,
  MAX_LIVE_PREVIEWS,
  OFFSCREEN_GRACE_MS,
} from "@/elements/preview-budget";
import type { DesignElement } from "@/registry/schema";
import { sourceById } from "@/registry/sources";
import { describeElement } from "@/elements/descriptions";

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
const waiting = new Map<string, () => void>();

function requestSlot(id: string, start: () => void): void {
  if (live.has(id)) return;
  if (live.size < MAX_LIVE_PREVIEWS) {
    live.add(id);
    start();
    return;
  }
  // Keyed, so re-entering the viewport twice cannot queue the same card twice.
  waiting.set(id, start);
}

function releaseSlot(id: string): void {
  waiting.delete(id);
  if (!live.delete(id)) return;
  // FIFO: the card waiting longest is the one nearest to being scrolled past, so
  // serving it first is also what keeps the grid feeling continuous.
  const next = waiting.entries().next();
  if (next.done) return;
  const [nextId, start] = next.value;
  waiting.delete(nextId);
  live.add(nextId);
  start();
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
  element: DesignElement;
  eager?: boolean;
  paused?: boolean;
}) {
  const [active, setActive] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const teardown = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    const id = element.id;

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
      requestSlot(id, () => setActive(true));
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
          requestSlot(id, () => setActive(true));
          return;
        }
        // Not torn down immediately: a small reverse scroll would otherwise unmount and
        // remount every preview it passes, which costs far more than holding them.
        if (teardown.current) return;
        teardown.current = setTimeout(() => {
          teardown.current = null;
          releaseSlot(id);
          setActive(false);
          setLoaded(false);
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
  }, [element.id, eager, paused]);

  const source = sourceById(element.source);
  const src = `/api/element-preview?source=${encodeURIComponent(element.source)}&name=${encodeURIComponent(element.name)}`;

  return (
    <div className="registry-canvas" ref={host} data-active={active ? "yes" : "no"}>
      {active && (
        // sandbox without allow-same-origin: the frame gets no access to this origin,
        // no forms, no popups and no top-level navigation.
        <iframe
          title={`${element.title} preview`}
          sandbox="allow-scripts"
          src={src}
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />
      )}
      {!loaded && (
        <div className="registry-placeholder">
          <span className="registry-glyph">↗</span>
          <p>{describeElement(element)}</p>
          <div className="registry-deps">
            {element.npmDependencies.slice(0, 3).map((dependency) => (
              <i key={dependency}>{dependency}</i>
            ))}
            {element.npmDependencies.length > 3 && <i>+{element.npmDependencies.length - 3}</i>}
          </div>
          <small>{paused ? "Previews paused" : active ? "Compiling preview…" : "Preview loads as you scroll"}</small>
          {source && (
            <a
              href={source.homepage}
              target="_blank"
              rel="noreferrer noopener"
              onClick={(event) => event.stopPropagation()}
            >
              See it on {source.label} ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/** Exposed for the browser check, which asserts the concurrency budget is respected. */
export function livePreviewCount(): number {
  return live.size;
}
