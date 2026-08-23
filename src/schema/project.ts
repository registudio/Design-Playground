import { z } from "zod";
import { DesignTokens } from "./tokens";
import { SiteRecipe } from "./recipe";
import { AssetManifest } from "./assets";
import { Oklch, ValueSource } from "./primitives";

/**
 * The project document is the playground's own persisted state. It is a superset of
 * the three exported files: it additionally holds provenance, the asset analysis
 * results, and the suggestion snapshot that "reset to the company-asset
 * suggestion" (§10.2) restores. Only the three exported schemas are the contract
 * with web-stack-init; this one may evolve more freely.
 */

export const PROJECT_SCHEMA_ID = "dp-project/v1" as const;

export const DetectedColor = z.object({
  color: Oklch,
  /** 0..1 share of the analysed area this colour occupies. */
  weight: z.number().min(0).max(1),
  role: z.enum(["dominant", "secondary", "neutral"]),
  label: z.string(),
});
export type DetectedColor = z.infer<typeof DetectedColor>;

export const LogoAnalysis = z.object({
  assetFile: z.string(),
  /** SVG attribute parsing is exact; raster quantization is approximate. */
  method: z.enum(["svg-attributes", "raster-quantize"]),
  colors: z.array(DetectedColor),
  /** §10.1: whether the mark reads as light or dark overall. */
  polarity: z.enum(["light", "dark", "mixed"]),
  hasTransparency: z.boolean(),
  /** Suggested surfaces the mark sits well on. */
  suitableSurfaces: z.object({ light: Oklch, dark: Oklch }),
});
export type LogoAnalysis = z.infer<typeof LogoAnalysis>;

/** Records where each token value came from, keyed by dotted token path. */
export const ProvenanceMap = z.record(z.string(), ValueSource);
export type ProvenanceMap = z.infer<typeof ProvenanceMap>;

export const DesignProject = z.object({
  schema: z.literal(PROJECT_SCHEMA_ID),
  id: z.string(),
  name: z.string(),
  client: z.string().default(""),
  notes: z.string().default(""),
  /** Which preset from §14 was last applied, if any. */
  appliedPreset: z.string().nullable().default(null),

  tokens: DesignTokens,
  recipe: SiteRecipe,
  assets: AssetManifest,

  analysis: LogoAnalysis.nullable().default(null),
  /**
   * Snapshot of the palette the analyser proposed. Kept so the user can always
   * return to it — §10.2 requires reset-to-suggestion, and §10.1 requires that
   * detected colours never lock the design.
   */
  suggestion: DesignTokens.shape.colors.nullable().default(null),
  provenance: ProvenanceMap.default({}),
});
export type DesignProject = z.infer<typeof DesignProject>;

/**
 * Project metadata is stored separately from the document so the project list can be
 * rendered without deserializing every full project.
 */
export const ProjectMeta = z.object({
  id: z.string(),
  name: z.string(),
  client: z.string(),
  updatedAt: z.number(),
  createdAt: z.number(),
  /** Free-form labels for filtering the project directory (e.g. "law firm", "2024"). */
  tags: z.array(z.string()).default([]),
  /** Archived projects are hidden from the default directory view but not deleted. */
  archived: z.boolean().default(false),
});
export type ProjectMeta = z.infer<typeof ProjectMeta>;

/**
 * A named snapshot: a full, restorable copy of a project at a point in time (§13.4's
 * future "duplicate configuration" idea, made concrete). Distinct from undo history —
 * undo is a linear, per-session log of small edits; a snapshot is a deliberate
 * checkpoint ("before client feedback", "after client feedback") a designer can return
 * to across sessions, long after the undo stack that led there is gone.
 */
export const Snapshot = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  createdAt: z.number(),
  project: DesignProject,
});
export type Snapshot = z.infer<typeof Snapshot>;
