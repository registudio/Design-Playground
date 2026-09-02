import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

/**
 * View-preference and session-restore smoke test (§Wave G).
 *
 * Everything here is about what survives a page load, which no unit test can prove:
 * that the open project and the way you had the UI arranged both come back, that a
 * corrupted stored entry degrades to defaults instead of breaking the app, and that
 * closing a project actually stops it reopening. See e2e-smoke.mjs for the portability
 * conventions.
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const OUT = process.env.E2E_OUTPUT_DIR ?? "./e2e-output";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const ok = (label, cond) => { console.log(cond ? `PASS: ${label}` : `FAIL: ${label}`); if (!cond) failures++; };

const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}),
});
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

await page.goto(BASE, { waitUntil: "networkidle" });
await page.getByPlaceholder("Project name").fill("Prefs Verify");
await page.getByRole("button", { name: "New project", exact: true }).click();
await page.waitForTimeout(600);

// Change a spread of view preferences.
await page.getByRole("button", { name: "Sample Page", exact: true }).click();
await page.getByRole("button", { name: "Mobile", exact: true }).click();
await page.getByText("Advanced", { exact: true }).click();
await page.getByRole("button", { name: "Animations", exact: true }).click();
await page.getByRole("button", { name: /^Motion profile$/ }).click();   // collapse a panel
await page.waitForTimeout(600);

const collapsedBefore = await page.getByRole("button", { name: /^Motion profile$/ }).getAttribute("aria-expanded");
ok("Panel collapsed before reload", collapsedBefore === "false");

// Reload: the project itself, and everything above, must come back.
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(1200);

ok("The open project is reopened on reload", await page.getByRole("button", { name: /Prefs Verify/ }).isVisible());
ok(
  "Preview mode survives reload",
  (await page.getByRole("button", { name: "Sample Page", exact: true }).getAttribute("class"))?.includes("bg-chrome-accent"),
);
ok(
  "Device survives reload",
  (await page.getByRole("button", { name: "Mobile", exact: true }).getAttribute("class"))?.includes("bg-chrome-accent"),
);
ok("Advanced survives reload", await page.locator('input[type="checkbox"]').first().isChecked());
ok(
  "Section survives reload",
  (await page.getByRole("button", { name: "Animations", exact: true }).getAttribute("class"))?.includes("border-chrome-accent"),
);
ok(
  "Collapsed panel survives reload",
  (await page.getByRole("button", { name: /^Motion profile$/ }).getAttribute("aria-expanded")) === "false",
);

// A corrupted entry must not break the app.
await page.evaluate(() => localStorage.setItem("design-playground:view-preferences:v1", "{not json"));
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(800);
ok("Corrupt stored preferences fall back to defaults without breaking", await page.getByRole("button", { name: "Export", exact: true }).isVisible());

// The palette should expose the reset action once something is overridden.
await page.getByRole("button", { name: "Components", exact: true }).click();
await page.getByRole("button", { name: "outline", exact: true }).first().click();
await page.waitForTimeout(400);
await page.keyboard.press("Control+k");
await page.waitForTimeout(400);
await page.getByPlaceholder(/Jump to a preset/).fill("reset");
await page.waitForTimeout(300);
ok("Command palette offers the reset action", await page.getByText(/Reset \d+ manual override/).first().isVisible());
await page.getByText(/Reset \d+ manual override/).first().click();
await page.waitForTimeout(500);
ok(
  "Palette reset actually reverts the value",
  (await page.getByRole("button", { name: "solid", exact: true }).getAttribute("aria-pressed")) === "true",
);

// The way back to the directory, and that it stops the auto-reopen.
await page.getByRole("button", { name: /Prefs Verify/ }).click();
await page.waitForTimeout(600);
ok("Clicking the project name returns to the directory", await page.getByPlaceholder("Project name").isVisible());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(1000);
ok("Closing a project stops it reopening on the next load", await page.getByPlaceholder("Project name").isVisible());

ok(`No page errors (${errors.length})`, errors.length === 0);
if (errors.length) console.log(errors.join("\n"));

await page.screenshot({ path: `${OUT}/09-preferences.png` });
await browser.close();
console.log(`\n${failures === 0 ? "ALL PASSED" : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
