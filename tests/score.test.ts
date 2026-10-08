import { describe, expect, it } from "vitest";
import { scoreElement, signalsIn, weightOf } from "@/elements/score";
import { inferredDataProps, SAMPLE_DATA } from "@/elements/preview-props";

const base = { category: "Buttons & inputs" as const, dependencies: [], licence: "clear" as const, described: true, referenceOnly: false };

describe("element scores", () => {
  it("adds its parts to a 0–100 score", () => {
    const best = scoreElement({ ...base, preview: "ready", signals: { aria: true, keyboard: true, reducedMotion: true, semantic: true } });
    expect(best.score).toBe(100);
    const worst = scoreElement({ ...base, category: "Hooks & utilities", dependencies: ["three"], licence: "unknown", described: false, referenceOnly: true, preview: "failed", signals: { aria: false, keyboard: false, reducedMotion: false, semantic: false } });
    expect(worst.score).toBe(5 + 3 + 2);
  });

  it("puts the unmeasured between the proven and the broken", () => {
    const unknown = scoreElement(base).score;
    expect(scoreElement({ ...base, preview: "ready", signals: { aria: true, keyboard: true, reducedMotion: true, semantic: true } }).score).toBeGreaterThan(unknown);
    expect(scoreElement({ ...base, preview: "failed", signals: { aria: false, keyboard: false, reducedMotion: false, semantic: false } }).score).toBeLessThan(unknown);
  });

  it("weighs a WebGL stack well below a component with nothing to install", () => {
    expect(weightOf([])).toBe(15);
    expect(weightOf(["clsx", "lucide-react@^0.4"])).toBe(13);
    expect(weightOf(["motion"])).toBe(11);
    expect(weightOf(["@react-three/fiber", "three"])).toBe(3);
  });

  it("reads accessibility signals from source", () => {
    expect(signalsIn(`<button aria-label="x" onKeyDown={f}>` + "useReducedMotion()")).toEqual({ aria: true, keyboard: true, reducedMotion: true, semantic: true });
    expect(signalsIn("<div className='x' />")).toEqual({ aria: false, keyboard: false, reducedMotion: false, semantic: false });
  });
});

describe("content a preview has to supply", () => {
  it("finds the data props a component takes under names of its own", () => {
    const source = `export default function RadialOrbitalTimeline({ timelineData }: Props) {}
      export const TestimonialsColumn = (props: { className?: string; testimonials: T[] }) => props.testimonials.map(x => x)
      function Card({ title, onClose, isOpen, size = "sm", ...rest }) {}`;
    expect(inferredDataProps(source)).toEqual(["testimonials", "timelineData", "title"]);
  });

  it("gives one sample that works as a list and as a single item", () => {
    // eslint-disable-next-line no-new-func
    const sample = new Function("React", `return ${SAMPLE_DATA}`)({ createElement: () => null });
    expect(Array.isArray(sample)).toBe(true);
    expect(sample.map((item: { title: string }) => item.title)).toEqual(["Discover", "Design", "Deliver"]);
    expect(sample.title).toBe("Discover");
  });
});

describe("the evidence script", () => {
  it("reads the same signals as the score does", async () => {
    const { signalDigits } = await import("../scripts/score-evidence.mjs");
    for (const sample of ["<button aria-label='x' tabIndex={0}>", "useReducedMotion()", "<div />", "<nav>", "@media (prefers-reduced-motion: reduce)"]) {
      const s = signalsIn(sample);
      expect(signalDigits(sample), sample).toBe([s.aria, s.keyboard, s.reducedMotion, s.semantic].map((v) => (v ? "1" : "0")).join(""));
    }
  });
});
