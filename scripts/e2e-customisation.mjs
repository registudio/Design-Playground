import { createProject, goStep, launch, OUT, tally } from "./lib/studio.mjs";

/**
 * Customisation controls on "The basics": collapsible panels, the provenance dot that is
 * also a reset, Advanced-only numeric fields, the image overlay, per-step type, and
 * "reset all" as one undoable step. Values are read from the live specimen beside the
 * controls, which is scoped to the same token CSS the preview uses.
 */
const { ok, finish } = tally();
const { browser, page, pageErrors } = await launch({ width: 1600, height: 1000 });
await createProject(page, "UX Verify");
await page.locator(".mode-switch").getByRole("button", { name: "Advanced", exact: true }).click();
await goStep(page, "The basics");
const cssVar = (name) => page.locator(".bs-page").first().evaluate((el, n) => getComputedStyle(el).getPropertyValue(n).trim(), name);

// ---------------------------------------------------------------- collapsible panels
const layout = page.getByRole("button", { name: /^Layout$/ });
ok("a panel heading is a collapse control", (await layout.getAttribute("aria-expanded")) === "true");
const field = () => page.locator("label, div").filter({ hasText: /^Max width/ }).locator("input[type=number]").first();
const visibleBefore = await field().isVisible();
await layout.click();
await page.waitForTimeout(200);
ok("collapsing a panel hides its controls", visibleBefore && !(await field().isVisible().catch(() => false)));
await layout.click();
await page.waitForTimeout(200);
ok("expanding restores them", await field().isVisible());

// ---------------------------------------------------------------- numeric fields + reset dot
ok("Reset control absent before any edit", (await page.getByRole("button", { name: "Reset tokens.layout.maxWidth" }).count()) === 0);
const beforeWidth = await cssVar("--dp-layout-max-width");
await field().fill("55");
await field().blur();
await page.waitForTimeout(500);
const afterWidth = await cssVar("--dp-layout-max-width");
ok(`max width reaches the specimen (${beforeWidth} → ${afterWidth})`, afterWidth === "55rem" && beforeWidth !== afterWidth);
const resetWidth = page.getByRole("button", { name: "Reset tokens.layout.maxWidth" });
ok("a reset control appears once a value is set by hand", (await resetWidth.count()) === 1);
await resetWidth.click();
await page.waitForTimeout(400);
ok("reset restores the value", (await cssVar("--dp-layout-max-width")) === beforeWidth);
ok("reset removes its own control again", (await page.getByRole("button", { name: "Reset tokens.layout.maxWidth" }).count()) === 0);
ok("reset is itself undoable", await page.getByRole("button", { name: "Undo", exact: true }).isEnabled());

// ---------------------------------------------------------------- image overlay
const overlay = page.getByRole("switch", { name: /Image overlay/i }).or(page.locator("label").filter({ hasText: "Image overlay" }).getByRole("switch")).first();
await overlay.scrollIntoViewIfNeeded();
ok("the overlay is off and emits no variable", (await cssVar("--dp-image-overlay")) === "");
await overlay.click();
await page.waitForTimeout(500);
ok("enabling the overlay emits it", (await cssVar("--dp-image-overlay")) !== "");
ok("its strength control appears when enabled", await page.getByText("Overlay strength").isVisible());

// ---------------------------------------------------------------- per-step type
await page.getByRole("button", { name: /Fine-tune each step/ }).scrollIntoViewIfNeeded();
await page.getByRole("button", { name: /Fine-tune each step/ }).click();
await page.waitForTimeout(300);
ok("the per-step type editor opens", await page.locator('[data-type-step="heading1"]').isVisible());
const beforeWeight = await cssVar("--dp-text-heading-1--font-weight");
const weight = page.locator('[data-type-step="heading1"] input[type=number]').nth(1);
await weight.fill("800");
await weight.blur();
await page.waitForTimeout(500);
ok(`a step's weight reaches the specimen (${beforeWeight} → ${await cssVar("--dp-text-heading-1--font-weight")})`, (await cssVar("--dp-text-heading-1--font-weight")) === "800");

// ---------------------------------------------------------------- reset all
const overrides = page.getByRole("button", { name: /\d+ edited/ });
ok("the override counter appears once values are hand-set", (await overrides.count()) === 1);
ok(`it counts more than one (${(await overrides.textContent())?.trim()})`, Number.parseInt((await overrides.textContent()) ?? "0", 10) > 1);
await overrides.click();
await page.waitForTimeout(600);
ok("reset all clears the counter", (await page.getByRole("button", { name: /\d+ edited/ }).count()) === 0);
ok("reset all restored the type weight", (await cssVar("--dp-text-heading-1--font-weight")) === beforeWeight);
await page.getByRole("button", { name: "Undo", exact: true }).click();
await page.waitForTimeout(600);
ok("one undo brings every override back", (await page.getByRole("button", { name: /\d+ edited/ }).count()) === 1);

await page.screenshot({ path: `${OUT}/customisation.png` });
ok(`no page errors (${pageErrors.length})`, pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
await finish(browser);
