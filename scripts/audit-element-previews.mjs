import { readFile } from "node:fs/promises";

const base = process.env.DP_PREVIEW_BASE ?? "http://localhost:3000";
const index = JSON.parse(await readFile(new URL("../data/registry-snapshot.json", import.meta.url), "utf-8"));
const elements = index.elements;
const concurrency = Number(process.env.DP_PREVIEW_AUDIT_CONCURRENCY ?? 6);
let cursor = 0;
let completed = 0;
const failures = [];
let generated = 0;

const concreteName = (element) => element.source === "react-bits" && element.variant
  ? `${element.name}-${element.variant.language}-${element.variant.styling}`
  : element.name;

async function worker() {
  while (cursor < elements.length) {
    const element = elements[cursor++];
    const url = new URL("/api/element-preview", base);
    url.searchParams.set("source", element.source);
    url.searchParams.set("name", concreteName(element));
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
      const html = await response.text();
      if (html.includes('data-generated="true"')) generated += 1;
      if (!response.ok || html.includes("Preview unavailable")) {
        const reason = html.match(/<span hidden>([\s\S]*?)<\/span>/)?.[1] ?? `HTTP ${response.status}`;
        failures.push({ id: element.id, reason: reason.replace(/&quot;/g, '"').replace(/&amp;/g, "&").slice(0, 500) });
      }
    } catch (error) {
      failures.push({ id: element.id, reason: error instanceof Error ? error.message : String(error) });
    }
    completed += 1;
    if (completed % 25 === 0 || completed === elements.length) {
      console.log(`${completed}/${elements.length} checked · ${failures.length} errors · ${generated} generated helper demos`);
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log(`All ${elements.length} registry elements produced renderable preview documents (${generated} helper or unavailable-source demos).`);
}
