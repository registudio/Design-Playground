import { defaultManifest, defaultRecipe, defaultTokens } from "@/schema/defaults";
import type { DesignProject } from "@/schema/project";

/**
 * Whether each step of a project has something in it, worked out from the project.
 *
 * This replaced a per-step "Not reviewed / Mark reviewed / Skip for now" record the
 * user had to keep by hand, which nobody kept: three labels and two buttons on every
 * screen, to say what the project data already knows. A step is ticked once it holds
 * anything a blank new project does not — so a template that sets the colours ticks
 * The basics too, because the basics now genuinely have something in them.
 */
export type WorkflowStep = "assets" | "templates" | "basics" | "sections" | "elements" | "motion";

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// Built once: these are the "nothing chosen yet" baselines each step is compared to.
const BLANK = { tokens: defaultTokens(), recipe: defaultRecipe(), assets: defaultManifest() };

export function stepHasChoices(project: DesignProject, step: WorkflowStep): boolean {
  switch (step) {
    case "assets":
      return Object.values(project.assets.logo).some(Boolean)
        || project.assets.images.length > 0
        || project.assets.fonts.length > 0;
    case "templates":
      return project.appliedPreset !== null;
    case "basics":
      return !same(project.tokens, BLANK.tokens) || (project.recipe.unset?.length ?? 0) > 0;
    case "sections":
      return !same(project.recipe.components, BLANK.recipe.components)
        || !same(project.recipe.sectionOrder, BLANK.recipe.sectionOrder);
    case "elements":
      return (project.recipe.elements?.length ?? 0) + project.selections.length > 0;
    case "motion":
      return !same(project.recipe.motion, BLANK.recipe.motion)
        || !same(project.recipe.engines, BLANK.recipe.engines);
  }
}

/** True while nothing in the project has been chosen — a project someone has just made. */
export function isUntouched(project: DesignProject): boolean {
  return (["assets", "templates", "basics", "sections", "elements", "motion"] as const)
    .every(step => !stepHasChoices(project, step));
}
