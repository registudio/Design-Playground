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

/**
 * §5's shape, plus placement.
 *
 * §5 specifies id, installCommand and intendedUse. `placement` is added because the
 * authored elements have carried it from the start and registry selections did not, so
 * the export could say a component was chosen but not where it goes — which is most of
 * what makes the handoff actionable. It is optional, so a consumer written against the
 * original three fields is unaffected, and it is omitted entirely when unplaced rather
 * than exported as an empty string.
 */
export const ElementSelection = z.object({
  id: z.string(),
  installCommand: z.string(),
  /** Free text: "hero headline reveal". What the component is *for* on this site. */
  intendedUse: z.string(),
  /** A section key from the page order, or "page" for the end of the page. */
  placement: z.string().optional(),
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
  /** Matches the authored elements' own field, so both kinds place the same way. */
  placement: z.string().default("page"),
  referenceOnly: z.boolean().default(false),
  variant: ElementVariant.optional(),
  engineDependency: z.array(z.enum(["motion", "gsap"])).default([]),
  /** When it was picked, so the selection list can hold a meaningful order. */
  addedAt: z.number(),
  npmDependencies: z.array(z.string()).optional(),
  registryDependencies: z.array(z.string()).optional(),
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
      .map(({ id, installCommand, intendedUse, placement }) => ({
        id,
        installCommand,
        intendedUse,
        // Omitted rather than exported as "page": an unplaced selection has not been
        // decided, and saying so is more useful than a default that looks deliberate.
        ...(placement && placement !== "page" ? { placement } : {}),
      })),
  };
}
