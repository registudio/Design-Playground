import evidenceFile from "../../data/element-evidence.json";
import { ELEMENTS } from "./catalogue";
import { describeElement } from "./descriptions";
import { engineFor } from "./extended-catalogue";
import { browseCategory, type BrowseCategory } from "./taxonomy";
import { scoreElement, signalsIn, type PreviewOutcome, type Score, type SourceSignals } from "./score";
import { licenceFor } from "@/registry/licences";
import { REGISTRY_SOURCES } from "@/registry/sources";
import type { DesignElement } from "@/registry/schema";

/**
 * Each element's score (see score.ts), from the rubric and the measured evidence.
 *
 * The evidence (data/element-evidence.json) is what could only be learned by running or
 * reading an element: whether its preview rendered, and the accessibility signals in its
 * published source. It is written by scripts/score-evidence.mjs from a render of every
 * entry; an entry added since, by a registry refresh, scores on midpoints until the next.
 */
interface Evidence {
  /** Preview outcome. */
  p?: PreviewOutcome;
  /** Signals as four 0/1 digits: aria, keyboard, reduced motion, semantic. */
  s?: string;
}
const EVIDENCE = (evidenceFile as { elements: Record<string, Evidence> }).elements;

const decode = (digits?: string): SourceSignals | undefined => digits?.length === 4
  ? { aria: digits[0] === "1", keyboard: digits[1] === "1", reducedMotion: digits[2] === "1", semantic: digits[3] === "1" }
  : undefined;

/** What each engine-backed original installs, for the weight part. */
const ENGINE_PACKAGES: Record<string, string[]> = { motion: ["motion"], lenis: ["lenis"], vanta: ["three"], shader: [] };

const memo = new Map<string, Score>();

export function originalScore(id: string): Score {
  const cached = memo.get(id);
  if (cached) return cached;
  const element = ELEMENTS.find((item) => item.id === id);
  if (!element) return scoreElement({ category: "Signature effects", dependencies: [], licence: "unknown", described: false, referenceOnly: false });
  const engine = engineFor(id);
  const result = scoreElement({
    category: element.category as BrowseCategory,
    dependencies: engine ? ENGINE_PACKAGES[engine.id] ?? [] : [],
    // Playground's own work, or ported or vendored under a licence recorded beside it.
    licence: "clear",
    described: true,
    referenceOnly: false,
    preview: EVIDENCE[id]?.p,
    // Every original document carries the reduced-motion rule in elementDocument, so
    // the element's own markup and script are read for the rest.
    signals: { ...signalsIn(`${element.html}\n${element.css}\n${element.js}`), reducedMotion: true },
  });
  memo.set(id, result);
  return result;
}

export function registryScore(element: DesignElement): Score {
  const cached = memo.get(element.id);
  if (cached) return cached;
  const licence = licenceFor(element.source);
  const derived = `${(element.title || element.name).replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]+/g, " ").trim().toLowerCase()}.`;
  const result = scoreElement({
    category: browseCategory(element),
    dependencies: element.npmDependencies,
    licence: !licence ? "unknown" : licence.restriction ? "restricted" : "clear",
    described: describeElement(element).toLowerCase() !== derived,
    referenceOnly: element.referenceOnly,
    preview: EVIDENCE[element.id]?.p,
    signals: decode(EVIDENCE[element.id]?.s),
  });
  memo.set(element.id, result);
  return result;
}

/** Tie order for equal scores: Playground originals first, then registries as listed. */
export function sourceRank(registrySource?: string): number {
  if (!registrySource) return 0;
  const index = REGISTRY_SOURCES.findIndex((source) => source.id === registrySource);
  return index === -1 ? REGISTRY_SOURCES.length + 1 : index + 1;
}
