"use client";
import { useState } from "react";
import { PRESETS, applyPreset, presetThumbnail } from "@/presets";
import { useProjectStore } from "@/store/project-store";
import { SECTION_ORDER } from "@/schema/composition";
import { PresetBar } from "./ProjectTools";

export function TemplateGallery() {
  const edit = useProjectStore(s => s.edit);
  const applied = useProjectStore(s => s.project?.appliedPreset);
  const [family, setFamily] = useState("All templates");
  return <><div className="filter-row">{["All templates", ...new Set(PRESETS.map(p => p.family))].map(f => <button key={f} className={f === family ? "active" : ""} onClick={() => setFamily(f)}>{f}</button>)}</div><div className="template-grid"><button className={`template-card blank-template ${!applied ? "active" : ""}`} onClick={() => edit("Start with a blank canvas", d => { d.appliedPreset = null; d.recipe.sectionOrder = []; })}><div>＋</div><h3>Blank canvas</h3><p>No template. Your rules.</p></button>{PRESETS.filter(p => family === "All templates" || p.family === family).map((p, i) => {
    const t = presetThumbnail(p);
    return <button key={p.id} className={`template-card ${applied === p.id ? "active" : ""}`} onClick={() => edit(`Apply ${p.name} template`, d => { applyPreset(d, p); d.appliedPreset = p.id; d.recipe.unset = []; d.recipe.sectionOrder = SECTION_ORDER.filter(k => d.recipe.components[k] !== "none"); })}><div className={`template-preview template-layout-${i % 3}`} style={{ background: t.background, color: t.primary }}><div className="template-nav"><b>● {p.name.split(" ")[0]}</b><span>About &nbsp; Work &nbsp; Contact ↗</span></div><div className="template-hero"><strong>{["A fresh\nperspective.", "Make room\nfor better.", "Built around\nyour ambition."][i % 3]}</strong><span style={{ background: t.primary, borderRadius: Math.min(40, t.radius * 30) }}>✳</span></div><div className="template-mini-button" style={{ background: t.primary, color: t.background }}>Discover more ↗</div><div className="template-lines"><i/><i/><i/></div></div><div className="template-info"><h3>{p.name}</h3><span>{applied === p.id ? "✓ Selected" : p.family}</span></div><p>{p.description}</p></button>;
  })}</div><details className="advanced-presets"><summary>Saved templates & advanced template tools</summary><PresetBar/></details></>;
}
