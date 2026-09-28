import type { DesignProject } from "@/schema/project";
import { previewStatuses, previewKey } from "@/elements/preview-status";
import { elementOrigin } from "@/elements/catalogue";
import { engineFor } from "@/elements/extended-catalogue";
import { licenceFor } from "@/registry/licences";

export function qualityReport(project: DesignProject): string {
  const engines = [...new Set(project.selections.flatMap(s => s.engineDependency))];
  const lines = project.selections.map(s => {
    const observation = previewStatuses.get(previewKey(s));
    const state = observation ? `${observation.status}, observed ${new Date(observation.observedAt).toISOString()}${Date.now() - observation.observedAt > 300_000 ? " (stale; recheck)" : ""}` : "not observed this session";
    return `- ${s.title} (${s.source}, ${s.variant ? `${s.variant.language}/${s.variant.styling}` : "default variant"}): ${state}. Install: ${s.installCommand}. Engines: ${s.engineDependency.join(", ") || "not declared"}. npm packages: ${s.npmDependencies?.join(", ") || "not recorded"}. Registry dependencies: ${s.registryDependencies?.join(", ") || "none recorded"}. Licence: ${licenceFor(s.source)?.name ?? "not verified — confirm with the publisher"}.`;
  });
  const originals = project.recipe.elements ?? [];
  const originalLines = originals.map(s => `- ${s.id}: ${elementOrigin(s.id).name}; runtime ${elementOrigin(s.id).runtime}; runnable source included.${engineFor(s.id) ? ` Bundled engine: ${engineFor(s.id)!.label}${s.id.startsWith("vanta-") ? " + Three.js (WebGL required)" : ""}.` : ""}`);
  const gpu = originals.some(s => s.id.startsWith("vanta-")) || project.selections.some(s => s.npmDependencies?.some(d => /three|ogl|p5|webgl/i.test(d)));
  return ["# Export quality report", "", "## Selected components", ...originalLines, ...lines,
    "", "## Dependencies", `Required animation engines: ${engines.join(", ") || "none declared by registry selections"}.`,
    "External components must be installed using their recorded commands. Dependency installation in the destination project has not been checked; an undeclared engine does not imply zero dependencies.",
    "", "## Preview review", "Ready means the component mounted. It does not certify visual correctness. Fallback and failed previews need review; unobserved previews have not been checked in this session.",
    "", "## Estimated runtime cost", `Qualitative estimate: ${gpu || originals.length + project.selections.length > 8 || engines.length > 1 ? "higher" : project.selections.length || originals.length ? "moderate" : "lower"} integration load based on ${project.selections.length} external components, ${originals.length} authored effects, ${engines.length} declared registry animation engines, and ${gpu ? "detected" : "no detected"} WebGL dependencies. This is a heuristic, not a bundle-size or frame-rate measurement.`,
    "", "## Sample content", "Names, trust claims, prices and placeholder links are fictional demonstration content. Replace them before publishing.",
    "", "## Accessibility review", "Test keyboard navigation, focus visibility, contrast and reduced-motion behavior on the assembled page. Check canvas/WebGL alternatives and ensure effects do not hide essential content. These checks require review; the report does not claim they passed.", ""].join("\n");
}
