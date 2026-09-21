import { z } from "zod";

/**
 * Elements — the animation, scroll and interaction layer of site.recipe.json.
 *
 * Components answer "what shape is this section". Elements answer "how does it behave":
 * how a heading arrives, what moves behind it, what the page does as you scroll, what
 * the cursor is. That is a genuinely separate axis — the same hero variant reads as a
 * bank or a record label depending entirely on the elements attached to it — so it gets
 * its own section in the recipe rather than being folded into `components`.
 *
 * **Slots, not a free-form list.** §15.2's shape (`"hero": "split"`) and §15.8's
 * exclusion of arbitrary page composition both point the same way: a fixed set of
 * attachment points, each taking one element id or "none". That keeps the export a
 * stable contract (a consumer knows every key up front), keeps determinism trivial, and
 * means the UI can show a project's whole behaviour on one screen. The catalogue can
 * grow to hundreds of entries without the *document* shape changing at all.
 *
 * Element ids are stable internal identifiers, same rule as recipe ids (§11.4): they
 * never encode a third-party package name. `scroll.smooth` describes the intent; the
 * implementation layer decides whether that becomes Lenis, GSAP ScrollSmoother or a
 * hand-rolled lerp.
 */

export const ELEMENT_CATEGORIES = [
  "text",
  "background",
  "scroll",
  "cursor",
  "hover",
  "loader",
] as const;
export const ElementCategory = z.enum(ELEMENT_CATEGORIES);
export type ElementCategory = z.infer<typeof ElementCategory>;

export const ELEMENT_CATEGORY_LABELS: Record<ElementCategory, string> = {
  text: "Text Animations",
  background: "Backgrounds",
  scroll: "Scroll Effects",
  cursor: "Cursor",
  hover: "Hover Effects",
  loader: "Loaders",
};

/**
 * Where an element can attach. Each slot accepts exactly one element (or "none"), and
 * each declares which categories are valid for it — a background effect behind the hero
 * makes sense, a background effect as the cursor does not. `ELEMENT_SLOTS` is the
 * authority the UI, the schema and the validator all read, so a new slot is one edit.
 */
export const ELEMENT_SLOTS = [
  {
    id: "heading",
    label: "Heading animation",
    description: "How the main headline arrives.",
    categories: ["text"],
  },
  {
    id: "heroBackground",
    label: "Hero background",
    description: "What moves behind the hero.",
    categories: ["background"],
  },
  {
    id: "sectionReveal",
    label: "Section reveal",
    description: "How sections enter as you scroll to them.",
    categories: ["scroll"],
  },
  {
    id: "scrollBehaviour",
    label: "Scroll behaviour",
    description: "How the page itself scrolls.",
    categories: ["scroll"],
  },
  {
    id: "cursor",
    label: "Cursor effect",
    description: "What follows the pointer.",
    categories: ["cursor"],
  },
  {
    id: "linkHover",
    label: "Link hover",
    description: "What links do on hover.",
    categories: ["hover"],
  },
  {
    id: "cardHover",
    label: "Card hover",
    description: "What cards do on hover.",
    categories: ["hover"],
  },
  {
    id: "loader",
    label: "Loading indicator",
    description: "Shown while content is pending.",
    categories: ["loader"],
  },
] as const;

export type ElementSlotId = (typeof ELEMENT_SLOTS)[number]["id"];
export const ELEMENT_SLOT_IDS = ELEMENT_SLOTS.map((s) => s.id) as [ElementSlotId, ...ElementSlotId[]];

/** Categories a given slot will accept, for filtering the catalogue in the UI. */
export function categoriesForSlot(slot: ElementSlotId): readonly ElementCategory[] {
  return ELEMENT_SLOTS.find((s) => s.id === slot)!.categories;
}

/**
 * A slot's value: an element id, or "none".
 *
 * Kept as a plain string rather than an enum of every catalogue id. The catalogue is
 * code, not schema — it will grow constantly, and regenerating a Zod enum on every
 * addition would make every saved project's validity depend on the catalogue's exact
 * contents at load time. A project referencing an element that has since been renamed
 * should degrade to "none" in the UI, not fail to open. `validateElementIds` reports
 * those separately, so nothing is silently swallowed.
 */
export const ElementRef = z.string().default("none");

/**
 * Per-element tuning, e.g. a background's speed or a text effect's stagger.
 *
 * Deliberately a loose record rather than a per-element typed shape: each element
 * declares its own params in the catalogue, and the values are simple scalars that go
 * straight into CSS variables or a recipe binding. Typing all of them in the schema
 * would move the catalogue into the schema layer, which is exactly what the slot model
 * is avoiding.
 */
export const ElementParams = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]));
export type ElementParams = z.infer<typeof ElementParams>;

export const ElementChoices = z.object({
  slots: z.object(
    Object.fromEntries(ELEMENT_SLOT_IDS.map((id) => [id, ElementRef])) as Record<
      ElementSlotId,
      typeof ElementRef
    >,
  ),
  /** Params keyed by slot, so the same element tuned differently in two slots is fine. */
  params: z.record(z.string(), ElementParams).default({}),
});
export type ElementChoices = z.infer<typeof ElementChoices>;

/** An element the project references that the catalogue no longer knows about. */
export interface UnknownElementRef {
  slot: ElementSlotId;
  id: string;
}

/**
 * Reports slots pointing at ids the catalogue doesn't contain.
 *
 * Surfaced rather than thrown: a project saved against a newer catalogue must still
 * open on an older build, and a renamed element should be a visible "this is gone"
 * rather than an unopenable document.
 */
export function validateElementIds(
  choices: ElementChoices,
  knownIds: ReadonlySet<string>,
): UnknownElementRef[] {
  const unknown: UnknownElementRef[] = [];
  for (const slot of ELEMENT_SLOT_IDS) {
    const id = choices.slots[slot];
    if (id === "none" || knownIds.has(id)) continue;
    unknown.push({ slot, id });
  }
  return unknown;
}
