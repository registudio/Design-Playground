import type { DesignProject } from "@/schema/project";
import { SEMANTIC_TOKENS, SCALE_STEPS } from "@/schema/primitives";
import { TYPE_STEPS } from "@/schema/tokens";

/**
 * The System surface (§13.1, §10.7): the whole visual language on one screen, so the
 * identity can be understood before any page-level component is chosen.
 *
 * Everything here reads from --dp-* variables. Nothing is hardcoded, which is what
 * lets the same markup look completely different per client (§11.3).
 */

const TYPE_LABELS: Record<(typeof TYPE_STEPS)[number], string> = {
  displayXl: "Display XL",
  displayL: "Display L",
  heading1: "Heading 1",
  heading2: "Heading 2",
  heading3: "Heading 3",
  bodyL: "Body L",
  body: "Body",
  small: "Small",
  caption: "Caption",
};

export function System({ project }: { project: DesignProject }) {
  const scaleNames = Object.keys(project.tokens.colors.scales).sort();

  return (
    <div className="dp-page">
      <Section title="Typography">
        {/* §10.3 — realistic sentences, not alphabet specimens. */}
        <div className="dp-stack">
          {TYPE_STEPS.map((step) => (
            <div key={step} className="dp-type-row">
              <span className="dp-type-label">{TYPE_LABELS[step]}</span>
              <span className={`dp-type dp-type-${kebab(step)}`}>
                Design that earns attention
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Semantic colours">
        <div className="dp-swatch-grid">
          {SEMANTIC_TOKENS.map((token) => (
            <div key={token} className="dp-swatch">
              <div className="dp-swatch-chip" style={{ background: `var(--dp-color-${token})` }} />
              <span className="dp-swatch-name">{token}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Primitive scales">
        <div className="dp-stack">
          {scaleNames.map((name) => (
            <div key={name} className="dp-ramp">
              <span className="dp-ramp-name">{name}</span>
              <div className="dp-ramp-steps">
                {SCALE_STEPS.map((step) => (
                  <div
                    key={step}
                    className="dp-ramp-step"
                    style={{ background: `var(--dp-color-${name}-${step})` }}
                    title={`${name} ${step}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <div className="dp-row">
          <button className="dp-btn dp-btn-solid">Get started</button>
          <button className="dp-btn dp-btn-outline">Learn more</button>
          <button className="dp-btn dp-btn-ghost">Ghost</button>
          <button className="dp-btn dp-btn-text">Text link</button>
        </div>
      </Section>

      <Section title="Form fields">
        <div className="dp-form">
          <label className="dp-field">
            <span className="dp-field-label">Full name</span>
            <input className="dp-input" placeholder="Sarah Tan" readOnly />
          </label>
          <label className="dp-field">
            <span className="dp-field-label">Message</span>
            <textarea className="dp-input dp-textarea" placeholder="Tell us about the project" readOnly />
          </label>
        </div>
      </Section>

      <Section title="Cards">
        <div className="dp-card-grid">
          {["Strategy", "Design", "Delivery"].map((title) => (
            <article key={title} className="dp-card">
              <h3 className="dp-card-title">{title}</h3>
              <p className="dp-card-body">
                A short description of what this part of the service actually involves.
              </p>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Badges &amp; links">
        <div className="dp-row">
          <span className="dp-badge dp-badge-primary">New</span>
          <span className="dp-badge dp-badge-success">Live</span>
          <span className="dp-badge dp-badge-warning">Beta</span>
          <span className="dp-badge dp-badge-error">Deprecated</span>
          <a className="dp-link" href="#0">A text link in context</a>
        </div>
      </Section>

      <Section title="Image treatment">
        <div className="dp-image-row">
          <div className="dp-image" data-ratio="16/9" />
          <div className="dp-image" data-ratio="1/1" />
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="dp-section">
      <h2 className="dp-section-title">{title}</h2>
      {children}
    </section>
  );
}

const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
