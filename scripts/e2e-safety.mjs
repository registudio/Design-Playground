import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

/**
 * Safety-net and learnability smoke test (§Wave G).
 *
 * The three things here all concern trust rather than capability: that destroying
 * something takes a deliberate second click, that a failed save says so instead of
 * pretending, and that the help panel explaining the app's non-obvious affordances is
 * reachable. See e2e-smoke.mjs for the portability conventions.
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
await page.getByPlaceholder("Project name").fill("Safety Verify");
await page.getByRole("button", { name: "New project", exact: true }).click();
await page.waitForTimeout(700);

// ------------------------------------------------------------------ help overlay
await page.getByRole("button", { name: "Shortcuts and tips" }).click();
await page.waitForTimeout(300);
ok("Help opens from its visible button", await page.getByRole("dialog", { name: /shortcuts/i }).isVisible());
ok("Help explains the reset dot", await page.getByText(/dot beside a control/i).isVisible());
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
ok("Escape closes help", (await page.getByRole("dialog", { name: /shortcuts/i }).count()) === 0);

await page.keyboard.press("?");
await page.waitForTimeout(300);
ok("'?' opens help", await page.getByRole("dialog", { name: /shortcuts/i }).isVisible());
await page.keyboard.press("Escape");
await page.waitForTimeout(300);

// "?" must not hijack a keystroke meant for a text field.
await page.getByRole("button", { name: "Snapshots", exact: true }).click();
const snapshotInput = page.getByPlaceholder("Snapshot name…");
await snapshotInput.fill("Before?");
await page.waitForTimeout(200);
ok("'?' typed into a field stays in the field", (await snapshotInput.inputValue()) === "Before?");
ok("...and does not open help", (await page.getByRole("dialog", { name: /shortcuts/i }).count()) === 0);

// ------------------------------------------------------ snapshot delete confirmation
await snapshotInput.press("Enter");
await page.waitForTimeout(500);
const snapshotRow = page.locator("div").filter({ hasText: /^Before\?$/ }).last();
ok("Snapshot was created", await page.getByText("Before?", { exact: true }).isVisible());

// The button's accessible name is set explicitly (there can be several snapshots, each
// with a visibly identical "Delete"/"Sure?" label — a screen reader needs the name to
// say which one), so it's queried by that name rather than the shared visible text.
const deleteSnapshot = page.getByRole("button", { name: /Delete snapshot "Before\?"/ });
await deleteSnapshot.click();
await page.waitForTimeout(300);
ok("One click on delete only arms it", await page.getByText("Before?", { exact: true }).isVisible());
const confirmSnapshotDelete = page.getByRole("button", { name: /Click again to delete snapshot "Before\?"/ });
ok("Armed delete asks for confirmation", await confirmSnapshotDelete.isVisible());
await confirmSnapshotDelete.click();
await page.waitForTimeout(500);
ok("Second click deletes the snapshot", (await page.getByText("Before?", { exact: true }).count()) === 0);
void snapshotRow;

// ------------------------------------------------------- custom preset confirmation
await page.keyboard.press("Escape");
await page.getByRole("button", { name: "Save current as preset", exact: true }).click();
const presetInput = page.getByPlaceholder("Preset name…");
await presetInput.fill("Delete Me Preset");
await presetInput.press("Enter");
await page.waitForTimeout(600);
ok("Custom preset was saved", await page.getByText("Delete Me Preset", { exact: true }).isVisible());

// Same explicit-accessible-name reasoning as the snapshot delete above.
const presetDelete = page.getByRole("button", { name: /Delete preset "Delete Me Preset"/ });
await presetDelete.click();
await page.waitForTimeout(300);
ok("One click only arms the preset delete", await page.getByText("Delete Me Preset", { exact: true }).isVisible());
await page.getByRole("button", { name: /Click again to delete preset "Delete Me Preset"/ }).click();
await page.waitForTimeout(600);
ok("Second click deletes the preset", (await page.getByText("Delete Me Preset", { exact: true }).count()) === 0);

// --------------------------------------------------------------- save failure shown
ok("Header reports the project as saved", await page.getByText("Saved", { exact: true }).isVisible());

// Break writes the way a private window or a full quota would, then make an edit.
// Patched on the prototype so it applies to the connection the app already holds.
await page.evaluate(() => {
  const original = IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction = function (names, mode, ...rest) {
    if (mode === "readwrite") throw new Error("Simulated storage failure");
    return original.call(this, names, mode, ...rest);
  };
});
await page.waitForTimeout(400);
await page.getByRole("button", { name: "Components", exact: true }).click();
await page.getByRole("button", { name: "ghost", exact: true }).first().click();
await page.waitForTimeout(1500);

const notSaved = page.getByText("Not saved", { exact: false });
ok("A failed save is reported instead of hanging on 'Saving…'", (await notSaved.count()) > 0);

await page.screenshot({ path: `${OUT}/10-safety.png` });
ok(`No page errors (${errors.length})`, errors.length === 0);
if (errors.length) console.log(errors.join("\n"));

await browser.close();
console.log(`\n${failures === 0 ? "ALL PASSED" : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
