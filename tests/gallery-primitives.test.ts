import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  AccordionVariant, DropdownVariant, ModalVariant, PaginationVariant, TabsVariant,
  ToastVariant, TooltipVariant,
} from "@/schema/recipe";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * §Wave F: Tabs, Accordion, Modal, Toast, Tooltip, Pagination, and Dropdown have no
 * Sample Page instance (see editable-overlay.test.ts), so they get click-to-apply
 * through Group's field prop in the Element Gallery instead — each swatch already is
 * one specific option, so clicking it just applies it. This is source-text-level
 * verification (there's no cheap way to render the actual JSX in a node test here)
 * that every one of these fields is actually wired to a Group with a `field=` prop,
 * not just added to the schema and forgotten.
 */
describe("Element Gallery click-to-apply coverage", () => {
  const componentsTsx = readFileSync(
    join(__dirname, "..", "src", "preview", "surfaces", "Components.tsx"),
    "utf-8",
  );

  const cases: Array<[string, readonly string[]]> = [
    ["tabs", TabsVariant.options],
    ["accordion", AccordionVariant.options],
    ["modal", ModalVariant.options],
    ["toast", ToastVariant.options],
    ["tooltip", TooltipVariant.options],
    ["pagination", PaginationVariant.options],
    ["dropdown", DropdownVariant.options],
  ];

  it.each(cases)("%s is wired to a Group with field=\"%s\"", (field) => {
    expect(componentsTsx).toMatch(new RegExp(`field="${field}"`));
  });

  it("each field's variant enum has at least 2 options (there's something to click between)", () => {
    for (const [field, options] of cases) {
      expect(options.length, field).toBeGreaterThanOrEqual(2);
    }
  });
});
