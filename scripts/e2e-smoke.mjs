import { chromium } from "playwright";

const OUT = "/tmp/claude-0/-home-user-Design-Playground/015a25f4-7ad4-5ff5-94b9-0786cddc46ca/scratchpad";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });

await page.goto("http://localhost:3311/", { waitUntil: "networkidle" });

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
console.log(`preview: ${swatches} semantic swatches, ${ramps} primitive ramps`);

// Tokens must have reached the iframe as CSS variables.
const primary = await frame.locator("body").evaluate((el) =>
  getComputedStyle(el).getPropertyValue("--dp-color-primary").trim());
console.log("--dp-color-primary in iframe:", primary || "(EMPTY)");

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
console.log("preset changed primary:", beforePreset !== afterPreset);
await page.screenshot({ path: `${OUT}/03-editorial.png` });

// One undo must revert the whole preset.
await page.getByRole("button", { name: "Undo", exact: true }).click();
await page.waitForTimeout(600);
const afterUndo = await frame.locator("body").evaluate((el) =>
  getComputedStyle(el).getPropertyValue("--dp-color-primary").trim());
console.log("single undo reverted preset:", afterUndo === beforePreset);

// Mobile device mode must trigger REAL media queries inside the iframe.
await page.getByRole("button", { name: "Mobile" }).click();
await page.waitForTimeout(500);
const navHidden = await frame.locator(".dp-navbar-links").evaluate((el) =>
  getComputedStyle(el).display);
const frameWidth = await frame.locator("body").evaluate(() => window.innerWidth);
console.log(`mobile: iframe innerWidth=${frameWidth}, nav links display=${navHidden}`);
await page.screenshot({ path: `${OUT}/04-mobile.png` });

await page.getByRole("button", { name: "Desktop" }).click();
await page.waitForTimeout(300);

// Components surface.
await page.getByRole("banner").getByRole("button", { name: "Components" }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/05-components.png` });

// Dark theme.
await page.getByRole("button", { name: "Sample Page" }).click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: "Light" }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/06-dark.png` });

console.log(errors.length ? `ERRORS:\n${errors.join("\n")}` : "no page errors");
await browser.close();
