import { createServer } from "node:http";
import { createProject, launch, OUT, tally, visualise } from "./lib/studio.mjs";

/**
 * Reading a brand from a client's existing website, against a small fixture site this
 * script serves itself. The app server must be started with
 * DP_BRAND_ALLOW_ADDRESSES=127.0.0.1 so it may fetch that one local address; everything
 * else stays refused, which is also checked here.
 */
const PORT = Number(process.env.FIXTURE_PORT ?? 4610);
const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40"><rect width="120" height="40" fill="#c2410c"/><circle cx="20" cy="20" r="12" fill="#1e3a8a"/></svg>`;
const site = createServer((req, res) => {
  if (req.url === "/site.css") { res.writeHead(200, { "content-type": "text/css" }); res.end(":root{--brand-primary:#c2410c;--brand-accent:#1e3a8a}h1,h2{font-family:\"Fraunces\",serif}body{font-family:Inter,sans-serif;color:#222;background:#fff}.btn{background:#c2410c}"); return; }
  if (req.url === "/logo.svg") { res.writeHead(200, { "content-type": "image/svg+xml" }); res.end(LOGO); return; }
  res.writeHead(200, { "content-type": "text/html" });
  res.end(`<!doctype html><title>Kiln &amp; Co</title><meta name="theme-color" content="#c2410c"><link rel="stylesheet" href="/site.css"><header><img class="logo" src="/logo.svg" alt="Kiln"></header>`);
});
await new Promise((resolve) => site.listen(PORT, "127.0.0.1", resolve));

const { ok, finish } = tally();
const { browser, page, pageErrors } = await launch({ width: 1500, height: 1000 });
await createProject(page, "Brand URL");
const input = page.getByLabel("Or start from their current website");

// Refused: the metadata address is private and not on the test allow-list.
await input.fill("http://169.254.169.254/latest/meta-data/");
await page.getByRole("button", { name: "Read the site" }).click();
await page.waitForTimeout(800);
ok("a private address is refused", /not a public address/.test((await page.locator(".brand-from-url-error").textContent()) ?? ""));

await input.fill(`http://127.0.0.1:${PORT}/`);
await page.getByRole("button", { name: "Read the site" }).click();
await page.waitForSelector(".brand-from-url-result", { timeout: 15000 });
ok("the site is read, stylesheet included", /Kiln & Co.*1 stylesheet read/.test((await page.locator(".brand-from-url-source").textContent()) ?? ""));
const swatches = await page.locator(".brand-from-url-swatches span").evaluateAll((nodes) => nodes.map((n) => n.getAttribute("title")));
ok("the brand colour leads, from theme-color", /^#c2410c/.test(swatches[0] ?? ""), swatches.join(", "));
ok("the brand's second colour is found", swatches.some((s) => /^#1e3a8a/.test(s ?? "")));
ok("the heading face is offered for headings", await page.getByRole("button", { name: "Use for headings" }).isVisible());

await page.getByRole("button", { name: "Build the palette from these" }).click();
await page.getByRole("button", { name: "Use for headings" }).click();
await page.getByRole("button", { name: "Use this logo" }).click();
await page.waitForTimeout(1500);
ok("the logo arrives through the normal upload", /logo\.svg/.test((await page.locator("button").filter({ hasText: /logo\.svg/ }).first().textContent().catch(() => "")) ?? ""));

const frame = await visualise(page);
const primary = await frame.locator(".dp-page").evaluate((el) => getComputedStyle(el).getPropertyValue("--dp-color-primary").trim());
const display = await frame.locator(".dp-page").evaluate((el) => getComputedStyle(el).getPropertyValue("--dp-font-display").trim());
ok(`the palette is built from the site (primary ${primary})`, /oklch\(0\.[45]\d* 0\.1[5-9]\d* [34]\d\./.test(primary));
ok(`the site's heading face is used (${display.split(",")[0]})`, display.startsWith('"Fraunces"') || display.startsWith("Fraunces"));
await page.screenshot({ path: `${OUT}/brand-url.png` });

site.close();
ok(`no page errors (${pageErrors.length})`, pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
await finish(browser);
