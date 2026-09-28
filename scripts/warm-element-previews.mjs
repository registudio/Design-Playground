// Run against the development server or deployment before directing users to it.
//
// WARM=all compiles every registry item rather than the shortlist — what the nightly
// render-all run does first, so it measures previews as a running deployment serves
// them (from the disk cache) rather than the one-off cold compile each gets after a
// fresh build. CONCURRENCY sets how many compile at once (default 3).
import { readFile } from "node:fs/promises";
const base = process.env.DP_PREVIEW_BASE ?? "http://localhost:3000";
const snapshot = JSON.parse(await readFile(new URL("../data/registry-snapshot.json", import.meta.url), "utf8"));
// Curated initial shortlist; replace with measured popular IDs when usage data exists.
const names = new Set(["BlurText", "CircularText", "CountUp", "DecryptedText", "Aurora", "SpotlightCard", "dynamic-text", "dual-wipe-reveal"]);
const all = process.env.WARM === "all";
const queue = snapshot.elements.filter(e => all || names.has(e.name));
let failures = 0;
await Promise.all(Array.from({length: Number(process.env.CONCURRENCY ?? 3)}, async () => {
  for (let item; (item = queue.shift());) {
    const name = item.source === "react-bits" && item.variant ? `${item.name}-${item.variant.language}-${item.variant.styling}` : item.name;
    try {
      const response = await fetch(`${base}/api/element-preview?source=${encodeURIComponent(item.source)}&name=${encodeURIComponent(name)}`, {signal: AbortSignal.timeout(60000)});
      const html = await response.text();
      if (!response.ok || html.includes('data-generated="true"')) throw new Error("Source preview unavailable");
      if (!all) console.log(`Warmed ${item.id}`);
    } catch (error) { failures++; console.error(`${item.id}: ${error.message}`); }
  }
}));
if (all) console.log(`Warmed ${snapshot.elements.length - failures} of ${snapshot.elements.length}.`);
process.exitCode = failures ? 1 : 0;
