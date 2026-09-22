/**
 * Demonstration props for a compiled registry component.
 *
 * The registries publish source but not a demo or sample props, so a preview has to
 * invent something to render with. One generic object gets a surprising amount right —
 * most components take `children`, a `title`, a `className` — but it gets whole
 * families wrong in ways that read as broken rather than as approximate: a chart with
 * no data renders an empty box, a carousel with no items renders nothing at all.
 *
 * These recipes narrow that by source and by name. They are match rules over the item
 * name rather than an entry per component: ~440 hand-written prop sets would be a
 * maintenance burden that goes stale on the next refresh, whereas "Bklit items whose
 * name mentions a chart want a data series" stays true as the registry grows.
 *
 * The output is JavaScript source, spliced into the generated module, so each recipe is
 * a string rather than an object — it has to survive serialization into a file that
 * esbuild then bundles, and callbacks and JSX cannot cross that boundary as data.
 */

/** Deterministic sample series, so a re-compile produces an identical document. */
const SERIES = `[
  { name: "Jan", label: "Jan", date: "2026-01", x: 1, value: 42, y: 42, total: 42, count: 42, amount: 42, open: 38, high: 46, low: 35, close: 42 },
  { name: "Feb", label: "Feb", date: "2026-02", x: 2, value: 58, y: 58, total: 58, count: 58, amount: 58, open: 42, high: 61, low: 41, close: 58 },
  { name: "Mar", label: "Mar", date: "2026-03", x: 3, value: 49, y: 49, total: 49, count: 49, amount: 49, open: 58, high: 59, low: 46, close: 49 },
  { name: "Apr", label: "Apr", date: "2026-04", x: 4, value: 73, y: 73, total: 73, count: 73, amount: 73, open: 49, high: 78, low: 48, close: 73 },
  { name: "May", label: "May", date: "2026-05", x: 5, value: 66, y: 66, total: 66, count: 66, amount: 66, open: 73, high: 75, low: 62, close: 66 },
  { name: "Jun", label: "Jun", date: "2026-06", x: 6, value: 91, y: 91, total: 91, count: 91, amount: 91, open: 66, high: 94, low: 65, close: 91 }
]`;

const IMAGE = `"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='260'%3E%3Crect width='400' height='260' fill='%23334423'/%3E%3C/svg%3E"`;

const CARDS = `[
  { id: 1, title: "Discover", label: "Discover", name: "Discover", description: "Find the shape of it.", content: "Find the shape of it.", image: ${IMAGE}, src: ${IMAGE} },
  { id: 2, title: "Compose", label: "Compose", name: "Compose", description: "Put the pieces together.", content: "Put the pieces together.", image: ${IMAGE}, src: ${IMAGE} },
  { id: 3, title: "Ship", label: "Ship", name: "Ship", description: "Send it into the world.", content: "Send it into the world.", image: ${IMAGE}, src: ${IMAGE} }
]`;

/** Props every component gets, whichever recipe matches. */
const BASE = `{
  children: "Design Playground",
  text: "Design Playground",
  title: "Small details",
  heading: "Small details",
  description: "Big possibilities.",
  label: "Explore",
  placeholder: "Type something…",
  value: 62, progress: 62, percentage: 62, count: 3, duration: 2, speed: 1,
  className: "",
  onClick: () => {}, onChange: () => {}, onSelect: () => {}, onValueChange: () => {},
  onSubmit: (e) => e?.preventDefault?.(), onOpenChange: () => {}, onComplete: () => {}
}`;

interface Recipe {
  /** Which sources this applies to; omitted means any. */
  sources?: string[];
  /** Matched against the item name, lowercased and camelCase-split. */
  match: RegExp;
  /** JavaScript object source, merged over BASE. */
  props: string;
}

/**
 * Ordered; the first match wins.
 *
 * Narrower shapes come first for the same reason as the browse taxonomy: a "chart
 * legend" is part of a chart and wants chart data, not legend data.
 */
const RECIPES: Recipe[] = [
  {
    // Every Bklit item is part of a chart, and a chart without data renders an empty
    // box that looks like a failure rather than a component.
    sources: ["bklit"],
    match: /.*/,
    props: `{ data: ${SERIES}, series: ${SERIES}, chartData: ${SERIES}, items: ${SERIES},
      width: 380, height: 220, dataKey: "value", xKey: "name", yKey: "value",
      categories: ["value"], index: "name", colors: ["#cbe99a", "#a78bfa"],
      config: { value: { label: "Value", color: "#cbe99a" } } }`,
  },
  {
    match: /\b(chart|graph|plot|sparkline|histogram|heatmap|gauge|candlestick)\b/,
    props: `{ data: ${SERIES}, series: ${SERIES}, chartData: ${SERIES},
      width: 380, height: 220, dataKey: "value", xKey: "name", yKey: "value",
      categories: ["value"], index: "name", colors: ["#cbe99a", "#a78bfa"] }`,
  },
  {
    // Anything that shows a sequence needs more than one thing to show.
    // `cards` plural only: "BounceCards" shows several, "Mouse Effect Card" shows one.
    match: /\b(carousel|gallery|slider|marquee|stack|cards|list|grid|bento|testimonial|accordion|tabs|steps?)\b/,
    props: `{ items: ${CARDS}, cards: ${CARDS}, slides: ${CARDS}, images: [${IMAGE}, ${IMAGE}, ${IMAGE}],
      options: ${CARDS}, tabs: ${CARDS}, data: ${CARDS} }`,
  },
  {
    match: /\b(image|photo|avatar|media|video|thumbnail|picture)\b/,
    props: `{ src: ${IMAGE}, image: ${IMAGE}, images: [${IMAGE}, ${IMAGE}, ${IMAGE}],
      alt: "Placeholder", url: ${IMAGE}, poster: ${IMAGE} }`,
  },
  {
    // Text effects take the string as a prop far more often than as children.
    match: /\b(text|type(writer|writing)?|word|letter|headline|title|scramble|shimmer|glitch|marquee)\b/,
    props: `{ text: "Small details. Big possibilities.", children: "Small details. Big possibilities.",
      words: ["details", "motion", "ideas"], texts: ["Small details", "Big possibilities"],
      sequence: ["Small details", "Big possibilities"] }`,
  },
  {
    match: /\b(input|form|field|search|textarea|combobox|select)\b/,
    props: `{ value: "", defaultValue: "", suggestions: ["One", "Two", "Three"],
      options: ${CARDS}, placeholder: "Type something…" }`,
  },
  {
    // Otherwise a dialog renders nothing, since it is closed by default.
    match: /\b(modal|dialog|drawer|sheet|popover|tooltip|dropdown|menu)\b/,
    props: `{ open: true, defaultOpen: true, isOpen: true, side: "bottom" }`,
  },
  {
    match: /\b(progress|loader|loading|spinner|skeleton|meter)\b/,
    props: `{ value: 62, progress: 62, percent: 62, loading: true, isLoading: true }`,
  },
];

/** Splits camelCase so a PascalCase registry name matches on whole words. */
function words(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_/]+/g, " ").toLowerCase();
}

/**
 * The prop object source for one item, as JavaScript.
 *
 * Merged over the base rather than replacing it, so a recipe only has to state what is
 * special about its family.
 */
export function propRecipe(source: string, name: string): string {
  const subject = words(name);
  const recipe = RECIPES.find(
    (entry) =>
      (!entry.sources || entry.sources.includes(source)) && entry.match.test(subject),
  );
  return recipe ? `{ ...${BASE}, ...${recipe.props} }` : BASE;
}

/** Exposed for tests: which recipe family an item lands in, or null for the base props. */
export function recipeIndexFor(source: string, name: string): number | null {
  const subject = words(name);
  const index = RECIPES.findIndex(
    (entry) => (!entry.sources || entry.sources.includes(source)) && entry.match.test(subject),
  );
  return index === -1 ? null : index;
}
