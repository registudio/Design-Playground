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
            <span className="dp-field-label">Company size</span>
            <select className="dp-input dp-select" defaultValue="2-5">
              <option value="1">Just me</option>
              <option value="2-5">2–5 people</option>
              <option value="6-20">6–20 people</option>
              <option value="20+">20+ people</option>
            </select>
          </label>
          <label className="dp-field">
            <span className="dp-field-label">Message</span>
            <textarea className="dp-input dp-textarea" placeholder="Tell us about the project" readOnly />
          </label>
          <div className="dp-row">
            <label className="dp-check">
              <input type="checkbox" defaultChecked readOnly />
              <span className="dp-check-box" aria-hidden="true" />
              <span>Subscribe to updates</span>
            </label>
            <label className="dp-check dp-check-radio">
              <input type="radio" name="dp-radio-demo" defaultChecked readOnly />
              <span className="dp-check-box" aria-hidden="true" />
              <span>New website</span>
            </label>
            <label className="dp-check dp-check-radio">
              <input type="radio" name="dp-radio-demo" readOnly />
              <span className="dp-check-box" aria-hidden="true" />
              <span>Redesign</span>
            </label>
          </div>
          <label className="dp-toggle-row">
            <span>Email notifications</span>
            <span className="dp-toggle" data-checked="true" aria-hidden="true">
              <span className="dp-toggle-thumb" />
            </span>
          </label>
        </div>
      </Section>

      <Section title="Alerts">
        <div className="dp-stack">
          <div className="dp-alert dp-alert-success">
            <strong>Message sent.</strong> We usually reply within one business day.
          </div>
          <div className="dp-alert dp-alert-warning">
            <strong>Almost there.</strong> A couple of fields still need your attention.
          </div>
          <div className="dp-alert dp-alert-error">
            <strong>Something went wrong.</strong> Please try that again.
          </div>
        </div>
      </Section>

      <Section title="Panels &amp; quotes">
        <div className="dp-row" style={{ alignItems: "stretch" }}>
          <div className="dp-panel">
            <h3 className="dp-card-title">Panel</h3>
            <p className="dp-card-body">
              A quieter container than a card — for grouping content without competing
              for attention.
            </p>
          </div>
          <blockquote className="dp-blockquote">
            “The clearest process we have had with any agency.”
            <cite>— James Lim, Vertex</cite>
          </blockquote>
        </div>
      </Section>

      <Section title="Avatars">
        <div className="dp-row">
          {["S", "J", "A"].map((initial) => (
            <span key={initial} className="dp-avatar">{initial}</span>
          ))}
          <span className="dp-avatar dp-avatar-image" />
          <span className="dp-divider-v" aria-hidden="true" />
          <span className="dp-type dp-type-heading-2 dp-gradient-text">Gradient headline</span>
        </div>
      </Section>

      <Section title="Divider">
        <hr className="dp-divider" />
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
