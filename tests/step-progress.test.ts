import { describe, expect, it } from "vitest";
import { createProject } from "@/schema/defaults";
import { isUntouched, stepHasChoices } from "@/workflow/step-progress";

describe("step progress, derived from the project", () => {
  it("ticks nothing on a project someone has just made", () => {
    const project = createProject("Acme");
    expect(isUntouched(project)).toBe(true);
    for (const step of ["assets", "templates", "basics", "sections", "elements", "motion"] as const) {
      expect(stepHasChoices(project, step), step).toBe(false);
    }
  });

  it("ticks brand assets once a logo is uploaded", () => {
    const project = createProject("Acme");
    project.assets.logo.primary = "logo.svg";
    expect(stepHasChoices(project, "assets")).toBe(true);
    expect(isUntouched(project)).toBe(false);
  });

  it("ticks templates once one is applied", () => {
    const project = createProject("Acme");
    project.appliedPreset = "modern-startup";
    expect(stepHasChoices(project, "templates")).toBe(true);
  });

  it("ticks the basics when a token changes, or colours are left undecided on purpose", () => {
    const changed = createProject("Acme");
    changed.tokens.typography.display.family = "Fraunces";
    expect(stepHasChoices(changed, "basics")).toBe(true);
    const undecided = createProject("Acme");
    undecided.recipe.unset = ["colors"];
    expect(stepHasChoices(undecided, "basics")).toBe(true);
  });

  it("ticks page sections when the order changes", () => {
    const project = createProject("Acme");
    project.recipe.sectionOrder = [...(project.recipe.sectionOrder ?? [])].reverse();
    expect(stepHasChoices(project, "sections")).toBe(true);
  });

  it("ticks elements once anything is picked, original or registry", () => {
    const project = createProject("Acme");
    project.recipe.elements = [{ id: "aurora", note: "", placement: "page" }];
    expect(stepHasChoices(project, "elements")).toBe(true);
  });

  it("ticks motion when an engine is switched", () => {
    const project = createProject("Acme");
    project.recipe.engines.lenis = !project.recipe.engines.lenis;
    expect(stepHasChoices(project, "motion")).toBe(true);
  });
});
