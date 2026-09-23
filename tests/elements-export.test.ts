import { describe, expect, it } from "vitest";
import { buildExport, validate } from "@/export/bundle";
import { fixtureProject } from "./fixture";
import type { DesignProject } from "@/schema/project";

/** A project with one authored effect and one registry pick. */
function withElements(): DesignProject {
  const project = fixtureProject();
  project.recipe.elements = [
    { id: "chart-column", note: "Enquiries panel on the reporting page", placement: "features" },
    { id: "vanta-fog", note: "", placement: "hero" },
  ];
  project.selections = [{
    id: "soralabs:text-effect", name: "text-effect", title: "Text Effect", description: "",
    source: "soralabs", category: "text-scroll-effects",
    installCommand: "npx shadcn@latest add @soralabs/text-effect",
    intendedUse: "hero headline reveal", placement: "hero",
    referenceOnly: false, engineDependency: [], addedAt: 1,
  }];
  return project;
}

const paths = (project: DesignProject, scope: "everything" | "elements") =>
  buildExport(project, new Map(), scope).files.map(file => file.path);

describe("exporting only the elements", () => {
  it("carries the element documents and nothing else from the design", () => {
    const only = paths(withElements(), "elements");
    expect(only).toContain("elements/chart-column.html");
    expect(only).toContain("elements/vanta-fog.html");
    for (const unwanted of [
      "README.md", "EXPORT-QUALITY.md", "preview.html",
      "design/design.tokens.json", "design/site.recipe.json",
      "design/asset-manifest.json", "design/globals.css",
    ]) {
      expect(only, unwanted).not.toContain(unwanted);
    }
  });

  it("still carries the install commands, since a registry pick has no source to ship", () => {
    const only = paths(withElements(), "elements");
    expect(only).toContain("design-playground-selection.json");
    expect(only).toContain("components.registries.json");
  });

  it("leaves those two out when nothing was picked from a registry", () => {
    const project = withElements();
    project.selections = [];
    const only = paths(project, "elements");
    expect(only).not.toContain("design-playground-selection.json");
    expect(only).not.toContain("components.registries.json");
  });

  it("writes a README that names each file, its placement and its note", () => {
    const readme = buildExport(withElements(), new Map(), "elements")
      .files.find(file => file.path === "elements/README.md")!.content as string;
    expect(readme).toContain("chart-column.html");
    expect(readme).toContain("Enquiries panel on the reporting page");
    expect(readme).toContain("After Features");
    // A registry pick is an install command, not code — the README has to say so.
    expect(readme).toContain("npx shadcn@latest add @soralabs/text-effect");
    expect(readme).toMatch(/Vanta/);
  });

  it("bakes the project's own accent into each element document", () => {
    const html = buildExport(withElements(), new Map(), "elements")
      .files.find(file => file.path === "elements/chart-column.html")!.content as string;
    expect(html).toMatch(/--accent:#[0-9a-f]{6}/i);
    expect(html).not.toContain("/api/");
  });

  it("refuses an empty export rather than delivering an empty folder", () => {
    const project = fixtureProject();
    project.recipe.elements = [];
    project.selections = [];
    const issues = validate(project, "elements");
    expect(issues.some(issue => issue.severity === "error" && /nothing to export/i.test(issue.message))).toBe(true);
  });

  it("does not block on a design document it is not shipping", () => {
    // A broken token file has nothing to do with a folder of standalone effects.
    const project = withElements();
    (project.tokens as unknown as Record<string, unknown>).layout = { nonsense: true };
    expect(validate(project, "elements").filter(issue => issue.severity === "error")).toEqual([]);
    expect(validate(project, "everything").some(issue => issue.severity === "error")).toBe(true);
  });

  it("still warns about a reference-only pick and an engine that is switched off", () => {
    const project = withElements();
    project.selections = [{ ...project.selections[0]!, referenceOnly: true, engineDependency: ["gsap"] }];
    project.recipe.engines.gsap = false;
    const issues = validate(project, "elements");
    expect(issues.some(i => i.message.includes("reference-only"))).toBe(true);
    expect(issues.some(i => i.message.includes("needs the gsap engine"))).toBe(true);
    expect(issues.every(i => i.severity === "warning")).toBe(true);
  });

  it("leaves the full export exactly as it was", () => {
    const everything = paths(withElements(), "everything");
    for (const expected of [
      "README.md", "EXPORT-QUALITY.md", "design/design.tokens.json", "design/site.recipe.json",
      "design/asset-manifest.json", "design/globals.css", "elements/chart-column.html",
      "design-playground-selection.json", "components.registries.json",
    ]) {
      expect(everything, expected).toContain(expected);
    }
  });

  it("stays byte-identical across runs, like the full bundle", () => {
    const build = () => buildExport(withElements(), new Map(), "elements").files.map(f => [f.path, f.content]);
    expect(build()).toEqual(build());
  });
});
