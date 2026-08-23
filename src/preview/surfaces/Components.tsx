"use client";

import { cloneElement, useEffect, useState, type ReactElement } from "react";
import type { DesignProject } from "@/schema/project";
import {
  ButtonVariant, CardVariant, HeroVariant, NavbarVariant,
} from "@/schema/recipe";
import { useHoverInteraction } from "@/motion/hooks";
import { ScrollShowcase } from "@/motion/ScrollShowcase";

/**
 * The Components surface (§13.1): each selected component shown on its own, so a
 * choice can be judged without the surrounding page competing for attention.
 *
 * Variants are listed from the schema rather than hardcoded, so adding a variant to
 * the recipe automatically shows it here.
 */

export function Components({ project, advanced = false }: { project: DesignProject; advanced?: boolean }) {
  const { components } = project.recipe;

  return (
    <div className="dp-page">
      <Group title="Button" selected={components.button} options={ButtonVariant.options}>
        {(variant) => {
          const button = (
            <button className={`dp-btn dp-btn-${variant === "pill" ? "solid" : variant}`}
                    style={variant === "pill" ? { borderRadius: "var(--dp-radius-full)" } : undefined}>
              {variant === "icon" ? "→" : "Get started"}
            </button>
          );
          // Only the selected variant demonstrates the chosen hover recipe live —
          // the other swatches are alternatives, not the thing that's actually configured.
          return variant === components.button
            ? <HoverSwatch project={project} target="button">{button}</HoverSwatch>
            : button;
        }}
      </Group>

      <Group title="Card" selected={components.card} options={CardVariant.options}>
        {(variant) => {
          const card = (
            <article className={`dp-card dp-card-${variant}`} style={cardStyle(variant)}>
              <h3 className="dp-card-title">Strategy</h3>
              <p className="dp-card-body">A short description of the service.</p>
            </article>
          );
          return variant === components.card
            ? <HoverSwatch project={project} target="card">{card}</HoverSwatch>
            : card;
        }}
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

      <section className="dp-section">
        <h2 className="dp-section-title">Scroll behaviour</h2>
        <p className="dp-hint" style={{ marginBottom: "var(--dp-space-4)" }}>
          Each box has its own scroll container, driven by GSAP ScrollTrigger — the
          classic reveal, parallax, pinned, and scroll-hijack patterns.
        </p>
        <ScrollShowcase />
      </section>

      {advanced && <AdvancedInteractive />}
    </div>
  );
}

/** Attaches the project's chosen hover-interaction recipe to a single swatch element. */
function HoverSwatch({
  project, target, children,
}: {
  project: DesignProject;
  target: "button" | "card";
  children: ReactElement;
}) {
  const binding = project.recipe.motion.interaction[target];
  const ref = useHoverInteraction<HTMLElement>(binding, project.tokens.motion);
  return cloneElement(children, { ref } as Partial<unknown>);
}

/** Advanced-tier interactive primitives — hidden by default (see wave-2 categorisation). */
function AdvancedInteractive() {
  return (
    <>
      <section className="dp-section">
        <h2 className="dp-section-title">Modal</h2>
        <ModalDemo />
      </section>

      <section className="dp-section">
        <h2 className="dp-section-title">Popover</h2>
        <PopoverDemo />
      </section>

      <section className="dp-section">
        <h2 className="dp-section-title">Toast</h2>
        <ToastDemo />
      </section>

      <section className="dp-section">
        <h2 className="dp-section-title">Dropdown</h2>
        <DropdownDemo />
      </section>

      <section className="dp-section">
        <h2 className="dp-section-title">Tooltip</h2>
        <TooltipDemo />
      </section>

      <section className="dp-section">
        <h2 className="dp-section-title">Pagination</h2>
        <PaginationDemo />
      </section>

      <section className="dp-section">
        <h2 className="dp-section-title">Slider</h2>
        <SliderDemo />
      </section>

      <section className="dp-section">
        <h2 className="dp-section-title">Animated counter</h2>
        <CounterDemo />
      </section>

      <section className="dp-section">
        <h2 className="dp-section-title">Typewriter text</h2>
        <TypewriterDemo />
      </section>
    </>
  );
}

function ModalDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="dp-btn dp-btn-solid" onClick={() => setOpen(true)}>Open modal</button>
      {open && (
        <div className="dp-modal-backdrop" onClick={() => setOpen(false)}>
          <div className="dp-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3 className="dp-card-title">Confirm project</h3>
            <p className="dp-card-body">This will start a new project using the current design direction.</p>
            <div className="dp-row" style={{ justifyContent: "flex-end" }}>
              <button className="dp-btn dp-btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button className="dp-btn dp-btn-solid" onClick={() => setOpen(false)}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PopoverDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="dp-popover-wrap">
      <button className="dp-btn dp-btn-outline" onClick={() => setOpen((v) => !v)}>
        {open ? "Close options" : "Show options"}
      </button>
      {open && (
        <div className="dp-popover" role="menu">
          <button className="dp-popover-item">Duplicate</button>
          <button className="dp-popover-item">Rename</button>
          <button className="dp-popover-item">Delete</button>
        </div>
      )}
    </div>
  );
}

function ToastDemo() {
  const [visible, setVisible] = useState(false);
  const show = () => {
    setVisible(true);
    setTimeout(() => setVisible(false), 2600);
  };
  return (
    <div className="dp-toast-wrap">
      <button className="dp-btn dp-btn-outline" onClick={show}>Trigger toast</button>
      {visible && (
        <div className="dp-toast dp-toast-success" role="status">
          <span>Changes saved.</span>
        </div>
      )}
    </div>
  );
}

const DROPDOWN_OPTIONS = ["Newest first", "Oldest first", "Highest price", "Lowest price"];

function DropdownDemo() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(DROPDOWN_OPTIONS[0]!);
  return (
    <div className="dp-dropdown-wrap">
      <button className="dp-btn dp-btn-outline dp-dropdown-trigger" onClick={() => setOpen((v) => !v)}>
        {selected} <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="dp-dropdown-menu" role="listbox">
          {DROPDOWN_OPTIONS.map((option) => (
            <button
              key={option}
              className="dp-dropdown-item"
              data-selected={option === selected ? "true" : undefined}
              onClick={() => { setSelected(option); setOpen(false); }}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TooltipDemo() {
  return (
    <div className="dp-row">
      <span className="dp-tooltip-wrap">
        <button className="dp-btn dp-btn-ghost">Hover me</button>
        <span className="dp-tooltip" role="tooltip">Exports as a ZIP file</span>
      </span>
    </div>
  );
}

function PaginationDemo() {
  const [page, setPage] = useState(2);
  const total = 5;
  return (
    <nav className="dp-pagination" aria-label="Pagination">
      <button className="dp-pagination-arrow" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>‹</button>
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          className="dp-pagination-item"
          data-active={n === page ? "true" : undefined}
          onClick={() => setPage(n)}
        >
          {n}
        </button>
      ))}
      <button className="dp-pagination-arrow" disabled={page === total} onClick={() => setPage((p) => p + 1)}>›</button>
    </nav>
  );
}

function SliderDemo() {
  const [value, setValue] = useState(60);
  return (
    <div className="dp-slider-demo">
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="dp-slider"
      />
      <span className="dp-slider-value">{value}%</span>
    </div>
  );
}

function CounterDemo() {
  const [value, setValue] = useState(0);
  const target = 248;
  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const duration = 1200;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      // Ease-out: fast start, gentle settle, matching a typical "counting up" feel.
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <div className="dp-counter">
      <span className="dp-type dp-type-display-l">{value}</span>
      <span className="dp-card-body">projects delivered</span>
    </div>
  );
}

function TypewriterDemo() {
  const full = "Design that earns attention.";
  const [text, setText] = useState("");
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setText(full.slice(0, i));
      if (i >= full.length) clearInterval(id);
    }, 45);
    return () => clearInterval(id);
  }, []);
  return (
    <p className="dp-type dp-type-heading-3 dp-typewriter">
      {text}
      <span className="dp-typewriter-cursor" aria-hidden="true" />
    </p>
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
