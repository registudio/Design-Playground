"use client";

import { useEffect, useState } from "react";

/**
 * The "how does this thing work" panel (§9's less-cluttered principle, paid for).
 *
 * Several of the most useful affordances here are invisible until someone tells you:
 * the dot beside a control is also its reset, elements in the preview are editable in
 * place, panel headings fold, and the project title is the way back out. Each is a good
 * interaction and none of them announces itself, which is exactly the kind of thing a
 * first-time user never discovers and an occasional user forgets. Cheaper to explain in
 * one place than to litter the chrome with hints.
 */

const SHORTCUTS: Array<[string, string]> = [
  ["⌘K", "Search presets, components and actions"],
  ["⌘Z", "Undo"],
  ["⇧⌘Z", "Redo"],
  ["?", "Show this help"],
  ["Esc", "Close this, the search bar, or a menu"],
];

const TIPS: Array<[string, string]> = [
  [
    "Edit straight from the preview",
    "Click a button, card or section in the preview to change its style without hunting for the matching control. In the Element Gallery every swatch applies itself on click.",
  ],
  [
    "The dot beside a control is its history",
    "Hover it to see where the value came from — a default, your logo, or a preset. Once you set it by hand the dot turns blue, and clicking it puts the value back.",
  ],
  [
    "“N edited” tracks everything you changed",
    "It appears in the header once you've overridden anything, counts your hand-set values, and reverts them all in one step you can undo.",
  ],
  [
    "Advanced shows the real numbers",
    "Turn it on to reach layout measurements, border weights, motion timing, and per-step control over each size in the type scale.",
  ],
  [
    "Fold away what you're not using",
    "Click any panel heading to collapse it. Your layout, theme and open project are remembered the next time you come back.",
  ],
  [
    "Snapshots outlast undo",
    "Undo is a straight line you can lose. A named snapshot is a checkpoint you can return to at any point, and it travels inside the exported project file.",
  ],
];

export const HELP_OPEN_EVENT = "dp:open-help";

export function openHelp() {
  window.dispatchEvent(new Event(HELP_OPEN_EVENT));
}

export function HelpOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      // "?" is an ordinary character, so it must never steal a keystroke from a field.
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable === true;
      if (event.key === "?" && !typing) {
        event.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpenEvent = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(HELP_OPEN_EVENT, onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(HELP_OPEN_EVENT, onOpenEvent);
    };
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 pt-16"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts and tips"
        className="flex max-h-[76vh] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-chrome-border bg-chrome-panel shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-baseline justify-between border-b border-chrome-border px-5 py-4">
          <h2 className="text-[15px] font-semibold">Getting around</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[12px] text-chrome-muted hover:text-chrome-text"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-chrome-muted">
            Shortcuts
          </h3>
          <div className="mt-2.5 flex flex-col gap-1.5">
            {SHORTCUTS.map(([keys, description]) => (
              <div key={keys} className="flex items-baseline gap-3">
                <kbd className="w-16 shrink-0 rounded border border-chrome-border px-1.5 py-0.5 text-center font-mono text-[11px] text-chrome-text">
                  {keys}
                </kbd>
                <span className="text-[12px] text-chrome-muted">{description}</span>
              </div>
            ))}
          </div>

          <h3 className="mt-6 text-[11px] font-semibold uppercase tracking-[0.08em] text-chrome-muted">
            Worth knowing
          </h3>
          <div className="mt-2.5 flex flex-col gap-3.5">
            {TIPS.map(([title, body]) => (
              <div key={title}>
                <p className="text-[13px] font-medium text-chrome-text">{title}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-chrome-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
