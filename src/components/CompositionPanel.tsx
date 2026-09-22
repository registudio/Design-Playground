"use client";

import { useState } from "react";
import { useProjectStore } from "@/store/project-store";
import { SECTION_ORDER, SECTION_LABELS, pageSections, moveSection, type PageSection } from "@/schema/composition";
import { AnnouncementVariant, NavbarVariant, HeroVariant, FeaturesVariant, SocialProofVariant, PricingVariant, FaqVariant, TeamVariant, BlogVariant, CtaVariant, FooterVariant } from "@/schema/recipe";
import { Choice, NumberField, Slider } from "./controls";

const variants = { announcement: AnnouncementVariant.options, navbar: NavbarVariant.options, hero: HeroVariant.options, features: FeaturesVariant.options, socialProof: SocialProofVariant.options, pricing: PricingVariant.options, faq: FaqVariant.options, team: TeamVariant.options, blog: BlogVariant.options, cta: CtaVariant.options, footer: FooterVariant.options };

export function SectionOrder({ compact = false }: { compact?: boolean }) {
  const project = useProjectStore(s => s.project)!;
  const edit = useProjectStore(s => s.edit);
  const advanced = useProjectStore(s => s.advanced);
  const [dragged, setDragged] = useState<PageSection | null>(null);
  const [over, setOver] = useState<PageSection | null>(null);
  const order = pageSections(project.recipe);
  const move = (from: PageSection, to: PageSection) => edit("Reorder sections", d => { d.recipe.sectionOrder = moveSection(pageSections(d.recipe), from, to); });
  /**
   * While a drag is in progress the list renders the order it *would* become, so the
   * section being displaced visibly slides up or down as the pointer passes it. Dimming
   * the dragged row alone left the outcome to guesswork until after the drop.
   *
   * Reuses moveSection so the preview and the committed result cannot diverge.
   */
  const preview = dragged && over && dragged !== over ? moveSection(order, dragged, over) : order;
  const endDrag = () => { setDragged(null); setOver(null); };
  return <div className={`section-order ${compact ? "compact" : ""}`}><div className="order-heading"><h3>Page structure</h3><span>{order.length}</span></div><p>Drag to reorder. Make the story yours.</p>{!order.length && <div className="order-empty">Your blank canvas.<br/>Choose a section to start.</div>}<ol onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null); }}>{preview.map((key, i) => <li key={key} draggable onDragStart={e => { setDragged(key); e.dataTransfer.setData("text/plain", key); e.dataTransfer.effectAllowed = "move"; }} onDragEnd={endDrag} onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (key !== over) setOver(key); }} onDrop={e => { e.preventDefault(); if (dragged && over && dragged !== over) move(dragged, over); endDrag(); }} className={dragged === key ? "dragging" : ""}><span className="drag-handle" aria-hidden="true">⠿</span><span className="order-number">{String(i + 1).padStart(2, "0")}</span><div><strong>{SECTION_LABELS[key]}</strong><small>{advanced ? `"${key}": "${project.recipe.components[key]}"` : project.recipe.components[key].replaceAll("-", " ")}</small></div><div className="order-actions"><button disabled={i === 0} aria-label={`Move ${SECTION_LABELS[key]} up`} onClick={() => move(key, order[i - 1]!)}>↑</button><button disabled={i === order.length - 1} aria-label={`Move ${SECTION_LABELS[key]} down`} onClick={() => move(key, order[i + 1]!)}>↓</button><button aria-label={`Remove ${SECTION_LABELS[key]} section`} onClick={() => edit(`Remove ${SECTION_LABELS[key]}`, d => { d.recipe.sectionOrder = pageSections(d.recipe).filter(k => k !== key); })}>×</button></div></li>)}</ol><div className="order-end">END OF PAGE</div></div>;
}

export function CompositionPanel() {
  const project = useProjectStore(s => s.project)!;
  const edit = useProjectStore(s => s.edit);
  const advanced = useProjectStore(s => s.advanced);
  const order = pageSections(project.recipe);
  const [current, setCurrent] = useState<PageSection>("hero");
  return <div className="composition-layout"><div><div className="section-tabs">{SECTION_ORDER.map(key => <button key={key} className={current === key ? "active" : ""} onClick={() => setCurrent(key)}>{SECTION_LABELS[key]}{order.includes(key) && <i/>}</button>)}</div><div className="section-choice-heading"><h2>{SECTION_LABELS[current]}</h2><button className="quiet-button" onClick={() => edit(`Leave ${current} empty`, d => { d.recipe.sectionOrder = pageSections(d.recipe).filter(k => k !== current); })}>Leave empty</button></div><div className="section-variant-grid">{variants[current].filter(v => v !== "none").map((variant, i) => <button key={variant} className={`section-variant ${order.includes(current) && project.recipe.components[current] === variant ? "active" : ""}`} onClick={() => edit(`Choose ${variant} ${current}`, d => { const previous = pageSections(d.recipe); (d.recipe.components as Record<string, string>)[current] = variant; d.recipe.sectionOrder = previous.includes(current) ? previous : [...previous, current]; })}><div className={`section-wireframe wire-${current} layout-${i % 4}`}><div className="wire-nav"/><div className="wire-content"><div><b/><b/><p/><p/><i/></div><span/></div><div className="wire-cards"><i/><i/><i/></div></div><span>{variant.replaceAll("-", " ")}</span><small>{order.includes(current) && project.recipe.components[current] === variant ? "✓ Selected" : "+ Add section"}</small></button>)}</div>{advanced && <PageRhythm/>}</div><SectionOrder/></div>;
}

/**
 * Advanced: the global values that govern how a composed page reads.
 *
 * These are the same token paths the Basics step edits — deliberately, so the two stay
 * in lockstep rather than becoming rival settings. They are surfaced again here because
 * section rhythm is only judgeable while looking at the sequence of sections, and
 * sending someone back two steps to widen a page they are composing is the kind of
 * errand that makes a tool tiring.
 */
function PageRhythm() {
  const tokens = useProjectStore(s => s.project!.tokens);
  const edit = useProjectStore(s => s.edit);
  const set = (key: "maxWidth" | "sectionSpacing" | "gutter" | "gridColumns", label: string) => (value: number) =>
    edit(`Adjust ${label}`, d => {
      d.tokens.layout[key] = value;
      d.provenance[`tokens.layout.${key}`] = "user";
    }, `layout.${key}`);

  return <section className="page-rhythm">
    <div className="eyebrow">PAGE RHYTHM · SHARED WITH THE BASICS</div>
    <Slider label="Section spacing" from="Tight" to="Airy" min={2} max={14} step={0.5} value={tokens.layout.sectionSpacing} format={v => `${v}rem`} provenancePath="tokens.layout.sectionSpacing" onChange={set("sectionSpacing", "section spacing")}/>
    <Slider label="Content width" from="Narrow" to="Wide" min={40} max={100} step={1} value={tokens.layout.maxWidth} format={v => `${v}rem`} provenancePath="tokens.layout.maxWidth" onChange={set("maxWidth", "content width")}/>
    <div className="rhythm-numbers">
      <NumberField label="Gutter" value={tokens.layout.gutter} min={0} max={6} step={0.25} unit="rem" provenancePath="tokens.layout.gutter" onChange={set("gutter", "gutter")}/>
      <NumberField label="Grid columns" value={tokens.layout.gridColumns} min={1} max={24} step={1} unit="cols" provenancePath="tokens.layout.gridColumns" onChange={set("gridColumns", "grid columns")}/>
    </div>
    <Choice label="Alignment" options={["left", "center", "right"] as const} value={tokens.layout.alignment} provenancePath="tokens.layout.alignment" onChange={alignment => edit("Set alignment", d => { d.tokens.layout.alignment = alignment; d.provenance["tokens.layout.alignment"] = "user"; })}/>
  </section>;
}
