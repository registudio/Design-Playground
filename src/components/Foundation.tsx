"use client";

import { useProjectStore } from "@/store/project-store";
import { RADIUS_STEPS, SHADOW_STEPS, TYPE_STEPS } from "@/schema/tokens";
import { Choice, Panel, Slider, Toggle } from "./controls";
import { AssetUpload } from "./AssetUpload";
import { ColorEditor } from "./ColorEditor";
import { GOOGLE_FONTS, SYSTEM_FONTS } from "@/fonts/catalogue";

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

  if (!project) return null;
  const { tokens } = project;

  return (
    <>
      <Panel title="Company assets">
        <AssetUpload />
      </Panel>

      <ColorEditor />

      <Panel title="Typography">
        {(["display", "body", "mono"] as const).map((role) => (
          <label key={role} className="flex flex-col gap-2">
            <span className="text-[13px] font-medium capitalize">{role}</span>
            <select
              value={tokens.typography[role].family}
              onChange={(e) => {
                const font = [...SYSTEM_FONTS, ...GOOGLE_FONTS].find((f) => f.family === e.target.value);
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
                  <option key={f.family} value={f.family}>{f.family}</option>
                ))}
              </optgroup>
            </select>
          </label>
        ))}

        <Slider
          label="Type scale"
          from="Compact" to="Dramatic"
          min={1.1} max={1.4} step={0.01}
          value={inferredRatio(tokens.typography.scale.heading1.size, tokens.typography.scale.body.size)}
          format={(v) => `${v.toFixed(2)}×`}
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
            }, "type.scale")
          }
        />
      </Panel>

      <Panel title="Geometry">
        <Slider
          label="Radius" from="Sharp" to="Rounded"
          min={0} max={5} step={1}
          value={RADIUS_STEPS.indexOf(nearestRadius(tokens.geometry.radius.md))}
          format={() => `${tokens.geometry.radius.md}rem`}
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
            }, "geometry.radius")
          }
        />

        <Slider
          label="Spacing" from="Compact" to="Spacious"
          min={0.75} max={1.5} step={0.05}
          value={tokens.geometry.spacing["4"]}
          format={(v) => `${v}rem base`}
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
            }, "geometry.spacing")
          }
        />

        <Slider
          label="Shadow" from="Flat" to="Elevated"
          min={0} max={4} step={1}
          value={SHADOW_STEPS.indexOf(tokens.imagery.shadow)}
          format={(v) => SHADOW_STEPS[v] ?? "none"}
          onChange={(index) =>
            edit("Adjust shadow", (draft) => {
              draft.tokens.imagery.shadow = SHADOW_STEPS[index] ?? "none";
            }, "geometry.shadow")
          }
        />
      </Panel>

      <Panel title="Layout">
        <Choice
          label="Density"
          options={["compact", "balanced", "spacious", "editorial"] as const}
          value={tokens.layout.density}
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
            })
          }
        />
        <Choice
          label="Alignment"
          options={["left", "center"] as const}
          value={tokens.layout.alignment}
          onChange={(alignment) =>
            edit("Set alignment", (draft) => { draft.tokens.layout.alignment = alignment; })
          }
        />
      </Panel>

      <Panel title="Imagery">
        <Choice
          label="Corner treatment"
          options={RADIUS_STEPS}
          value={tokens.imagery.radius}
          onChange={(radius) =>
            edit("Set image radius", (draft) => { draft.tokens.imagery.radius = radius; })
          }
        />
        <Choice
          label="Treatment"
          options={["contained", "full-bleed"] as const}
          value={tokens.imagery.treatment}
          onChange={(treatment) =>
            edit("Set image treatment", (draft) => { draft.tokens.imagery.treatment = treatment; })
          }
        />
        <Toggle
          label="Image borders"
          value={tokens.imagery.border}
          onChange={(border) =>
            edit("Toggle image borders", (draft) => { draft.tokens.imagery.border = border; })
          }
        />
      </Panel>
    </>
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
