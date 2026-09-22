/**
 * Browse categories, shared by the authored originals and the registry catalogue.
 *
 * These are deliberately distinct from the `RoutingCategory` on `DesignElement`, which
 * stays per-source because that is how ownership is assigned upstream and what the
 * export contract refers to. Per-source is simply the wrong axis for *browsing*: it put
 * all 205 React Bits entries under one heading and left "Hover effects" showing three,
 * while text animations published by four different registries sat in four separate
 * buckets. A source is not a subject.
 *
 * So browsing gets a derived facet of its own. The spec rules out inventing a per-item
 * classifier for routing, and this does not touch routing — it is a display-time
 * grouping computed from metadata the registries already publish, and the UI labels it
 * as derived rather than passing it off as the publisher's own taxonomy.
 */

export const BROWSE_CATEGORIES = [
  "Text animations",
  "Backgrounds",
  "Hover effects",
  "Scroll effects",
  "Cursor effects",
  "Carousels",
  "Galleries & media",
  "Layout blocks",
  "Buttons & inputs",
  "Loaders & feedback",
  "Charts & data viz",
  "Signature effects",
  "Hooks & utilities",
] as const;
export type BrowseCategory = (typeof BROWSE_CATEGORIES)[number];

/**
 * Hooks, helpers and barrel files.
 *
 * Checked before anything else and against the name alone. Every registry publishes
 * these alongside its components — `useAutoHeight`, `Utils`, `index` — and they are not
 * visual at all, so filing them under a visual heading would be actively misleading and
 * would put an un-previewable entry in a grid of previews.
 */
// Two patterns because the two signals need different casing. The camelCase form
// (`useAutoHeight`) is only recognisable with case intact; the word forms (`Utils`,
// `index`) are published in every casing, so those are matched case-insensitively.
const HOOK_CASED = /(^|[^a-zA-Z])use[A-Z]|(^|\s)Use\s[A-Z]/;
const HOOK_WORD = /^use-|\butils?\b|^index$|-hook|\bhooks\b/i;

/**
 * Ordered rules; the first match wins.
 *
 * The order is the whole design. Many titles carry two signals — "Scroll Reveal Text"
 * is a scroll effect applied to text, "Magnet Button" is a hover effect that happens to
 * be a button — and the earlier rule is the one naming what the component *is* rather
 * than what it acts on or is built from. Reordering these silently reshuffles the
 * catalogue, so the cases that fixed each position are covered in tests.
 */
const RULES: Array<{ category: BrowseCategory; match: RegExp }> = [
  { category: "Carousels", match: /\bcarousel|slideshow|coverflow\b/ },
  { category: "Charts & data viz", match: /\bchart|graph|plot|axis|sparkline|candlestick|histogram|heatmap|treemap|funnel|radar|scatter|gauge|calendar|bar|line|pie|donut|series|legend|tick\b/ },
  { category: "Cursor effects", match: /\bcursor|pointer|crosshair|mouse|trail|eye track\b/ },
  // Before text: "Scroll Reveal Text" is a scroll effect, not a text animation.
  { category: "Scroll effects", match: /\bscroll|parallax|marquee|sticky|pinned|scrub|velocity|lenis\b/ },
  { category: "Text animations", match: /\btext|typewriter|typing|letter|word|headline|typograph|kinetic|shimmer|glitch|decrypt|scramble|ascii|flap|counter|number\b/ },
  { category: "Loaders & feedback", match: /\bloader|loading|spinner|skeleton|progress|toast|notification|alert\b/ },
  // Before backgrounds: "Magnet Button" pulls particles, but the effect is the hover.
  { category: "Hover effects", match: /\bhover|tilt|magnet|magnetic|spotlight|glow|shine|lift|proximity|ripple\b/ },
  { category: "Galleries & media", match: /\bgallery|slider|lightbox|image|photo|masonry|media|video|album|stack|folder\b/ },
  { category: "Backgrounds", match: /\bbackground|backdrop|aurora|particle|starfield|noise|beam|plasma|wave|mesh|orb|ambient|grain|dither|blob|fluid|squares|liquid|chrome|prism|pixel|matrix|laser|tunnel|hyperspeed|ballpit|ribbon|webgl|shader|glass|metallic|ether|snow|spectral|circuit|balatro|antigravity|aero|acid\b/ },
  { category: "Layout blocks", match: /\bhero|pricing|footer|nav|header|bento|testimonial|feature|faq|banner|section|layout|sidebar|dashboard|profile|team|keyboard|player|list\b/ },
  { category: "Buttons & inputs", match: /\bbutton|input|form|field|select|checkbox|radio|toggle|switch|dropdown|menu|search|textarea|combobox|tabs|accordion|dialog|modal|popover|tooltip|chip|drawer|icons?\b/ },
];

/**
 * Normalizes an identifier into matchable words.
 *
 * Splitting camelCase is load-bearing rather than cosmetic: React Bits publishes every
 * one of its ~205 components in PascalCase, so without this a word boundary never
 * matches mid-name and `AccordionGallery` can only ever match its first word.
 */
function words(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_/]+/g, " ")
    .toLowerCase();
}

/** Per-source default, used when nothing in an entry's own text is decisive. */
const SOURCE_DEFAULT: Record<string, BrowseCategory> = {
  bklit: "Charts & data viz",
  kokonutui: "Layout blocks",
  soralabs: "Scroll effects",
  componentry: "Signature effects",
  "react-bits": "Signature effects",
};

/**
 * Classifies one catalogue entry for browsing.
 *
 * Name and title are matched first, and the description only if they decide nothing.
 * Descriptions are written for humans and nearly all of them mention how the thing was
 * built — "with gradient fills", "using Motion spring animations", "built with React and
 * Tailwind" — so letting them compete on equal terms filed Bklit's chart parts under
 * Backgrounds. The name is what the component is called; the description is colour.
 *
 * Falling back to the source keeps the spec's per-source assignment as the default and
 * treats the keyword rules as an override for when an entry clearly says otherwise.
 */
export function browseCategory(input: {
  name?: string;
  title?: string;
  description?: string;
  source?: string;
}): BrowseCategory {
  const identity = `${input.name ?? ""} ${input.title ?? ""}`.trim();
  if (HOOK_CASED.test(identity) || HOOK_WORD.test(identity)) return "Hooks & utilities";

  const strong = words(`${input.name ?? ""} ${input.title ?? ""}`);
  for (const rule of RULES) if (rule.match.test(strong)) return rule.category;

  const weak = words(input.description ?? "");
  for (const rule of RULES) if (rule.match.test(weak)) return rule.category;

  return SOURCE_DEFAULT[input.source ?? ""] ?? "Signature effects";
}
