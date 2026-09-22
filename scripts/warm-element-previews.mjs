// Run against the development server or deployment before directing users to it.
import { readFile } from "node:fs/promises";
const base = process.env.DP_PREVIEW_BASE ?? "http://localhost:3000";
const snapshot = JSON.parse(await readFile(new URL("../data/registry-snapshot.json", import.meta.url), "utf8"));
// Curated initial shortlist; replace with measured popular IDs when usage data exists.
const names = new Set(["BlurText", "CircularText", "CountUp", "DecryptedText", "Aurora", "SpotlightCard", "dynamic-text", "dual-wipe-reveal"]);
const queue = snapshot.elements.filter(e => names.has(e.name));
let failures = 0;
await Promise.all(Array.from({length: 3}, async () => {
  for (let item; (item = queue.shift());) {
    const name = item.source === "react-bits" && item.variant ? `${item.name}-${item.variant.language}-${item.variant.styling}` : item.name;
    try {
      const response = await fetch(`${base}/api/element-preview?source=${encodeURIComponent(item.source)}&name=${encodeURIComponent(name)}`, {signal: AbortSignal.timeout(60000)});
      const html = await response.text();
      if (!response.ok || html.includes('data-generated="true"')) throw new Error("Source preview unavailable");
      console.log(`Warmed ${item.id}`);
    } catch (error) { failures++; console.error(`${item.id}: ${error.message}`); }
  }
}));
process.exitCode = failures ? 1 : 0;
