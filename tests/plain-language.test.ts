import { describe, expect, it } from "vitest";
import { ELEMENTS } from "@/elements/catalogue";
import { BROWSE_CATEGORIES } from "@/elements/taxonomy";
import { behaviourFor, plainSummary } from "@/elements/plain-language";

describe("plain-language effect summaries", () => {
  it("says what every original is, how it behaves and who sees what", () => {
    for (const element of ELEMENTS) {
      const summary = plainSummary(element.id)!;
      expect(summary.what, element.id).toBe(element.description);
      expect(summary.behaviour.length, element.id).toBeGreaterThan(20);
      expect(summary.access, element.id).toMatch(/less motion/);
    }
  });

  it("has a behaviour line for every browse category", () => {
    for (const category of BROWSE_CATEGORIES) expect(behaviourFor(category).length, category).toBeGreaterThan(20);
  });

  it("tells the client which effects need WebGL, and only those", () => {
    expect(plainSummary("vanta-fog")!.access).toMatch(/WebGL/);
    expect(plainSummary("shader-drift")!.access).toMatch(/WebGL/);
    expect(plainSummary("aurora")!.access).not.toMatch(/WebGL/);
  });

  it("does not claim a control stops working under reduced motion", () => {
    expect(plainSummary(ELEMENTS.find(e => e.id.startsWith("carousel-"))!.id)!.access).toMatch(/can still use it/);
    expect(plainSummary("aurora")!.access).toMatch(/still version/);
  });

  it("uses no developer vocabulary in the behaviour lines", () => {
    for (const category of BROWSE_CATEGORIES) expect(behaviourFor(category), category).not.toMatch(/\b(prop|component|render|DOM|CSS|JS|iframe|hook)\b/i);
  });
});
