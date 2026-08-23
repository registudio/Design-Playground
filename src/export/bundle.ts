import { zipSync, type Zippable } from "fflate";
import type { DesignProject } from "@/schema/project";
import { AssetManifest, ASSET_ROOT } from "@/schema/assets";
import { DesignTokens } from "@/schema/tokens";
import { SiteRecipe, findEngineConflicts } from "@/schema/recipe";
import { stableStringify, assertDeterministic } from "./serialize";
import { generateCss } from "./css";

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

  // §10.1 — an uploaded face without a recorded licence must not reach a client build.
  for (const font of project.assets.fonts) {
    if (!font.license.trim()) {
      issues.push({
        severity: "error",
        message: `assets.fonts: "${font.family}" has no recorded licence`,
      });
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

  for (const doc of [tokensDoc, recipeDoc, manifestDoc]) assertDeterministic(doc);

  const files: ExportFile[] = [
    { path: "design/design.tokens.json", content: stableStringify(tokensDoc) },
    { path: "design/site.recipe.json", content: stableStringify(recipeDoc) },
    { path: "design/asset-manifest.json", content: stableStringify(manifestDoc) },
    { path: "design/globals.css", content: generateCss(tokensDoc) },
  ];

  // Binary assets, keyed in the map by the same `file` value the manifest records.
  for (const entry of [...manifestDoc.images, ...manifestDoc.fonts]) {
    const bytes = assetBytes.get(entry.file);
    if (bytes) files.push({ path: `${ASSET_ROOT}/${entry.file}`, content: bytes });
  }

  // Stable file order, so the ZIP itself is reproducible.
  files.sort((a, b) => a.path.localeCompare(b.path));

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
