import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

/**
 * Customisation and reversibility smoke test (§Wave G).
 *
 * Covers the things unit tests can't reach because they only exist as a whole
 * round trip through the store, the postMessage bridge and the preview's computed
 * styles: that a hand-set value actually lands as a CSS variable in the iframe, that
 * resetting it puts the old one back, and that the Advanced escape hatches are wired to
 * the tokens they claim. See e2e-smoke.mjs for the portability conventions.
 */
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3100";
const OUT = process.env.E2E_OUTPUT_DIR ?? "./e2e-output";
mkdirSync(OUT, { recursive: true });

let failures = 0;
function ok(label, cond, extra = "") {
  console.log(cond ? `PASS: ${label}` : `FAIL: ${label}${extra ? ` \u2014 ${extra}` : ""}`);
  if (!cond) failures++;
}

const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}),
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") pageErrors.push(m.text()); });

await page.goto(BASE_URL, { waitUntil: "networkidle" });
await page.getByPlaceholder("Project name").fill("UX Verify");
await page.getByRole("button", { name: "New project", exact: true }).click();
await page.waitForTimeout(600);

const frame = page.frameLocator('iframe[title="Live preview"]');
const cssVar = (name) =>
  frame.locator("body").evaluate(
    (el, n) => getComputedStyle(el).getPropertyValue(n).trim(),
    name,
  );

// ---------------------------------------------------------------- collapsible panels
const elementsPanel = page.getByRole("button", { name: /^Elements$/ });
ok("Panel heading is a collapse control", (await elementsPanel.getAttribute("aria-expanded")) === "true");
const solidBefore = await page.getByRole("button", { name: "solid", exact: true }).isVisible();
await elementsPanel.click();
await page.waitForTimeout(200);
const solidAfter = await page.getByRole("button", { name: "solid", exact: true }).isVisible().catch(() => false);
ok("Collapsing a panel hides its controls", solidBefore && !solidAfter);
await elementsPanel.click();
await page.waitForTimeout(200);
ok("Expanding restores them", await page.getByRole("button", { name: "solid", exact: true }).isVisible());

// ---------------------------------------------------------------- reset a component
// Provenance dot is inert until the value is actually user-set.
ok("Reset control absent before any edit", (await page.getByRole("button", { name: "Reset recipe.components.button" }).count()) === 0);
await page.getByRole("button", { name: "outline", exact: true }).first().click();
await page.waitForTimeout(300);
const resetButton = page.getByRole("button", { name: "Reset recipe.components.button" });
ok("Reset control appears once a value is user-set", (await resetButton.count()) === 1);
ok(
  "Reset tooltip explains what it restores to",
  /reset to the default/i.test((await resetButton.getAttribute("title")) ?? ""),
);
await resetButton.click();
await page.waitForTimeout(300);
ok(
  "Reset restores the value",
  (await page.getByRole("button", { name: "solid", exact: true }).getAttribute("aria-pressed")) === "true",
);
ok("Reset removes its own control again", (await page.getByRole("button", { name: "Reset recipe.components.button" }).count()) === 0);
ok("Reset is itself undoable", await page.getByRole("button", { name: "Undo", exact: true }).isEnabled());

// ---------------------------------------------------------------- advanced controls
await page.getByText("Advanced", { exact: true }).click();
await page.waitForTimeout(400);

// Layout escape hatches: previously only reachable via the 4 density presets.
const maxWidthInput = page.locator("input[type=number]").first();
await maxWidthInput.scrollIntoViewIfNeeded();
ok("Advanced reveals numeric layout fields", (await page.locator("input[type=number]").count()) > 0);

// Drive max width and confirm it reaches the live preview.
const beforeWidth = await cssVar("--dp-layout-max-width");
const maxWidthField = page.locator("label, div").filter({ hasText: /^Max width/ }).locator("input[type=number]").first();
await maxWidthField.fill("55");
await maxWidthField.blur();
await page.waitForTimeout(500);
const afterWidth = await cssVar("--dp-layout-max-width");
ok(`Max width reaches the preview (${beforeWidth} -> ${afterWidth})`, afterWidth === "55rem" && beforeWidth !== afterWidth);

// It must be resettable like anything else.
const resetMaxWidth = page.getByRole("button", { name: "Reset tokens.layout.maxWidth" });
ok("New numeric fields are resettable too", (await resetMaxWidth.count()) === 1);
await resetMaxWidth.click();
await page.waitForTimeout(400);
ok(`Resetting max width restores it (${await cssVar("--dp-layout-max-width")})`, (await cssVar("--dp-layout-max-width")) === beforeWidth);

// ---------------------------------------------------------------- image overlay
const overlayToggle = page.getByRole("switch", { name: /Image overlay/i }).or(
  page.locator("label").filter({ hasText: "Image overlay" }).getByRole("switch"),
).first();
await overlayToggle.scrollIntoViewIfNeeded();
ok("Overlay is off and emits no variable", (await cssVar("--dp-image-overlay")) === "");
await overlayToggle.click();
await page.waitForTimeout(500);
ok(`Enabling the overlay emits it to the preview (${await cssVar("--dp-image-overlay")})`, (await cssVar("--dp-image-overlay")) !== "");
ok("Overlay strength control appears when enabled", await page.getByText("Overlay strength").isVisible());

// ---------------------------------------------------------------- typography steps
await page.getByRole("button", { name: /Fine-tune each step/ }).scrollIntoViewIfNeeded();
await page.getByRole("button", { name: /Fine-tune each step/ }).click();
await page.waitForTimeout(300);
ok("Per-step type editor opens", await page.getByText("Display XL", { exact: true }).isVisible());
const beforeWeight = await cssVar("--dp-text-heading-1--font-weight");
const weightInput = page.locator('[data-type-step="heading1"] input[type=number]').nth(1);
await weightInput.scrollIntoViewIfNeeded();
await weightInput.fill("800");
await weightInput.blur();
await page.waitForTimeout(500);
const afterWeight = await cssVar("--dp-text-heading-1--font-weight");
ok(`Per-step weight reaches the preview (${beforeWeight} -> ${afterWeight})`, afterWeight === "800" && beforeWeight !== afterWeight);

// ---------------------------------------------------------------- reset all overrides
// Several values are hand-set by this point (overlay, per-step weight, ...).
const overrides = page.getByRole("button", { name: /\d+ edited/ });
ok("Override counter appears once values are hand-set", (await overrides.count()) === 1);
const countLabel = await overrides.textContent();
ok(`Counter reports more than one override (${countLabel?.trim()})`, Number.parseInt(countLabel ?? "0", 10) > 1);
await overrides.click();
await page.waitForTimeout(600);
ok("Reset all clears the counter", (await page.getByRole("button", { name: /\d+ edited/ }).count()) === 0);
ok(
  `Reset all restored the type weight (${await cssVar("--dp-text-heading-1--font-weight")})`,
  (await cssVar("--dp-text-heading-1--font-weight")) === beforeWeight,
);
ok("Reset all is a single undo step", await page.getByRole("button", { name: "Undo", exact: true }).isEnabled());
await page.getByRole("button", { name: "Undo", exact: true }).click();
await page.waitForTimeout(600);
ok("Undoing reset all brings the overrides back", (await page.getByRole("button", { name: /\d+ edited/ }).count()) === 1);

ok(`No page errors (${pageErrors.length})`, pageErrors.length === 0);
if (pageErrors.length) console.log(pageErrors.join("\n"));

await page.screenshot({ path: `${OUT}/08-customisation.png` });
await browser.close();
console.log(`\n${failures === 0 ? "ALL PASSED" : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
