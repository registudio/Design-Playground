import { describe, expect, it } from "vitest";
import { previewSrc } from "@/components/RegistryPreview";
import { readFileSync } from "node:fs";

describe("the registry preview URL", () => {
  it("names the concrete React Bits variant, as the install command does", () => {
    const src = previewSrc({ source: "react-bits", name: "BlurText", variant: { language: "TS", styling: "TW" } } as never);
    expect(src).toContain("name=BlurText-TS-TW");
  });

  it("carries the document version, which is what retires a browser-cached copy", () => {
    expect(previewSrc({ source: "bklit", name: "bar-chart" } as never)).toMatch(/[?&]v=\d+/);
  });

  it("changes only with a retry", () => {
    const element = { source: "bklit", name: "bar-chart" } as never;
    expect(previewSrc(element)).toBe(previewSrc(element, 0));
    expect(previewSrc(element, 1)).not.toBe(previewSrc(element));
  });

  it("is the only way the library builds one, so card and full screen cannot drift", () => {
    // They drifted once: the full-screen view dropped the version and could be served a
    // day-old document the card had already moved past.
    const library = readFileSync("src/components/ElementLibrary.tsx", "utf8");
    expect(library).not.toContain("/api/element-preview");
    expect(library).toContain("previewSrc(expanded)");
  });
});
