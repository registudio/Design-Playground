import type { SiteRecipe } from "./recipe";

export const SECTION_ORDER = ["announcement", "navbar", "hero", "features", "socialProof", "pricing", "faq", "team", "blog", "cta", "footer"] as const;
export type PageSection = (typeof SECTION_ORDER)[number];
export const SECTION_LABELS: Record<PageSection, string> = {
  announcement: "Announcement", navbar: "Navigation", hero: "Hero", features: "Features",
  socialProof: "Testimonials & proof", pricing: "Pricing", faq: "FAQ", team: "Team", blog: "Blog", cta: "Conversion", footer: "Footer",
};
export function pageSections(recipe: SiteRecipe): PageSection[] {
  return (recipe.sectionOrder ?? [...SECTION_ORDER]).filter((key) => recipe.components[key] !== "none");
}
export function moveSection(order: PageSection[], from: PageSection, to: PageSection): PageSection[] {
  const next = [...order];
  const a = next.indexOf(from), b = next.indexOf(to);
  if (a < 0 || b < 0) return next;
  next.splice(a, 1); next.splice(b, 0, from);
  return next;
}
