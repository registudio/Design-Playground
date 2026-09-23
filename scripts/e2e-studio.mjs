import { mkdirSync, readFileSync } from "node:fs";
import { unzipSync } from "fflate";
import { chromium } from "playwright";

/**
 * Real-browser regression suite for the studio shell.
 *
 * The older suites (e2e-smoke, e2e-export, e2e-safety, e2e-preferences,
 * e2e-customisation) were written against the three-column shell and assert against a
 * layout the step-wizard replaced — a right rail of panels, a logo dropzone on the first
 * screen, view toggles in a top bar. They are kept rather than deleted because most of
 * what they check still matters and they are worth porting, but they do not currently
 * run. This covers the new shell so the branch is not left without a net.
 *
 * Needs a populated element index; the committed snapshot has one. See e2e-elements.mjs
 * for how to run against a fixture instead.
 */
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3100";
const OUT = process.env.E2E_OUTPUT_DIR ?? "./e2e-output";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const ok = (label, cond) => { console.log(cond ? `PASS: ${label}` : `FAIL: ${label}`); if (!cond) failures++; };

const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}),
});
const page = await browser.newPage({ viewport: { width: 1500, height: 950 }, acceptDownloads: true });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));

await page.goto(BASE_URL, { waitUntil: "networkidle" });

// --- The launch screen fits the window --------------------------------------
// It used to overflow by 74–154px at ordinary laptop heights, which grew a scrollbar
// and, where scrollbars are not overlaid, a gutter of dead space beside it.
for (const [width, height] of [[1920, 1080], [1440, 900], [1366, 768], [1280, 800], [1280, 720], [1024, 640]]) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(250);
  const welcome = await page.locator("main.welcome").evaluate((node) => ({
    over: node.scrollHeight - node.clientHeight,
    gutter: node.offsetWidth - node.clientWidth,
    full: Math.round(node.getBoundingClientRect().width) >= innerWidth - 1,
  }));
  ok(`the launch screen fits at ${width}x${height} (over by ${welcome.over}px)`, welcome.over <= 0);
  ok(`no scrollbar gutter beside it at ${width}x${height}`, welcome.gutter === 0);
  // Were it ever to scroll, the bar belongs at the window edge, not mid-page: the
  // scroller must not also be the centred column.
  ok(`the scroller spans the window at ${width}x${height}`, welcome.full);
}
await page.setViewportSize({ width: 1500, height: 950 });
await page.waitForTimeout(250);

await page.getByRole("button", { name: "+ New project" }).click();
const nameInput = page.getByPlaceholder("Project name");
await nameInput.click();
await nameInput.pressSequentially("Studio Verify");
await page.waitForFunction(() => !document.querySelector("button[type=submit]")?.hasAttribute("disabled"), null, { timeout: 15000 });
await page.getByRole("button", { name: "New project", exact: true }).click();
await page.waitForTimeout(1200);

// --- Chrome stays put -------------------------------------------------------
ok("the window itself never scrolls", !(await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 2)));
const headerBefore = await page.locator(".studio-header").boundingBox();
const footer = page.locator(".step-footer");
ok("the continue footer is reachable without scrolling", await footer.isVisible());
const footerBox = await footer.boundingBox();
ok("the footer sits inside the viewport", footerBox && footerBox.y + footerBox.height <= 951);
await page.locator(".studio-main").evaluate((el) => el.scrollTo({ top: 700 }));
await page.waitForTimeout(300);
const headerAfter = await page.locator(".studio-header").boundingBox();
ok("the header holds position while content scrolls", headerAfter && Math.abs(headerAfter.y - headerBefore.y) < 1);
ok("the footer holds position while content scrolls", await footer.isVisible());
await page.screenshot({ path: `${OUT}/studio-01-shell.png` });

// --- The library shows everything, progressively -----------------------------
await page.getByRole("button", { name: /Elements/ }).first().click();
await page.waitForTimeout(1500);
const meta = (await page.locator(".gallery-meta span").first().textContent()) ?? "";
const total = Number.parseInt(meta, 10);
ok("the library counts curated and registry elements together", total > 400);
const firstBatch = await page.locator(".element-card").count();
ok("only a first batch is mounted", firstBatch > 0 && firstBatch <= 40);
const titlesAt = () => page.locator(".element-card h3").allTextContents();
const beforeScroll = await titlesAt();
await page.locator(".studio-main").evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
await page.waitForTimeout(1200);
const afterScroll = await titlesAt();
const mounted = await page.locator(".element-card").count();
// The window moves rather than growing: cards behind the viewport are released, so the
// assertion is that different elements are on screen, not that more of them are.
ok("scrolling brings different elements into the grid", afterScroll.some((t) => !beforeScroll.includes(t)));
ok(`the mounted window stays bounded (${mounted})`, mounted <= 36 * 4 + 6);
console.log(`  ${meta.trim()} · mounted ${firstBatch} -> ${mounted} of ${total}`);

// --- Motion is previewed, engines are derived --------------------------------
await page.locator(".sidebar-link", { hasText: "Motion" }).click();
await page.waitForTimeout(900);
ok("motion options render as animated tiles", (await page.locator(".motion-tile").count()) > 10);
ok("the tiles are genuinely animating", (await page.evaluate(() =>
  [...document.querySelectorAll(".motion-stage i")].filter((n) => n.getAnimations().length > 0).length)) > 0);
ok("Motion and GSAP are no longer asked for", (await page.getByRole("switch", { name: "GSAP" }).count()) === 0);
ok("Lenis stays opt-in, since nothing implies it", (await page.getByRole("switch", { name: "Lenis" }).count()) === 1);
ok("engines are shown as derived", (await page.getByText("Required").count()) > 0);
await page.screenshot({ path: `${OUT}/studio-02-motion.png` });

// --- Advanced adds real depth on every step ----------------------------------
const controls = () => page.locator(".studio-main input, .studio-main select, .studio-main textarea, .studio-main button").count();
for (const step of ["The basics", "Page sections", "Elements", "Motion"]) {
  await page.locator(".sidebar-link", { hasText: step }).first().click();
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: "Basic", exact: true }).click();
  await page.waitForTimeout(500);
  const basic = await controls();
  await page.getByRole("button", { name: "Advanced", exact: true }).click();
  await page.waitForTimeout(700);
  const advanced = await controls();
  ok(`Advanced adds controls on "${step}" (${basic} -> ${advanced})`, advanced > basic);
}
// Navigated back explicitly: the loop above finishes on the motion step.
await page.getByRole("button", { name: /Page sections/ }).first().click();
await page.waitForTimeout(800);
ok("page rhythm appears in Advanced", (await page.locator(".page-rhythm").count()) === 1);

// --- A variant choice reaches the export (§1a, §5) ---------------------------
await page.getByRole("button", { name: /Elements/ }).first().click();
await page.waitForTimeout(1200);
await page.getByRole("button", { name: /^React Bits/ }).click();
await page.waitForTimeout(700);
const card = page.locator(".element-card").first();
await card.getByRole("button", { name: /^Add / }).click();
await page.waitForTimeout(600);
ok("the default variant is TypeScript + Tailwind", /-TS-TW$/.test((await card.locator(".element-advanced code").textContent()) ?? ""));
ok("all four published variants are offered", (await card.locator(".variant-picker button").count()) === 4);
await card.getByRole("button", { name: "JS/CSS" }).click();
await page.waitForTimeout(600);
ok("switching variant rewrites the install command", /-JS-CSS$/.test((await card.locator(".element-advanced code").textContent()) ?? ""));

await page.getByRole("button", { name: /^Visualise/ }).first().click();
await page.waitForSelector("iframe[title='Live preview']", { timeout: 20000 });
ok("Visualise reaches the live preview", true);
await page.screenshot({ path: `${OUT}/studio-03-preview.png` });

await page.getByRole("button", { name: /Export project/ }).click();
const download = await Promise.all([
  page.waitForEvent("download"),
  page.getByRole("button", { name: "Download ZIP" }).click(),
]).then(([d]) => d);
const zipPath = `${OUT}/studio-export.zip`;
await download.saveAs(zipPath);
const entries = unzipSync(new Uint8Array(readFileSync(zipPath)));
const names = Object.keys(entries).sort();
console.log("=== EXPORT ===");
for (const name of names) console.log(` ${name} (${entries[name].length} bytes)`);
ok("the bundle still carries the three design documents", ["design/design.tokens.json", "design/site.recipe.json", "design/asset-manifest.json"].every((f) => names.includes(f)));
ok("the selection file is written at the root (§5)", names.includes("design-playground-selection.json"));
const selection = JSON.parse(new TextDecoder().decode(entries["design-playground-selection.json"]));
ok("the chosen variant reaches the export", /-JS-CSS$/.test(selection.selections[0].installCommand));
const recipe = JSON.parse(new TextDecoder().decode(entries["design/site.recipe.json"]));
ok("the derived engine list is exported", typeof recipe.engines?.gsap === "boolean");
console.log("  engines:", JSON.stringify(recipe.engines));

ok(`no page errors (${pageErrors.length})`, pageErrors.length === 0);
if (pageErrors.length) console.log(pageErrors.slice(0, 3));

await browser.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
