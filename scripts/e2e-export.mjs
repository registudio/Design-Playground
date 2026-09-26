import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { unzipSync } from "fflate";
import { addElement, createProject, launch, OUT, tally } from "./lib/studio.mjs";

/**
 * The export, end to end in a real browser — the path vitest cannot reach: a real logo
 * upload running colour extraction, a real download, and a ZIP whose documents are
 * valid and whose effect files actually run once unpacked.
 *
 * "Run once unpacked" is checked by opening them from file://, the way a developer
 * receiving the ZIP would. Engine runtimes ship once in elements/engines/ and are
 * loaded by relative path; the review page's sandboxed frames cannot load file:// at
 * all and get theirs from the page — both are checked to draw.
 */
const { ok, finish } = tally();
const { browser, context, page, pageErrors } = await launch({ width: 1600, height: 1000 });

await createProject(page, "Acme");

// Upload a real SVG logo on the Brand assets step, so extraction runs on the export path.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#1d4ed8"/>
  <circle cx="50" cy="50" r="28" fill="#06b6d4"/>
  <path d="M20 80 L50 30 L80 80 Z" fill="#0f172a"/>
</svg>`;
writeFileSync(`${OUT}/logo.svg`, svg);
await page.locator("input[type=file]").first().setInputFiles(`${OUT}/logo.svg`);
await page.waitForTimeout(1500);
ok("the logo upload is accepted", await page.getByText("logo.svg").first().isVisible());

// Two Vanta effects, to prove Three.js ships once for both.
await addElement(page, "vanta-net", "vanta constellation");
await addElement(page, "vanta-fog", "vanta fog");

await page.getByRole("button", { name: /^Visualise/ }).first().click();
await page.waitForSelector("iframe[title='Live preview']", { timeout: 20000 });

const download = async (scope) => {
  await page.getByRole("button", { name: /Export project/ }).click();
  await page.getByRole("radio", { name: scope === "elements" ? "Elements only" : "Everything" }).click();
  const [file] = await Promise.all([
    page.waitForEvent("download", { timeout: 60000 }),
    page.getByRole("button", { name: scope === "elements" ? "Download elements ZIP" : "Download ZIP" }).click(),
  ]);
  const path = `${OUT}/export-${scope}.zip`;
  await file.saveAs(path);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  return unzipSync(new Uint8Array(readFileSync(path)));
};

// --- Everything ------------------------------------------------------------------
const entries = await download("everything");
console.log("=== EXPORT CONTENTS ===");
for (const name of Object.keys(entries).sort()) console.log(` ${name}  (${entries[name].length} bytes)`);

const dec = new TextDecoder();
for (const path of ["design/design.tokens.json", "design/site.recipe.json", "design/asset-manifest.json", "design/globals.css", "preview.html"]) {
  ok(`the ZIP contains ${path}`, !!entries[path] && entries[path].length > 0);
}
const tokens = JSON.parse(dec.decode(entries["design/design.tokens.json"]));
const recipe = JSON.parse(dec.decode(entries["design/site.recipe.json"]));
const manifest = JSON.parse(dec.decode(entries["design/asset-manifest.json"]));
const css = dec.decode(entries["design/globals.css"]);
ok("design.tokens.json has a colour scale", Object.keys(tokens.colors?.scales ?? {}).length > 0);
ok("design.tokens.json has semantic light tokens", Object.keys(tokens.colors?.light?.semantic ?? {}).length > 0);
ok("design.tokens.json has a typography scale", Object.keys(tokens.typography?.scale ?? {}).length > 0);
ok("site.recipe.json has component choices", Object.keys(recipe.components ?? {}).length > 0);
ok("site.recipe.json has a motion profile", typeof recipe.motion?.profile === "string" && recipe.motion.profile.length > 0);
ok("site.recipe.json records the chosen elements", ["vanta-net", "vanta-fog"].every((id) => recipe.elements?.some((e) => e.id === id)));
ok("asset-manifest.json records the uploaded logo", !!manifest.logo?.primary);
ok("…and the logo file itself ships", Object.keys(entries).some((name) => name.startsWith("design/assets/") && name.endsWith(".svg")));
ok("globals.css is non-trivial", css.split("\n").length > 10);

const engines = Object.keys(entries).filter((name) => name.startsWith("elements/engines/")).sort();
ok("each engine bundle ships once", JSON.stringify(engines) === JSON.stringify(["elements/engines/vanta-fog.js", "elements/engines/vanta-net.js", "elements/engines/vanta-three.js"]), engines.join(", "));
ok("no element file embeds a runtime", ["elements/vanta-net.html", "elements/vanta-fog.html"].every((name) => !dec.decode(entries[name]).includes("data:text/javascript")));
ok("engine licences ship with them", !!entries["elements/ENGINE-LICENSES.txt"]);

// --- Unpacked, from file:// --------------------------------------------------------
const folder = resolve(OUT, "export-unpacked");
rmSync(folder, { recursive: true, force: true });
for (const [name, bytes] of Object.entries(entries)) {
  mkdirSync(dirname(join(folder, name)), { recursive: true });
  writeFileSync(join(folder, name), bytes);
}
const probe = await context.newPage();
const loadErrors = [];
probe.on("requestfailed", (r) => loadErrors.push(r.url()));
probe.on("console", (m) => { if (m.type() === "error") loadErrors.push(m.text()); });
const drew = () => ({ canvas: document.querySelectorAll("canvas").length, three: !!window.DP_THREE });
await probe.goto(`file://${join(folder, "elements/vanta-net.html")}`);
await probe.waitForTimeout(2500);
ok("an unpacked effect loads its shared runtime from file://", (await probe.evaluate(drew)).three);
await probe.goto(`file://${join(folder, "preview.html")}`);
await probe.waitForTimeout(3500);
const frames = await Promise.all(probe.frames().slice(1).map((f) => f.evaluate(drew).catch(() => null)));
ok("the unpacked review page's frames get their runtime too", frames.filter((f) => f?.three).length >= 2, JSON.stringify(frames));
ok("nothing failed to load from the unpacked folder", loadErrors.length === 0, loadErrors.slice(0, 3).join(" | "));

// --- Elements only ------------------------------------------------------------------
const only = await download("elements");
const names = Object.keys(only).sort();
ok("elements-only ships the effects, their README and runtimes", ["elements/README.md", "elements/vanta-net.html", "elements/engines/vanta-three.js"].every((n) => names.includes(n)), names.join(", "));
ok("…and none of the design documents", !names.some((n) => n.startsWith("design/")) && !names.includes("preview.html"));
ok("its README says where the runtimes are", dec.decode(only["elements/README.md"]).includes("engines/"));

ok(`no page errors (${pageErrors.length})`, pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
await finish(browser);
