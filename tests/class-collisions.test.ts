import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  AnnouncementVariant, BlogVariant, CtaVariant, FaqVariant, FeaturesVariant,
  FooterVariant, HeroVariant, NavbarVariant, PricingVariant, SocialProofVariant,
  TeamVariant,
} from "@/schema/recipe";

/**
 * Guards against the exact bug found while building the Blog section: a section
 * wrapper's class is templated as `dp-{section} dp-{section}-${variant}`, and when a
 * variant's *value* happens to equal the literal class name of an *inner* container in
 * that same section (e.g. features had a "grid" variant and also a literal
 * `dp-features-grid` div), the CSS meant for the inner grid silently applies to the
 * outer section too — collapsing it to a single grid track. Features masked this by
 * luck (auto-fit degrades gracefully with one child); Team, Blog and Pricing's
 * "toggle" variant did not, and broke visibly.
 *
 * Rather than trust a one-off fix, this statically re-derives every `dp-{section}-*`
 * string a variant could ever produce and confirms none of them collide with a
 * literal className already used inside that section's own markup.
 */

const SOURCE = readFileSync("src/preview/surfaces/SamplePage.tsx", "utf8");

/** Every section that uses the `dp-{prefix} dp-{prefix}-${variant}` wrapper pattern. */
const SECTIONS: Array<{ prefix: string; variants: readonly string[] }> = [
  { prefix: "navbar", variants: NavbarVariant.options },
  { prefix: "hero", variants: HeroVariant.options },
  { prefix: "features", variants: FeaturesVariant.options },
  { prefix: "proof", variants: SocialProofVariant.options },
  { prefix: "pricing", variants: PricingVariant.options },
  { prefix: "faq", variants: FaqVariant.options },
  { prefix: "team", variants: TeamVariant.options },
  { prefix: "announcement", variants: AnnouncementVariant.options },
  { prefix: "blog", variants: BlogVariant.options },
  { prefix: "cta", variants: CtaVariant.options },
  { prefix: "footer", variants: FooterVariant.options },
];

/**
 * Every class token used on an *inner* element — i.e. excluding a section's own
 * legitimate self-declaration of its wrapper class (`className="dp-x dp-x-variant"`,
 * whether written literally for one branch or produced by the `${variant}` template).
 * What's left is exactly the set a derived wrapper string must never appear in.
 */
function innerClassNames(source: string, sections: typeof SECTIONS): Set<string> {
  const wrapperShapes = new Set<string>();
  for (const { prefix, variants } of sections) {
    for (const variant of variants) wrapperShapes.add(`dp-${prefix} dp-${prefix}-${variant}`);
  }

  const inner = new Set<string>();
  // Literal, non-templated classNames: className="a b c"
  for (const match of source.matchAll(/className="([^"{]*)"/g)) {
    if (wrapperShapes.has(match[1]!.trim())) continue; // a section declaring its own wrapper
    for (const token of match[1]!.split(/\s+/)) if (token) inner.add(token);
  }
  // Backtick-templated classNames whose static part is the wrapper pattern itself
  // (`dp-x dp-x-${variant}`) are wrapper declarations by construction and contribute
  // no OTHER tokens, so they need no special handling here — only literal strings can
  // ever collide with a derived wrapper string in the first place.
  return inner;
}

describe("section wrapper class collisions", () => {
  const literals = innerClassNames(SOURCE, SECTIONS);

  for (const { prefix, variants } of SECTIONS) {
    for (const variant of variants) {
      const derived = `dp-${prefix}-${variant}`;
      it(`dp-${prefix} with variant "${variant}" (-> .${derived}) doesn't collide with an inner element`, () => {
        expect(literals.has(derived)).toBe(false);
      });
    }
  }
});
