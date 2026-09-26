import { createProject, goStep, launch, OUT, tally, visualise } from "./lib/studio.mjs";

/**
 * Browser smoke test: the live preview paints through its postMessage bridge, tokens
 * arrive as CSS variables, a template is one undo step, and device modes drive real
 * media queries inside the frame.
 */
const { ok, finish } = tally();
const { browser, page, pageErrors } = await launch({ width: 1600, height: 1000 });
await createProject(page, "Northwind");

const frame = await visualise(page);
const cssVar = (name) => frame.locator(".dp-page").evaluate((el, n) => getComputedStyle(el).getPropertyValue(n).trim(), name);
ok("the sample page paints in the preview", await frame.locator(".dp-hero").first().isVisible());
const primary = await cssVar("--dp-color-primary");
ok(`--dp-color-primary reached the frame (${primary || "EMPTY"})`, primary.length > 0);

await page.getByRole("button", { name: "Style guide", exact: true }).click();
await page.waitForTimeout(600);
const swatches = await frame.locator(".dp-swatch").count();
const ramps = await frame.locator(".dp-ramp").count();
ok(`the style guide paints swatches and ramps (${swatches}, ${ramps})`, swatches > 0 && ramps > 0);
await page.screenshot({ path: `${OUT}/smoke-01-style-guide.png` });
await page.getByRole("button", { name: "Sample page", exact: true }).click();

// A template rewrites most of the document, and is still one undo step.
await page.getByRole("button", { name: "← Back to editing" }).click();
await goStep(page, "Templates");
await page.locator(".template-card").filter({ hasText: "Editorial" }).first().click();
await page.waitForTimeout(600);
const after = await visualise(page);
const applied = await after.locator(".dp-page").evaluate((el) => getComputedStyle(el).getPropertyValue("--dp-color-primary").trim());
ok("applying a template changes the preview's primary colour", applied !== primary, `${primary} → ${applied}`);
await page.getByRole("button", { name: "Undo", exact: true }).click();
await page.waitForTimeout(700);
const undone = await after.locator(".dp-page").evaluate((el) => getComputedStyle(el).getPropertyValue("--dp-color-primary").trim());
ok("a single undo reverts the whole template", undone === primary, `${undone} vs ${primary}`);

// Mobile must narrow the frame itself, so the page's own media queries fire.
await page.getByRole("button", { name: "Mobile", exact: true }).click();
await page.waitForTimeout(600);
const width = await after.evaluate(() => window.innerWidth);
ok(`mobile narrows the frame's viewport (innerWidth=${width})`, width <= 480);
const links = await after.locator(".dp-navbar-links").first().evaluate((el) => getComputedStyle(el).display).catch(() => "absent");
ok(`mobile hides desktop nav links through a real media query (${links})`, links === "none" || links === "absent");
await page.screenshot({ path: `${OUT}/smoke-02-mobile.png` });
await page.getByRole("button", { name: "Desktop", exact: true }).click();

await page.getByRole("button", { name: /☼ Light|☾ Dark/ }).click();
await page.waitForTimeout(500);
ok("the theme toggle reaches the frame", await after.evaluate(() => document.documentElement.classList.contains("dark")));

ok(`no uncaught page errors (${pageErrors.length})`, pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
await finish(browser);
