import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BROWSE_CATEGORIES, browseCategory } from "@/elements/taxonomy";
import { ELEMENTS } from "@/elements/catalogue";
import { RegistryIndex } from "@/registry/schema";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * The classifier is ordered rules over free text, so the tests below are mostly the
 * specific cases that fixed each rule's position. Reordering the rules to fix one
 * entry tends to break another, and these record which trade-offs were chosen.
 */
describe("browse categories", () => {
  const of = (name: string, description = "", source = "react-bits") =>
    browseCategory({ name, title: name, description, source });

  it("splits camelCase, or a PascalCase name can only match its first word", () => {
    // React Bits publishes ~205 components this way, so this is load-bearing.
    expect(of("AccordionGallery")).toBe("Galleries & media");
    expect(of("FallingText")).toBe("Text animations");
    expect(of("PillNav")).toBe("Layout blocks");
  });

  it("reads a scroll effect applied to text as a scroll effect", () => {
    expect(of("Scroll Reveal Text")).toBe("Scroll effects");
  });

  it("reads a button with a hover effect as a hover effect", () => {
    expect(of("Magnet Button", "Magnetic button that pulls particles on hover")).toBe("Hover effects");
  });

  it("keeps a plain button in Buttons & inputs", () => {
    expect(of("Base Button")).toBe("Buttons & inputs");
  });

  it("files hooks and utilities apart from anything visual", () => {
    // They cannot be previewed, so a visual heading would be actively misleading.
    expect(of("useAutoHeight")).toBe("Hooks & utilities");
    expect(of("Use Mobile")).toBe("Hooks & utilities");
    expect(of("Utils")).toBe("Hooks & utilities");
  });

  it("does not let a description decide what the name already settles", () => {
    // Nearly every description names the build stack; letting those compete equally
    // filed Bklit's chart parts under Backgrounds.
    expect(of("Bar Depth", "3D depth and glossy glass surfaces for BarChart bars", "bklit"))
      .toBe("Charts & data viz");
  });

  it("still uses the description when the name settles nothing", () => {
    expect(of("Nebula", "An ambient particle background", "react-bits")).toBe("Backgrounds");
  });

  it("falls back to the source when nothing in the entry is decisive", () => {
    expect(browseCategory({ name: "Zzz", title: "Zzz", description: "", source: "bklit" }))
      .toBe("Charts & data viz");
    expect(browseCategory({ name: "Zzz", title: "Zzz", description: "", source: "kokonutui" }))
      .toBe("Layout blocks");
  });

  it("always returns a category in the published list", () => {
    const index = RegistryIndex.parse(
      JSON.parse(readFileSync(join(__dirname, "../data/registry-snapshot.json"), "utf-8")),
    );
    for (const element of index.elements) {
      expect(BROWSE_CATEGORIES).toContain(browseCategory(element));
    }
  });

  it("spreads the real catalogue across categories instead of one bucket per source", () => {
    // The bug this replaced: 205 React Bits entries under one heading while "Hover
    // effects" showed three.
    const index = RegistryIndex.parse(
      JSON.parse(readFileSync(join(__dirname, "../data/registry-snapshot.json"), "utf-8")),
    );
    const counts = new Map<string, number>();
    for (const element of index.elements) {
      const category = browseCategory(element);
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    expect(counts.size).toBeGreaterThanOrEqual(10);
    // No single category may swallow a third of the catalogue.
    expect(Math.max(...counts.values())).toBeLessThan(index.elements.length / 3);
  });

  it("puts text animations from four different registries in one place", () => {
    const index = RegistryIndex.parse(
      JSON.parse(readFileSync(join(__dirname, "../data/registry-snapshot.json"), "utf-8")),
    );
    const sources = new Set(
      index.elements.filter((e) => browseCategory(e) === "Text animations").map((e) => e.source),
    );
    expect(sources.size).toBeGreaterThanOrEqual(4);
  });
});

describe("playground originals", () => {
  it("offers at least six in every category it covers", () => {
    const counts = new Map<string, number>();
    for (const element of ELEMENTS) {
      counts.set(element.category, (counts.get(element.category) ?? 0) + 1);
    }
    for (const [category, count] of counts) {
      expect(`${category}: ${count}`).toBe(`${category}: ${Math.max(count, 6)}`);
    }
  });

  it("uses only categories from the shared taxonomy", () => {
    for (const element of ELEMENTS) expect(BROWSE_CATEGORIES).toContain(element.category);
  });

  it("gives every original a unique id", () => {
    expect(new Set(ELEMENTS.map((e) => e.id)).size).toBe(ELEMENTS.length);
  });

  it("gives every original the markup a preview needs", () => {
    for (const element of ELEMENTS) {
      expect(element.html.length, element.id).toBeGreaterThan(0);
      expect(element.css.length, element.id).toBeGreaterThan(0);
      expect(element.title.length, element.id).toBeGreaterThan(0);
      expect(element.description.length, element.id).toBeGreaterThan(0);
    }
  });
});
