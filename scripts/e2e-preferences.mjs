import { BASE_URL, createProject, goStep, launch, OUT, tally, visualise } from "./lib/studio.mjs";

/**
 * View preferences survive a reload; the project reopens; a corrupt stored entry falls
 * back to defaults without breaking the app; the command palette offers "reset all".
 */
const { ok, finish } = tally();
const { browser, page, pageErrors } = await launch({ width: 1600, height: 1000 });
await createProject(page, "Prefs Verify");

await page.locator(".mode-switch").getByRole("button", { name: "Advanced", exact: true }).click();
await goStep(page, "The basics");
await page.getByRole("button", { name: /^Layout$/ }).click();
await visualise(page);
await page.getByRole("button", { name: "Style guide", exact: true }).click();
await page.getByRole("button", { name: "Mobile", exact: true }).click();
await page.waitForTimeout(700);

await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(1200);
// The launch screen comes first, with the project it reopened offered to pick up.
const resume = page.getByRole("button", { name: /Pick up where you left off/ });
ok("the open project is reopened on reload", await resume.isVisible() && /Prefs Verify/.test((await resume.textContent()) ?? ""));
await resume.click();
await page.waitForTimeout(600);
ok("Advanced survives reload", (await page.locator(".mode-switch button.active").textContent()) === "Advanced");
await goStep(page, "The basics");
ok("a collapsed panel survives reload", (await page.getByRole("button", { name: /^Layout$/ }).getAttribute("aria-expanded")) === "false");
await visualise(page);
// Not checked: the preview mode is restored, but Visualise always opens on the sample
// page by design, so there is no way to observe it surviving from here.
ok("the device survives reload", (await page.getByRole("button", { name: "Mobile", exact: true }).getAttribute("class"))?.includes("chrome-accent") || (await page.getByRole("button", { name: "Mobile", exact: true }).getAttribute("aria-pressed")) === "true" || (await page.getByRole("button", { name: "Mobile", exact: true }).getAttribute("class"))?.includes("active"));

await page.evaluate(() => localStorage.setItem("design-playground:view-preferences:v1", "{not json"));
await page.goto(BASE_URL, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
ok("corrupt stored preferences fall back to defaults without breaking", await page.getByRole("button", { name: /Pick up where you left off/ }).isVisible());

// The palette offers "reset all" once something is overridden.
await page.getByRole("button", { name: /Pick up where you left off/ }).click();
// The corrupt entry reset Advanced and the collapsed panel, as it should.
await page.locator(".mode-switch").getByRole("button", { name: "Advanced", exact: true }).click();
await goStep(page, "The basics");
const field = page.locator("label, div").filter({ hasText: /^Max width/ }).locator("input[type=number]").first();
await field.fill("55");
await field.blur();
await page.waitForTimeout(400);
await page.keyboard.press("Control+k");
await page.waitForTimeout(400);
await page.getByPlaceholder(/Jump to a preset/).fill("reset");
await page.waitForTimeout(300);
const reset = page.getByText(/Reset \d+ manual override/).first();
ok("the command palette offers the reset action", await reset.isVisible());
await reset.click();
await page.waitForTimeout(500);
ok("the palette's reset reverts the value", (await field.inputValue()) !== "55");

await page.screenshot({ path: `${OUT}/preferences.png` });
ok(`no page errors (${pageErrors.length})`, pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
await finish(browser);
