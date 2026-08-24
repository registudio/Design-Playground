"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { DesignProject } from "@/schema/project";
import {
  AnnouncementVariant, BlogVariant, ButtonVariant, CardVariant, CtaVariant, FaqVariant,
  FeaturesVariant, FooterVariant, HeroVariant, InputVariant, NavbarVariant,
  PricingVariant, SocialProofVariant, TeamVariant, type ComponentChoices,
} from "@/schema/recipe";
import { postSetComponent } from "./bridge";

/**
 * Click-to-edit for the Sample Page (§Wave E). Unlike the Element Gallery — which
 * already lays every variant out side by side, so a click can just apply it directly
 * — the Sample Page shows exactly one instance of each section, so clicking it opens
 * a small popover listing the alternatives instead.
 *
 * Delegated rather than wrapped per-element: the Sample Page has ~15+ buttons alone,
 * all sharing one global `button` choice, and wrapping every render call site would
 * be a lot of surface area for the same result. One click listener on the page root,
 * matched by the nearest recognised class, covers all of them.
 */

interface FieldSpec {
  selector: string;
  field: keyof ComponentChoices;
  label: string;
  options: readonly string[];
}

// Checked in this order — most specific/innermost element first, so a button inside a
// feature card inside the Features section resolves to "button", not "features".
// Exported for tests/editable-overlay.test.ts, which checks this list stays in sync
// with ComponentChoices as the schema grows.
export const FIELD_SPECS: FieldSpec[] = [
  { selector: ".dp-btn", field: "button", label: "Button", options: ButtonVariant.options },
  { selector: ".dp-input", field: "input", label: "Input", options: InputVariant.options },
  { selector: ".dp-card", field: "card", label: "Card", options: CardVariant.options },
  { selector: ".dp-navbar", field: "navbar", label: "Navigation", options: NavbarVariant.options },
  { selector: ".dp-hero", field: "hero", label: "Hero", options: HeroVariant.options },
  { selector: ".dp-features", field: "features", label: "Features", options: FeaturesVariant.options },
  { selector: ".dp-proof", field: "socialProof", label: "Social proof", options: SocialProofVariant.options },
  { selector: ".dp-pricing", field: "pricing", label: "Pricing", options: PricingVariant.options },
  { selector: ".dp-faq", field: "faq", label: "FAQ", options: FaqVariant.options },
  { selector: ".dp-team", field: "team", label: "Team", options: TeamVariant.options },
  { selector: ".dp-blog", field: "blog", label: "Blog", options: BlogVariant.options },
  { selector: ".dp-cta", field: "cta", label: "Conversion", options: CtaVariant.options },
  { selector: ".dp-footer", field: "footer", label: "Footer", options: FooterVariant.options },
  { selector: ".dp-announcement", field: "announcement", label: "Announcement", options: AnnouncementVariant.options },
];

interface OpenPopover {
  spec: FieldSpec;
  top: number;
  left: number;
}

const POPOVER_WIDTH = 220;

export function EditableOverlay({
  rootRef, project,
}: {
  rootRef: RefObject<HTMLElement | null>;
  project: DesignProject;
}) {
  const [popover, setPopover] = useState<OpenPopover | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // Nearest match wins: checking FIELD_SPECS in order (most specific first) means
    // a click/hover on a button inside a card inside Features resolves to "button".
    const matchSpec = (target: HTMLElement): { spec: FieldSpec; el: HTMLElement } | null => {
      for (const spec of FIELD_SPECS) {
        const match = target.closest<HTMLElement>(spec.selector);
        if (match) return { spec, el: match };
      }
      return null;
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const found = matchSpec(target);
      if (!found) return;
      event.preventDefault();
      event.stopPropagation();
      const rect = found.el.getBoundingClientRect();
      setPopover({
        spec: found.spec,
        top: rect.bottom + 8,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 8)),
      });
    };

    // Direct DOM class toggling rather than React state — this runs on every pointer
    // move over the page, and only one element (the innermost match) should ever
    // carry the highlight at a time, which a re-render loop is the wrong tool for.
    let hovered: HTMLElement | null = null;
    const clearHover = () => {
      hovered?.classList.remove("dp-editable-hover");
      hovered = null;
    };
    const onMouseOver = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const found = matchSpec(target);
      if (!found) {
        clearHover();
        return;
      }
      if (found.el === hovered) return;
      clearHover();
      hovered = found.el;
      hovered.classList.add("dp-editable-hover");
    };
    const onMouseLeaveRoot = () => clearHover();

    root.addEventListener("click", onClick, true);
    root.addEventListener("mouseover", onMouseOver);
    root.addEventListener("mouseleave", onMouseLeaveRoot);
    return () => {
      clearHover();
      root.removeEventListener("click", onClick, true);
      root.removeEventListener("mouseover", onMouseOver);
      root.removeEventListener("mouseleave", onMouseLeaveRoot);
    };
  }, [rootRef]);

  useEffect(() => {
    if (!popover) return;
    const onDocMouseDown = (event: MouseEvent) => {
      if (popoverRef.current?.contains(event.target as Node)) return;
      setPopover(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPopover(null);
    };
    // A click in the playground chrome (sidebar, top bar) never reaches this
    // document at all — iframes don't share event dispatch — so mousedown alone
    // can't detect it. The preview iframe's own window loses focus the instant that
    // click lands, which blur does catch.
    const onBlur = () => setPopover(null);
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onBlur);
    };
  }, [popover]);

  if (!popover) return null;
  const current = project.recipe.components[popover.spec.field];

  return createPortal(
    <div
      ref={popoverRef}
      className="dp-editable-popover"
      style={{ top: popover.top, left: popover.left, width: POPOVER_WIDTH }}
    >
      <span className="dp-editable-popover-label">{popover.spec.label}</span>
      <div className="dp-editable-popover-options">
        {popover.spec.options.map((option) => (
          <button
            key={option}
            type="button"
            className={`dp-editable-option${option === current ? " is-active" : ""}`}
            onClick={() => {
              postSetComponent(popover.spec.field, option);
              setPopover(null);
            }}
          >
            {option}
          </button>
        ))}
      </div>
    </div>,
    document.body,
  );
}
