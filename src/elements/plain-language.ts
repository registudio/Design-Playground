import { ELEMENTS, INTERACTION_ONLY } from "./catalogue";
import { engineFor } from "./extended-catalogue";
import type { BrowseCategory } from "./taxonomy";

/**
 * What an effect does, said for the client rather than the developer.
 *
 * The review page is where a client signs off, and a client does not know what
 * `shader-drift` means, or that a WebGL scene needs a capable device, or that a visitor
 * who has asked for less motion will see something different. Each effect on the page
 * now carries three plain sentences: what it is, how it behaves, and who sees what.
 *
 * Behaviour is said per kind of effect rather than per effect: the kinds behave alike,
 * and a line per effect would be a hundred sentences to keep true by hand.
 */
const BEHAVIOUR: Record<BrowseCategory, string> = {
  "Text animations": "The words animate as they come into view.",
  "Backgrounds": "It moves slowly on its own, behind whatever sits on top of it.",
  "Hover effects": "It responds when a visitor moves their mouse over it; on phones, to a tap.",
  "Scroll effects": "It moves as the visitor scrolls down the page.",
  "Cursor effects": "It follows the visitor's mouse. Phones and tablets have no cursor, so there it stays still.",
  "Carousels": "Visitors click, swipe or use the arrow keys to move between slides.",
  "Galleries & media": "Visitors browse through the images or media in it.",
  "Layout blocks": "It arranges content on the page; any movement is part of how it reveals that content.",
  "Buttons & inputs": "It is a control visitors click or type into, with a little motion as feedback.",
  "Loaders & feedback": "It shows visitors that something is loading or has just happened.",
  "Charts & data viz": "It presents numbers as a chart, drawn in when it appears.",
  "Signature effects": "It is a standout moment, best used once on a page.",
  "Hooks & utilities": "It is behind-the-scenes code with nothing to see by itself.",
};

export interface PlainSummary {
  /** What it is. */
  what: string;
  /** How it behaves for a visitor. */
  behaviour: string;
  /** Who sees what: reduced motion, and devices without WebGL. */
  access: string;
}

export function plainSummary(id: string): PlainSummary | null {
  const element = ELEMENTS.find(item => item.id === id);
  if (!element) return null;
  const engine = engineFor(id);
  const webgl = engine?.id === "vanta" || engine?.id === "shader";
  const motion = INTERACTION_ONLY.test(id)
    ? "Visitors who ask their device for less motion can still use it; only the decorative movement stops."
    : "Visitors who ask their device for less motion see a still version.";
  return {
    what: element.description,
    behaviour: BEHAVIOUR[element.category as BrowseCategory] ?? "",
    access: webgl ? `${motion} It draws with the device's graphics chip (WebGL); where that is unavailable, a still version shows instead.` : motion,
  };
}

/** The same behaviour line for a registry component, from its browse category. */
export const behaviourFor = (category: BrowseCategory): string => BEHAVIOUR[category];
