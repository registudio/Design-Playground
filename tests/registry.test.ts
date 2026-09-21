import { describe, expect, it } from "vitest";
import {
  collapseVariants,
  inferEngines,
  normalizeDocument,
  packageName,
  parseVariant,
} from "@/registry/normalize";
import {
  categoryCounts,
  emptyQuery,
  engineCounts,
  filterElements,
  sourceCounts,
  stalenessOf,
} from "@/registry/query";
import { emptyIndex, RegistryIndex, type DesignElement } from "@/registry/schema";
import { installCommand, REGISTRY_SOURCES, sourceById } from "@/registry/sources";

const VERIFIED = "2026-09-21T00:00:00.000Z";
const reactBits = sourceById("react-bits")!;
const kokonut = sourceById("kokonutui")!;
const componentry = sourceById("componentry")!;

/** The confirmed item shape from §1a. */
function item(name: string, extra: Record<string, unknown> = {}) {
  return {
    name,
    type: "registry:component",
    title: `Title ${name}`,
    description: "A component.",
    dependencies: [],
    registryDependencies: [],
    files: [{ path: `components/${name}.tsx`, type: "registry:component" }],
    ...extra,
  };
}

describe("dependency parsing", () => {
  it("strips version specifiers but keeps scopes intact", () => {
    expect(packageName("motion")).toBe("motion");
    expect(packageName("motion@^11.0.0")).toBe("motion");
    expect(packageName("@gsap/react")).toBe("@gsap/react");
    expect(packageName("@gsap/react@2.1.0")).toBe("@gsap/react");
  });

  it("recognises both spellings of the Motion package", () => {
    expect(inferEngines(["motion"])).toEqual(["motion"]);
    expect(inferEngines(["framer-motion"])).toEqual(["motion"]);
  });

  it("recognises GSAP plugins as GSAP", () => {
    expect(inferEngines(["@gsap/react"])).toEqual(["gsap"]);
  });

  it("ignores packages that are not engines", () => {
    expect(inferEngines(["lucide-react", "clsx"])).toEqual([]);
  });

  it("returns a stable order regardless of how dependencies were listed", () => {
    expect(inferEngines(["gsap", "motion"])).toEqual(inferEngines(["motion", "gsap"]));
  });
});

describe("React Bits variant collapsing (§1a)", () => {
  it("parses the four-way suffix", () => {
    expect(parseVariant("ClickSpark-TS-TW")).toEqual({
      base: "ClickSpark",
      variant: { language: "TS", styling: "TW" },
    });
    expect(parseVariant("Plain")).toBeNull();
  });

  it("keeps a hyphenated component name intact", () => {
    expect(parseVariant("Magnet-Lines-JS-CSS")?.base).toBe("Magnet-Lines");
  });

  it("collapses four published entries into one", () => {
    const elements = collapseVariants(
      reactBits,
      ["ClickSpark-JS-CSS", "ClickSpark-JS-TW", "ClickSpark-TS-CSS", "ClickSpark-TS-TW"].map(
        (name) => item(name),
      ),
      VERIFIED,
    );

    expect(elements).toHaveLength(1);
    expect(elements[0]!.name).toBe("ClickSpark");
    expect(elements[0]!.availableVariants).toHaveLength(4);
  });

  it("defaults to the TS + Tailwind variant, which is what this scaffold uses", () => {
    const elements = collapseVariants(
      reactBits,
      ["ClickSpark-JS-CSS", "ClickSpark-TS-TW"].map((name) => item(name)),
      VERIFIED,
    );
    expect(elements[0]!.variant).toEqual({ language: "TS", styling: "TW" });
  });

  it("falls back to the best available variant when TS-TW is not published", () => {
    const elements = collapseVariants(
      reactBits,
      ["ClickSpark-JS-CSS", "ClickSpark-TS-CSS"].map((name) => item(name)),
      VERIFIED,
    );
    expect(elements[0]!.variant).toEqual({ language: "TS", styling: "CSS" });
  });

  it("keys the id off the base name so a selection survives a variant being dropped", () => {
    const withAll = collapseVariants(
      reactBits,
      ["ClickSpark-JS-CSS", "ClickSpark-TS-TW"].map((name) => item(name)),
      VERIFIED,
    );
    const withFewer = collapseVariants(reactBits, [item("ClickSpark-TS-TW")], VERIFIED);
    expect(withAll[0]!.id).toBe(withFewer[0]!.id);
    expect(withAll[0]!.id).toBe("react-bits:ClickSpark");
  });

  it("installs the concrete published item, not the collapsed base name", () => {
    const elements = collapseVariants(reactBits, [item("ClickSpark-TS-TW")], VERIFIED);
    expect(elements[0]!.installCommand).toBe(
      "npx shadcn@latest add @react-bits/ClickSpark-TS-TW",
    );
  });

  it("passes through an entry that carries no variant suffix", () => {
    const elements = collapseVariants(reactBits, [item("Plain")], VERIFIED);
    expect(elements[0]!.name).toBe("Plain");
    expect(elements[0]!.variant).toBeUndefined();
  });
});

describe("normalizing a registry document (§2, §3)", () => {
  it("maps the confirmed §1a item shape onto a DesignElement", () => {
    const { elements, status } = normalizeDocument(
      kokonut,
      {
        $schema: "https://ui.shadcn.com/schema/registry.json",
        name: "kokonutui",
        homepage: "https://kokonutui.com",
        items: [
          item("ai-prompt", {
            title: "AI Input Selector",
            description: "Animated AI chat input with model selection...",
            dependencies: ["lucide-react", "motion"],
            registryDependencies: ["textarea", "button", "dropdown-menu"],
          }),
        ],
      },
      VERIFIED,
    );

    expect(status.ok).toBe(true);
    expect(elements[0]).toMatchObject({
      id: "kokonutui:ai-prompt",
      title: "AI Input Selector",
      source: "kokonutui",
      category: "layout-blocks",
      installCommand: "npx shadcn@latest add @kokonutui/ai-prompt",
      npmDependencies: ["lucide-react", "motion"],
      registryDependencies: ["textarea", "button", "dropdown-menu"],
      engineDependency: ["motion"],
      referenceOnly: false,
      lastVerified: VERIFIED,
    });
  });

  it("assigns category per source, never per item (§6)", () => {
    const { elements } = normalizeDocument(
      kokonut,
      { items: [item("a-chart-looking-thing"), item("some-cursor-effect")] },
      VERIFIED,
    );
    expect(elements.every((element) => element.category === "layout-blocks")).toBe(true);
  });

  it("flags Componentry as reference-only (§1c)", () => {
    const { elements } = normalizeDocument(componentry, { items: [item("shine")] }, VERIFIED);
    expect(elements[0]!.referenceOnly).toBe(true);
  });

  it("skips a malformed item instead of losing the whole registry", () => {
    const { elements, status } = normalizeDocument(
      kokonut,
      { items: [item("good"), { title: "no name field" }, item("also-good")] },
      VERIFIED,
    );
    expect(elements).toHaveLength(2);
    expect(status.ok).toBe(true);
    expect(status.skipped).toBe(1);
  });

  it("tolerates items missing optional fields", () => {
    const { elements } = normalizeDocument(kokonut, { items: [{ name: "bare" }] }, VERIFIED);
    expect(elements[0]).toMatchObject({ title: "bare", description: "", npmDependencies: [] });
  });

  it("reports a response that is not a registry document", () => {
    const { elements, status } = normalizeDocument(kokonut, { nope: true }, VERIFIED);
    expect(elements).toEqual([]);
    expect(status.ok).toBe(false);
    expect(status.error).toContain("not a registry document");
  });

  it("emits a stable order, so an unchanged refresh rewrites nothing", () => {
    const forward = normalizeDocument(kokonut, { items: [item("b"), item("a")] }, VERIFIED);
    const reverse = normalizeDocument(kokonut, { items: [item("a"), item("b")] }, VERIFIED);
    expect(forward.elements.map((e) => e.id)).toEqual(reverse.elements.map((e) => e.id));
  });
});

describe("registry sources", () => {
  it("covers the five sources in §1a, each with its own category", () => {
    expect(REGISTRY_SOURCES).toHaveLength(5);
    expect(new Set(REGISTRY_SOURCES.map((s) => s.category)).size).toBe(5);
  });

  it("marks exactly Componentry as reference-only", () => {
    expect(REGISTRY_SOURCES.filter((s) => s.referenceOnly).map((s) => s.id)).toEqual([
      "componentry",
    ]);
  });

  it("builds the install command in §5's form", () => {
    expect(installCommand("soralabs", "text-effect")).toBe(
      "npx shadcn@latest add @soralabs/text-effect",
    );
  });
});

// --- Browsing ---------------------------------------------------------------

function element(overrides: Partial<DesignElement>): DesignElement {
  return {
    id: "kokonutui:x",
    name: "x",
    title: "X",
    description: "",
    source: "kokonutui",
    category: "layout-blocks",
    installCommand: "npx shadcn@latest add @kokonutui/x",
    npmDependencies: [],
    registryDependencies: [],
    availableVariants: [],
    engineDependency: [],
    referenceOnly: false,
    lastVerified: VERIFIED,
    ...overrides,
  };
}

describe("search and faceting", () => {
  const elements = [
    element({ id: "a", title: "Scroll Reveal", description: "Reveals on scroll" }),
    element({ id: "b", title: "Click Spark", source: "react-bits", category: "micro-interactions" }),
    element({ id: "c", title: "Shine Border", source: "componentry", category: "signature-polish", referenceOnly: true }),
    element({ id: "d", title: "Parallax Text", source: "soralabs", category: "text-scroll-effects", engineDependency: ["gsap"] }),
  ];

  it("requires every term to match, so more words narrow the result", () => {
    expect(filterElements(elements, { ...emptyQuery(), text: "scroll" })).toHaveLength(1);
    expect(filterElements(elements, { ...emptyQuery(), text: "scroll reveal" })).toHaveLength(1);
    expect(filterElements(elements, { ...emptyQuery(), text: "scroll spark" })).toHaveLength(0);
  });

  it("searches description as well as title", () => {
    expect(filterElements(elements, { ...emptyQuery(), text: "reveals on" })).toHaveLength(1);
  });

  it("ignores case", () => {
    expect(filterElements(elements, { ...emptyQuery(), text: "CLICK" })).toHaveLength(1);
  });

  it("filters by source, category and engine", () => {
    expect(filterElements(elements, { ...emptyQuery(), sources: ["react-bits"] })).toHaveLength(1);
    expect(
      filterElements(elements, { ...emptyQuery(), categories: ["signature-polish"] }),
    ).toHaveLength(1);
    expect(filterElements(elements, { ...emptyQuery(), engines: ["gsap"] })).toHaveLength(1);
  });

  it("hides reference-only entries when asked (§1c)", () => {
    const installable = filterElements(elements, { ...emptyQuery(), installableOnly: true });
    expect(installable.map((e) => e.id)).not.toContain("c");
  });

  it("keeps other sources' counts visible while one source is selected", () => {
    // Without lifting the source facet these would all read 0 and the chips would
    // become a dead end rather than a way to move between sources.
    const counts = sourceCounts(elements, { ...emptyQuery(), sources: ["react-bits"] });
    expect(counts["react-bits"]).toBe(1);
    expect(counts["soralabs"]).toBe(1);
  });

  it("still narrows a facet by the other facets", () => {
    const counts = categoryCounts(elements, { ...emptyQuery(), text: "spark" });
    expect(counts["micro-interactions"]).toBe(1);
    expect(counts["layout-blocks"]).toBeUndefined();
  });

  it("counts an element needing both engines under each of them", () => {
    // Deliberately not tallied like the other facets: these counts may legitimately
    // sum past the row count, where a single-key tally would undercount.
    const both = [element({ id: "e", engineDependency: ["motion", "gsap"] })];
    expect(engineCounts(both, emptyQuery())).toEqual({ motion: 1, gsap: 1 });
  });

  it("reports zero for an engine nothing needs, rather than omitting it", () => {
    expect(engineCounts([element({})], emptyQuery())).toEqual({ motion: 0, gsap: 0 });
  });

  it("counts agree with the number of rows actually shown", () => {
    const query = { ...emptyQuery(), text: "s" };
    const counts = sourceCounts(elements, query);
    const shown = filterElements(elements, query);
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    expect(total).toBe(shown.length);
  });
});

describe("staleness (§3)", () => {
  const index = (overrides: Partial<RegistryIndex>): RegistryIndex => ({
    ...emptyIndex(),
    ...overrides,
  });

  it("reports an index that has never been fetched as empty", () => {
    expect(stalenessOf(emptyIndex())).toMatchObject({ empty: true, stale: true });
  });

  it("treats a fresh fetch as current", () => {
    const now = new Date("2026-09-21T12:00:00Z");
    const result = stalenessOf(index({ fetchedAt: "2026-09-20T12:00:00Z" }), now);
    expect(result).toMatchObject({ empty: false, stale: false, daysOld: 1 });
  });

  it("treats a week-old fetch as stale, since contents move that fast upstream", () => {
    const now = new Date("2026-09-21T12:00:00Z");
    expect(stalenessOf(index({ fetchedAt: "2026-09-14T12:00:00Z" }), now).stale).toBe(true);
  });

  it("treats an unparseable timestamp as stale rather than current", () => {
    expect(stalenessOf(index({ fetchedAt: "not a date" })).stale).toBe(true);
  });

  it("names the sources whose last refresh failed", () => {
    const result = stalenessOf(
      index({
        fetchedAt: new Date().toISOString(),
        sources: [
          { id: "bklit", ok: true, itemCount: 5, skipped: 0, lastVerified: VERIFIED },
          { id: "soralabs", ok: false, itemCount: 0, skipped: 0, lastVerified: null, error: "boom" },
        ],
      }),
    );
    expect(result.failed).toEqual(["soralabs"]);
  });
});
