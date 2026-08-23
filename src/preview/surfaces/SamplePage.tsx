import type { DesignProject } from "@/schema/project";

/**
 * The Sample Page (§13.1): every current choice shown together in a realistic generic
 * business website. It is explicitly not the client's final site — it exists so design
 * decisions are legible in context.
 *
 * Fixed slots, one variant each (§15.8 excludes arbitrary page composition). Each
 * section reads its variant from the recipe and changes *structure* only — never its
 * own colours or type, which always come from Foundation (§11.3).
 */

export function SamplePage({ project }: { project: DesignProject }) {
  const { components } = project.recipe;
  const brand = project.client || project.name || "Northwind";

  return (
    <div className="dp-page dp-sample">
      <Navbar variant={components.navbar} brand={brand} />
      <Hero variant={components.hero} brand={brand} />
      <Features variant={components.features} />
      <Cta variant={components.cta} />
      <Footer variant={components.footer} brand={brand} />
    </div>
  );
}

function Navbar({ variant, brand }: { variant: string; brand: string }) {
  const links = ["Services", "Work", "About", "Contact"];
  return (
    <header className={`dp-navbar dp-navbar-${variant}`} data-animate="nav">
      <div className="dp-navbar-inner">
        <span className="dp-navbar-brand">{brand}</span>
        <nav className="dp-navbar-links">
          {links.map((link) => (
            <a key={link} className="dp-navbar-link" href="#0">{link}</a>
          ))}
        </nav>
        <button className="dp-btn dp-btn-solid dp-btn-sm">Get in touch</button>
      </div>
    </header>
  );
}

function Hero({ variant, brand }: { variant: string; brand: string }) {
  const content = (
    <div className="dp-hero-content" data-animate="entrance">
      <span className="dp-badge dp-badge-primary">Trusted by 200+ teams</span>
      <h1 className="dp-type dp-type-display-l dp-hero-title">
        Websites that make {brand} impossible to overlook
      </h1>
      <p className="dp-type dp-type-body-l dp-hero-lede">
        We design and build the site your business should already have had — clear,
        fast, and unmistakably yours.
      </p>
      <div className="dp-row">
        <button className="dp-btn dp-btn-solid">Start a project</button>
        <button className="dp-btn dp-btn-outline">See our work</button>
      </div>
    </div>
  );

  return (
    <section className={`dp-hero dp-hero-${variant}`}>
      <div className="dp-hero-inner">
        {content}
        {variant !== "centered" && <div className="dp-hero-media dp-image" />}
      </div>
    </section>
  );
}

function Features({ variant }: { variant: string }) {
  const items = [
    { title: "Strategy first", body: "We start with what the business needs to achieve, not with a template." },
    { title: "Designed to convert", body: "Every section earns its place, and every page has a job to do." },
    { title: "Built to last", body: "Modern, accessible, fast — and straightforward for your team to run." },
    { title: "Measured", body: "Analytics and clear reporting from the day the site goes live." },
  ];

  return (
    <section className={`dp-features dp-features-${variant}`}>
      <div className="dp-section-inner">
        <h2 className="dp-type dp-type-heading-2 dp-features-title" data-animate="entrance">
          What working with us looks like
        </h2>
        <div className="dp-features-grid">
          {items.map((item, index) => (
            <article
              key={item.title}
              className="dp-card dp-feature"
              data-animate="entrance"
              style={{ ["--dp-stagger-index" as string]: index }}
            >
              <h3 className="dp-type dp-type-heading-3 dp-card-title">{item.title}</h3>
              <p className="dp-card-body">{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Cta({ variant }: { variant: string }) {
  return (
    <section className={`dp-cta dp-cta-${variant}`} data-animate="entrance">
      <div className="dp-section-inner dp-cta-inner">
        <h2 className="dp-type dp-type-heading-2">Ready to start?</h2>
        <p className="dp-type dp-type-body-l">
          Tell us what you need and we will come back with a plan and a price.
        </p>
        <div className="dp-row">
          <input className="dp-input" placeholder="you@company.com" readOnly />
          <button className="dp-btn dp-btn-solid">Request a call</button>
        </div>
      </div>
    </section>
  );
}

function Footer({ variant, brand }: { variant: string; brand: string }) {
  const groups = [
    { title: "Services", links: ["Websites", "Branding", "Support"] },
    { title: "Company", links: ["About", "Work", "Careers"] },
    { title: "Legal", links: ["Privacy", "Terms"] },
  ];
  return (
    <footer className={`dp-footer dp-footer-${variant}`}>
      <div className="dp-section-inner dp-footer-inner">
        <div className="dp-footer-brand">
          <span className="dp-navbar-brand">{brand}</span>
          <p className="dp-type dp-type-small">Design and delivery for businesses that need to be taken seriously.</p>
        </div>
        {variant !== "minimal" &&
          groups.map((group) => (
            <div key={group.title} className="dp-footer-group">
              <span className="dp-footer-heading">{group.title}</span>
              {group.links.map((link) => (
                <a key={link} className="dp-footer-link" href="#0">{link}</a>
              ))}
            </div>
          ))}
      </div>
    </footer>
  );
}
