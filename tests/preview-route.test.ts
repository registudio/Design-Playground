import { describe, expect, it } from "vitest";
import * as React from "react";
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
    // A model loader may read the data: and blob: URLs it was handed, and nothing else.
    const connect = body.match(/connect-src ([^;"]+)/)?.[1]?.trim().split(/\s+/) ?? [];
    expect(connect.sort()).toEqual(["blob:", "data:"]);
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
      expect(() => new Function("React", `return ${propRecipe(element.source, element.name)}`)(React)).not.toThrow();
    }
  });

  it("gives chart items data that a chart library can actually plot", async () => {
    const { propRecipe } = await import("@/elements/preview-props");
    const value = new Function("React", `return ${propRecipe("bklit", "Area Chart")}`)(React) as {
      data: Array<Record<string, unknown>>;
    };
    expect(value.data.length).toBeGreaterThan(3);
    expect(typeof value.data[0]!.value).toBe("number");
    expect(typeof value.data[0]!.name).toBe("string");
  });
});

describe("compiled document disk cache", () => {
  /**
   * A one-item registry on localhost, so the route can really compile something here.
   * The component imports only React, which the route bundles from local disk, so no
   * other network is involved.
   */
  const ITEM = {
    files: [{
      path: "Fixture/Fixture.tsx",
      content: 'export default function Fixture({ text }: { text?: string }) { return <h1 className="text-xl">{text}</h1>; }',
    }],
  };

  async function withRegistry<T>(run: (base: string) => Promise<T>): Promise<T> {
    const { createServer } = await import("node:http");
    const server = createServer((request, response) => {
      if (request.url === "/reactbits/Fixture-TS-TW.json") {
        response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(ITEM));
      } else {
        response.writeHead(404).end();
      }
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };
    try {
      return await run(`http://127.0.0.1:${port}`);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  }

  /** A route module with empty in-memory caches, so only the disk can answer. */
  async function freshRoute(dir: string, registry: string) {
    const { vi } = await import("vitest");
    vi.stubEnv("DP_PREVIEW_CACHE", dir);
    vi.stubEnv("DP_REGISTRY_BASE", registry);
    vi.resetModules();
    const { GET: route } = await import("../app/api/element-preview/route");
    return async (query: string) => (await route(new Request(`http://localhost/api/element-preview?${query}`))).text();
  }

  async function cacheDir() {
    const { mkdtemp } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const path = await import("node:path");
    return mkdtemp(path.join(tmpdir(), "dp-preview-"));
  }

  it("serves a compiled document from disk after a restart, without the registry", async () => {
    const { vi } = await import("vitest");
    const { readdir } = await import("node:fs/promises");
    const dir = await cacheDir();
    try {
      const compiled = await withRegistry(async (base) => (await freshRoute(dir, base))("source=react-bits&name=Fixture-TS-TW"));
      expect(compiled).toContain('<div id="root">');
      expect(compiled).not.toContain('data-generated="true"');
      expect(await readdir(dir)).toHaveLength(1);

      // The registry is gone now; an answer can only have come from the disk.
      const fromDisk = await (await freshRoute(dir, "http://127.0.0.1:9"))("source=react-bits&name=Fixture-TS-TW");
      expect(fromDisk).toContain('<div id="root">');
      expect(fromDisk).not.toContain('data-generated="true"');
    } finally {
      vi.unstubAllEnvs();
    }
  }, 30_000);

  it("ignores a document an older compiler left on disk", async () => {
    // The key the route used while CACHE_VERSION was "4". Those documents were built by
    // a compiler that fetched React and Motion from esm.sh and recorded no reasons, and
    // serving them kept cards on a stand-in after the fixes had shipped.
    const { vi } = await import("vitest");
    const { writeFile } = await import("node:fs/promises");
    const { createHash } = await import("node:crypto");
    const path = await import("node:path");
    const dir = await cacheDir();
    const legacy = createHash("sha256").update("4:react-bits:Fixture-TS-TW").digest("hex").slice(0, 32);
    await writeFile(path.join(dir, `${legacy}.html`), "<!doctype html><title>stale</title><body></body>", "utf-8");
    try {
      const html = await withRegistry(async (base) => (await freshRoute(dir, base))("source=react-bits&name=Fixture-TS-TW"));
      expect(html).not.toContain("<title>stale</title>");
      expect(html).toContain('<div id="root">');
    } finally {
      vi.unstubAllEnvs();
    }
  }, 30_000);
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

describe("compiling real registry shapes", () => {
  /**
   * Each case is a failure the audit against the published registries found. A local
   * registry and a local package host stand in for the registries and esm.sh, and every
   * request either receives is recorded.
   */
  const ITEMS: Record<string, unknown> = {
    // Bklit's layout: the example and its barrel are published under registry/examples,
    // but installed to app/page.tsx and components/charts/index.ts, and written against
    // the installed layout.
    "demo-chart": {
      files: [
        { path: "registry/examples/demo-chart.tsx", target: "app/page.tsx",
          content: 'import { Chart } from "@/components/charts"; export default function Page() { return <Chart/>; }' },
        { path: "registry/examples/demo-chart-index.ts", target: "components/charts/index.ts",
          content: 'export { Chart } from "./chart";' },
        { path: "src/charts/chart.tsx", target: "components/charts/chart.tsx",
          content: 'export function Chart() { return <svg data-real-chart="yes" width="10" height="10"/>; }' },
      ],
    },
    "uses-hooks": {
      files: [{ path: "uses-hooks.tsx",
        content: 'import { useCount } from "fixture-hooks"; export default function UsesHooks() { return <b>{useCount()}</b>; }' }],
    },
    "says-body": {
      files: [{ path: "says-body.tsx",
        content: 'export default function SaysBody() { return <code>{"</body>"}</code>; }' }],
    },
    "themed": {
      cssVars: { light: { "--legend": "white" }, dark: { "--legend": "rgb(1, 2, 3)" } },
      files: [{ path: "themed.tsx",
        content: 'export default function Themed() { return <p className="text-muted-foreground bg-white dark:bg-zinc-900">Hi</p>; }' }],
    },
    "toy-chart": {
      files: [{ path: "src/charts/toy-chart.tsx", target: "components/charts/toy-chart.tsx",
        content: 'export function ToyChart({ children }: { children?: unknown }) { return <svg data-toy-root="yes">{children as never}</svg>; }' }],
    },
    "toy-chart-example": {
      registryDependencies: ["@bklit/toy-chart"],
      files: [{ path: "registry/examples/toy-chart.tsx", type: "registry:page", target: "app/page.tsx",
        content: 'import { ToyChart } from "@/components/charts/toy-chart"; export default function Page() { return <ToyChart><circle data-toy-series="yes" r="4"/></ToyChart>; }' }],
    },
    "Models-TS-TW": {
      files: [{ path: "Models/Models.tsx",
        content: 'import card from "./card.glb"; export default function Models() { const lens = "/assets/3d/lens.glb"; return <i data-card={card} data-lens={lens}>3D</i>; }' }],
    },
    "Lettering-TS-TW": {
      files: [{ path: "Lettering/Lettering.tsx",
        content: 'import { font } from "fixture-text"; export default function Lettering() { return <i data-font={String(font()).slice(0, 20)}>Aa</i>; }' }],
    },
    "links-out": {
      files: [{ path: "links-out.tsx",
        content: 'import Link from "next/link"; import Image from "next/image"; export default function LinksOut() { return <Link href="/x" prefetch={false}><Image src="/a.png" alt="" width={4} height={4}/>Go</Link>; }' }],
    },
  };

  async function compileWith(name: string, source = "kokonutui") {
    const { createServer } = await import("node:http");
    const { vi } = await import("vitest");
    const requests: string[] = [];
    const server = createServer((request, response) => {
      const url = request.url ?? "";
      requests.push(url);
      const item = url.match(/^\/(?:kokonutui|bklit|reactbits)\/([\w-]+)\.json$/)?.[1];
      if (item && ITEMS[item]) {
        response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(ITEMS[item]));
      } else if (url.startsWith("/pkg/fixture-text")) {
        // Shaped like troika's defaults inside drei's bundle.
        response.writeHead(200, { "Content-Type": "application/javascript" })
          .end('const CONFIG = { defaultFontURL: null, useWorker: true }; export const font = () => CONFIG.defaultFontURL;');
      } else if (url.startsWith("/pkg/fixture-hooks")) {
        response.writeHead(200, { "Content-Type": "application/javascript" })
          .end('import { useState } from "react"; export function useCount() { return useState(3)[0]; }');
      } else {
        response.writeHead(404).end();
      }
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };
    try {
      vi.stubEnv("DP_REGISTRY_BASE", `http://127.0.0.1:${port}`);
      vi.stubEnv("DP_PACKAGE_BASE", `http://127.0.0.1:${port}/pkg`);
      vi.stubEnv("DP_PREVIEW_CACHE", (await import("node:os")).tmpdir() + `/dp-preview-shapes-${Date.now()}-${name}`);
      vi.resetModules();
      const { GET: route } = await import("../app/api/element-preview/route");
      const html = await (await route(new Request(`http://localhost/api/element-preview?source=${source}&name=${name}`))).text();
      return { html, requests };
    } finally {
      vi.unstubAllEnvs();
      await new Promise((resolve) => server.close(resolve));
    }
  }

  it("lays files out where they install, so a barrel import finds the real chart", async () => {
    const { html } = await compileWith("demo-chart");
    expect(html).not.toContain('data-generated="true"');
    expect(html).toContain("data-real-chart");
  }, 30_000);

  it("gives a package's own React import the document's one React", async () => {
    const { html, requests } = await compileWith("uses-hooks");
    expect(html).not.toContain('data-generated="true"');
    expect(requests.some((url) => url.startsWith("/pkg/fixture-hooks"))).toBe(true);
    // Two Reacts in one document means the package's hooks read a null dispatcher.
    expect(requests.filter((url) => url.startsWith("/pkg/react"))).toEqual([]);
    expect(html.match(/\/\/ node_modules\/react\/cjs\/react\.production\.js/g)).toHaveLength(1);
    // And the production build, as every esm.sh package is: a dev React with a prod
    // renderer crashed on dispatcher.getOwner().
    expect(html).not.toContain("react.development.js");
  }, 30_000);

  it("says in plain words when a part only renders inside its parent", async () => {
    const { html } = await compileWith("says-body");
    // The boundary maps context errors ("must be used within a ChartProvider") to this.
    expect(html).toContain("Part of a larger component: it only renders inside its parent");
  }, 30_000);

  it("keeps the reporter out of a module whose source contains </body>", async () => {
    const { html } = await compileWith("says-body");
    const moduleStart = html.indexOf('<script type="module">');
    const moduleEnd = html.indexOf("</script>", moduleStart);
    const reporter = html.indexOf("dp-preview-status");
    expect(moduleStart).toBeGreaterThan(-1);
    expect(reporter).toBeGreaterThan(moduleEnd);
  }, 30_000);

  it("gives components the theme a shadcn project would, dark by class", async () => {
    const { html } = await compileWith("themed");
    // The utility exists only if the colour is mapped into Tailwind's theme.
    expect(html).toMatch(/\.text-muted-foreground\s*\{[^}]*var\(--color-muted-foreground\)|\.text-muted-foreground\s*\{[^}]*var\(--muted-foreground\)/);
    expect(html).toContain("--muted-foreground:");
    // dark: follows a class on the document, not the viewer's OS.
    expect(html).toContain('<html lang="en" class="dark">');
    expect(html).toMatch(/\.dark\\:bg-zinc-900:where\(\.dark, \.dark \*\)|:where\(\.dark, \.dark \*\)/);
    // The item's own variable, dark value.
    expect(html).toContain("--legend:rgb(1, 2, 3)");
    // A container-sized component needs #root to have the frame's size to measure.
    expect(html).toMatch(/#root\{width:100%;height:calc\(100vh - 36px\)/);
  }, 30_000);

  it("previews a Bklit chart through the example Bklit publishes for it", async () => {
    // A composable chart root draws nothing until it is given series as children.
    const { html, requests } = await compileWith("toy-chart", "bklit");
    expect(requests).toContain("/bklit/toy-chart-example.json");
    expect(html).toContain("data-toy-series");
    expect(html).toContain("<title>toy-chart</title>");
  }, 30_000);

  it("counts an SVG drawing as painted, whatever case its tagName is in", async () => {
    const { html } = await compileWith("toy-chart", "bklit");
    // In an HTML document an svg element's tagName is lowercase.
    expect(html).toContain("node.tagName.toUpperCase()");
  }, 30_000);

  it("hands a component the demo models its publisher's site would serve", async () => {
    // Imported beside the source (Lanyard's card.glb) or fetched by path (FluidGlass's
    // lens.glb): both arrive as data: URLs, keeping the file name for loaders that
    // choose by extension.
    const { html } = await compileWith("Models-TS-TW", "react-bits");
    expect(html).not.toContain('data-generated="true"');
    expect(html).toMatch(/"data:model\/gltf-binary;base64,[A-Za-z0-9+/=]+#card\.glb"/);
    expect(html).toMatch(/"data:model\/gltf-binary;base64,[A-Za-z0-9+/=]+#lens\.glb"/);
    expect(html).not.toContain('"/assets/3d/lens.glb"');
  }, 30_000);

  it("gives troika a default font so text never waits on a CDN", async () => {
    const { html } = await compileWith("Lettering-TS-TW", "react-bits");
    expect(html).toMatch(/defaultFontURL:\s*"data:font\/ttf;base64,/);
  }, 30_000);

  it("stands in for next/link and next/image instead of fetching Next", async () => {
    const { html, requests } = await compileWith("links-out");
    expect(html).not.toContain('data-generated="true"');
    expect(requests.filter((url) => url.startsWith("/pkg/next"))).toEqual([]);
    expect(html).not.toContain("__NEXT_ROUTER_BASEPATH");
  }, 30_000);
});
