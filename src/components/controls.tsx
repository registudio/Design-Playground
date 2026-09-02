"use client";

/**
 * The playground's own control primitives.
 *
 * §9 asks for human-readable controls by default with implementation detail hidden
 * behind Advanced, and §13.2 gives the vocabulary: "Rounded ↔ Sharp", not "0.75rem".
 * `Slider` therefore takes end labels rather than a unit, and only reveals the numeric
 * value when Advanced is on.
 */

import { useProjectStore } from "@/store/project-store";
import { provenanceLabel, provenanceOf } from "@/store/provenance";

/**
 * The source dot beside a label. Read-only until the value has actually been edited by
 * hand, at which point it becomes the reset control for that one field — the dot is
 * already the thing that says "you changed this", so it's also the obvious place to
 * click to undo just that (see store/baseline.ts).
 */
export function ProvenanceDot({ path }: { path: string }) {
  const project = useProjectStore((s) => s.project);
  const resetField = useProjectStore((s) => s.resetField);
  const resetLabel = useProjectStore((s) => s.resetLabel);
  const source = provenanceOf(project, path);

  if (source !== "user") {
    return (
      <span
        className="h-1.5 w-1.5 shrink-0 cursor-help rounded-full bg-chrome-border"
        title={provenanceLabel(project, path)}
        aria-hidden="true"
      />
    );
  }

  return (
    <button
      type="button"
      // Negative margin keeps the click target comfortable without the dot itself
      // pushing the label around.
      className="-m-1.5 shrink-0 cursor-pointer p-1.5 leading-none"
      title={`${provenanceLabel(project, path)} — click to ${resetLabel().toLowerCase()}`}
      aria-label={`Reset ${path}`}
      onClick={() => resetField(path)}
    >
      <span className="block h-1.5 w-1.5 rounded-full bg-chrome-accent" />
    </button>
  );
}

export function Field({
  label, hint, provenancePath, children,
}: {
  label: string;
  hint?: string;
  /** Dotted path into project.provenance — shows a source dot that doubles as reset. */
  provenancePath?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-chrome-text">
          {label}
          {provenancePath && <ProvenanceDot path={provenancePath} />}
        </span>
        {hint && <span className="font-mono text-[11px] text-chrome-muted">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/**
 * A raw numeric value, always shown with its unit.
 *
 * Deliberately unlike `Slider`: the sliders express design vocabulary ("Sharp ↔
 * Rounded") and drive a whole ramp at once, which is right for the common path but
 * leaves no way to say "balanced density, but 68rem wide". These are the escape hatch
 * for exactly that, so they show the number rather than hiding it (§9 puts precision
 * behind Advanced, not out of reach).
 */
export function NumberField({
  label, value, onChange, min, max, step = 1, unit, provenancePath, hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  provenancePath?: string;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint} provenancePath={provenancePath}>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (Number.isNaN(next)) return;
            // Clamp rather than reject, so holding an arrow key can't push a token to a
            // value the schema would refuse to save.
            onChange(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, next)));
          }}
          className="min-w-0 flex-1 rounded-md border border-chrome-border bg-chrome-panel px-2.5 py-1.5 text-[12px]"
        />
        {unit && <span className="shrink-0 font-mono text-[11px] text-chrome-muted">{unit}</span>}
      </div>
    </Field>
  );
}

export function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
  from,
  to,
  format,
  provenancePath,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  /** Descriptive end labels, e.g. "Sharp" and "Rounded". */
  from: string;
  to: string;
  format?: (value: number) => string;
  provenancePath?: string;
}) {
  const advanced = useProjectStore((s) => s.advanced);
  return (
    <Field label={label} hint={advanced && format ? format(value) : undefined} provenancePath={provenancePath}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-chrome-accent"
      />
      <div className="flex justify-between text-[11px] text-chrome-muted">
        <span>{from}</span>
        <span>{to}</span>
      </div>
    </Field>
  );
}

export function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
  describe,
  provenancePath,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  describe?: (option: T) => string;
  provenancePath?: string;
}) {
  return (
    <Field label={label} provenancePath={provenancePath}>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={option === value}
            className={`rounded-md border px-2.5 py-1.5 text-[12px] capitalize transition-colors ${
              option === value
                ? "border-chrome-accent bg-chrome-accent text-white"
                : "border-chrome-border bg-chrome-panel text-chrome-muted hover:bg-chrome-hover hover:text-chrome-text"
            }`}
          >
            {describe ? describe(option) : option.replace(/-/g, " ")}
          </button>
        ))}
      </div>
    </Field>
  );
}

export function Toggle({
  label,
  value,
  onChange,
  provenancePath,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  provenancePath?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-[13px] font-medium text-chrome-text">
        {label}
        {provenancePath && <ProvenanceDot path={provenancePath} />}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          value ? "bg-chrome-accent" : "bg-chrome-border"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
            value ? "translate-x-4.5" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}

/**
 * A titled group of controls, collapsible by clicking its heading.
 *
 * Both rails are long enough to scroll well past a screen, and Advanced makes them
 * considerably longer still — being able to fold away the four panels you aren't
 * working on is what keeps the one you are working on and the preview visible at the
 * same time. Everything starts expanded, so this only ever costs a click to opt into.
 */
export function Panel({
  title, id, children,
}: {
  title: string;
  /** Collapse key. Defaults to the title; pass one when two panels share a title. */
  id?: string;
  children: React.ReactNode;
}) {
  const key = id ?? title;
  const collapsed = useProjectStore((s) => s.collapsedPanels.includes(key));
  const togglePanel = useProjectStore((s) => s.togglePanel);

  return (
    <section className="flex flex-col gap-4 border-b border-chrome-border px-5 py-5 last:border-b-0">
      <h3>
        <button
          type="button"
          onClick={() => togglePanel(key)}
          aria-expanded={!collapsed}
          className="flex w-full items-center gap-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-chrome-muted transition-colors hover:text-chrome-text"
        >
          <span className="text-[9px] opacity-70" aria-hidden="true">{collapsed ? "▸" : "▾"}</span>
          {title}
        </button>
      </h3>
      {!collapsed && children}
    </section>
  );
}
