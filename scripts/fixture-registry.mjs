import { writeFileSync } from "node:fs";

/**
 * Writes a fixture element index for scripts/e2e-elements.mjs.
 *
 * The committed snapshot at data/registry-snapshot.json ships empty on purpose: a
 * hand-written entry produces an install command that fails when someone runs it, and
 * spec §3 is clear that a wrong entry is worse than a missing one. This fixture exists
 * so the browser UI can be exercised without the network, and is written to a path
 * given on the command line — never over the committed snapshot.
 *
 * Names here are invented and are not real registry components. Nothing this produces
 * should ever be committed as the snapshot or shown to anyone as a catalogue.
 *
 *   node scripts/fixture-registry.mjs /tmp/fixture-index.json
 */

const target = process.argv[2];
if (!target) {
  console.error("usage: node scripts/fixture-registry.mjs <output-path>");
  process.exit(1);
}
if (target.includes("data/registry-snapshot.json")) {
  console.error("refusing to overwrite the committed snapshot with fixture data");
  process.exit(1);
}

const lastVerified = new Date().toISOString();

const SOURCES = {
  bklit: "charts",
  kokonutui: "layout-blocks",
  soralabs: "text-scroll-effects",
  componentry: "signature-polish",
  "react-bits": "micro-interactions",
};

function element(source, name, title, description, extra = {}) {
  return {
    id: `${source}:${name}`,
    name,
    title,
    description,
    source,
    category: SOURCES[source],
    installCommand: `npx shadcn@latest add @${source}/${extra.installName ?? name}`,
    npmDependencies: extra.npmDependencies ?? [],
    registryDependencies: extra.registryDependencies ?? [],
    availableVariants: extra.availableVariants ?? [],
    engineDependency: extra.engineDependency ?? [],
    referenceOnly: source === "componentry",
    lastVerified,
    ...(extra.variant ? { variant: extra.variant } : {}),
  };
}

const ALL_VARIANTS = [
  { language: "TS", styling: "TW" },
  { language: "TS", styling: "CSS" },
  { language: "JS", styling: "TW" },
  { language: "JS", styling: "CSS" },
];

const elements = [
  element("bklit", "area-chart", "Area Chart", "Filled line chart with a gradient body.", {
    npmDependencies: ["recharts"],
    registryDependencies: ["card"],
  }),
  element("bklit", "bar-chart", "Bar Chart", "Grouped and stacked bars.", {
    npmDependencies: ["recharts"],
  }),
  element("bklit", "sparkline", "Sparkline", "Inline trend line sized to its container.", {}),

  element("kokonutui", "ai-prompt", "AI Input Selector", "Animated chat input with model selection.", {
    npmDependencies: ["lucide-react", "motion"],
    registryDependencies: ["textarea", "button", "dropdown-menu"],
    engineDependency: ["motion"],
  }),
  element("kokonutui", "pricing-table", "Pricing Table", "Three-tier pricing block with a toggle.", {
    registryDependencies: ["card", "button"],
  }),
  element("kokonutui", "bento-grid", "Bento Grid", "Asymmetric feature grid.", {}),

  element("soralabs", "text-effect", "Text Effect", "Per-character reveal driven by scroll position.", {
    npmDependencies: ["motion", "gsap"],
    engineDependency: ["gsap", "motion"],
  }),
  element("soralabs", "scroll-progress", "Scroll Progress", "Reading progress bar pinned to the viewport.", {
    npmDependencies: ["gsap"],
    engineDependency: ["gsap"],
  }),
  element("soralabs", "parallax-section", "Parallax Section", "Layered section that scrubs on scroll.", {
    npmDependencies: ["gsap"],
    engineDependency: ["gsap"],
  }),

  element("componentry", "shine-border", "Shine Border", "Animated gradient border sweep.", {}),
  element("componentry", "noise-overlay", "Noise Overlay", "Film-grain texture layer.", {}),

  element("react-bits", "ClickSpark", "Click Spark", "Particle burst on pointer press.", {
    installName: "ClickSpark-TS-TW",
    variant: { language: "TS", styling: "TW" },
    availableVariants: ALL_VARIANTS,
  }),
  element("react-bits", "MagnetLines", "Magnet Lines", "Line field that leans toward the cursor.", {
    installName: "MagnetLines-TS-TW",
    variant: { language: "TS", styling: "TW" },
    availableVariants: ALL_VARIANTS,
  }),
  element("react-bits", "BlurText", "Blur Text", "Words resolve from blur on mount.", {
    installName: "BlurText-TS-TW",
    variant: { language: "TS", styling: "TW" },
    availableVariants: ALL_VARIANTS,
    npmDependencies: ["motion"],
    engineDependency: ["motion"],
  }),
];

elements.sort((a, b) => a.id.localeCompare(b.id));

const index = {
  schema: "dp-registry-index/v1",
  fetchedAt: lastVerified,
  sources: Object.keys(SOURCES).map((id) => ({
    id,
    ok: true,
    itemCount: elements.filter((e) => e.source === id).length,
    skipped: 0,
    lastVerified,
  })),
  elements,
};

writeFileSync(target, `${JSON.stringify(index, null, 2)}\n`);
console.log(`wrote ${elements.length} fixture elements to ${target}`);
