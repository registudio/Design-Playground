/**
 * Mesh-gradient backgrounds in the manner of ShaderGradient (shadergradient.co).
 *
 * Markup and styling only: every one of these is drawn by the `shader` engine bundle,
 * which is why `js` is empty and why each element's id carries the `shader-` prefix
 * `engineFor` matches on. The runtime, and the reasoning behind drawing these in plain
 * WebGL rather than installing ShaderGradient itself, is in scripts/shader-runtime.mjs.
 *
 * Two rules hold for all eight:
 *
 * 1. The `#sg-*` id is the demo's root selector. Changing one without changing
 *    scripts/engine-demos.mjs gives a card that renders a still background and never
 *    moves, with nothing thrown to notice — tests/new-elements.test.ts holds the pair
 *    together.
 * 2. `--fallback` is a CSS gradient of the same three colours as the shader. It is what
 *    shows when WebGL is unavailable, and it is deliberately not the accent colour: the
 *    palette is the point of the element.
 */
import type { BrowseCategory } from "./taxonomy";

interface ShaderElement {
  id: string;
  title: string;
  category: BrowseCategory;
  description: string;
  /** Overline above the headline, in the tool's own vocabulary. */
  label: string;
  headline: string;
  /** Painted under the canvas for the no-WebGL case. */
  fallback: string;
  /** Only where the element needs more than the shared layout. */
  extra?: string;
}

const SHARED_CSS = `.sg{position:absolute;inset:0;display:grid;place-items:center;overflow:hidden}
.sg-canvas{position:absolute;inset:0;display:block;width:100%;height:100%}
.sg .center{position:relative;z-index:1;padding:20px;pointer-events:none;text-shadow:0 2px 24px rgba(0,0,0,.55),0 1px 3px rgba(0,0,0,.4)}
/* These sit on colours chosen for the palette, not for legibility, and the palette
   changes across the eight. A pill carries its own contrast on any of them. */
.sg .center small{background:rgba(0,0,0,.42);color:#fff;padding:5px 11px;border-radius:999px;text-shadow:none}
.sg .engine-status{font-size:11px;color:#fff;background:rgba(0,0,0,.42);border-radius:999px;padding:3px 10px;margin:0;text-shadow:none}
.sg .engine-status:empty{display:none}`;

const SHADERS: ShaderElement[] = [
  {
    id: "shader-plane",
    title: "Shader plane",
    category: "Backgrounds",
    description:
      "A flat sheet of colour folded by Perlin noise — ShaderGradient's default plane, drawn in WebGL. Holds one still frame under reduced motion.",
    label: "SHADERGRADIENT · PLANE",
    headline: "Warmth,<br>on a surface.",
    fallback: "linear-gradient(145deg,#ff5005,#dbba95 52%,#d0bce1)",
  },
  {
    id: "shader-sphere",
    title: "Shader sphere",
    category: "Backgrounds",
    description:
      "The same noise wrapped over a ball instead of a sheet, with a rim light picking out its edge. ShaderGradient's sphere type.",
    label: "SHADERGRADIENT · SPHERE",
    headline: "A world<br>of your own.",
    fallback: "radial-gradient(circle at 42% 38%,#d2ef9e,#4a6fa5 38%,#242e3d 62%,#111412 63%)",
  },
  {
    id: "shader-water",
    title: "Shader water plane",
    category: "Backgrounds",
    description:
      "A plane laid back into perspective so its folds compress towards the horizon. ShaderGradient's waterPlane type.",
    label: "SHADERGRADIENT · WATERPLANE",
    headline: "Somewhere<br>past the edge.",
    fallback: "linear-gradient(0deg,#bfe3c6,#0e7c7b 46%,#05202e)",
  },
  {
    id: "shader-dusk",
    title: "Dusk gradient",
    category: "Backgrounds",
    description:
      "A slow, wide fold through violet and amber. Low density and high amplitude — the settings that make a gradient read as light rather than pattern.",
    label: "SHADERGRADIENT · DUSK",
    headline: "The hour<br>before dark.",
    fallback: "linear-gradient(160deg,#1b1035,#8c3a72 55%,#f7a072)",
  },
  {
    id: "shader-grain",
    title: "Grain gradient",
    category: "Backgrounds",
    description:
      "The same gradient carrying heavy film grain, which is what stops a wide colour ramp banding on an ordinary screen.",
    label: "SHADERGRADIENT · GRAIN",
    headline: "Texture<br>beats polish.",
    fallback: "linear-gradient(135deg,#111412,#3f5d3a 58%,#d2ef9e)",
  },
  {
    id: "shader-duotone",
    title: "Duotone shader",
    category: "Backgrounds",
    description:
      "Two colours and a hard contrast curve, so the noise reads as distinct bands rather than a blend. High density, no grain.",
    label: "SHADERGRADIENT · DUOTONE",
    headline: "Two colours.<br>That's the brief.",
    fallback: "linear-gradient(120deg,#101820 58%,#f2aa4c)",
  },
  {
    id: "shader-drift",
    title: "Slow drift",
    category: "Backgrounds",
    description:
      "A water plane moving slowly enough to sit behind reading copy without pulling at it. The speed control doing the work.",
    label: "SHADERGRADIENT · DRIFT",
    headline: "Take<br>your time.",
    fallback: "linear-gradient(0deg,#ffd6a5,#7597de 48%,#2b1055)",
  },
  {
    id: "shader-pointer",
    title: "Pointer-lit sphere",
    category: "Cursor effects",
    description:
      "A sphere whose noise field follows the pointer, so the light appears to move with the cursor. Falls back to a still sphere under reduced motion.",
    label: "SHADERGRADIENT · POINTER",
    headline: "Move the light.",
    fallback: "radial-gradient(circle at 50% 42%,#f0abfc,#6d28d9 36%,#120d1f 60%,#111412 61%)",
    extra: ".sg{cursor:crosshair}",
  },
];

export const SHADER_ELEMENTS = SHADERS.map(({ id, title, category, description, label, headline, fallback, extra }) => ({
  id,
  title,
  category,
  description,
  tag: "ShaderGradient",
  html: `<div class="sg" id="${id.replace("shader-", "sg-")}"><canvas class="sg-canvas" aria-hidden="true"></canvas><div class="center"><small>${label}</small><h1>${headline}</h1><p class="engine-status" aria-live="polite"></p></div></div>`,
  css: `${SHARED_CSS}
.sg{background:${fallback}}${extra ? `\n${extra}` : ""}`,
  js: "",
}));
