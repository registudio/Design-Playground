"use client";

import { useState } from "react";

/**
 * A grid of motion options, each showing what it actually does.
 *
 * A dropdown reading "blur-in / mask-reveal / scale" asks the designer to imagine the
 * result and then check by switching tabs to the preview. These tiles run the real
 * thing — a miniature of the animation, replayed on hover and on selection — so the
 * choice is made by looking rather than by guessing.
 *
 * The demos are CSS-only and keyed by recipe id. They deliberately do not import Motion
 * or GSAP: this is an illustration of the character of a movement, at a size where the
 * engine makes no observable difference, and pulling two animation runtimes into the
 * chrome to animate a 90px tile would cost far more than it explains. The engine each
 * recipe really uses is named on the tile.
 */
export function MotionChoice({
  label,
  options,
  value,
  onChange,
  describe,
}: {
  label: string;
  options: Array<{ id: string; label: string; engine: string }>;
  value: string;
  onChange: (id: string) => void;
  describe?: (id: string) => string | undefined;
}) {
  // Bumping a key remounts the demo, which is what restarts a CSS animation. Scoped per
  // tile so replaying one does not restart the whole grid.
  const [replay, setReplay] = useState<Record<string, number>>({});
  const bump = (id: string) => setReplay((r) => ({ ...r, [id]: (r[id] ?? 0) + 1 }));

  return (
    <div className="motion-choice">
      <span className="motion-choice-label">{label}</span>
      <div className="motion-choice-grid">
        {options.map((option) => {
          const active = option.id === value;
          const demo = option.id.split(".").pop()!;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              className={`motion-tile ${active ? "active" : ""}`}
              onMouseEnter={() => bump(option.id)}
              onFocus={() => bump(option.id)}
              onClick={() => { onChange(option.id); bump(option.id); }}
            >
              <span className="motion-stage" key={replay[option.id] ?? 0} data-demo={demo}>
                <i /><i /><i />
              </span>
              <strong>{option.label}</strong>
              <small>{option.engine === "css" ? "CSS" : option.engine === "motion" ? "Motion" : "GSAP"}</small>
              {describe?.(option.id) && <em>{describe(option.id)}</em>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
