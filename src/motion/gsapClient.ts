"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Single registration point for GSAP plugins. The preview route is a client component
 * but Next still prerenders it once on the server (it shows up as a static route), and
 * ScrollTrigger touches `window` at registration time — so registration is deferred
 * until this is actually called from a browser context (an effect, an event handler).
 */
let registered = false;

export function getGsap() {
  if (!registered && typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
    registered = true;
  }
  return gsap;
}

export { ScrollTrigger };
