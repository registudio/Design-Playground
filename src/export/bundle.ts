import { zipSync, type Zippable } from "fflate";
import type { DesignProject } from "@/schema/project";
import { AssetManifest, ASSET_ROOT } from "@/schema/assets";
import { DesignTokens } from "@/schema/tokens";
import { SiteRecipe, findEngineConflicts, findDisabledEngineUses } from "@/schema/recipe";
import { toSelectionDocument } from "@/schema/selection";
import { stableStringify, assertDeterministic } from "./serialize";
import { generateCss } from "./css";
import { buildHandoff } from "./handoff";
import { ELEMENTS, elementDocument } from "@/elements/catalogue";
import { REGISTRY_SOURCES } from "@/registry/sources";

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

export interface ExportResult {
  files: ExportFile[];
  issues: ValidationIssue[];
}

/** §15.7 requires schema validation before export. Errors block; warnings do not. */
export function validate(project: DesignProject): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

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
): ExportResult {
  const issues = validate(project);

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
  for (const element of project.recipe.elements ?? []) {
    if (ELEMENTS.some(item => item.id === element.id)) files.push({ path: `elements/${element.id}.html`, content: elementDocument(element.id) });
  }

  // Omitted entirely when nothing is selected: §5 has Phase 2 skip its sourcing
  // question when the file is *present*, so shipping an empty one would suppress that
  // question while answering nothing.
  if (selectionDoc.selections.length) {
    files.push({ path: "components.registries.json", content: stableStringify({ registries: Object.fromEntries(REGISTRY_SOURCES.map(source => [`@${source.id}`, source.endpoint.replace("registry.json", "{name}.json")])) }) });
    files.push({
      path: "design-playground-selection.json",
      content: stableStringify(selectionDoc),
    });
  }

  // Binary assets, keyed in the map by the same `file` value the manifest records.
  for (const entry of [...manifestDoc.images, ...manifestDoc.fonts]) {
    const bytes = assetBytes.get(entry.file);
    if (bytes) files.push({ path: `${ASSET_ROOT}/${entry.file}`, content: bytes });
  }

  // Stable file order, so the ZIP itself is reproducible.
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
