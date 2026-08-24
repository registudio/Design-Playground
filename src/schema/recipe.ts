import { z } from "zod";

/**
 * site.recipe.json — structural and interaction decisions (§15.2).
 *
 * Recipe IDs are stable internal identifiers (§11.4). They must never encode a
 * third-party registry name: the implementation layer decides whether
 * `card.minimal` becomes hand-built React, shadcn/ui or a registry component.
 */

export const RECIPE_SCHEMA_ID = "site-recipe/v1" as const;

// --- Element variants (Phase D MVP subset of §11.1) ------------------------

export const ButtonVariant = z.enum(["solid", "outline", "ghost", "text", "icon", "pill"]);
export const CardVariant = z.enum([
  "minimal", "bordered", "elevated", "image", "interactive", "glass", "feature",
]);
export const InputVariant = z.enum(["bordered", "filled", "underline"]);
export const CursorVariant = z.enum(["default", "dot", "ring", "label", "image-aware", "magnetic"]);

// --- Section variants (§11.2) ---------------------------------------------

export const NavbarVariant = z.enum(["minimal", "floating", "centered", "split", "mega"]);
export const HeroVariant = z.enum([
  "centered", "split", "editorial", "product", "image-led", "dashboard", "bento", "video-led",
]);
export const FeaturesVariant = z.enum([
  "grid", "bento", "alternating", "tabs", "cards", "demo",
]);
export const CtaVariant = z.enum(["banner", "contact-form", "booking", "pricing", "newsletter"]);
export const FooterVariant = z.enum(["minimal", "columns", "expanded", "mega", "simple", "social"]);

// Social proof and content sections (§11.2). Each is an optional slot on the Sample
// Page — "none" hides it, so a project without pricing simply doesn't show pricing.
export const SocialProofVariant = z.enum(["none", "logo-cloud", "metrics", "testimonial-grid", "testimonial-carousel", "case-study"]);
export const PricingVariant = z.enum(["none", "tiers", "single", "comparison", "toggle"]);
export const FaqVariant = z.enum(["none", "accordion", "two-column", "grid", "list", "compact"]);
export const TeamVariant = z.enum(["none", "grid", "list", "featured", "carousel", "minimal"]);
export const AnnouncementVariant = z.enum(["none", "banner", "floating"]);
export const BlogVariant = z.enum(["none", "grid", "list", "featured"]);

// --- Advanced-tier interactive primitives (§Wave F) -------------------------
// These render in the Element Gallery only (§15.8's fixed-slot Sample Page has no
// natural place for a modal or a dropdown) — but they still carry a real structural
// choice, the same as any other component, so they get the same variant + default +
// click-to-edit treatment. .default(...) keeps a project saved before this field
// existed loadable: DesignProject.safeParse fills it in rather than rejecting the
// document (see ProjectMeta.tags/archived for the same pattern).
// Plain z.enum, not .default() directly on the export — .default() wraps the schema
// in ZodDefault, which drops .options, and ComponentsPanel/EditableOverlay/Group all
// read XxxVariant.options directly. .default() is applied only where these are used
// inside ComponentChoices below.
export const TabsVariant = z.enum(["underline", "pills", "boxed"]);
export const AccordionVariant = z.enum(["bordered", "minimal", "filled"]);
export const ModalVariant = z.enum(["center", "drawer", "sheet"]);
export const ToastVariant = z.enum(["corner", "banner", "minimal"]);
export const TooltipVariant = z.enum(["dark", "light", "accent"]);
export const PaginationVariant = z.enum(["numbered", "simple", "dots"]);
export const DropdownVariant = z.enum(["list", "compact", "check"]);

/**
 * The Sample Page is a fixed sequence of slots with one variant each — not a
 * composable page. §15.8 excludes arbitrary page composition, and §15.2's shape
 * (`"hero": "split"`) already implies one choice per slot.
 */
export const ComponentChoices = z.object({
  button: ButtonVariant,
  card: CardVariant,
  input: InputVariant,
  navbar: NavbarVariant,
  hero: HeroVariant,
  features: FeaturesVariant,
  announcement: AnnouncementVariant,
  socialProof: SocialProofVariant,
  pricing: PricingVariant,
  faq: FaqVariant,
  team: TeamVariant,
  blog: BlogVariant,
  cta: CtaVariant,
  footer: FooterVariant,
  cursor: CursorVariant,

  tabs: TabsVariant.default("underline"),
  accordion: AccordionVariant.default("bordered"),
  modal: ModalVariant.default("center"),
  toast: ToastVariant.default("corner"),
  tooltip: TooltipVariant.default("dark"),
  pagination: PaginationVariant.default("numbered"),
  dropdown: DropdownVariant.default("list"),
});
export type ComponentChoices = z.infer<typeof ComponentChoices>;

// --- Motion recipes (§12) --------------------------------------------------

export const MotionEngine = z.enum(["motion", "gsap", "css"]);

export const EntrancePreset = z.enum([
  "none", "fade", "fade-up", "fade-down", "slide", "blur-in", "scale", "mask-reveal",
  "stagger", "text-reveal",
]);
export const HoverPreset = z.enum([
  "none", "lift", "scale", "glow", "magnetic", "tilt", "underline-reveal", "icon-shift",
  "background-fill", "border-reveal",
]);
export const ScrollPreset = z.enum([
  "none", "reveal", "parallax", "progress", "pinned", "scrubbed", "horizontal", "sticky",
]);

/**
 * §12.6 states Motion and GSAP must never drive the same property on the same
 * element. Prose cannot enforce that, so each selected recipe declares the
 * properties it animates and `findEngineConflicts` checks them at selection time.
 */
export const RecipeBinding = z.object({
  recipe: z.string(),
  engine: MotionEngine,
  /** CSS properties this recipe drives, e.g. ["y", "opacity"]. */
  properties: z.array(z.string()),
  /** Per-recipe overrides of the global motion profile (§12.1). */
  overrides: z
    .object({
      duration: z.number().optional(),
      delay: z.number().optional(),
      stagger: z.number().optional(),
      distance: z.number().optional(),
      easing: z.string().optional(),
    })
    .optional(),
  /** §12.7 — every recipe must define a reduced-motion fallback. */
  reducedMotion: z.enum(["none", "fade-only", "instant"]),
});
export type RecipeBinding = z.infer<typeof RecipeBinding>;

export const MotionChoices = z.object({
  profile: z.enum(["none", "subtle", "professional", "expressive", "cinematic"]),
  entrance: z.record(z.string(), RecipeBinding),
  interaction: z.record(z.string(), RecipeBinding),
  scroll: z.record(z.string(), RecipeBinding),
});
export type MotionChoices = z.infer<typeof MotionChoices>;

export const SiteRecipe = z.object({
  schema: z.literal(RECIPE_SCHEMA_ID),
  components: ComponentChoices,
  motion: MotionChoices,
});
export type SiteRecipe = z.infer<typeof SiteRecipe>;

/** Returns pairs of bindings that would let two engines fight over one property. */
export function findEngineConflicts(
  bindings: Record<string, RecipeBinding>,
): Array<{ a: string; b: string; property: string }> {
  const conflicts: Array<{ a: string; b: string; property: string }> = [];
  const entries = Object.entries(bindings);
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [nameA, a] = entries[i]!;
      const [nameB, b] = entries[j]!;
      if (a.engine === b.engine) continue;
      for (const property of a.properties) {
        if (b.properties.includes(property)) conflicts.push({ a: nameA, b: nameB, property });
      }
    }
  }
  return conflicts;
}
