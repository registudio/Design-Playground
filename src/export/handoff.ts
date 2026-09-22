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
