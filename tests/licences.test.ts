import { describe, expect, it } from "vitest";
import { REGISTRY_SOURCES } from "@/registry/sources";
import { licenceFor, SOURCE_LICENCES } from "@/registry/licences";
import { buildExport, thirdPartyLicences, validate } from "@/export/bundle";
import { SelectedElement } from "@/schema/selection";
import { createProject } from "@/schema/defaults";
import snapshot from "../data/registry-snapshot.json";

const pick = (source: string) => SelectedElement.parse({ ...snapshot.elements.find(e => e.source === source)!, addedAt: 1, intendedUse: "hero" });

describe("registry licences", () => {
  it("records a decision for every source — a licence or an explicit null", () => {
    for (const source of REGISTRY_SOURCES) expect(Object.keys(SOURCE_LICENCES), source.id).toContain(source.id);
  });

  it("points every stated licence at the file it was read from", () => {
    for (const [id, licence] of Object.entries(SOURCE_LICENCES)) {
      if (!licence) continue;
      expect(licence.url, id).toMatch(/^https:\/\/github\.com\/.+\/LICENSE/);
      expect(licence.checked, id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("warns on export when a licence could not be verified, or restricts more than MIT", () => {
    const project = createProject("Licences");
    project.selections = [pick("soralabs"), pick("react-bits"), pick("kokonutui")];
    const warnings = validate(project).filter(i => i.severity === "warning").map(i => i.message).join("\n");
    expect(warnings).toMatch(/Sora UI, which states no licence/);
    expect(warnings).toMatch(/MIT \+ Commons Clause/);
    expect(warnings).not.toMatch(/KokonutUI, which states no licence/);
    expect(validate(project, "elements").some(i => /Commons Clause/.test(i.message))).toBe(true);
    // Warnings, not errors: the terms may be fine; what is missing is confirmation.
    expect(validate(project).filter(i => i.severity === "error" && /licen/i.test(i.message))).toEqual([]);
  });

  it("ships the terms beside the selection file, in both export scopes", () => {
    const project = createProject("Licences");
    project.selections = [pick("react-bits"), pick("componentry")];
    for (const scope of ["everything", "elements"] as const) {
      const file = buildExport(project, new Map(), scope).files.find(f => f.path === "THIRD-PARTY-LICENCES.md");
      expect(file, scope).toBeDefined();
    }
    const text = thirdPartyLicences(project.selections);
    expect(text).toContain(licenceFor("react-bits")!.url);
    expect(text).toMatch(/## Componentry\n\nLicence: \*\*not stated/);
    expect(thirdPartyLicences(project.selections)).toBe(text);
  });

  it("adds no licence file when nothing was picked from a registry", () => {
    expect(buildExport(createProject("None")).files.some(f => f.path === "THIRD-PARTY-LICENCES.md")).toBe(false);
  });
});
