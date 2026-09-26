import type { ExportFile } from "./bundle";
import { engineOfBundle } from "@/elements/extended-catalogue";

/**
 * How an export carries the engine runtimes its documents load.
 *
 * - `shared`: one copy of each bundle at `elements/engines/<bundle>.js`, which every
 *   document references by relative path. For the ZIP. Inlining instead put a full copy
 *   of the runtime in every file that used it — Vanta is ~550 KB, so a dozen WebGL
 *   picks shipped the same library a dozen times over, once more inside the review page
 *   for each frame of it.
 * - `inline`: each bundle becomes a base64 data URI inside the document itself. Only
 *   for the single-file review page download, where there is no folder to share from.
 *
 * Either way nothing is fetched from a server: a classic `<script src>` with a relative
 * path loads from `file://`.
 *
 * Except inside the review page's frames. They are sandboxed `srcdoc` documents with an
 * opaque origin, and Chromium refuses them any `file://` load ("Not allowed to load
 * local resource") — relative paths there worked over http and failed from a folder,
 * which is how the ZIP is opened. So in `shared` mode a page with such frames carries
 * each bundle once, as base64 in a single script, and that script fills each frame's
 * `srcdoc` with data URIs when the page loads. The file holds one copy per bundle; the
 * per-frame copies exist only in memory.
 */
export type EngineDelivery = "shared" | "inline";

export const ENGINE_DIR = "elements/engines";
const BUNDLE_PATH = /\/engine-demos\/([a-z0-9-]+)\.js/g;

/** `to` as seen from the folder `from` sits in. Both are paths from the export root. */
export function relativePath(from: string, to: string): string {
  const fromDir = from.split("/").slice(0, -1);
  const target = to.split("/");
  let common = 0;
  while (common < fromDir.length && common < target.length - 1 && fromDir[common] === target[common]) common++;
  return [...fromDir.slice(common).map(() => ".."), ...target.slice(common)].join("/");
}

export async function embedEngineAssets(files: ExportFile[], delivery: EngineDelivery = "shared"): Promise<void> {
  const documents = files.filter((f): f is ExportFile & { content: string } => typeof f.content === "string");
  const used = [...new Set(documents.flatMap(f => [...f.content.matchAll(BUNDLE_PATH)].map(match => match[1])))].sort();
  if (!used.length) return;

  const bundles = await Promise.all(used.map(async bundle => {
    const response = await fetch(`/engine-demos/${bundle}.js`);
    if (!response.ok) throw new Error(`Could not include ${engineOfBundle(bundle)?.label ?? bundle} in the export.`);
    return { bundle, source: await response.text() };
  }));

  // Frames first, before the plain replacement below rewrites their paths too.
  if (delivery === "shared") for (const file of documents) file.content = deferFrameEngines(file.content, bundles);

  for (const { bundle, source } of bundles) {
    const served = `/engine-demos/${bundle}.js`;
    const shipped = `${ENGINE_DIR}/${bundle}.js`;
    const inline = delivery === "inline" ? `data:text/javascript;base64,${base64(source)}` : "";
    for (const file of documents) {
      if (file.content.includes(served)) file.content = file.content.replaceAll(served, inline || relativePath(file.path, shipped));
    }
    if (delivery === "shared") files.push({ path: shipped, content: source });
  }

  const response = await fetch("/engine-demos/LICENSES.txt");
  if (!response.ok) throw new Error("Could not include engine licenses.");
  files.push({ path: "elements/ENGINE-LICENSES.txt", content: await response.text() });
  files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}

const FRAME = /<iframe\b([^>]*?)\ssrcdoc="([^"]*)"/gi;

/**
 * Moves each frame's `srcdoc` that loads an engine to `data-dp-srcdoc`, with its engine
 * paths as `dp-engine:<bundle>` tokens, and appends the script that resolves them.
 * A page without such frames comes back unchanged.
 */
function deferFrameEngines(html: string, bundles: { bundle: string; source: string }[]): string {
  const needed = new Set<string>();
  const rewritten = html.replace(FRAME, (tag, before: string, srcdoc: string) => {
    if (!srcdoc.includes("/engine-demos/")) return tag;
    const tokens = srcdoc.replace(BUNDLE_PATH, (_, bundle: string) => { needed.add(bundle); return `dp-engine:${bundle}`; });
    return `<iframe${before} data-dp-srcdoc="${tokens}"`;
  });
  if (!needed.size) return html;
  const table = Object.fromEntries(bundles.filter(b => needed.has(b.bundle)).map(b => [b.bundle, base64(b.source)]));
  // `</` cannot appear in base64, and JSON of it is inert inside a script element.
  const boot = `<script>(function(){var E=${JSON.stringify(table)};document.querySelectorAll('iframe[data-dp-srcdoc]').forEach(function(f){f.setAttribute('srcdoc',f.getAttribute('data-dp-srcdoc').replace(/dp-engine:([a-z0-9-]+)/g,function(m,n){return E[n]?'data:text/javascript;base64,'+E[n]:m}));f.removeAttribute('data-dp-srcdoc')})})()</script>`;
  return rewritten.includes("</body>") ? rewritten.replace(/<\/body>(?![\s\S]*<\/body>)/, `${boot}</body>`) : rewritten + boot;
}

function base64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
