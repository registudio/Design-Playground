import {
  DesignElement,
  RegistryDocument,
  RegistryItem,
  type ElementVariant,
  type SourceStatus,
} from "./schema";
import { installCommand, type RegistrySource } from "./sources";

/**
 * Turns a fetched `registry.json` into normalized `DesignElement` records (spec §3).
 *
 * The mapping itself is mechanical — the shared shadcn schema is what makes that true.
 * The two parts worth reading are variant collapsing (§1a) and the deliberate choice
 * to skip bad items rather than fail the whole source.
 */

/** Strips a version specifier: `motion@^11` -> `motion`, `@gsap/react` stays whole. */
export function packageName(dependency: string): string {
  const trimmed = dependency.trim();
  // A leading @ is a scope, not a version separator, so start the search past it.
  const separator = trimmed.indexOf("@", trimmed.startsWith("@") ? 1 : 0);
  return (separator === -1 ? trimmed : trimmed.slice(0, separator)).toLowerCase();
}

/**
 * Which animation engines an item pulls in.
 *
 * Informational only: §1b is explicit that engines are project-wide capabilities
 * toggled once, not things picked per component. This exists so a Sora UI entry can
 * *show* that it needs GSAP — browsable metadata on a pickable item — not so the
 * browser can offer GSAP as a result.
 */
export function inferEngines(dependencies: string[]): Array<"motion" | "gsap"> {
  const engines = new Set<"motion" | "gsap">();
  for (const dependency of dependencies) {
    const name = packageName(dependency);
    if (name === "motion" || name === "framer-motion") engines.add("motion");
    if (name === "gsap" || name.startsWith("@gsap/")) engines.add("gsap");
  }
  // Sorted so the same input always serializes identically into the snapshot.
  return [...engines].sort();
}

/** `ClickSpark-TS-TW` -> base `ClickSpark` + variant. Returns null when unsuffixed. */
export function parseVariant(
  name: string,
): { base: string; variant: ElementVariant } | null {
  const match = /^(.*)-(JS|TS)-(CSS|TW)$/.exec(name);
  if (!match) return null;
  const [, base, language, styling] = match;
  return {
    base: base!,
    variant: { language: language as "JS" | "TS", styling: styling as "CSS" | "TW" },
  };
}

/**
 * How good a variant is as the one entry we surface.
 *
 * This project's own scaffold is always TypeScript + Tailwind, so `-TS-TW` wins
 * outright (§1a). The rest of the order only decides which stand-in appears when a
 * component happens not to publish TS-TW — it is a tiebreak, not a recommendation.
 */
function variantRank(variant: ElementVariant): number {
  if (variant.language === "TS" && variant.styling === "TW") return 0;
  if (variant.language === "TS") return 1;
  if (variant.styling === "TW") return 2;
  return 3;
}

export interface NormalizeResult {
  elements: DesignElement[];
  status: SourceStatus;
}

/**
 * Normalizes one registry document.
 *
 * `lastVerified` is passed in rather than read from the clock here so that every
 * element from one refresh carries the identical timestamp, and so tests are not
 * time-dependent.
 */
export function normalizeDocument(
  source: RegistrySource,
  document: unknown,
  lastVerified: string,
): NormalizeResult {
  const parsed = RegistryDocument.safeParse(document);
  if (!parsed.success) {
    return {
      elements: [],
      status: {
        id: source.id,
        ok: false,
        itemCount: 0,
        skipped: 0,
        lastVerified: null,
        error: `Response is not a registry document: ${parsed.error.issues[0]?.message ?? "unknown shape"}`,
      },
    };
  }

  // Validated per item, not as one array: one malformed entry in a 200-item feed
  // should cost that entry, not the other 199.
  const items: RegistryItem[] = [];
  let skipped = 0;
  for (const raw of parsed.data.items) {
    const item = RegistryItem.safeParse(raw);
    if (item.success) items.push(item.data);
    else skipped++;
  }

  const elements = source.id === "react-bits" ? collapseVariants(source, items, lastVerified)
    : items.map((item) => toElement(source, item, item.name, undefined, [], lastVerified));

  // Stable order, so a refresh that changes nothing produces a byte-identical snapshot.
  elements.sort((a, b) => a.id.localeCompare(b.id));

  return {
    elements,
    status: {
      id: source.id,
      ok: true,
      itemCount: elements.length,
      skipped,
      lastVerified,
    },
  };
}

/**
 * Collapses React Bits' four-way variant explosion into one entry per component.
 *
 * `ClickSpark-JS-CSS` / `-JS-TW` / `-TS-CSS` / `-TS-TW` are one conceptual component
 * published four times. Left alone that is ~820 rows for React Bits where ~205 are
 * meaningful, and the picker becomes a wall of near-duplicates — §1a calls this a
 * data-modeling problem rather than a display gotcha for exactly that reason.
 */
export function collapseVariants(
  source: RegistrySource,
  items: RegistryItem[],
  lastVerified: string,
): DesignElement[] {
  const groups = new Map<string, Array<{ item: RegistryItem; variant: ElementVariant }>>();
  const unsuffixed: RegistryItem[] = [];

  for (const item of items) {
    const parsed = parseVariant(item.name);
    if (!parsed) {
      unsuffixed.push(item);
      continue;
    }
    const group = groups.get(parsed.base) ?? [];
    group.push({ item, variant: parsed.variant });
    groups.set(parsed.base, group);
  }

  const elements: DesignElement[] = [];

  for (const [base, group] of groups) {
    const ranked = [...group].sort((a, b) => variantRank(a.variant) - variantRank(b.variant));
    const chosen = ranked[0]!;
    // The id keys off the *base* name, so a selection survives React Bits publishing
    // or dropping a variant. The install command still targets the concrete item.
    elements.push(
      toElement(
        source,
        chosen.item,
        base,
        chosen.variant,
        ranked.map((entry) => entry.variant),
        lastVerified,
      ),
    );
  }

  for (const item of unsuffixed) {
    elements.push(toElement(source, item, item.name, undefined, [], lastVerified));
  }

  return elements;
}

function toElement(
  source: RegistrySource,
  item: RegistryItem,
  logicalName: string,
  variant: ElementVariant | undefined,
  availableVariants: ElementVariant[],
  lastVerified: string,
): DesignElement {
  return {
    id: `${source.id}:${logicalName}`,
    name: logicalName,
    // Registries are inconsistent about title; the item name is a serviceable
    // fallback and keeps the card from rendering a blank heading.
    title: item.title?.trim() || logicalName,
    description: item.description?.trim() ?? "",
    source: source.id,
    category: source.category,
    // Targets the concrete published item, which for React Bits is the suffixed name.
    installCommand: installCommand(source.id, item.name),
    npmDependencies: item.dependencies,
    registryDependencies: item.registryDependencies,
    variant,
    availableVariants,
    engineDependency: inferEngines(item.dependencies),
    referenceOnly: source.referenceOnly,
    lastVerified,
  };
}
