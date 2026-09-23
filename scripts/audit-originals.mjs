import { build } from "esbuild";
import { chromium } from "playwright";
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

/**
 * Renders every authored original in a real browser and reports the two failures a unit
 * test cannot see: a document that throws, and a document that paints nothing.
 *
 * audit-element-renders.mjs covers the registry previews; the originals had no
 * equivalent, which is how a chart that shadowed `window.top`, a shader whose root
 * selector had drifted, and a grid that clipped its own tiles would each have reached
 * the gallery looking merely quiet. Both are invisible to vitest, because the failure is
 * in the browser and the symptom is an empty rectangle.
 *
 * "Painted nothing" is decided against a control: the same document shell with an empty
 * body. A card whose screenshot matches that is blank, whatever its status says.
 *
 * Every element is checked twice, once with reduced motion. A decorative element is
 * allowed to stop moving there, but it is never allowed to disappear — that is the
 * setting most likely to leave a card empty, and the least likely to be looked at.
 *
 *   node scripts/audit-originals.mjs              all of them
 *   node scripts/audit-originals.mjs shader-      only ids containing "shader-"
 *
 * Movement is reported, not enforced: plenty of originals are correctly still until
 * they are interacted with. Read it when a card that should animate says moves: false.
 */
const filter = process.argv[2] ?? "";
const OUT = process.env.E2E_OUTPUT_DIR ?? "./artifacts/originals";
const CARD = { width: 360, height: 260 };
const EXPANDED = { width: 760, height: 520 };
mkdirSync(OUT, { recursive: true });

// The catalogue is TypeScript and this script is plain Node, so it is bundled through
// the esbuild already used to compile registry sources rather than adding a loader.
const bundle = await build({
  entryPoints: ["src/elements/catalogue.ts"],
  bundle: true, write: false, format: "esm", platform: "neutral",
  alias: { "@": "./src" },
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`;
const { ELEMENTS, elementDocument } = await import(moduleUrl);

const chosen = ELEMENTS.filter((element) => element.id.includes(filter));
if (!chosen.length) {
  console.error(`No originals match ${JSON.stringify(filter)}`);
  process.exit(1);
}

/** The document shell with nothing in it — anything that matches this painted nothing. */
const control = elementDocument(chosen[0].id)
  .replace(/<body>[\s\S]*<\/body>/, "<body></body>");

const documents = new Map(chosen.map((element) => [element.id, elementDocument(element.id)]));
documents.set("__control__", control);

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".txt": "text/plain" };
const server = createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url, "http://x").pathname);
  const element = path.match(/^\/element\/(.+)\.html$/)?.[1];
  if (element && documents.has(element)) {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(documents.get(element));
    return;
  }
  // Engine bundles are requested at their deployed absolute paths, so public/ is served
  // from the root exactly as Next serves it.
  const file = join("public", normalize(path).replace(/^(\.\.[/\\])+/, ""));
  if (existsSync(file) && statSync(file).isFile()) {
    response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(response);
    return;
  }
  response.writeHead(404).end("not found");
});
await new Promise((resolve) => server.listen(0, resolve));
const base = `http://127.0.0.1:${server.address().port}`;

// Software WebGL: headless Chromium has no GPU here, and without this every shader
// card would report `WebGL unavailable` and the audit would be measuring the fallback.
const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}),
});
const digest = (buffer) => createHash("sha1").update(buffer).digest("hex");

/** One render: its errors, whether it painted, and whether it was still moving. */
async function render(context, id, viewport, { screenshot } = {}) {
  const page = await context.newPage();
  await page.setViewportSize(viewport);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
  await page.goto(`${base}/element/${id}.html`, { waitUntil: "load" });
  // Long enough for an entrance to finish and an engine bundle to have started drawing.
  await page.waitForTimeout(1400);
  const first = await page.screenshot();
  await page.waitForTimeout(900);
  const second = await page.screenshot();
  if (screenshot) writeFileSync(screenshot, second);
  await page.close();
  return { errors, frames: [digest(first), digest(second)], moves: digest(first) !== digest(second) };
}

const results = [];
for (const motion of ["no-preference", "reduce"]) {
  const context = await browser.newContext({ reducedMotion: motion === "reduce" ? "reduce" : "no-preference" });
  const blank = new Set((await render(context, "__control__", CARD)).frames);
  for (const element of chosen) {
    const at = motion === "reduce" ? "reduced" : "card";
    const outcome = await render(context, element.id, CARD, { screenshot: `${OUT}/${element.id}.${at}.png` });
    const painted = !outcome.frames.some((frame) => blank.has(frame));
    results.push({ id: element.id, motion, painted, moves: outcome.moves, errors: outcome.errors });
    const verdict = outcome.errors.length ? "THREW" : painted ? (outcome.moves ? "moves" : "still") : "BLANK";
    console.log(`${motion === "reduce" ? "reduced" : "normal "} · ${element.id.padEnd(24)} ${verdict}`);
  }
  await context.close();
}

// A second pass at the size the inspect dialog uses: layouts that fit a card have been
// known to overflow or centre badly once given room.
const wide = await browser.newContext();
for (const element of chosen) {
  await render(wide, element.id, EXPANDED, { screenshot: `${OUT}/${element.id}.expanded.png` });
}
await wide.close();

await browser.close();
server.close();

const failures = results.filter((result) => result.errors.length || !result.painted);
writeFileSync(`${OUT}/report.json`, JSON.stringify({ checked: chosen.length, results }, null, 2));
console.log(`\n${chosen.length} originals · ${failures.length} failing`);
for (const failure of failures) {
  console.log(`  ${failure.id} (${failure.motion}): ${failure.painted ? "" : "painted nothing "}${failure.errors.join(" | ")}`);
}
if (failures.length) process.exitCode = 1;
