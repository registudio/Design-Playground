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
  /**
   * Where an uploaded font file is served from, or null to leave its @font-face out.
   * Defaults to `assets/<file>`, beside globals.css in the exported design/ folder. The
   * live preview passes null: it registers the faces itself from the stored bytes
   * (fonts/use-custom-fonts.ts), where a URL to the export layout would only 404.
   */
  fontUrl?: (file: string) => string | null;
}

const FONT_FORMATS: Record<string, string> = { woff2: "woff2", woff: "woff", ttf: "truetype", otf: "opentype" };

/** @font-face for every uploaded face the tokens name. */
export function fontFaceCss(tokens: DesignTokens, fontUrl: (file: string) => string | null = (file) => `assets/${file}`): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const role of ["display", "body", "mono"] as const) {
    const font = tokens.typography[role];
    if (font.source !== "custom") continue;
    for (const face of font.files ?? []) {
      const url = fontUrl(face.file);
      const key = `${font.family}|${face.file}`;
      if (!url || seen.has(key)) continue;
      seen.add(key);
      const format = FONT_FORMATS[face.file.split(".").pop()?.toLowerCase() ?? ""];
      out.push("@font-face {");
      out.push(`  font-family: ${quoteFamily(font.family)};`);
      out.push(`  src: url("${url}")${format ? ` format("${format}")` : ""};`);
      out.push(`  font-weight: ${face.weight};`);
      out.push(`  font-style: ${face.style};`);
      out.push("  font-display: swap;");
      out.push("}");
    }
  }
  return out;
}

export function generateCss(tokens: DesignTokens, options: CssOptions = {}): string {
  const { tailwindTheme = true, includeDark = true, fontUrl } = options;
  const lines: string[] = [];

  const faces = fontFaceCss(tokens, fontUrl);
  if (faces.length) lines.push(...faces, "");

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

/**
 * The same variables, scoped to one element and one theme.
 *
 * For surfaces in the studio itself — the Basics specimen — that need to render the
 * project's design without an iframe. Reusing these generators rather than restating
 * any of it is the point: the specimen cannot drift from what the preview and the
 * export produce, because it is the same output under a different selector.
 */
export function scopedTokenCss(tokens: DesignTokens, selector: string, theme: "light" | "dark" = "light"): string {
  const useTheme = theme === "dark" && tokens.colors.dark ? "dark" : "light";
  return [
    `${selector} {`,
    ...colorVars(tokens, useTheme),
    ...typographyVars(tokens),
    ...geometryVars(tokens),
    ...layoutVars(tokens),
    ...imageryVars(tokens),
    "}",
  ].join("\n");
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
    // Text alignment and its flex/grid counterpart. Both are needed: a heading follows
    // text-align, but a stack of buttons in a flex column follows align-items.
    `  ${v("layout-align")}: ${l.alignment};`,
    `  ${v("layout-align-items")}: ${{ left: "flex-start", center: "center", right: "flex-end" }[l.alignment]};`,
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

// Handles both camelCase boundaries ("displayXl" -> "display-xl") and a letter
// immediately followed by a digit ("heading2" -> "heading-2") — the digit case has no
// case change for the plain regex to key off, so it needs its own pass. Missing this
// silently broke every --dp-text-heading-{1,2,3} variable: the generated name never
// matched the "heading-1" etc. selectors in preview.css, so the `font` shorthand that
// reads it became invalid at computed-value time and collapsed to the browser default
// (16px/400) instead of the token's actual size and weight.
const toKebab = (s: string) =>
  s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/([a-zA-Z])([0-9])/g, "$1-$2").toLowerCase();

/** Families with spaces or non-identifier characters need quoting in a font stack. */
const quoteFamily = (f: string) => (/^[a-zA-Z-][a-zA-Z0-9-]*$/.test(f) ? f : `"${f}"`);
