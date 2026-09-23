import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { measureInk } from "./lib/png-ink.mjs";

/**
 * Opens every element in the real app — in its card, then full screen — and times how
 * long each takes to show something.
 *
 * The other checks each cover a slice: audit-originals renders the authored documents
 * outside the app, audit-grid-scroll measures the card budget under scrolling,
 * e2e-preview-states covers one fixture per failure shape. None of them answers the
 * question as a person asks it: *if I scroll to this, does it show up, quickly — and if
 * I open it full screen, does that?* This does, for every element, one at a time.
 *
 * "Shows up" is decided from pixels, not from status. For each view the frame is
 * screenshotted with the card's own overlays (tag, status pill, expand button) hidden,
 * and it counts only once a measurable share of it differs from its background. A card
 * reading Ready over a flat rectangle fails here.
 *
 * *When* it showed up is read from the frame's own paint timeline, not the screenshot:
 * capturing from a busy frame process can take over a second, which is the harness's
 * latency, not the viewer's. A registry card counts from when its placeholder lifts.
 *
 * A view fails when it
 *   - never paints, or paints only after the budget (CARD_BUDGET_MS / FULL_BUDGET_MS),
 *   - is a registry card still on its placeholder or stuck Queued / Rendering…,
 *   - opens full screen at less than the whole width or half the height of the window,
 *   - cannot be closed with Escape.
 * With STRICT=1 a registry stand-in ("Fallback demo") is a failure too — use that
 * against `mock-registry.mjs --healthy`, where every item is meant to render, so that
 * anything slow or empty is the pipeline's fault rather than the fixture's.
 *
 *   npm run build && DP_REGISTRY_BASE=http://127.0.0.1:4599 npx next start -p 3100
 *   node scripts/mock-registry.mjs 4599 --healthy
 *   STRICT=1 node scripts/e2e-render-all.mjs
 *
 * Against the live registries, leave DP_REGISTRY_BASE unset and STRICT off.
 *
 * FILTER=regex  only element ids matching it, e.g. FILTER='^(vanta|shader)-' SOFTWARE_GL=1
 * SHARD=i/n     every n-th element starting at i, to split a run across processes
 * VIEWPORT=WxH  default 1440x900; 390x844 checks the phone layout
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const OUT = process.env.E2E_OUTPUT_DIR ?? "./e2e-output/render-all";
const CARD_BUDGET = Number(process.env.CARD_BUDGET_MS ?? 3000);
const FULL_BUDGET = Number(process.env.FULL_BUDGET_MS ?? 3000);
const GIVE_UP = Number(process.env.GIVE_UP_MS ?? 20000);
const STRICT = process.env.STRICT === "1";
const FILTER = new RegExp(process.env.FILTER ?? "");
const [SHARD, SHARDS] = (process.env.SHARD ?? "0/1").split("/").map(Number);
const [WIDTH, HEIGHT] = (process.env.VIEWPORT ?? "1440x900").split("x").map(Number);
/** From scripts/lib/png-ink.mjs: a single line of card text measures about 0.006 / 580px. */
const shows = ({ share, pixels }) => share >= 0.003 || pixels >= 400;
mkdirSync(OUT, { recursive: true });

// Hidden only while a screenshot is taken. They sit on top of the frame and would
// otherwise count as ink on a card that painted nothing itself.
const OVERLAYS = ".canvas-tag,.preview-status,.preview-reason,.expand-demo{visibility:hidden!important}";

const browser = await chromium.launch({
  // Software GPU is opt-in. It lets the Vanta and shader elements draw rather than show
  // their CSS fallback, but in a headless sandbox its compositing degrades over a long
  // session: after a few hundred cards, newly opened frames intermittently capture as
  // blank — WebGL on or off, and never in a fresh page or with standard compositing,
  // where the same sequence painted 6 of 6. Left on for a full run it reports failures
  // that are the harness's, not the app's. Use it with FILTER for the WebGL elements;
  // audit-originals.mjs already proves each of them draws and animates.
  args: process.env.SOFTWARE_GL ? ["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"] : [],
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}),
});
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));

await page.goto(BASE, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Explore", exact: true }).click();
// The registry index arrives after the originals; wait until the count stops moving.
let total = 0;
for (let stable = 0, last = -1; stable < 4; ) {
  await page.waitForTimeout(500);
  total = await page.evaluate(() => Number.parseInt(document.querySelector(".gallery-meta span")?.textContent ?? "0", 10));
  stable = total === last && total > 0 ? stable + 1 : 0;
  last = total;
}
console.log(`${total} elements in the library · ${WIDTH}x${HEIGHT}${STRICT ? " · strict" : ""}`);

const wait = (ms) => page.waitForTimeout(ms);
const cardOf = (id) => page.locator(`.element-card[data-element-id="${id.replace(/"/g, '\\"')}"]`);

/**
 * When a frame first painted, on this machine's clock, from the frame's own timeline.
 *
 * Screenshots prove that pixels are there but are poor clocks: capturing from a frame
 * process that is busy — the first Vanta card compiling three.js, say — can take over a
 * second, and that latency was being reported as the card's. The browser records first
 * contentful paint itself; its timeOrigin is on the same wall clock as Date.now().
 */
async function firstPaintAt(frameLocator) {
  try {
    const inner = await (await frameLocator.elementHandle({ timeout: 1000 }))?.contentFrame();
    const at = await inner?.evaluate(() => {
      const paint = performance.getEntriesByName("first-contentful-paint")[0];
      return paint ? performance.timeOrigin + paint.startTime : null;
    });
    return typeof at === "number" ? at : null;
  } catch { return null; }
}

/** Screenshot a frame with the overlays hidden and measure it. */
async function ink(locator) {
  try { return measureInk(await locator.screenshot({ style: OVERLAYS, timeout: 3000 })); }
  catch (error) { if (process.env.DEBUG) console.log(`  screenshot failed: ${error.message.split("\n")[0]}`); return { share: 0, pixels: 0 }; }
}

async function checkCard(id) {
  const card = cardOf(id);
  await card.scrollIntoViewIfNeeded();
  const started = Date.now();
  const registry = await card.locator(".registry-canvas").count() > 0;
  const frame = card.locator(registry ? ".registry-canvas iframe" : ".original-canvas iframe");
  let last = { status: "", placeholder: false, ink: { share: 0, pixels: 0 }, slotMs: null };
  while (Date.now() - started < GIVE_UP) {
    const state = await card.evaluate((node) => ({
      status: node.querySelector(".preview-status")?.firstChild?.textContent?.trim() ?? "",
      placeholder: !!node.querySelector(".registry-placeholder"),
      reason: node.querySelector(".preview-reason")?.textContent ?? "",
      frame: !!node.querySelector(".element-canvas iframe"),
    }));
    last = { ...last, ...state };
    // When the card got its slot, so a slow card can be told apart: a long wait here is
    // the queue, a long gap after it is the document itself.
    if (last.slotMs === null && state.frame) last.slotMs = Date.now() - started;
    const terminal = ["Failed", "Nothing to show"].includes(state.status);
    const settled = !registry || ["Ready", "Fallback demo"].includes(state.status);
    if (state.frame && settled && !state.placeholder) {
      // A registry card is visible when its placeholder lifts, which this poll has just
      // seen; an authored one as soon as its frame paints.
      const revealed = Date.now();
      last.ink = await ink(frame);
      if (shows(last.ink)) {
        const painted = await firstPaintAt(frame);
        const at = registry ? Math.max(revealed, painted ?? 0) : Math.min(revealed, painted ?? revealed);
        return { registry, ms: Math.max(0, Math.round(at - started)), ...last };
      }
    }
    if (terminal) break;
    await wait(120);
  }
  return { registry, ms: null, ...last };
}

async function checkFullScreen(id, registry) {
  const card = cardOf(id);
  await card.hover();
  await card.locator(".expand-demo").click();
  const started = Date.now();
  const dialog = page.locator(".demo-dialog");
  const frame = dialog.locator("iframe");
  const result = { ms: null, ink: { share: 0, pixels: 0 }, fallback: false, width: 0, height: 0, escapeCloses: false };
  while (Date.now() - started < GIVE_UP) {
    if (await frame.count()) {
      const inner = await (await frame.elementHandle())?.contentFrame();
      result.fallback = registry && !!inner && await inner.evaluate(() => !!document.querySelector(".dp-auto-visual")).catch(() => false);
      const seen = Date.now();
      result.ink = await ink(frame);
      if (shows(result.ink)) {
        const painted = await firstPaintAt(frame);
        result.ms = Math.max(0, Math.round(Math.min(seen, painted ?? seen) - started));
        break;
      }
    }
    await wait(120);
  }
  const box = await frame.boundingBox().catch(() => null);
  result.width = Math.round(box?.width ?? 0);
  result.height = Math.round(box?.height ?? 0);
  if (result.ms === null) await page.screenshot({ path: `${OUT}/${id.replace(/[^\w-]+/g, "_")}.full.png` });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  result.escapeCloses = await dialog.count() === 0;
  if (!result.escapeCloses) await dialog.getByRole("button", { name: /Close/ }).click();
  await dialog.waitFor({ state: "detached", timeout: 5000 });
  return result;
}

// Whichever ancestor of the grid actually scrolls: .studio-main on a desktop, but the
// layout hands scrolling to .studio-body at phone widths.
await page.evaluate(() => {
  for (let node = document.querySelector(".element-grid")?.parentElement; node; node = node.parentElement) {
    const overflow = getComputedStyle(node).overflowY;
    if ((overflow === "auto" || overflow === "scroll") && node.scrollHeight > node.clientHeight) { node.dataset.renderAllScroller = ""; return; }
  }
  document.scrollingElement.dataset.renderAllScroller = "";
});
const scroller = page.locator("[data-render-all-scroller]");
const done = new Set();
const results = [];
let index = -1;
for (let idle = 0; idle < 3; ) {
  const ids = await page.$$eval(".element-card", (nodes) => nodes.map((node) => node.dataset.elementId));
  const next = ids.find((id) => id && !done.has(id));
  if (!next) {
    const moved = await scroller.evaluate((node) => { const before = node.scrollTop; node.scrollBy(0, node.clientHeight * 0.8); return node.scrollTop !== before; });
    await wait(moved ? 250 : 800);
    idle = moved ? 0 : idle + 1;
    continue;
  }
  idle = 0;
  done.add(next);
  index += 1;
  if (index % SHARDS !== SHARD || !FILTER.test(next)) continue;

  const card = await checkCard(next);
  if (card.ms === null) await cardOf(next).screenshot({ path: `${OUT}/${next.replace(/[^\w-]+/g, "_")}.card.png` }).catch(() => {});
  const full = await checkFullScreen(next, card.registry);
  const problems = [];
  if (card.ms === null) problems.push(`card never showed (${card.status || "no status"}${card.placeholder ? ", placeholder" : ""}${card.reason ? `: ${card.reason}` : ""})`);
  else if (card.ms > CARD_BUDGET) problems.push(`card took ${card.ms}ms`);
  if (full.ms === null) problems.push("full screen never showed");
  else if (full.ms > FULL_BUDGET) problems.push(`full screen took ${full.ms}ms`);
  if (full.width < WIDTH * 0.98 || full.height < HEIGHT * 0.5) problems.push(`full screen is only ${full.width}x${full.height}`);
  if (!full.escapeCloses) problems.push("Escape does not close full screen");
  if (STRICT && (card.status === "Fallback demo" || full.fallback)) problems.push("showed a stand-in, not the component");
  results.push({ id: next, kind: card.registry ? "registry" : "original", card, full, problems });
  console.log(`${String(index + 1).padStart(3)} ${problems.length ? "FAIL" : "ok  "} ${next.padEnd(42)} card ${card.ms ?? "—"}ms (slot ${card.slotMs ?? "—"}ms) · full ${full.ms ?? "—"}ms${problems.length ? ` · ${problems.join("; ")}` : ""}`);
}

await browser.close();

const failing = results.filter((result) => result.problems.length);
const spread = (values) => {
  const sorted = values.filter((value) => value !== null).sort((a, b) => a - b);
  const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0;
  return { p50: at(0.5), p90: at(0.9), max: sorted.at(-1) ?? 0 };
};
const summary = {
  viewport: `${WIDTH}x${HEIGHT}`, strict: STRICT, shard: `${SHARD}/${SHARDS}`,
  libraryTotal: total, reached: done.size, checked: results.length, failing: failing.length,
  cardMs: { originals: spread(results.filter((r) => r.kind === "original").map((r) => r.card.ms)), registry: spread(results.filter((r) => r.kind === "registry").map((r) => r.card.ms)) },
  fullScreenMs: { originals: spread(results.filter((r) => r.kind === "original").map((r) => r.full.ms)), registry: spread(results.filter((r) => r.kind === "registry").map((r) => r.full.ms)) },
  standIns: results.filter((r) => r.card.status === "Fallback demo" || r.full.fallback).length,
  pageErrors: [...new Set(pageErrors)].slice(0, 20),
};
writeFileSync(`${OUT}/report${SHARDS > 1 ? `-${SHARD}` : ""}.json`, JSON.stringify({ summary, results }, null, 2));
console.log(`\n${JSON.stringify(summary, null, 2)}`);
// Reaching fewer elements than the library holds means the walk itself missed some,
// which would make every other number here quietly incomplete.
if (!process.env.FILTER && done.size < total) console.log(`FAIL: reached ${done.size} of ${total} elements`);
if (failing.length || (!process.env.FILTER && done.size < total)) process.exitCode = 1;
