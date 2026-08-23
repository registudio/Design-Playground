import { z } from "zod";
import { Oklch } from "./primitives";

/**
 * asset-manifest.json — records company assets without embedding binaries (§15.3).
 *
 * The spec's example uses bare filenames ("logo.svg"). That is ambiguous for a
 * consumer, so this schema fixes the contract: every `file` is a path relative to
 * ASSET_ROOT, and the export bundle writes the binaries to exactly that location.
 * Each entry also carries mime type, intrinsic dimensions and a content hash so the
 * build step can pick sizes and detect changes without re-reading every file.
 */

export const ASSETS_SCHEMA_ID = "asset-manifest/v1" as const;

/** Manifest `file` paths are relative to this directory inside the exported bundle. */
export const ASSET_ROOT = "design/assets" as const;

/** §10.1 classification vocabulary. */
export const AssetKind = z.enum([
  "logo", "logo-mark", "logo-light", "logo-dark", "hero-image", "product-screenshot",
  "icon", "illustration", "photography", "font", "other",
]);
export type AssetKind = z.infer<typeof AssetKind>;

export const AssetEntry = z.object({
  /** Path relative to ASSET_ROOT, e.g. "logo.svg". */
  file: z.string(),
  kind: AssetKind,
  mime: z.string(),
  bytes: z.number().int().min(0),
  /** Intrinsic pixel dimensions; absent for fonts and unsized vectors. */
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  /** SHA-256 of the file contents, for change detection. */
  hash: z.string(),
  hasTransparency: z.boolean().optional(),
  /** Colours detected during analysis (§10.1), retained for provenance. */
  detectedColors: z.array(Oklch).optional(),
});
export type AssetEntry = z.infer<typeof AssetEntry>;

export const FontAsset = AssetEntry.extend({
  kind: z.literal("font"),
  family: z.string(),
  weight: z.number().int().optional(),
  style: z.enum(["normal", "italic"]).default("normal"),
  /** Required for uploaded faces so licensing is explicit at build time (§10.1). */
  license: z.string(),
});
export type FontAsset = z.infer<typeof FontAsset>;

export const AssetManifest = z.object({
  schema: z.literal(ASSETS_SCHEMA_ID),
  root: z.literal(ASSET_ROOT),
  logo: z
    .object({
      primary: z.string().optional(),
      light: z.string().optional(),
      dark: z.string().optional(),
      mark: z.string().optional(),
    })
    .default({}),
  fonts: z.array(FontAsset).default([]),
  images: z.array(AssetEntry).default([]),
});
export type AssetManifest = z.infer<typeof AssetManifest>;
