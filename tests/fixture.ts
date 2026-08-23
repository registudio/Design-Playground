import type { DesignProject } from "@/schema/project";
import { createProject } from "@/schema/defaults";
import { suggestPalette } from "@/color/semantic";
import { fromCss } from "@/color/oklch";
import { describe as describeColor } from "@/color/extract";

/**
 * A fixture built without any source of nondeterminism, so export output can be
 * compared byte-for-byte across runs. `createProject` calls crypto.randomUUID, so the
 * id is overwritten with a fixed value.
 */
export function fixtureProject(): DesignProject {
  const project = createProject("Acme", "Acme Pte Ltd");
  project.id = "00000000-0000-4000-8000-000000000000";

  const brandBlue = fromCss("#1d4ed8")!;
  const brandCyan = fromCss("#06b6d4")!;

  project.tokens.colors = suggestPalette({
    detected: [
      { color: brandBlue, weight: 0.6, role: "dominant", label: describeColor(brandBlue, 0) },
      { color: brandCyan, weight: 0.4, role: "dominant", label: describeColor(brandCyan, 1) },
    ],
  });
  project.suggestion = project.tokens.colors;
  return project;
}
