"use client";

import { useEffect, useState } from "react";
import { ELEMENTS, elementDocument, elementOrigin } from "@/elements/catalogue";
import { useProjectStore } from "@/store/project-store";
import { ElementsBrowser } from "./ElementsBrowser";
import { pageSections, SECTION_LABELS } from "@/schema/composition";

export function ElementLibrary({ exploring = false, onCreate }: { exploring?: boolean; onCreate?: () => void }) {
  const project = useProjectStore(s => s.project);
  const edit = useProjectStore(s => s.edit);
  const loadRegistry = useProjectStore(s => s.loadRegistry);
  const [category, setCategory] = useState("All elements");
  const [query, setQuery] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);
  const [registryOpen, setRegistryOpen] = useState(false);
  const [inspecting, setInspecting] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [replay, setReplay] = useState(0);
  const selected = exploring ? [] : project?.recipe.elements ?? [];
  const categories = ["All elements", ...new Set(ELEMENTS.map(e => e.category))];
  const items = ELEMENTS.filter(e => (category === "All elements" || category === e.category) && `${e.title} ${e.description} ${e.category}`.toLowerCase().includes(query.toLowerCase()) && (!onlySelected || selected.some(s => s.id === e.id)));
  const active = ELEMENTS.find(e => e.id === inspecting);
  useEffect(() => { if (!active) return; const key = (e: KeyboardEvent) => { if (e.key === "Escape") setInspecting(null); }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, [active]);
  const toggle = (id: string) => {
    if (exploring || !project) { onCreate?.(); return; }
    edit(`Toggle ${ELEMENTS.find(e => e.id === id)?.title}`, d => {
      const elements = d.recipe.elements ?? [];
      d.recipe.elements = elements.some(e => e.id === id) ? elements.filter(e => e.id !== id) : [...elements, { id, note: "", placement: pageSections(d.recipe)[0] ?? "page" }];
    });
  };
  return <>
    <div className="library-heading"><div><div className="eyebrow">THE GOOD STUFF</div><h1>Small details.<br className="mobile-break" /> Big possibilities<span className="lime">.</span></h1><p>Motion, interactions, and a little unexpected delight. Find your next signature detail.</p></div><span className="collection-stamp"><span>✳</span> A collection<br/>for the curious.</span></div>
    <div className="library-toolbar"><label className="search-field"><span>⌕</span><input aria-label="Search curated elements" placeholder="Find your next idea…" value={query} onChange={e => setQuery(e.target.value)}/><kbd>/</kbd></label><button className="quiet-button" onClick={() => setPaused(!paused)}>{paused ? "▶ Play previews" : "Ⅱ Pause previews"}</button><button className="quiet-button" onClick={() => { void loadRegistry(); setRegistryOpen(true); }}>Browse registries ↗</button></div>
    <div className="filter-row">{categories.map(c => <button key={c} className={category === c ? "active" : ""} onClick={() => setCategory(c)}>{c}{c === "All elements" && <span>{ELEMENTS.length}</span>}</button>)}{!exploring && <button className={onlySelected ? "active" : ""} onClick={() => setOnlySelected(!onlySelected)}>Selected · {selected.length}</button>}</div>
    <div className="gallery-meta"><span>{items.length} elements to explore</span><span>LIVE PREVIEWS <i/> HOVER. SCROLL. PLAY.</span></div>
    <div className="element-grid">{items.map((item, index) => {
      const selection = selected.find(s => s.id === item.id);
      return <article className={`element-card ${selection ? "is-selected" : ""}`} key={item.id}>
        <div className="element-canvas"><span className="canvas-tag">{item.tag}</span>{paused ? <button className="paused-demo" onClick={() => setPaused(false)}>▶<span>{item.title}</span></button> : <iframe title={`${item.title} live preview`} sandbox="allow-scripts" srcDoc={elementDocument(item.id)} loading={index < 6 ? "eager" : "lazy"}/>}<button className="expand-demo" aria-label={`Expand ${item.title}`} onClick={() => setInspecting(item.id)}>↗</button></div>
        <div className="element-caption"><div><h3>{item.title}</h3><span>{item.category}</span></div><button className={`add-element ${selection ? "added" : ""}`} aria-label={`${selection ? "Remove" : "Add"} ${item.title}`} onClick={() => toggle(item.id)}>{selection ? "✓" : "+"}</button></div>
        <div className="element-origin"><span title="Authored for this playground; included as source in your export">✳ {elementOrigin(item.id).name}</span><small>{elementOrigin(item.id).runtime}</small></div>
        {selection && <div className="element-note"><textarea aria-label={`Note for ${item.title}`} placeholder="Add a note… What do you have in mind?" value={selection.note} onChange={e => edit(`Note for ${item.title}`, d => { const s = d.recipe.elements?.find(s => s.id === item.id); if (s) s.note = e.target.value; }, `element-note:${item.id}`)}/><label>Place after <select aria-label={`Placement for ${item.title}`} value={selection.placement} onChange={e => edit(`Place ${item.title}`, d => { const s = d.recipe.elements?.find(s => s.id === item.id); if (s) s.placement = e.target.value; })}><option value="page">End of page</option>{project && pageSections(project.recipe).map(k => <option value={k} key={k}>{SECTION_LABELS[k]}</option>)}</select></label></div>}
      </article>;
    })}</div>
    {!items.length && <div className="empty-state"><h2>No elements here yet.</h2><p>Try another search or add something to your collection.</p><button className="quiet-button" onClick={() => { setQuery(""); setCategory("All elements"); setOnlySelected(false); }}>Reset filters</button></div>}
    <div className="library-footer"><span>Made to be explored. Built to be yours.</span><span>✳ DESIGN PLAYGROUND</span></div>
    {registryOpen && <ElementsBrowser readOnly={exploring} onClose={() => setRegistryOpen(false)}/>}
    {active && <div className="studio-overlay" onClick={() => setInspecting(null)}><div className="demo-dialog" role="dialog" aria-modal="true" aria-label={active.title} onClick={e => e.stopPropagation()}><header><div><h2>{active.title}</h2><p>{active.description}</p></div><button autoFocus className="quiet-button" onClick={() => setInspecting(null)}>Close ×</button></header><iframe key={replay} title={`${active.title} expanded preview`} sandbox="allow-scripts" srcDoc={elementDocument(active.id)}/><footer><button className="quiet-button" onClick={() => setReplay(replay + 1)}>↻ Replay</button><button className="primary-button" onClick={() => toggle(active.id)}>{selected.some(s => s.id === active.id) ? "Remove from project" : exploring ? "Create a project to use this →" : "Add to project +"}</button></footer></div></div>}
  </>;
}
