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

/**
 * Sample pictures: a colourful gradient scene each, so an image-led component has
 * something to show. The first version was a flat dark-green rectangle, which nearly
 * disappeared on the dark preview surface; image grids, orbits and posters measured
 * as blank. Sized, so a WebGL texture loader can read their dimensions, and fully
 * percent-encoded: Masonry puts them in an unquoted CSS url(), where a bare "(" or "'"
 * ended the URL and the tile showed nothing.
 */
const IMAGES = [
  `"data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%27640%27%20height%3D%27480%27%20viewBox%3D%270%200%20640%20480%27%3E%3Cdefs%3E%3ClinearGradient%20id%3D%27g%27%20x1%3D%270%27%20y1%3D%270%27%20x2%3D%271%27%20y2%3D%271%27%3E%3Cstop%20offset%3D%270%27%20stop-color%3D%27%232b5876%27%2F%3E%3Cstop%20offset%3D%271%27%20stop-color%3D%27%234e4376%27%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%27640%27%20height%3D%27480%27%20fill%3D%27url%28%23g%29%27%2F%3E%3Ccircle%20cx%3D%27470%27%20cy%3D%27150%27%20r%3D%27110%27%20fill%3D%27%23f7b267%27%20opacity%3D%27.85%27%2F%3E%3Cpath%20d%3D%27M0%20380%20Q160%20280%20320%20360%20T640%20330%20V480%20H0Z%27%20fill%3D%27%23ffffff%27%20opacity%3D%27.22%27%2F%3E%3Crect%20x%3D%2770%27%20y%3D%2790%27%20width%3D%27190%27%20height%3D%2726%27%20rx%3D%2713%27%20fill%3D%27%23ffffff%27%20opacity%3D%27.55%27%2F%3E%3C%2Fsvg%3E"`,
  `"data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%27640%27%20height%3D%27480%27%20viewBox%3D%270%200%20640%20480%27%3E%3Cdefs%3E%3ClinearGradient%20id%3D%27g%27%20x1%3D%270%27%20y1%3D%270%27%20x2%3D%271%27%20y2%3D%271%27%3E%3Cstop%20offset%3D%270%27%20stop-color%3D%27%23134e5e%27%2F%3E%3Cstop%20offset%3D%271%27%20stop-color%3D%27%2371b280%27%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%27640%27%20height%3D%27480%27%20fill%3D%27url%28%23g%29%27%2F%3E%3Ccircle%20cx%3D%27470%27%20cy%3D%27150%27%20r%3D%27110%27%20fill%3D%27%23f4e285%27%20opacity%3D%27.85%27%2F%3E%3Cpath%20d%3D%27M0%20380%20Q160%20280%20320%20360%20T640%20330%20V480%20H0Z%27%20fill%3D%27%23ffffff%27%20opacity%3D%27.22%27%2F%3E%3Crect%20x%3D%2770%27%20y%3D%2790%27%20width%3D%27190%27%20height%3D%2726%27%20rx%3D%2713%27%20fill%3D%27%23ffffff%27%20opacity%3D%27.55%27%2F%3E%3C%2Fsvg%3E"`,
  `"data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%27640%27%20height%3D%27480%27%20viewBox%3D%270%200%20640%20480%27%3E%3Cdefs%3E%3ClinearGradient%20id%3D%27g%27%20x1%3D%270%27%20y1%3D%270%27%20x2%3D%271%27%20y2%3D%271%27%3E%3Cstop%20offset%3D%270%27%20stop-color%3D%27%23614385%27%2F%3E%3Cstop%20offset%3D%271%27%20stop-color%3D%27%23516395%27%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%27640%27%20height%3D%27480%27%20fill%3D%27url%28%23g%29%27%2F%3E%3Ccircle%20cx%3D%27470%27%20cy%3D%27150%27%20r%3D%27110%27%20fill%3D%27%23ff8fab%27%20opacity%3D%27.85%27%2F%3E%3Cpath%20d%3D%27M0%20380%20Q160%20280%20320%20360%20T640%20330%20V480%20H0Z%27%20fill%3D%27%23ffffff%27%20opacity%3D%27.22%27%2F%3E%3Crect%20x%3D%2770%27%20y%3D%2790%27%20width%3D%27190%27%20height%3D%2726%27%20rx%3D%2713%27%20fill%3D%27%23ffffff%27%20opacity%3D%27.55%27%2F%3E%3C%2Fsvg%3E"`,
  `"data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%27640%27%20height%3D%27480%27%20viewBox%3D%270%200%20640%20480%27%3E%3Cdefs%3E%3ClinearGradient%20id%3D%27g%27%20x1%3D%270%27%20y1%3D%270%27%20x2%3D%271%27%20y2%3D%271%27%3E%3Cstop%20offset%3D%270%27%20stop-color%3D%27%23c94b4b%27%2F%3E%3Cstop%20offset%3D%271%27%20stop-color%3D%27%234b134f%27%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%27640%27%20height%3D%27480%27%20fill%3D%27url%28%23g%29%27%2F%3E%3Ccircle%20cx%3D%27470%27%20cy%3D%27150%27%20r%3D%27110%27%20fill%3D%27%23ffd166%27%20opacity%3D%27.85%27%2F%3E%3Cpath%20d%3D%27M0%20380%20Q160%20280%20320%20360%20T640%20330%20V480%20H0Z%27%20fill%3D%27%23ffffff%27%20opacity%3D%27.22%27%2F%3E%3Crect%20x%3D%2770%27%20y%3D%2790%27%20width%3D%27190%27%20height%3D%2726%27%20rx%3D%2713%27%20fill%3D%27%23ffffff%27%20opacity%3D%27.55%27%2F%3E%3C%2Fsvg%3E"`,
];
const IMAGE = IMAGES[0];
const IMAGE_LIST = `[${IMAGES.join(", ")}]`;

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

const card = (id: number, title: string, line: string, color: string, height: number, icon = ICON_COMPONENT, image = IMAGES[(id - 1) % IMAGES.length]) =>
  `{ id: ${id}, title: "${title}", label: "${title}", name: "${title}", text: "${title}", value: "${title.toLowerCase()}", description: "${line}", content: "${line}",
    image: ${image}, src: ${image}, img: ${image}, url: "#", href: "#", link: "#", height: ${height}, color: "${color}",
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
  // Names that only ever mean one thing, so safe to give every component. CurvedLoop's
  // text is marqueeText (default empty); GridDistortion, MetallicPaint and StickerPeel
  // require imageSrc; MaskedHeading fills its letters from src; RippleDistortion's
  // default src is an Unsplash photo the sandbox cannot be relied on to reach.
  marqueeText: "Small details ✦ Big possibilities ✦ ", texts: ["Small details ✦", "Big possibilities ✦"], imageSrc: ${IMAGE}, imageUrl: ${IMAGE}, src: ${IMAGE},
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
    // The base props' count of 3 left a ball pit with three balls in it.
    sources: ["react-bits"],
    match: /^ballpit\b/,
    props: `{ count: 120, followCursor: true }`,
  },
  {
    // A trail of pictures behind the pointer: it needs the pictures, and a scene to
    // move over.
    sources: ["react-bits"],
    match: /^image trail\b/,
    props: `{ items: ${IMAGE_LIST}, __backdrop: true }`,
  },
  {
    // Overlays act on what is beneath them; the preview supplies a scene to act on.
    match: /\b(gradual blur|noise|grain|crosshair|splash cursor|ghost cursor|blob cursor|target cursor|text cursor|click spark|pixel trail)\b/,
    props: `{ __backdrop: true }`,
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
    // Needs a model, and its default environment downloads an HDR the sandbox cannot
    // fetch. The path is one the preview route serves from its vendored React Bits files.
    sources: ["react-bits"],
    match: /^model viewer\b/,
    props: `{ url: "/assets/3d/card.glb", environmentPreset: "none", autoRotate: true, autoRotateSpeed: 0.6, showScreenshotButton: false }`,
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
    // Laid out on a 1400px ellipse unless responsive, so on a card every picture orbited
    // outside the frame. Sized as React Bits' own demo sizes it, to the card.
    sources: ["react-bits"],
    match: /^orbit images\b/,
    props: `{ images: ${IMAGE_LIST}, responsive: true, baseWidth: 600, radiusX: 250, radiusY: 80, width: 340, height: 260, itemSize: 80, duration: 30 }`,
  },
  {
    // Plurals too: "OrbitImages" missed on \bimage\b and got no images at all. Image
    // trails and spirals take their pictures as plain `items` URLs.
    match: /\b(images?|photos?|avatars?|media|video|thumbnails?|pictures?|spiral|orbit|posters?)\b/,
    props: `{ src: ${IMAGE}, image: ${IMAGE}, images: ${IMAGE_LIST},
      items: ${IMAGE_LIST},
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
    // Menus that are a list of links rather than a closed popup: each item needs text,
    // a link and an image. Before the dialog recipe, which matches "menu".
    match: /\b(flowing|infinite|circular|stacked) menu\b/,
    props: `{ items: ${CARDS} }`,
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

/**
 * Data props a component reads that no recipe supplied, inferred from its own source.
 *
 * The recipes cover names that mean one thing everywhere (`title`, `items`, `data`), but
 * many components take their content under a name of their own — `timelineData`,
 * `testimonials`, `features` — and map over it straight away. Given nothing there they
 * threw "Cannot read properties of undefined (reading 'title')", and the card showed that
 * raw message over a stand-in. The names are read from the component's parameter
 * destructuring and from `props.x` uses; callbacks, flags, styling props and anything
 * with a default of its own are left alone, since a sample there would change behaviour
 * rather than fill a gap.
 */
const NOT_DATA = /^(?:children|className|style|ref|key|as|asChild|id|variant|size|theme|color|colors?|duration|delay|speed|direction|orientation|position|side|align|mode)$|^(?:on|is|has|show|should|can|enable|disable|hide|use|render|get|set|handle)[A-Z]|^(?:open|loop|disabled|autoplay|autoPlay|reverse|vertical|horizontal|pause\w*|animate\w*)$/;

export function inferredDataProps(source: string): string[] {
  const names = new Set<string>();
  // ({ a, b = 1, c: d, ...rest }) — the parameter list of a function or arrow function.
  for (const match of source.matchAll(/(?:function\s*[A-Za-z0-9_$]*|=>?|\bforwardRef\s*(?:<[^>]*>)?)\s*\(\s*\{([^}]*)\}\s*(?::[^)]*)?\)/g)) {
    for (const part of match[1]!.split(",")) {
      const entry = part.trim();
      if (!entry || entry.startsWith("...") || entry.includes("=")) continue;
      const name = entry.split(":")[0]!.trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
    }
  }
  for (const match of source.matchAll(/\bprops\??\.([A-Za-z_$][\w$]*)/g)) names.add(match[1]!);
  return [...names].filter((name) => !NOT_DATA.test(name)).sort();
}

/**
 * One sample for any of those props: a list of rich items that is also, through its own
 * properties, the first item. `testimonials.map(t => t.name)` and `data.title` both find
 * what they look for, which is what lets one value stand in for names never seen before.
 */
export const SAMPLE_DATA = `(() => {
  const Icon = ${ICON_COMPONENT};
  const items = [
    { id: 1, title: "Discover", name: "Alex Rivera", label: "Discover", heading: "Discover", description: "Find what matters first.", content: "Research and requirements, gathered in one place.", text: "Small details make the difference.", quote: "Small details make the difference.", role: "Product designer", category: "Design", date: "Jan 2026", status: "completed", energy: 90, value: 42, relatedIds: [2], tags: ["design"], image: ${IMAGE}, img: ${IMAGE}, src: ${IMAGE}, avatar: ${IMAGE}, href: "#", url: "#", icon: Icon },
    { id: 2, title: "Design", name: "Sam Okafor", label: "Design", heading: "Design", description: "Shape it with intent.", content: "Systems and screens, built to last.", text: "Clear, quick and on our side.", quote: "Clear, quick and on our side.", role: "Engineering lead", category: "Build", date: "Feb 2026", status: "in-progress", energy: 60, value: 58, relatedIds: [1, 3], tags: ["build"], image: ${IMAGES[1]}, img: ${IMAGES[1]}, src: ${IMAGES[1]}, avatar: ${IMAGES[1]}, href: "#", url: "#", icon: Icon },
    { id: 3, title: "Deliver", name: "Priya Nair", label: "Deliver", heading: "Deliver", description: "Ship it, then refine.", content: "Launch, measure and improve.", text: "The best launch we have had.", quote: "The best launch we have had.", role: "Founder", category: "Launch", date: "Mar 2026", status: "pending", energy: 30, value: 73, relatedIds: [2], tags: ["launch"], image: ${IMAGES[2]}, img: ${IMAGES[2]}, src: ${IMAGES[2]}, avatar: ${IMAGES[2]}, href: "#", url: "#", icon: Icon },
  ];
  return Object.assign(items, items[0]);
})()`;
