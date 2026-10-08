import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Writes data/element-evidence.json: what the score (src/elements/score.ts) can only
 * learn by running or reading an element.
 *
 *   node scripts/score-evidence.mjs \
 *     --originals artifacts/originals/report.json \
 *     --renders path/to/renders.json \
 *     --items magicui=/path/to/magicui/public/r --items 21st=/path/to/21st-items …
 *
 * --originals  audit-originals.mjs's report: an original is "ready" when its card
 *              painted without throwing, "blank" when it did not paint, "failed" when it threw.
 * --renders    registry preview outcomes, either audit-element-renders.mjs's report
 *              ({ results: [{ id, status }] }) or a map of id to { status }.
 * --items      where a source's published item documents are (`<name>.json`, or
 *              `<author>/<name>.json` for 21st.dev); each entry's files are read for its
 *              accessibility signals. Repeatable; sources without one score on midpoints.
 *
 * Evidence already in the file is kept unless a new run measures the same entry, so a
 * partial run (one source re-rendered) updates only what it measured.
 */
// The same signals as signalsIn() in src/elements/score.ts; a test holds the two together.
export const SIGNALS = [
  /\baria-[a-z]+|\brole\s*=/,
  /onKeyDown|onKeyUp|onkeydown|keydown|tabIndex|tabindex|:focus-visible|focus-visible:/,
  /prefers-reduced-motion|useReducedMotion|reducedMotion|motion-reduce:/,
  /<(?:button|a|nav|section|article|header|footer|figure|dialog|form|input|label|select|textarea|ul|ol|li|table|details)[\s>]/,
];
export const signalDigits = (source) => SIGNALS.map((pattern) => (pattern.test(source) ? "1" : "0")).join("");

function main() {
  const args = process.argv.slice(2);
  const values = (flag) => args.flatMap((arg, index) => (arg === flag ? [args[index + 1]] : []));
  const OUT = new URL("../data/element-evidence.json", import.meta.url);
  const snapshot = JSON.parse(readFileSync(new URL("../data/registry-snapshot.json", import.meta.url), "utf8"));
  const previous = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")).elements ?? {} : {};
  const evidence = { ...previous };
  const set = (id, patch) => { evidence[id] = { ...evidence[id], ...patch }; };

  for (const report of values("--originals")) {
    const { results } = JSON.parse(readFileSync(report, "utf8"));
    for (const result of results.filter((entry) => entry.motion === "no-preference")) {
      set(result.id, { p: result.errors.length ? "failed" : result.painted ? "ready" : "blank" });
    }
  }

  for (const report of values("--renders")) {
    const data = JSON.parse(readFileSync(report, "utf8"));
    const entries = Array.isArray(data.results) ? data.results.map((entry) => [entry.id, entry]) : Object.entries(data);
    for (const [id, entry] of entries) {
      if (["ready", "fallback", "blank", "failed"].includes(entry.status)) set(id, { p: entry.status });
    }
  }

  for (const spec of values("--items")) {
    const [source, dir] = spec.split("=");
    let read = 0;
    for (const element of snapshot.elements.filter((entry) => entry.source === source)) {
      // React Bits is indexed by base name and published per variant; read the one shown.
      const file = [`${element.name}.json`, `${element.name}-TS-TW.json`].map((name) => join(dir, name)).find(existsSync);
      if (!file) continue;
      const item = JSON.parse(readFileSync(file, "utf8"));
      set(element.id, { s: signalDigits((item.files ?? []).map((f) => f.content ?? "").join("\n")) });
      read++;
    }
    console.log(`${source}: signals for ${read}`);
  }

  const sorted = Object.fromEntries(Object.entries(evidence).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(OUT, `${JSON.stringify({ generated: new Date().toISOString().slice(0, 10), elements: sorted }, null, 0).replace(/\},"/g, '},\n"')}\n`);
  console.log(`${Object.keys(sorted).length} entries with evidence`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
