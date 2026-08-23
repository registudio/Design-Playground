"use client";

import { useRef } from "react";
import type { DesignProject } from "@/schema/project";
import { CustomCursor } from "../CustomCursor";
import { useAutoAnimate } from "@/motion/useAutoAnimate";

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
  const rootRef = useRef<HTMLDivElement>(null);

  // Wires §12's entrance/hover recipes onto the page in one pass — see
  // useAutoAnimate for why this is a query-and-attach rather than per-element hooks.
  useAutoAnimate(rootRef, project);

  return (
    // Element variants are applied via data attributes on the root so a card or
    // button choice reaches every instance on the page, not just the gallery.
    <div
      ref={rootRef}
      className="dp-page dp-sample"
      data-button={components.button}
      data-card={components.card}
      data-input={components.input}
      data-cursor={components.cursor}
    >
      <CustomCursor variant={components.cursor} />
      <Announcement variant={components.announcement} />
      <Navbar variant={components.navbar} brand={brand} />
      <Hero variant={components.hero} brand={brand} />
      <Features variant={components.features} />
      <SocialProof variant={components.socialProof} />
      <Pricing variant={components.pricing} />
      <Faq variant={components.faq} />
      <Team variant={components.team} />
      <Blog variant={components.blog} />
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
        <div className="dp-features-items">
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

/** Social proof (§11.2). "none" removes the slot entirely. */
function SocialProof({ variant }: { variant: string }) {
  if (variant === "none") return null;

  if (variant === "logo-cloud") {
    return (
      <section className="dp-proof dp-proof-logo-cloud" data-animate="entrance">
        <div className="dp-section-inner">
          <p className="dp-type dp-type-small dp-proof-eyebrow">Trusted by teams at</p>
          <div className="dp-logo-cloud">
            {["Northgate", "Vertex", "Lumen", "Arbor", "Kestrel"].map((name) => (
              <span key={name} className="dp-logo-item">{name}</span>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "metrics") {
    const metrics = [
      { value: "200+", label: "Projects delivered" },
      { value: "98%", label: "Client retention" },
      { value: "12 yrs", label: "In business" },
      { value: "4.9/5", label: "Average rating" },
    ];
    return (
      <section className="dp-proof dp-proof-metrics" data-animate="entrance">
        <div className="dp-section-inner dp-metrics-grid">
          {metrics.map((m) => (
            <div key={m.label} className="dp-metric">
              <span className="dp-type dp-type-heading-1 dp-metric-value">{m.value}</span>
              <span className="dp-type dp-type-small dp-metric-label">{m.label}</span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const quotes = [
    { quote: "They rebuilt our site in six weeks and enquiries doubled.", name: "Sarah Tan", role: "MD, Northgate" },
    { quote: "The clearest process we have had with any agency.", name: "James Lim", role: "Founder, Vertex" },
    { quote: "Our team can finally update the site without help.", name: "Aisha Rahman", role: "Marketing, Lumen" },
  ];
  return (
    <section className={`dp-proof dp-proof-${variant}`}>
      <div className="dp-section-inner">
        <h2 className="dp-type dp-type-heading-2 dp-section-heading" data-animate="entrance">
          What clients say
        </h2>
        <div className="dp-quote-grid">
          {quotes.map((q, i) => (
            <figure key={q.name} className="dp-card dp-quote" data-animate="entrance" style={{ ["--dp-stagger-index" as string]: i }}>
              <blockquote className="dp-quote-text">“{q.quote}”</blockquote>
              <figcaption className="dp-quote-author">
                <span className="dp-quote-name">{q.name}</span>
                <span className="dp-quote-role">{q.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing({ variant }: { variant: string }) {
  if (variant === "none") return null;
  const tiers = [
    { name: "Starter", price: "$2,400", blurb: "A focused single-page site.", features: ["1 page", "Brand setup", "2 revisions"] },
    { name: "Business", price: "$6,800", blurb: "A complete multi-page site.", features: ["Up to 8 pages", "CMS setup", "Analytics", "4 revisions"], featured: true },
    { name: "Bespoke", price: "Let's talk", blurb: "Custom scope and integrations.", features: ["Unlimited pages", "Custom features", "Ongoing support"] },
  ];
  const shown = variant === "single" ? tiers.slice(1, 2) : tiers;

  return (
    <section className={`dp-pricing dp-pricing-${variant}`}>
      <div className="dp-section-inner">
        <h2 className="dp-type dp-type-heading-2 dp-section-heading" data-animate="entrance">
          Simple pricing
        </h2>
        {variant === "toggle" && (
          <div className="dp-pricing-switch" data-animate="entrance">
            <span className="dp-pricing-switch-option" data-active="true">Monthly</span>
            <span className="dp-pricing-switch-option">Annual</span>
          </div>
        )}
        <div className="dp-pricing-grid">
          {shown.map((tier, i) => (
            <article
              key={tier.name}
              className="dp-card dp-tier"
              data-featured={tier.featured ? "true" : undefined}
              data-animate="entrance"
              style={{ ["--dp-stagger-index" as string]: i }}
            >
              <span className="dp-tier-name">{tier.name}</span>
              <span className="dp-type dp-type-heading-1 dp-tier-price">{tier.price}</span>
              <p className="dp-card-body">{tier.blurb}</p>
              <ul className="dp-tier-features">
                {tier.features.map((f) => <li key={f}>{f}</li>)}
              </ul>
              <button className="dp-btn dp-btn-solid">Choose {tier.name}</button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq({ variant }: { variant: string }) {
  if (variant === "none") return null;
  const items = [
    { q: "How long does a project take?", a: "Most business sites take four to eight weeks from kickoff to launch." },
    { q: "Do you write the copy?", a: "We can. Most clients supply a first draft and we edit it for the web." },
    { q: "Who hosts the site?", a: "We deploy to modern hosting and hand over full ownership." },
    { q: "Can we update it ourselves?", a: "Yes — we set up a CMS and train your team before launch." },
  ];
  // "list" is always expanded (no accordion interaction), so every answer starts open.
  const alwaysOpen = variant === "list" || variant === "grid" || variant === "two-column";
  return (
    <section className={`dp-faq dp-faq-${variant}`}>
      <div className="dp-section-inner">
        <h2 className="dp-type dp-type-heading-2 dp-section-heading" data-animate="entrance">
          Common questions
        </h2>
        <div className="dp-faq-items">
          {items.map((item, i) => (
            <div
              key={item.q}
              className="dp-faq-item"
              data-open={alwaysOpen || i === 0 ? "true" : undefined}
              data-animate="entrance"
            >
              <div className="dp-faq-question">
                <span>{item.q}</span>
                <span className="dp-faq-icon" aria-hidden="true">+</span>
              </div>
              <p className="dp-faq-answer">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Team({ variant }: { variant: string }) {
  if (variant === "none") return null;
  const people = [
    { name: "Reginald Tan", role: "Founder & Design Lead" },
    { name: "Mei Chen", role: "Frontend Engineer" },
    { name: "Daniel Okafor", role: "Brand Strategist" },
    { name: "Priya Nair", role: "Project Manager" },
  ];
  const shown = variant === "featured" ? people.slice(0, 3) : people;
  // "minimal" is a dense text list - a photo would fight the density it's going for.
  const withPhoto = variant !== "minimal";
  return (
    <section className={`dp-team dp-team-${variant}`}>
      <div className="dp-section-inner">
        <h2 className="dp-type dp-type-heading-2 dp-section-heading" data-animate="entrance">
          The team
        </h2>
        <div className="dp-team-items">
          {shown.map((person, i) => (
            <article key={person.name} className="dp-person" data-animate="entrance" style={{ ["--dp-stagger-index" as string]: i }}>
              {withPhoto && <div className="dp-person-photo dp-image" />}
              <span className="dp-person-name">{person.name}</span>
              <span className="dp-person-role">{person.role}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Announcement({ variant }: { variant: string }) {
  if (variant === "none") return null;
  return (
    <div className={`dp-announcement dp-announcement-${variant}`}>
      <span>New: we now offer fixed-price starter packages.</span>
      <a href="#0">Learn more →</a>
    </div>
  );
}

function Blog({ variant }: { variant: string }) {
  if (variant === "none") return null;
  const posts = [
    { title: "Five things to check before your site launches", tag: "Guides", date: "12 Aug" },
    { title: "Why we moved to a design-tokens workflow", tag: "Process", date: "3 Aug" },
    { title: "A short case study: Northgate's new site", tag: "Case study", date: "28 Jul" },
    { title: "What makes a hero section actually convert", tag: "Design", date: "19 Jul" },
  ];
  const shown = variant === "featured" ? posts.slice(0, 3) : posts;

  return (
    <section className={`dp-blog dp-blog-${variant}`}>
      <div className="dp-section-inner">
        <h2 className="dp-type dp-type-heading-2 dp-section-heading" data-animate="entrance">
          From the blog
        </h2>
        <div className="dp-blog-items">
          {shown.map((post, i) => (
            <article key={post.title} className="dp-card dp-post" data-animate="entrance" style={{ ["--dp-stagger-index" as string]: i }}>
              <div className="dp-post-image dp-image" />
              <span className="dp-post-tag">{post.tag} · {post.date}</span>
              <h3 className="dp-card-title dp-post-title">{post.title}</h3>
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
  const socialLabels = ["X", "IG", "LI"];

  if (variant === "simple") {
    return (
      <footer className="dp-footer dp-footer-simple">
        <div className="dp-section-inner dp-footer-simple-inner">
          <span className="dp-type dp-type-small">© {new Date().getFullYear()} {brand}. All rights reserved.</span>
          <nav className="dp-footer-simple-links">
            <a className="dp-footer-link" href="#0">Privacy</a>
            <a className="dp-footer-link" href="#0">Terms</a>
          </nav>
        </div>
      </footer>
    );
  }

  return (
    <footer className={`dp-footer dp-footer-${variant}`}>
      <div className="dp-section-inner dp-footer-inner">
        <div className="dp-footer-brand">
          <span className="dp-navbar-brand">{brand}</span>
          <p className="dp-type dp-type-small">Design and delivery for businesses that need to be taken seriously.</p>
          {variant === "mega" && (
            <div className="dp-footer-newsletter">
              <input className="dp-input" placeholder="you@company.com" readOnly />
              <button className="dp-btn dp-btn-solid dp-btn-sm">Subscribe</button>
            </div>
          )}
          {variant === "social" && (
            <div className="dp-footer-social-row">
              {socialLabels.map((label) => (
                <span key={label} className="dp-footer-social-icon">{label}</span>
              ))}
            </div>
          )}
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
