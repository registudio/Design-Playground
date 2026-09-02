import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadPreferences, samePreferences, savePreferences, type ViewPreferences } from "@/store/preferences";

/**
 * View preferences are the only store input that survives a deploy, so a value dropped
 * from an enum in a later build would otherwise sit in someone's browser forever and
 * put the UI in a state the code no longer handles. These pin the validation, and the
 * "storage isn't usable" paths that must never break a page load.
 */

const KEY = "design-playground:view-preferences:v1";

const complete: ViewPreferences = {
  section: "animations",
  previewMode: "sample",
  device: "mobile",
  theme: "dark",
  advanced: true,
  collapsedPanels: ["Elements", "Imagery"],
};

function useMemoryStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  return store;
}

beforeEach(() => useMemoryStorage());
afterEach(() => vi.unstubAllGlobals());

describe("preference round trip", () => {
  it("restores everything it saved", () => {
    savePreferences(complete);
    expect(loadPreferences()).toEqual(complete);
  });

  it("returns nothing when there is no stored entry", () => {
    expect(loadPreferences()).toEqual({});
  });
});

describe("validation", () => {
  it("drops values that are no longer valid, keeping the rest", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ ...complete, device: "holograph", previewMode: "retired-surface" }),
    );

    const loaded = loadPreferences();

    expect(loaded.device).toBeUndefined();
    expect(loaded.previewMode).toBeUndefined();
    expect(loaded.theme).toBe("dark");
    expect(loaded.advanced).toBe(true);
  });

  it("ignores a wrongly typed advanced flag rather than coercing it", () => {
    localStorage.setItem(KEY, JSON.stringify({ advanced: "yes" }));
    expect(loadPreferences().advanced).toBeUndefined();
  });

  it("keeps only the string entries of collapsedPanels", () => {
    localStorage.setItem(KEY, JSON.stringify({ collapsedPanels: ["Elements", 7, null, "Layout"] }));
    expect(loadPreferences().collapsedPanels).toEqual(["Elements", "Layout"]);
  });

  it("survives malformed JSON", () => {
    localStorage.setItem(KEY, "{not json");
    expect(loadPreferences()).toEqual({});
  });

  it("survives a stored value that isn't an object", () => {
    localStorage.setItem(KEY, JSON.stringify("nope"));
    expect(loadPreferences()).toEqual({});
  });
});

describe("unusable storage", () => {
  it("loads as empty when localStorage is absent", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(loadPreferences()).toEqual({});
  });

  it("loads as empty when reading throws", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => {},
    });
    expect(loadPreferences()).toEqual({});
  });

  it("does not throw when writing is blocked", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => { throw new Error("quota exceeded"); },
    });
    expect(() => savePreferences(complete)).not.toThrow();
  });
});

describe("samePreferences", () => {
  it("treats an identical set as unchanged", () => {
    expect(samePreferences(complete, { ...complete, collapsedPanels: [...complete.collapsedPanels] })).toBe(true);
  });

  it("notices a scalar change", () => {
    expect(samePreferences(complete, { ...complete, theme: "light" })).toBe(false);
  });

  it("notices a collapsed-panel change", () => {
    expect(samePreferences(complete, { ...complete, collapsedPanels: ["Elements"] })).toBe(false);
    expect(samePreferences(complete, { ...complete, collapsedPanels: ["Elements", "Layout"] })).toBe(false);
  });
});
