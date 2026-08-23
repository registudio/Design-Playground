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
