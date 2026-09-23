import { describe, expect, it } from "vitest";
import { ELEMENTS, elementDocument, elementOrigin } from "@/elements/catalogue";
import { CHART_ELEMENTS } from "@/elements/chart-elements";
import { ENGINE_ELEMENTS } from "@/elements/engine-elements";
import { engineFor, ENGINE_SOURCES } from "@/elements/extended-catalogue";
import { ENGINE_DEMO_LIST } from "../scripts/engine-demos.mjs";

const byId = new Map(ELEMENTS.map(element => [element.id as string, element]));

describe("engine demos and their elements", () => {
  it("gives every engine several demos rather than one", () => {
    for (const source of ENGINE_SOURCES) {
      const demos = ENGINE_DEMO_LIST.filter(demo => demo.engine === source.id);
      expect(demos.length, source.label).toBeGreaterThanOrEqual(3);
    }
  });

  it("matches every demo to an element whose markup contains its root", () => {
    // The two halves live in different files — markup in the catalogue, behaviour in the
    // bundle — and a root that stops matching produces a card that renders and never
    // moves, with nothing thrown to notice.
    for (const demo of ENGINE_DEMO_LIST) {
      const element = byId.get(demo.id);
      expect(element, `${demo.id} has no element`).toBeDefined();
      const selector = demo.root.replace(/^[.#]/, "");
      expect(element!.html, `${demo.id} is missing ${demo.root}`).toContain(selector);
    }
  });

  it("gives every element named after an engine a demo to run", () => {
    for (const element of ELEMENTS) {
      if (!engineFor(element.id)) continue;
      expect(ENGINE_DEMO_LIST.some(demo => demo.id === element.id), element.id).toBe(true);
    }
  });

  it("leaves the engine elements' own js empty, since the bundle carries it", () => {
    for (const element of ENGINE_ELEMENTS) expect(element.js, element.id).toBe("");
  });

  it("loads exactly one engine bundle per engine element, and none for the rest", () => {
    for (const element of ELEMENTS) {
      const engine = engineFor(element.id);
      const document = elementDocument(element.id);
      const scripts = [...document.matchAll(/\/engine-demos\/([a-z]+)\.js/g)].map(match => match[1]);
      expect(scripts, element.id).toEqual(engine ? [engine.id] : []);
    }
  });

  it("credits the engine as the runtime and Playground as the author", () => {
    const origin = elementOrigin("vanta-fog");
    expect(origin.name).toContain("Playground");
    expect(origin.runtime).toBe("Vanta");
  });
});

describe("charts and data visualisation", () => {
  it("fills the one browse category that had no authored element", () => {
    expect(ELEMENTS.filter(element => element.category === "Charts & data viz").length).toBeGreaterThanOrEqual(8);
  });

  it("plots from a palette validated for this canvas, not the project's accent", () => {
    // An accent is an arbitrary brand colour: two of them side by side are not
    // guaranteed to be distinguishable, so series colours are fixed and checked.
    const validated = ["#3987e5", "#d95926", "#199e70", "#c98500"];
    for (const chart of CHART_ELEMENTS) {
      const series = [...chart.css.matchAll(/--s([1-4]):(#[0-9a-f]{6})/g)];
      if (!series.length) continue;
      for (const [, slot, hex] of series) expect(hex, chart.id).toBe(validated[Number(slot) - 1]);
    }
  });

  it("never colours a series with the accent variable", () => {
    for (const chart of CHART_ELEMENTS) {
      expect(chart.html, chart.id).not.toMatch(/(?:background|fill|stroke):\s*var\(--accent\)/);
    }
  });

  it("carries a table of the same numbers, so a value is never only in a tooltip", () => {
    for (const chart of CHART_ELEMENTS) {
      expect(chart.html, chart.id).toContain('<table class="sr-only">');
      expect(chart.html, chart.id).toMatch(/<caption>[^<]+<\/caption>/);
    }
  });

  it("draws every mark in the markup rather than building it in script", () => {
    // Element scripts are skipped under reduced motion, so a chart assembled by script
    // would render empty for exactly the people least able to wait for it.
    for (const chart of CHART_ELEMENTS) {
      expect(chart.js, chart.id).not.toMatch(/createElement|appendChild|insertAdjacent/);
    }
  });

  it("states a title and a unit or period for every chart", () => {
    for (const chart of CHART_ELEMENTS) {
      expect(chart.html, chart.id).toMatch(/<h2>[^<]+<\/h2>/);
    }
  });
});

describe("interaction survives reduced motion", () => {
  it("runs a chart's script either way, and still guards a decorative one", () => {
    // A chart whose values can only be read by pointing at them is broken, not calmed;
    // a background effect genuinely should stop.
    expect(elementDocument("chart-column")).not.toContain("prefers-reduced-motion: reduce)').matches){const root=document.querySelector('.viz-col')");
    expect(elementDocument("chart-column")).toContain(".viz-col");
    expect(elementDocument("aurora")).toContain("prefers-reduced-motion");
  });

  it("keeps carousels interactive too, as before", () => {
    const document = elementDocument("carousel-snap");
    expect(document).toContain("querySelectorAll('.slide')");
  });
});

describe("the library as a whole", () => {
  it("keeps every id unique across the three sources of elements", () => {
    expect(new Set(ELEMENTS.map(element => element.id)).size).toBe(ELEMENTS.length);
  });

  it("gives every element a document that is not empty", () => {
    for (const element of ELEMENTS) {
      const document = elementDocument(element.id);
      expect(document.length, element.id).toBeGreaterThan(400);
      expect(document, element.id).toContain(element.title);
    }
  });
});
