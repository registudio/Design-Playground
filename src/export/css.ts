import type { DesignTokens } from "@/schema/tokens";
import { SEMANTIC_TOKENS, SCALE_STEPS, type SemanticToken } from "@/schema/primitives";
import { TYPE_STEPS } from "@/schema/tokens";
import { toCss } from "@/color/oklch";
import { resolveSemantic } from "@/color/semantic";

/**
 * Generates the Tailwind v4 theme block from design.tokens.json (§15.1, §15.6).
 *
 * This exists as much to *validate* the token schema as to produce output: if
 * globals.css cannot be generated from the tokens file alone, the file is not a
 * sufficient contract for web-stack-init, and that is the single riskiest assumption
 * in the whole build spec. The same function drives the live preview, so what the
 * client approves and what the build consumes come from one code path.
 */

/** Project tokens are namespaced so they can never collide with the playground's own UI. */
export const TOKEN_PREFIX = "dp";

const v = (name: string) => `--${TOKEN_PREFIX}-${name}`;

export interface CssOptions {
  /** Emit the `@theme` wrapper Tailwind v4 expects. Off for the preview iframe. */
  tailwindTheme?: boolean;
  /** Emit the dark-theme override block. */
  includeDark?: boolean;
}

export function generateCss(tokens: DesignTokens, options: CssOptions = {}): string {
  const { tailwindTheme = true, includeDark = true } = options;
  const lines: string[] = [];

  const open = tailwindTheme ? "@theme {" : ":root {";
  lines.push(open);
  lines.push(...colorVars(tokens, "light"));
  lines.push(...typographyVars(tokens));
  lines.push(...geometryVars(tokens));
  lines.push(...layoutVars(tokens));
  lines.push(...imageryVars(tokens));
  lines.push(...motionVars(tokens));
  lines.push("}");

  if (includeDark && tokens.colors.dark) {
    lines.push("");
    // Supports both an explicit .dark class and the OS preference.
    lines.push(".dark {");
    lines.push(...colorVars(tokens, "dark"));
    lines.push("}");
    lines.push("");
    lines.push("@media (prefers-color-scheme: dark) {");
    lines.push("  :root:not(.light) {");
    lines.push(...colorVars(tokens, "dark").map((l) => `  ${l}`));
    lines.push("  }");
    lines.push("}");
  }

  lines.push("");
  lines.push(...reducedMotionBlock());

  return lines.join("\n") + "\n";
}

function colorVars(tokens: DesignTokens, theme: "light" | "dark"): string[] {
  const out: string[] = [];

  // Primitive ramps stay available so implementations can reach for an exact rung.
  for (const [name, scale] of Object.entries(tokens.colors.scales).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    for (const step of SCALE_STEPS) {
      out.push(`  ${v(`color-${name}-${step}`)}: ${toCss(scale[step])};`);
    }
  }

  for (const key of SEMANTIC_TOKENS) {
    const color = resolveSemantic(tokens.colors, theme, key as SemanticToken);
    out.push(`  ${v(`color-${key}`)}: ${toCss(color)};`);
  }
  return out;
}

function typographyVars(tokens: DesignTokens): string[] {
  const out: string[] = [];
  for (const role of ["display", "body", "mono"] as const) {
    const font = tokens.typography[role];
    const stack = [font.family, ...font.fallback].map(quoteFamily).join(", ");
    out.push(`  ${v(`font-${role}`)}: ${stack};`);
  }
  for (const step of TYPE_STEPS) {
    const s = tokens.typography.scale[step];
    const kebab = toKebab(step);
    out.push(`  ${v(`text-${kebab}`)}: ${s.size}rem;`);
    out.push(`  ${v(`text-${kebab}--line-height`)}: ${s.lineHeight};`);
    out.push(`  ${v(`text-${kebab}--letter-spacing`)}: ${s.letterSpacing}em;`);
    out.push(`  ${v(`text-${kebab}--font-weight`)}: ${s.weight};`);
  }
  return out;
}

function geometryVars(tokens: DesignTokens): string[] {
  const out: string[] = [];
  for (const [name, value] of Object.entries(tokens.geometry.radius)) {
    out.push(`  ${v(`radius-${name}`)}: ${name === "full" ? "9999px" : `${value}rem`};`);
  }
  for (const [name, value] of Object.entries(tokens.geometry.borderWidth)) {
    out.push(`  ${v(`border-${name}`)}: ${value}px;`);
  }
  for (const [name, layers] of Object.entries(tokens.geometry.shadow)) {
    const value = layers.length
      ? layers
          .map((l) => `${l.x}px ${l.y}px ${l.blur}px ${l.spread}px ${toCss(l.color)}`)
          .join(", ")
      : "none";
    out.push(`  ${v(`shadow-${name}`)}: ${value};`);
  }
  for (const [name, value] of Object.entries(tokens.geometry.spacing)) {
    out.push(`  ${v(`space-${name}`)}: ${value}rem;`);
  }
  return out;
}

function layoutVars(tokens: DesignTokens): string[] {
  const l = tokens.layout;
  return [
    `  ${v("layout-max-width")}: ${l.maxWidth}rem;`,
    `  ${v("layout-gutter")}: ${l.gutter}rem;`,
    `  ${v("layout-section-spacing")}: ${l.sectionSpacing}rem;`,
    `  ${v("layout-columns")}: ${l.gridColumns};`,
  ];
}

function imageryVars(tokens: DesignTokens): string[] {
  const i = tokens.imagery;
  const out = [
    `  ${v("image-radius")}: var(${v(`radius-${i.radius}`)});`,
    `  ${v("image-shadow")}: var(${v(`shadow-${i.shadow}`)});`,
    `  ${v("image-border")}: ${i.border ? `var(${v("border-default")})` : "0px"};`,
  ];
  if (i.overlay.enabled) {
    out.push(`  ${v("image-overlay")}: ${toCss({ ...i.overlay.color, alpha: i.overlay.opacity })};`);
  }
  return out;
}

function motionVars(tokens: DesignTokens): string[] {
  const m = tokens.motion;
  return [
    `  ${v("motion-duration-fast")}: ${m.duration.fast}ms;`,
    `  ${v("motion-duration-base")}: ${m.duration.base}ms;`,
    `  ${v("motion-duration-slow")}: ${m.duration.slow}ms;`,
    `  ${v("motion-ease-standard")}: ${m.easing.standard};`,
    `  ${v("motion-ease-enter")}: ${m.easing.enter};`,
    `  ${v("motion-ease-exit")}: ${m.easing.exit};`,
    `  ${v("motion-distance")}: ${m.distance}px;`,
    `  ${v("motion-scale")}: ${m.scale};`,
    `  ${v("motion-stagger")}: ${m.stagger}ms;`,
  ];
}

/**
 * §12.7 requires every recipe to degrade under prefers-reduced-motion. Collapsing the
 * duration and distance tokens is the floor: it removes movement while leaving state
 * changes and content visibility intact, which is the default strategy the spec asks for.
 */
function reducedMotionBlock(): string[] {
  return [
    "@media (prefers-reduced-motion: reduce) {",
    "  :root {",
    `    ${v("motion-duration-fast")}: 1ms;`,
    `    ${v("motion-duration-base")}: 1ms;`,
    `    ${v("motion-duration-slow")}: 1ms;`,
    `    ${v("motion-distance")}: 0px;`,
    `    ${v("motion-scale")}: 1;`,
    `    ${v("motion-stagger")}: 0ms;`,
    "  }",
    "}",
  ];
}

const toKebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

/** Families with spaces or non-identifier characters need quoting in a font stack. */
const quoteFamily = (f: string) => (/^[a-zA-Z-][a-zA-Z0-9-]*$/.test(f) ? f : `"${f}"`);
