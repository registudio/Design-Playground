import { chromium } from "playwright";

/**
 * Real-browser check that every preview card reaches an honest, terminal state.
 *
 * The gallery had four distinct failures that all looked like "it doesn't render": a
 * card reading Ready over a blank rectangle, a card stuck on its placeholder forever,
 * a Retry that appeared to do nothing, and an expand affordance present on some cards
 * and missing on others. None of them are reproducible against the live registries —
 * third-party hosts cannot be made to hang or to publish a component that paints
 * nothing on demand — so this runs against a fixture registry that produces each shape
 * deliberately:
 *
 *   node scripts/mock-registry.mjs 4599
 *   node scripts/fixture-preview-index.mjs /tmp/preview-index.json
 *   DP_REGISTRY_BASE=http://127.0.0.1:4599 DP_REGISTRY_SNAPSHOT=/tmp/preview-index.json npm run dev
 *   node scripts/e2e-preview-states.mjs
 */
const OUT = process.env.E2E_OUTPUT_DIR ?? "./e2e-output";
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
let fail=0; const ok=(l,c)=>{console.log(c?`PASS: ${l}`:`FAIL: ${l}`); if(!c)fail++;};
const browser=await chromium.launch({...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {})});
const page=await browser.newPage({viewport:{width:1500,height:950}});
const errs=[]; page.on("pageerror",e=>errs.push(e.message));
await page.goto(BASE,{waitUntil:"networkidle"});
await page.getByRole("button",{name:"+ New project"}).click();
const n=page.getByPlaceholder("Project name"); await n.click(); await n.pressSequentially("Render QA");
await page.waitForFunction(()=>!document.querySelector("button[type=submit]")?.hasAttribute("disabled"),null,{timeout:15000});
await page.getByRole("button",{name:"New project",exact:true}).click();
await page.waitForTimeout(1200);
await page.getByRole("button",{name:/Elements/}).first().click();
await page.waitForTimeout(2000);
// The authored originals lead the grid; narrow to the fixture registry source.
await page.getByRole("button",{name:/^Bklit/}).click();
await page.waitForTimeout(800);
/**
 * Each card is read while it is on screen.
 *
 * Previews start when they are scrolled to and are given up again a few seconds after
 * they leave, so scrolling the whole list and then reading every card at the end finds
 * the early ones correctly back at "Queued" — a property of the budget, not a failure.
 */
const read = card => card.evaluate(node => {
  const canvas = node.querySelector(".registry-canvas");
  const frame = canvas?.querySelector("iframe");
  const rect = frame?.getBoundingClientRect();
  return {
    title: node.querySelector("h3")?.textContent ?? "?",
    status: canvas?.querySelector(".preview-status")?.textContent?.replace("Retry","").trim() ?? "-",
    hasFrame: !!frame,
    frameVisible: !!rect && rect.width > 20 && rect.height > 20,
    hasRetry: !!canvas?.querySelector(".preview-status button"),
    reason: canvas?.querySelector(".preview-reason")?.textContent ?? "",
    hasExpand: !!canvas?.querySelector(".expand-demo"),
  };
});

const cards = [];
for (const card of await page.locator(".element-card").all()) {
  await card.scrollIntoViewIfNeeded();
  // Long enough for the blank grace and the hung-request timeout to resolve.
  const from = Date.now(), until = from + 24000;
  let seen = await read(card);
  // A stand-in is provisional: a component that paints after it appeared takes over, so
  // a card showing one is watched past the document's own late-paint window.
  const unsettled = () => seen.status === "Queued" || seen.status === "Rendering…"
    || (seen.status === "Fallback demo" && Date.now() - from < 14000);
  while (Date.now() < until && unsettled()) {
    await page.waitForTimeout(500);
    seen = await read(card);
  }
  cards.push(seen);
}

console.log(JSON.stringify(cards, null, 1));

const byTitle = Object.fromEntries(cards.map(c => [c.title, c]));
ok("a component that paints reports Ready", byTitle["Visible"]?.status === "Ready");
// Not "Ready" — nothing it drew is visible — but not an empty card either: the document
// lays the generated visual over it and says so.
ok("a component that paints nothing is not called Ready", byTitle["Zero Area"]?.status === "Fallback demo");
ok("every card ends showing a visual, never an empty frame", cards.every(c => c.frameVisible));
ok("a late-rendering component still reaches Ready", byTitle["Slow"]?.status === "Ready");
ok("one that paints before the grace is never called a fallback", byTitle["Later"]?.status === "Ready");
ok("one that paints after the stand-in appeared takes over and reports Ready", byTitle["Latest"]?.status === "Ready");
ok("an item with no component shows the fallback", byTitle["Helper"]?.status === "Fallback demo");
// A source that stops answering resolves to the generated fallback with a retry,
// rather than holding the placeholder indefinitely.
ok(`a hung request resolves to a terminal state (${byTitle["Never"]?.status})`, ["Fallback demo","Failed"].includes(byTitle["Never"]?.status ?? ""));
ok("nothing is left mid-render after the timeouts", !cards.some(c => c.status === "Rendering…" || c.status === "Queued"));
ok("every non-ready card offers a retry", cards.filter(c => c.status !== "Ready").every(c => c.hasRetry));
// Three very different failures put the same stand-in on a card. Without a reason on the
// card, "it isn't rendering" is unanswerable — by us or by the person reporting it.
ok("every card showing a stand-in says why", cards.filter(c => c.status === "Fallback demo").every(c => c.reason.length > 10));
ok("a component that throws reports what it threw", /threw while rendering/i.test(byTitle["Broken"]?.reason ?? ""));
ok("an item that never compiled says so", /could not be compiled|publishes no source|helper/i.test(byTitle["Helper"]?.reason ?? ""));
ok("one that mounted but drew nothing says that instead", /painted nothing/i.test(byTitle["Zero Area"]?.reason ?? ""));
console.log("  reasons:", cards.filter(c => c.reason).map(c => `${c.title}: ${c.reason}`).join("\n           "));
ok("every registry card can be expanded", cards.every(c => c.hasExpand));
await page.screenshot({path:`${OUT}/qa-01-grid.png`});

// Expand must actually open a full-size preview.
await page.locator(".element-card").first().hover();
await page.waitForTimeout(300);
await page.locator(".element-card .expand-demo").first().click();
await page.waitForTimeout(2500);
ok("expanding opens a dialog with a live preview", (await page.locator(".demo-dialog iframe").count()) === 1);
await page.screenshot({path:`${OUT}/qa-02-expanded.png`});
await page.keyboard.press("Escape");
await page.waitForTimeout(500);
ok("Escape closes the expanded preview", (await page.locator(".demo-dialog").count()) === 0);

// Retry must restart the work, not sit on the previous answer.
const failedCard = page.locator(".element-card").filter({ hasText: "Never" }).first();
await failedCard.locator(".preview-status button").click();
await page.waitForTimeout(1200);
const afterRetry = await failedCard.locator(".preview-status").textContent();
ok(`retry restarts the attempt (now "${afterRetry?.replace("Retry","").trim()}")`, /Rendering/.test(afterRetry ?? ""));

ok(`no page errors (${errs.length})`, errs.length===0);
if(errs.length) console.log(errs.slice(0,3));
await browser.close();
console.log(fail===0?"\nALL PASSED":`\n${fail} FAILED`);
process.exit(fail?1:0);
