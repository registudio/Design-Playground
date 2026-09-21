"use client";

import { useEffect, useState } from "react";
import { useProjectStore } from "@/store/project-store";
import { ElementsBrowser } from "./ElementsBrowser";
import { ConfirmButton, Panel, Toggle } from "./controls";
import { ENGINES } from "@/schema/engines";
import { findDisabledEngineUses } from "@/schema/recipe";
import { sourceById } from "@/registry/sources";

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
 * §1b — engines are project-wide capabilities, toggled once, never browsed.
 *
 * They sit here rather than among the search results because turning GSAP on is a
 * different kind of decision from picking a component: it changes what the build
 * installs for the whole site, and there is no `registry.json` behind it to browse.
 */
function EnginesPanel() {
  const engines = useProjectStore((s) => s.project?.recipe.engines);
  const recipe = useProjectStore((s) => s.project?.recipe);
  const setEngine = useProjectStore((s) => s.setEngine);
  if (!engines || !recipe) return null;

  const disabledUses = findDisabledEngineUses(recipe);

  return (
    <Panel title="Engines">
      <p className="text-[12px] leading-relaxed text-chrome-muted">
        Project-wide libraries the build installs. Not pickable per section — these are
        on or off for the whole site.
      </p>
      <div className="flex flex-col gap-3">
        {ENGINES.map((engine) => (
          <div key={engine.id} className="flex flex-col gap-1">
            <Toggle
              label={engine.label}
              value={engines[engine.id]}
              onChange={(value) => setEngine(engine.id, value)}
            />
            <p className="text-[11px] text-chrome-muted">{engine.description}</p>
          </div>
        ))}
      </div>

      {disabledUses.length > 0 && (
        // Surfaced here and blocked at export: a recipe whose animation needs GSAP
        // while the engine list says not to install GSAP cannot actually run.
        <p className="rounded-md bg-amber-500/10 px-2.5 py-2 text-[11px] leading-relaxed text-chrome-text">
          {disabledUses
            .map((use) => `${use.group} "${use.binding}" needs ${use.engine}`)
            .join("; ")}
          . Re-enable the engine or change the animation before exporting.
        </p>
      )}
    </Panel>
  );
}

function SelectionsPanel() {
  const selections = useProjectStore((s) => s.project?.selections ?? []);
  const deselectElement = useProjectStore((s) => s.deselectElement);
  const setIntendedUse = useProjectStore((s) => s.setIntendedUse);

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
              </li>
            ))}
        </ul>
      )}
    </Panel>
  );
}
