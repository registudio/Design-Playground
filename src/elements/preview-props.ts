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

/**
 * One item shape that satisfies as many list components as it can at once.
 *
 * Every field is something a measured component read and crashed or rendered nothing
 * without: navigation wants href, a dock wants an icon element, glass icons a colour, a
 * masonry wall an img, url and height, a logo loop a node. `React` is in scope where
 * this is spliced, so elements can be built here; JSX cannot.
 *
 * `icon` is the one field two families disagree on: feature cards render it as a
 * component (`<item.icon/>`, typed LucideIcon), docks and icon rows as an element. A
 * component is the default; the navigation recipe swaps in elements.
 */
const ICON_COMPONENT = `(props) => React.createElement("svg", { viewBox: "0 0 24 24", width: 20, height: 20, fill: "none", stroke: "currentColor", ...props }, React.createElement("circle", { cx: 12, cy: 12, r: 8 }))`;
const ICON_ELEMENT = `React.createElement("span", { "aria-hidden": true }, "✳")`;

const card = (id: number, title: string, line: string, color: string, height: number, icon = ICON_COMPONENT) =>
  `{ id: ${id}, title: "${title}", label: "${title}", name: "${title}", text: "${title}", value: "${title.toLowerCase()}", description: "${line}", content: "${line}",
    image: ${IMAGE}, src: ${IMAGE}, img: ${IMAGE}, url: "#", href: "#", height: ${height}, color: "${color}",
    icon: ${icon}, node: React.createElement("span", null, "${title}"),
    onClick: () => {} }`;

const CARDS = `[
  ${card(1, "Discover", "Find the shape of it.", "#a78bfa", 320)},
  ${card(2, "Compose", "Put the pieces together.", "#cbe99a", 240)},
  ${card(3, "Ship", "Send it into the world.", "#f5a97f", 280)}
]`;

const NAV_ITEMS = `[
  ${card(1, "Discover", "Find the shape of it.", "#a78bfa", 320, ICON_ELEMENT)},
  ${card(2, "Compose", "Put the pieces together.", "#cbe99a", 240, ICON_ELEMENT)},
  ${card(3, "Ship", "Send it into the world.", "#f5a97f", 280, ICON_ELEMENT)}
]`;

/** For lists that render each item directly, where an object is not a valid child. */
const WORDS = `["Discover", "Compose", "Ship", "Refine", "Launch"]`;

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
    // These render each item as a child. The sequence recipe's card objects made React
    // throw "Objects are not valid as a React child".
    sources: ["react-bits"],
    match: /^(animated list|grid motion)\b/,
    props: `{ items: ${WORDS} }`,
  },
  {
    sources: ["react-bits"],
    match: /^stack\b/,
    props: `{ cards: ${WORDS}.map((word) => React.createElement("div", { style: { width: "100%", height: "100%", display: "grid", placeItems: "center", background: "#25311f", color: "#eef2e6", font: "600 20px system-ui" } }, word)) }`,
  },
  {
    // Navigation, docks, icon rows and logo walls map over items and crashed on reading
    // .map of undefined; most of them also need a link, an icon or a logo per item.
    match: /\b(dock|nav|navbar|navigation|icons|logo|logos|masonry|segment|segmented)\b/,
    props: `{ items: ${NAV_ITEMS}, logos: ${NAV_ITEMS}, links: ${NAV_ITEMS}, logo: ${IMAGE}, logoAlt: "Logo", activeHref: "#" }`,
  },
  {
    // A counter with no target read .toString() of undefined.
    match: /\b(count|counter|number|ticker|odometer)\b/,
    props: `{ to: 62, from: 0, end: 62, start: 0, target: 62 }`,
  },
  {
    // Numeric despite its name; the input recipe's empty-string value broke .toFixed.
    match: /\bscrub\b/,
    props: `{ value: 62, defaultValue: 62, min: 0, max: 100, step: 1, label: "Opacity", suffix: "%" }`,
  },
  {
    match: /\bproximity\b/,
    props: `{ label: "Small details. Big possibilities.", containerRef: { current: typeof document === "undefined" ? null : document.body },
      fromFontVariationSettings: "'wght' 400, 'opsz' 9", toFontVariationSettings: "'wght' 1000, 'opsz' 40", radius: 120 }`,
  },
  {
    // Anything that shows a sequence needs more than one thing to show.
    // `cards` plural only: "BounceCards" shows several, "Mouse Effect Card" shows one.
    match: /\b(carousel|gallery|slider|marquee|stack|cards|list|grid|bento|testimonial|accordion|tabs|steps?)\b/,
    props: `{ items: ${CARDS}, cards: ${CARDS}, slides: ${CARDS}, images: [${IMAGE}, ${IMAGE}, ${IMAGE}],
      options: ${CARDS}, tabs: ${CARDS}, data: ${CARDS} }`,
  },
  {
    // Plurals too: "OrbitImages" missed on \bimage\b and got no images at all. Image
    // trails and spirals take their pictures as plain `items` URLs.
    match: /\b(images?|photos?|avatars?|media|video|thumbnails?|pictures?|spiral|orbit)\b/,
    props: `{ src: ${IMAGE}, image: ${IMAGE}, images: [${IMAGE}, ${IMAGE}, ${IMAGE}],
      items: [${IMAGE}, ${IMAGE}, ${IMAGE}, ${IMAGE}, ${IMAGE}],
      alt: "Placeholder", url: ${IMAGE}, poster: ${IMAGE} }`,
  },
  {
    // Two faces to swap between; without them there is nothing on either side.
    match: /\bpixel swap\b/,
    props: `{ firstContent: React.createElement("div", { style: { padding: 24, background: "#25311f", color: "#eef2e6", font: "600 20px system-ui" } }, "Small details"),
      secondContent: React.createElement("div", { style: { padding: 24, background: "#cbe99a", color: "#111412", font: "600 20px system-ui" } }, "Big possibilities") }`,
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
    // A tooltip wraps an element it reads props from, so a bare string child threw.
    props: `{ open: true, defaultOpen: true, isOpen: true, side: "bottom", content: "Small details",
      children: React.createElement("button", { type: "button" }, "Hover me") }`,
  },
  {
    match: /\b(progress|loader|loading|spinner|skeleton|meter)\b/,
    props: `{ value: 62, progress: 62, percent: 62, loading: true, isLoading: true }`,
  },
];

/**
 * Everything above, as text, for the preview route's disk cache key. The props are baked
 * into each compiled document, so a changed recipe has to retire the documents built
 * with the old one.
 */
export const RECIPES_FINGERPRINT = [
  BASE,
  ...RECIPES.map((recipe) => `${recipe.sources?.join(",") ?? "*"}|${recipe.match}|${recipe.props}`),
].join("\n");

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
