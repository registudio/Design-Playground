import { describe, expect, it } from "vitest";
import { composite, isLargeText, parseCssColor, ratio, requiredRatio } from "@/preview/contrast-lens";

const c = (value: string) => parseCssColor(value)!;

describe("contrast lens maths", () => {
  it("reads the colour syntaxes a browser computes", () => {
    expect(c("rgb(255, 255, 255)")).toMatchObject({ r: 1, g: 1, b: 1, alpha: 1 });
    expect(c("oklch(0 0 0)")).toMatchObject({ r: 0, g: 0, b: 0 });
    expect(c("color(srgb 1 0 0 / 0.5)")).toMatchObject({ r: 1, g: 0, b: 0, alpha: 0.5 });
    expect(c("transparent").alpha).toBe(0);
  });

  it("matches the WCAG reference ratios", () => {
    expect(ratio(c("#000"), c("#fff"))).toBeCloseTo(21, 5);
    expect(ratio(c("#fff"), c("#fff"))).toBeCloseTo(1, 5);
    // #767676 on white is the classic "just passes AA" grey.
    expect(ratio(c("#767676"), c("#fff"))).toBeGreaterThanOrEqual(4.5);
    expect(ratio(c("#777777"), c("#fff"))).toBeLessThan(4.5);
  });

  it("composites translucent text onto what is behind it", () => {
    // Half-transparent black on white is a mid grey, not black.
    const grey = composite(c("rgb(0 0 0 / 0.5)"), c("#fff"));
    expect(grey.r).toBeCloseTo(0.5, 5);
    expect(ratio(grey, c("#fff"))).toBeLessThan(4.5);
  });

  it("uses the large-text threshold only where WCAG allows it", () => {
    expect(isLargeText(24, 400)).toBe(true);
    expect(isLargeText(19, 700)).toBe(true);
    expect(isLargeText(19, 400)).toBe(false);
    expect(requiredRatio(true)).toBe(3);
    expect(requiredRatio(false)).toBe(4.5);
  });
});
