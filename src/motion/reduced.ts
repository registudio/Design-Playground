"use client";

import { useEffect, useState } from "react";

/**
 * §12.7 — every recipe must degrade under prefers-reduced-motion. This is the runtime
 * half of that requirement: the CSS tokens already collapse duration/distance to near
 * zero, but a JS-driven tween (GSAP, Motion) doesn't read CSS custom properties, so it
 * needs to check the media query itself.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}
