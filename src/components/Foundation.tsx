"use client";

import { useState } from "react";
import { useProjectStore } from "@/store/project-store";
import { RADIUS_STEPS, SHADOW_STEPS, TYPE_STEPS } from "@/schema/tokens";
import { fromCss, toHex } from "@/color/oklch";
import { Choice, Field, NumberField, Panel, Slider, Toggle } from "./controls";
import { AssetUpload } from "./AssetUpload";
import { AdditionalAssets } from "./AdditionalAssets";
import { ColorEditor } from "./ColorEditor";
import { ALL_FONTS, FONT_PAIRINGS, GOOGLE_FONTS, SYSTEM_FONTS, findFont } from "@/fonts/catalogue";

/**
 * The Foundation section (§10).
 *
 * Controls read as design vocabulary by default — "Sharp ↔ Rounded" rather than a rem
 * value — with numbers revealed only under Advanced (§9, §13.2). Sliders pass a
 * coalesce key so a drag collapses to a single undo step.
 */
export function Foundation() {
  const project = useProjectStore((s) => s.project);
  const edit = useProjectStore((s) => s.edit);
  const advanced = useProjectStore((s) => s.advanced);

  if (!project) return null;
  const { tokens } = project;

  return (
    <>
      <Panel title="Company assets">
        <AssetUpload />
      </Panel>

      <Panel title="Additional assets">
        <AdditionalAssets />
      </Panel>

      <ColorEditor />

      <Panel title="Typography">
        {/* Pairing first: choosing two families independently from a long list mostly
            produces mismatches, so the common path is one click. Individual family
            pickers stay available underneath for when a client insists. */}
        <Field label="Font pairing" provenancePath="tokens.typography.display">
          <div className="flex flex-col gap-1">
            {FONT_PAIRINGS.map((pairing) => {
              const active =
                tokens.typography.display.family === pairing.display &&
                tokens.typography.body.family === pairing.body;
              return (
                <button
                  key={pairing.id}
                  type="button"
                  onClick={() =>
                    edit(`Use ${pairing.name} pairing`, (draft) => {
                      for (const role of ["display", "body", "mono"] as const) {
                        const entry = findFont(pairing[role]);
                        if (!entry) continue;
                        draft.tokens.typography[role] = {
                          ...draft.tokens.typography[role],
                          family: entry.family,
                          fallback: entry.fallback,
                          source: entry.source,
                          weights: entry.weights,
                        };
                        draft.provenance[`tokens.typography.${role}`] = "user";
                      }
                    })
                  }
                  className={`rounded-md border px-3 py-2 text-left transition-colors ${
                    active
                      ? "border-chrome-accent bg-chrome-hover"
                      : "border-chrome-border hover:bg-chrome-hover"
                  }`}
                >
                  <span className="block text-[12px] font-medium">{pairing.name}</span>
                  <span className="block text-[11px] text-chrome-muted">{pairing.description}</span>
                </button>
              );
            })}
          </div>
        </Field>

        {advanced &&
          (["display", "body", "mono"] as const).map((role) => (
            <label key={role} className="flex flex-col gap-2">
              <span className="text-[13px] font-medium capitalize">{role}</span>
              <select
                value={tokens.typography[role].family}
                onChange={(e) => {
                  const font = ALL_FONTS.find((f) => f.family === e.target.value);
                  if (!font) return;
                  edit(`Set ${role} font`, (draft) => {
                    draft.tokens.typography[role] = {
                      ...draft.tokens.typography[role],
                      family: font.family,
                      fallback: font.fallback,
                      source: font.source,
                      weights: font.weights,
                    };
                    draft.provenance[`tokens.typography.${role}`] = "user";
                  });
                }}
                className="rounded-md border border-chrome-border bg-chrome-panel px-2.5 py-2 text-[13px]"
              >
                <optgroup label="System">
                  {SYSTEM_FONTS.map((f) => (
                    <option key={f.family} value={f.family}>{f.family}</option>
                  ))}
                </optgroup>
                <optgroup label="Google Fonts">
                  {GOOGLE_FONTS.map((f) => (
                    <option key={`${f.category}-${f.family}`} value={f.family}>
                      {f.family}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
          ))}

        <Slider
          label="Type scale"
          from="Compact" to="Dramatic"
          min={1.1} max={1.45} step={0.01}
          value={inferredRatio(tokens.typography.scale.heading1.size, tokens.typography.scale.body.size)}
          format={(v) => `${v.toFixed(2)}×`}
          provenancePath="tokens.typography.scale"
          onChange={(ratio) =>
            edit("Adjust type scale", (draft) => {
              const base = draft.tokens.typography.scale.body.size;
              // Rebuild the ladder around the body size so the base stays readable.
              const offsets: Record<(typeof TYPE_STEPS)[number], number> = {
                displayXl: 6, displayL: 5, heading1: 4, heading2: 3, heading3: 2,
                bodyL: 0.5, body: 0, small: -1, caption: -2,
              };
              for (const step of TYPE_STEPS) {
                draft.tokens.typography.scale[step].size =
                  Math.round(base * ratio ** offsets[step] * 1000) / 1000;
              }
              draft.provenance["tokens.typography.scale"] = "user";
            }, "type.scale")
          }
        />

        {advanced && <TypeScaleEditor />}
      </Panel>

      <Panel title="Geometry">
        <Slider
          label="Radius" from="Sharp" to="Rounded"
          min={0} max={5} step={1}
          value={RADIUS_STEPS.indexOf(nearestRadius(tokens.geometry.radius.md))}
          format={() => `${tokens.geometry.radius.md}rem`}
          provenancePath="tokens.geometry.radius"
          onChange={(index) =>
            edit("Adjust radius", (draft) => {
              // One control drives the whole ramp, keeping the family proportional.
              const scale = [0, 0.125, 0.375, 0.625, 1, 1.5][index] ?? 0.5;
              draft.tokens.geometry.radius = {
                none: 0,
                sm: scale * 0.5,
                md: scale,
                lg: scale * 1.5,
                xl: scale * 2,
                full: 9999,
              };
              draft.provenance["tokens.geometry.radius"] = "user";
            }, "geometry.radius")
          }
        />

        <Slider
          label="Spacing" from="Compact" to="Spacious"
          min={0.75} max={1.5} step={0.05}
          value={tokens.geometry.spacing["4"]}
          format={(v) => `${v}rem base`}
          provenancePath="tokens.geometry.spacing"
          onChange={(base) =>
            edit("Adjust spacing", (draft) => {
              const ratios: Record<string, number> = {
                "0": 0, "1": 0.25, "2": 0.5, "3": 0.75, "4": 1, "6": 1.5, "8": 2,
                "12": 3, "16": 4, "24": 6, "32": 8, "48": 12, "64": 16,
              };
              for (const [key, ratio] of Object.entries(ratios)) {
                draft.tokens.geometry.spacing[key as keyof typeof draft.tokens.geometry.spacing] =
                  Math.round(base * ratio * 1000) / 1000;
              }
              draft.provenance["tokens.geometry.spacing"] = "user";
            }, "geometry.spacing")
          }
        />

        <Slider
          label="Shadow" from="Flat" to="Elevated"
          min={0} max={4} step={1}
          value={SHADOW_STEPS.indexOf(tokens.imagery.shadow)}
          format={(v) => SHADOW_STEPS[v] ?? "none"}
          provenancePath="tokens.imagery.shadow"
          onChange={(index) =>
            edit("Adjust shadow", (draft) => {
              draft.tokens.imagery.shadow = SHADOW_STEPS[index] ?? "none";
              draft.provenance["tokens.imagery.shadow"] = "user";
            }, "geometry.shadow")
          }
        />

        {/* Border weights reach globals.css but had no control at all, so a project
            could never move off the default hairline/1px/2px ramp. */}
        {advanced &&
          (["hairline", "default", "thick"] as const).map((weight) => (
            <NumberField
              key={weight}
              label={`Border ${weight}`}
              unit="px"
              min={0} max={12} step={0.5}
              value={tokens.geometry.borderWidth[weight]}
              provenancePath="tokens.geometry.borderWidth"
              onChange={(value) =>
                edit(`Set ${weight} border width`, (draft) => {
                  draft.tokens.geometry.borderWidth[weight] = value;
                  draft.provenance["tokens.geometry.borderWidth"] = "user";
                }, `geometry.border.${weight}`)
              }
            />
          ))}
      </Panel>

      <Panel title="Layout">
        <Choice
          label="Density"
          options={["compact", "balanced", "spacious", "editorial"] as const}
          value={tokens.layout.density}
          provenancePath="tokens.layout.density"
          onChange={(density) =>
            edit("Set density", (draft) => {
              draft.tokens.layout.density = density;
              const presets = {
                compact: { maxWidth: 64, gutter: 1, sectionSpacing: 4 },
                balanced: { maxWidth: 72, gutter: 1.5, sectionSpacing: 6 },
                spacious: { maxWidth: 80, gutter: 2, sectionSpacing: 9 },
                editorial: { maxWidth: 56, gutter: 2.5, sectionSpacing: 12 },
              };
              Object.assign(draft.tokens.layout, presets[density]);
              draft.provenance["tokens.layout.density"] = "user";
            })
          }
        />
        <Choice
          label="Alignment"
          options={["left", "center"] as const}
          value={tokens.layout.alignment}
          provenancePath="tokens.layout.alignment"
          onChange={(alignment) =>
            edit("Set alignment", (draft) => {
              draft.tokens.layout.alignment = alignment;
              draft.provenance["tokens.layout.alignment"] = "user";
            })
          }
        />

        {/* Density is a shortcut for the three measurements below, which is why picking
            one overwrites them. Exposing them separately is what makes "balanced, but
            narrower" expressible — previously the only way to get there was to pick a
            density that was wrong in two other respects. */}
        {advanced && (
          <>
            <p className="text-[11px] text-chrome-muted">
              Density presets these three. Adjust afterwards to fine-tune.
            </p>
            <NumberField
              label="Max width" unit="rem" min={20} max={120} step={1}
              value={tokens.layout.maxWidth}
              provenancePath="tokens.layout.maxWidth"
              onChange={(maxWidth) =>
                edit("Set max width", (draft) => {
                  draft.tokens.layout.maxWidth = maxWidth;
                  draft.provenance["tokens.layout.maxWidth"] = "user";
                }, "layout.maxWidth")
              }
            />
            <NumberField
              label="Gutter" unit="rem" min={0} max={8} step={0.25}
              value={tokens.layout.gutter}
              provenancePath="tokens.layout.gutter"
              onChange={(gutter) =>
                edit("Set gutter", (draft) => {
                  draft.tokens.layout.gutter = gutter;
                  draft.provenance["tokens.layout.gutter"] = "user";
                }, "layout.gutter")
              }
            />
            <NumberField
              label="Section spacing" unit="rem" min={0} max={24} step={0.5}
              value={tokens.layout.sectionSpacing}
              provenancePath="tokens.layout.sectionSpacing"
              onChange={(sectionSpacing) =>
                edit("Set section spacing", (draft) => {
                  draft.tokens.layout.sectionSpacing = sectionSpacing;
                  draft.provenance["tokens.layout.sectionSpacing"] = "user";
                }, "layout.sectionSpacing")
              }
            />
            {/* Honest label: the sample page lays itself out with flex/auto-fit grids
                rather than a fixed column system, so this one shapes the exported spec
                the downstream build consumes, not the preview in front of you. */}
            <NumberField
              label="Grid columns" min={1} max={24} step={1} hint="exported spec"
              value={tokens.layout.gridColumns}
              provenancePath="tokens.layout.gridColumns"
              onChange={(gridColumns) =>
                edit("Set grid columns", (draft) => {
                  draft.tokens.layout.gridColumns = gridColumns;
                  draft.provenance["tokens.layout.gridColumns"] = "user";
                }, "layout.gridColumns")
              }
            />
          </>
        )}
      </Panel>

      <Panel title="Imagery">
        <Choice
          label="Corner treatment"
          options={RADIUS_STEPS}
          value={tokens.imagery.radius}
          provenancePath="tokens.imagery.radius"
          onChange={(radius) =>
            edit("Set image radius", (draft) => {
              draft.tokens.imagery.radius = radius;
              draft.provenance["tokens.imagery.radius"] = "user";
            })
          }
        />
        <Choice
          label="Treatment"
          options={["contained", "full-bleed"] as const}
          value={tokens.imagery.treatment}
          provenancePath="tokens.imagery.treatment"
          onChange={(treatment) =>
            edit("Set image treatment", (draft) => {
              draft.tokens.imagery.treatment = treatment;
              draft.provenance["tokens.imagery.treatment"] = "user";
            })
          }
        />
        <Toggle
          label="Image borders"
          value={tokens.imagery.border}
          provenancePath="tokens.imagery.border"
          onChange={(border) =>
            edit("Toggle image borders", (draft) => {
              draft.tokens.imagery.border = border;
              draft.provenance["tokens.imagery.border"] = "user";
            })
          }
        />

        {/* The overlay reaches globals.css as --dp-image-overlay but had no control,
            so the one tool for keeping text legible over photography was unreachable. */}
        <Toggle
          label="Image overlay"
          value={tokens.imagery.overlay.enabled}
          provenancePath="tokens.imagery.overlay"
          onChange={(enabled) =>
            edit("Toggle image overlay", (draft) => {
              draft.tokens.imagery.overlay.enabled = enabled;
              draft.provenance["tokens.imagery.overlay"] = "user";
            })
          }
        />

        {tokens.imagery.overlay.enabled && (
          <>
            <Field label="Overlay colour" provenancePath="tokens.imagery.overlay">
              <label className="relative h-8 w-full cursor-pointer overflow-hidden rounded-md border border-chrome-border">
                <span className="absolute inset-0" style={{ background: toHex(tokens.imagery.overlay.color) }} />
                <input
                  type="color"
                  value={toHex(tokens.imagery.overlay.color)}
                  onChange={(e) => {
                    const parsed = fromCss(e.target.value);
                    if (!parsed) return;
                    edit("Set overlay colour", (draft) => {
                      draft.tokens.imagery.overlay.color = parsed;
                      draft.provenance["tokens.imagery.overlay"] = "user";
                    }, "imagery.overlay.color");
                  }}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Overlay colour"
                />
              </label>
            </Field>
            <Slider
              label="Overlay strength" from="Barely there" to="Heavy"
              min={0} max={1} step={0.01}
              value={tokens.imagery.overlay.opacity}
              format={(v) => `${Math.round(v * 100)}%`}
              provenancePath="tokens.imagery.overlay"
              onChange={(opacity) =>
                edit("Set overlay strength", (draft) => {
                  draft.tokens.imagery.overlay.opacity = opacity;
                  draft.provenance["tokens.imagery.overlay"] = "user";
                }, "imagery.overlay.opacity")
              }
            />
          </>
        )}
      </Panel>
    </>
  );
}

const TYPE_STEP_LABELS: Record<(typeof TYPE_STEPS)[number], string> = {
  displayXl: "Display XL", displayL: "Display L",
  heading1: "Heading 1", heading2: "Heading 2", heading3: "Heading 3",
  bodyL: "Body large", body: "Body", small: "Small", caption: "Caption",
};

/**
 * Per-step control over the type ladder (§10.3).
 *
 * The Type scale slider above rebuilds all nine steps from one ratio, which is the
 * right default — a ladder built by hand usually ends up uneven. But it only ever sets
 * `size`, so weight, line height, tracking and casing were unreachable from the UI
 * despite being in the schema and the exported tokens. "Heading 1, but heavier and
 * tighter" is an ordinary request, and this is where it gets answered. Reset applies to
 * the ladder as a whole, since it is one ramp.
 */
function TypeScaleEditor() {
  const project = useProjectStore((s) => s.project);
  const edit = useProjectStore((s) => s.edit);
  const [open, setOpen] = useState(false);
  if (!project) return null;
  const { scale } = project.tokens.typography;

  const setStep = (
    step: (typeof TYPE_STEPS)[number],
    key: "size" | "weight" | "lineHeight" | "letterSpacing",
    value: number,
  ) =>
    edit(`Set ${TYPE_STEP_LABELS[step]} ${key}`, (draft) => {
      draft.tokens.typography.scale[step][key] = value;
      draft.provenance["tokens.typography.scale"] = "user";
    }, `type.step.${step}.${key}`);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 self-start text-[12px] text-chrome-accent hover:underline"
      >
        <span aria-hidden="true">{open ? "▾" : "▸"}</span>
        Fine-tune each step
      </button>

      {open &&
        TYPE_STEPS.map((step) => {
          const value = scale[step];
          return (
            <div
              key={step}
              data-type-step={step}
              className="flex flex-col gap-2 rounded-md border border-chrome-border px-3 py-2.5"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12px] font-medium text-chrome-text">
                  {TYPE_STEP_LABELS[step]}
                </span>
                <span className="font-mono text-[10px] text-chrome-muted">{value.role}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <StepNumber
                  label="Size" unit="rem" value={value.size} min={0.5} max={12} step={0.05}
                  onChange={(v) => setStep(step, "size", v)}
                />
                <StepNumber
                  label="Weight" value={value.weight} min={100} max={900} step={50}
                  onChange={(v) => setStep(step, "weight", v)}
                />
                <StepNumber
                  label="Line height" value={value.lineHeight} min={0.8} max={2.4} step={0.01}
                  onChange={(v) => setStep(step, "lineHeight", v)}
                />
                <StepNumber
                  label="Tracking" unit="em" value={value.letterSpacing} min={-0.1} max={0.4} step={0.005}
                  onChange={(v) => setStep(step, "letterSpacing", v)}
                />
              </div>

              <label className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-chrome-muted">Casing</span>
                <select
                  value={value.transform}
                  onChange={(e) =>
                    edit(`Set ${TYPE_STEP_LABELS[step]} casing`, (draft) => {
                      draft.tokens.typography.scale[step].transform =
                        e.target.value as typeof value.transform;
                      draft.provenance["tokens.typography.scale"] = "user";
                    })
                  }
                  className="rounded-md border border-chrome-border bg-chrome-panel px-2 py-1 text-[11px]"
                >
                  {["none", "uppercase", "lowercase", "capitalize"].map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
          );
        })}
    </div>
  );
}

function StepNumber({
  label, value, onChange, min, max, step, unit,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.06em] text-chrome-muted">
        {label}{unit ? ` (${unit})` : ""}
      </span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (Number.isNaN(next)) return;
          onChange(Math.min(max, Math.max(min, next)));
        }}
        className="w-full rounded-md border border-chrome-border bg-chrome-panel px-2 py-1 text-[11px]"
      />
    </label>
  );
}

const inferredRatio = (heading: number, body: number) =>
  Math.round((heading / body) ** (1 / 4) * 100) / 100;

function nearestRadius(value: number): (typeof RADIUS_STEPS)[number] {
  const ladder: Array<[(typeof RADIUS_STEPS)[number], number]> = [
    ["none", 0], ["sm", 0.125], ["md", 0.375], ["lg", 0.625], ["xl", 1],
  ];
  let best: (typeof RADIUS_STEPS)[number] = "md";
  let delta = Infinity;
  for (const [name, target] of ladder) {
    const d = Math.abs(target - value);
    if (d < delta) { delta = d; best = name; }
  }
  return best;
}
