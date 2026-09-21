import { z } from "zod";
import { ElementVariant, RoutingCategoryEnum, SourceIdEnum } from "@/registry/schema";

/**
 * design-playground-selection/v1 — the Elements export contract (spec §5).
 *
 * This is the one part of the Elements feature that plugs back into web-stack-init:
 * its Phase 2 design interview reads this file, if present, and skips the
 * component-sourcing question, treating the export as that question already answered
 * one entry at a time rather than as one whole-project bias.
 *
 * Two shapes, deliberately:
 *
 * `SelectionDocument` is the exported contract and is kept exactly as §5 specifies —
 * three fields, nothing more. A consumer parsing it should not have to know what a
 * routing category is.
 *
 * `SelectedElement` is what the project document stores. It carries enough denormalized
 * detail to render the selection list on its own, because the registry index is a
 * refreshable cache that may be empty (first run, offline, a failed refresh) while the
 * selections themselves must always be readable. Selections are a decision the designer
 * made; they must not become unreadable because a third-party host was down.
 */

export const SELECTION_SCHEMA_ID = "design-playground-selection/v1" as const;

/** Exactly §5's shape. Widening this is a change to the contract with web-stack-init. */
export const ElementSelection = z.object({
  id: z.string(),
  installCommand: z.string(),
  /** Free text: "hero headline reveal". What the component is *for* on this site. */
  intendedUse: z.string(),
});
export type ElementSelection = z.infer<typeof ElementSelection>;

export const SelectionDocument = z.object({
  schema: z.literal(SELECTION_SCHEMA_ID),
  selections: z.array(ElementSelection),
});
export type SelectionDocument = z.infer<typeof SelectionDocument>;

/** The richer record held in the project document. */
export const SelectedElement = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  description: z.string().default(""),
  source: SourceIdEnum,
  category: RoutingCategoryEnum,
  installCommand: z.string(),
  intendedUse: z.string().default(""),
  referenceOnly: z.boolean().default(false),
  variant: ElementVariant.optional(),
  engineDependency: z.array(z.enum(["motion", "gsap"])).default([]),
  /** When it was picked, so the selection list can hold a meaningful order. */
  addedAt: z.number(),
});
export type SelectedElement = z.infer<typeof SelectedElement>;

/**
 * Narrows the stored selections to the exported contract.
 *
 * Sorted by id rather than by pick order: the export is compared, diffed and
 * committed downstream, so it must not change just because two components were
 * chosen in a different sequence. Pick order lives in the project document, where
 * it is a UI concern.
 */
export function toSelectionDocument(selected: SelectedElement[]): SelectionDocument {
  return {
    schema: SELECTION_SCHEMA_ID,
    selections: [...selected]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(({ id, installCommand, intendedUse }) => ({ id, installCommand, intendedUse })),
  };
}
