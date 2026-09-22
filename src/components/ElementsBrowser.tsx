"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useProjectStore } from "@/store/project-store";
import {
  categoryCounts,
  emptyQuery,
  engineCounts,
  filterElements,
  sourceCounts,
  stalenessOf,
  type ElementQuery,
} from "@/registry/query";
import type { DesignElement } from "@/registry/schema";
import {
  REGISTRY_SOURCES,
  ROUTING_CATEGORY_LABELS,
  sourceById,
  type RoutingCategory,
  type SourceId,
} from "@/registry/sources";

/**
 * The Elements browser (spec §1–§3).
 *
 * A full-screen overlay rather than a rail panel: this is a catalogue of several
 * hundred components across five sources, and browsing it is a task of its own, not an
 * adjustment made while watching the preview. The rail keeps what was chosen; this is
 * where choosing happens.
 *
 * §6 rules out rendering each component for a visual preview, and that constraint is
 * load-bearing rather than incidental — none of the five registries publishes a preview
 * URL, so a thumbnail grid would mean executing arbitrary third-party React per card.
 * The cards therefore lead with what the registry actually gives us and what a person
 * needs in order to decide: what it is, where it comes from, what it pulls in, and the
 * exact command that installs it. Each links out to its source's own docs, which is
 * where the visual lives.
 */
export function ElementsBrowser({ onClose, readOnly = false }: { onClose: () => void; readOnly?: boolean }) {
  const registry = useProjectStore((s) => s.registry);
  const registryState = useProjectStore((s) => s.registryState);
  const registryError = useProjectStore((s) => s.registryError);
  const refreshRegistry = useProjectStore((s) => s.refreshRegistry);
  const selections = useProjectStore((s) => s.project?.selections);
  const selectElement = useProjectStore((s) => s.selectElement);
  const deselectElement = useProjectStore((s) => s.deselectElement);

  const [query, setQuery] = useState<ElementQuery>(emptyQuery);
  const searchRef = useRef<HTMLInputElement>(null);

  // Escape closes, matching every other overlay here. Bound on the document because
  // focus may legitimately be on a chip or a card button rather than the dialog root.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => searchRef.current?.focus(), []);

  const results = useMemo(
    () => filterElements(registry.elements, query),
    [registry.elements, query],
  );
  const bySource = useMemo(() => sourceCounts(registry.elements, query), [registry.elements, query]);
  const byCategory = useMemo(
    () => categoryCounts(registry.elements, query),
    [registry.elements, query],
  );
  const byEngine = useMemo(() => engineCounts(registry.elements, query), [registry.elements, query]);
  const staleness = useMemo(() => stalenessOf(registry), [registry]);
  const selectedIds = useMemo(() => new Set((selections ?? []).map((s) => s.id)), [selections]);

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const refreshing = registryState === "refreshing";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/50 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="elements-browser-title"
        className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl border border-chrome-border bg-chrome-panel shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-chrome-border px-6 py-4">
          <div>
            <h2 id="elements-browser-title" className="text-[15px] font-semibold text-chrome-text">
              Elements
            </h2>
            <p className="mt-0.5 text-[12px] text-chrome-muted">
              Components, motion and scroll effects from the five registries this stack
              installs from. Selections export as install commands, not code.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void refreshRegistry()}
              disabled={refreshing}
              className="rounded-md border border-chrome-border px-3 py-1.5 text-[12px] text-chrome-text transition-colors hover:bg-chrome-border/40 disabled:opacity-50"
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-chrome-border px-3 py-1.5 text-[12px] text-chrome-text transition-colors hover:bg-chrome-border/40"
            >
              Close
            </button>
          </div>
        </header>

        <StatusBar
          empty={staleness.empty}
          stale={staleness.stale}
          daysOld={staleness.daysOld}
          failed={staleness.failed}
          error={registryError}
          refreshing={refreshing}
          onRefresh={() => void refreshRegistry()}
        />

        <div className="shrink-0 border-b border-chrome-border px-6 py-4">
          <label className="sr-only" htmlFor="elements-search">
            Search elements
          </label>
          <input
            id="elements-search"
            ref={searchRef}
            type="search"
            value={query.text}
            onChange={(e) => setQuery({ ...query, text: e.target.value })}
            placeholder="Search by name or description…"
            className="w-full rounded-md border border-chrome-border bg-chrome-bg px-3 py-2 text-[13px] text-chrome-text outline-none placeholder:text-chrome-muted focus:border-chrome-accent"
          />

          <div className="mt-3 flex flex-wrap gap-1.5">
            {REGISTRY_SOURCES.map((source) => (
              <Chip
                key={source.id}
                label={source.label}
                count={bySource[source.id] ?? 0}
                active={query.sources.includes(source.id)}
                onClick={() => setQuery({ ...query, sources: toggle(query.sources, source.id) })}
              />
            ))}
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {(Object.keys(ROUTING_CATEGORY_LABELS) as RoutingCategory[]).map((category) => (
              <Chip
                key={category}
                label={ROUTING_CATEGORY_LABELS[category]}
                count={byCategory[category] ?? 0}
                active={query.categories.includes(category)}
                onClick={() =>
                  setQuery({ ...query, categories: toggle(query.categories, category) })
                }
              />
            ))}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Chip
              label="Installable only"
              active={query.installableOnly}
              onClick={() => setQuery({ ...query, installableOnly: !query.installableOnly })}
            />
            <Chip
              label="Needs Motion"
              count={byEngine.motion ?? 0}
              active={query.engines.includes("motion")}
              onClick={() => setQuery({ ...query, engines: toggle(query.engines, "motion") })}
            />
            <Chip
              label="Needs GSAP"
              count={byEngine.gsap ?? 0}
              active={query.engines.includes("gsap")}
              onClick={() => setQuery({ ...query, engines: toggle(query.engines, "gsap") })}
            />
            {hasFilters(query) && (
              <button
                type="button"
                onClick={() => setQuery(emptyQuery())}
                className="ml-1 text-[12px] text-chrome-muted underline underline-offset-2 transition-colors hover:text-chrome-text"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <p className="mb-3 text-[12px] text-chrome-muted" aria-live="polite">
            {results.length} {results.length === 1 ? "element" : "elements"}
            {!readOnly && selections && selections.length > 0 && ` · ${selections.length} selected`}
          </p>

          {results.length === 0 ? (
            <EmptyState empty={staleness.empty} filtered={hasFilters(query) || !!query.text.trim()} />
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {results.map((element) => (
                <ElementCard
                  key={element.id}
                  element={element}
                  readOnly={readOnly}
                  selected={selectedIds.has(element.id)}
                  onAdd={() => selectElement(element)}
                  onRemove={() => deselectElement(element.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function hasFilters(query: ElementQuery): boolean {
  return (
    query.sources.length > 0 ||
    query.categories.length > 0 ||
    query.engines.length > 0 ||
    query.installableOnly
  );
}

/**
 * A filter chip carrying its own result count.
 *
 * The count comes from the same filtering code that produces the rows, with this
 * facet's own selection lifted — see query.ts. A chip that reads 0 is disabled rather
 * than hidden, so the set of sources stays legible as you narrow.
 */
function Chip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  const empty = count === 0;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      disabled={empty && !active}
      className={`rounded-full border px-3 py-1 text-[12px] transition-colors ${
        active
          ? "border-chrome-accent bg-chrome-accent text-white"
          : "border-chrome-border text-chrome-text hover:bg-chrome-border/40"
      } ${empty && !active ? "cursor-not-allowed opacity-40 hover:bg-transparent" : ""}`}
    >
      {label}
      {count !== undefined && (
        <span className={active ? "ml-1.5 opacity-80" : "ml-1.5 text-chrome-muted"}>{count}</span>
      )}
    </button>
  );
}

function StatusBar({
  empty,
  stale,
  daysOld,
  failed,
  error,
  refreshing,
  onRefresh,
}: {
  empty: boolean;
  stale: boolean;
  daysOld: number | null;
  failed: SourceId[];
  error: string | null;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  // §3 is explicit that staleness is surfaced rather than hidden: an entry whose
  // upstream registry has dropped it yields an install command that fails, so a quietly
  // out-of-date index is worse than an obviously empty one.
  const messages: string[] = [];
  if (error) messages.push(error);
  if (empty) {
    messages.push(
      refreshing
        ? "Fetching the registries…"
        : "Nothing indexed yet — refresh to fetch the five registries.",
    );
  } else if (stale) {
    messages.push(
      daysOld === null
        ? "This index has no usable timestamp; refresh before trusting it."
        : `This index is ${daysOld} days old. Registry contents change week to week, so an install command may no longer resolve.`,
    );
  }
  if (failed.length) {
    const names = failed.map((id) => sourceById(id)?.label ?? id).join(", ");
    messages.push(`Last refresh failed for ${names} — showing their previous entries.`);
  }

  if (!messages.length) return null;

  return (
    <div className="flex shrink-0 items-start justify-between gap-4 border-b border-chrome-border bg-amber-500/10 px-6 py-2.5">
      <p className="text-[12px] text-chrome-text">{messages.join(" ")}</p>
      {!refreshing && (
        <button
          type="button"
          onClick={onRefresh}
          className="shrink-0 text-[12px] font-medium text-chrome-accent underline underline-offset-2"
        >
          Refresh now
        </button>
      )}
    </div>
  );
}

function EmptyState({ empty, filtered }: { empty: boolean; filtered: boolean }) {
  if (empty) {
    return (
      <div className="rounded-lg border border-dashed border-chrome-border px-6 py-10 text-center">
        <p className="text-[13px] font-medium text-chrome-text">No elements indexed yet</p>
        <p className="mx-auto mt-1 max-w-md text-[12px] text-chrome-muted">
          No cached registry entries are available. Refresh to fetch the published
          component catalogue and its source credits.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-dashed border-chrome-border px-6 py-10 text-center">
      <p className="text-[13px] text-chrome-muted">
        {filtered ? "No elements match those filters." : "No elements to show."}
      </p>
    </div>
  );
}

function ElementCard({
  element,
  readOnly = false,
  selected,
  onAdd,
  onRemove,
}: {
  element: DesignElement;
  readOnly?: boolean;
  selected: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const source = sourceById(element.source);
  const [copied, setCopied] = useState(false);
  const note = useProjectStore(s => s.project?.selections.find(item => item.id === element.id)?.intendedUse ?? "");
  const setIntendedUse = useProjectStore(s => s.setIntendedUse);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(element.installCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be refused; the command is visible and selectable anyway.
    }
  };

  return (
    <li
      className={`flex flex-col gap-3 rounded-lg border p-4 transition-colors ${
        selected ? "border-chrome-accent bg-chrome-accent/5" : "border-chrome-border"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[13px] font-medium text-chrome-text">{element.title}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-chrome-muted">
            <a className="registry-source-badge" href={source?.homepage} target="_blank" rel="noreferrer noopener" title={`Source: ${source?.label ?? element.source}`}>{source?.label ?? element.source} ↗</a>
            <span aria-hidden="true">·</span>
            <span>{ROUTING_CATEGORY_LABELS[element.category]}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={selected ? onRemove : onAdd}
          disabled={readOnly}
          aria-label={`${selected ? "Remove" : "Select"} ${element.title}`}
          className={`shrink-0 rounded-md px-2.5 py-1 text-[12px] transition-colors ${
            selected
              ? "border border-chrome-accent text-chrome-accent hover:bg-chrome-accent/10"
              : "bg-chrome-accent text-white hover:opacity-90"
          }`}
        >
          {readOnly ? "Explore" : selected ? "Selected" : "Select"}
        </button>
      </div>

      {element.description && (
        <p className="line-clamp-3 text-[12px] leading-relaxed text-chrome-muted">
          {element.description}
        </p>
      )}
      {selected && !readOnly && <textarea aria-label={`Note for ${element.title}`} placeholder="Add a note for this component…" value={note} onChange={e => setIntendedUse(element.id, e.target.value)} className="rounded-md border border-chrome-border bg-chrome-bg p-2 text-[12px]"/>}

      <div className="flex flex-wrap gap-1">
        {/* §1c — Componentry is "inspect and adapt", not a one-click install. Saying so
            on the card is the difference between a useful reference and a broken step. */}
        {element.referenceOnly && (
          <Badge tone="warn" title="This source is meant to be read and adapted, not installed as-is">
            Reference
          </Badge>
        )}
        {element.engineDependency.map((engine) => (
          <Badge key={engine} tone="muted" title={`Requires the ${engine} engine`}>
            {engine === "gsap" ? "GSAP" : "Motion"}
          </Badge>
        ))}
        {element.variant && (
          <Badge
            tone="muted"
            title={`Published in ${element.availableVariants.length} variants; this is the one installed`}
          >
            {element.variant.language}/{element.variant.styling}
          </Badge>
        )}
        {element.registryDependencies.length > 0 && (
          <Badge tone="muted" title={element.registryDependencies.join(", ")}>
            +{element.registryDependencies.length} registry
          </Badge>
        )}
      </div>

      <div className="mt-auto flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded bg-chrome-bg px-2 py-1 font-mono text-[11px] text-chrome-muted">
          {element.installCommand}
        </code>
        <button
          type="button"
          onClick={() => void copy()}
          aria-label={`Copy install command for ${element.title}`}
          className="shrink-0 rounded border border-chrome-border px-2 py-1 text-[11px] text-chrome-text transition-colors hover:bg-chrome-border/40"
        >
          {copied ? "Copied" : "Copy"}
        </button>
        {source && (
          // The registries ship no preview images, so the only way to actually see a
          // component is its own docs site (§1a).
          <a
            href={source.homepage}
            target="_blank"
            rel="noreferrer noopener"
            className="shrink-0 rounded border border-chrome-border px-2 py-1 text-[11px] text-chrome-text transition-colors hover:bg-chrome-border/40"
            aria-label={`Open ${source.label} documentation in a new tab`}
          >
            Docs
          </a>
        )}
      </div>
    </li>
  );
}

function Badge({
  children,
  tone,
  title,
}: {
  children: React.ReactNode;
  tone: "warn" | "muted";
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
        tone === "warn"
          ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
          : "bg-chrome-border/50 text-chrome-muted"
      }`}
    >
      {children}
    </span>
  );
}
