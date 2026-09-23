import type { DesignProject } from "@/schema/project";
import { pageSections, SECTION_LABELS, type PageSection } from "@/schema/composition";
import { sourceById } from "@/registry/sources";
import { ELEMENTS, elementOrigin } from "@/elements/catalogue";

export function buildHandoff(project: DesignProject): string {
  const sections = pageSections(project.recipe);
  return [
    `# ${project.name} — design handoff`, "", project.client ? `Client: ${project.client}` : "Personal project", "",
    "## Start here", "",
    "Open preview.html to review the composed sample page. It is a design reference, not a production website. Built-in element demos are interactive; page-level Motion/GSAP animations and the custom cursor need implementation using the recipe.",
    "The design/ folder contains tokens, CSS, the ordered site recipe and uploaded assets. elements/ contains standalone HTML/CSS/JavaScript for every selected built-in effect. These files have no package dependencies and include reduced-motion fallbacks. Adapt their markup and styles to your components.",
    "Registry selections retain verified install commands in design-playground-selection.json. They are implementation references, not rendered third-party source code. Register the source aliases from components.registries.json in your project's components.json before using those commands. Reference-only components should be inspected and adapted.", "",
    "## Design decisions", "", `Template: ${project.appliedPreset ?? "None — custom composition"}`,
    `Colour scheme: ${project.recipe.unset?.includes("colors") ? "Undecided; preview uses neutral fallback values" : "See design/design.tokens.json"}`,
    `Typography: ${project.recipe.unset?.includes("typography") ? "Undecided; preview uses system fonts" : `${project.tokens.typography.display.family} / ${project.tokens.typography.body.family}`}`,
    `Cursor: ${project.recipe.cursorImage ? "Custom uploaded image (embedded in site.recipe.json)" : project.recipe.components.cursor}`,
    `Enabled engines: ${Object.entries(project.recipe.engines).filter(([, enabled]) => enabled).map(([engine]) => engine).join(", ") || "None"}`, "",
    "## Page order", "", ...(sections.length ? sections.map((key, i) => `${i + 1}. ${SECTION_LABELS[key]} — ${project.recipe.components[key]}`) : ["Intentionally empty. Do not add sections without agreement."]), "",
    "## Selected effects & notes", "", ...(project.recipe.elements ?? []).map(e => `### ${ELEMENTS.find(item => item.id === e.id)?.title ?? e.id}\nOrigin: ${elementOrigin(e.id).name} (${elementOrigin(e.id).runtime})\nPlacement: ${e.placement === "page" ? "End of page" : `after ${e.placement}`}\n\n${e.note || "No additional note."}\n\nSource: elements/${e.id}.html\n`),
    ...project.selections.map(e => `### ${e.title}\nSource: [${sourceById(e.source)?.label ?? e.source}](${sourceById(e.source)?.homepage ?? ""})${e.referenceOnly ? " (reference only)" : ""}\nPlacement: ${e.placement === "page" || !e.placement ? "Not placed — decide during build" : `after ${SECTION_LABELS[e.placement as PageSection] ?? e.placement}`}\n\n${e.intendedUse || "No additional note."}\n\nInstall: ${e.installCommand}\n`),
    "## Project notes", "", project.notes || "No additional notes.", "",
    "## Implementation checklist", "", "- Preserve the section order, omitted sections and undecided choices.",
    "- Apply design tokens and replace sample copy with approved content.", "- Integrate selected effects at their recorded placements; notes describe intent.",
    "- Self-host fonts where appropriate and retain uploaded font licensing information.", "- Respect prefers-reduced-motion, touch input and keyboard focus.",
    "- Check layout at mobile, tablet and desktop widths before shipping.", "",
  ].join("\n");
}

/**
 * The README for an elements-only export.
 *
 * Deliberately short. The full handoff explains a whole design; this one answers the
 * only questions someone opening a folder of element files actually has — what each
 * file is, where it was meant to go, and what it needs to run.
 */
export function elementsHandoff(
  project: DesignProject,
  chosen: { id: string; note: string; placement: string }[],
): string {
  const engines = new Set<string>();
  for (const element of chosen) {
    const origin = elementOrigin(element.id);
    if (origin.url) engines.add(origin.runtime);
  }
  const placed = (placement: string) =>
    placement === "page" || !placement
      ? "Not placed — decide during build"
      : `After ${SECTION_LABELS[placement as PageSection] ?? placement}`;

  return [
    `# ${project.name} — elements`, "",
    project.client ? `Client: ${project.client}` : "Personal project", "",
    "Just the effects from this project. No tokens, no page recipe, no sample page — see",
    "the full export for those.", "",
    "## The files", "",
    chosen.length
      ? "Each `.html` file here is one effect, standalone: open it in a browser and it runs. There are no package dependencies, the project's accent colour is already applied, and each one keeps working with `prefers-reduced-motion` set. Lift the markup, CSS and script into your own components rather than embedding the file."
      : "No built-in effects were selected, so there are no element files here.",
    "",
    ...(chosen.length ? chosen.flatMap(element => {
      const origin = elementOrigin(element.id);
      return [
        `### ${ELEMENTS.find(item => item.id === element.id)?.title ?? element.id}`,
        `File: \`${element.id}.html\``,
        `Runtime: ${origin.runtime}${origin.url ? ` (${origin.url})` : ""}`,
        `Placement: ${placed(element.placement)}`,
        "",
        element.note || "No additional note.",
        "",
      ];
    }) : []),
    ...(engines.size ? [
      "## Bundled runtimes", "",
      `${[...engines].join(", ")} ${engines.size === 1 ? "is" : "are"} embedded directly in the element files above, so nothing is fetched at runtime. Licence notices are in ENGINE-LICENSES.txt; keep them with the code if you ship it.`,
      "",
    ] : []),
    ...(project.selections.length ? [
      "## Registry components", "",
      "These were chosen from third-party registries, so there is no source code here — only the verified install commands, in `design-playground-selection.json` at the root of this export. Register the aliases from `components.registries.json` in your project's `components.json` first.",
      "",
      ...project.selections.flatMap(selection => [
        `### ${selection.title}`,
        `Source: ${sourceById(selection.source)?.label ?? selection.source}${selection.referenceOnly ? " — reference only, adapt rather than install" : ""}`,
        `Placement: ${placed(selection.placement)}`,
        selection.engineDependency.length ? `Needs: ${selection.engineDependency.join(", ")}` : "",
        "",
        selection.intendedUse || "No additional note.",
        "",
        `Install: \`${selection.installCommand}\``,
        "",
      ].filter(line => line !== "")),
    ] : []),
  ].join("\n");
}
