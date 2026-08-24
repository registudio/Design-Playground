"use client";

import { useProjectStore } from "@/store/project-store";
import {
  AccordionVariant, AnnouncementVariant, BlogVariant, ButtonVariant, CardVariant,
  CtaVariant, DropdownVariant, FaqVariant, FeaturesVariant, FooterVariant, HeroVariant,
  InputVariant, ModalVariant, NavbarVariant, PaginationVariant, PricingVariant,
  SocialProofVariant, TabsVariant, TeamVariant, ToastVariant, TooltipVariant, CursorVariant,
} from "@/schema/recipe";
import { Choice, Panel } from "./controls";

/**
 * Component selection (§11). Every choice picks a *structure*; the visual identity
 * always comes from Foundation, which is why nothing here touches colour or type.
 */
export function ComponentsPanel() {
  const project = useProjectStore((s) => s.project);
  const edit = useProjectStore((s) => s.edit);
  if (!project) return null;

  const { components } = project.recipe;
  const set = <K extends keyof typeof components>(key: K) => (value: (typeof components)[K]) =>
    edit(`Set ${key}`, (draft) => {
      draft.recipe.components[key] = value;
      draft.provenance[`recipe.components.${key}`] = "user";
    });

  return (
    <>
      <Panel title="Elements">
        <Choice label="Button" options={ButtonVariant.options} value={components.button} provenancePath="recipe.components.button" onChange={set("button")} />
        <Choice label="Card" options={CardVariant.options} value={components.card} provenancePath="recipe.components.card" onChange={set("card")} />
        <Choice label="Input" options={InputVariant.options} value={components.input} provenancePath="recipe.components.input" onChange={set("input")} />
      </Panel>

      <Panel title="Sections">
        <Choice label="Navigation" options={NavbarVariant.options} value={components.navbar} provenancePath="recipe.components.navbar" onChange={set("navbar")} />
        <Choice label="Hero" options={HeroVariant.options} value={components.hero} provenancePath="recipe.components.hero" onChange={set("hero")} />
        <Choice label="Features" options={FeaturesVariant.options} value={components.features} provenancePath="recipe.components.features" onChange={set("features")} />
        <Choice label="Conversion" options={CtaVariant.options} value={components.cta} provenancePath="recipe.components.cta" onChange={set("cta")} />
        <Choice label="Footer" options={FooterVariant.options} value={components.footer} provenancePath="recipe.components.footer" onChange={set("footer")} />
      </Panel>

      <Panel title="Optional sections">
        <p className="text-[12px] text-chrome-muted">
          Set any of these to “none” to leave the section out of the page.
        </p>
        <Choice label="Announcement" options={AnnouncementVariant.options} value={components.announcement} provenancePath="recipe.components.announcement" onChange={set("announcement")} />
        <Choice label="Social proof" options={SocialProofVariant.options} value={components.socialProof} provenancePath="recipe.components.socialProof" onChange={set("socialProof")} />
        <Choice label="Pricing" options={PricingVariant.options} value={components.pricing} provenancePath="recipe.components.pricing" onChange={set("pricing")} />
        <Choice label="FAQ" options={FaqVariant.options} value={components.faq} provenancePath="recipe.components.faq" onChange={set("faq")} />
        <Choice label="Team" options={TeamVariant.options} value={components.team} provenancePath="recipe.components.team" onChange={set("team")} />
        <Choice label="Blog" options={BlogVariant.options} value={components.blog} provenancePath="recipe.components.blog" onChange={set("blog")} />
      </Panel>

      <Panel title="Cursor">
        <Choice label="Custom cursor" options={CursorVariant.options} value={components.cursor} provenancePath="recipe.components.cursor" onChange={set("cursor")} />
        <p className="text-[12px] text-chrome-muted">
          Custom cursors fall back to native behaviour on touch devices.
        </p>
      </Panel>

      <Panel title="Interactive elements">
        <p className="text-[12px] text-chrome-muted">
          These don't have a slot on the Sample Page — see them in the Element Gallery,
          where every variant is also click-to-apply.
        </p>
        <Choice label="Tabs" options={TabsVariant.options} value={components.tabs} provenancePath="recipe.components.tabs" onChange={set("tabs")} />
        <Choice label="Accordion" options={AccordionVariant.options} value={components.accordion} provenancePath="recipe.components.accordion" onChange={set("accordion")} />
        <Choice label="Modal" options={ModalVariant.options} value={components.modal} provenancePath="recipe.components.modal" onChange={set("modal")} />
        <Choice label="Toast" options={ToastVariant.options} value={components.toast} provenancePath="recipe.components.toast" onChange={set("toast")} />
        <Choice label="Tooltip" options={TooltipVariant.options} value={components.tooltip} provenancePath="recipe.components.tooltip" onChange={set("tooltip")} />
        <Choice label="Pagination" options={PaginationVariant.options} value={components.pagination} provenancePath="recipe.components.pagination" onChange={set("pagination")} />
        <Choice label="Dropdown" options={DropdownVariant.options} value={components.dropdown} provenancePath="recipe.components.dropdown" onChange={set("dropdown")} />
      </Panel>
    </>
  );
}
