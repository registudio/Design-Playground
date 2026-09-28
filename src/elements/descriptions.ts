/**
 * Editorial descriptions for catalogue entries whose published text does not help.
 *
 * Three problems, in order of how badly they hurt: 55 of Componentry's 55 items publish
 * no description at all, 19 of Bklit's carry build boilerplate ("Composable area-chart
 * demo for Open in v0") that says nothing about the component, and a handful are too
 * terse to distinguish from their neighbours.
 *
 * This is an override layer rather than an edit to the snapshot: the snapshot is a cache
 * that a refresh rewrites wholesale, so anything written into it would be lost the next
 * Monday. Published text still wins wherever it is useful — this only fills gaps, which
 * is also why it does not go stale when a publisher finally writes one.
 */

/**
 * Keyed by element id. Componentry's names are descriptive enough to write from, which
 * is what makes hand-writing all 55 tractable; they are still guesses about behaviour
 * drawn from the name, not from having run each one.
 */
const CURATED: Record<string, string> = {
  "componentry:animated-gradient": "A gradient that drifts continuously behind its content.",
  "componentry:annotated-text": "Handwritten-looking marks — circles, underlines, arrows — drawn over a line of text.",
  "componentry:ascii-effect": "Imagery rendered as ASCII characters.",
  "componentry:aurora-flow": "Slow bands of light moving like an aurora.",
  "componentry:case-study-flip-stack": "A stack of case-study cards that flips through one at a time.",
  "componentry:circuit-board": "Traces that light up and travel like a printed circuit.",
  "componentry:closing-plasma": "A plasma field that contracts toward the centre.",
  "componentry:collection-surfer": "A browsing view that glides through a collection of items.",
  "componentry:cursor-driven-particle-typography": "Type built from particles that scatter away from the pointer.",
  "componentry:dither-gradient": "A gradient rendered with visible dithering, for a retro print feel.",
  "componentry:dither-prism-hero": "A hero section with a dithered, prism-split colour wash.",
  "componentry:dithered-logo": "A logo treatment using ordered dithering.",
  "componentry:eye-tracking": "Eyes that follow the pointer around the page.",
  "componentry:fisheye-infinite-grid": "An endless grid distorted through a fisheye lens under the pointer.",
  "componentry:flight-status-card": "A boarding-pass style status card.",
  "componentry:flipping-word-swap": "One word in a headline flips over to become the next.",
  "componentry:github-calendar": "A contribution-graph style activity calendar.",
  "componentry:gradient-hero-01": "A hero section led by a large soft gradient.",
  "componentry:grain-gradient": "A gradient with film grain laid over it.",
  "componentry:hero-geometric": "A hero built from overlapping geometric shapes.",
  "componentry:hover-transition": "A considered transition between two states on hover.",
  "componentry:image-ripple-effect": "Ripples that spread across an image from the pointer.",
  "componentry:image-trail": "Images left behind in the pointer's wake.",
  "componentry:infinite-image-field": "A field of images that pans on forever in any direction.",
  "componentry:kinetic-text-reveal": "Text that arrives with sharp, kinetic motion.",
  "componentry:layered-stack": "Cards layered in depth, peeling forward one by one.",
  "componentry:letter-cascade": "Letters falling into place one after another.",
  "componentry:liquid-chrome": "A molten chrome surface that flows as it moves.",
  "componentry:mac-keyboard": "An interactive keyboard that responds to real key presses.",
  "componentry:magnet-lines": "A field of lines that all lean toward the pointer.",
  "componentry:magnetic-dock": "A dock whose icons swell as the pointer passes, like the macOS dock.",
  "componentry:matrix-rain": "Falling columns of characters.",
  "componentry:music-player": "A compact player with transport controls and artwork.",
  "componentry:newsletter-bookshelf": "Back issues arranged as books on a shelf.",
  "componentry:orbit-card-stack": "Cards orbiting a centre point.",
  "componentry:pixel-canvas": "A canvas of pixels that react to the pointer.",
  "componentry:pixel-image-trail": "A pixelated trail of images following the pointer.",
  "componentry:pricing-01": "A pricing section with side-by-side plans.",
  "componentry:pricing-02": "A second pricing layout, with the recommended plan emphasised.",
  "componentry:prism-gradient": "Light split into a prism spectrum across the surface.",
  "componentry:ripple-transition": "A ripple that expands to carry one view into the next.",
  "componentry:scroll-based-velocity": "Content whose speed responds to how fast you scroll.",
  "componentry:scroll-choreography": "A sequence of moves timed to scroll position.",
  "componentry:scroll-split-card": "A card that splits apart as it passes through the viewport.",
  "componentry:scroll-tilted-grid": "A grid that tilts in perspective as you scroll.",
  "componentry:signature": "A signature drawn on as if written by hand.",
  "componentry:silk-aurora": "A soft, silk-like aurora wash.",
  "componentry:spectral-ribbon": "A ribbon of spectral colour winding through the frame.",
  "componentry:spiral-3d-slider": "A slider whose items follow a three-dimensional spiral.",
  "componentry:split-flap-display": "A mechanical split-flap board, the kind in old railway stations.",
  "componentry:sticky-scroll-cards": "Cards that stick in place while the next one arrives over them.",
  "componentry:text-morph": "One word morphing continuously into another.",
  "componentry:text-repel": "Letters that push away from the pointer and settle back.",
  "componentry:webgl-liquid": "A WebGL liquid surface that reacts to movement.",
  "componentry:wheel-carousel": "A carousel whose items arc around like a wheel.",

  "bklit:chart-grid": "Grid lines and axes for a chart, styled to sit behind the data rather than compete with it.",

  // Bklit's worked examples all publish the same scaffold line, so without these every
  // one read "A worked … chart with sample data" — true, and no help choosing between
  // a funnel and a sankey. Each says what the chart is for.
  "bklit:area-chart-example": "Worked example — an area chart, shaded beneath the line to show how a total changes over time.",
  "bklit:bar-chart-example": "Worked example — a bar chart comparing values across categories.",
  "bklit:candlestick-chart-example": "Worked example — a candlestick chart of open, high, low and close prices per period.",
  "bklit:choropleth-chart-example": "Worked example — a choropleth map shading regions by their value.",
  "bklit:composed-chart-example": "Worked example — bars, lines and areas layered on shared axes.",
  "bklit:funnel-chart-example": "Worked example — a funnel showing how many drop out between stages, such as sign-up steps.",
  "bklit:gauge-chart-example": "Worked example — a gauge reading one value against its range.",
  "bklit:heatmap-chart-example": "Worked example — a heatmap colouring a grid of cells by intensity.",
  "bklit:line-chart-example": "Worked example — a line chart tracing values over time.",
  "bklit:live-line-chart-example": "Worked example — a line chart that streams in new points as they arrive.",
  "bklit:pie-chart-example": "Worked example — a pie chart dividing a whole into proportional slices.",
  "bklit:radar-chart-example": "Worked example — a radar chart comparing several measures on radial axes.",
  "bklit:ring-chart-example": "Worked example — a ring (donut) chart of proportions around a hollow centre.",
  "bklit:sankey-chart-example": "Worked example — a Sankey diagram of flows between stages, each band sized by volume.",
  "bklit:scatter-chart-example": "Worked example — a scatter plot of points on two axes, for spotting a relationship.",
  "bklit:sunburst-chart-example": "Worked example — a sunburst showing a hierarchy as concentric rings.",

  "soralabs:index": "The library's index file, re-exporting its components — not a component itself.",
};

/**
 * Text that carries no information about the component.
 *
 * Several publishers generate a description from their build tooling, which produces
 * lines naming the scaffold rather than the thing — worse than nothing, because it
 * reads as a real description and occupies the space one would go in.
 */
const BOILERPLATE = /\b(demo|example)\s+for\s+Open\s+in\s+v0\b/i;

/** Turns `scroll-tilted-grid` into `Scroll tilted grid`. */
function fromName(name: string): string {
  const words = name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .trim()
    .toLowerCase();
  return words ? words[0]!.toUpperCase() + words.slice(1) : "";
}

/**
 * The description to show for one entry.
 *
 * Order matters: a curated line is the most deliberate, published text is the
 * publisher's own voice and is preferred over anything derived, and the name-derived
 * line is a last resort that at least says what the thing is called in a readable way.
 */
export function describeElement(input: {
  id?: string;
  name?: string;
  title?: string;
  description?: string;
}): string {
  const curated = input.id ? CURATED[input.id] : undefined;
  if (curated) return curated;

  const published = (input.description ?? "").trim();
  if (published && !BOILERPLATE.test(published)) return published;

  // Some publishers write a real description and then append the scaffold line to it
  // ("Revenue stat card with … trend badge — demo for Open in v0"). Keep their part.
  const salvaged = published.replace(/\s*[—–-]\s*(demo|example)\s+for\s+Open\s+in\s+v0\.?\s*$/i, "").trim();
  if (salvaged !== published && salvaged.split(/\s+/).length >= 3 && !BOILERPLATE.test(salvaged)) return `${salvaged.replace(/[.,;:]$/, "")}.`;

  // A worked example is still worth describing as one, rather than as its scaffold.
  if (published && BOILERPLATE.test(published)) {
    const subject = fromName(input.title ?? input.name ?? "").replace(/\s*example$/i, "");
    return subject ? `A worked ${subject.toLowerCase()} with sample data.` : "A worked example with sample data.";
  }

  const derived = fromName(input.title ?? input.name ?? "");
  return derived ? `${derived}.` : "";
}

/** Exposed for tests and for reporting how much of the catalogue still has no text. */
export function curatedCount(): number {
  return Object.keys(CURATED).length;
}
