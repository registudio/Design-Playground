"use client";
import { useMemo, useState } from "react";
import { PRESETS, PRESET_FAMILIES, applyPreset, presetThumbnail, type Preset } from "@/presets";
import { resolveCopy } from "@/presets/copy";
import { useProjectStore } from "@/store/project-store";
import { SECTION_ORDER } from "@/schema/composition";
import { PresetBar } from "./ProjectTools";
import { fontStack, useGoogleFonts } from "@/fonts/use-google-fonts";

/**
 * The template step.
 *
 * Grouped by the kind of client, because that is how a project starts — "a tuition
 * centre", "a seed-stage startup" — with the purely stylistic starters last. Each card
 * is drawn from the template itself rather than from a shared mock: its own headline and
 * calls to action, set in its own typefaces and colours, in the shape of its own hero.
 * Three rotating stock headlines on identical layouts made twenty-five templates look
 * like three.
 */
const FAMILIES = PRESET_FAMILIES.filter((family) => family !== "Custom");
const rank = (preset: Preset) => FAMILIES.indexOf(preset.family as (typeof FAMILIES)[number]);

export function TemplateGallery() {
  const edit = useProjectStore(s => s.edit);
  const applied = useProjectStore(s => s.project?.appliedPreset);
  const brand = useProjectStore(s => s.project?.client || s.project?.name || "Your brand");
  const [family, setFamily] = useState<string>("All templates");

  const ordered = useMemo(() => [...PRESETS].sort((a, b) => rank(a) - rank(b)), []);
  const shown = ordered.filter(p => family === "All templates" || p.family === family);
  useGoogleFonts(useMemo(() => shown.flatMap(p => { const t = presetThumbnail(p); return [t.display, t.body]; }), [shown]));

  const apply = (p: Preset) => edit(`Apply ${p.name} template`, d => {
    applyPreset(d, p);
    d.appliedPreset = p.id;
    d.recipe.unset = [];
    d.recipe.sectionOrder = SECTION_ORDER.filter(k => d.recipe.components[k] !== "none");
  });

  return <>
    <div className="filter-row">{["All templates", ...FAMILIES].map(f => <button key={f} aria-pressed={f === family} className={f === family ? "active" : ""} onClick={() => setFamily(f)}>{f}<span>{f === "All templates" ? PRESETS.length : PRESETS.filter(p => p.family === f).length}</span></button>)}</div>
    <div className="template-grid">
      <button className={`template-card blank-template ${!applied ? "active" : ""}`} onClick={() => edit("Start with a blank canvas", d => { d.appliedPreset = null; d.recipe.sectionOrder = []; })}><div>＋</div><h3>Blank canvas</h3><p>No template. Your rules.</p></button>
      {shown.map(p => <TemplateCard key={p.id} preset={p} brand={brand} active={applied === p.id} onApply={() => apply(p)}/>)}
    </div>
    <details className="advanced-presets"><summary>Saved templates & advanced template tools</summary><PresetBar/></details>
  </>;
}

function TemplateCard({ preset, brand, active, onApply }: { preset: Preset; brand: string; active: boolean; onApply: () => void }) {
  const t = presetThumbnail(preset);
  const copy = resolveCopy(preset.copy, brand);
  const radius = `${Math.min(18, t.radius * 12)}px`;
  const shape = ["centered", "dashboard", "video-led"].includes(t.hero) ? "stacked" : ["image-led", "editorial"].includes(t.hero) ? "image" : "split";
  const style = {
    ["--tp-bg" as string]: t.background, ["--tp-fg" as string]: t.foreground, ["--tp-primary" as string]: t.primary,
    ["--tp-accent" as string]: t.accent, ["--tp-surface" as string]: t.surface, ["--tp-muted" as string]: t.muted,
    ["--tp-radius" as string]: radius, ["--tp-display" as string]: fontStack(t.display), ["--tp-body" as string]: fontStack(t.body),
  };
  return <button className={`template-card ${active ? "active" : ""}`} onClick={onApply} aria-pressed={active}>
    <div className="template-preview" data-shape={shape} style={style} aria-hidden="true">
      <div className="template-nav"><b>{brand}</b><span>{copy.footerGroups[0]?.links.slice(0, 3).join("   ")}</span><i>{copy.navCta}</i></div>
      <div className="template-hero">
        <div className="template-copy">
          <small>{copy.badge}</small>
          <strong>{copy.headline}</strong>
          <div className="template-actions"><span>{copy.primaryCta}</span><em>{copy.secondaryCta}</em></div>
        </div>
        {shape !== "stacked" && <div className="template-visual"/>}
      </div>
      <div className="template-lines">{copy.features.slice(0, 3).map(f => <i key={f.title}>{f.title}</i>)}</div>
    </div>
    <div className="template-info"><h3>{preset.name}</h3><span>{active ? "✓ Selected" : preset.family}</span></div>
    {preset.bestFor && <p className="template-best"><b>Best for</b> {preset.bestFor}</p>}
    <p>{preset.description}</p>
  </button>;
}
