"use client";

import { useEffect, useRef } from "react";
// animateMini has a single, non-overloaded signature for (element, keyframes, options),
// which avoids TS picking the wrong overload of the general `animate` export for a
// plain HTMLElement ref.
import { animateMini as motionAnimate } from "motion";
import type { RecipeBinding } from "@/schema/recipe";
import type { MotionTokens } from "@/schema/tokens";
import { getGsap } from "./gsapClient";
import { usePrefersReducedMotion } from "./reduced";

/**
 * The motion runtime.
 *
 * §12's recipes were, until now, pure data — selecting "card lift" or "fade up"
 * changed nothing visible. This module is what actually plays them. The logic is
 * split into plain functions (`runEntrance`, `observeEntrance`, `attachHoverBehavior`)
 * so it can be driven two ways: a per-element hook for the Components gallery's
 * individual swatches, and a single bulk pass (`useAutoAnimate`) that wires an entire
 * Sample Page at once without needing every element rewritten into a wrapper
 * component.
 *
 * Each recipe's declared engine (§12.6) decides which library drives it: Motion for
 * simple state-driven transitions and hovers, GSAP for choreographed and
 * scroll-triggered effects — the same assignment the export validation checks.
 */

const GSAP_EASE = { standard: "power2.inOut", enter: "power2.out", exit: "power2.in" } as const;
const MOTION_EASE = {
  standard: [0.4, 0, 0.2, 1] as [number, number, number, number],
  enter: [0, 0, 0.2, 1] as [number, number, number, number],
  exit: [0.4, 0, 1, 1] as [number, number, number, number],
};

const secs = (ms: number) => ms / 1000;

// ---------------------------------------------------------------------------
// Entrance
// ---------------------------------------------------------------------------

export interface EntranceOptions {
  duration: number;
  delay: number;
  distance: number;
  instant: boolean;
}

export function resolveEntranceOptions(
  binding: RecipeBinding,
  tokens: MotionTokens,
  delayMs: number,
  reduced: boolean,
): EntranceOptions {
  const fallback = reduced && binding.reducedMotion !== "none";
  const instant = fallback && binding.reducedMotion === "instant";
  const fadeOnly = fallback && binding.reducedMotion === "fade-only";
  return {
    duration: instant ? 0 : secs(binding.overrides?.duration ?? tokens.duration.base),
    delay: instant ? 0 : secs(binding.overrides?.delay ?? delayMs),
    distance: fadeOnly || instant ? 0 : (binding.overrides?.distance ?? tokens.distance),
    instant,
  };
}

/** Plays an entrance recipe on `el` immediately. Called once the element is in view. */
export function runEntrance(el: HTMLElement, binding: RecipeBinding, opts: EntranceOptions): void {
  const { duration, delay, distance, instant } = opts;

  if (instant) {
    el.style.opacity = "1";
    el.style.transform = "none";
    return;
  }

  // The choreographed text recipe rewrites the element's innerHTML into per-word
  // spans, which is only safe on a plain text leaf (a heading, a paragraph with no
  // nested markup). The entrance recipe is global - every data-animate="entrance"
  // element uses it, including structural containers like the hero content block
  // (heading + copy + buttons) or a whole feature card (heading + body). Splitting
  // THOSE would flatten their nested elements into plain text and destroy the
  // markup. Those fall back to the ordinary fade+y treatment instead.
  if (binding.recipe === "animation.text.mask-reveal" && el.children.length === 0) {
    runTextMaskReveal(el, Math.max(duration, 0.5), delay);
    return;
  }

  const withY = binding.properties.includes("y") ? distance : 0;
  const withScale = binding.properties.includes("scale") ? 0.94 : 1;
  const withBlur = binding.properties.includes("filter");

  if (binding.engine === "gsap") {
    const gsap = getGsap();
    gsap.fromTo(
      el,
      { opacity: 0, y: withY, scale: withScale },
      { opacity: 1, y: 0, scale: 1, duration, delay, ease: GSAP_EASE.enter, clearProps: "transform" },
    );
    return;
  }

  const keyframes: Record<string, Array<number | string>> = { opacity: [0, 1] };
  if (withY) keyframes.y = [withY, 0];
  if (withScale !== 1) keyframes.scale = [withScale, 1];
  if (withBlur) keyframes.filter = ["blur(8px)", "blur(0px)"];
  motionAnimate(el, keyframes, { duration, delay, ease: MOTION_EASE.enter });
}

/** Splits text into per-word spans and reveals them with a clipped upward stagger. */
function runTextMaskReveal(el: HTMLElement, duration: number, delay: number) {
  const words = (el.textContent ?? "").split(/(\s+)/);
  el.innerHTML = words
    .map((word) =>
      word.trim()
        ? `<span style="display:inline-block;overflow:hidden;vertical-align:top"><span class="dp-reveal-word" style="display:inline-block">${escapeHtml(word)}</span></span>`
        : word,
    )
    .join("");

  getGsap().fromTo(
    el.querySelectorAll<HTMLElement>(".dp-reveal-word"),
    { yPercent: 110, opacity: 0 },
    { yPercent: 0, opacity: 1, duration, delay, ease: "power3.out", stagger: 0.035 },
  );
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/** Watches `el`; runs the entrance once, the first time it's ≥15% in view. */
export function observeEntrance(
  el: HTMLElement,
  binding: RecipeBinding,
  tokens: MotionTokens,
  delayMs: number,
  reduced: boolean,
): () => void {
  el.style.opacity = "0";
  const opts = resolveEntranceOptions(binding, tokens, delayMs, reduced);
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        io.disconnect();
        runEntrance(el, binding, opts);
      }
    },
    { threshold: 0.15 },
  );
  io.observe(el);
  return () => io.disconnect();
}

/** Per-element entrance hook, for a single known target (e.g. one gallery swatch). */
export function useEntrance<T extends HTMLElement>(
  binding: RecipeBinding | undefined,
  tokens: MotionTokens,
  delayMs = 0,
) {
  const ref = useRef<T | null>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || !binding || binding.engine === "css" || binding.recipe.endsWith(".none")) return;
    return observeEntrance(el, binding, tokens, delayMs, reduced);
  }, [binding, tokens, reduced, delayMs]);

  return ref;
}

// ---------------------------------------------------------------------------
// Hover interaction
// ---------------------------------------------------------------------------

/**
 * Attaches pointer-driven hover behaviour for a card/button interaction recipe
 * (§12.3) and returns a cleanup function. Recipes with no JS-driven counterpart
 * (border-reveal, background-fill, glow, underline-reveal, icon-shift) are left
 * alone here — those are CSS transitions in preview.css, keyed off a `data-hover`
 * attribute this function sets, so they still animate without a JS tween.
 */
export function attachHoverBehavior(
  el: HTMLElement,
  binding: RecipeBinding | undefined,
  tokens: MotionTokens,
  reduced: boolean,
): () => void {
  if (!binding || binding.recipe.endsWith(".none")) return () => {};

  const cssKey = binding.recipe.split(".").pop();
  if (cssKey) el.dataset.hover = cssKey;

  if (reduced || binding.engine === "css") return () => {};

  const duration = secs(binding.overrides?.duration ?? tokens.duration.fast);
  const distance = binding.overrides?.distance ?? tokens.distance * 0.5;
  const cleanupFns: Array<() => void> = [];

  const attach = (
    enter: (e: PointerEvent) => void,
    leave: (e: PointerEvent) => void,
    move?: (e: PointerEvent) => void,
  ) => {
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    if (move) el.addEventListener("pointermove", move);
    cleanupFns.push(() => {
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
      if (move) el.removeEventListener("pointermove", move);
    });
  };

  switch (binding.recipe) {
    case "animation.card.lift": {
      const lift = Math.max(4, distance * 0.35);
      attach(
        () => tween(el, binding.engine, { y: -lift, boxShadow: "var(--dp-shadow-lg)" as unknown as number }, duration),
        () => tween(el, binding.engine, { y: 0, boxShadow: "var(--dp-shadow-none)" as unknown as number }, duration),
      );
      break;
    }
    case "animation.button.scale": {
      attach(
        () => tween(el, binding.engine, { scale: 1.045 }, duration),
        () => tween(el, binding.engine, { scale: 1 }, duration),
      );
      break;
    }
    case "animation.button.arrow-shift": {
      // The default button recipe: content nudges right on hover, as if trailing an
      // arrow. Works without requiring an actual arrow glyph in the markup.
      const shift = Math.max(3, distance * 0.15);
      attach(
        () => tween(el, binding.engine, { x: shift }, duration),
        () => tween(el, binding.engine, { x: 0 }, duration),
      );
      break;
    }
    case "animation.button.magnetic": {
      const strength = 0.4;
      const move = (e: PointerEvent) => {
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) * strength;
        const y = (e.clientY - rect.top - rect.height / 2) * strength;
        tween(el, binding.engine, { x, y }, 0.25);
      };
      attach(() => {}, () => tween(el, binding.engine, { x: 0, y: 0 }, 0.4), move);
      break;
    }
    case "animation.card.tilt": {
      // Perspective travels with every tween rather than a one-off style write,
      // since it needs to be part of the same transform GSAP/Motion is composing.
      const move = (e: PointerEvent) => {
        const rect = el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        tween(el, binding.engine, { transformPerspective: 800, rotateX: py * -9, rotateY: px * 9 }, 0.3);
      };
      attach(
        () => {},
        () => tween(el, binding.engine, { transformPerspective: 800, rotateX: 0, rotateY: 0 }, 0.4),
        move,
      );
      break;
    }
    case "animation.card.spotlight": {
      const move = (e: PointerEvent) => {
        const rect = el.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        el.style.backgroundImage =
          `radial-gradient(circle at ${x}% ${y}%, color-mix(in oklab, var(--dp-color-primary) 16%, transparent), transparent 60%)`;
      };
      attach(() => {}, () => { el.style.backgroundImage = ""; }, move);
      cleanupFns.push(() => { el.style.backgroundImage = ""; });
      break;
    }
    case "animation.card.image-zoom": {
      const image = el.querySelector<HTMLElement>(".dp-image, .dp-hero-media");
      if (!image) break;
      attach(
        () => tween(image, binding.engine, { scale: 1.08 }, duration),
        () => tween(image, binding.engine, { scale: 1 }, duration),
      );
      break;
    }
    default:
      break;
  }

  return () => cleanupFns.forEach((fn) => fn());
}

/** Keys this function treats as transform components rather than literal CSS properties. */
const TRANSFORM_KEYS = ["x", "y", "scale", "rotateX", "rotateY", "transformPerspective"] as const;

function tween(
  el: HTMLElement,
  engine: RecipeBinding["engine"],
  vars: Record<string, number | string>,
  duration: number,
) {
  if (engine === "gsap") {
    // GSAP's CSSPlugin genuinely supports these as shorthand properties and composes
    // them into `transform` itself - no manual string-building needed here.
    getGsap().to(el, { ...vars, duration, ease: GSAP_EASE.standard, overwrite: "auto" });
    return;
  }

  // Motion's vanilla animate() does not compose these the same way (see runEntrance's
  // comment above) - build one explicit `transform` string and animate that instead.
  const style: Record<string, string | number> = {};
  const parts: string[] = [];
  if (vars.transformPerspective !== undefined) parts.push(`perspective(${vars.transformPerspective}px)`);
  if (vars.x !== undefined || vars.y !== undefined) parts.push(`translate(${vars.x ?? 0}px, ${vars.y ?? 0}px)`);
  if (vars.scale !== undefined) parts.push(`scale(${vars.scale})`);
  if (vars.rotateX !== undefined) parts.push(`rotateX(${vars.rotateX}deg)`);
  if (vars.rotateY !== undefined) parts.push(`rotateY(${vars.rotateY}deg)`);
  if (parts.length) style.transform = parts.join(" ");

  for (const [key, value] of Object.entries(vars)) {
    if (!(TRANSFORM_KEYS as readonly string[]).includes(key)) style[key] = value;
  }

  motionAnimate(el, style, { duration, ease: MOTION_EASE.standard });
}

/** Per-element hover hook, for a single known target (e.g. one gallery swatch). */
export function useHoverInteraction<T extends HTMLElement>(
  binding: RecipeBinding | undefined,
  tokens: MotionTokens,
) {
  const ref = useRef<T | null>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return attachHoverBehavior(el, binding, tokens, reduced);
  }, [binding, tokens, reduced]);

  return ref;
}
