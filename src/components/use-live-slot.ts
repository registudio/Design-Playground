"use client";

import { useEffect, useRef, type MutableRefObject, type RefObject } from "react";
import {
  ACTIVATION_MARGIN_PX,
  IN_FLIGHT_PROTECTION_MS,
  MAX_LIVE_PREVIEWS,
  OFFSCREEN_GRACE_MS,
} from "@/elements/preview-budget";
import { createSlotQueue } from "@/elements/preview-queue";

/**
 * When a card's live document may exist, for every kind of card in the grid.
 *
 * Three things bound the cost of a grid of live documents, and they are deliberately
 * separate: proximity decides *whether* a preview is worth having, the queue decides
 * *how many* may run at once, and the grace period decides *when* one is given up.
 * Removing any of the three moves the cost somewhere else rather than saving it.
 *
 * This used to live inside RegistryPreview, which meant only registry cards were
 * budgeted. The authored originals mounted a document per card for as long as the card
 * was in the grid's window — measured at 45 at once, 11 of them WebGL scenes, on top of
 * the 12 registry previews. That starved the compositor badly enough that a full-screen
 * view opened after a long scroll painted nothing at all. Both kinds now draw from the
 * one queue, so the cap is a property of the page again.
 */

/**
 * Module-level rather than per-component: the budget is a property of the page, not of
 * any one card, and a queue each card kept its own copy of would not be a queue. The
 * rules for who gets a slot, and who gives one up, live in preview-queue.ts.
 */
const slots = createSlotQueue(MAX_LIVE_PREVIEWS);

/** Exposed for the browser check, which asserts the concurrency budget is respected. */
export function livePreviewCount(): number {
  return slots.liveCount();
}

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

/** State the caller owns, because its own document updates it. */
export interface LiveSlotWork {
  /** When this preview began work, for the in-flight protection below. */
  startedAt: MutableRefObject<number>;
  /** True once the document has reported something final. */
  settled: MutableRefObject<boolean>;
  /** The pointer is over the card: it jumps the queue. */
  interested: MutableRefObject<boolean>;
}

/**
 * Registers `host` with the shared queue and calls `start` when it is granted a slot and
 * `stop` whenever it loses one — evicted, scrolled away past the grace period, or paused.
 *
 * `slotKey` identifies the work: when it changes the card re-registers, which is how a
 * registry card switching variant starts over.
 */
export function useLiveSlot(
  host: RefObject<HTMLElement | null>,
  slotKey: string,
  { paused, eager }: { paused: boolean; eager: boolean },
  work: LiveSlotWork,
  handlers: { start: () => void; stop: () => void },
): void {
  const instance = useRef(Math.random().toString(36).slice(2));
  /** Inside the activation margin: still wanted, even while it has no slot. */
  const near = useRef(false);
  const teardown = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Read through a ref so the effect below does not re-register the card every render
  // just because the caller passed fresh closures.
  const latest = useRef(handlers);
  useEffect(() => { latest.current = handlers; });
  const { startedAt, settled, interested } = work;

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    const id = `${slotKey}:${instance.current}`;
    const start = () => { startedAt.current = Date.now(); settled.current = false; latest.current.start(); };
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
      latest.current.stop();
      // Still wanted if it comes back, so it waits again at its (now low) priority.
      return near.current;
    };
    slots.register(id, { priority, settled: () => settled.current, evict, start });

    // Paused: give up the slot outright rather than merely declining new ones, so
    // pausing frees whatever is already running.
    if (paused) {
      slots.unregister(id);
      latest.current.stop();
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
          latest.current.stop();
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
  }, [host, slotKey, eager, paused, startedAt, settled, interested]);
}
