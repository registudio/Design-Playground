import { describe, expect, it } from "vitest";
import { FIELD_SPECS } from "@/preview/EditableOverlay";
import { ComponentChoices } from "@/schema/recipe";

/**
 * Click-to-edit (§Wave E) maps each ComponentChoices field to a CSS selector and its
 * Zod options. This is hand-maintained (unlike ComponentsPanel, which reads the
 * schema generically) because it also encodes DOM-nesting priority, so it can drift
 * silently from the schema — a new recipe field would just never become click-to-edit
 * with no error anywhere. These tests catch that drift.
 */
describe("EditableOverlay field coverage", () => {
  it("covers every ComponentChoices field except cursor", () => {
    const covered = new Set(FIELD_SPECS.map((s) => s.field));
    for (const key of Object.keys(ComponentChoices.shape)) {
      if (key === "cursor") continue; // no natural click target — see EditableOverlay's docs
      expect(covered.has(key as keyof typeof ComponentChoices.shape), key).toBe(true);
    }
  });

  it("each spec's options match the schema's own enum for that field", () => {
    for (const spec of FIELD_SPECS) {
      const schemaField = ComponentChoices.shape[spec.field];
      expect(spec.options).toEqual(schemaField.options);
    }
  });

  it("has no duplicate selectors or fields", () => {
    const selectors = FIELD_SPECS.map((s) => s.selector);
    const fields = FIELD_SPECS.map((s) => s.field);
    expect(new Set(selectors).size).toBe(selectors.length);
    expect(new Set(fields).size).toBe(fields.length);
  });
});
