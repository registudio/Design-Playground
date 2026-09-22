"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ELEMENTS, elementDocument, elementOrigin } from "@/elements/catalogue";
import { useProjectStore } from "@/store/project-store";
import { ElementsBrowser } from "./ElementsBrowser";
import { pageSections, SECTION_LABELS } from "@/schema/composition";
import type { DesignElement } from "@/registry/schema";
import { ROUTING_CATEGORY_LABELS, REGISTRY_SOURCES, sourceById } from "@/registry/sources";

/**
 * The element library.
 *
 * Two populations live in one grid. The curated elements are authored here, so they can
 * be shown running — a real iframe per card. The registry elements are third-party
 * components, several hundred of them, which the spec's §6 is explicit cannot be
 * previewed: no registry publishes a preview image, so rendering one would mean
 * executing arbitrary third-party React per card. They get a card that leads with what
 * the registry does tell us and links to the source's own docs.
 *
 * Keeping them in one grid rather than behind a separate "browse registries" door is
 * the point: the registries are where nearly everything actually is, and a library that
 * showed twelve of four hundred and forty-eight was hiding its own contents.
 */

/** One row of the grid, from either population. */
type LibraryItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  preview: boolean;
  /** Curated entries carry a tag; registry entries carry their source. */
  tag?: string;
  registry?: DesignElement;
};

/** Rendered per scroll batch. Large enough to fill a tall screen, small enough to stay cheap. */
const BATCH = 36;

export function ElementLibrary({ exploring = false, onCreate }: { exploring?: boolean; onCreate?: () => void }) {
  const project = useProjectStore(s => s.project);
  const edit = useProjectStore(s => s.edit);
  const loadRegistry = useProjectStore(s => s.loadRegistry);
  const registry = useProjectStore(s => s.registry);
  const registryState = useProjectStore(s => s.registryState);
  const selectElement = useProjectStore(s => s.selectElement);
  const deselectElement = useProjectStore(s => s.deselectElement);
  const advanced = useProjectStore(s => s.advanced);
  const searchRef = useRef<HTMLInputElement>(null);

  // Loaded here rather than only when the registry overlay opens: these entries are now
  // most of the grid, so waiting for a click would show a near-empty library.
  useEffect(() => { void loadRegistry(); }, [loadRegistry]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey || (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable]"))) return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const [category, setCategory] = useState("All elements");
  const [source, setSource] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);
  const [registryOpen, setRegistryOpen] = useState(false);
  const [inspecting, setInspecting] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [replay, setReplay] = useState(0);
  const [visible, setVisible] = useState(BATCH);

  const selected = exploring ? [] : project?.recipe.elements ?? [];
  const picked = exploring ? [] : project?.selections ?? [];

  const items = useMemo<LibraryItem[]>(() => [
    ...ELEMENTS.map(e => ({ id: e.id, title: e.title, description: e.description, category: e.category, tag: e.tag, preview: true })),
    ...registry.elements.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      category: ROUTING_CATEGORY_LABELS[e.category],
      preview: false,
      registry: e,
    })),
  ], [registry.elements]);

  const categories = useMemo(
    () => ["All elements", ...new Set(items.map(i => i.category))],
    [items],
  );

  const isSelected = (item: LibraryItem) =>
    item.registry ? picked.some(s => s.id === item.id) : selected.some(s => s.id === item.id);

  const results = useMemo(() => {
    const text = query.trim().toLowerCase();
    return items.filter(item =>
      (category === "All elements" || category === item.category) &&
      (!source || item.registry?.source === source) &&
      (!text || `${item.title} ${item.description} ${item.category}`.toLowerCase().includes(text)) &&
      (!onlySelected || isSelected(item)));
  }, [items, category, source, query, onlySelected, selected, picked]);

  // Any change to the filters starts the list again from the top, so you never land
  // mid-way through a result set you have not scrolled.
  useEffect(() => { setVisible(BATCH); }, [category, source, query, onlySelected]);

  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    // rootMargin lets the next batch land before the sentinel is actually reached, so
    // scrolling stays continuous rather than stepping.
    const observer = new IntersectionObserver(
      entries => { if (entries[0]?.isIntersecting) setVisible(v => Math.min(v + BATCH, results.length)); },
      { rootMargin: "600px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [results.length]);

  const shown = results.slice(0, visible);
  const active = ELEMENTS.find(e => e.id === inspecting);
  useEffect(() => { if (!active) return; const key = (e: KeyboardEvent) => { if (e.key === "Escape") setInspecting(null); }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, [active]);

  const toggle = (item: LibraryItem) => {
    if (exploring || !project) { onCreate?.(); return; }
    if (item.registry) {
      if (picked.some(s => s.id === item.id)) deselectElement(item.id);
      else selectElement(item.registry);
      return;
    }
    edit(`Toggle ${item.title}`, d => {
      const elements = d.recipe.elements ?? [];
      d.recipe.elements = elements.some(e => e.id === item.id) ? elements.filter(e => e.id !== item.id) : [...elements, { id: item.id, note: "", placement: pageSections(d.recipe)[0] ?? "page" }];
    });
  };

  const totalSelected = selected.length + picked.length;

  return <>
    <div className="library-heading"><div><div className="eyebrow">THE GOOD STUFF</div><h1>Small details.<br className="mobile-break" /> Big possibilities<span className="lime">.</span></h1><p>Motion, interactions, and a little unexpected delight. Find your next signature detail.</p></div><span className="collection-stamp"><span>✳</span> A collection<br/>for the curious.</span></div>
    <div className="library-toolbar"><label className="search-field"><span>⌕</span><input ref={searchRef} aria-label="Search curated elements" placeholder="Find your next idea…" value={query} onChange={e => setQuery(e.target.value)}/><kbd>/</kbd></label><button className="quiet-button" onClick={() => setPaused(!paused)}>{paused ? "▶ Play previews" : "Ⅱ Pause previews"}</button><button className="quiet-button" onClick={() => setRegistryOpen(true)}>Registry detail ↗</button></div>
    <div className="filter-row">{categories.map(c => <button key={c} className={category === c ? "active" : ""} onClick={() => setCategory(c)}>{c}{c === "All elements" && <span>{items.length}</span>}</button>)}{!exploring && <button className={onlySelected ? "active" : ""} onClick={() => setOnlySelected(!onlySelected)}>Selected · {totalSelected}</button>}</div>
    <div className="filter-row source-row"><button className={!source ? "active" : ""} onClick={() => setSource(null)}>Every source</button>{REGISTRY_SOURCES.map(s => <button key={s.id} className={source === s.id ? "active" : ""} onClick={() => setSource(source === s.id ? null : s.id)}>{s.label}<span>{registry.elements.filter(e => e.source === s.id).length}</span></button>)}</div>
    <div className="gallery-meta"><span>{results.length} elements to explore{registryState === "loading" && " · loading the registries…"}</span><span>LIVE PREVIEWS <i/> HOVER. SCROLL. PLAY.</span></div>

    <div className="element-grid">{shown.map((item, index) => {
      const chosen = isSelected(item);
      const note = item.registry ? picked.find(s => s.id === item.id) : selected.find(s => s.id === item.id);
      return <article className={`element-card ${chosen ? "is-selected" : ""}`} key={item.id}>
        <div className="element-canvas">
          <span className="canvas-tag">{item.tag ?? sourceById(item.registry!.source)?.label}</span>
          {item.preview
            ? (paused
                ? <button className="paused-demo" onClick={() => setPaused(false)}>▶<span>{item.title}</span></button>
                : <iframe title={`${item.title} live preview`} sandbox="allow-scripts" srcDoc={elementDocument(item.id)} loading={index < 6 ? "eager" : "lazy"}/>)
            : <RegistryCanvas element={item.registry!}/>}
          {item.preview && <button className="expand-demo" aria-label={`Expand ${item.title}`} onClick={() => setInspecting(item.id)}>↗</button>}
        </div>
        <div className="element-caption"><div><h3>{item.title}</h3><span>{item.category}</span></div><button className={`add-element ${chosen ? "added" : ""}`} aria-label={`${chosen ? "Remove" : "Add"} ${item.title}`} onClick={() => toggle(item)}>{chosen ? "✓" : "+"}</button></div>
        {item.registry
          ? <div className="element-origin"><span className="registry-source-badge" title="Installed from a third-party registry at build time">↗ {sourceById(item.registry.source)?.label}</span><small>{item.registry.referenceOnly ? "REFERENCE ONLY" : item.registry.engineDependency.length ? item.registry.engineDependency.join(" + ").toUpperCase() : "NO ENGINE"}</small></div>
          : <div className="element-origin"><span title="Authored for this playground; included as source in your export">✳ {elementOrigin(item.id).name}</span><small>{elementOrigin(item.id).runtime}</small></div>}
        {advanced && item.registry && <ElementAdvanced element={item.registry} selected={chosen}/>}
        {chosen && note && "note" in note && <div className="element-note"><textarea aria-label={`Note for ${item.title}`} placeholder="Add a note… What do you have in mind?" value={note.note} onChange={e => edit(`Note for ${item.title}`, d => { const s = d.recipe.elements?.find(s => s.id === item.id); if (s) s.note = e.target.value; }, `element-note:${item.id}`)}/><label>Place after <select aria-label={`Placement for ${item.title}`} value={note.placement} onChange={e => edit(`Place ${item.title}`, d => { const s = d.recipe.elements?.find(s => s.id === item.id); if (s) s.placement = e.target.value; })}><option value="page">End of page</option>{project && pageSections(project.recipe).map(k => <option value={k} key={k}>{SECTION_LABELS[k]}</option>)}</select></label></div>}
        {chosen && note && "intendedUse" in note && <div className="element-note"><textarea aria-label={`Note for ${item.title}`} placeholder="What's it for? e.g. hero headline reveal" value={note.intendedUse} onChange={e => useProjectStore.getState().setIntendedUse(item.id, e.target.value)}/></div>}
      </article>;
    })}</div>

    {/* Watched rather than a "load more" button: scrolling is already the gesture for
        "show me more of this", and 448 cards mounted at once would be a stutter. */}
    {visible < results.length && <div ref={sentinel} className="grid-sentinel">Loading more elements… <span>{visible} of {results.length}</span></div>}

    {!results.length && <div className="empty-state"><h2>No elements here yet.</h2><p>{registry.elements.length === 0 ? "The registry index hasn't been fetched yet. Open Registry detail to pull it in." : "Try another search or add something to your collection."}</p><button className="quiet-button" onClick={() => { setQuery(""); setCategory("All elements"); setSource(null); setOnlySelected(false); }}>Reset filters</button></div>}
    <div className="library-footer"><span>Made to be explored. Built to be yours.</span><span>✳ DESIGN PLAYGROUND</span></div>
    {registryOpen && <ElementsBrowser readOnly={exploring} onClose={() => setRegistryOpen(false)}/>}
    {active && <div className="studio-overlay" onClick={() => setInspecting(null)}><div className="demo-dialog" role="dialog" aria-modal="true" aria-label={active.title} onClick={e => e.stopPropagation()}><header><div><h2>{active.title}</h2><p>{active.description}</p><p className="demo-origin">Source: {elementOrigin(active.id).name} · {elementOrigin(active.id).runtime}</p></div><button autoFocus className="quiet-button" onClick={() => setInspecting(null)}>Close ×</button></header><iframe key={replay} title={`${active.title} expanded preview`} sandbox="allow-scripts" srcDoc={elementDocument(active.id)}/><footer><button className="quiet-button" onClick={() => setReplay(replay + 1)}>↻ Replay</button><button className="primary-button" onClick={() => toggle({ id: active.id, title: active.title, description: active.description, category: active.category, preview: true })}>{selected.some(s => s.id === active.id) ? "Remove from project" : exploring ? "Create a project to use this →" : "Add to project +"}</button></footer></div></div>}
  </>;
}

/**
 * Stands in for the live preview a registry component cannot have.
 *
 * Rather than an apologetic blank, it shows what the registry does give us — the
 * dependencies it pulls in and the command that installs it — so the card still
 * answers "is this the one I want?" as far as the data allows.
 */
function RegistryCanvas({ element }: { element: DesignElement }) {
  const source = sourceById(element.source);
  return <div className="registry-canvas">
    <span className="registry-glyph">↗</span>
    <p>{element.description || "No description published."}</p>
    <div className="registry-deps">{element.npmDependencies.slice(0, 3).map(d => <i key={d}>{d}</i>)}{element.npmDependencies.length > 3 && <i>+{element.npmDependencies.length - 3}</i>}</div>
    {source && <a href={source.homepage} target="_blank" rel="noreferrer noopener" onClick={e => e.stopPropagation()}>See it on {source.label} ↗</a>}
  </div>;
}

/**
 * Advanced detail for a registry element: what it will install, and which variant.
 *
 * The variant picker answers the spec's own open question — whether React Bits' four
 * published variants ever matter here — by making it a choice rather than a guess. The
 * default stays TypeScript + Tailwind, which is what this scaffold uses; the others are
 * there for the case the question was raised for, a consumer that is not on Tailwind.
 * It only appears once an element is selected, because there is nothing to change the
 * variant of until then.
 */
function ElementAdvanced({ element, selected }: { element: DesignElement; selected: boolean }) {
  const stored = useProjectStore(s => s.project?.selections.find(sel => sel.id === element.id));
  const setSelectionVariant = useProjectStore(s => s.setSelectionVariant);
  const [copied, setCopied] = useState(false);
  const command = stored?.installCommand ?? element.installCommand;
  const current = stored?.variant ?? element.variant;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard access can be refused; the command stays visible and selectable.
    }
  };

  return <div className="element-advanced">
    <code>{command}</code>
    <div className="element-advanced-row">
      <button type="button" onClick={() => void copy()} aria-label={`Copy install command for ${element.title}`}>{copied ? "Copied" : "Copy"}</button>
      {element.registryDependencies.length > 0 && <small>needs {element.registryDependencies.join(", ")}</small>}
    </div>
    {selected && element.availableVariants.length > 1 && <div className="variant-picker">
      {element.availableVariants.map(variant => {
        const active = current?.language === variant.language && current?.styling === variant.styling;
        return <button
          key={`${variant.language}-${variant.styling}`}
          type="button"
          aria-pressed={active}
          className={active ? "active" : ""}
          onClick={() => setSelectionVariant(element.id, variant)}
        >{variant.language}/{variant.styling}</button>;
      })}
    </div>}
  </div>;
}
