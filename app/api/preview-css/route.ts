import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Serves the preview surface's component stylesheet as plain text (§Wave D
 * Templating/Features — shareable static export).
 *
 * The static Sample Page export needs this file's raw text to inline into a
 * standalone HTML document. Reading it from disk here — the single source that also
 * drives the live preview iframe — means the exported page can never drift from what
 * the playground actually shows.
 */
export async function GET() {
  const filePath = path.join(process.cwd(), "app/preview/preview.css");
  const css = await readFile(filePath, "utf-8");
  return new Response(css, {
    headers: { "Content-Type": "text/css; charset=utf-8", "Cache-Control": "no-store" },
  });
}
