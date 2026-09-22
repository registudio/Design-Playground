import { describe, expect, it } from "vitest";
import { engineRequirements, defaultEngines, ENGINES } from "@/schema/engines";

/**
 * Engines are derived from the project rather than asked for, so these cover the
 * derivation itself: what makes an engine required, and what must never make one
 * required by accident.
 */

const selection = (title: string, engineDependency: string[]) => ({ title, engineDependency });

describe("deriving engines from a project (§1b)", () => {
  const required = (motion: string[], selections = [] as ReturnType<typeof selection>[]) =>
    engineRequirements(motion, selections).filter((r) => r.required).map((r) => r.id);

  it("requires nothing when the project animates nothing and selects nothing", () => {
    expect(required(["css"])).toEqual([]);
  });

  it("requires an engine a chosen animation declares", () => {
    expect(required(["gsap"])).toEqual(["gsap"]);
  });

  it("requires an engine a selected component depends on", () => {
    expect(required(["css"], [selection("Text Effect", ["motion"])])).toEqual(["motion"]);
  });

  it("requires both when the two halves disagree about which is needed", () => {
    expect(required(["gsap"], [selection("Blur Text", ["motion"])]).sort()).toEqual(["gsap", "motion"]);
  });

  it("never derives Lenis or Vanta, which no component or recipe implies", () => {
    // Both change the feel of a whole page, so deriving them would mean switching off
    // something the user deliberately turned on.
    const ids = required(["gsap", "motion"], [selection("X", ["motion", "gsap"])]);
    expect(ids).not.toContain("lenis");
    expect(ids).not.toContain("vanta");
  });

  it("does not treat plain CSS as an engine that needs installing", () => {
    expect(engineRequirements(["css", "css"], []).every((r) => !r.required)).toBe(true);
  });

  it("explains why each engine is required, not just that it is", () => {
    const [gsap] = engineRequirements(["gsap"], [selection("Parallax", ["gsap"])])
      .filter((r) => r.id === "gsap");
    expect(gsap!.reasons).toEqual(["your chosen animations", "Parallax"]);
  });

  it("names a couple of components but counts a crowd", () => {
    const many = ["A", "B", "C", "D"].map((t) => selection(t, ["motion"]));
    const [motion] = engineRequirements([], many).filter((r) => r.id === "motion");
    expect(motion!.reasons).toEqual(["4 selected components"]);
  });

  it("covers every engine on every call, so the UI can render a stable list", () => {
    expect(engineRequirements([], []).map((r) => r.id)).toEqual(ENGINES.map((e) => e.id));
  });

  it("agrees with the shipped defaults for a default project", () => {
    // defaultRecipe's bindings use motion and gsap, so a new project must not open
    // already inconsistent with its own engine list.
    const derived = required(["motion", "motion", "motion", "gsap"]);
    expect(derived.sort()).toEqual(
      Object.entries(defaultEngines()).filter(([, on]) => on).map(([id]) => id).sort(),
    );
  });
});
