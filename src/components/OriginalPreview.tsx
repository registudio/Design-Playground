"use client";

import { useMemo, useRef, useState } from "react";
import { elementDocument } from "@/elements/catalogue";
import { useLiveSlot } from "./use-live-slot";

/**
 * A live preview of one authored original.
 *
 * These are cheap next to a compiled registry component, which is why they once had no
 * budget at all — every card in the grid's window kept its document running. Cheap per
 * card is not cheap at forty-five, and eleven of those were WebGL scenes, each holding a
 * context and a drawing buffer. They now take a slot from the same queue as the registry
 * previews (use-live-slot.ts), so what runs at once is capped for the page as a whole.
 *
 * Until it has a slot the card shows the same placeholder the registry cards do. Once it
 * has one, the frame shows straight away rather than on `load`: these documents are
 * static markup that paints on its first frame, and `load` waits for every script — for
 * a Vanta card that is a 665 KB bundle, which kept a finished card hidden behind the
 * placeholder for over four seconds.
 */
export function OriginalPreview({
  id,
  title,
  paused,
  eager,
  onResume,
}: {
  id: string;
  title: string;
  /** Paused by the viewer, or because a full-screen view is open over the grid. */
  paused: boolean;
  /** Set when a narrow search has already decided this is one of a handful of results. */
  eager: boolean;
  onResume: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const startedAt = useRef(0);
  const settled = useRef(false);
  const interested = useRef(false);
  const document = useMemo(() => elementDocument(id), [id]);

  useLiveSlot(host, id, { paused, eager }, { startedAt, settled, interested }, {
    start: () => setActive(true),
    stop: () => setActive(false),
  });

  return (
    <div
      className="original-canvas"
      ref={host}
      data-active={active ? "yes" : "no"}
      onPointerEnter={() => { interested.current = true; }}
      onPointerLeave={() => { interested.current = false; }}
    >
      {paused
        ? <button className="paused-demo" onClick={onResume}>▶<span>{title}</span></button>
        : <>
            {active && (
              <iframe
                title={`${title} live preview`}
                sandbox="allow-scripts"
                srcDoc={document}
                // Settled marks the end of in-flight protection, so it does wait for load.
                onLoad={() => { settled.current = true; }}
              />
            )}
            {!active && (
              <div className="registry-placeholder" aria-label="Preparing visual preview">
                <div className="placeholder-orbit"><i/><i/><i/></div>
                <div className="placeholder-bars"><i/><i/><i/><i/><i/></div>
              </div>
            )}
          </>}
    </div>
  );
}
