import type { BrowseCategory } from "./taxonomy";

/**
 * How professional and usable an element is likely to be in a real client site, 0–100.
 *
 * Read off evidence rather than taste, and the same rubric for every element whoever
 * made it, so a score can be argued with part by part:
 *
 *   works       30  Did its preview actually render? Measured, not assumed.
 *   robustness  20  Accessibility and resilience visible in its source: ARIA and roles,
 *                   keyboard handling, reduced motion, semantic elements. 5 each.
 *   fit         15  How often a real site needs one: inputs, page blocks and feedback
 *                   over decoration.
 *   weight      15  What installing it costs: nothing extra, a few small packages, a
 *                   motion engine, or a WebGL stack.
 *   licence     10  Clear terms for client work.
 *   complete    10  A description that says what it does; not a reference-only source.
 *
 * Where evidence is missing (an entry not yet rendered, a registry whose source could
 * not be read) a part takes its midpoint rather than zero, so the unknown sorts between
 * the proven and the broken instead of below both.
 */
export type PreviewOutcome = "ready" | "fallback" | "blank" | "failed";

/** Accessibility and resilience signals found in an element's source. */
export interface SourceSignals {
  aria: boolean;
  keyboard: boolean;
  reducedMotion: boolean;
  semantic: boolean;
}

export interface ScoreInput {
  category: BrowseCategory;
  /** npm packages it installs, bare names or `name@range`. */
  dependencies: readonly string[];
  licence: "clear" | "restricted" | "unknown";
  /** True when the description is the publisher's or a written one, not derived from the name. */
  described: boolean;
  referenceOnly: boolean;
  preview?: PreviewOutcome;
  signals?: SourceSignals;
}

export interface Score {
  score: number;
  parts: { works: number; robustness: number; fit: number; weight: number; licence: number; complete: number };
}

const WORKS: Record<PreviewOutcome, number> = { ready: 30, fallback: 12, blank: 4, failed: 0 };

const FIT: Record<BrowseCategory, number> = {
  "Buttons & inputs": 15,
  "Layout blocks": 15,
  "Loaders & feedback": 14,
  "Charts & data viz": 14,
  "Carousels": 13,
  "Galleries & media": 13,
  "Text animations": 11,
  "Scroll effects": 10,
  "Hover effects": 10,
  "Backgrounds": 8,
  "Cursor effects": 6,
  "Signature effects": 8,
  "Hooks & utilities": 5,
};

/** A WebGL stack or a physics engine: real weight, and a device that may not run it. */
const HEAVY = /^(?:three|@react-three\/|ogl$|postprocessing$|matter-js$|cannon|@splinetool\/|p5$|pixi|@pixi\/|babylonjs|@babylonjs\/|gl-matrix$|regl$)/;
/** Animation engines: worth their size when the motion is the point. */
const ENGINE = /^(?:motion$|framer-motion$|gsap$|@gsap\/|lenis$|@react-spring\/|animejs$|lottie)/;
/** The small, ubiquitous packages a shadcn project already has or barely notices. */
const LIGHT = /^(?:clsx$|tailwind-merge$|class-variance-authority$|lucide-react$|@radix-ui\/|@base-ui\/|radix-ui$|cmdk$|date-fns$|react-day-picker$|@tabler\/icons-react$|react-icons$|@headlessui\/|vaul$|sonner$|tw-animate-css$|next-themes$|@dnd-kit\/|@tanstack\/)/;

const bare = (dependency: string) => {
  const at = dependency.indexOf("@", dependency.startsWith("@") ? 1 : 0);
  return (at > 0 ? dependency.slice(0, at) : dependency).toLowerCase();
};

export function weightOf(dependencies: readonly string[]): number {
  const names = dependencies.map(bare).filter((name) => name !== "react" && name !== "react-dom");
  if (names.some((name) => HEAVY.test(name))) return 3;
  const other = names.filter((name) => !LIGHT.test(name) && !ENGINE.test(name)).length;
  const base = names.some((name) => ENGINE.test(name)) ? 11 : names.length ? 13 : 15;
  return Math.max(2, base - 2 * other);
}

export function scoreElement(input: ScoreInput): Score {
  const signals = input.signals;
  const parts = {
    works: input.preview ? WORKS[input.preview] : 15,
    robustness: signals
      ? 5 * [signals.aria, signals.keyboard, signals.reducedMotion, signals.semantic].filter(Boolean).length
      : 10,
    fit: FIT[input.category] ?? 8,
    weight: weightOf(input.dependencies),
    licence: input.licence === "clear" ? 10 : input.licence === "restricted" ? 7 : 2,
    complete: (input.described ? 6 : 0) + (input.referenceOnly ? 0 : 4),
  };
  const score = Object.values(parts).reduce((sum, part) => sum + part, 0);
  return { score: Math.max(0, Math.min(100, score)), parts };
}

/** The signals, read from source text (TSX, or an original's HTML, CSS and script). */
export function signalsIn(source: string): SourceSignals {
  return {
    aria: /\baria-[a-z]+|\brole\s*=/.test(source),
    keyboard: /onKeyDown|onKeyUp|onkeydown|keydown|tabIndex|tabindex|:focus-visible|focus-visible:/.test(source),
    reducedMotion: /prefers-reduced-motion|useReducedMotion|reducedMotion|motion-reduce:/.test(source),
    semantic: /<(?:button|a|nav|section|article|header|footer|figure|dialog|form|input|label|select|textarea|ul|ol|li|table|details)[\s>]/.test(source),
  };
}
