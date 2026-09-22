import type { ExportFile } from "./bundle";
import { ENGINE_SOURCES } from "@/elements/extended-catalogue";

/** Embed local engine bundles so downloaded HTML does not depend on a running server. */
export async function embedEngineAssets(files: ExportFile[]): Promise<void> {
  const used = ENGINE_SOURCES.filter(engine => files.some(f => typeof f.content === "string" && f.content.includes(`/engine-demos/${engine.id}.js`)));
  await Promise.all(used.map(async engine => {
    const path = `/engine-demos/${engine.id}.js`;
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Could not include ${engine.label} in the export.`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const data = `data:text/javascript;base64,${btoa(Array.from(bytes, b => String.fromCharCode(b)).join(""))}`;
    for (const file of files) if (typeof file.content === "string") file.content = file.content.replaceAll(path, data);
  }));
  if (used.length) {
    const response = await fetch('/engine-demos/LICENSES.txt');
    if (!response.ok) throw new Error('Could not include engine licenses.');
    files.push({ path: 'elements/ENGINE-LICENSES.txt', content: await response.text() });
  }
}
