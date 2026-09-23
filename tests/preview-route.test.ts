import { describe, expect, it } from "vitest";
import { GET } from "../app/api/element-preview/route";
import {
  ACTIVATION_MARGIN_PX,
  advanceCatalogueWindow,
  CATALOGUE_BATCH,
  DOCUMENT_CACHE_ENTRIES,
  IN_FLIGHT_PROTECTION_MS,
  MAX_LIVE_PREVIEWS,
  NARROW_SEARCH_LIMIT,
  OFFSCREEN_GRACE_MS,
  retreatCatalogueWindow,
} from "@/elements/preview-budget";

/**
 * The route executes third-party source, so what matters most is what it refuses.
 * These run without network: every allowed request fails to fetch here and must still
 * come back as a document rather than an error.
 */
const call = (query: string) => GET(new Request(`http://localhost/api/element-preview?${query}`));

describe("element preview route", () => {
  it("refuses a source that is not one of the five registries", async () => {
    expect((await call("source=evil.example&name=widget")).status).toBe(400);
  });

  it("refuses a name that tries to climb out of the registry path", async () => {
    expect((await call("source=bklit&name=../../etc/passwd")).status).toBe(400);
  });

  it("refuses a name that is a URL, so this cannot become a general fetcher", async () => {
    expect((await call("source=bklit&name=https%3A%2F%2Fevil.example%2Fx")).status).toBe(400);
  });

  it("refuses a missing name", async () => {
    expect((await call("source=bklit")).status).toBe(400);
  });

  it("accepts an ordinary registry item name", async () => {
    // Reaches the fetch, which fails in this environment — the point is that it was
    // not rejected by validation.
    expect((await call("source=bklit&name=area-chart")).status).toBe(200);
  });

  it("answers a failed compile with a document, not an error status", async () => {
    const response = await call("source=react-bits&name=DefinitelyNotPublished");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/html");
    const body = await response.text();
    expect(body).toContain("dp-auto-visual");
    expect(body).not.toContain("Preview unavailable");
  });

  it("states the reason inside the card rather than swallowing it", async () => {
    const body = await (await call("source=kokonutui&name=nothing-here")).text();
    expect(body).toMatch(/KokonutUI|fetch|HTTP|network|error/i);
  });

  it("denies every resource class the preview does not need", async () => {
    const body = await (await call("source=bklit&name=area-chart")).text();
    expect(body).toContain("default-src 'none'");
    // Everything the module needs is bundled in, so the frame never needs the network.
    expect(body).toContain("connect-src 'none'");
  });

  it("turns an unavailable upstream item into a visual demo without compiler prose", async () => {
    const body = await (await call("source=react-bits&name=DefinitelyNotPublished")).text();
    expect(body).toContain('data-generated="true"');
    expect(body).toContain("dp-auto-visual");
    expect(body).not.toContain("Preview unavailable");
    expect(body).not.toContain("<span hidden>");
  });
});

describe("preview budgets", () => {
  it("matches the values the visualisation contract states", () => {
    expect(MAX_LIVE_PREVIEWS).toBe(12);
    expect(ACTIVATION_MARGIN_PX).toBe(320);
    expect(CATALOGUE_BATCH).toBe(36);
    expect(DOCUMENT_CACHE_ENTRIES).toBe(96);
    expect(NARROW_SEARCH_LIMIT).toBe(8);
  });

  it("holds an offscreen preview long enough to survive a scroll bounce", () => {
    // Was 750ms, which freed slots promptly but killed compiles: a card nudged just
    // outside the activation margin lost its slot mid-build, and scrolling back
    // restarted it from nothing. A preview in a busy part of the grid could churn
    // indefinitely and never finish — the "stuck loading" cards.
    expect(OFFSCREEN_GRACE_MS).toBeGreaterThanOrEqual(5_000);
  });

  it("protects work already in flight for longer than a compile takes", () => {
    // The grace period alone is not enough: a compile that outlives it would still be
    // torn down. Work that has not reached a terminal state is held until it resolves
    // or this cap expires, whichever comes first.
    expect(IN_FLIGHT_PROTECTION_MS).toBeGreaterThan(OFFSCREEN_GRACE_MS);
    expect(IN_FLIGHT_PROTECTION_MS).toBeGreaterThanOrEqual(20_000);
  });

  it("still bounds how long a slot can be held", () => {
    // Otherwise a handful of never-resolving previews would own the whole budget.
    expect(IN_FLIGHT_PROTECTION_MS).toBeLessThanOrEqual(60_000);
  });

  it("keeps a bounded, continuous catalogue window in both directions", () => {
    let window = { start: 0, end: CATALOGUE_BATCH };
    for (let index = 0; index < 5; index += 1) {
      window = advanceCatalogueWindow(window, 490);
    }
    expect(window).toEqual({ start: 72, end: 216 });
    expect(window.end - window.start).toBe(CATALOGUE_BATCH * 4);

    window = retreatCatalogueWindow(window, 490);
    expect(window).toEqual({ start: 36, end: 180 });
  });

  it("jumps to either edge without mounting the blank spacer or all 490 cards", () => {
    const end = advanceCatalogueWindow({ start: 0, end: CATALOGUE_BATCH }, 490, true);
    expect(end).toEqual({ start: 346, end: 490 });
    expect(retreatCatalogueWindow(end, 490, true)).toEqual({ start: 0, end: 144 });
  });
});

describe("preview prop recipes", () => {
  it("gives every Bklit item chart data, since all of them are chart parts", async () => {
    const { propRecipe } = await import("@/elements/preview-props");
    expect(propRecipe("bklit", "Bar Depth")).toContain("chartData");
    expect(propRecipe("bklit", "Utilities")).toContain("chartData");
  });

  it("gives a carousel more than one thing to show", async () => {
    const { propRecipe } = await import("@/elements/preview-props");
    const props = propRecipe("react-bits", "BounceCards");
    expect(props).toContain("items");
    expect(props).toContain("Discover");
  });

  it("matches a PascalCase name on whole words", async () => {
    const { recipeIndexFor } = await import("@/elements/preview-props");
    // Without camelCase splitting "AccordionGallery" could only match its first word.
    expect(recipeIndexFor("react-bits", "AccordionGallery")).not.toBeNull();
    expect(recipeIndexFor("react-bits", "FallingText")).not.toBeNull();
  });

  it("opens a dialog, which otherwise renders nothing at all", async () => {
    const { propRecipe } = await import("@/elements/preview-props");
    expect(propRecipe("soralabs", "Base Dialog")).toContain("open: true");
  });

  it("passes text effects their string as a prop, not only as children", async () => {
    const { propRecipe } = await import("@/elements/preview-props");
    const props = propRecipe("react-bits", "ScrambleText");
    expect(props).toMatch(/text:\s*"Small details/);
  });

  it("falls back to the base props rather than nothing", async () => {
    const { propRecipe, recipeIndexFor } = await import("@/elements/preview-props");
    expect(recipeIndexFor("componentry", "signature")).toBeNull();
    expect(propRecipe("componentry", "signature")).toContain("children");
  });

  it("produces valid JavaScript for every item in the real snapshot", async () => {
    const { propRecipe } = await import("@/elements/preview-props");
    const { readFileSync } = await import("node:fs");
    const { RegistryIndex } = await import("@/registry/schema");
    const index = RegistryIndex.parse(
      JSON.parse(readFileSync(new URL("../data/registry-snapshot.json", import.meta.url), "utf-8")),
    );
    for (const element of index.elements) {
      // Spliced into a generated module, so a malformed object would be a compile error
      // for that preview rather than a caught failure.
      expect(() => new Function(`return ${propRecipe(element.source, element.name)}`)()).not.toThrow();
    }
  });

  it("gives chart items data that a chart library can actually plot", async () => {
    const { propRecipe } = await import("@/elements/preview-props");
    const value = new Function(`return ${propRecipe("bklit", "Area Chart")}`)() as {
      data: Array<Record<string, unknown>>;
    };
    expect(value.data.length).toBeGreaterThan(3);
    expect(typeof value.data[0]!.value).toBe("number");
    expect(typeof value.data[0]!.name).toBe("string");
  });
});

describe("compiled document disk cache", () => {
  it("serves a cached document without recompiling", async () => {
    const { mkdtemp, mkdir, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { createHash } = await import("node:crypto");
    const path = await import("node:path");
    const { vi } = await import("vitest");

    const dir = await mkdtemp(path.join(tmpdir(), "dp-preview-"));
    await mkdir(dir, { recursive: true });
    // Same key the route derives: version, source, name.
    const key = createHash("sha256").update("4:bklit:area-chart").digest("hex").slice(0, 32);
    await writeFile(path.join(dir, `${key}.html`), "<!doctype html><title>cached</title>", "utf-8");

    vi.stubEnv("DP_PREVIEW_CACHE", dir);
    vi.resetModules();
    const { GET: fresh } = await import("../app/api/element-preview/route");
    const response = await fresh(
      new Request("http://localhost/api/element-preview?source=bklit&name=area-chart"),
    );
    const body = await response.text();
    vi.unstubAllEnvs();

    // Without the cache this would attempt a fetch and return a diagnostic instead.
    expect(body).toContain("cached");
    expect(body).not.toContain("Preview unavailable");
  });

  it("keys the cache so a change to the route invalidates it", async () => {
    const { createHash } = await import("node:crypto");
    const a = createHash("sha256").update("1:bklit:area-chart").digest("hex").slice(0, 32);
    const b = createHash("sha256").update("2:bklit:area-chart").digest("hex").slice(0, 32);
    expect(a).not.toBe(b);
  });
});

describe("a stand-in says why it is there", () => {
  /**
   * Three very different things put the same generated visual on a card — the item never
   * compiled, the component threw on mount, or it mounted and painted nothing. They were
   * indistinguishable, which made "it isn't rendering" impossible to answer.
   */
  const body = async (query: string) =>
    (await GET(new Request(`http://localhost/api/element-preview?${query}`))).text();

  it("sends the reason alongside the status", async () => {
    const html = await body("source=bklit&name=area-chart");
    expect(html).toContain("dp-preview-status");
    expect(html).toMatch(/send\(status, status === "fallback" \? reason\(\) : undefined\)/);
  });

  it("reads a compile failure's own words off the document", async () => {
    const html = await body("source=react-bits&name=DefinitelyNotPublished");
    expect(html).toContain('data-generated="true"');
    expect(html).toMatch(/data-reason="[^"]+"/);
  });

  it("holds a slow component before calling it a fallback", async () => {
    // A card that says "Fallback demo" for a moment and then changes its mind is worse
    // than one that says "Rendering…" a little longer.
    const html = await body("source=bklit&name=area-chart");
    const grace = Number(html.match(/Date\.now\(\) - started > (\d+)/)?.[1] ?? 0);
    const watch = Number(html.match(/Date\.now\(\) - started > (\d+)\) clearInterval/)?.[1] ?? 0);
    expect(grace).toBeGreaterThanOrEqual(3500);
    expect(watch).toBeGreaterThan(grace);
  });
});
