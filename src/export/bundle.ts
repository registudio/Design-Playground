import { zipSync, type Zippable } from "fflate";
import type { DesignProject } from "@/schema/project";
import { AssetManifest, ASSET_ROOT } from "@/schema/assets";
import { DesignTokens } from "@/schema/tokens";
import { SiteRecipe, findEngineConflicts, findDisabledEngineUses } from "@/schema/recipe";
import { toSelectionDocument } from "@/schema/selection";
import { stableStringify, assertDeterministic } from "./serialize";
import { generateCss } from "./css";
import { buildHandoff, elementsHandoff } from "./handoff";
import { ELEMENTS, elementDocument } from "@/elements/catalogue";
import { REGISTRY_SOURCES, sourceById } from "@/registry/sources";
import { licenceFor } from "@/registry/licences";
import { toHex } from "@/color/oklch";
import { resolveSemantic } from "@/color/semantic";
import { qualityReport } from "./quality-report";

/**
 * Builds the export bundle (§15).
 *
 * Output layout — asset paths in the manifest resolve against ASSET_ROOT, which is
 * what makes the manifest usable by a consumer rather than a list of bare filenames:
 *
 *   design/design.tokens.json
 *   design/site.recipe.json
 *   design/asset-manifest.json
 *   design/globals.css          (generated, so the contract is proven at export time)
 *   design/assets/<files>
 *   design-playground-selection.json
 *
 * The selection file sits at the bundle root rather than under design/ because §5
 * specifies it at the target project's root — that is where web-stack-init's Phase 2
 * looks for it. The other three keep their existing location; this one has its own.
 */

export interface ExportFile {
  path: string;
  /** Text for JSON/CSS, bytes for binary assets. */
  content: string | Uint8Array;
}

export interface ValidationIssue {
  severity: "error" | "warning";
  message: string;
}

/**
 * How much of the project the bundle carries.
 *
 * "everything" is the full design handoff. "elements" is for the common case of wanting
 * the effects on their own — the standalone element documents and the install commands
 * for registry picks, without tokens, recipe, assets or the sample page. Those are the
 * parts that are genuinely self-contained: an element document already has the project's
 * accent baked into it, so it needs nothing else from the bundle to look right.
 */
export type ExportScope = "everything" | "elements";

export interface ExportResult {
  files: ExportFile[];
  issues: ValidationIssue[];
}

/**
 * A registry component's licence, as an export warning where it needs a person's
 * attention: none could be verified, or it restricts more than MIT. A warning rather
 * than an error — the terms may well be fine; what is missing is our confirmation.
 */
function licenceIssues(selection: DesignProject["selections"][number]): ValidationIssue[] {
  const licence = licenceFor(selection.source);
  if (!licence) return [{ severity: "warning", message: `selections: "${selection.title}" comes from ${sourceById(selection.source)?.label ?? selection.source}, which states no licence that could be verified — confirm the terms with the publisher before delivering it to a client` }];
  if (licence.restriction) return [{ severity: "warning", message: `selections: "${selection.title}" is ${licence.name}: ${licence.restriction}` }];
  return [];
}

/** Third-party licences for the registry picks, as a file a client's developer can keep. */
export function thirdPartyLicences(selections: DesignProject["selections"]): string {
  const bySource = new Map<string, string[]>();
  for (const selection of [...selections].sort((a, b) => a.id.localeCompare(b.id))) {
    bySource.set(selection.source, [...(bySource.get(selection.source) ?? []), selection.title]);
  }
  return ["# Third-party component licences", "",
    "The registry components chosen for this project are installed from their publishers, not shipped here. These are the terms they are published under, as read from each publisher's licence file on the date shown. Re-check before launch: licences can change.", "",
    ...[...bySource.entries()].flatMap(([source, titles]) => {
      const licence = licenceFor(source as Parameters<typeof licenceFor>[0]);
      const label = sourceById(source as Parameters<typeof sourceById>[0])?.label ?? source;
      return [`## ${label}`, "",
        licence ? `Licence: ${licence.name} — ${licence.url} (read ${licence.checked})` : "Licence: **not stated anywhere we could verify.** Confirm the terms with the publisher before delivering these to a client.",
        ...(licence?.restriction ? ["", `Restriction: ${licence.restriction}`] : []),
        "", ...titles.map(title => `- ${title}`), ""];
    })].join("\n");
}

/**
 * §15.7 requires schema validation before export. Errors block; warnings do not.
 *
 * Scoped to what the bundle will actually contain: an elements-only export carries no
 * tokens, recipe or asset manifest, so blocking it on a schema error in a document it
 * does not ship would refuse an export that is perfectly valid.
 */
export function validate(project: DesignProject, scope: ExportScope = "everything"): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const selectedElements = (project.recipe.elements ?? []).filter(element => ELEMENTS.some(item => item.id === element.id));

  if (scope === "elements") {
    if (!selectedElements.length && !project.selections.length) {
      issues.push({ severity: "error", message: "No elements are selected, so there is nothing to export. Pick some in the Elements step first." });
    }
    for (const selection of project.selections) {
      issues.push(...licenceIssues(selection));
      if (selection.referenceOnly) {
        issues.push({ severity: "warning", message: `selections: "${selection.title}" is a reference-only source — adapt it rather than installing as-is` });
      }
      for (const engine of selection.engineDependency) {
        if (!project.recipe.engines[engine]) {
          issues.push({ severity: "warning", message: `selections: "${selection.title}" needs the ${engine} engine, which is switched off` });
        }
      }
    }
    return issues;
  }

  const tokens = DesignTokens.safeParse(project.tokens);
  if (!tokens.success) {
    for (const issue of tokens.error.issues) {
      issues.push({ severity: "error", message: `tokens.${issue.path.join(".")}: ${issue.message}` });
    }
  }

  const recipe = SiteRecipe.safeParse(project.recipe);
  if (!recipe.success) {
    for (const issue of recipe.error.issues) {
      issues.push({ severity: "error", message: `recipe.${issue.path.join(".")}: ${issue.message}` });
    }
  }

  const manifest = AssetManifest.safeParse(project.assets);
  if (!manifest.success) {
    for (const issue of manifest.error.issues) {
      issues.push({ severity: "error", message: `assets.${issue.path.join(".")}: ${issue.message}` });
    }
  }

  // §12.6 — two engines must never drive the same property on the same element.
  for (const group of ["entrance", "interaction", "scroll"] as const) {
    for (const conflict of findEngineConflicts(project.recipe.motion[group])) {
      issues.push({
        severity: "error",
        message: `motion.${group}: "${conflict.a}" and "${conflict.b}" both animate "${conflict.property}" with different engines`,
      });
    }
  }

  // §1b — the engine list tells the consumer what to install. A binding that needs an
  // engine the project switched off would export a recipe that cannot run.
  for (const use of findDisabledEngineUses(project.recipe)) {
    issues.push({
      severity: "error",
      message: `motion.${use.group}.${use.binding} uses "${use.engine}", but that engine is switched off`,
    });
  }

  // §10.1 — an uploaded face without a recorded licence must not reach a client build.
  for (const font of project.assets.fonts) {
    if (!font.license.trim()) {
      issues.push({
        severity: "error",
        message: `assets.fonts: "${font.family}" has no recorded licence`,
      });
    }
  }

  // §5's intendedUse is what turns a selection into an answered design-interview
  // question downstream ("hero headline reveal"). Without it the consumer gets a bare
  // install command and has to ask anyway, so this is worth flagging — but not
  // blocking, since a selection with no stated use is still a real selection.
  for (const selection of project.selections) {
    issues.push(...licenceIssues(selection));
    if (!selection.intendedUse.trim()) {
      issues.push({
        severity: "warning",
        message: `selections: "${selection.title}" has no intended use recorded`,
      });
    }
    // §1c — Componentry is "inspect and customize", not "install as-is". Exporting it
    // alongside four installable registries without a word would misrepresent it.
    if (selection.referenceOnly) {
      issues.push({
        severity: "warning",
        message: `selections: "${selection.title}" is a reference-only source — adapt it rather than installing as-is`,
      });
    }
    // §1b's one real intersection between the two halves: an element carries the
    // engines it depends on, and installing one whose engine the project has switched
    // off gives a component that cannot run. A warning rather than an error, because
    // the fix might equally be to turn the engine on after seeing this.
    for (const engine of selection.engineDependency) {
      if (!project.recipe.engines[engine]) {
        issues.push({
          severity: "warning",
          message: `selections: "${selection.title}" needs the ${engine} engine, which is switched off`,
        });
      }
    }
  }

  // Referenced logo files must actually be present in the manifest.
  const known = new Set(project.assets.images.map((i) => i.file));
  for (const [slot, file] of Object.entries(project.assets.logo)) {
    if (file && !known.has(file)) {
      issues.push({ severity: "warning", message: `assets.logo.${slot} references missing file "${file}"` });
    }
  }

  return issues;
}

export function buildExport(
  project: DesignProject,
  assetBytes: Map<string, Uint8Array> = new Map(),
  scope: ExportScope = "everything",
): ExportResult {
  const issues = validate(project, scope);
  const accent = toHex(resolveSemantic(project.tokens.colors, "light", "primary"));
  const chosen = (project.recipe.elements ?? []).filter(element => ELEMENTS.some(item => item.id === element.id));
  const registryFiles = (): ExportFile[] => project.selections.length ? [
    { path: "components.registries.json", content: stableStringify({ registries: Object.fromEntries(REGISTRY_SOURCES.map(source => [`@${source.id}`, source.endpoint.replace("registry.json", "{name}.json")])) }) },
    { path: "design-playground-selection.json", content: stableStringify(toSelectionDocument(project.selections)) },
    { path: "THIRD-PARTY-LICENCES.md", content: thirdPartyLicences(project.selections) },
  ] : [];

  if (scope === "elements") {
    const selectionDocument = toSelectionDocument(project.selections);
    if (project.selections.length) assertDeterministic(selectionDocument);
    const files: ExportFile[] = [
      { path: "elements/README.md", content: elementsHandoff(project, chosen) },
      ...chosen.map(element => ({ path: `elements/${element.id}.html`, content: elementDocument(element.id, accent) })),
      ...registryFiles(),
    ];
    files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
    return { files, issues };
  }

  const tokensDoc = project.tokens;
  const recipeDoc = project.recipe;
  const manifestDoc = project.assets;
  const selectionDoc = toSelectionDocument(project.selections);

  for (const doc of [tokensDoc, recipeDoc, manifestDoc, selectionDoc]) assertDeterministic(doc);

  const files: ExportFile[] = [
    { path: "README.md", content: buildHandoff(project) },
    { path: "design/design.tokens.json", content: stableStringify(tokensDoc) },
    { path: "design/site.recipe.json", content: stableStringify(recipeDoc) },
    { path: "design/asset-manifest.json", content: stableStringify(manifestDoc) },
    { path: "design/globals.css", content: generateCss(tokensDoc) },
  ];
  for (const element of chosen) {
    files.push({ path: `elements/${element.id}.html`, content: elementDocument(element.id, accent) });
  }

  // Omitted entirely when nothing is selected: §5 has Phase 2 skip its sourcing
  // question when the file is *present*, so shipping an empty one would suppress that
  // question while answering nothing.
  files.push(...registryFiles());

  // Binary assets, keyed in the map by the same `file` value the manifest records.
  for (const entry of [...manifestDoc.images, ...manifestDoc.fonts]) {
    const bytes = assetBytes.get(entry.file);
    if (bytes) files.push({ path: `${ASSET_ROOT}/${entry.file}`, content: bytes });
  }

  // Stable file order, so the ZIP itself is reproducible.
  files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);

  files.push({ path: "EXPORT-QUALITY.md", content: qualityReport(project) });
  files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  return { files, issues };
}

/** 1980-01-01, the earliest timestamp the ZIP format can represent. */
const ZIP_EPOCH = new Date(Date.UTC(1980, 0, 1));

export function toZip(files: ExportFile[]): Uint8Array {
  const encoder = new TextEncoder();
  const zippable: Zippable = {};
  for (const file of files) {
    zippable[file.path] =
      typeof file.content === "string" ? encoder.encode(file.content) : file.content;
  }
  // mtime is pinned so two exports of the same project produce identical archives.
  // The ZIP format cannot represent epoch 0, so this is the earliest it allows.
  return zipSync(zippable, { level: 6, mtime: ZIP_EPOCH });
}
