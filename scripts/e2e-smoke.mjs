import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

/**
 * Real-browser smoke test (§Wave F3) — the core "does the app actually work" check
 * that typecheck/vitest/build can't catch: the preview iframe painting through the
 * postMessage bridge, presets producing a real token change in one undo step, and
 * responsive device modes triggering real media queries inside the iframe.
 *
 * Portable by design: BASE_URL/PLAYWRIGHT_EXECUTABLE_PATH read from the environment
 * so this runs unmodified in CI (a fresh `npx playwright install chromium`) and
 * locally (a pre-installed browser at a fixed path, if PLAYWRIGHT_EXECUTABLE_PATH is
 * set). The caller is responsible for having a server already running at BASE_URL.
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
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(`pageerror: ${e.message}`));
page.on("console", (m) => { if (m.type() === "error") pageErrors.push(`console: ${m.text()}`); });

await page.goto(BASE_URL, { waitUntil: "networkidle" });

// Create a project. Type rather than fill, so the value lands after hydration.
const nameInput = page.getByPlaceholder("Project name");
await nameInput.click();
await nameInput.pressSequentially("Northwind");
await page.getByRole("button", { name: "New project" }).waitFor({ state: "attached" });
await page.waitForFunction(
  () => !document.querySelector("button[type=submit]")?.hasAttribute("disabled"),
  null, { timeout: 15000 });
await page.getByPlaceholder("Client (optional)").pressSequentially("Northwind Pte Ltd");
await page.getByRole("button", { name: "New project" }).click();
await page.waitForSelector("iframe[title='Live preview']", { timeout: 10000 });

// The preview must actually paint through the postMessage bridge.
const frame = page.frameLocator("iframe[title='Live preview']");
await frame.locator(".dp-page").waitFor({ timeout: 10000 });
const swatches = await frame.locator(".dp-swatch").count();
const ramps = await frame.locator(".dp-ramp").count();
ok(`preview paints semantic swatches and primitive ramps (${swatches} swatches, ${ramps} ramps)`, swatches > 0 && ramps > 0);

// Tokens must have reached the iframe as CSS variables.
const primary = await frame.locator("body").evaluate((el) =>
  getComputedStyle(el).getPropertyValue("--dp-color-primary").trim());
ok(`--dp-color-primary reached the iframe (${primary || "EMPTY"})`, primary.length > 0);

await page.screenshot({ path: `${OUT}/01-system.png` });

// Sample Page.
await page.getByRole("button", { name: "Sample Page" }).click();
await frame.locator(".dp-hero").waitFor({ timeout: 10000 });
await page.screenshot({ path: `${OUT}/02-sample.png` });

// Apply a preset — must change the preview and be a single undo step.
const beforePreset = await frame.locator("body").evaluate((el) =>
  getComputedStyle(el).getPropertyValue("--dp-color-primary").trim());
await page.getByTitle("Display serif, large type, extreme whitespace, image-led, slow motion").click();
await page.waitForTimeout(600);
const afterPreset = await frame.locator("body").evaluate((el) =>
  getComputedStyle(el).getPropertyValue("--dp-color-primary").trim());
ok("applying a preset changes the preview's primary colour", beforePreset !== afterPreset);
await page.screenshot({ path: `${OUT}/03-editorial.png` });

// One undo must revert the whole preset.
await page.getByRole("button", { name: "Undo", exact: true }).click();
await page.waitForTimeout(600);
const afterUndo = await frame.locator("body").evaluate((el) =>
  getComputedStyle(el).getPropertyValue("--dp-color-primary").trim());
ok("a single undo reverts the whole preset application", afterUndo === beforePreset);

// Mobile device mode must trigger REAL media queries inside the iframe.
await page.getByRole("button", { name: "Mobile" }).click();
await page.waitForTimeout(500);
const navDisplay = await frame.locator(".dp-navbar-links").evaluate((el) => getComputedStyle(el).display);
const frameWidth = await frame.locator("body").evaluate(() => window.innerWidth);
ok(`mobile device mode narrows the iframe viewport (innerWidth=${frameWidth})`, frameWidth <= 480);
ok(`mobile device mode hides desktop nav links via a real media query (display=${navDisplay})`, navDisplay === "none");
await page.screenshot({ path: `${OUT}/04-mobile.png` });

await page.getByRole("button", { name: "Desktop" }).click();
await page.waitForTimeout(300);

// Components surface.
await page.getByRole("button", { name: "Components", exact: true }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/05-components.png` });

// Dark theme.
await page.getByRole("button", { name: "Sample Page" }).click();
await page.waitForTimeout(300);
await page.getByTitle("Toggle preview theme").click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/06-dark.png` });

ok(`no uncaught page errors (${pageErrors.length})`, pageErrors.length === 0);
if (pageErrors.length > 0) console.log(pageErrors.join("\n"));

await browser.close();

console.log(`\n${failures === 0 ? "ALL PASSED" : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
