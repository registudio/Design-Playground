import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

/**
 * Drag-and-drop smoke test (§Wave G).
 *
 * Both asset upload targets are styled with the standard dashed-border "drop files
 * here" affordance but, until now, only wired a click-to-browse <input> — dragging a
 * file in did nothing. Real OS drag-and-drop can't be simulated directly, so this
 * builds a DataTransfer with real File objects inside the page context and dispatches
 * dragover/drop on the target, which is what the browser's own drop event carries.
 * See e2e-smoke.mjs for the portability conventions.
 */
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3100";
const OUT = process.env.E2E_OUTPUT_DIR ?? "./e2e-output";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const ok = (label, cond) => { console.log(cond ? `PASS: ${label}` : `FAIL: ${label}`); if (!cond) failures++; };

const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}),
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

await page.goto(BASE_URL, { waitUntil: "networkidle" });
await page.getByPlaceholder("Project name").fill("Dropzone Verify");
await page.getByRole("button", { name: "New project", exact: true }).click();
await page.waitForTimeout(700);

/**
 * Builds a File in the page context and drives a real drag sequence onto `locator`.
 *
 * Resolves to a fixed ElementHandle once rather than re-querying the text locator for
 * each event: the dropzone's own label deliberately swaps to "Drop to upload" partway
 * through this exact sequence (that's the feature being tested), so a locator bound to
 * the pre-drag text would stop resolving before the sequence finishes.
 */
async function dropFile(locator, { name, type, content }) {
  const element = await locator.elementHandle();
  const dataTransfer = await page.evaluateHandle(
    ({ name, type, content }) => {
      const dt = new DataTransfer();
      dt.items.add(new File([content], name, { type }));
      return dt;
    },
    { name, type, content },
  );
  await element.dispatchEvent("dragenter", { dataTransfer });
  await element.dispatchEvent("dragover", { dataTransfer });
  await element.dispatchEvent("drop", { dataTransfer });
}

const svgLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#1d4ed8"/></svg>`;

// --- Primary logo dropzone ---
const logoZone = page.getByText("Upload a logo (SVG, PNG, JPG, WebP)");
const hoverTransfer = await page.evaluateHandle(() => new DataTransfer());
await logoZone.dispatchEvent("dragenter", { dataTransfer: hoverTransfer });
await logoZone.dispatchEvent("dragover", { dataTransfer: hoverTransfer });
await page.waitForTimeout(150);
ok("Dragging over the logo zone shows the drop hint", await page.getByText("Drop to upload").isVisible());
// Leave without dropping, so state resets exactly as it would if the drag were cancelled.
await page.getByText("Drop to upload").dispatchEvent("dragleave", {
  dataTransfer: hoverTransfer,
  relatedTarget: await page.evaluateHandle(() => document.body),
});
await page.waitForTimeout(150);
ok("Leaving without dropping clears the drop hint", (await page.getByText("Drop to upload").count()) === 0);

await dropFile(logoZone, { name: "acme-logo.svg", type: "image/svg+xml", content: svgLogo });
await page.waitForTimeout(1200);
ok("Dropped logo file is accepted and analysed", await page.getByText("acme-logo.svg").isVisible());
ok("Drop hint clears after the drop completes", (await page.getByText("Drop to upload").count()) === 0);

// Reject a non-image drop on the same zone.
const textZone = page.getByText("acme-logo.svg");
await dropFile(textZone, { name: "notes.txt", type: "text/plain", content: "just some notes" });
await page.waitForTimeout(400);
ok("A rejected file type is reported, not silently accepted", await page.getByText(/isn't a supported image format/).isVisible());
ok("The rejected file did not replace the accepted logo", await page.getByText("acme-logo.svg").isVisible());

// --- Additional assets dropzone (multi-file) ---
const additionalZone = page.getByText("Add assets — second logo, gradients, photography…");
await dropFile(additionalZone, { name: "hero-photo.jpg", type: "image/jpeg", content: "not-a-real-jpeg-but-typed-correctly" });
await page.waitForTimeout(1200);
ok("Dropped file lands in the additional-assets library", await page.getByText("hero-photo.jpg").isVisible());

// --- Confirm-before-remove on an additional asset ---
const removeBtn = page.getByRole("button", { name: "Remove hero-photo.jpg", exact: true });
await removeBtn.click();
await page.waitForTimeout(200);
ok("One click on Remove only arms it", await page.getByText("hero-photo.jpg").isVisible());
await page.getByRole("button", { name: /Click again to remove hero-photo\.jpg/ }).click();
await page.waitForTimeout(500);
ok("Second click removes the asset", (await page.getByText("hero-photo.jpg").count()) === 0);

await page.screenshot({ path: `${OUT}/11-dropzone.png` });
ok(`No page errors (${errors.length})`, errors.length === 0);
if (errors.length) console.log(errors.join("\n"));

await browser.close();
console.log(`\n${failures === 0 ? "ALL PASSED" : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
