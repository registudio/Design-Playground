import { describe, expect, it } from "vitest";
import { clearLibraryView, DEFAULT_VIEW, hasLibraryView, readLibraryView, writeLibraryView } from "@/elements/library-url";
import { CATALOGUE_BATCH, windowAround } from "@/elements/preview-budget";

describe("library view in the URL", () => {
  it("leaves an untouched library at a bare URL", () => {
    expect(writeLibraryView(DEFAULT_VIEW)).toBe("");
    expect(readLibraryView("")).toEqual(DEFAULT_VIEW);
  });

  it("round trips every part of the view", () => {
    const view = { query: "glow", category: "Backgrounds", source: "vanta", collection: "Hero effects", onlySelected: true, utilities: true, open: "react-bits:ScrambledText" };
    expect(readLibraryView(writeLibraryView(view))).toEqual(view);
  });

  it("keeps parameters it does not own", () => {
    const search = writeLibraryView({ ...DEFAULT_VIEW, category: "Carousels" }, "?project=abc&type=Old");
    expect(new URLSearchParams(search).get("project")).toBe("abc");
    expect(new URLSearchParams(search).get("type")).toBe("Carousels");
    expect(clearLibraryView(search)).toBe("?project=abc");
  });

  it("recognises a link to a library view, and ignores other parameters", () => {
    expect(hasLibraryView("?open=starfield")).toBe(true);
    expect(hasLibraryView("?type=Carousels")).toBe(true);
    expect(hasLibraryView("?project=abc")).toBe(false);
    expect(hasLibraryView("")).toBe(false);
  });

  it("falls back to defaults for values it does not recognise", () => {
    const view = readLibraryView("?type=Not%20a%20category&collection=Gone");
    expect(view.category).toBe(DEFAULT_VIEW.category);
    expect(view.collection).toBe(DEFAULT_VIEW.collection);
  });
});

describe("mounting the rows around a jump", () => {
  it("always includes the target, with room above it, on a batch boundary", () => {
    for (const index of [0, 5, 35, 36, 100, 250, 538]) {
      const view = windowAround(index, 539);
      expect(view.start).toBeLessThanOrEqual(index);
      expect(view.end).toBeGreaterThan(index);
      expect(view.start % CATALOGUE_BATCH).toBe(0);
      if (index >= 2 * CATALOGUE_BATCH) expect(index - view.start).toBeGreaterThanOrEqual(CATALOGUE_BATCH);
    }
  });

  it("clamps to the result set", () => {
    expect(windowAround(999, 40)).toEqual({ start: 0, end: 40 });
    expect(windowAround(0, 0)).toEqual({ start: 0, end: 0 });
  });
});
