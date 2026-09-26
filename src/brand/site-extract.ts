import { converter, parse } from "culori";
import type { DetectedColor } from "@/schema/project";
import { normalize, toHex } from "@/color/oklch";

/**
 * Reads a brand's colours, typefaces and logo from its existing website.
 *
 * Most clients already have a site, and its stylesheet is a better statement of their
 * brand than any single asset: it names the colours used for links and buttons, and the
 * faces used for headings. This is the pure half — text in, findings out — so it can be
 * tested without a network; app/api/brand-from-url does the fetching.
 *
 * Everything here is a suggestion for a person to accept or not, never applied silently,
 * because a stylesheet also carries third-party widgets, cookie banners and resets whose
 * colours are not the brand's.
 */

const toOklch = converter("oklch");

export interface SiteColor {
  hex: string;
  /** 0..1, relative to the strongest colour found. */
  weight: number;
  /** Where the strongest evidence for it came from. */
  source: "theme-color" | "brand variable" | "stylesheet";
}

export interface SiteFont {
  family: string;
  /** Declarations naming it first, across the page's CSS. */
  uses: number;
  /** Named in a heading rule, rather than only in body text. */
  headings: boolean;
}

export interface PageFindings {
  title: string;
  themeColor: string | null;
  stylesheets: string[];
  inlineCss: string;
  googleFamilies: string[];
  /** Best first. */
  logoCandidates: string[];
}

/** A variable whose name says it is the brand's own colour weighs more than one that does not. */
const BRAND_NAME = /(brand|primary|accent|secondary|theme|highlight|cta)/i;
const COLOR_VALUE = /#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\([^)]*\)/gi;
const GENERIC_FAMILIES = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-serif", "ui-sans-serif", "ui-monospace", "ui-rounded", "emoji", "math", "fangsong", "inherit", "initial", "unset", "revert", "-apple-system", "blinkmacsystemfont", "segoe ui", "helvetica neue", "helvetica", "arial", "roboto", "apple color emoji", "segoe ui emoji", "segoe ui symbol", "noto color emoji", "sans", "times new roman", "times", "georgia", "courier new", "menlo", "monaco", "consolas"]);

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** The character references that turn up in titles and URLs. */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, ref: string) => {
    if (ref[0] === "#") {
      const code = ref[1]?.toLowerCase() === "x" ? Number.parseInt(ref.slice(2), 16) : Number.parseInt(ref.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[ref.toLowerCase()] ?? whole;
  });
}

export function extractFromHtml(html: string, pageUrl: string): PageFindings {
  const resolve = (href: string) => { try { return new URL(href.trim(), pageUrl).href; } catch { return null; } };
  const attr = (tag: string, name: string) => {
    const value = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag)?.slice(1).find((v) => v !== undefined);
    return value === undefined ? null : decodeEntities(value);
  };
  const tags = (name: string) => html.match(new RegExp(`<${name}\\b[^>]*>`, "gi")) ?? [];

  const title = decodeEntities((/<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] ?? "").trim());
  const themeColor = tags("meta").map((tag) => attr(tag, "name")?.toLowerCase() === "theme-color" ? attr(tag, "content") : null).find(Boolean) ?? null;

  const links = tags("link");
  const stylesheets = links
    .filter((tag) => /\bstylesheet\b/i.test(attr(tag, "rel") ?? ""))
    .map((tag) => resolve(attr(tag, "href") ?? ""))
    .filter((href): href is string => !!href && !/fonts\.googleapis\.com/.test(href));
  const googleFamilies = links
    .map((tag) => attr(tag, "href") ?? "")
    .filter((href) => /fonts\.googleapis\.com\/css/.test(href))
    .flatMap((href) => { try { return new URL(href, "https://x").searchParams.getAll("family"); } catch { return []; } })
    .flatMap((spec) => spec.split("|"))
    .map((spec) => spec.split(":")[0]!.replace(/\+/g, " ").trim())
    .filter(Boolean);

  const inlineCss = [
    ...[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]),
    // Inline style attributes carry colours too — often the button that matters most.
    ...tags("[a-z0-9-]+").map((tag) => attr(tag, "style")).filter(Boolean).map((style) => `x{${style}}`),
  ].join("\n");

  // Logo: an element that says it is one, then the touch icon, then an SVG favicon,
  // then the share image — in the order they tend to be the actual mark.
  const logoAttrs = /logo|brand|wordmark/i;
  const imgLogos = tags("img")
    .filter((tag) => logoAttrs.test(`${attr(tag, "class") ?? ""} ${attr(tag, "id") ?? ""} ${attr(tag, "alt") ?? ""} ${attr(tag, "src") ?? ""}`))
    .map((tag) => resolve(attr(tag, "src") ?? ""));
  const rel = (pattern: RegExp) => links.filter((tag) => pattern.test(attr(tag, "rel") ?? "")).map((tag) => resolve(attr(tag, "href") ?? ""));
  const svgIcons = links.filter((tag) => /\bicon\b/i.test(attr(tag, "rel") ?? "") && /svg/i.test(`${attr(tag, "type") ?? ""} ${attr(tag, "href") ?? ""}`)).map((tag) => resolve(attr(tag, "href") ?? ""));
  const ogImage = tags("meta").filter((tag) => /og:image$/i.test(attr(tag, "property") ?? "")).map((tag) => resolve(attr(tag, "content") ?? ""));
  const logoCandidates = [...new Set([...imgLogos, ...rel(/apple-touch-icon/i), ...svgIcons, ...rel(/\bicon\b/i), ...ogImage])]
    .filter((href): href is string => !!href && !href.startsWith("data:"));

  return { title, themeColor, stylesheets: [...new Set(stylesheets)], inlineCss, googleFamilies: [...new Set(googleFamilies)], logoCandidates };
}

/**
 * The page's colours, strongest brand evidence first.
 *
 * Greys are left out (chroma under 0.04): every site has them, and the palette builds
 * its own neutrals. Near-white and near-black likewise. What remains is weighted by how
 * often it is declared, with the theme-color meta and brand-named variables counting
 * for much more than an incidental declaration.
 */
export function rankColors(css: string, themeColor: string | null): SiteColor[] {
  const scores = new Map<string, { score: number; source: SiteColor["source"] }>();
  const add = (value: string, score: number, source: SiteColor["source"]) => {
    const parsed = parse(value);
    const lch = parsed && toOklch(parsed);
    if (!lch || (lch.alpha ?? 1) < 0.5 || (lch.c ?? 0) < 0.04 || lch.l > 0.97 || lch.l < 0.08) return;
    const hex = toHex(normalize({ l: lch.l, c: lch.c ?? 0, h: lch.h ?? 0 }));
    const current = scores.get(hex);
    const rank = { "theme-color": 3, "brand variable": 2, stylesheet: 1 } as const;
    scores.set(hex, { score: (current?.score ?? 0) + score, source: current && rank[current.source] >= rank[source] ? current.source : source });
  };
  if (themeColor) add(themeColor, 40, "theme-color");
  for (const declaration of css.matchAll(/(--[\w-]+|[\w-]+)\s*:\s*([^;{}]+)/g)) {
    const [, property, value] = declaration;
    const brand = property!.startsWith("--") && BRAND_NAME.test(property!);
    for (const color of value!.match(COLOR_VALUE) ?? []) add(color, brand ? 12 : 1, brand ? "brand variable" : "stylesheet");
  }
  const ranked = [...scores.entries()].sort((a, b) => b[1].score - a[1].score);
  const top = ranked[0]?.[1].score ?? 1;
  // Near-duplicates (the same blue at hover and rest) collapse into the stronger one.
  const kept: SiteColor[] = [];
  for (const [hex, { score, source }] of ranked) {
    const lch = toOklch(parse(hex)!)!;
    const near = kept.some((k) => { const o = toOklch(parse(k.hex)!)!; return Math.abs(o.l - lch.l) < 0.06 && Math.abs((o.c ?? 0) - (lch.c ?? 0)) < 0.04 && hueGap(o.h ?? 0, lch.h ?? 0) < 12; });
    if (!near) kept.push({ hex, weight: Math.round((score / top) * 100) / 100, source });
    if (kept.length === 6) break;
  }
  return kept;
}

const hueGap = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

/** Faces named first in font-family declarations, with Google Fonts links counted too. */
export function rankFonts(css: string, googleFamilies: string[]): SiteFont[] {
  const fonts = new Map<string, SiteFont>();
  const note = (family: string, headings: boolean, weight = 1) => {
    const clean = family.trim().replace(/^["']|["']$/g, "").trim();
    if (!clean || clean.startsWith("var(") || GENERIC_FAMILIES.has(clean.toLowerCase())) return;
    const current = fonts.get(clean.toLowerCase()) ?? { family: clean, uses: 0, headings: false };
    current.uses += weight;
    current.headings ||= headings;
    fonts.set(clean.toLowerCase(), current);
  };
  for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const [, selector, body] = rule;
    const headings = /\bh[1-3]\b|heading|title|display|hero/i.test(selector!);
    for (const match of body!.matchAll(/font-family\s*:\s*([^;]+)/gi)) note(match[1]!.split(",")[0]!, headings);
    for (const match of body!.matchAll(/(?:^|;)\s*font\s*:[^;]*?\d(?:px|rem|em|%)[^;,]*?\s+("[^"]+"|'[^']+'|[A-Za-z][\w -]*)\s*(?:,|;|$)/gi)) note(match[1]!, headings);
  }
  for (const family of googleFamilies) note(family, false, 5);
  return [...fonts.values()].sort((a, b) => b.uses - a.uses).slice(0, 5);
}

/** Site colours as the palette builder's detected-colour input: chromatic ones lead. */
export function asDetected(colors: SiteColor[]): DetectedColor[] {
  return colors.map((color, index) => {
    const lch = toOklch(parse(color.hex)!)!;
    return {
      color: normalize({ l: lch.l, c: lch.c ?? 0, h: lch.h ?? 0 }),
      weight: Math.max(0.01, Math.min(1, color.weight)),
      role: index < 2 ? "dominant" : "secondary",
      label: `From the site (${color.source})`,
    };
  });
}
