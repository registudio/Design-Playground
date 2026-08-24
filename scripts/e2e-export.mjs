import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { unzipSync } from "fflate";
import { chromium } from "playwright";

/**
 * Real-browser export smoke test (§Wave F3) — exercises the path vitest can't reach:
 * a real logo upload triggering colour extraction, a real download, and the resulting
 * ZIP actually containing valid, non-empty design.tokens.json / site.recipe.json /
 * asset-manifest.json / globals.css. See e2e-smoke.mjs for the portability notes
 * (BASE_URL, PLAYWRIGHT_EXECUTABLE_PATH, E2E_OUTPUT_DIR) — same conventions here.
 */
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3100";
const OUT = process.env.E2E_OUTPUT_DIR ?? "./e2e-output";
mkdirSync(OUT, { recursive: true });

let failures = 0;
function ok(label, cond) {
  console.log(cond ? `PASS: ${label}` : `FAIL: ${label}`);
  if (!cond) failures++;
}

const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}),
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
await page.goto(BASE_URL, { waitUntil: "networkidle" });

const nameInput = page.getByPlaceholder("Project name");
await nameInput.click();
await nameInput.pressSequentially("Acme");
await page.waitForFunction(
  () => !document.querySelector("button[type=submit]")?.hasAttribute("disabled"),
  null, { timeout: 15000 });
await page.getByRole("button", { name: "New project" }).click();
await page.waitForSelector("iframe[title='Live preview']");

// Upload a real SVG logo so extraction runs on the export path too.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#1d4ed8"/>
  <circle cx="50" cy="50" r="28" fill="#06b6d4"/>
  <path d="M20 80 L50 30 L80 80 Z" fill="#0f172a"/>
</svg>`;
writeFileSync(`${OUT}/logo.svg`, svg);
await page.setInputFiles("input[type=file][accept*='svg']", `${OUT}/logo.svg`);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/07-logo-extracted.png` });

// Export and capture the ZIP.
await page.getByRole("button", { name: "Export" }).click();
const download = await Promise.all([
  page.waitForEvent("download"),
  page.getByRole("button", { name: "Download ZIP" }).click(),
]).then(([d]) => d);

const zipPath = `${OUT}/export.zip`;
await download.saveAs(zipPath);
const entries = unzipSync(new Uint8Array(readFileSync(zipPath)));
console.log("=== EXPORT CONTENTS ===");
for (const name of Object.keys(entries).sort()) console.log(` ${name}  (${entries[name].length} bytes)`);

const dec = new TextDecoder();
const REQUIRED = [
  "design/design.tokens.json",
  "design/site.recipe.json",
  "design/asset-manifest.json",
  "design/globals.css",
];
for (const path of REQUIRED) ok(`ZIP contains ${path}`, !!entries[path] && entries[path].length > 0);

const tokens = JSON.parse(dec.decode(entries["design/design.tokens.json"]));
const recipe = JSON.parse(dec.decode(entries["design/site.recipe.json"]));
const manifest = JSON.parse(dec.decode(entries["design/asset-manifest.json"]));
const css = dec.decode(entries["design/globals.css"]);

ok("design.tokens.json has a colour scale", Object.keys(tokens.colors?.scales ?? {}).length > 0);
ok("design.tokens.json has semantic light tokens", Object.keys(tokens.colors?.light?.semantic ?? {}).length > 0);
ok("design.tokens.json has a dark theme", !!tokens.colors?.dark);
ok("design.tokens.json has a typography scale", Object.keys(tokens.typography?.scale ?? {}).length > 0);
ok("site.recipe.json has component choices", Object.keys(recipe.components ?? {}).length > 0);
ok("site.recipe.json has a motion profile", typeof recipe.motion?.profile === "string" && recipe.motion.profile.length > 0);
ok("asset-manifest.json recorded the uploaded logo", !!manifest.logo);
ok("globals.css is non-trivial", css.split("\n").length > 10);

await browser.close();

console.log(`\n${failures === 0 ? "ALL PASSED" : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
