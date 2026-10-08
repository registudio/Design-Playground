/**
 * The shadcn-compatible registries the Elements browser indexes (spec §1a): the five
 * the spec names, then ten more and 21st.dev added since.
 *
 * All of them publish the same item shape and install the same way, which is
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

export type SourceId =
  | "bklit" | "kokonutui" | "soralabs" | "componentry" | "react-bits"
  | "magicui" | "aceternity" | "motion-primitives" | "animate-ui" | "tailark"
  | "kibo-ui" | "reui" | "cult-ui" | "eldoraui" | "smoothui" | "21st";

/**
 * Which published items are components worth browsing.
 *
 * The first five registries publish nothing else, so they need no rule. Most of the
 * later ones publish their components alongside demos (`registry:example`, Animate UI's
 * `demo-*`), themes, helper libraries and hooks, and some publish far more of those than
 * of components: Magic UI is 78 components in 250 entries, ReUI's default style 24 in
 * 1,258. Indexed whole, a grid of usage examples and colour themes would bury the
 * components. Every rule here was read off the source's own registry, not guessed.
 */
export interface ItemRule {
  /** Item `type`s to keep. */
  types?: readonly string[];
  /** Keep only names starting with this. */
  namePrefix?: string;
  /** Names to leave out, for one-off entries a type rule cannot separate. */
  exclude?: readonly string[];
  /**
   * Drop items that are parts of another item: `data-grid-pagination` when `data-grid`
   * is published. ReUI publishes every sub-file of its larger components as an item.
   */
  topLevelOnly?: boolean;
}

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
  /** See `ItemRule`. Absent: every item is a component. */
  include?: ItemRule;
  /**
   * Where one item's JSON lives, `{name}` substituted. Absent: beside `registry.json`,
   * which is the shadcn layout and holds for every source that publishes an index.
   */
  itemUrl?: string;
  /** The shadcn namespace, when it is not the source id (Tailark's is `@tailark-oss`). */
  namespace?: string;
  /**
   * The source publishes no index, so its items are a list kept in `curated.ts`. Aceternity
   * serves each component at its own URL with no index beside them, and 21st.dev's
   * catalogue sits behind an authenticated API.
   */
  curated?: boolean;
  /** Installed by URL (`npx shadcn add "<url>"`) rather than by namespace. */
  installByUrl?: boolean;
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
  // The ten below were added from registries' own source repositories, read 2026-10-08:
  // each endpoint and item rule is what the repository publishes, not what a directory
  // says about it. Aceternity alone has no public repository; see `curated`.
  {
    id: "magicui",
    label: "Magic UI",
    endpoint: "https://magicui.design/r/registry.json",
    category: "signature-polish",
    referenceOnly: false,
    approximateItems: "~78 components (of ~250 entries)",
    homepage: "https://magicui.design",
    include: { types: ["registry:ui"] },
  },
  {
    id: "aceternity",
    label: "Aceternity UI",
    // No index is published; items are served one per URL.
    endpoint: "https://ui.aceternity.com/registry/registry.json",
    itemUrl: "https://ui.aceternity.com/registry/{name}.json",
    category: "signature-polish",
    referenceOnly: false,
    approximateItems: "hand-kept list",
    homepage: "https://ui.aceternity.com",
    curated: true,
  },
  {
    id: "motion-primitives",
    label: "Motion Primitives",
    endpoint: "https://motion-primitives.com/c/registry.json",
    category: "micro-interactions",
    referenceOnly: false,
    approximateItems: "~33",
    homepage: "https://motion-primitives.com",
  },
  {
    id: "animate-ui",
    label: "Animate UI",
    endpoint: "https://animate-ui.com/r/registry.json",
    category: "micro-interactions",
    referenceOnly: false,
    // The rest are demos, unstyled primitives and ~300 animated icons.
    approximateItems: "~73 components (of ~580 entries)",
    homepage: "https://animate-ui.com",
    include: { namePrefix: "components-" },
  },
  {
    id: "tailark",
    label: "Tailark",
    // The open-source registry. tailark.com/r is Tailark Pro and needs an API key. The
    // repo's README writes this host as oss-tailark.com; its components.json, which is
    // what tooling reads, has oss.tailark.com.
    endpoint: "https://oss.tailark.com/r/registry.json",
    namespace: "tailark-oss",
    category: "layout-blocks",
    referenceOnly: false,
    approximateItems: "~160 blocks and pages",
    homepage: "https://tailark.com",
    include: { types: ["registry:block", "registry:page"] },
  },
  {
    id: "kibo-ui",
    label: "Kibo UI",
    endpoint: "https://www.kibo-ui.com/r/registry.json",
    category: "layout-blocks",
    referenceOnly: false,
    approximateItems: "~40",
    homepage: "https://www.kibo-ui.com",
    include: { types: ["registry:ui"] },
  },
  {
    id: "reui",
    label: "ReUI",
    // base-nova is the style reui.io serves for its unstyled default path.
    endpoint: "https://reui.io/r/styles/base-nova/registry.json",
    category: "layout-blocks",
    referenceOnly: false,
    approximateItems: "~24 components (of ~1,250 entries)",
    homepage: "https://reui.io",
    include: { types: ["registry:ui"], topLevelOnly: true },
  },
  {
    id: "cult-ui",
    label: "Cult UI",
    endpoint: "https://cult-ui.com/r/registry.json",
    category: "signature-polish",
    referenceOnly: false,
    approximateItems: "~154 components (of ~307 entries)",
    homepage: "https://www.cult-ui.com",
    include: { types: ["registry:ui"] },
  },
  {
    id: "eldoraui",
    label: "Eldora UI",
    endpoint: "https://eldoraui.site/r/registry.json",
    category: "text-scroll-effects",
    referenceOnly: false,
    approximateItems: "~55 components and blocks",
    homepage: "https://eldoraui.site",
    include: { types: ["registry:ui", "registry:block"] },
  },
  {
    id: "smoothui",
    label: "SmoothUI",
    endpoint: "https://smoothui.dev/r/registry.json",
    category: "micro-interactions",
    referenceOnly: false,
    approximateItems: "~235 components and blocks",
    homepage: "https://smoothui.dev",
    // `cli` is the installer's own entry, not a component.
    include: { types: ["registry:ui", "registry:block"], exclude: ["cli"] },
  },
  {
    id: "21st",
    label: "21st.dev",
    // 21st.dev's catalogue is behind an authenticated API, so its items are kept by hand;
    // see curated.ts. Item names carry the author: `kedhareswer/lens-zoom-carousel`.
    endpoint: "https://21st.dev/r/registry.json",
    itemUrl: "https://21st.dev/r/{name}",
    category: "signature-polish",
    referenceOnly: false,
    approximateItems: "hand-kept list",
    homepage: "https://21st.dev",
    curated: true,
    installByUrl: true,
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
  const registry = sourceById(source);
  if (registry?.installByUrl) return `npx shadcn@latest add "${itemUrl(registry, name)}"`;
  return `npx shadcn@latest add @${registry?.namespace ?? source}/${name}`;
}

/** Where one item's JSON is published. */
export function itemUrl(source: RegistrySource, name: string): string {
  return source.itemUrl
    ? source.itemUrl.replace("{name}", name)
    : source.endpoint.replace(/registry\.json$/, `${name}.json`);
}

/** The `components.json` URL template for a source installed by namespace. */
export function namespaceTemplate(source: RegistrySource): string {
  return source.itemUrl ?? source.endpoint.replace(/registry\.json$/, "{name}.json");
}
