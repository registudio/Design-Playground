import { describe, expect, it } from "vitest";
import {
  applyPreset, applyPresetFacets, PRESET_FACETS, PRESET_FAMILIES, PRESETS,
} from "@/presets";
import { FONT_PAIRINGS, findFont, ALL_FONTS } from "@/fonts/catalogue";
import { ComponentChoices, SiteRecipe } from "@/schema/recipe";
import { DesignTokens } from "@/schema/tokens";
import { contrastRatio } from "@/color/contrast";
import { resolveSemantic } from "@/color/semantic";
import { fixtureProject } from "./fixture";

/**
 * Presets and pairings are data, and data drifts: a renamed font or a variant removed
 * from the schema turns into a silently broken preset. These tests make that drift
 * fail loudly instead.
 */

describe("font catalogue", () => {
  it("every pairing references fonts that exist", () => {
    for (const pairing of FONT_PAIRINGS) {
      for (const role of ["display", "body", "mono"] as const) {
        expect(findFont(pairing[role]), `${pairing.id} -> ${role}: ${pairing[role]}`).toBeDefined();
      }
    }
  });

  it("every font declares at least one weight", () => {
    for (const font of ALL_FONTS) {
      expect(font.weights.length, font.family).toBeGreaterThan(0);
    }
  });

  it("pairing ids are unique", () => {
    const ids = FONT_PAIRINGS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("presets", () => {
  it("ids are unique", () => {
    const ids = PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every preset belongs to a known family", () => {
    for (const preset of PRESETS) {
      expect(PRESET_FAMILIES, preset.id).toContain(preset.family);
    }
  });

  it("every preset references a real font pairing", () => {
    for (const preset of PRESETS) {
      expect(
        FONT_PAIRINGS.find((p) => p.id === preset.pairing),
        `${preset.id} -> ${preset.pairing}`,
      ).toBeDefined();
    }
  });

  it("every family is represented", () => {
    for (const family of PRESET_FAMILIES) {
      expect(PRESETS.some((p) => p.family === family), family).toBe(true);
    }
  });

  // The important one: applying a preset must leave a project the schema accepts,
  // which catches any component variant that isn't actually in the enum.
  for (const preset of PRESETS) {
    describe(preset.name, () => {
      const project = fixtureProject();
      // fixtureProject has an analysis-free palette, so preset colours apply.
      project.analysis = null;
      applyPreset(project, preset);

      it("produces schema-valid tokens", () => {
        const result = DesignTokens.safeParse(project.tokens);
        expect(result.success ? null : result.error.issues).toBeNull();
      });

      it("produces a schema-valid recipe", () => {
        const result = SiteRecipe.safeParse(project.recipe);
        expect(result.success ? null : result.error.issues).toBeNull();
      });

      it("selects only known component variants", () => {
        const result = ComponentChoices.safeParse(project.recipe.components);
        expect(result.success ? null : result.error.issues).toBeNull();
      });

      it("keeps body text legible on its background", () => {
        const fg = resolveSemantic(project.tokens.colors, "light", "foreground");
        const bg = resolveSemantic(project.tokens.colors, "light", "background");
        expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
      });

      it("keeps the type ladder monotonically descending", () => {
        const s = project.tokens.typography.scale;
        const ladder = [
          s.displayXl.size, s.displayL.size, s.heading1.size, s.heading2.size,
          s.heading3.size, s.bodyL.size, s.body.size, s.small.size, s.caption.size,
        ];
        for (let i = 1; i < ladder.length; i++) {
          expect(ladder[i]!).toBeLessThan(ladder[i - 1]!);
        }
      });

      it("keeps body text at a readable size", () => {
        expect(project.tokens.typography.scale.body.size).toBeGreaterThanOrEqual(0.875);
      });
    });
  }

  it("does not overwrite colours extracted from a logo", () => {
    const project = fixtureProject();
    // Simulate an analysed logo; the palette must survive preset application.
    project.analysis = {
      assetFile: "logo.svg",
      method: "svg-attributes",
      colors: [],
      polarity: "dark",
      hasTransparency: true,
      suitableSurfaces: {
        light: { l: 0.99, c: 0.002, h: 250 },
        dark: { l: 0.18, c: 0.012, h: 250 },
      },
    };
    const before = JSON.stringify(project.tokens.colors);
    applyPreset(project, PRESETS.find((p) => p.id === "luxury")!);
    expect(JSON.stringify(project.tokens.colors)).toBe(before);
  });
});

describe("composable preset application", () => {
  const luxury = PRESETS.find((p) => p.id === "luxury")!;
  const corporate = PRESETS.find((p) => p.id === "corporate")!;

  it("each facet touches only its own part of the project", () => {
    const before = fixtureProject();
    before.analysis = null;

    for (const facet of PRESET_FACETS) {
      const project = fixtureProject();
      project.analysis = null;
      applyPresetFacets(project, luxury, [facet]);

      const changed = {
        palette: JSON.stringify(project.tokens.colors) !== JSON.stringify(before.tokens.colors),
        typography: JSON.stringify(project.tokens.typography) !== JSON.stringify(before.tokens.typography),
        geometry:
          JSON.stringify(project.tokens.geometry) !== JSON.stringify(before.tokens.geometry) ||
          JSON.stringify(project.tokens.layout) !== JSON.stringify(before.tokens.layout) ||
          JSON.stringify(project.tokens.imagery) !== JSON.stringify(before.tokens.imagery),
        components: JSON.stringify(project.recipe.components) !== JSON.stringify(before.recipe.components),
        motion: project.recipe.motion.profile !== before.recipe.motion.profile,
      };

      // The requested facet changed; every other facet's territory did not.
      expect(changed[facet], facet).toBe(true);
      for (const other of PRESET_FACETS) {
        if (other === facet) continue;
        expect(changed[other], `${facet} touched ${other}`).toBe(false);
      }
    }
  });

  it("mixing one preset's palette with another's typography works as a real combination", () => {
    const project = fixtureProject();
    project.analysis = null;
    applyPresetFacets(project, luxury, ["palette"]);
    applyPresetFacets(project, corporate, ["typography"]);

    expect(project.tokens.typography.display.family).toBe(
      findFont(FONT_PAIRINGS.find((p) => p.id === corporate.pairing)!.display)!.family,
    );
    // Luxury's palette facet only runs when there's no logo analysis (fixtureProject
    // has none here), so the seed colour should have taken hold.
    const primary = resolveSemantic(project.tokens.colors, "light", "primary");
    expect(primary).toBeDefined();
  });

  it("a full apply equals applying every facet individually", () => {
    const full = fixtureProject();
    full.analysis = null;
    applyPreset(full, luxury);

    const piecemeal = fixtureProject();
    piecemeal.analysis = null;
    applyPresetFacets(piecemeal, luxury, [...PRESET_FACETS]);

    expect(JSON.stringify(full.tokens)).toBe(JSON.stringify(piecemeal.tokens));
    expect(JSON.stringify(full.recipe)).toBe(JSON.stringify(piecemeal.recipe));
  });
});
