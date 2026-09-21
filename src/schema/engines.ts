import { z } from "zod";

/**
 * Animation engines as project-wide capabilities (spec §1b).
 *
 * These are npm packages, not registry items: there is no `registry.json` to fetch and
 * no list of "things" to browse. §1b is explicit that the playground must not show
 * "GSAP" as a card next to "AI Input Selector" — turning an engine on is a different
 * kind of decision from picking a component, and collapsing the two into one search
 * result list would misrepresent both.
 *
 * So they live here: a handful of booleans set once per project, exported as part of
 * the recipe, and cross-checked against the motion bindings that actually need them.
 */

export const ENGINE_IDS = ["motion", "gsap", "lenis", "vanta"] as const;
export type EngineId = (typeof ENGINE_IDS)[number];

export interface EngineInfo {
  id: EngineId;
  label: string;
  package: string;
  description: string;
  /** Whether a motion binding can name this engine (§12.6's conflict rules). */
  drivesProperties: boolean;
}

export const ENGINES: readonly EngineInfo[] = [
  {
    id: "motion",
    label: "Motion",
    package: "motion",
    description: "Component-level entrance and interaction animation.",
    drivesProperties: true,
  },
  {
    id: "gsap",
    label: "GSAP",
    package: "gsap",
    description: "Timeline and scroll-driven sequencing.",
    drivesProperties: true,
  },
  {
    id: "lenis",
    label: "Lenis",
    package: "lenis",
    // Page-level rather than element-level, so it never contends for a property and
    // is exempt from the engine-conflict check.
    description: "Smooth scrolling applied to the page as a whole.",
    drivesProperties: false,
  },
  {
    id: "vanta",
    label: "Vanta",
    package: "vanta",
    description: "Animated WebGL backgrounds.",
    drivesProperties: false,
  },
] as const;

export const EngineChoices = z.object({
  motion: z.boolean(),
  gsap: z.boolean(),
  lenis: z.boolean(),
  vanta: z.boolean(),
});
export type EngineChoices = z.infer<typeof EngineChoices>;

/**
 * Motion and GSAP default on because the default recipe's own bindings already use
 * them — shipping a default project that fails its own engine check would be a poor
 * first impression. Lenis and Vanta are opt-in: both change the feel of an entire page.
 */
export function defaultEngines(): EngineChoices {
  return { motion: true, gsap: true, lenis: false, vanta: false };
}

export function engineInfo(id: EngineId): EngineInfo {
  return ENGINES.find((engine) => engine.id === id)!;
}
