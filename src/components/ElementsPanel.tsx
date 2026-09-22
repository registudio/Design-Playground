"use client";

import { useEffect, useState } from "react";
import { useProjectStore } from "@/store/project-store";
import { ElementsBrowser } from "./ElementsBrowser";
import { ConfirmButton, Panel, Toggle } from "./controls";
import { ENGINES, engineRequirements } from "@/schema/engines";
import { sourceById } from "@/registry/sources";
import { pageSections, SECTION_LABELS } from "@/schema/composition";

/**
 * The Elements rail (spec §1b, §5).
 *
 * Browsing happens in a full-screen overlay; this rail holds the two things worth
 * seeing beside the preview — which engines the project uses, and what has been
 * selected so far — because both are decisions that get exported.
 */
export function ElementsPanel() {
  const project = useProjectStore((s) => s.project);
  const loadRegistry = useProjectStore((s) => s.loadRegistry);
  const registryState = useProjectStore((s) => s.registryState);
  const indexedCount = useProjectStore((s) => s.registry.elements.length);
  const [browsing, setBrowsing] = useState(false);

  // Loads the committed snapshot the first time this tab is opened rather than on app
  // start: someone who never opens Elements should not pay for it.
  useEffect(() => {
    void loadRegistry();
  }, [loadRegistry]);

  if (!project) return null;

  return (
    <>
      <Panel title="Browse">
        <p className="text-[12px] leading-relaxed text-chrome-muted">
          Components, motion and scroll effects from five registries. Choosing one
          records an install command for the build step — the playground exports the
          decision, not the component&rsquo;s code.
        </p>
        <button
          type="button"
          onClick={() => setBrowsing(true)}
          className="w-full rounded-md bg-chrome-accent px-3 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
        >
          Browse elements
        </button>
        <p className="text-[11px] text-chrome-muted">
          {registryState === "loading"
            ? "Reading the index…"
            : indexedCount > 0
              ? `${indexedCount} indexed`
              : "Nothing indexed yet — open the browser to fetch."}
        </p>
      </Panel>

      <EnginesPanel />
      <SelectionsPanel />

      {browsing && <ElementsBrowser onClose={() => setBrowsing(false)} />}
    </>
  );
}

/**
 * §1b — engines are project-wide capabilities, and now derived rather than asked.
 *
 * Ticking "GSAP" was a question nobody could answer correctly without reading the
 * dependencies of every component they had picked, and answering it wrong exported a
 * recipe that could not run. Both halves of the project already declare what they need,
 * so this shows the conclusion and its reasons instead of asking for one.
 *
 * Lenis and Vanta stay switchable: nothing implies them, because they change the feel
 * of a whole page rather than serving any one component.
 */
function EnginesPanel() {
  const recipe = useProjectStore((s) => s.project?.recipe);
  const selections = useProjectStore((s) => s.project?.selections ?? []);
  const setEngine = useProjectStore((s) => s.setEngine);
  if (!recipe) return null;

  const motionEngines = (["entrance", "interaction", "scroll"] as const)
    .flatMap((group) => Object.values(recipe.motion[group]))
    .map((binding) => binding.engine);
  const requirements = engineRequirements(motionEngines, selections);

  return (
    <Panel title="Engines">
      <p className="text-[12px] leading-relaxed text-chrome-muted">
        Worked out from what you&rsquo;ve chosen — the components you selected and the
        animations you picked each say which library they need.
      </p>
      <div className="flex flex-col gap-3">
        {requirements.map((requirement) => {
          const engine = ENGINES.find((e) => e.id === requirement.id)!;
          const optional = !engine.drivesProperties;
          return (
            <div key={engine.id} className="flex flex-col gap-1">
              {optional ? (
                <Toggle
                  label={engine.label}
                  value={recipe.engines[engine.id]}
                  onChange={(value) => setEngine(engine.id, value)}
                />
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] font-medium text-chrome-text">{engine.label}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      requirement.required
                        ? "bg-chrome-accent/20 text-chrome-accent"
                        : "bg-chrome-border/50 text-chrome-muted"
                    }`}
                  >
                    {requirement.required ? "Required" : "Not needed"}
                  </span>
                </div>
              )}
              <p className="text-[11px] text-chrome-muted">
                {requirement.reasons.length
                  ? `Needed by ${requirement.reasons.join(" and ")}.`
                  : engine.description}
              </p>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function SelectionsPanel() {
  const recipe = useProjectStore((s) => s.project?.recipe);
  const selections = useProjectStore((s) => s.project?.selections ?? []);
  const deselectElement = useProjectStore((s) => s.deselectElement);
  const setIntendedUse = useProjectStore((s) => s.setIntendedUse);
  const setSelectionPlacement = useProjectStore((s) => s.setSelectionPlacement);

  return (
    <Panel title={`Selected (${selections.length})`} id="Selected elements">
      {selections.length === 0 ? (
        <p className="text-[12px] leading-relaxed text-chrome-muted">
          Nothing selected. Anything chosen here exports as
          <code className="mx-1 font-mono text-[11px]">design-playground-selection.json</code>
          so the build step can install it without asking again.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {[...selections]
            .sort((a, b) => a.addedAt - b.addedAt)
            .map((selection) => (
              <li key={selection.id} className="flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-chrome-text">
                      {selection.title}
                    </p>
                    <p className="text-[11px] text-chrome-muted">
                      {sourceById(selection.source)?.label ?? selection.source}
                      {selection.referenceOnly && " · reference only"}
                    </p>
                  </div>
                  <ConfirmButton
                    label="Remove"
                    confirmLabel="Sure?"
                    ariaLabel={`Remove ${selection.title}`}
                    armedAriaLabel={`Confirm removing ${selection.title}`}
                    onConfirm={() => deselectElement(selection.id)}
                    className="shrink-0 text-[11px] text-chrome-muted transition-colors hover:text-chrome-text"
                    confirmClassName="shrink-0 text-[11px] font-medium text-red-500"
                  />
                </div>
                <label className="sr-only" htmlFor={`use-${selection.id}`}>
                  Intended use for {selection.title}
                </label>
                <input
                  id={`use-${selection.id}`}
                  type="text"
                  value={selection.intendedUse}
                  onChange={(e) => setIntendedUse(selection.id, e.target.value)}
                  // §5's intendedUse is what makes the export an answered design-interview
                  // question rather than a bare list of install commands.
                  placeholder="What it's for — e.g. hero headline reveal"
                  className="w-full rounded border border-chrome-border bg-chrome-bg px-2 py-1 text-[12px] text-chrome-text outline-none placeholder:text-chrome-muted focus:border-chrome-accent"
                />
                <label className="flex items-center gap-2 text-[11px] text-chrome-muted">
                  Place after
                  <select
                    aria-label={`Placement for ${selection.title}`}
                    value={selection.placement}
                    onChange={(e) => setSelectionPlacement(selection.id, e.target.value)}
                    className="min-w-0 flex-1 rounded border border-chrome-border bg-chrome-bg px-1.5 py-1 text-[11px] text-chrome-text"
                  >
                    <option value="page">End of page</option>
                    {recipe && pageSections(recipe).map((key) => (
                      <option key={key} value={key}>{SECTION_LABELS[key]}</option>
                    ))}
                  </select>
                </label>
              </li>
            ))}
        </ul>
      )}
    </Panel>
  );
}
