import type { DesignProject } from "@/schema/project";
import { previewStatuses } from "@/elements/preview-status";

export function qualityReport(project: DesignProject): string {
  const engines = [...new Set(project.selections.flatMap(s => s.engineDependency))];
  const lines = project.selections.map(s => `- ${s.title} (${s.source}): ${previewStatuses.get(s.id) ?? "not observed this session"}. Install: ${s.installCommand}. Engines: ${s.engineDependency.join(", ") || "not declared"}.`);
  const originalLines = (project.recipe.elements ?? []).map(s => `- ${s.id}: Playground original; runnable source included.`);
  return ["# Export quality report", "", "## Selected components", ...originalLines, ...lines,
    "", "## Dependencies", `Required animation engines: ${engines.join(", ") || "none declared by registry selections"}.`,
    "External components must be installed using their recorded commands. Dependency installation in the destination project has not been checked; an undeclared engine does not imply zero dependencies.",
    "", "## Preview review", "Ready means the component mounted. It does not certify visual correctness. Fallback and failed previews need review; unobserved previews have not been checked in this session.",
    "", "## Estimated runtime cost", `Qualitative estimate: ${project.selections.length > 8 || engines.length > 1 ? "higher" : project.selections.length ? "moderate" : "lower"} integration load based on ${project.selections.length} external components and ${engines.length} declared animation engines. This is a heuristic, not a bundle-size or frame-rate measurement.`,
    "", "## Accessibility review", "Test keyboard navigation, focus visibility, contrast and reduced-motion behavior on the assembled page. Check canvas/WebGL alternatives and ensure effects do not hide essential content. These checks require review; the report does not claim they passed.", ""].join("\n");
}
