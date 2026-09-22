import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { describeElement, curatedCount } from "@/elements/descriptions";
import { RegistryIndex } from "@/registry/schema";

const index = RegistryIndex.parse(
  JSON.parse(readFileSync(new URL("../data/registry-snapshot.json", import.meta.url), "utf-8")),
);

describe("element descriptions", () => {
  it("prefers the publisher's own text when it says something", () => {
    expect(describeElement({
      id: "kokonutui:ai-prompt",
      name: "ai-prompt",
      description: "Animated AI chat input with model selection.",
    })).toBe("Animated AI chat input with model selection.");
  });

  it("fills in the entries that publish nothing at all", () => {
    // All 55 Componentry items ship with an empty description.
    expect(describeElement({ id: "componentry:matrix-rain", name: "matrix-rain", description: "" }))
      .toBe("Falling columns of characters.");
  });

  it("replaces build boilerplate, which reads as a description but is not one", () => {
    const result = describeElement({
      id: "bklit:area-chart-example",
      name: "area-chart-example",
      title: "Area Chart Example",
      description: "Composable area-chart demo for Open in v0",
    });
    expect(result).not.toMatch(/Open in v0/);
    expect(result).toMatch(/sample data/);
  });

  it("falls back to a readable line derived from the name", () => {
    expect(describeElement({ id: "x:scroll-tilted-grid", name: "scroll-tilted-grid", description: "" }))
      .toBe("Scroll tilted grid.");
  });

  it("splits camelCase in the derived fallback", () => {
    expect(describeElement({ id: "x:LiquidEther", name: "LiquidEther", description: "" }))
      .toBe("Liquid ether.");
  });

  it("leaves no entry in the real catalogue without a description", () => {
    // The gap this closes: 56 entries showed nothing and 19 showed build boilerplate.
    const empty = index.elements.filter((e) => !describeElement(e).trim());
    expect(empty).toEqual([]);
  });

  it("removes the build boilerplate from the catalogue", () => {
    // Narrowly: KokonutUI publishes a component that genuinely *is* an "Open in v0"
    // button, and its description mentioning the phrase is correct. Only the generated
    // "demo/example for Open in v0" form is boilerplate.
    const remaining = index.elements.filter((e) =>
      /(demo|example)\s+for\s+Open\s+in\s+v0/i.test(describeElement(e)),
    );
    expect(remaining).toEqual([]);
  });

  it("covers every Componentry entry with a written line, not a derived one", () => {
    const componentry = index.elements.filter((e) => e.source === "componentry");
    const derived = componentry.filter((e) => describeElement(e) === `${e.name.replace(/-/g, " ")}.`);
    expect(componentry.length).toBeGreaterThan(50);
    expect(derived).toEqual([]);
  });

  it("is an override layer, so a refresh cannot undo it", () => {
    // Curated lines live in source, not in the snapshot the weekly refresh rewrites.
    expect(curatedCount()).toBeGreaterThan(50);
  });
});
