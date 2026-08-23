import { describe, expect, it } from "vitest";
import {
  applyPreset, applyPresetFacets, captureCustomPresetFacets, customPresetToPreset,
  presetThumbnail, PRESET_FACETS, PRESETS,
} from "@/presets";
import type { CustomPreset } from "@/schema/customPreset";
import { fixtureProject } from "./fixture";

/**
 * §Wave D Templating-1/2: user-savable custom presets built from a live project's
 * concrete values, and thumbnails computed from a preset's own facet functions.
 */

function makeCustomPreset(id = "my-preset"): CustomPreset {
  const source = fixtureProject();
  source.analysis = null;
  return {
    id,
    name: "My Saved Look",
    description: "Captured from a client project",
    createdAt: Date.UTC(2026, 0, 1),
    facets: captureCustomPresetFacets(source),
  };
}

describe("captureCustomPresetFacets / customPresetToPreset round-trip", () => {
  it("applying a captured preset reproduces the source project's facet values", () => {
    const source = fixtureProject();
    source.analysis = null;
    const custom = { ...makeCustomPreset(), facets: captureCustomPresetFacets(source) };
    const preset = customPresetToPreset(custom);

    const target = fixtureProject();
    target.analysis = null;
    applyPreset(target, preset);

    expect(JSON.stringify(target.tokens.colors)).toBe(JSON.stringify(source.tokens.colors));
    expect(JSON.stringify(target.tokens.typography)).toBe(JSON.stringify(source.tokens.typography));
    expect(JSON.stringify(target.tokens.geometry.radius)).toBe(JSON.stringify(source.tokens.geometry.radius));
    expect(JSON.stringify(target.tokens.layout)).toBe(JSON.stringify(source.tokens.layout));
    expect(JSON.stringify(target.recipe.components)).toBe(JSON.stringify(source.recipe.components));
    expect(JSON.stringify(target.recipe.motion)).toBe(JSON.stringify(source.recipe.motion));
  });

  it("is tagged with the Custom family and carries the saved name/description", () => {
    const preset = customPresetToPreset(makeCustomPreset());
    expect(preset.family).toBe("Custom");
    expect(preset.name).toBe("My Saved Look");
    expect(preset.description).toBe("Captured from a client project");
  });

  it("supports partial (facet-scoped) application like a built-in preset", () => {
    const source = fixtureProject();
    source.analysis = null;
    // Fixture projects otherwise share identical default typography, so change it
    // before capturing — otherwise "partial application changed typography" would
    // pass even if the facet function were silently a no-op.
    source.tokens.typography.display.family = "Space Grotesk";
    const preset = customPresetToPreset({ ...makeCustomPreset(), facets: captureCustomPresetFacets(source) });

    const before = fixtureProject();
    before.analysis = null;
    const project = fixtureProject();
    project.analysis = null;
    applyPresetFacets(project, preset, ["typography"]);

    expect(JSON.stringify(project.tokens.typography)).not.toBe(JSON.stringify(before.tokens.typography));
    // Everything outside the requested facet is untouched.
    expect(JSON.stringify(project.tokens.colors)).toBe(JSON.stringify(before.tokens.colors));
    expect(JSON.stringify(project.recipe.components)).toBe(JSON.stringify(before.recipe.components));
  });

  it("still respects logo-derived colours outranking the saved palette", () => {
    const preset = customPresetToPreset(makeCustomPreset());
    const project = fixtureProject();
    // fixtureProject() already sets an analysis-driven suggestion via suggestPalette;
    // give it a non-null analysis so the palette facet's guard actually engages.
    project.analysis = {
      assetFile: "logo.svg",
      method: "svg-attributes",
      colors: [],
      polarity: "light",
      hasTransparency: false,
      suitableSurfaces: { light: { l: 1, c: 0, h: 0 }, dark: { l: 0, c: 0, h: 0 } },
    };
    const before = JSON.stringify(project.tokens.colors);
    applyPresetFacets(project, preset, ["palette"]);
    expect(JSON.stringify(project.tokens.colors)).toBe(before);
  });
});

describe("presetThumbnail", () => {
  it("returns a hex background/primary/accent and a numeric radius for every built-in preset", () => {
    const hex = /^#[0-9a-f]{6}$/i;
    for (const preset of PRESETS) {
      const thumb = presetThumbnail(preset);
      expect(thumb.background, preset.id).toMatch(hex);
      expect(thumb.primary, preset.id).toMatch(hex);
      expect(thumb.accent, preset.id).toMatch(hex);
      expect(typeof thumb.radius, preset.id).toBe("number");
    }
  });

  it("differs between two visually distinct presets", () => {
    const a = presetThumbnail(PRESETS.find((p) => p.id === "corporate")!);
    const b = presetThumbnail(PRESETS.find((p) => p.id === "luxury")!);
    expect(a.primary === b.primary && a.radius === b.radius).toBe(false);
  });

  it("works for a custom preset too", () => {
    const preset = customPresetToPreset(makeCustomPreset());
    const thumb = presetThumbnail(preset);
    expect(thumb.background).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("is stable across calls (cached, not recomputed each time)", () => {
    const preset = PRESETS[0]!;
    expect(presetThumbnail(preset)).toEqual(presetThumbnail(preset));
  });
});
