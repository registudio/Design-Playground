import { z } from "zod";

/**
 * The shadcn registry shape (spec §1a) and the normalized record the playground
 * indexes (spec §2).
 *
 * Two schemas rather than one because they answer different questions. `RegistryItem`
 * is a contract with five third-party feeds we do not control and cannot version —
 * so it is deliberately permissive, and a single malformed item must never cost us a
 * whole registry. `DesignElement` is ours, so it is strict.
 */

// --- Upstream: the shared shadcn registry shape ----------------------------

export const RegistryFile = z.object({
  path: z.string(),
  type: z.string().optional(),
});

/**
 * Only `name` is genuinely required. Everything else is optional with a default:
 * these feeds add and drop fields without notice, and an item missing a `title` is
 * still a perfectly installable component — dropping it because of a cosmetic gap
 * would silently shrink the index for no user-visible benefit.
 */
export const RegistryItem = z.object({
  name: z.string().min(1),
  type: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  dependencies: z.array(z.string()).default([]),
  registryDependencies: z.array(z.string()).default([]),
  files: z.array(RegistryFile).default([]),
});
export type RegistryItem = z.infer<typeof RegistryItem>;

export const RegistryDocument = z.object({
  $schema: z.string().optional(),
  name: z.string().optional(),
  homepage: z.string().optional(),
  items: z.array(z.unknown()),
});
export type RegistryDocument = z.infer<typeof RegistryDocument>;

// --- Ours: the normalized index -------------------------------------------

export const ElementVariant = z.object({
  language: z.enum(["JS", "TS"]),
  styling: z.enum(["CSS", "TW"]),
});
export type ElementVariant = z.infer<typeof ElementVariant>;

export const RoutingCategoryEnum = z.enum([
  "charts",
  "layout-blocks",
  "text-scroll-effects",
  "signature-polish",
  "micro-interactions",
]);

export const SourceIdEnum = z.enum([
  "bklit",
  "kokonutui",
  "soralabs",
  "componentry",
  "react-bits",
]);

export const DesignElement = z.object({
  /** `${source}:${name}` — stable across refreshes, which is what selections store. */
  id: z.string(),
  name: z.string(),
  title: z.string(),
  description: z.string(),
  source: SourceIdEnum,
  category: RoutingCategoryEnum,
  installCommand: z.string(),
  npmDependencies: z.array(z.string()),
  registryDependencies: z.array(z.string()),
  /** React Bits only — the variant this entry installs by default. */
  variant: ElementVariant.optional(),
  /** Every variant upstream publishes, so the UI can offer the others. */
  availableVariants: z.array(ElementVariant).default([]),
  /** Inferred from npmDependencies. Informational: engines are toggled, not picked (§1b). */
  engineDependency: z.array(z.enum(["motion", "gsap"])).default([]),
  /** Componentry — shown as "inspect and adapt", not a one-click install (§1c). */
  referenceOnly: z.boolean(),
  /** ISO date of the fetch this entry came from. Drives the staleness warnings (§3). */
  lastVerified: z.string(),
});
export type DesignElement = z.infer<typeof DesignElement>;

/** Per-source outcome of the last refresh. A failure is reported, never swallowed. */
export const SourceStatus = z.object({
  id: SourceIdEnum,
  ok: z.boolean(),
  /** Entries contributed after variant collapsing. */
  itemCount: z.number(),
  /** Items that failed validation and were skipped — surfaced, not hidden. */
  skipped: z.number(),
  lastVerified: z.string().nullable(),
  error: z.string().optional(),
});
export type SourceStatus = z.infer<typeof SourceStatus>;

export const REGISTRY_INDEX_SCHEMA_ID = "dp-registry-index/v1" as const;

export const RegistryIndex = z.object({
  schema: z.literal(REGISTRY_INDEX_SCHEMA_ID),
  /** null when no successful fetch has ever seeded this index. */
  fetchedAt: z.string().nullable(),
  sources: z.array(SourceStatus),
  elements: z.array(DesignElement),
});
export type RegistryIndex = z.infer<typeof RegistryIndex>;

/** The starting index: genuinely empty, because inventing entries would be worse. */
export function emptyIndex(): RegistryIndex {
  return { schema: REGISTRY_INDEX_SCHEMA_ID, fetchedAt: null, sources: [], elements: [] };
}
