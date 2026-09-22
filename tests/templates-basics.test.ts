import { describe, expect, it } from "vitest";
import { PRESETS, PRESET_FAMILIES, presetThumbnail } from "@/presets";
import { SAMPLE_COPY, resolveCopy } from "@/presets/copy";
import { generateCss, scopedTokenCss } from "@/export/css";
import { defaultTokens } from "@/schema/defaults";
import { LayoutTokens } from "@/schema/tokens";
import { findFont } from "@/fonts/catalogue";
import { GET } from "../app/api/element-preview/route";

describe("client templates", () => {
  const clientFamilies = PRESET_FAMILIES.filter((f) => f !== "Styles" && f !== "Custom");

  it("offers several templates for every kind of client", () => {
    for (const family of clientFamilies) {
      expect(PRESETS.filter((p) => p.family === family).length, family).toBeGreaterThanOrEqual(3);
    }
  });

  it("covers the client types this studio works with", () => {
    const names = PRESETS.map((p) => p.name);
    expect(names).toEqual(expect.arrayContaining(["Tuition Centre", "Enrichment & Kids", "Pre-launch Waitlist", "Creative Agency", "Performance Agency"]));
  });

  it("gives every client template its own copy and a plain-language 'best for'", () => {
    for (const preset of PRESETS.filter((p) => p.family !== "Styles")) {
      expect(preset.copy, preset.id).toBeDefined();
      expect(SAMPLE_COPY[preset.copy!], preset.id).toBeDefined();
      expect(preset.bestFor?.length ?? 0, preset.id).toBeGreaterThan(10);
    }
  });

  it("keeps every copy pack complete enough to fill each section of the sample", () => {
    for (const [id, copy] of Object.entries(SAMPLE_COPY)) {
      expect(copy.features.length, id).toBeGreaterThanOrEqual(3);
      expect(copy.tiers.length, id).toBe(3);
      expect(copy.faq.length, id).toBeGreaterThanOrEqual(4);
      expect(copy.quotes.length, id).toBe(3);
      expect(copy.metrics.length, id).toBe(4);
      expect(copy.logos.length, id).toBe(5);
      expect(copy.people.length, id).toBe(4);
      expect(copy.posts.length, id).toBe(4);
      expect(copy.footerGroups.length, id).toBe(3);
      for (const text of [copy.headline, copy.lede, copy.primaryCta, copy.ctaTitle, copy.ctaButton]) {
        expect(text.trim().length, id).toBeGreaterThan(1);
      }
    }
  });

  it("puts the client's name into the copy and falls back to the agency sample", () => {
    expect(resolveCopy("tuition", "Brightpath").headline).toContain("Brightpath");
    expect(resolveCopy(undefined, "Acme").headline).toBe(SAMPLE_COPY.agency.headline.replace("{brand}", "Acme"));
  });

  it("keeps template ids stable, so projects saved against them still resolve", () => {
    for (const id of ["modern-startup", "saas-product", "creative-studio", "restaurant", "healthcare", "law-firm", "real-estate", "tuition", "luxury"]) {
      expect(PRESETS.some((p) => p.id === id), id).toBe(true);
    }
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length);
  });

  it("draws each thumbnail in the template's own faces and hero shape", () => {
    for (const preset of PRESETS) {
      const thumb = presetThumbnail(preset);
      expect(findFont(thumb.display), `${preset.id} display`).toBeDefined();
      expect(findFont(thumb.body), `${preset.id} body`).toBeDefined();
      expect(thumb.hero, preset.id).toBeTruthy();
      expect(thumb.foreground).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe("alignment", () => {
  it("accepts right as well as left and centre", () => {
    const layout = defaultTokens().layout;
    expect(LayoutTokens.safeParse({ ...layout, alignment: "right" }).success).toBe(true);
  });

  it("reaches the CSS as both a text alignment and a flex alignment", () => {
    const tokens = defaultTokens();
    tokens.layout.alignment = "right";
    const css = generateCss(tokens);
    expect(css).toContain("--dp-layout-align: right;");
    expect(css).toContain("--dp-layout-align-items: flex-end;");
    tokens.layout.alignment = "center";
    expect(generateCss(tokens)).toContain("--dp-layout-align-items: center;");
  });
});

describe("Basics live specimen", () => {
  it("scopes the generator's own variables to the specimen rather than the page", () => {
    const css = scopedTokenCss(defaultTokens(), ".bs-page");
    expect(css.startsWith(".bs-page {")).toBe(true);
    expect(css).not.toContain(":root");
    // The same declarations the preview and export get.
    for (const line of ["--dp-color-primary:", "--dp-font-display:", "--dp-radius-md:", "--dp-layout-align:", "--dp-image-radius:"]) {
      expect(css).toContain(line);
    }
  });

  it("switches to the dark palette only when the project has one", () => {
    const tokens = defaultTokens();
    const light = scopedTokenCss(tokens, ".x", "light");
    const dark = scopedTokenCss(tokens, ".x", "dark");
    if (tokens.colors.dark) expect(dark).not.toBe(light);
    delete tokens.colors.dark;
    expect(scopedTokenCss(tokens, ".x", "dark")).toBe(scopedTokenCss(tokens, ".x", "light"));
  });
});

describe("preview document status", () => {
  const body = async () => (await GET(new Request("http://localhost/api/element-preview?source=bklit&name=area-chart"))).text();

  it("does not call a preview failed just because something threw", async () => {
    // Components throw from effects after painting perfectly well; that hid working
    // previews. An error now only matters if nothing is showing.
    expect(await body()).not.toContain('send("failed")');
  });

  it("lays a visual over a surface that stays empty instead of leaving the card blank", async () => {
    const html = await body();
    expect(html).toContain("dp-auto-visual");
    expect(html).not.toContain('"blank"');
  });
});
