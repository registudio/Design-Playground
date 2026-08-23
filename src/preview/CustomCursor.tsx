"use client";

import { useEffect, useRef } from "react";

/**
 * Custom cursor (§11.1).
 *
 * Position is written straight to the element's transform rather than through React
 * state — a pointermove handler that calls setState would re-render the whole preview
 * on every mouse movement. The visual treatment itself lives in CSS, keyed off the
 * `data-cursor` attribute on the page root.
 *
 * Rendering is skipped entirely on touch-primary devices so native behaviour is
 * preserved, which the build spec requires.
 */
export function CustomCursor({ variant }: { variant: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (variant === "default") return;
    // Matches the CSS guard, so the element never appears where it cannot be moved.
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const node = ref.current;
    if (!node) return;

    const onMove = (event: PointerEvent) => {
      node.style.transform = `translate(${event.clientX}px, ${event.clientY}px) translate(-50%, -50%)`;
    };

    // Interactive elements enlarge or reveal the cursor, per the variant's CSS.
    const onOver = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      const interactive = target?.closest("a, button, input, textarea, [role='button']");
      node.dataset.hovering = interactive ? "true" : "false";
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
    };
  }, [variant]);

  if (variant === "default") return null;
  return (
    <div ref={ref} className="dp-cursor" aria-hidden="true">
      {variant === "label" ? "View" : null}
    </div>
  );
}
