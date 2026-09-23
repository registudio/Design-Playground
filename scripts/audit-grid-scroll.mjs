import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

/**
 * Scrolls the whole element library the way a person does and checks that every card
 * shows something once it has been scrolled to.
 *
 * audit-element-renders.mjs opens each preview on its own, which proves a document can
 * render but says nothing about the grid: dozens of cards competing for a small number
 * of live slots, cards leaving the screen mid-compile, cards arriving faster than slots
 * free up. Those are where "it never showed anything" came from, and they only exist in
 * the grid.
 *
 * For each card that comes at least half into view it records when it was first seen
 * and when it first showed a visual — a revealed registry preview, or an authored demo
 * whose document has loaded. A card counts as a miss if it was on screen for a full
 * dwell and never got there.
 *
 *   node scripts/mock-registry.mjs 4599 --any
 *   DP_REGISTRY_BASE=http://127.0.0.1:4599 npm run dev
 *   node scripts/audit-grid-scroll.mjs
 *
 * A card that paints nothing is held on "Rendering…" for the document's blank grace
 * before its stand-in appears, so with a dwell shorter than that grace those cards count
 * as misses here even though they resolve a moment later. Read the miss list, not just
 * the count: "Queued" means the budget starved a visible card, which is the failure this
 * audit exists to catch; "Rendering…" means it was still waiting.
 *
 * DWELL_MS     time spent on each screenful (default 3500)
 * FLING_PAGES  after the steady pass, jump this many screens at once and dwell again
 */
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3100";
const DWELL_MS = Number(process.env.DWELL_MS ?? 3500);
const FLING_PAGES = Number(process.env.FLING_PAGES ?? 8);
const OUT = process.env.E2E_OUTPUT_DIR ?? "./e2e-output";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}),
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

await page.goto(BASE_URL, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Explore", exact: true }).click();
await page.waitForFunction(() => Number.parseInt(document.querySelector(".gallery-meta span")?.textContent ?? "0", 10) > 400, null, { timeout: 60_000 });
const total = await page.evaluate(() => Number.parseInt(document.querySelector(".gallery-meta span")?.textContent ?? "0", 10));

/** Cards at least half inside the scroller, and whether each is showing a visual. */
async function sample() {
  const cards = await page.$$eval(".element-card", (nodes) => {
    const root = document.querySelector(".studio-main").getBoundingClientRect();
    return nodes.map((card, index) => {
      const box = card.querySelector(".element-canvas").getBoundingClientRect();
      const visible = Math.max(0, Math.min(box.bottom, root.bottom) - Math.max(box.top, root.top));
      // Titles repeat across registries ("Button"), so the source tag is part of the key.
      const title = `${card.querySelector("h3")?.textContent ?? `#${index}`} · ${card.querySelector(".canvas-tag")?.textContent ?? ""}`;
      const registry = !!card.querySelector(".registry-canvas");
      const status = card.querySelector(".preview-status")?.textContent?.replace("Retry", "").trim() ?? "";
      const shown = registry ? !card.querySelector(".registry-placeholder") : !!card.querySelector("iframe");
      return { index, title, registry, status, shown, onScreen: visible >= box.height / 2 };
    });
  });
  // An authored demo's frame exists immediately; it counts once its document has loaded.
  const frames = await page.$$(".element-card .element-canvas > iframe");
  const loaded = new Set();
  for (const handle of frames) {
    const frame = await handle.contentFrame().catch(() => null);
    if (!frame) continue;
    const ok = await frame.evaluate(() => document.readyState === "complete" && !!document.body?.firstElementChild).catch(() => false);
    if (ok) loaded.add(await handle.evaluate((n) => { const card = n.closest(".element-card"); return `${card.querySelector("h3")?.textContent} · ${card.querySelector(".canvas-tag")?.textContent ?? ""}`; }));
  }
  return cards.map((card) => ({ ...card, shown: card.registry ? card.shown : loaded.has(card.title) }));
}

const seen = new Map();
async function dwell(label) {
  const until = Date.now() + DWELL_MS;
  while (Date.now() < until) {
    const now = Date.now();
    for (const card of await sample()) {
      if (!card.onScreen) continue;
      const entry = seen.get(card.title) ?? { title: card.title, registry: card.registry, firstSeen: now, firstShown: null, lastStatus: "", pass: label, onScreenMs: 0 };
      entry.lastStatus = card.status;
      entry.onScreenMs = now - entry.firstSeen;
      if (card.shown && entry.firstShown === null) entry.firstShown = now;
      seen.set(card.title, entry);
    }
    await page.waitForTimeout(250);
  }
}

const scroller = page.locator(".studio-main");
const height = await scroller.evaluate((node) => node.clientHeight);

// Steady pass: a screenful at a time, top to bottom.
for (let guard = 0; guard < 400; guard += 1) {
  await dwell("steady");
  const atEnd = await scroller.evaluate((node) => node.scrollTop + node.clientHeight >= node.scrollHeight - 4);
  if (atEnd) break;
  await scroller.evaluate((node, by) => node.scrollBy({ top: by }), Math.round(height * 0.85));
  await page.waitForTimeout(120);
}

// Fling pass: the case a steady pass cannot show — many screens skipped in one go, which
// strands slots on cards that are no longer anywhere near the viewport.
const results = [...seen.values()];
await scroller.evaluate((node) => node.scrollTo({ top: 0 }));
await page.waitForTimeout(1500);
for (let jump = 0; jump < 6; jump += 1) {
  seen.clear();
  for (let step = 0; step < FLING_PAGES; step += 1) {
    await scroller.evaluate((node, by) => node.scrollBy({ top: by }), height);
    await page.waitForTimeout(60);
  }
  await dwell(`fling-${jump}`);
  results.push(...seen.values());
}

await page.screenshot({ path: `${OUT}/grid-scroll-final.png` });
await browser.close();

const all = results.filter((entry) => entry.onScreenMs >= DWELL_MS - 600);
const misses = all.filter((entry) => entry.firstShown === null);
const delays = all.filter((entry) => entry.firstShown !== null).map((entry) => entry.firstShown - entry.firstSeen).sort((a, b) => a - b);
const pct = (q) => delays[Math.min(delays.length - 1, Math.floor(delays.length * q))] ?? 0;
const byStatus = {};
for (const miss of misses) byStatus[miss.lastStatus || "(no status)"] = (byStatus[miss.lastStatus || "(no status)"] ?? 0) + 1;

const report = {
  total, dwellMs: DWELL_MS, cardsObserved: all.length, visualised: all.length - misses.length, misses: misses.length,
  timeToVisualMs: { p50: pct(0.5), p90: pct(0.9), max: delays.at(-1) ?? 0 },
  missesByStatus: byStatus,
  missExamples: misses.slice(0, 25).map((m) => `${m.pass} · ${m.registry ? "registry" : "authored"} · ${m.title} · ${m.lastStatus}`),
  pageErrors: errors.slice(0, 10),
};
writeFileSync(`${OUT}/grid-scroll-report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (misses.length) process.exitCode = 1;
