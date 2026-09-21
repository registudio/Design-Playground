/**
 * The five shadcn-compatible registries the Elements browser indexes (spec §1a).
 *
 * All five publish the same `registry.json` shape and install the same way, which is
 * the only reason aggregating them is tractable at all. What differs is ownership —
 * which kind of element each one is the right source for — and that is recorded here,
 * per source, because the routing table upstream assigns ownership at the source level.
 *
 * §6 makes this an explicit non-goal to compute per item: there is no per-component
 * classifier upstream, and inventing one is a much larger and shakier project than
 * this. A Bklit item is a chart because it came from Bklit.
 */

/** Matches the routing table's categories (spec §2). */
export type RoutingCategory =
  | "charts"
  | "layout-blocks"
  | "text-scroll-effects"
  | "signature-polish"
  | "micro-interactions";

export const ROUTING_CATEGORY_LABELS: Record<RoutingCategory, string> = {
  charts: "Charts & data viz",
  "layout-blocks": "Layout blocks",
  "text-scroll-effects": "Text & scroll effects",
  "signature-polish": "Signature polish",
  "micro-interactions": "Micro-interactions",
};

export type SourceId = "bklit" | "kokonutui" | "soralabs" | "componentry" | "react-bits";

export interface RegistrySource {
  id: SourceId;
  label: string;
  endpoint: string;
  /** Fixed for every item this source publishes — see the note above. */
  category: RoutingCategory;
  /**
   * Componentry is technically a registry but semantically reference-first: its own
   * docs frame it as "inspect and customize", not "install as-is" (§1c). Flagged so
   * the UI can visually separate it from a one-click install rather than letting the
   * two look interchangeable.
   */
  referenceOnly: boolean;
  /** Roughly what to expect, for sanity-checking a fetch. Counts drift upstream. */
  approximateItems: string;
  /** Where a human goes to actually look at these, since the registries ship no previews. */
  homepage: string;
}

export const REGISTRY_SOURCES: readonly RegistrySource[] = [
  {
    id: "bklit",
    label: "Bklit",
    endpoint: "https://bklit.com/r/registry.json",
    category: "charts",
    referenceOnly: false,
    approximateItems: "~56",
    homepage: "https://bklit.com",
  },
  {
    id: "kokonutui",
    label: "KokonutUI",
    endpoint: "https://kokonutui.com/r/registry.json",
    category: "layout-blocks",
    referenceOnly: false,
    approximateItems: "~51",
    homepage: "https://kokonutui.com",
  },
  {
    id: "soralabs",
    label: "Sora UI",
    endpoint: "https://ui.soralabs.io.vn/r/registry.json",
    category: "text-scroll-effects",
    referenceOnly: false,
    // Observed to swing 139 -> 69 inside one week, which is the whole reason
    // staleness is surfaced rather than hidden (§3).
    approximateItems: "69–139, varies week to week",
    homepage: "https://ui.soralabs.io.vn",
  },
  {
    id: "componentry",
    label: "Componentry",
    endpoint: "https://componentry.dev/r/registry.json",
    category: "signature-polish",
    referenceOnly: true,
    approximateItems: "~55",
    homepage: "https://componentry.dev",
  },
  {
    id: "react-bits",
    label: "React Bits",
    endpoint: "https://reactbits.dev/r/registry.json",
    category: "micro-interactions",
    // ~205 unique components published as ~820 entries; see collapseVariants.
    referenceOnly: false,
    approximateItems: "~205 unique",
    homepage: "https://reactbits.dev",
  },
] as const;

export function sourceById(id: string): RegistrySource | undefined {
  return REGISTRY_SOURCES.find((source) => source.id === id);
}

/**
 * The install command for an item.
 *
 * The spec states this two ways — §2's field description omits the `@`, while §5's
 * concrete export example writes `npx shadcn@latest add @soralabs/text-effect`. The
 * `@alias/name` form is followed here because it is what §5's example (the contract
 * that actually plugs into web-stack-init) shows, and what shadcn itself expects once
 * a third-party registry is registered in `components.json`. Kept in one function so
 * the convention is corrected in one place if that reading is ever wrong.
 */
export function installCommand(source: SourceId, name: string): string {
  return `npx shadcn@latest add @${source}/${name}`;
}
