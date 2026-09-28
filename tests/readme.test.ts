import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ELEMENTS } from "@/elements/catalogue";
import { REGISTRY_SOURCES } from "@/registry/sources";
import { SOURCE_LICENCES } from "@/registry/licences";

/**
 * The README states numbers the code decides. They drifted once — it said 87 originals
 * for months after there were 103 — so the ones it states are held to the code here.
 * Change the catalogue, and this names the README line to change with it.
 *
 * Not the registry snapshot's size: the weekly refresh changes it, and the README gives
 * it as a dated fact ("on 22 September 2026"), which stays true.
 */
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf-8");

describe("README", () => {
  it("states the real number of original effects", () => {
    expect(readme).toContain(`Browse ${ELEMENTS.length} interactive original effects`);
    expect(readme).not.toMatch(/Browse (?!\d+ interactive)|\b87 interactive/);
  });

  it("names every registry source", () => {
    for (const source of REGISTRY_SOURCES) expect(readme, source.label).toContain(source.label);
  });

  it("says which registries have no verified licence, matching the record", () => {
    const unknown = REGISTRY_SOURCES.filter(s => !SOURCE_LICENCES[s.id]).map(s => s.label);
    for (const label of unknown) expect(readme).toMatch(new RegExp(`${label}[^.]*state no licence|${label} and [^.]* state no licence|and ${label} state no licence`));
  });

  it("does not claim a shipped feature is still missing", () => {
    for (const stale of ["Custom font upload is not yet available", "automatic third-party React rendering is not implemented", "The element grid has no keyboard navigation", "No licence information is captured for third-party components"]) {
      expect(readme).not.toContain(stale);
    }
  });
});
