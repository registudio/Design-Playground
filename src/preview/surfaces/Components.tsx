"use client";

import { useState } from "react";
import type { DesignProject } from "@/schema/project";
import {
  ButtonVariant, CardVariant, HeroVariant, NavbarVariant,
} from "@/schema/recipe";

/**
 * The Components surface (§13.1): each selected component shown on its own, so a
 * choice can be judged without the surrounding page competing for attention.
 *
 * Variants are listed from the schema rather than hardcoded, so adding a variant to
 * the recipe automatically shows it here.
 */

export function Components({ project }: { project: DesignProject }) {
  const { components } = project.recipe;

  return (
    <div className="dp-page">
      <Group title="Button" selected={components.button} options={ButtonVariant.options}>
        {(variant) => (
          <button className={`dp-btn dp-btn-${variant === "pill" ? "solid" : variant}`}
                  style={variant === "pill" ? { borderRadius: "var(--dp-radius-full)" } : undefined}>
            {variant === "icon" ? "→" : "Get started"}
          </button>
        )}
      </Group>

      <Group title="Card" selected={components.card} options={CardVariant.options}>
        {(variant) => (
          <article className={`dp-card dp-card-${variant}`} style={cardStyle(variant)}>
            <h3 className="dp-card-title">Strategy</h3>
            <p className="dp-card-body">A short description of the service.</p>
          </article>
        )}
      </Group>

      <Group title="Navigation" selected={components.navbar} options={NavbarVariant.options}>
        {(variant) => (
          <div className={`dp-navbar dp-navbar-${variant}`} style={{ position: "static" }}>
            <div className="dp-navbar-inner" style={{ padding: "var(--dp-space-3) var(--dp-space-4)" }}>
              <span className="dp-navbar-brand">Northwind</span>
              <nav className="dp-navbar-links">
                <a className="dp-navbar-link" href="#0">Work</a>
                <a className="dp-navbar-link" href="#0">About</a>
              </nav>
            </div>
          </div>
        )}
      </Group>

      <Group title="Hero" selected={components.hero} options={HeroVariant.options}>
        {(variant) => (
          <div className={`dp-hero dp-hero-${variant}`} style={{ paddingBlock: "var(--dp-space-8)" }}>
            <div className="dp-hero-inner" style={{ gap: "var(--dp-space-6)" }}>
              <div className="dp-hero-content" style={{ gap: "var(--dp-space-3)" }}>
                <h3 className="dp-type dp-type-heading-3">A headline goes here</h3>
                <p className="dp-card-body">Supporting sentence for the section.</p>
              </div>
              {variant !== "centered" && <div className="dp-hero-media dp-image" />}
            </div>
          </div>
        )}
      </Group>

      {/* These three carry real state — a static specimen can't show what a tab
          switch, an accordion expand, or a carousel advance actually feels like. */}
      <section className="dp-section">
        <h2 className="dp-section-title">Tabs</h2>
        <TabsDemo />
      </section>

      <section className="dp-section">
        <h2 className="dp-section-title">Accordion</h2>
        <AccordionDemo />
      </section>

      <section className="dp-section">
        <h2 className="dp-section-title">Carousel</h2>
        <CarouselDemo />
      </section>
    </div>
  );
}

const TAB_ITEMS = [
  { label: "Overview", body: "A short summary of what this project involves and why it matters." },
  { label: "Timeline", body: "Kickoff, design review, build, and launch — typically four to eight weeks." },
  { label: "Pricing", body: "Fixed-price packages, or a custom quote for larger scopes." },
];

function TabsDemo() {
  const [active, setActive] = useState(0);
  return (
    <div className="dp-tabs">
      <div className="dp-tabs-list" role="tablist">
        {TAB_ITEMS.map((tab, i) => (
          <button
            key={tab.label}
            role="tab"
            aria-selected={i === active}
            data-active={i === active ? "true" : undefined}
            onClick={() => setActive(i)}
            className="dp-tab"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <p className="dp-tabs-panel">{TAB_ITEMS[active]!.body}</p>
    </div>
  );
}

const ACCORDION_ITEMS = [
  { q: "What do you need from us to start?", a: "Brand assets if you have them, and a short brief — we can help write one." },
  { q: "Can we make changes after launch?", a: "Yes, either yourself through the CMS or through a support arrangement." },
];

function AccordionDemo() {
  const [open, setOpen] = useState(0);
  return (
    <div className="dp-accordion">
      {ACCORDION_ITEMS.map((item, i) => (
        <div key={item.q} className="dp-accordion-item" data-open={i === open ? "true" : undefined}>
          <button
            className="dp-accordion-trigger"
            onClick={() => setOpen(i === open ? -1 : i)}
            aria-expanded={i === open}
          >
            <span>{item.q}</span>
            <span className="dp-accordion-icon" aria-hidden="true">+</span>
          </button>
          {i === open && <p className="dp-accordion-panel">{item.a}</p>}
        </div>
      ))}
    </div>
  );
}

const CAROUSEL_SLIDES = ["Strategy", "Design", "Build", "Launch"];

function CarouselDemo() {
  const [index, setIndex] = useState(0);
  const go = (delta: number) =>
    setIndex((i) => (i + delta + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length);

  return (
    <div className="dp-carousel">
      <div className="dp-carousel-track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {CAROUSEL_SLIDES.map((slide) => (
          <div key={slide} className="dp-carousel-slide dp-image">
            <span>{slide}</span>
          </div>
        ))}
      </div>
      <button className="dp-carousel-arrow dp-carousel-prev" onClick={() => go(-1)} aria-label="Previous">‹</button>
      <button className="dp-carousel-arrow dp-carousel-next" onClick={() => go(1)} aria-label="Next">›</button>
      <div className="dp-carousel-dots">
        {CAROUSEL_SLIDES.map((slide, i) => (
          <button
            key={slide}
            className="dp-carousel-dot"
            data-active={i === index ? "true" : undefined}
            onClick={() => setIndex(i)}
            aria-label={`Go to ${slide}`}
          />
        ))}
      </div>
    </div>
  );
}

function Group<T extends string>({
  title,
  selected,
  options,
  children,
}: {
  title: string;
  selected: string;
  options: readonly T[];
  children: (variant: T) => React.ReactNode;
}) {
  return (
    <section className="dp-section">
      <h2 className="dp-section-title">
        {title} — {selected}
      </h2>
      <div className="dp-variant-grid">
        {options.map((variant) => (
          <div
            key={variant}
            className="dp-variant"
            data-selected={variant === selected ? "true" : undefined}
          >
            <span className="dp-variant-label">{variant}</span>
            <div className="dp-variant-body">{children(variant)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Card variants differ in surface treatment only — never in colour or type (§11.3). */
function cardStyle(variant: string): React.CSSProperties | undefined {
  switch (variant) {
    case "minimal":
      return { border: "none", boxShadow: "none", background: "transparent" };
    case "elevated":
      return { boxShadow: "var(--dp-shadow-lg)", border: "none" };
    case "glass":
      return { backdropFilter: "blur(12px)", background: "color-mix(in oklab, var(--dp-color-surface) 60%, transparent)" };
    case "feature":
      return { borderTop: "3px solid var(--dp-color-primary)" };
    default:
      return undefined;
  }
}
