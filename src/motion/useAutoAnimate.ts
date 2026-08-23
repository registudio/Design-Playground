"use client";

import { useEffect, type RefObject } from "react";
import type { DesignProject } from "@/schema/project";
import { attachHoverBehavior, observeEntrance } from "./hooks";
import { getGsap } from "./gsapClient";
import { usePrefersReducedMotion } from "./reduced";

/**
 * Wires the whole Sample Page in one pass instead of converting every element into a
 * motion-aware wrapper component. Elements opt in by marker rather than by type:
 *
 *   [data-animate="entrance"]  the selected entrance recipe, staggered by DOM order
 *   [data-animate="nav"]       a lighter always-on fade-in (already visible on load,
 *                              so it shouldn't wait to scroll into view)
 *   .dp-btn                    the selected button-hover recipe
 *   .dp-card                   the selected card-hover recipe
 *
 * Re-runs whenever the recipe changes, so switching "card lift" to "card tilt" in the
 * Animations panel takes effect immediately without a page reload.
 */
export function useAutoAnimate(rootRef: RefObject<HTMLElement | null>, project: DesignProject) {
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const cleanups: Array<() => void> = [];
    const { motion } = project.recipe;
    const tokens = project.tokens.motion;

    const entranceBinding = motion.entrance.default;
    if (entranceBinding) {
      // Grouped by immediate parent, not global document order: the four feature
      // cards should stagger against each other, but the hero content and the CTA
      // heading — which appear in different viewports at different scroll times —
      // must not accumulate a global index and inherit a growing, pointless delay.
      const groups = new Map<Element | null, HTMLElement[]>();
      root.querySelectorAll<HTMLElement>('[data-animate="entrance"]').forEach((el) => {
        const key = el.parentElement;
        const list = groups.get(key) ?? [];
        list.push(el);
        groups.set(key, list);
      });
      for (const siblings of groups.values()) {
        siblings.forEach((el, i) => {
          cleanups.push(observeEntrance(el, entranceBinding, tokens, i * tokens.stagger, reduced));
        });
      }
    }

    if (!reduced) {
      const navEls = root.querySelectorAll<HTMLElement>('[data-animate="nav"]');
      const gsap = getGsap();
      navEls.forEach((el) => {
        gsap.fromTo(el, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" });
      });
    }

    root.querySelectorAll<HTMLElement>(".dp-btn").forEach((el) => {
      cleanups.push(attachHoverBehavior(el, motion.interaction.button, tokens, reduced));
    });
    root.querySelectorAll<HTMLElement>(".dp-card").forEach((el) => {
      cleanups.push(attachHoverBehavior(el, motion.interaction.card, tokens, reduced));
    });

    return () => cleanups.forEach((fn) => fn());
    // Re-running on every project change is intentional and cheap here (a handful of
    // DOM nodes) — it's what makes an Animations-panel change visible immediately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootRef, project, reduced]);
}
