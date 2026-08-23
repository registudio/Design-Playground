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
import { provenanceLabel } from "@/store/provenance";

export function Field({
  label, hint, provenancePath, children,
}: {
  label: string;
  hint?: string;
  /** Dotted path into project.provenance — shows a small hoverable source dot next to the label. */
  provenancePath?: string;
  children: React.ReactNode;
}) {
  const project = useProjectStore((s) => s.project);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-chrome-text">
          {label}
          {provenancePath && (
            <span
              className="h-1.5 w-1.5 shrink-0 cursor-help rounded-full bg-chrome-border"
              title={provenanceLabel(project, provenancePath)}
              aria-hidden="true"
            />
          )}
        </span>
        {hint && <span className="font-mono text-[11px] text-chrome-muted">{hint}</span>}
      </div>
      {children}
    </div>
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
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="text-[13px] font-medium text-chrome-text">{label}</span>
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

export function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-b border-chrome-border px-5 py-5 last:border-b-0">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-chrome-muted">
        {title}
      </h3>
      {children}
    </section>
  );
}
