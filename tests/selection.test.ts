import { describe, expect, it } from "vitest";
import { buildExport, validate } from "@/export/bundle";
import { DesignProject } from "@/schema/project";
import { defaultRecipe } from "@/schema/defaults";
import { SiteRecipe, findDisabledEngineUses } from "@/schema/recipe";
import {
  SELECTION_SCHEMA_ID,
  SelectionDocument,
  toSelectionDocument,
  type SelectedElement,
} from "@/schema/selection";
import { fixtureProject } from "./fixture";

function selected(overrides: Partial<SelectedElement> = {}): SelectedElement {
  return {
    id: "soralabs:text-effect",
    name: "text-effect",
    title: "Text Effect",
    description: "",
    source: "soralabs",
    category: "text-scroll-effects",
    installCommand: "npx shadcn@latest add @soralabs/text-effect",
    intendedUse: "hero headline reveal",
    placement: "page",
    referenceOnly: false,
    engineDependency: [],
    addedAt: 1,
    ...overrides,
  };
}

const SELECTION_PATH = "design-playground-selection.json";

describe("design-playground-selection/v1 (§5)", () => {
  it("emits exactly §5's three fields when nothing is placed", () => {
    const document = toSelectionDocument([selected()]);
    expect(document).toEqual({
      schema: SELECTION_SCHEMA_ID,
      selections: [
        {
          id: "soralabs:text-effect",
          installCommand: "npx shadcn@latest add @soralabs/text-effect",
          intendedUse: "hero headline reveal",
        },
      ],
    });
  });

  it("adds placement only when a section was actually chosen", () => {
    // Exported as an addition to §5's shape, and omitted when left at the default —
    // "page" means undecided, and saying so beats a default that looks deliberate.
    const placed = toSelectionDocument([selected({ placement: "hero" })]);
    expect(placed.selections[0]).toMatchObject({ placement: "hero" });
    const unplaced = toSelectionDocument([selected({ placement: "page" })]);
    expect(unplaced.selections[0]).not.toHaveProperty("placement");
  });

  it("keeps a consumer written against the original three fields working", () => {
    // placement is optional, so the older shape still parses.
    expect(SelectionDocument.safeParse({
      schema: SELECTION_SCHEMA_ID,
      selections: [{ id: "a:b", installCommand: "x", intendedUse: "y" }],
    }).success).toBe(true);
  });

  it("matches the shape §5 documents", () => {
    expect(SelectionDocument.safeParse(toSelectionDocument([selected()])).success).toBe(true);
  });

  it("does not leak the playground's own bookkeeping into the export", () => {
    const [entry] = toSelectionDocument([selected()]).selections;
    expect(entry).not.toHaveProperty("addedAt");
    expect(entry).not.toHaveProperty("category");
  });

  it("orders by id, so picking the same two in a different order exports identically", () => {
    const a = toSelectionDocument([
      selected({ id: "a:one", addedAt: 1 }),
      selected({ id: "b:two", addedAt: 2 }),
    ]);
    const b = toSelectionDocument([
      selected({ id: "b:two", addedAt: 1 }),
      selected({ id: "a:one", addedAt: 2 }),
    ]);
    expect(a).toEqual(b);
  });
});

describe("selection export wiring", () => {
  it("omits the file when nothing is selected, so Phase 2 still asks its question", () => {
    const { files } = buildExport(fixtureProject());
    expect(files.map((f) => f.path)).not.toContain(SELECTION_PATH);
  });

  it("writes it at the bundle root, where §5 says the consumer looks", () => {
    const project = fixtureProject();
    project.selections = [selected()];
    const { files } = buildExport(project);
    expect(files.map((f) => f.path)).toContain(SELECTION_PATH);
  });

  it("stays byte-identical across runs like the other exported documents", () => {
    const build = () => {
      const project = fixtureProject();
      project.selections = [selected({ id: "b:two" }), selected({ id: "a:one" })];
      return buildExport(project).files.find((f) => f.path === SELECTION_PATH)!.content;
    };
    expect(build()).toEqual(build());
  });

  it("warns when a selection has no intended use recorded", () => {
    const project = fixtureProject();
    project.selections = [selected({ intendedUse: "" })];
    const issues = validate(project);
    expect(issues).toContainEqual({
      severity: "warning",
      message: 'selections: "Text Effect" has no intended use recorded',
    });
  });

  it("warns that a reference-only source is not a one-click install (§1c)", () => {
    const project = fixtureProject();
    project.selections = [selected({ source: "componentry", referenceOnly: true })];
    expect(validate(project).some((i) => i.message.includes("reference-only"))).toBe(true);
  });

  it("warns when a selection needs an engine the project switched off (§1b)", () => {
    const project = fixtureProject();
    project.selections = [selected({ engineDependency: ["gsap"] })];
    project.recipe.engines.gsap = false;
    // The motion binding that also needs GSAP raises its own error; this asserts the
    // separate, selection-level warning.
    expect(
      validate(project).some(
        (i) => i.severity === "warning" && i.message.includes("needs the gsap engine"),
      ),
    ).toBe(true);
  });

  it("stays quiet when the engine a selection needs is on", () => {
    const project = fixtureProject();
    project.selections = [selected({ engineDependency: ["gsap"] })];
    expect(validate(project).some((i) => i.message.includes("needs the gsap engine"))).toBe(false);
  });

  it("neither warning blocks the export", () => {
    const project = fixtureProject();
    project.selections = [selected({ intendedUse: "", referenceOnly: true })];
    expect(validate(project).every((i) => i.severity === "warning")).toBe(true);
  });
});

describe("project backward compatibility", () => {
  it("opens a project saved before Elements existed", () => {
    const { selections, ...withoutSelections } = fixtureProject();
    const parsed = DesignProject.safeParse(withoutSelections);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.selections).toEqual([]);
  });

  it("opens a recipe saved before engines were tracked", () => {
    const { engines, ...withoutEngines } = defaultRecipe();
    const parsed = SiteRecipe.safeParse(withoutEngines);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.engines).toEqual({
      motion: true,
      gsap: true,
      lenis: false,
      vanta: false,
    });
  });
});

describe("engines as project-wide toggles (§1b)", () => {
  it("leaves the default project consistent with its own bindings", () => {
    expect(findDisabledEngineUses(defaultRecipe())).toEqual([]);
    expect(validate(fixtureProject()).filter((i) => i.severity === "error")).toEqual([]);
  });

  it("catches a binding that needs an engine the project switched off", () => {
    const recipe = defaultRecipe();
    recipe.engines.gsap = false;
    expect(findDisabledEngineUses(recipe)).toEqual([
      { group: "scroll", binding: "default", engine: "gsap" },
    ]);
  });

  it("blocks the export rather than shipping a recipe that cannot run", () => {
    const project = fixtureProject();
    project.recipe.engines.motion = false;
    const errors = validate(project).filter((i) => i.severity === "error");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((i) => i.message.includes('"motion"'))).toBe(true);
  });

  it("does not treat plain CSS as an engine that needs installing", () => {
    const recipe = defaultRecipe();
    recipe.motion.entrance.default = {
      recipe: "animation.entrance.fade",
      engine: "css",
      properties: ["opacity"],
      reducedMotion: "fade-only",
    };
    recipe.engines.motion = false;
    expect(findDisabledEngineUses(recipe).some((u) => u.binding === "default" && u.group === "entrance")).toBe(false);
  });
});
