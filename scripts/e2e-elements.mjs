import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { unzipSync } from "fflate";
import { chromium } from "playwright";

/**
 * Real-browser check of the Elements browser and the §5 selection export.
 *
 * Needs a populated index, which the committed snapshot deliberately is not — it ships
 * empty because inventing registry entries would produce install commands that fail.
 * So the server under test is started with DP_REGISTRY_SNAPSHOT pointing at the fixture
 * written by scripts/fixture-registry.mjs:
 *
 *   node scripts/fixture-registry.mjs /tmp/fixture-index.json
 *   DP_REGISTRY_SNAPSHOT=/tmp/fixture-index.json PORT=3100 npm run dev
 *   node scripts/e2e-elements.mjs
 *
 * See e2e-smoke.mjs for the shared BASE_URL / PLAYWRIGHT_EXECUTABLE_PATH / E2E_OUTPUT_DIR
 * conventions.
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
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
    : {}),
});
const page = await browser.newPage({
  viewport: { width: 1600, height: 1000 },
  acceptDownloads: true,
});
await page.goto(BASE_URL, { waitUntil: "networkidle" });

const nameInput = page.getByPlaceholder("Project name");
await nameInput.click();
await nameInput.pressSequentially("Elements Test");
await page.waitForFunction(
  () => !document.querySelector("button[type=submit]")?.hasAttribute("disabled"),
  null,
  { timeout: 15000 },
);
await page.getByRole("button", { name: "New project" }).click();
await page.waitForSelector("iframe[title='Live preview']");

// --- The rail ---------------------------------------------------------------

// Scoped to the rail's tab strip: panel headings are buttons too.
await page.locator("nav").getByRole("button", { name: "Elements", exact: true }).click();
await page.waitForSelector("text=Browse elements");
ok("Elements tab shows the engine toggles (§1b)", await page.getByText("GSAP").first().isVisible());
ok(
  "engines are toggles, never search results",
  (await page.getByRole("switch", { name: "Lenis" }).count()) === 1,
);
await page.screenshot({ path: `${OUT}/el-01-rail.png` });

// --- The browser ------------------------------------------------------------

await page.getByRole("button", { name: "Browse elements" }).click();
await page.waitForSelector("[role=dialog]");
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/el-02-browser.png` });

const countText = async () => (await page.locator("[aria-live=polite]").first().textContent()) ?? "";
const rows = () => page.locator("[role=dialog] ul li");

const initialRows = await rows().count();
ok("the index renders element cards", initialRows > 0);
ok("the result count matches the rows shown", (await countText()).startsWith(`${initialRows} `));

// Search narrows, and every term must match.
const search = page.getByPlaceholder("Search by name or description…");
await search.fill("scroll");
await page.waitForTimeout(250);
const searched = await rows().count();
ok("search narrows the results", searched > 0 && searched < initialRows);
ok("the count follows the search", (await countText()).startsWith(`${searched} `));

await search.fill("");
await page.waitForTimeout(250);

// A source chip carries a count, and selecting it does not zero the others.
const bklitChip = page.getByRole("button", { name: /^Bklit/ });
const soraChipLabelBefore = await page.getByRole("button", { name: /^Sora UI/ }).textContent();
await bklitChip.click();
await page.waitForTimeout(250);
const soraChipLabelAfter = await page.getByRole("button", { name: /^Sora UI/ }).textContent();
ok("a source chip filters the grid", (await rows().count()) < initialRows);
ok(
  "other sources keep their counts while one is selected",
  soraChipLabelBefore === soraChipLabelAfter && !/\s0$/.test(soraChipLabelAfter ?? ""),
);
await page.screenshot({ path: `${OUT}/el-03-filtered.png` });

await page.getByRole("button", { name: "Clear filters" }).click();
await page.waitForTimeout(250);
ok("clearing filters restores the full grid", (await rows().count()) === initialRows);

// Reference-only flagging (§1c).
await page.getByRole("button", { name: /^Componentry/ }).click();
await page.waitForTimeout(250);
ok(
  "Componentry entries are flagged as reference, not one-click installs (§1c)",
  (await page.locator("[role=dialog] ul li").first().getByText("Reference").count()) === 1,
);
await page.getByRole("button", { name: "Installable only" }).click();
await page.waitForTimeout(250);
ok("'Installable only' hides the reference source", (await rows().count()) === 0);
await page.getByRole("button", { name: "Clear filters" }).click();
await page.waitForTimeout(250);

// React Bits variant collapsing is visible, not just internal (§1a).
await page.getByRole("button", { name: /^React Bits/ }).click();
await page.waitForTimeout(250);
const reactBitsTitles = await page.locator("[role=dialog] ul li h3").allTextContents();
ok(
  "React Bits' four published variants appear as one row each (§1a)",
  reactBitsTitles.length === new Set(reactBitsTitles).size &&
    !reactBitsTitles.some((title) => /-(JS|TS)-(CSS|TW)$/.test(title)),
);
await page.getByRole("button", { name: "Clear filters" }).click();
await page.waitForTimeout(250);

// --- Selecting --------------------------------------------------------------

const firstCard = page.locator("[role=dialog] ul li").first();
const chosenTitle = await firstCard.locator("h3").textContent();
await firstCard.getByRole("button", { name: /^Select / }).click();
await page.waitForTimeout(250);
ok("selecting marks the card", (await firstCard.getByText("Selected").count()) > 0);
ok("the selection count updates", (await countText()).includes("1 selected"));

await page.keyboard.press("Escape");
await page.waitForTimeout(300);
ok("Escape closes the browser", (await page.locator("[role=dialog]").count()) === 0);

// The rail carries the selection, and the intended use is editable there.
ok(
  "the rail lists the selection",
  (await page.getByText(chosenTitle ?? "", { exact: true }).count()) > 0,
);
const useInput = page.locator(`input[id^='use-']`).first();
await useInput.fill("hero headline reveal");
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/el-04-selected.png` });

// --- The export (§5) --------------------------------------------------------

await page.getByRole("button", { name: "Export" }).click();
const download = await Promise.all([
  page.waitForEvent("download"),
  page.getByRole("button", { name: "Download ZIP" }).click(),
]).then(([d]) => d);

const zipPath = `${OUT}/elements-export.zip`;
await download.saveAs(zipPath);
const entries = unzipSync(new Uint8Array(readFileSync(zipPath)));
const names = Object.keys(entries).sort();
console.log("=== EXPORT CONTENTS ===");
for (const name of names) console.log(` ${name}  (${entries[name].length} bytes)`);

ok(
  "the selection file is written at the project root, not under design/ (§5)",
  names.includes("design-playground-selection.json"),
);

const selection = JSON.parse(new TextDecoder().decode(entries["design-playground-selection.json"]));
writeFileSync(`${OUT}/selection.json`, JSON.stringify(selection, null, 2));
console.log("=== SELECTION ===");
console.log(JSON.stringify(selection, null, 2));

ok("it declares the §5 schema", selection.schema === "design-playground-selection/v1");
ok("it carries the selection", selection.selections?.length === 1);
ok(
  "each entry has exactly id, installCommand and intendedUse",
  Object.keys(selection.selections[0]).sort().join(",") === "id,installCommand,intendedUse",
);
ok(
  "the intended use typed in the rail reaches the export",
  selection.selections[0].intendedUse === "hero headline reveal",
);
ok(
  "the install command is a real shadcn command",
  /^npx shadcn@latest add @[\w-]+\/\S+$/.test(selection.selections[0].installCommand),
);

await browser.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
