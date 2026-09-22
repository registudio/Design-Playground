import { describe, expect, it } from "vitest";
import { GET } from "../app/api/element-preview/route";
import {
  ACTIVATION_MARGIN_PX,
  CATALOGUE_BATCH,
  DOCUMENT_CACHE_ENTRIES,
  MAX_LIVE_PREVIEWS,
  NARROW_SEARCH_LIMIT,
  OFFSCREEN_GRACE_MS,
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
    expect(body).toContain("Preview unavailable");
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

  it("escapes the failure reason into the document", async () => {
    const body = await (await call("source=bklit&name=area-chart")).text();
    expect(body).not.toMatch(/<script(?![^>]*type="module")/);
  });
});

describe("preview budgets", () => {
  it("matches the values the visualisation contract states", () => {
    expect(MAX_LIVE_PREVIEWS).toBe(4);
    expect(ACTIVATION_MARGIN_PX).toBe(700);
    expect(OFFSCREEN_GRACE_MS).toBe(12_000);
    expect(CATALOGUE_BATCH).toBe(36);
    expect(DOCUMENT_CACHE_ENTRIES).toBe(96);
    expect(NARROW_SEARCH_LIMIT).toBe(8);
  });

  it("keeps the grace period well above a scroll bounce", () => {
    // Short enough and a small reverse scroll unmounts and remounts everything it passes.
    expect(OFFSCREEN_GRACE_MS).toBeGreaterThan(5_000);
  });
});
