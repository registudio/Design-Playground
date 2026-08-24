import { describe, expect, it } from "vitest";
import { FIELD_SPECS } from "@/preview/EditableOverlay";
import { ComponentChoices } from "@/schema/recipe";

/**
 * Click-to-edit (§Wave E/F) maps each ComponentChoices field to a CSS selector and its
 * Zod options. This is hand-maintained (unlike ComponentsPanel, which reads the
 * schema generically) because it also encodes DOM-nesting priority, so it can drift
 * silently from the schema — a new recipe field would just never become click-to-edit
 * with no error anywhere. These tests catch that drift.
 *
 * Fields with no natural click target on the Sample Page are excluded: cursor is a
 * whole-page behaviour, not a rendered swatch, and the Advanced-tier primitives added
 * in §Wave F (tabs, accordion, modal, toast, tooltip, pagination, dropdown) render
 * only in the Element Gallery — the Sample Page has no instance of them to click.
 * Those get click-to-edit through Group's field prop in Components.tsx instead (see
 * tests/gallery-primitives.test.ts).
 */
const NO_SAMPLE_PAGE_TARGET = new Set(["cursor", "tabs", "accordion", "modal", "toast", "tooltip", "pagination", "dropdown"]);

describe("EditableOverlay field coverage", () => {
  it("covers every ComponentChoices field with a Sample Page target", () => {
    const covered = new Set(FIELD_SPECS.map((s) => s.field));
    for (const key of Object.keys(ComponentChoices.shape)) {
      if (NO_SAMPLE_PAGE_TARGET.has(key)) continue;
      expect(covered.has(key as keyof typeof ComponentChoices.shape), key).toBe(true);
    }
  });

  it("each spec's options match the schema's own enum for that field", () => {
    for (const spec of FIELD_SPECS) {
      const schemaField = ComponentChoices.shape[spec.field];
      const options = "options" in schemaField ? schemaField.options : schemaField.unwrap().options;
      expect(spec.options).toEqual(options);
    }
  });

  it("has no duplicate selectors or fields", () => {
    const selectors = FIELD_SPECS.map((s) => s.selector);
    const fields = FIELD_SPECS.map((s) => s.field);
    expect(new Set(selectors).size).toBe(selectors.length);
    expect(new Set(fields).size).toBe(fields.length);
  });
});
