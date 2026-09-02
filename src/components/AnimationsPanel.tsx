"use client";

import { useProjectStore } from "@/store/project-store";
import { findEngineConflicts } from "@/schema/recipe";
import { Choice, Panel, Slider } from "./controls";
import { MOTION_PROFILES, ENTRANCE_RECIPES, HOVER_RECIPES, SCROLL_RECIPES } from "@/motion/recipes";

/**
 * Motion configuration (§12).
 *
 * The user picks reusable recipes rather than constructing timelines, and never picks
 * an engine: each recipe already declares whether Motion or GSAP drives it (§12.6).
 * Conflicts between the two are surfaced here rather than discovered at build time.
 */
export function AnimationsPanel() {
  const project = useProjectStore((s) => s.project);
  const advanced = useProjectStore((s) => s.advanced);
  const edit = useProjectStore((s) => s.edit);
  if (!project) return null;

  const { motion } = project.recipe;
  const tokens = project.tokens.motion;

  const conflicts = [
    ...findEngineConflicts(motion.entrance),
    ...findEngineConflicts(motion.interaction),
    ...findEngineConflicts(motion.scroll),
  ];

  return (
    <>
      <Panel title="Motion profile">
        <Choice
          label="Overall character"
          options={MOTION_PROFILES}
          value={motion.profile}
          provenancePath="recipe.motion.profile"
          onChange={(profile) =>
            edit("Set motion profile", (draft) => {
              draft.recipe.motion.profile = profile;
              draft.tokens.motion.profile = profile;
              // A profile sets defaults; individual recipes can still override them.
              const presets = {
                none: { fast: 0, base: 0, slow: 0, distance: 0, scale: 1, stagger: 0 },
                subtle: { fast: 120, base: 220, slow: 380, distance: 12, scale: 0.99, stagger: 40 },
                professional: { fast: 150, base: 320, slow: 600, distance: 24, scale: 0.96, stagger: 60 },
                expressive: { fast: 200, base: 460, slow: 820, distance: 40, scale: 0.92, stagger: 90 },
                cinematic: { fast: 280, base: 680, slow: 1200, distance: 64, scale: 0.88, stagger: 140 },
              }[profile];
              draft.tokens.motion.duration = { fast: presets.fast, base: presets.base, slow: presets.slow };
              draft.tokens.motion.distance = presets.distance;
              draft.tokens.motion.scale = presets.scale;
              draft.tokens.motion.stagger = presets.stagger;
              draft.provenance["recipe.motion.profile"] = "user";
            })
          }
        />
      </Panel>

      <Panel title="Entrance">
        <Choice
          label="Default entrance"
          options={ENTRANCE_RECIPES.map((r) => r.id)}
          value={motion.entrance.default?.recipe ?? ENTRANCE_RECIPES[0]!.id}
          describe={(id) => ENTRANCE_RECIPES.find((r) => r.id === id)?.label ?? id}
          provenancePath="recipe.motion.entrance.default"
          onChange={(id) =>
            edit("Set entrance animation", (draft) => {
              const recipe = ENTRANCE_RECIPES.find((r) => r.id === id)!;
              draft.recipe.motion.entrance.default = { ...recipe.binding };
              draft.provenance["recipe.motion.entrance.default"] = "user";
            })
          }
        />
      </Panel>

      <Panel title="Interaction">
        {(["button", "card"] as const).map((target) => (
          <Choice
            key={target}
            label={`${target === "button" ? "Button" : "Card"} hover`}
            options={HOVER_RECIPES[target].map((r) => r.id)}
            value={motion.interaction[target]?.recipe ?? HOVER_RECIPES[target][0]!.id}
            describe={(id) => HOVER_RECIPES[target].find((r) => r.id === id)?.label ?? id}
            provenancePath={`recipe.motion.interaction.${target}`}
            onChange={(id) =>
              edit(`Set ${target} hover`, (draft) => {
                const recipe = HOVER_RECIPES[target].find((r) => r.id === id)!;
                draft.recipe.motion.interaction[target] = { ...recipe.binding };
                draft.provenance[`recipe.motion.interaction.${target}`] = "user";
              })
            }
          />
        ))}
      </Panel>

      <Panel title="Scroll">
        <Choice
          label="Scroll behaviour"
          options={SCROLL_RECIPES.map((r) => r.id)}
          value={motion.scroll.default?.recipe ?? SCROLL_RECIPES[0]!.id}
          describe={(id) => SCROLL_RECIPES.find((r) => r.id === id)?.label ?? id}
          provenancePath="recipe.motion.scroll.default"
          onChange={(id) =>
            edit("Set scroll behaviour", (draft) => {
              const recipe = SCROLL_RECIPES.find((r) => r.id === id)!;
              draft.recipe.motion.scroll.default = { ...recipe.binding };
              draft.provenance["recipe.motion.scroll.default"] = "user";
            })
          }
        />
      </Panel>

      {advanced && (
        <Panel title="Timing">
          <Slider
            label="Base duration" from="Quick" to="Slow"
            min={80} max={1200} step={10}
            value={tokens.duration.base}
            format={(v) => `${v}ms`}
            provenancePath="tokens.motion.duration"
            onChange={(base) =>
              edit("Adjust duration", (draft) => {
                draft.tokens.motion.duration.base = base;
                draft.tokens.motion.duration.fast = Math.round(base * 0.47);
                draft.tokens.motion.duration.slow = Math.round(base * 1.88);
                draft.provenance["tokens.motion.duration"] = "user";
              }, "motion.duration")
            }
          />
          <Slider
            label="Movement distance" from="Restrained" to="Dramatic"
            min={0} max={96} step={2}
            value={tokens.distance}
            format={(v) => `${v}px`}
            provenancePath="tokens.motion.distance"
            onChange={(distance) =>
              edit("Adjust distance", (draft) => {
                draft.tokens.motion.distance = distance;
                draft.provenance["tokens.motion.distance"] = "user";
              }, "motion.distance")
            }
          />
          <Slider
            label="Stagger" from="Together" to="Sequential"
            min={0} max={200} step={5}
            value={tokens.stagger}
            format={(v) => `${v}ms`}
            provenancePath="tokens.motion.stagger"
            onChange={(stagger) =>
              edit("Adjust stagger", (draft) => {
                draft.tokens.motion.stagger = stagger;
                draft.provenance["tokens.motion.stagger"] = "user";
              }, "motion.stagger")
            }
          />
          {/* The profile sets this alongside duration/distance/stagger, but unlike those
              it had no control of its own — so a scale-driven entrance could only be
              tuned by switching to a whole different profile. */}
          <Slider
            label="Entrance scale" from="Subtle" to="Pronounced"
            min={0.8} max={1} step={0.01}
            value={tokens.scale}
            format={(v) => `${v.toFixed(2)}×`}
            provenancePath="tokens.motion.scale"
            onChange={(scale) =>
              edit("Adjust motion scale", (draft) => {
                draft.tokens.motion.scale = scale;
                draft.provenance["tokens.motion.scale"] = "user";
              }, "motion.scale")
            }
          />
        </Panel>
      )}

      <Panel title="Accessibility" id="motion-accessibility">
        <p className="text-[12px] text-chrome-muted">
          Every recipe carries a reduced-motion fallback. Movement is removed while state
          changes and content visibility are preserved.
        </p>
        {conflicts.length > 0 && (
          <div className="rounded-md border border-chrome-danger px-3 py-2.5">
            {conflicts.map((c, i) => (
              <p key={i} className="text-[12px] text-chrome-danger">
                ⚠ “{c.a}” and “{c.b}” both animate {c.property} with different engines.
              </p>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
