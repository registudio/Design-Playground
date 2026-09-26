import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asDetected, decodeEntities, extractFromHtml, rankColors, rankFonts } from "@/brand/site-extract";
import { FetchRefused, isPrivateAddress, safeFetch } from "@/brand/safe-fetch";

const PAGE = `<!doctype html><html><head><title>Acme Studio</title>
<meta name="theme-color" content="#0b5fff">
<link rel="stylesheet" href="/site.css"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;700&amp;family=Inter:wght@400">
<link rel="apple-touch-icon" href="/touch.png"><link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta property="og:image" content="https://cdn.example.com/share.jpg">
<style>:root{--brand-primary:#0b5fff;--accent:#ff7a1a;--grey:#777}</style></head>
<body><header><img class="site-logo" src="/img/logo.svg" alt="Acme"></header><a style="color:#0b5fff">x</a></body></html>`;

describe("reading a site's brand", () => {
  it("finds the stylesheets, Google faces and logo candidates, logo element first", () => {
    const found = extractFromHtml(PAGE, "https://acme.example/about");
    expect(found.title).toBe("Acme Studio");
    expect(found.themeColor).toBe("#0b5fff");
    expect(found.stylesheets).toEqual(["https://acme.example/site.css"]);
    expect(found.googleFamilies).toEqual(["Fraunces", "Inter"]);
    expect(found.logoCandidates[0]).toBe("https://acme.example/img/logo.svg");
    expect(found.logoCandidates).toContain("https://acme.example/touch.png");
    expect(found.logoCandidates.at(-1)).toBe("https://cdn.example.com/share.jpg");
  });

  it("decodes the character references titles and URLs carry", () => {
    expect(decodeEntities("Kiln &amp; Co &#8212; &#x2014; &quot;x&quot; &bogus;")).toBe('Kiln & Co — — "x" &bogus;');
    expect(extractFromHtml("<title>Kiln &amp; Co</title>", "https://k.example/").title).toBe("Kiln & Co");
  });

  it("ranks brand colours over incidental ones, and drops greys, white and black", () => {
    const css = `${extractFromHtml(PAGE, "https://acme.example/").inlineCss}
      .btn{background:#0b5fff}.link:hover{color:#0a5ef9}.cookie{background:#16a34a}
      body{color:#111;background:#fff}.muted{color:#6b7280}`;
    const colors = rankColors(css, "#0b5fff");
    expect(colors[0]).toMatchObject({ hex: "#0b5fff", source: "theme-color", weight: 1 });
    expect(colors[1]!.hex).toBe("#ff7a1a");
    // #0a5ef9 is the same blue on hover: folded into #0b5fff, not listed twice.
    expect(colors.map(c => c.hex)).not.toContain("#0a5ef9");
    for (const grey of ["#777777", "#111111", "#ffffff", "#6b7280"]) expect(colors.map(c => c.hex)).not.toContain(grey);
    expect(asDetected(colors)[0]).toMatchObject({ role: "dominant" });
  });

  it("names the faces a site actually uses, headings noted, generic stacks ignored", () => {
    const fonts = rankFonts(`h1,h2{font-family:"Fraunces",Georgia,serif}body{font-family:Inter,system-ui,sans-serif}.x{font-family:var(--f)}code{font-family:ui-monospace,monospace}`, ["Fraunces", "Inter"]);
    expect(fonts.map(f => f.family)).toEqual(["Fraunces", "Inter"]);
    expect(fonts[0]!.headings).toBe(true);
    expect(fonts[1]!.headings).toBe(false);
  });
});

describe("fetching only the public internet", () => {
  it("classes private, loopback, link-local and metadata addresses as private", () => {
    for (const address of ["127.0.0.1", "10.1.2.3", "172.20.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "not-an-ip"]) {
      expect(isPrivateAddress(address), address).toBe(true);
    }
    for (const address of ["8.8.8.8", "93.184.216.34", "2606:4700::1111"]) expect(isPrivateAddress(address), address).toBe(false);
  });

  let server: Server;
  let port = 0;
  beforeAll(async () => {
    server = createServer((req, res) => {
      if (req.url === "/redirect") { res.writeHead(302, { location: "http://169.254.169.254/latest/meta-data/" }); res.end(); return; }
      res.writeHead(200, { "content-type": "text/html" }); res.end("<title>ok</title>");
    });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    port = (server.address() as { port: number }).port;
  });
  afterAll(() => { server.close(); delete process.env.DP_BRAND_ALLOW_ADDRESSES; });

  it("refuses a name that resolves to loopback, at connect time", async () => {
    await expect(safeFetch(`http://localhost:${port}/`)).rejects.toBeInstanceOf(FetchRefused);
  });

  it("refuses literal private addresses and other schemes before connecting", async () => {
    await expect(safeFetch("http://169.254.169.254/latest/meta-data/")).rejects.toThrow(/not a public address/);
    await expect(safeFetch("http://[::1]/")).rejects.toThrow(/not a public address/);
    await expect(safeFetch("file:///etc/passwd")).rejects.toThrow(/Only http and https/);
    await expect(safeFetch("http://user:pw@example.com/")).rejects.toThrow(/credentials/);
  });

  it("re-checks every redirect, so a reachable page cannot bounce it inward", async () => {
    // Only the fixture's own address is exempted; the metadata address it redirects to is not.
    process.env.DP_BRAND_ALLOW_ADDRESSES = "127.0.0.1";
    expect((await safeFetch(`http://127.0.0.1:${port}/`)).body.toString()).toContain("ok");
    await expect(safeFetch(`http://127.0.0.1:${port}/redirect`)).rejects.toThrow(/169\.254\.169\.254 is not a public address/);
    delete process.env.DP_BRAND_ALLOW_ADDRESSES;
  });
});
