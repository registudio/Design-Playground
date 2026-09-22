import { chromium } from "playwright";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * An uploaded logo must never collide with the navigation.
 *
 * The centred and split navbars used to take their middle item out of flow with
 * absolute positioning, so nothing reserved room for it: a wide logo landed on top of
 * the links, and the links ran underneath it. This uploads a deliberately wide logo and
 * checks, for both layouts on desktop, tablet and mobile, that the brand, the links and
 * the call to action never overlap — and that the split layout keeps its logo centred.
 *
 *   npm run dev   (PORT=3100)
 *   node scripts/e2e-navbar-logo.mjs
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const OUT = process.env.E2E_OUTPUT_DIR ?? "./e2e-output";
mkdirSync(OUT, { recursive: true });
const logo = path.join(mkdtempSync(path.join(tmpdir(), "dp-logo-")), "wide-logo.svg");
writeFileSync(logo, '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="140" viewBox="0 0 480 140"><text x="10" y="105" font-family="Arial Black, sans-serif" font-size="110" fill="#e8621c">Projet</text></svg>');

let fail = 0;
const ok = (label, cond) => { console.log(cond ? `PASS: ${label}` : `FAIL: ${label}`); if (!cond) fail++; };
const browser = await chromium.launch({ ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));

await page.goto(BASE, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "+ New project" }).click();
const name = page.getByPlaceholder("Project name"); await name.click(); await name.pressSequentially("Logo check");
await page.waitForFunction(() => !document.querySelector("button[type=submit]")?.hasAttribute("disabled"), null, { timeout: 15000 });
await page.getByRole("button", { name: "New project", exact: true }).click();
await page.waitForTimeout(1200);
await page.locator("input[type=file]").first().setInputFiles(logo);
await page.waitForTimeout(2500);

// Tuition Centre uses the split navbar, Beauty & Wellness the centred one.
for (const [template, variant] of [["Tuition Centre", "split"], ["Beauty & Wellness", "centered"]]) {
  await page.locator(".sidebar-link", { hasText: "Templates" }).click();
  await page.waitForTimeout(700);
  await page.locator(".template-card", { hasText: template }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Visualise →" }).first().click();
  await page.waitForTimeout(3000);
  for (const device of ["Desktop", "Tablet", "Mobile"]) {
    await page.getByRole("button", { name: device, exact: true }).click();
    await page.waitForTimeout(1500);
    const frame = page.frames().find((f) => f.url().includes("/preview"));
    const r = await frame.evaluate(() => {
      const box = (el) => el?.getBoundingClientRect();
      const nav = document.querySelector(".dp-navbar");
      const list = document.querySelector(".dp-navbar-links");
      const brand = box(document.querySelector(".dp-navbar-brand"));
      const cta = box(nav.querySelector(".dp-btn"));
      // Links wrapped onto the clipped second line are hidden, not colliding.
      const links = [...nav.querySelectorAll(".dp-navbar-links a")].map(box).filter((l) => l.width > 0 && l.top < box(list).bottom);
      const hit = (a, b) => a && b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      return {
        variant: nav.className, hasLogo: !!document.querySelector(".dp-navbar-logo"),
        brandOverLink: links.some((l) => hit(l, brand)), brandOverCta: hit(brand, cta), linkOverCta: links.some((l) => hit(l, cta)),
        offCentre: Math.abs((brand.left + brand.right) / 2 - box(nav).width / 2), wide: innerWidth > 620,
      };
    });
    const where = `${variant} navbar, ${device}`;
    ok(`${where}: the logo is the uploaded image`, r.hasLogo && r.variant.includes(variant));
    ok(`${where}: logo and links never overlap`, !r.brandOverLink);
    ok(`${where}: nothing overlaps the call to action`, !r.brandOverCta && !r.linkOverCta);
    if (variant === "split" && r.wide) ok(`${where}: the logo stays centred (${Math.round(r.offCentre)}px off)`, r.offCentre < 2);
    const frameBox = await page.locator(".studio-main iframe").first().boundingBox();
    await page.screenshot({ path: `${OUT}/navbar-${variant}-${device}.png`, clip: { x: frameBox.x, y: frameBox.y, width: frameBox.width, height: 200 } });
  }
  await page.getByRole("button", { name: "Desktop", exact: true }).click();
  await page.getByRole("button", { name: /Back to editing/ }).click();
  await page.waitForTimeout(600);
}
ok(`no page errors (${errors.length})`, errors.length === 0);
await browser.close();
console.log(fail ? `${fail} FAILED` : "ALL PASSED");
process.exitCode = fail ? 1 : 0;
