"use client";

import { useState } from "react";
import { useProjectStore } from "@/store/project-store";
import { SECTION_ORDER, SECTION_LABELS, pageSections, moveSection, type PageSection } from "@/schema/composition";
import { AnnouncementVariant, NavbarVariant, HeroVariant, FeaturesVariant, SocialProofVariant, PricingVariant, FaqVariant, TeamVariant, BlogVariant, CtaVariant, FooterVariant } from "@/schema/recipe";

const variants = { announcement: AnnouncementVariant.options, navbar: NavbarVariant.options, hero: HeroVariant.options, features: FeaturesVariant.options, socialProof: SocialProofVariant.options, pricing: PricingVariant.options, faq: FaqVariant.options, team: TeamVariant.options, blog: BlogVariant.options, cta: CtaVariant.options, footer: FooterVariant.options };

export function SectionOrder({ compact = false }: { compact?: boolean }) {
  const project = useProjectStore(s => s.project)!;
  const edit = useProjectStore(s => s.edit);
  const [dragged, setDragged] = useState<PageSection | null>(null);
  const order = pageSections(project.recipe);
  const move = (from: PageSection, to: PageSection) => edit("Reorder sections", d => { d.recipe.sectionOrder = moveSection(pageSections(d.recipe), from, to); });
  return <div className={`section-order ${compact ? "compact" : ""}`}><div className="order-heading"><h3>Page structure</h3><span>{order.length}</span></div><p>Drag to reorder. Make the story yours.</p>{!order.length && <div className="order-empty">Your blank canvas.<br/>Choose a section to start.</div>}<ol>{order.map((key, i) => <li key={key} draggable onDragStart={e => { setDragged(key); e.dataTransfer.setData("text/plain", key); e.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => setDragged(null)} onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }} onDrop={e => { e.preventDefault(); if (dragged) move(dragged, key); setDragged(null); }} className={dragged === key ? "dragging" : ""}><span className="drag-handle" aria-hidden="true">⠿</span><span className="order-number">{String(i + 1).padStart(2, "0")}</span><div><strong>{SECTION_LABELS[key]}</strong><small>{project.recipe.components[key].replaceAll("-", " ")}</small></div><div className="order-actions"><button disabled={i === 0} aria-label={`Move ${SECTION_LABELS[key]} up`} onClick={() => move(key, order[i - 1]!)}>↑</button><button disabled={i === order.length - 1} aria-label={`Move ${SECTION_LABELS[key]} down`} onClick={() => move(key, order[i + 1]!)}>↓</button><button aria-label={`Remove ${SECTION_LABELS[key]} section`} onClick={() => edit(`Remove ${SECTION_LABELS[key]}`, d => { d.recipe.sectionOrder = pageSections(d.recipe).filter(k => k !== key); })}>×</button></div></li>)}</ol><div className="order-end">END OF PAGE</div></div>;
}

export function CompositionPanel() {
  const project = useProjectStore(s => s.project)!;
  const edit = useProjectStore(s => s.edit);
  const order = pageSections(project.recipe);
  const [current, setCurrent] = useState<PageSection>("hero");
  return <div className="composition-layout"><div><div className="section-tabs">{SECTION_ORDER.map(key => <button key={key} className={current === key ? "active" : ""} onClick={() => setCurrent(key)}>{SECTION_LABELS[key]}{order.includes(key) && <i/>}</button>)}</div><div className="section-choice-heading"><h2>{SECTION_LABELS[current]}</h2><button className="quiet-button" onClick={() => edit(`Leave ${current} empty`, d => { d.recipe.sectionOrder = pageSections(d.recipe).filter(k => k !== current); })}>Leave empty</button></div><div className="section-variant-grid">{variants[current].filter(v => v !== "none").map((variant, i) => <button key={variant} className={`section-variant ${order.includes(current) && project.recipe.components[current] === variant ? "active" : ""}`} onClick={() => edit(`Choose ${variant} ${current}`, d => { const previous = pageSections(d.recipe); (d.recipe.components as Record<string, string>)[current] = variant; d.recipe.sectionOrder = previous.includes(current) ? previous : [...previous, current]; })}><div className={`section-wireframe wire-${current} layout-${i % 4}`}><div className="wire-nav"/><div className="wire-content"><div><b/><b/><p/><p/><i/></div><span/></div><div className="wire-cards"><i/><i/><i/></div></div><span>{variant.replaceAll("-", " ")}</span><small>{order.includes(current) && project.recipe.components[current] === variant ? "✓ Selected" : "+ Add section"}</small></button>)}</div></div><SectionOrder/></div>;
}
