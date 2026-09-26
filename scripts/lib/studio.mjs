import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

/**
 * Shared set-up for the browser checks: a browser, a page, a pass/fail tally, and the
 * few steps through the studio shell that nearly every check starts with.
 *
 * The older suites each drove the shell their own way, which is how five of them broke
 * at once when the step wizard replaced the three-column layout — every one against a
 * different piece of the old UI. Going through here, the next change to the shell is one
 * edit, not five.
 */
export const BASE_URL = process.env.BASE_URL ?? "http://localhost:3100";
export const OUT = process.env.E2E_OUTPUT_DIR ?? "./e2e-output";
mkdirSync(OUT, { recursive: true });

export async function launch({ width = 1500, height = 950 } = {}) {
  const browser = await chromium.launch({
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}),
  });
  const context = await browser.newContext({ viewport: { width, height }, acceptDownloads: true });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  return { browser, context, page, pageErrors };
}

export function tally() {
  let failures = 0;
  const ok = (label, cond, detail = "") => {
    console.log(`${cond ? "PASS" : "FAIL"}: ${label}${!cond && detail ? ` (${detail})` : ""}`);
    if (!cond) failures++;
  };
  const finish = async (browser) => {
    await browser.close();
    console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
    process.exit(failures === 0 ? 0 : 1);
  };
  return { ok, finish };
}

/** From the launch screen to a new, open project on its first step. */
export async function createProject(page, name) {
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "+ New project" }).first().click();
  const input = page.getByPlaceholder("Project name");
  await input.click();
  await input.pressSequentially(name);
  await page.waitForFunction(() => !document.querySelector("button[type=submit]")?.hasAttribute("disabled"), null, { timeout: 15000 });
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await page.waitForSelector(".studio-sidebar nav", { timeout: 15000 });
}

/** A step of the workspace, by its sidebar label ("Brand assets", "The basics", …). */
export async function goStep(page, label) {
  await page.locator(".studio-sidebar nav").getByRole("button", { name: new RegExp(label) }).click();
  await page.waitForTimeout(500);
}

/** The live preview, and the frame inside it. */
export async function visualise(page) {
  await page.getByRole("button", { name: /^Visualise/ }).first().click();
  await page.waitForSelector("iframe[title='Live preview']", { timeout: 20000 });
  await page.waitForFunction(() => document.querySelector("iframe[title='Live preview']")?.contentDocument?.querySelector(".dp-page"), null, { timeout: 20000 });
  return page.frames().find((f) => f.url().endsWith("/preview"));
}

/** Adds an element from the library by id, searching for it first. */
export async function addElement(page, id, search) {
  await goStep(page, "Elements");
  await page.locator(".search-field input").fill(search);
  await page.waitForTimeout(700);
  await page.locator(`[data-element-id="${id}"] .add-element`).click();
  await page.locator(".search-field input").fill("");
}
