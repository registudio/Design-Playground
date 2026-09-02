import { describe, expect, it } from "vitest";
import { baselineDescription, baselineFor, resetPath } from "@/store/baseline";
import { createProject } from "@/schema/defaults";
import { PRESETS } from "@/presets";
import { fixtureProject } from "./fixture";

/**
 * Reset-to-baseline (§10.2). The subtle requirement is that "baseline" is not simply
 * the defaults: it has to replay whatever global direction the user last chose, and it
 * must not undo an uploaded logo's brand colours, which preset palettes deliberately
 * step aside for. These tests pin both, plus the path plumbing reset relies on.
 */

const noPresets = [] as never[];

describe("baselineFor", () => {
  it("returns default token values for a project with no preset and no logo", () => {
    const project = createProject("Untouched");
    project.tokens.layout.maxWidth = 999;

    const baseline = baselineFor(project, noPresets);

    expect(baseline.tokens.layout.maxWidth).toBe(createProject("x").tokens.layout.maxWidth);
  });

  it("replays the applied preset rather than falling back to defaults", () => {
    const preset = PRESETS[0]!;
    const applied = createProject("With preset");
    applied.appliedPreset = preset.id;

    const expected = createProject("Reference");
    preset.facets.geometry(expected);

    const baseline = baselineFor(applied, noPresets);

    expect(baseline.tokens.geometry.radius).toEqual(expected.tokens.geometry.radius);
  });

  it("uses the logo's suggested palette as the colour baseline when no preset is applied", () => {
    const project = fixtureProject();
    const suggested = project.suggestion!;

    const baseline = baselineFor(project, noPresets);

    expect(baseline.tokens.colors.light.semantic.primary).toEqual(suggested.light.semantic.primary);
  });

  it("keeps the logo's brand colours when a preset is also applied", () => {
    // setPalette bails out when draft.analysis is set, so carrying analysis into the
    // baseline is what stops a reset from replacing real brand colour with a seed.
    const project = fixtureProject();
    project.analysis = { detected: [], extractedAt: 0, source: "logo" } as never;
    project.appliedPreset = PRESETS[0]!.id;
    const suggested = project.suggestion!;

    const baseline = baselineFor(project, noPresets);

    expect(baseline.tokens.colors.light.semantic.primary).toEqual(suggested.light.semantic.primary);
  });
});

describe("baselineDescription", () => {
  it("names the applied preset", () => {
    const project = createProject("P");
    project.appliedPreset = PRESETS[0]!.id;
    expect(baselineDescription(project, noPresets)).toContain(PRESETS[0]!.name);
  });

  it("mentions the logo when one has been analysed", () => {
    expect(baselineDescription(fixtureProject(), noPresets)).toMatch(/logo/i);
  });

  it("falls back to the default", () => {
    expect(baselineDescription(createProject("P"), noPresets)).toMatch(/default/i);
  });
});

describe("resetPath", () => {
  it("restores a dotted path and clears its provenance", () => {
    const project = createProject("P");
    const baseline = baselineFor(project, noPresets);
    const original = project.tokens.layout.maxWidth;

    project.tokens.layout.maxWidth = 999;
    project.provenance["tokens.layout.maxWidth"] = "user";

    expect(resetPath(project, baseline, "tokens.layout.maxWidth", "light")).toBe(true);
    expect(project.tokens.layout.maxWidth).toBe(original);
    expect(project.provenance["tokens.layout.maxWidth"]).toBeUndefined();
  });

  it("restores a whole object value, not just a leaf", () => {
    const project = createProject("P");
    const baseline = baselineFor(project, noPresets);
    const original = { ...project.tokens.geometry.radius };

    project.tokens.geometry.radius.md = 42;

    expect(resetPath(project, baseline, "tokens.geometry.radius", "light")).toBe(true);
    expect(project.tokens.geometry.radius).toEqual(original);
  });

  it("restores a semantic colour together with the ramp it owns", () => {
    const project = fixtureProject();
    const baseline = baselineFor(project, noPresets);
    const originalBrand = structuredClone(project.tokens.colors.scales.brand);

    project.tokens.colors.light.semantic.primary = { kind: "raw", color: { l: 0.1, c: 0.1, h: 10 } };
    project.tokens.colors.scales.brand = structuredClone(baseline.tokens.colors.scales.accent!);
    project.provenance["tokens.colors.primary"] = "user";

    expect(resetPath(project, baseline, "tokens.colors.primary", "light")).toBe(true);
    expect(project.tokens.colors.light.semantic.primary).toEqual(
      baseline.tokens.colors.light.semantic.primary,
    );
    expect(project.tokens.colors.scales.brand).toEqual(originalBrand);
    expect(project.provenance["tokens.colors.primary"]).toBeUndefined();
  });

  it("restores the preset as the source, not 'default', when the preset set that value", () => {
    const project = createProject("P");
    project.appliedPreset = PRESETS[0]!.id;
    const baseline = baselineFor(project, noPresets);
    // Only meaningful for a path the preset actually claims.
    expect(baseline.provenance["tokens.geometry.radius"]).toBe("preset");

    project.tokens.geometry.radius.md = 42;
    project.provenance["tokens.geometry.radius"] = "user";

    resetPath(project, baseline, "tokens.geometry.radius", "light");

    expect(project.provenance["tokens.geometry.radius"]).toBe("preset");
  });

  it("reports failure for a path that resolves to nothing, leaving the project alone", () => {
    const project = createProject("P");
    const before = structuredClone(project);

    expect(resetPath(project, baselineFor(project, noPresets), "tokens.nope.missing", "light")).toBe(false);
    expect(project).toEqual(before);
  });

  it("does not treat an unknown colour-ish path as a semantic colour", () => {
    const project = fixtureProject();
    expect(resetPath(project, baselineFor(project, noPresets), "tokens.colors.notAToken", "light")).toBe(false);
  });
});
