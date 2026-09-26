import { readFileSync, writeFileSync } from "node:fs";
import { unzipSync } from "fflate";
import { createProject, goStep, launch, OUT, tally, visualise } from "./lib/studio.mjs";

/**
 * A brand's own typeface, uploaded: refused when the file is not a font, not addable
 * without a licence, then shown in the specimen and the live preview, and shipped in
 * the export with an @font-face that points at the file.
 *
 * Uses Geist from inside the next package, so it is present wherever this runs. (Not
 * three's example pixel font, which looked ideal: Chromium's font sanitiser rejects it
 * as malformed, and the upload rightly refuses it.)
 */
const FONT = "node_modules/next/dist/next-devtools/server/font/geist-latin.woff2";
const FAMILY = "geist latin";
const FILE = "fonts/geist-latin-400.woff2";
const { ok, finish } = tally();
const { browser, page, pageErrors } = await launch({ width: 1600, height: 1000 });
await createProject(page, "Font Verify");
await goStep(page, "The basics");

const picker = page.getByLabel("Upload a font file");
writeFileSync(`${OUT}/not-a-font.ttf`, "this is not a font");
await picker.setInputFiles(`${OUT}/not-a-font.ttf`);
await page.getByLabel("Licence").fill("Test");
await page.getByRole("button", { name: "Add font" }).click();
await page.waitForTimeout(800);
ok("a file that is not a font is refused", /could not be read as a font/.test((await page.locator(".font-upload-error").textContent()) ?? ""));

await picker.setInputFiles(FONT);
await page.waitForTimeout(300);
ok("the family is guessed from the file name", (await page.getByLabel("Family name").inputValue()) === FAMILY);
await page.getByLabel("Licence").fill("");
ok("it cannot be added without a licence", await page.getByRole("button", { name: "Add font" }).isDisabled());
await page.getByLabel("Licence").fill("SIL OFL 1.1");
await page.getByRole("button", { name: "Add font" }).click();
await page.waitForTimeout(1500);
ok("the upload is listed with its licence", await page.locator(".font-upload-list").getByText("SIL OFL 1.1").isVisible());

// document.fonts.check() is true when no face matches at all, so look for it instead.
const registered = (family) => [...document.fonts].some((face) => face.family.replace(/"/g, "") === family && face.status === "loaded");
const specimen = await page.evaluate(({ family, check }) => ({
  loaded: new Function("family", `return (${check})(family)`)(family),
  family: getComputedStyle(document.querySelector(".bs-page") ?? document.body).getPropertyValue("--dp-font-display"),
}), { family: FAMILY, check: registered.toString() });
ok("the specimen uses the uploaded face", specimen.loaded && specimen.family.includes(FAMILY), JSON.stringify(specimen));

const frame = await visualise(page);
await page.waitForTimeout(1500);
const preview = await frame.evaluate(({ family, check }) => ({
  loaded: new Function("family", `return (${check})(family)`)(family),
  heading: getComputedStyle(document.querySelector(".dp-hero h1") ?? document.body).fontFamily,
}), { family: FAMILY, check: registered.toString() });
ok("the preview frame registers the face and headings use it", preview.loaded && preview.heading.includes(FAMILY), JSON.stringify(preview));
await page.screenshot({ path: `${OUT}/fonts-preview.png` });

await page.getByRole("button", { name: /Export project/ }).click();
const [download] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), page.getByRole("button", { name: "Download ZIP" }).click()]);
await download.saveAs(`${OUT}/fonts-export.zip`);
const entries = unzipSync(new Uint8Array(readFileSync(`${OUT}/fonts-export.zip`)));
const dec = new TextDecoder();
ok("the font file ships in the assets, byte for byte", entries[`design/assets/${FILE}`]?.length === readFileSync(FONT).length);
ok("globals.css declares it beside the assets", dec.decode(entries["design/globals.css"]).includes(`url("assets/${FILE}") format("woff2")`));
ok("the review page declares it from the ZIP's asset folder", dec.decode(entries["preview.html"]).includes(`url("design/assets/${FILE}")`));
const manifest = JSON.parse(dec.decode(entries["design/asset-manifest.json"]));
ok("the manifest records the face and its licence", manifest.fonts?.[0]?.family === FAMILY && manifest.fonts[0].license === "SIL OFL 1.1");

ok(`no page errors (${pageErrors.length})`, pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
await finish(browser);
