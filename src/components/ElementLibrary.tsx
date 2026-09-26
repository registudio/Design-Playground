"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { ELEMENTS, elementDocument, elementOrigin } from "@/elements/catalogue";
import { ENGINE_SOURCES, engineFor } from "@/elements/extended-catalogue";
import { useProjectStore } from "@/store/project-store";
import { ElementsBrowser } from "./ElementsBrowser";
import { pageSections, SECTION_LABELS } from "@/schema/composition";
import type { DesignElement } from "@/registry/schema";
import { REGISTRY_SOURCES, sourceById } from "@/registry/sources";
import { licenceFor, licenceLabel } from "@/registry/licences";
import { BROWSE_CATEGORIES, browseCategory } from "@/elements/taxonomy";
import { describeElement } from "@/elements/descriptions";
import { ALL_TYPES, clearLibraryView, COLLECTIONS, DEFAULT_VIEW, readLibraryView, writeLibraryView, type LibraryView } from "@/elements/library-url";
import { OriginalPreview } from "./OriginalPreview";
import { previewSrc, RegistryPreview } from "./RegistryPreview";
import {
  advanceCatalogueWindow,
  CATALOGUE_BATCH,
  NARROW_SEARCH_LIMIT,
  retreatCatalogueWindow,
  SEARCH_DEBOUNCE_MS,
  windowAround,
} from "@/elements/preview-budget";

/**
 * The element library.
 *
 * Authored demos and third-party registry components share this grid. Authored demos
 * run from local HTML; registry components are compiled into isolated preview frames.
 * Runtime status distinguishes originals from replacement demos and rendering failures.
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
const UTILITIES = "Hooks & utilities";

/** Everything inside a card that Tab would otherwise stop on. */
const CARD_CONTROLS = "a[href],button,input,select,textarea,iframe,[tabindex]";

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
  const controls = useRef<HTMLDivElement>(null);

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

  const [category, setCategory] = useState(DEFAULT_VIEW.category);
  const [source, setSource] = useState<string | null>(DEFAULT_VIEW.source);
  const [query, setQuery] = useState(DEFAULT_VIEW.query);
  /**
   * The text actually filtered on, one beat behind the input.
   *
   * Filtering 490 entries, resetting the batch and re-running the facet counts on every
   * keystroke is wasted work, and the eager-preview rule made it worse: passing through
   * eight-or-fewer results mid-word kicked off compile requests for components the user
   * was still typing past. `settled` is what gates that, so a preview only starts once
   * the query has stopped moving.
   */
  const [settledQuery, setSettledQuery] = useState(DEFAULT_VIEW.query);
  const settled = settledQuery === query;
  const [onlySelected, setOnlySelected] = useState(DEFAULT_VIEW.onlySelected);
  /**
   * Hooks and utilities in the grid. Off by default: they are not visual, so their cards
   * can never show anything, and a tile that never renders reads as a broken one. They
   * stay findable — a search shows them, and so does choosing their type.
   */
  const [utilities, setUtilities] = useState(DEFAULT_VIEW.utilities);
  const [registryOpen, setRegistryOpen] = useState(false);
  /**
   * The element open full screen, original or registry, by id.
   *
   * One value for both kinds, so stepping to the next result can cross from an original
   * to a registry component without closing one view and opening another.
   */
  const [fullId, setFullId] = useState<string | null>(DEFAULT_VIEW.open);
  const [paused, setPaused] = useState(false);
  const [compact, setCompact] = useState(false);
  const [collection, setCollection] = useState<string>(DEFAULT_VIEW.collection);
  const [replay, setReplay] = useState(0);
  /** Inclusive/exclusive mounted range. Both edges move so it always stays bounded. */
  const [cardWindow, setCardWindow] = useState({ start: 0, end: CATALOGUE_BATCH });
  /** Measured from live cards, so the spacers match whatever the grid is actually doing. */
  const [rowHeight, setRowHeight] = useState(0);
  const [columns, setColumns] = useState(3);
  /** The card Tab lands on in the grid: one tab stop for the whole catalogue. */
  const [focusIndex, setFocusIndex] = useState(0);
  const grid = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSettledQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // ---- The view in the URL (elements/library-url.ts) --------------------------------
  //
  // Read after mount rather than during render: the page is prerendered, so the URL is
  // not known on the server and reading it in render would not match on hydration.
  // `urlReady` holds the write-back off until the read has been rendered — written any
  // sooner, the defaults would overwrite the link that was just opened.
  const [urlReady, setUrlReady] = useState(false);
  /** The open full-screen view has a history entry of its own, pushed when it opened. */
  const pushedOpen = useRef(false);
  const applyView = (view: LibraryView) => {
    setQuery(view.query);
    setSettledQuery(view.query);
    setCategory(view.category);
    setSource(view.source);
    setCollection(view.collection);
    setOnlySelected(view.onlySelected);
    setUtilities(view.utilities);
    setFullId(view.open);
  };
  useEffect(() => {
    applyView(readLibraryView(location.search));
    setUrlReady(true);
    const onPop = () => { pushedOpen.current = false; applyView(readLibraryView(location.search)); };
    addEventListener("popstate", onPop);
    return () => {
      removeEventListener("popstate", onPop);
      // Leaving the library: its filters should not follow the user to another step.
      const rest = clearLibraryView(location.search);
      if (rest !== location.search) history.replaceState(null, "", `${location.pathname}${rest}${location.hash}`);
    };
    // Mount only: applyView is a fresh closure each render but only calls setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!urlReady) return;
    const next = writeLibraryView({ query: settledQuery, category, source, collection, onlySelected, utilities, open: fullId }, location.search);
    if (next !== location.search) history.replaceState(null, "", `${location.pathname}${next}${location.hash}`);
  }, [urlReady, settledQuery, category, source, collection, onlySelected, utilities, fullId]);

  const openFull = (id: string) => {
    setReplay(0);
    setFullId(id);
    // Its own history entry, so the browser's Back button closes it.
    history.pushState(null, "", `${location.pathname}${writeLibraryView({ ...readLibraryView(location.search), open: id }, location.search)}${location.hash}`);
    pushedOpen.current = true;
  };
  const closeFull = () => {
    if (pushedOpen.current) {
      pushedOpen.current = false;
      history.back();
      return;
    }
    setFullId(null);
  };

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

  // Ordered by the taxonomy rather than by first appearance, so the options do not
  // reshuffle as the registry loads, and only categories that actually have entries show.
  const categories = useMemo(() => {
    const present = new Set(items.map(i => i.category));
    return [ALL_TYPES, ...BROWSE_CATEGORIES.filter(c => present.has(c))];
  }, [items]);

  const isSelected = (item: LibraryItem) =>
    item.registry ? picked.some(s => s.id === item.id) : selected.some(s => s.id === item.id);

  const text = settledQuery.trim().toLowerCase();
  const { results, hiddenUtilities } = useMemo(() => {
    const matching = items.filter(item =>
      (collection === COLLECTIONS[0] ||
        (collection === "Hero effects" && ["Text animations", "Backgrounds"].includes(item.category)) ||
        (collection === "Subtle interactions" && ["Hover effects", "Buttons & inputs"].includes(item.category)) ||
        (collection === "CSS-only originals" && item.preview && elementOrigin(item.id).runtime === "CSS") ||
        (collection === "Text & feedback originals" && item.preview && ["Text animations", "Loaders & feedback"].includes(item.category))) &&
      (category === ALL_TYPES || category === item.category) &&
      (!source || (source === ORIGINALS ? !item.registry && !engineFor(item.id) : item.registry?.source === source || engineFor(item.id)?.id === source)) &&
      (!text || `${item.title} ${item.description} ${item.category} ${item.registry?.name ?? ""} ${item.registry?.installCommand ?? ""} ${item.registry?.npmDependencies.join(" ") ?? ""}`.toLowerCase().includes(text)) &&
      (!(onlySelected || compact) || isSelected(item)));
    // Asked for by name — a search, or their own type — they show regardless.
    const showUtilities = utilities || !!text || category === UTILITIES;
    const shown = showUtilities ? matching : matching.filter(item => item.category !== UTILITIES);
    return { results: shown, hiddenUtilities: matching.length - shown.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, category, source, text, onlySelected, compact, collection, utilities, selected, picked]);
  const resultsRef = useRef(results);
  resultsRef.current = results;

  // Any change to the filters starts the list again from the top, so you never land
  // mid-way through a result set you have not scrolled.
  useEffect(() => {
    setCardWindow({ start: 0, end: CATALOGUE_BATCH });
    setFocusIndex(0);
    const root = grid.current ? scrollRoot(grid.current) : null;
    root?.scrollTo({ top: 0, behavior: "auto" });
  }, [category, source, settledQuery, onlySelected, compact, collection, utilities]);

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

  // The filter bar sticks below the workspace bar, whose height changes when it wraps.
  useEffect(() => {
    const node = controls.current;
    const root = node ? scrollRoot(node) : null;
    const bar = root?.querySelector<HTMLElement>(":scope > .workspace-tools");
    if (!node || !bar) return;
    const place = () => { node.style.top = `${bar.offsetHeight}px`; };
    place();
    const resize = new ResizeObserver(place);
    resize.observe(bar);
    return () => resize.disconnect();
  }, []);

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

  // ---- Keyboard: one tab stop, arrows between cards ----------------------------------
  //
  // Reaching a card partway down used to mean tabbing through every control of every
  // card before it — several hundred stops. The grid is now a single tab stop (a roving
  // tabindex): arrows move between cards, Enter opens one, Space adds it, and Tab from a
  // card goes through that card's own controls and then out of the grid.

  /** Set when focus should land on a card once it is mounted and rendered. */
  const pendingFocus = useRef<number | null>(null);
  const moveFocus = (index: number) => {
    const count = resultsRef.current.length;
    if (!count) return;
    const target = Math.max(0, Math.min(count - 1, index));
    setFocusIndex(target);
    pendingFocus.current = target;
    // Past the mounted rows: mount the ones around it first, as a jump would.
    setCardWindow(current => target >= current.start && target < current.end ? current : windowAround(target, count));
  };
  useEffect(() => {
    const target = pendingFocus.current;
    if (target === null) return;
    const card = grid.current?.querySelector<HTMLElement>(`[data-index="${target}"]`);
    if (!card) return;
    pendingFocus.current = null;
    card.focus({ preventScroll: true });
    card.scrollIntoView({ block: "nearest" });
  });
  // The tab stop has to be a mounted card, or Tab would skip the grid entirely.
  const tabStop = focusIndex >= cardWindow.start && focusIndex < cardWindow.end ? focusIndex : cardWindow.start;

  // Only the tab-stop card's own controls are in the tab order. Its preview mounts and
  // unmounts frames and buttons on its own schedule, hence the observer.
  useEffect(() => {
    const node = grid.current;
    if (!node) return;
    const apply = () => {
      for (const card of node.querySelectorAll<HTMLElement>("article.element-card")) {
        const current = card.tabIndex === 0;
        for (const control of card.querySelectorAll<HTMLElement>(CARD_CONTROLS)) {
          if (current && control.dataset.roving) {
            control.removeAttribute("tabindex");
            delete control.dataset.roving;
          } else if (!current && !control.dataset.roving && control.getAttribute("tabindex") !== "-1") {
            control.dataset.roving = "1";
            control.setAttribute("tabindex", "-1");
          }
        }
      }
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(node, { childList: true, subtree: true });
    return () => observer.disconnect();
  });

  const onGridKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (!target.matches("article.element-card")) {
      // Out of a card's note or placement and back to the card, to carry on moving.
      if (event.key === "Escape" && target.closest("article.element-card")) {
        event.preventDefault();
        target.closest<HTMLElement>("article.element-card")?.focus();
      }
      return;
    }
    const index = Number(target.dataset.index);
    const item = results[index];
    if (!item) return;
    const page = columns * 3;
    const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns, PageDown: page, PageUp: -page };
    if (event.key in moves) moveFocus(index + moves[event.key]);
    else if (event.key === "Home") moveFocus(0);
    else if (event.key === "End") moveFocus(results.length - 1);
    else if (event.key === "Enter") openFull(item.id);
    else if (event.key === " ") toggle(item);
    else return;
    event.preventDefault();
  };

  // ---- Full screen ---------------------------------------------------------------------

  const withVariant = (element: DesignElement): DesignElement =>
    ({ ...element, variant: picked.find(s => s.id === element.id)?.variant ?? element.variant });
  const fullItem = fullId ? items.find(i => i.id === fullId) : undefined;
  const active = fullItem?.preview ? ELEMENTS.find(e => e.id === fullId) : undefined;
  const expanded = fullItem?.registry ? withVariant(fullItem.registry) : null;
  /** Where the open element sits in the current results; -1 if a link opened one outside them. */
  const fullIndex = fullItem ? results.findIndex(i => i.id === fullItem.id) : -1;
  const step = (delta: number) => {
    const next = results[fullIndex + delta];
    if (fullIndex < 0 || !next) return;
    setReplay(0);
    setFullId(next.id);
  };
  // Anything drawn over the whole grid. Its cards cannot be seen, so they give their
  // slots up rather than compete with the view on top for the GPU and the main thread.
  const covered = !!fullItem || registryOpen;

  const isOpen = !!fullItem;
  const beforeOpen = useRef<HTMLElement | null>(null);
  /** The element last shown full screen — stepping may have moved far from where it opened. */
  const lastViewed = useRef<string | null>(null);
  useEffect(() => { if (fullItem) lastViewed.current = fullItem.id; }, [fullItem]);
  useEffect(() => {
    if (isOpen) {
      beforeOpen.current = document.activeElement as HTMLElement | null;
      const trap = (event: KeyboardEvent) => {
        const dialog = document.querySelector<HTMLElement>(".demo-dialog");
        if (!dialog) return;
        if (event.key === "Escape") { closeFull(); return; }
        const typing = event.target instanceof HTMLElement && event.target.closest("input, textarea, select");
        if ((event.key === "ArrowLeft" || event.key === "ArrowRight") && !typing) {
          event.preventDefault();
          stepRef.current(event.key === "ArrowLeft" ? -1 : 1);
          return;
        }
        if (event.key !== "Tab") return;
        const nodes = [...dialog.querySelectorAll<HTMLElement>("button:not(:disabled),a[href],iframe")];
        const first = nodes[0], last = nodes.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      };
      document.addEventListener("keydown", trap);
      return () => document.removeEventListener("keydown", trap);
    }
    // Closed: back to the card of the element last looked at, mounting it if need be.
    const id = lastViewed.current;
    lastViewed.current = null;
    if (!id) return;
    const index = resultsRef.current.findIndex(i => i.id === id);
    if (index >= 0) moveFocus(index);
    else beforeOpen.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
  const stepRef = useRef(step);
  stepRef.current = step;

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
  const resetFilters = () => { setQuery(""); setSource(null); setCategory(ALL_TYPES); setCollection(COLLECTIONS[0]); setOnlySelected(false); setCompact(false); setUtilities(false); };
  const sources = [...REGISTRY_SOURCES, ...ENGINE_SOURCES];
  const sourceLabel = (id: string) => id === ORIGINALS ? "Playground originals" : sources.find(s => s.id === id)?.label ?? id;
  const sourceCount = (id: string) => id === ORIGINALS
    ? ELEMENTS.filter(e => !engineFor(e.id)).length
    : registry.elements.filter(e => e.source === id).length + ELEMENTS.filter(e => engineFor(e.id)?.id === id).length;
  const utilityCount = items.filter(i => i.category === UTILITIES).length;
  const typeCount = (c: string) => c === ALL_TYPES ? items.length - (utilities ? 0 : utilityCount) : items.filter(i => i.category === c).length;
  /** Each filter that is narrowing the grid, as a removable chip. */
  const activeFilters = [
    ...(settledQuery.trim() ? [{ label: `“${settledQuery.trim()}”`, clear: () => setQuery("") }] : []),
    ...(category !== ALL_TYPES ? [{ label: category, clear: () => setCategory(ALL_TYPES) }] : []),
    ...(source ? [{ label: sourceLabel(source), clear: () => setSource(null) }] : []),
    ...(collection !== COLLECTIONS[0] ? [{ label: collection, clear: () => setCollection(COLLECTIONS[0]) }] : []),
    ...(onlySelected ? [{ label: "Selected only", clear: () => setOnlySelected(false) }] : []),
    ...(utilities ? [{ label: "Showing hooks & utilities", clear: () => setUtilities(false) }] : []),
  ];

  const stepper = fullIndex >= 0 && <div className="dialog-stepper" role="group" aria-label="Browse the results">
    <button className="quiet-button" onClick={() => step(-1)} disabled={fullIndex <= 0} aria-label="Previous element" aria-keyshortcuts="ArrowLeft">‹</button>
    <span aria-live="polite">{fullIndex + 1} of {results.length}</span>
    <button className="quiet-button" onClick={() => step(1)} disabled={fullIndex >= results.length - 1} aria-label="Next element" aria-keyshortcuts="ArrowRight">›</button>
  </div>;

  return <>
    <div className="library-heading"><div><div className="eyebrow">THE GOOD STUFF</div><h1>Small details.<br className="mobile-break" /> Big possibilities<span className="lime">.</span></h1><p>Motion, interactions, and a little unexpected delight. Find your next signature detail.</p></div><span className="collection-stamp"><span>✳</span> A collection<br/>for the curious.</span></div>
    {/* Sticky, so narrowing the grid never means scrolling back to the top to do it. */}
    <div className="library-controls" ref={controls}>
      <div className="library-toolbar"><label className="search-field"><span>⌕</span><input ref={searchRef} aria-label="Search curated elements" placeholder="Find your next idea…" value={query} onChange={e => setQuery(e.target.value)}/><kbd>/</kbd></label><button className="quiet-button" onClick={() => setPaused(!paused)}>{paused ? "▶ Play previews" : "Ⅱ Pause previews"}</button><button className="quiet-button" onClick={() => setRegistryOpen(true)}>Registry detail ↗</button></div>
      <div className="library-filterbar" role="group" aria-label="Filter the library">
        <label><span>Type</span><select value={category} onChange={e => setCategory(e.target.value)}>{categories.map(c => <option key={c} value={c}>{c} · {typeCount(c)}</option>)}</select></label>
        <label><span>Source</span><select value={source ?? ""} onChange={e => setSource(e.target.value || null)}>
          <option value="">Every source</option>
          <option value={ORIGINALS}>Playground originals · {sourceCount(ORIGINALS)}</option>
          <optgroup label="Registries">{REGISTRY_SOURCES.map(s => <option key={s.id} value={s.id}>{s.label} · {sourceCount(s.id)}</option>)}</optgroup>
          <optgroup label="Engines">{ENGINE_SOURCES.map(s => <option key={s.id} value={s.id}>{s.label} · {sourceCount(s.id)}</option>)}</optgroup>
        </select></label>
        <label><span>Collection</span><select value={collection} onChange={e => setCollection(e.target.value)}>{COLLECTIONS.map(label => <option key={label} value={label}>{label}</option>)}</select></label>
        {!exploring && <><button className="quiet-button" aria-pressed={onlySelected} onClick={() => setOnlySelected(!onlySelected)}>Selected only · {totalSelected}</button><button className="quiet-button" aria-pressed={compact} onClick={() => setCompact(!compact)}>{compact ? "Back to library" : "Compact selected previews"}</button></>}
      </div>
      {activeFilters.length > 0 && <div className="active-filters" aria-label="Active filters">
        {activeFilters.map(filter => <button key={filter.label} className="filter-chip" onClick={filter.clear} aria-label={`Remove filter: ${filter.label}`}>{filter.label}<span aria-hidden="true">×</span></button>)}
        <button className="quiet-button" onClick={resetFilters}>Reset all filters</button>
      </div>}
    </div>
    {compact && !results.length && <p>Select elements in the library to view them together here. Clear any source or collection filters to show more selections.</p>}
    <div className="gallery-meta" aria-live="polite"><span>{results.length} {results.length === 1 ? "element" : "elements"} to explore{registryState === "loading" && " · loading the registries…"}{hiddenUtilities > 0 && <> · <button className="link-button" onClick={() => setUtilities(true)}>{hiddenUtilities} {hiddenUtilities === 1 ? "hook or utility" : "hooks & utilities"} hidden — show</button></>}</span><span>LIVE PREVIEWS <i/> HOVER. SCROLL. PLAY.</span></div>
    <p id="element-grid-keys" className="sr-only">Arrow keys move between elements, Home and End jump to the first and last, Enter opens one full screen and Space adds it to the project.</p>

    {cardWindow.start > 0 && <>
      {rowHeight > 0 && <div ref={farTopSentinel} className="grid-edge-sentinel" aria-hidden="true" />}
      <div className="grid-spacer" style={{ height: rowsAbove * rowHeight }} aria-hidden="true" />
      <div ref={topSentinel} className="grid-edge-sentinel" aria-hidden="true" />
    </>}
    <div className={`element-grid ${compact ? "compact-previews" : ""}`} ref={grid} role="feed" aria-label="Elements" aria-busy={registryState === "loading"} onKeyDown={onGridKey}>{shown.map((item, offset) => {
      const index = cardWindow.start + offset;
      const chosen = isSelected(item);
      const note = item.registry ? picked.find(s => s.id === item.id) : selected.find(s => s.id === item.id);
      return <article
        className={`element-card ${chosen ? "is-selected" : ""}`}
        key={item.id}
        data-element-id={item.id}
        data-index={index}
        tabIndex={index === tabStop ? 0 : -1}
        aria-label={`${item.title}${chosen ? ", added" : ""}`}
        aria-describedby="element-grid-keys"
        aria-posinset={index + 1}
        aria-setsize={results.length}
        onFocus={() => { if (focusIndex !== index) setFocusIndex(index); }}
      >
        <div className="element-canvas">
          <span className="canvas-tag">{item.tag ?? sourceById(item.registry!.source)?.label}</span>
          {item.preview
            ? <OriginalPreview id={item.id} title={item.title} paused={paused || covered} eager={!paused && settled && results.length <= NARROW_SEARCH_LIMIT} onResume={() => setPaused(false)}/>
            : <RegistryPreview element={withVariant(item.registry!)} paused={paused || covered} eager={!paused && settled && results.length <= NARROW_SEARCH_LIMIT} onExpand={() => openFull(item.id)}/>}
          {item.preview && <button className="expand-demo" aria-label={`Expand ${item.title}`} onClick={() => openFull(item.id)}>↗</button>}
        </div>
        <div className="element-caption"><div><h3>{item.title}</h3><span>{item.category}</span></div><button className={`add-element ${chosen ? "added" : ""}`} aria-label={`${chosen ? "Remove" : "Add"} ${item.title}`} onClick={() => toggle(item)}>{chosen ? "✓" : "+"}</button></div>
        {item.registry
          ? <div className="element-origin"><span className="registry-source-badge" title="Installed from a third-party registry at build time">↗ {sourceById(item.registry.source)?.label}</span><small>{item.registry.referenceOnly ? "REFERENCE ONLY" : item.registry.engineDependency.length ? item.registry.engineDependency.join(" + ").toUpperCase() : "NO ENGINE"}</small></div>
          : <div className="element-origin">{elementOrigin(item.id).url ? <a href={elementOrigin(item.id).url} target="_blank" rel="noreferrer noopener">↗ {elementOrigin(item.id).name}</a> : <span title="Authored for this playground; included as source in your export">✳ {elementOrigin(item.id).name}</span>}<small>{elementOrigin(item.id).runtime}</small></div>}
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

    {!results.length && <div className="empty-state"><h2>No elements here yet.</h2><p>{registry.elements.length === 0 ? "The registry index hasn't been fetched yet. Open Registry detail to pull it in." : "Try another search or add something to your collection."}</p><button className="quiet-button" onClick={resetFilters}>Reset filters</button></div>}
    <div className="library-footer"><span>Made to be explored. Built to be yours.</span><span>✳ DESIGN PLAYGROUND</span></div>
    {registryOpen && <ElementsBrowser readOnly={exploring} onClose={() => setRegistryOpen(false)}/>}
    {expanded && <div className="studio-overlay" onClick={closeFull}><div className="demo-dialog" role="dialog" aria-modal="true" aria-label={expanded.title} onClick={e => e.stopPropagation()}>
      <header>
        <div>
          <h2>{expanded.title}</h2>
          <p>{describeElement(expanded)}</p>
          <p className="demo-origin">Source: {sourceById(expanded.source)?.label ?? expanded.source} · {expanded.referenceOnly ? "reference only" : expanded.engineDependency.length ? expanded.engineDependency.join(" + ") : "no engine"} · {licenceFor(expanded.source) ? <a href={licenceFor(expanded.source)!.url} target="_blank" rel="noreferrer noopener" title={licenceFor(expanded.source)!.restriction}>Licence: {licenceFor(expanded.source)!.name} ↗</a> : <span className="licence-unknown">{licenceLabel(expanded.source)}</span>}</p>
        </div>
        <div className="dialog-actions">{stepper}<button autoFocus className="quiet-button" onClick={closeFull}>Close ×</button></div>
      </header>
      {/* The same compiled document the card shows, at a size where the component can
          actually lay itself out — several only make sense above a card's height. */}
      <iframe key={expanded.id} title={`${expanded.title} expanded preview`} sandbox="allow-scripts" src={previewSrc(expanded)}/>
      <footer>
        <a className="quiet-button" href={sourceById(expanded.source)?.homepage ?? "#"} target="_blank" rel="noreferrer noopener">Open {sourceById(expanded.source)?.label} ↗</a>
        <button className="primary-button" onClick={() => toggle({ id: expanded.id, title: expanded.title, description: expanded.description, category: browseCategory(expanded), preview: false, registry: expanded })}>{picked.some(s => s.id === expanded.id) ? "Remove from project" : exploring ? "Create a project to use this →" : "Add to project +"}</button>
      </footer>
    </div></div>}
    {active && <div className="studio-overlay" onClick={closeFull}><div className="demo-dialog" role="dialog" aria-modal="true" aria-label={active.title} onClick={e => e.stopPropagation()}><header><div><h2>{active.title}</h2><p>{active.description}</p><p className="demo-origin">Source: {elementOrigin(active.id).name} · {elementOrigin(active.id).runtime}</p></div><div className="dialog-actions">{stepper}<button autoFocus className="quiet-button" onClick={closeFull}>Close ×</button></div></header><iframe key={`${active.id}:${replay}`} title={`${active.title} expanded preview`} sandbox="allow-scripts" srcDoc={elementDocument(active.id)}/><footer><button className="quiet-button" onClick={() => setReplay(replay + 1)}>↻ Replay</button><button className="primary-button" onClick={() => toggle({ id: active.id, title: active.title, description: active.description, category: active.category, preview: true })}>{selected.some(s => s.id === active.id) ? "Remove from project" : exploring ? "Create a project to use this →" : "Add to project +"}</button></footer></div></div>}
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
