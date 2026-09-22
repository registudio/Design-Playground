"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ELEMENTS, elementDocument, elementOrigin } from "@/elements/catalogue";
import { useProjectStore } from "@/store/project-store";
import { ElementsBrowser } from "./ElementsBrowser";
import { pageSections, SECTION_LABELS } from "@/schema/composition";
import type { DesignElement } from "@/registry/schema";
import { REGISTRY_SOURCES, sourceById } from "@/registry/sources";
import { BROWSE_CATEGORIES, browseCategory } from "@/elements/taxonomy";
import { describeElement } from "@/elements/descriptions";
import { RegistryPreview } from "./RegistryPreview";
import {
  advanceCatalogueWindow,
  CATALOGUE_BATCH,
  NARROW_SEARCH_LIMIT,
  retreatCatalogueWindow,
  SEARCH_DEBOUNCE_MS,
} from "@/elements/preview-budget";

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

/** Source id for the authored elements, which have no registry behind them. */
const ORIGINALS = "playground";

/** The catalogue scrolls inside the studio main area rather than the browser window. */
function scrollRoot(node: HTMLElement): HTMLElement | null {
  for (let parent = node.parentElement; parent; parent = parent.parentElement) {
    const overflow = getComputedStyle(parent).overflowY;
    if (overflow === "auto" || overflow === "scroll") return parent;
  }
  return null;
}

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
  /**
   * The text actually filtered on, one beat behind the input.
   *
   * Filtering 490 entries, resetting the batch and re-running the facet counts on every
   * keystroke is wasted work, and the eager-preview rule made it worse: passing through
   * eight-or-fewer results mid-word kicked off compile requests for components the user
   * was still typing past. `settled` is what gates that, so a preview only starts once
   * the query has stopped moving.
   */
  const [settledQuery, setSettledQuery] = useState("");
  const settled = settledQuery === query;
  const [onlySelected, setOnlySelected] = useState(false);
  const [registryOpen, setRegistryOpen] = useState(false);
  const [inspecting, setInspecting] = useState<string | null>(null);
  /**
   * The registry element being shown full size.
   *
   * Only the authored originals could be expanded, so on a grid where most cards are
   * registry components the affordance appeared to work at random — present on some
   * cards, missing on others, with nothing to explain the difference.
   */
  const [expanded, setExpanded] = useState<DesignElement | null>(null);
  const [paused, setPaused] = useState(false);
  const [compact, setCompact] = useState(false);
  const [collection, setCollection] = useState("All collections");
  const [replay, setReplay] = useState(0);
  /** Inclusive/exclusive mounted range. Both edges move so it always stays bounded. */
  const [cardWindow, setCardWindow] = useState({ start: 0, end: CATALOGUE_BATCH });
  /** Measured from live cards, so the spacers match whatever the grid is actually doing. */
  const [rowHeight, setRowHeight] = useState(0);
  const [columns, setColumns] = useState(3);
  const grid = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSettledQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const selected = exploring ? [] : project?.recipe.elements ?? [];
  const picked = exploring ? [] : project?.selections ?? [];

  const items = useMemo<LibraryItem[]>(() => {
    const all: LibraryItem[] = [
      ...ELEMENTS.map(e => ({ id: e.id, title: e.title, description: e.description, category: e.category, tag: e.tag, preview: true })),
      ...registry.elements.map(e => ({
        id: e.id,
        title: e.title,
        // Filled in where the publisher left it blank or wrote build boilerplate.
        description: describeElement(e),
        // Browsed by subject rather than by publisher — see elements/taxonomy.ts.
        category: browseCategory(e),
        preview: false,
        registry: e,
      })),
    ];
    // Grouped by category, originals leading each group. Listing all the originals
    // first instead would mean scrolling past 54 cards before meeting a single registry
    // component, which made "All elements" look like a gallery of our own work.
    const rank = new Map(BROWSE_CATEGORIES.map((c, i) => [c as string, i]));
    return all.sort((a, b) =>
      (rank.get(a.category) ?? 99) - (rank.get(b.category) ?? 99) ||
      Number(b.preview) - Number(a.preview) ||
      a.title.localeCompare(b.title));
  }, [registry.elements]);

  // Ordered by the taxonomy rather than by first appearance, so the chip row does not
  // reshuffle as the registry loads, and only categories that actually have entries show.
  const categories = useMemo(() => {
    const present = new Set(items.map(i => i.category));
    return ["All elements", ...BROWSE_CATEGORIES.filter(c => present.has(c))];
  }, [items]);

  const isSelected = (item: LibraryItem) =>
    item.registry ? picked.some(s => s.id === item.id) : selected.some(s => s.id === item.id);

  const results = useMemo(() => {
    const text = settledQuery.trim().toLowerCase();
    return items.filter(item =>
      (collection === "All collections" ||
        (collection === "Hero effects" && ["Text animations", "Backgrounds"].includes(item.category)) ||
        (collection === "Subtle interactions" && ["Hover effects", "Buttons & inputs"].includes(item.category)) ||
        (collection === "Lightweight originals" && item.preview && /CSS/.test(elementOrigin(item.id).runtime)) ||
        (collection === "Mobile starting points" && item.preview && ["Text animations", "Loaders & feedback"].includes(item.category))) &&
      (category === "All elements" || category === item.category) &&
      (!source || (source === ORIGINALS ? !item.registry : item.registry?.source === source)) &&
      (!text || `${item.title} ${item.description} ${item.category} ${item.registry?.name ?? ""} ${item.registry?.installCommand ?? ""} ${item.registry?.npmDependencies.join(" ") ?? ""}`.toLowerCase().includes(text)) &&
      (!(onlySelected || compact) || isSelected(item)));
  }, [items, category, source, settledQuery, onlySelected, compact, collection, selected, picked]);

  // Any change to the filters starts the list again from the top, so you never land
  // mid-way through a result set you have not scrolled.
  useEffect(() => {
    setCardWindow({ start: 0, end: CATALOGUE_BATCH });
    const root = grid.current ? scrollRoot(grid.current) : null;
    root?.scrollTo({ top: 0, behavior: "auto" });
  }, [category, source, settledQuery, onlySelected, compact, collection]);

  const sentinel = useRef<HTMLDivElement>(null);
  const farSentinel = useRef<HTMLDivElement>(null);
  const topSentinel = useRef<HTMLDivElement>(null);
  const farTopSentinel = useRef<HTMLDivElement>(null);

  // Measured rather than assumed: the grid is responsive, so a hard-coded row height
  // would make the spacers wrong at exactly the widths where they matter most.
  useEffect(() => {
    const node = grid.current;
    const card = node?.firstElementChild as HTMLElement | null;
    if (!node || !card) return;
    const measure = () => {
      const styles = getComputedStyle(node);
      const cols = styles.gridTemplateColumns.split(" ").filter(Boolean).length || 1;
      const gap = Number.parseFloat(styles.rowGap) || 0;
      setColumns(cols);
      setRowHeight(card.offsetHeight + gap);
    };
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(node);
    return () => resize.disconnect();
  }, [cardWindow.end, cardWindow.start]);

  useEffect(() => {
    const node = sentinel.current;
    const farNode = farSentinel.current;
    if (!node) return;
    // rootMargin lets the next batch land before the sentinel is reached, so scrolling
    // stays continuous rather than stepping.
    const observer = new IntersectionObserver(
      entries => {
        const intersecting = entries.filter(entry => entry.isIntersecting);
        if (!intersecting.length) return;
        const jumpedToEnd = farNode ? intersecting.some(entry => entry.target === farNode) : false;
        setCardWindow(current => advanceCatalogueWindow(current, results.length, jumpedToEnd));
      },
      { root: scrollRoot(node), rootMargin: "600px" },
    );
    observer.observe(node);
    if (farNode) observer.observe(farNode);
    return () => observer.disconnect();
  }, [results.length, cardWindow.end, rowHeight]);

  // Scrolling back up re-mounts what the window dropped.
  useEffect(() => {
    const node = topSentinel.current;
    const farNode = farTopSentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      entries => {
        const intersecting = entries.filter(entry => entry.isIntersecting);
        if (!intersecting.length) return;
        const jumpedToStart = farNode ? intersecting.some(entry => entry.target === farNode) : false;
        setCardWindow(current => retreatCatalogueWindow(current, results.length, jumpedToStart));
      },
      { root: scrollRoot(node), rootMargin: "600px" },
    );
    observer.observe(node);
    if (farNode) observer.observe(farNode);
    return () => observer.disconnect();
  }, [results.length, cardWindow.start, rowHeight]);

  const shown = results.slice(cardWindow.start, cardWindow.end);
  // Spacers stand in for the rows either side of the window so the scrollbar keeps
  // describing the whole result set rather than just the mounted part.
  const rowsAbove = Math.ceil(cardWindow.start / columns);
  const rowsBelow = Math.ceil(Math.max(0, results.length - cardWindow.end) / columns);
  const active = ELEMENTS.find(e => e.id === inspecting);
  useEffect(() => { if (!active) return; const key = (e: KeyboardEvent) => { if (e.key === "Escape") setInspecting(null); }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, [active]);
  useEffect(() => { if (!expanded) return; const key = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(null); }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, [expanded]);

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
    <div className="filter-row source-row"><button className={!source ? "active" : ""} onClick={() => setSource(null)}>Every source</button><button className={source === ORIGINALS ? "active" : ""} onClick={() => setSource(source === ORIGINALS ? null : ORIGINALS)}>Playground originals<span>{ELEMENTS.length}</span></button>{REGISTRY_SOURCES.map(s => <button key={s.id} className={source === s.id ? "active" : ""} onClick={() => setSource(source === s.id ? null : s.id)}>{s.label}<span>{registry.elements.filter(e => e.source === s.id).length}</span></button>)}</div>
    <div className="filter-row" aria-label="Curated collections">{["All collections", "Hero effects", "Subtle interactions", "Lightweight originals", "Mobile starting points"].map(label => <button key={label} className={collection === label ? "active" : ""} onClick={() => setCollection(label)}>{label}</button>)}{!exploring && <button aria-pressed={compact} onClick={() => setCompact(!compact)}>{compact ? "Back to library" : "Compact selected previews"}</button>}</div>
    {compact && !results.length && <p>Select elements in the library to view them together here. Clear any source or collection filters to show more selections.</p>}
    <div className="gallery-meta"><span>{results.length} elements to explore{registryState === "loading" && " · loading the registries…"}</span><span>LIVE PREVIEWS <i/> HOVER. SCROLL. PLAY.</span></div>

    {cardWindow.start > 0 && <>
      {rowHeight > 0 && <div ref={farTopSentinel} className="grid-edge-sentinel" aria-hidden="true" />}
      <div className="grid-spacer" style={{ height: rowsAbove * rowHeight }} aria-hidden="true" />
      <div ref={topSentinel} className="grid-edge-sentinel" aria-hidden="true" />
    </>}
    <div className={`element-grid ${compact ? "compact-previews" : ""}`} ref={grid}>{shown.map((item, index) => {
      const chosen = isSelected(item);
      const note = item.registry ? picked.find(s => s.id === item.id) : selected.find(s => s.id === item.id);
      return <article className={`element-card ${chosen ? "is-selected" : ""}`} key={item.id}>
        <div className="element-canvas">
          <span className="canvas-tag">{item.tag ?? sourceById(item.registry!.source)?.label}</span>
          {item.preview
            ? (paused
                ? <button className="paused-demo" onClick={() => setPaused(false)}>▶<span>{item.title}</span></button>
                : <iframe title={`${item.title} live preview`} sandbox="allow-scripts" srcDoc={elementDocument(item.id)} loading={index < 6 ? "eager" : "lazy"}/>)
            : <RegistryPreview element={item.registry!} paused={paused} eager={!paused && settled && results.length <= NARROW_SEARCH_LIMIT} onExpand={() => setExpanded(item.registry!)}/>}
          {item.preview && <button className="expand-demo" aria-label={`Expand ${item.title}`} onClick={() => setInspecting(item.id)}>↗</button>}
        </div>
        <div className="element-caption"><div><h3>{item.title}</h3><span>{item.category}</span></div><button className={`add-element ${chosen ? "added" : ""}`} aria-label={`${chosen ? "Remove" : "Add"} ${item.title}`} onClick={() => toggle(item)}>{chosen ? "✓" : "+"}</button></div>
        {item.registry
          ? <div className="element-origin"><span className="registry-source-badge" title="Installed from a third-party registry at build time">↗ {sourceById(item.registry.source)?.label}</span><small>{item.registry.referenceOnly ? "REFERENCE ONLY" : item.registry.engineDependency.length ? item.registry.engineDependency.join(" + ").toUpperCase() : "NO ENGINE"}</small></div>
          : <div className="element-origin"><span title="Authored for this playground; included as source in your export">✳ {elementOrigin(item.id).name}</span><small>{elementOrigin(item.id).runtime}</small></div>}
        {advanced && item.registry && <ElementAdvanced element={item.registry} selected={chosen}/>}
        {chosen && note && "note" in note && <div className="element-note"><textarea aria-label={`Note for ${item.title}`} placeholder="Add a note… What do you have in mind?" value={note.note} onChange={e => edit(`Note for ${item.title}`, d => { const s = d.recipe.elements?.find(s => s.id === item.id); if (s) s.note = e.target.value; }, `element-note:${item.id}`)}/><label>Place after <select aria-label={`Placement for ${item.title}`} value={note.placement} onChange={e => edit(`Place ${item.title}`, d => { const s = d.recipe.elements?.find(s => s.id === item.id); if (s) s.placement = e.target.value; })}><option value="page">End of page</option>{project && pageSections(project.recipe).map(k => <option value={k} key={k}>{SECTION_LABELS[k]}</option>)}</select></label></div>}
        {chosen && note && "intendedUse" in note && <div className="element-note"><textarea aria-label={`Note for ${item.title}`} placeholder="What's it for? e.g. hero headline reveal" value={note.intendedUse} onChange={e => useProjectStore.getState().setIntendedUse(item.id, e.target.value)}/><label>Place after <select aria-label={`Placement for ${item.title}`} value={note.placement} onChange={e => useProjectStore.getState().setSelectionPlacement(item.id, e.target.value)}><option value="page">End of page</option>{project && pageSections(project.recipe).map(k => <option value={k} key={k}>{SECTION_LABELS[k]}</option>)}</select></label></div>}
      </article>;
    })}</div>

    {/* Watched rather than a "load more" button: scrolling is already the gesture for
        "show me more of this", and 448 cards mounted at once would be a stutter. */}
    {cardWindow.end < results.length && <>
      {/* The near sentinel fills the next batch before normal scrolling reaches the
          spacer. The far sentinel handles an End-key or scrollbar jump in one update. */}
      <div ref={sentinel} className="grid-sentinel">Loading more elements… <span>{cardWindow.end} of {results.length}</span></div>
      <div className="grid-spacer" style={{ height: rowsBelow * rowHeight }} aria-hidden="true" />
      {rowHeight > 0 && <div ref={farSentinel} className="grid-edge-sentinel" aria-hidden="true" />}
    </>}

    {!results.length && <div className="empty-state"><h2>No elements here yet.</h2><p>{registry.elements.length === 0 ? "The registry index hasn't been fetched yet. Open Registry detail to pull it in." : "Try another search or add something to your collection."}</p><button className="quiet-button" onClick={() => { setQuery(""); setCategory("All elements"); setSource(null); setOnlySelected(false); }}>Reset filters</button></div>}
    <div className="library-footer"><span>Made to be explored. Built to be yours.</span><span>✳ DESIGN PLAYGROUND</span></div>
    {registryOpen && <ElementsBrowser readOnly={exploring} onClose={() => setRegistryOpen(false)}/>}
    {expanded && <div className="studio-overlay" onClick={() => setExpanded(null)}><div className="demo-dialog" role="dialog" aria-modal="true" aria-label={expanded.title} onClick={e => e.stopPropagation()}>
      <header>
        <div>
          <h2>{expanded.title}</h2>
          <p>{describeElement(expanded)}</p>
          <p className="demo-origin">Source: {sourceById(expanded.source)?.label ?? expanded.source} · {expanded.referenceOnly ? "reference only" : expanded.engineDependency.length ? expanded.engineDependency.join(" + ") : "no engine"}</p>
        </div>
        <button autoFocus className="quiet-button" onClick={() => setExpanded(null)}>Close ×</button>
      </header>
      {/* The same compiled document the card shows, at a size where the component can
          actually lay itself out — several only make sense above a card's height. */}
      <iframe title={`${expanded.title} expanded preview`} sandbox="allow-scripts" src={`/api/element-preview?source=${encodeURIComponent(expanded.source)}&name=${encodeURIComponent(expanded.source === "react-bits" && expanded.variant ? `${expanded.name}-${expanded.variant.language}-${expanded.variant.styling}` : expanded.name)}`}/>
      <footer>
        <a className="quiet-button" href={sourceById(expanded.source)?.homepage ?? "#"} target="_blank" rel="noreferrer noopener">Open {sourceById(expanded.source)?.label} ↗</a>
        <button className="primary-button" onClick={() => { toggle({ id: expanded.id, title: expanded.title, description: expanded.description, category: browseCategory(expanded), preview: false, registry: expanded }); setExpanded(null); }}>{picked.some(s => s.id === expanded.id) ? "Remove from project" : exploring ? "Create a project to use this →" : "Add to project +"}</button>
      </footer>
    </div></div>}
    {active && <div className="studio-overlay" onClick={() => setInspecting(null)}><div className="demo-dialog" role="dialog" aria-modal="true" aria-label={active.title} onClick={e => e.stopPropagation()}><header><div><h2>{active.title}</h2><p>{active.description}</p><p className="demo-origin">Source: {elementOrigin(active.id).name} · {elementOrigin(active.id).runtime}</p></div><button autoFocus className="quiet-button" onClick={() => setInspecting(null)}>Close ×</button></header><iframe key={replay} title={`${active.title} expanded preview`} sandbox="allow-scripts" srcDoc={elementDocument(active.id)}/><footer><button className="quiet-button" onClick={() => setReplay(replay + 1)}>↻ Replay</button><button className="primary-button" onClick={() => toggle({ id: active.id, title: active.title, description: active.description, category: active.category, preview: true })}>{selected.some(s => s.id === active.id) ? "Remove from project" : exploring ? "Create a project to use this →" : "Add to project +"}</button></footer></div></div>}
  </>;
}

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
