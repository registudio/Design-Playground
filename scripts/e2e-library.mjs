import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

/**
 * The element library's navigation, in a real browser.
 *
 *   - its view lives in the URL: a link reproduces filters and an open element, and the
 *     browser's Back button closes a full-screen view instead of leaving the page;
 *   - the grid is one tab stop, and arrow keys move between cards — across the rows the
 *     window has not mounted, too;
 *   - full screen steps through the results with ← and →, and closing lands on the card
 *     last looked at;
 *   - hooks and utilities stay out of the grid until asked for.
 *
 * Needs a populated element index; the committed snapshot has one.
 */
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3100";
const OUT = process.env.E2E_OUTPUT_DIR ?? "./e2e-output";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const ok = (label, cond, detail = "") => { console.log(`${cond ? "PASS" : "FAIL"}: ${label}${!cond && detail ? ` (${detail})` : ""}`); if (!cond) failures++; };

const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}),
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));

const params = () => new URL(page.url()).searchParams;
const count = async () => Number.parseInt((await page.locator(".gallery-meta span").first().textContent()) ?? "0", 10);
/** Waits until the element count stops moving: the registry index arrives after the originals. */
const settle = async () => {
  let last = -1;
  for (let stable = 0; stable < 3; ) {
    await page.waitForTimeout(300);
    const now = await count();
    stable = now === last && now > 0 ? stable + 1 : 0;
    last = now;
  }
  return last;
};
const focused = () => page.evaluate(() => {
  const node = document.activeElement;
  const card = node?.closest?.("article.element-card");
  return { tag: node?.tagName, index: card ? Number(card.dataset.index) : null, id: card?.dataset.elementId ?? null, isCard: node?.matches?.("article.element-card") ?? false };
});
const dialogTitle = () => page.locator(".demo-dialog h2").textContent();

// --- A link opens the library with its view --------------------------------------------
await page.goto(new URL("/?type=Backgrounds", BASE_URL).href, { waitUntil: "networkidle" });
ok("a library link opens the library, not the launch screen", await page.locator(".element-grid").isVisible());
await settle();
ok("the link's type is applied", (await page.getByRole("combobox").first().inputValue()) === "Backgrounds");
const categories = await page.locator(".element-caption div>span").allTextContents();
ok("the grid holds only that type", categories.length > 0 && categories.every((c) => c === "Backgrounds"), categories.slice(0, 5).join(", "));

// --- Filters write back to the URL; chips remove them -----------------------------------
await page.locator(".library-filterbar select").nth(1).selectOption("vanta");
await page.waitForTimeout(200);
ok("choosing a source writes it to the URL", params().get("source") === "vanta");
ok("each active filter shows as a chip", (await page.locator(".filter-chip").count()) === 2);
await page.getByRole("button", { name: "Remove filter: Backgrounds" }).click();
await page.waitForTimeout(200);
ok("removing a chip removes its filter from the URL", !params().has("type") && params().get("source") === "vanta");
await page.getByRole("button", { name: "Reset all filters" }).click();
await page.waitForTimeout(400);
ok("resetting leaves a bare URL", new URL(page.url()).search === "", page.url());

// --- Hooks and utilities are hidden until asked for -------------------------------------
const withoutUtilities = await settle();
const hidden = page.locator(".gallery-meta .link-button");
ok("hidden hooks and utilities are counted", await hidden.isVisible());
const hiddenCount = Number.parseInt((await hidden.textContent()) ?? "0", 10);
await hidden.click();
await page.waitForTimeout(400);
ok("showing them adds exactly that many", (await count()) === withoutUtilities + hiddenCount, `${withoutUtilities} + ${hiddenCount} vs ${await count()}`);
ok("…and says so in the URL", params().get("utilities") === "1");
await page.getByRole("button", { name: "Remove filter: Showing hooks & utilities" }).click();
await page.waitForTimeout(400);
await page.locator(".search-field input").fill("use-click-outside");
await page.waitForTimeout(700);
ok("a search still finds a hidden utility", (await page.locator("[data-element-id='kokonutui:use-click-outside']").count()) === 1);
await page.locator(".search-field input").fill("");
const total = await settle();

// --- The grid is one tab stop ------------------------------------------------------------
await page.locator(".search-field input").focus();
let reached = null;
for (let presses = 0; presses < 20 && !reached; presses++) {
  await page.keyboard.press("Tab");
  const now = await focused();
  if (now.isCard) reached = { presses: presses + 1, ...now };
}
ok("Tab reaches the first card in a handful of presses", reached?.index === 0, JSON.stringify(reached));

await page.keyboard.press("ArrowRight");
ok("→ moves to the next card", (await focused()).index === 1);
const columns = await page.locator(".element-grid").evaluate((n) => getComputedStyle(n).gridTemplateColumns.split(" ").length);
await page.keyboard.press("ArrowDown");
ok("↓ moves down a row", (await focused()).index === 1 + columns);
await page.keyboard.press("ArrowUp");
await page.keyboard.press("ArrowLeft");
ok("↑ and ← come back", (await focused()).index === 0);

// Tab from a card goes through that card's controls and then out of the grid, never into
// the next card.
let leftGrid = false, enteredOther = false;
for (let presses = 0; presses < 8 && !leftGrid; presses++) {
  await page.keyboard.press("Tab");
  const now = await focused();
  if (now.index === null) leftGrid = true;
  else if (now.index !== 0) enteredOther = true;
}
ok("Tab leaves the grid after the card's own controls", leftGrid && !enteredOther);
await page.keyboard.press("Shift+Tab");
while (!(await focused()).isCard && (await focused()).index === 0) await page.keyboard.press("Shift+Tab");
ok("Shift+Tab comes back to the same card", (await focused()).index === 0, JSON.stringify(await focused()));

await page.keyboard.press("End");
await page.waitForTimeout(500);
const end = await focused();
ok("End reaches the last card, past the mounted rows", end.index === total - 1, `${end.index} of ${total}`);
ok("…and it is on screen", await page.locator(`article[data-index="${total - 1}"]`).isVisible());
await page.keyboard.press("Home");
await page.waitForTimeout(500);
ok("Home goes back to the first", (await focused()).index === 0);

// --- Full screen: open, step, close back onto the last card ------------------------------
const firstId = (await focused()).id;
await page.keyboard.press("Enter");
await page.waitForTimeout(300);
ok("Enter opens the card full screen", await page.locator(".demo-dialog").isVisible());
ok("…and names it in the URL", params().get("open") === firstId, page.url());
const firstTitle = await dialogTitle();
await page.keyboard.press("ArrowRight");
await page.keyboard.press("ArrowRight");
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(300);
ok("→ steps to the next result", (await dialogTitle()) !== firstTitle);
ok("the position is shown", ((await page.locator(".dialog-stepper span").textContent()) ?? "").startsWith("4 of"));
const steppedId = params().get("open");
await page.keyboard.press("ArrowLeft");
await page.keyboard.press("ArrowRight");
await page.keyboard.press("Escape");
await page.waitForTimeout(400);
ok("Escape closes it", !(await page.locator(".demo-dialog").isVisible()));
ok("…and takes it out of the URL", !params().has("open"));
ok("focus lands on the card last looked at", (await focused()).id === steppedId, JSON.stringify(await focused()));

await page.keyboard.press("Enter");
await page.waitForTimeout(300);
await page.goBack();
await page.waitForTimeout(400);
ok("the browser's Back button closes full screen", !(await page.locator(".demo-dialog").isVisible()));
ok("…without leaving the library", await page.locator(".element-grid").isVisible());

// --- A link can open an element full screen ----------------------------------------------
for (const id of ["starfield", "react-bits:ScrambledText"]) {
  await page.goto(new URL(`/?open=${encodeURIComponent(id)}`, BASE_URL).href, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  ok(`a link opens ${id} full screen`, await page.locator(".demo-dialog").isVisible());
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  ok(`…and closing it leaves the library, with a bare URL`, !(await page.locator(".demo-dialog").isVisible()) && new URL(page.url()).search === "");
}

await page.screenshot({ path: `${OUT}/library-controls.png` });
ok("no page errors", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
await browser.close();
console.log(failures ? `\n${failures} failing` : "\nAll library checks passed.");
process.exitCode = failures ? 1 : 0;
