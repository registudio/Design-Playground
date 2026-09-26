import { createProject, goStep, launch, OUT, tally } from "./lib/studio.mjs";

/**
 * Things that must not go wrong quietly: help opens and closes from the keyboard without
 * stealing keystrokes from fields; deleting a snapshot or a saved template takes two
 * clicks; a failed save says so instead of hanging on "Saving…".
 */
const { ok, finish } = tally();
const { browser, page, pageErrors } = await launch({ width: 1600, height: 1000 });
await createProject(page, "Safety Verify");
const help = () => page.getByRole("dialog", { name: /shortcuts/i });

// ------------------------------------------------------------------ help overlay
await page.locator(".sidebar-help").click();
await page.waitForTimeout(300);
ok("help opens from its visible button", await help().isVisible());
ok("help explains the reset dot", await page.getByText(/dot beside a control/i).isVisible());
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
ok("Escape closes help", (await help().count()) === 0);
await page.keyboard.press("?");
await page.waitForTimeout(300);
ok("'?' opens help", await help().isVisible());
await page.keyboard.press("Escape");
await page.waitForTimeout(300);

// "?" must not hijack a keystroke meant for a text field.
await page.getByRole("button", { name: "Snapshots", exact: true }).click();
const snapshotInput = page.getByPlaceholder("Snapshot name…");
await snapshotInput.fill("Before?");
await page.waitForTimeout(200);
ok("'?' typed into a field stays in the field", (await snapshotInput.inputValue()) === "Before?");
ok("…and does not open help", (await help().count()) === 0);

// ------------------------------------------------------ snapshot delete confirmation
await snapshotInput.press("Enter");
await page.waitForTimeout(500);
ok("the snapshot was created", await page.getByText("Before?", { exact: true }).isVisible());
await page.getByRole("button", { name: /Delete snapshot "Before\?"/ }).click();
await page.waitForTimeout(300);
ok("one click on delete only arms it", await page.getByText("Before?", { exact: true }).isVisible());
const confirm = page.getByRole("button", { name: /Click again to delete snapshot "Before\?"/ });
ok("the armed delete asks for confirmation", await confirm.isVisible());
await confirm.click();
await page.waitForTimeout(500);
ok("a second click deletes the snapshot", (await page.getByText("Before?", { exact: true }).count()) === 0);
await page.keyboard.press("Escape");

// ------------------------------------------------------- saved template confirmation
await goStep(page, "Templates");
await page.locator(".advanced-presets summary").click();
await page.getByRole("button", { name: "Save current as preset", exact: true }).click();
const presetInput = page.getByPlaceholder("Preset name…");
await presetInput.fill("Delete Me Preset");
await presetInput.press("Enter");
await page.waitForTimeout(600);
ok("the template was saved", await page.getByText("Delete Me Preset", { exact: true }).first().isVisible());
await page.getByRole("button", { name: /Delete preset "Delete Me Preset"/ }).click();
await page.waitForTimeout(300);
ok("one click only arms the delete", await page.getByText("Delete Me Preset", { exact: true }).first().isVisible());
await page.getByRole("button", { name: /Click again to delete preset "Delete Me Preset"/ }).click();
await page.waitForTimeout(600);
ok("a second click deletes it", (await page.getByText("Delete Me Preset", { exact: true }).count()) === 0);

// --------------------------------------------------------------- save failure shown
ok("the header reports the project as saved", await page.getByText("All changes saved").isVisible());
// Break writes the way a private window or a full quota would, then make an edit.
await page.evaluate(() => {
  const original = IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction = function (names, mode, ...rest) {
    if (mode === "readwrite") throw new Error("Simulated storage failure");
    return original.call(this, names, mode, ...rest);
  };
});
await page.waitForTimeout(300);
await goStep(page, "Templates");
await page.locator(".template-card").filter({ hasText: "Swiss" }).first().click();
await page.waitForTimeout(1500);
ok("a failed save is reported instead of hanging on 'Saving…'", (await page.getByText("Not saved").count()) > 0);

await page.screenshot({ path: `${OUT}/safety.png` });
ok(`no page errors (${pageErrors.length})`, pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
await finish(browser);
