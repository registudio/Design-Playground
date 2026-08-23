"use client";

import { useProjectStore } from "@/store/project-store";
import {
  ButtonVariant, CardVariant, CtaVariant, FaqVariant, FeaturesVariant, FooterVariant,
  HeroVariant, InputVariant, NavbarVariant, PricingVariant, SocialProofVariant,
  TeamVariant, CursorVariant,
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
        <Choice label="Button" options={ButtonVariant.options} value={components.button} onChange={set("button")} />
        <Choice label="Card" options={CardVariant.options} value={components.card} onChange={set("card")} />
        <Choice label="Input" options={InputVariant.options} value={components.input} onChange={set("input")} />
      </Panel>

      <Panel title="Sections">
        <Choice label="Navigation" options={NavbarVariant.options} value={components.navbar} onChange={set("navbar")} />
        <Choice label="Hero" options={HeroVariant.options} value={components.hero} onChange={set("hero")} />
        <Choice label="Features" options={FeaturesVariant.options} value={components.features} onChange={set("features")} />
        <Choice label="Conversion" options={CtaVariant.options} value={components.cta} onChange={set("cta")} />
        <Choice label="Footer" options={FooterVariant.options} value={components.footer} onChange={set("footer")} />
      </Panel>

      <Panel title="Optional sections">
        <p className="text-[12px] text-chrome-muted">
          Set any of these to “none” to leave the section out of the page.
        </p>
        <Choice label="Social proof" options={SocialProofVariant.options} value={components.socialProof} onChange={set("socialProof")} />
        <Choice label="Pricing" options={PricingVariant.options} value={components.pricing} onChange={set("pricing")} />
        <Choice label="FAQ" options={FaqVariant.options} value={components.faq} onChange={set("faq")} />
        <Choice label="Team" options={TeamVariant.options} value={components.team} onChange={set("team")} />
      </Panel>

      <Panel title="Cursor">
        <Choice label="Custom cursor" options={CursorVariant.options} value={components.cursor} onChange={set("cursor")} />
        <p className="text-[12px] text-chrome-muted">
          Custom cursors fall back to native behaviour on touch devices.
        </p>
      </Panel>
    </>
  );
}
