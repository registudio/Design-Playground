import { chromium } from "playwright";
import { unzipSync } from "fflate";
import { readFileSync, writeFileSync } from "node:fs";

const OUT = "/tmp/claude-0/-home-user-Design-Playground/015a25f4-7ad4-5ff5-94b9-0786cddc46ca/scratchpad";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.goto("http://localhost:3311/", { waitUntil: "networkidle" });

const nameInput = page.getByPlaceholder("Project name");
await nameInput.click();
await nameInput.pressSequentially("Acme");
await page.waitForFunction(
  () => !document.querySelector("button[type=submit]")?.hasAttribute("disabled"),
  null, { timeout: 15000 });
await page.getByRole("button", { name: "New project" }).click();
await page.waitForSelector("iframe[title='Live preview']");

// Upload a real SVG logo so extraction runs on the export path too.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#1d4ed8"/>
  <circle cx="50" cy="50" r="28" fill="#06b6d4"/>
  <path d="M20 80 L50 30 L80 80 Z" fill="#0f172a"/>
</svg>`;
writeFileSync(`${OUT}/logo.svg`, svg);
await page.setInputFiles("input[type=file][accept*='svg']", `${OUT}/logo.svg`);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/07-logo-extracted.png` });

// Export and capture the ZIP.
await page.getByRole("button", { name: "Export" }).click();
const download = await Promise.all([
  page.waitForEvent("download"),
  page.getByRole("button", { name: "Download ZIP" }).click(),
]).then(([d]) => d);

const path = `${OUT}/export.zip`;
await download.saveAs(path);
const entries = unzipSync(new Uint8Array(readFileSync(path)));
console.log("=== EXPORT CONTENTS ===");
for (const name of Object.keys(entries).sort()) {
  console.log(` ${name}  (${entries[name].length} bytes)`);
}

const dec = new TextDecoder();
const tokens = JSON.parse(dec.decode(entries["design/design.tokens.json"]));
const recipe = JSON.parse(dec.decode(entries["design/site.recipe.json"]));
const manifest = JSON.parse(dec.decode(entries["design/asset-manifest.json"]));
const css = dec.decode(entries["design/globals.css"]);

console.log("\n=== TOKENS ===");
console.log("schema:", tokens.schema);
console.log("scales:", Object.keys(tokens.colors.scales).join(", "));
console.log("semantic tokens:", Object.keys(tokens.colors.light.semantic).length);
console.log("dark theme:", !!tokens.colors.dark);
console.log("primary:", JSON.stringify(tokens.colors.light.semantic.primary));
console.log("type steps:", Object.keys(tokens.typography.scale).length);

console.log("\n=== RECIPE ===");
console.log("schema:", recipe.schema);
console.log("components:", JSON.stringify(recipe.components));
console.log("motion profile:", recipe.motion.profile);

console.log("\n=== MANIFEST ===");
console.log("root:", manifest.root);
console.log("logo:", JSON.stringify(manifest.logo));
console.log("images:", manifest.images.map((i) => `${i.file} ${i.mime} ${i.hash.slice(0,12)}…`).join(", "));

console.log("\n=== GLOBALS.CSS (first 24 lines) ===");
console.log(css.split("\n").slice(0, 24).join("\n"));
console.log(`... ${css.split("\n").length} lines total`);

await browser.close();
