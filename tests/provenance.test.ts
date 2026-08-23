import { describe, expect, it } from "vitest";
import { provenanceOf, provenanceLabel, markProvenance, PROVENANCE_LABEL } from "@/store/provenance";
import { PRESETS, applyPreset } from "@/presets";
import { fixtureProject } from "./fixture";

describe("provenance", () => {
  it("defaults to \"default\" for an untouched path", () => {
    const project = fixtureProject();
    expect(provenanceOf(project, "tokens.geometry.radius")).toBe("default");
  });

  it("returns \"default\" for a project of null", () => {
    expect(provenanceOf(null, "anything")).toBe("default");
  });

  it("markProvenance sets every given path", () => {
    const project = fixtureProject();
    markProvenance(project, ["a.b", "c.d"], "user");
    expect(project.provenance["a.b"]).toBe("user");
    expect(project.provenance["c.d"]).toBe("user");
  });

  it("has a human label for every ValueSource", () => {
    for (const source of ["default", "extracted", "preset", "user", "imported"] as const) {
      expect(PROVENANCE_LABEL[source]).toBeTruthy();
    }
  });

  it("provenanceLabel reads through to the right label", () => {
    const project = fixtureProject();
    project.provenance["x"] = "extracted";
    expect(provenanceLabel(project, "x")).toBe(PROVENANCE_LABEL.extracted);
  });

  it("applying a preset marks every facet's paths as \"preset\"", () => {
    const project = fixtureProject();
    project.analysis = null;
    const preset = PRESETS.find((p) => p.id === "luxury")!;
    applyPreset(project, preset);

    expect(provenanceOf(project, "tokens.colors.primary")).toBe("preset");
    expect(provenanceOf(project, "tokens.typography.display")).toBe("preset");
    expect(provenanceOf(project, "tokens.geometry.radius")).toBe("preset");
    expect(provenanceOf(project, "recipe.components.hero")).toBe("preset");
    expect(provenanceOf(project, "recipe.motion.profile")).toBe("preset");
  });

  it("does not mark palette provenance when a logo analysis blocks the palette facet", () => {
    const project = fixtureProject();
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
    applyPreset(project, PRESETS.find((p) => p.id === "luxury")!);
    expect(provenanceOf(project, "tokens.colors.primary")).toBe("default");
  });
});
