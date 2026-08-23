import type { ValueSource } from "@/schema/primitives";
import type { DesignProject } from "@/schema/project";

/**
 * Provenance-on-hover (§10.1, §10.2's "reset to suggestion" and the general principle
 * that detected/preset values must never feel like a black box). Every tracked value
 * already carries a source in `project.provenance`; this is what makes it visible.
 */

export const PROVENANCE_LABEL: Record<ValueSource, string> = {
  default: "Default value",
  extracted: "From your uploaded logo",
  preset: "From a preset",
  user: "Set manually",
  imported: "Imported from a public submission",
};

export function provenanceOf(project: DesignProject | null, path: string): ValueSource {
  return project?.provenance[path] ?? "default";
}

export function provenanceLabel(project: DesignProject | null, path: string): string {
  return PROVENANCE_LABEL[provenanceOf(project, path)];
}

/** Marks every path in `paths` with `source` in one pass — used by preset facets. */
export function markProvenance(draft: DesignProject, paths: string[], source: ValueSource): void {
  for (const path of paths) draft.provenance[path] = source;
}
