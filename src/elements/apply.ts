import type { CSSProperties } from "react";
import { ELEMENT_SLOTS, type ElementChoices, type ElementSlotId } from "@/schema/elements";
import { defaultParams, elementById, type ElementDefinition } from "./catalogue";

/**
 * Turns element selections into the two things the preview DOM actually needs: data
 * attributes and CSS custom properties.
 *
 * Kept as pure functions with no DOM access so the mapping is unit-testable and so the
 * same values can be produced for the live preview, the static Sample Page export and
 * any future server render without three copies of this logic drifting apart.
 *
 * The data-attribute approach mirrors how component variants already reach the preview
 * (`[data-button="outline"] .dp-btn-solid`): one attribute on the root, CSS does the
 * rest. That keeps element styling entirely declarative and means selecting one never
 * remounts the preview — the same property that makes token edits feel instant.
 */

/** `heroBackground` -> `data-el-hero-background`. */
export function slotAttribute(slot: ElementSlotId): string {
  return `data-el-${slot.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
}

/** `heroBackground` + `speed` -> `--el-hero-background-speed`. */
export function paramVariable(slot: ElementSlotId, key: string): string {
  return `--el-${slot.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}-${key}`;
}

export interface AppliedElements {
  /** Spread onto the preview root element. */
  attributes: Record<string, string>;
  /** Spread into the preview root's `style`. */
  style: CSSProperties;
  /** The resolved definitions, for the runtime to decide what to mount. */
  active: Array<{ slot: ElementSlotId; element: ElementDefinition }>;
}

export function applyElements(choices: ElementChoices): AppliedElements {
  const attributes: Record<string, string> = {};
  const style: Record<string, string | number> = {};
  const active: AppliedElements["active"] = [];

  for (const { id: slot } of ELEMENT_SLOTS) {
    const selected = choices.slots[slot];
    if (!selected || selected === "none") continue;

    const element = elementById(selected);
    // A slot pointing at an id the catalogue no longer has contributes nothing rather
    // than emitting a dangling attribute some stylesheet might half-match.
    if (!element) continue;

    attributes[slotAttribute(slot)] = selected;
    active.push({ slot, element });

    // Saved params win; anything the element gained since the project was saved falls
    // back to the catalogue default, so a new param never lands as `undefined` in CSS.
    const saved = choices.params[slot] ?? {};
    const params = { ...defaultParams(selected), ...saved };
    for (const [key, value] of Object.entries(params)) {
      style[paramVariable(slot, key)] = typeof value === "boolean" ? (value ? 1 : 0) : value;
    }
  }

  return { attributes, style: style as CSSProperties, active };
}

/** True when any active element needs pointer position tracked. */
export function needsPointerTracking(active: AppliedElements["active"]): boolean {
  return active.some(({ element }) => POINTER_DRIVEN.has(element.id));
}

/** True when any active element needs scroll progress tracked. */
export function needsScrollTracking(active: AppliedElements["active"]): boolean {
  return active.some(({ element }) => SCROLL_DRIVEN.has(element.id));
}

/**
 * Elements whose effect is a function of pointer position.
 *
 * Listed explicitly rather than inferred from category: `cursor.*` all qualify, but so
 * do a couple of backgrounds and hovers, and a background that merely drifts does not.
 * One rAF-throttled listener serves every one of them.
 */
const POINTER_DRIVEN = new Set([
  "bg.spotlight",
  "bg.dot-matrix",
  "cursor.trail",
  "cursor.spotlight",
  "cursor.blend",
  "hover.magnetic",
  "hover.tilt",
]);

const SCROLL_DRIVEN = new Set([
  "scroll.progress",
  "scroll.parallax",
  "scroll.pinned",
  "scroll.scrub-text",
]);

/** The element in a slot, or undefined when empty or unknown. */
export function elementInSlot(
  choices: ElementChoices,
  slot: ElementSlotId,
): ElementDefinition | undefined {
  const id = choices.slots[slot];
  return id && id !== "none" ? elementById(id) : undefined;
}
