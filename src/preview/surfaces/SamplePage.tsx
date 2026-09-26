"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import type { DesignProject } from "@/schema/project";
import { CustomCursor } from "../CustomCursor";
import { useAutoAnimate } from "@/motion/useAutoAnimate";
import { EditableOverlay } from "@/preview/EditableOverlay";
import { pageSections, SECTION_LABELS, type PageSection } from "@/schema/composition";
import { ELEMENTS, elementDocument } from "@/elements/catalogue";
import { sourceById } from "@/registry/sources";
import { behaviourFor, plainSummary } from "@/elements/plain-language";
import { browseCategory } from "@/elements/taxonomy";
import { RegistryPreview } from "@/components/RegistryPreview";
import { getAsset } from "@/store/persistence";
import { toHex } from "@/color/oklch";
import { resolveSemantic } from "@/color/semantic";
import { PRESETS } from "@/presets";
import { resolveCopy, type SampleCopy } from "@/presets/copy";

/**
 * The Sample Page (§13.1): every current choice shown together in a realistic generic
 * business website. It is explicitly not the client's final site — it exists so design
 * decisions are legible in context.
 *
 * Fixed slots, one variant each (§15.8 excludes arbitrary page composition). Each
 * section reads its variant from the recipe and changes *structure* only — never its
 * own colours or type, which always come from Foundation (§11.3).
 */

export function SamplePage({ project, editable = false, assetUrls = {}, staticExport = false }: { project: DesignProject; editable?: boolean; assetUrls?: Record<string, string>; staticExport?: boolean }) {
  const { components } = project.recipe;
  const brand = project.client || project.name || "Northwind";
  // The applied template decides the words as well as the look, so a tuition centre's
  // sample reads like a tuition centre. Custom and blank projects keep the agency copy.
  const copy = resolveCopy(PRESETS.find(p => p.id === project.appliedPreset)?.copy, brand);
  const rootRef = useRef<HTMLDivElement>(null);

  // Wires §12's entrance/hover recipes onto the page in one pass — see
  // useAutoAnimate for why this is a query-and-attach rather than per-element hooks.
  useAutoAnimate(rootRef, project);
  const [loadedAssets, setLoadedAssets] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    Promise.all(project.assets.images.map(async image => {
      const blob = await getAsset(image.hash);
      if (!blob || cancelled) return null;
      const url = URL.createObjectURL(blob); urls.push(url);
      return [image.file, url] as const;
    })).then(entries => { if (!cancelled) setLoadedAssets(Object.fromEntries(entries.filter(e => e !== null))); }).catch(() => {});
    return () => { cancelled = true; urls.forEach(url => URL.revokeObjectURL(url)); };
  }, [project.assets.images]);
  const images = { ...loadedAssets, ...assetUrls };
  const logoFile = project.assets.logo.primary ?? project.assets.logo.light ?? project.assets.logo.dark;
  const logo = logoFile ? images[logoFile] : undefined;
  const heroImage = project.assets.images.find(image => image.kind === "hero-image") ?? project.assets.images.find(image => !Object.values(project.assets.logo).includes(image.file) && !["icon", "logo", "logo-mark", "logo-light", "logo-dark"].includes(image.kind));
  const order = pageSections(project.recipe);
  const sections: Record<PageSection, React.ReactNode> = {
    announcement: <Announcement variant={components.announcement} copy={copy}/>,
    navbar: <Navbar variant={components.navbar} brand={brand} logo={logo} order={order} copy={copy}/>,
    hero: <Hero variant={components.hero} image={heroImage ? images[heroImage.file] : undefined} copy={copy}/>,
    features: <Features variant={components.features} copy={copy}/>, socialProof: <SocialProof variant={components.socialProof} copy={copy}/>,
    pricing: <Pricing variant={components.pricing} copy={copy}/>, faq: <Faq variant={components.faq} copy={copy}/>, team: <Team variant={components.team} copy={copy}/>,
    blog: <Blog variant={components.blog} copy={copy}/>, cta: <Cta variant={components.cta} copy={copy}/>, footer: <Footer variant={components.footer} brand={brand} copy={copy}/>,
  };
  const accent = toHex(resolveSemantic(project.tokens.colors, "light", "primary"));
  const renderElements = (placement: string) => <>{(project.recipe.elements ?? []).filter(e => e.placement === placement || (placement === "page" && !order.includes(e.placement as PageSection))).map(e => {
    const item = ELEMENTS.find(item => item.id === e.id);
    const summary = plainSummary(e.id);
    return item ? <section key={e.id} className="dp-selected-effect" data-element={e.id}>{summary && <ReviewNote title={item.title} lines={[`${summary.what} ${summary.behaviour}`, summary.access]} note={e.note}/>}<iframe title={item.title} sandbox="allow-scripts" srcDoc={elementDocument(e.id, accent)} style={{ width: "100%", height: 360, border: 0, display: "block" }}/></section> : null;
  })}{project.selections.filter(e => e.placement === placement || (placement === "page" && !order.includes(e.placement as PageSection))).map(e => <section key={e.id} className="dp-selected-effect" data-element={e.id}><ReviewNote title={e.title} lines={[behaviourFor(browseCategory(e))]} note={e.intendedUse}/><p>{e.title} · <a href={sourceById(e.source)?.homepage} target="_blank" rel="noreferrer">{sourceById(e.source)?.label}</a></p>{staticExport ? <p>Install this external component: <code>{e.installCommand}</code>. Live preview is available in Design Playground.</p> : <div className="dp-registry-preview"><RegistryPreview element={e}/></div>}</section>)}</>;

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
      data-editable={editable ? "true" : undefined}
    >
      <CustomCursor variant={components.cursor} image={project.recipe.cursorImage} />
      <p className="dp-demo-notice">Design sample · Names, claims, prices and links are examples. Replace them before publishing.</p>
      {order.map(key => <Fragment key={key}><div id={`section-${key}`}>{sections[key]}</div>{renderElements(key)}</Fragment>)}
      {renderElements("page")}
      {!order.length && !project.recipe.elements?.length && !project.selections.length && <div style={{ padding: "100px 30px", textAlign: "center" }}>Your blank canvas. Add sections or elements to bring it to life.</div>}
      {/* Never enabled for the static/shareable export (react-dom/server's SSR pass
          never fires the effect that attaches this anyway, but the prop keeps the
          intent explicit rather than relying on that). */}
      {editable && <EditableOverlay rootRef={rootRef} project={project} />}
    </div>
  );
}

function Navbar({ variant, brand, logo, order, copy }: { variant: string; brand: string; logo?: string; order: PageSection[]; copy: SampleCopy }) {
  // The hero is where you already are, so it is not a destination. Desktop shows a
  // handful — a template with nine sections put nine links in a row, and in the split
  // and centred layouts, where the brand sits in the middle, they ran underneath it.
  // The mobile menu still lists everything.
  const links = order.filter(key => !["navbar", "footer", "announcement", "hero"].includes(key));
  const desktop = links.slice(0, ["split", "centered"].includes(variant) ? 3 : 5);
  return (
    <header className={`dp-navbar dp-navbar-${variant}`} data-animate="nav">
      <div className="dp-navbar-inner">
        <span className="dp-navbar-brand">{logo ? <img className="dp-navbar-logo" src={logo} alt={brand}/> : brand}</span>
        <nav className="dp-navbar-links">
          {desktop.map((link) => (
            <a key={link} className="dp-navbar-link" href={`#section-${link}`}>{link === "cta" ? "Contact" : SECTION_LABELS[link]}</a>
          ))}
        </nav>
        <details className="dp-mobile-menu"><summary>Menu</summary><nav aria-label="Mobile navigation">{links.map(link => <a key={link} href={`#section-${link}`}>{link === "cta" ? "Contact" : SECTION_LABELS[link]}</a>)}</nav></details>
        <button className="dp-btn dp-btn-solid dp-btn-sm">{copy.navCta}</button>
      </div>
    </header>
  );
}

function Hero({ variant, image, copy }: { variant: string; image?: string; copy: SampleCopy }) {
  const content = (
    <div className="dp-hero-content" data-animate="entrance">
      <span className="dp-badge dp-badge-primary">{copy.badge}</span>
      <h1 className="dp-type dp-type-display-l dp-hero-title">{copy.headline}</h1>
      <p className="dp-type dp-type-body-l dp-hero-lede">{copy.lede}</p>
      <div className="dp-row">
        <button className="dp-btn dp-btn-solid">{copy.primaryCta}</button>
        <button className="dp-btn dp-btn-outline">{copy.secondaryCta}</button>
      </div>
    </div>
  );

  return (
    <section className={`dp-hero dp-hero-${variant}`}>
      <div className="dp-hero-inner">
        {content}
        {variant !== "centered" && <div className="dp-hero-media dp-image" style={image ? { backgroundImage: `url("${image}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />}
      </div>
    </section>
  );
}

function Features({ variant, copy }: { variant: string; copy: SampleCopy }) {
  const items = copy.features;

  return (
    <section className={`dp-features dp-features-${variant}`}>
      <div className="dp-section-inner">
        <h2 className="dp-type dp-type-heading-2 dp-features-title" data-animate="entrance">
          {copy.featuresTitle}
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
function SocialProof({ variant, copy }: { variant: string; copy: SampleCopy }) {
  if (variant === "none") return null;

  if (variant === "logo-cloud") {
    return (
      <section className="dp-proof dp-proof-logo-cloud" data-animate="entrance">
        <div className="dp-section-inner">
          <p className="dp-type dp-type-small dp-proof-eyebrow">{copy.logosEyebrow}</p>
          <div className="dp-logo-cloud">
            {copy.logos.map((name) => (
              <span key={name} className="dp-logo-item">{name}</span>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "metrics") {
    const metrics = copy.metrics;
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

  const quotes = copy.quotes;
  return (
    <section className={`dp-proof dp-proof-${variant}`}>
      <div className="dp-section-inner">
        <h2 className="dp-type dp-type-heading-2 dp-section-heading" data-animate="entrance">
          {copy.quotesTitle}
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

function Pricing({ variant, copy }: { variant: string; copy: SampleCopy }) {
  if (variant === "none") return null;
  const tiers = copy.tiers;
  const shown = variant === "single" ? tiers.slice(1, 2) : tiers;

  return (
    <section className={`dp-pricing dp-pricing-${variant}`}>
      <div className="dp-section-inner">
        <h2 className="dp-type dp-type-heading-2 dp-section-heading" data-animate="entrance">
          {copy.pricingTitle}
        </h2>
        {variant === "toggle" && (
          <div className="dp-pricing-switch" data-animate="entrance">
            <span className="dp-pricing-switch-option" data-active="true">{copy.billing[0]}</span>
            <span className="dp-pricing-switch-option">{copy.billing[1]}</span>
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

function Faq({ variant, copy }: { variant: string; copy: SampleCopy }) {
  if (variant === "none") return null;
  const items = copy.faq;
  // "list" is always expanded (no accordion interaction), so every answer starts open.
  const alwaysOpen = variant === "list" || variant === "grid" || variant === "two-column";
  return (
    <section className={`dp-faq dp-faq-${variant}`}>
      <div className="dp-section-inner">
        <h2 className="dp-type dp-type-heading-2 dp-section-heading" data-animate="entrance">
          {copy.faqTitle}
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

function Team({ variant, copy }: { variant: string; copy: SampleCopy }) {
  if (variant === "none") return null;
  const people = copy.people;
  const shown = variant === "featured" ? people.slice(0, 3) : people;
  // "minimal" is a dense text list - a photo would fight the density it's going for.
  const withPhoto = variant !== "minimal";
  return (
    <section className={`dp-team dp-team-${variant}`}>
      <div className="dp-section-inner">
        <h2 className="dp-type dp-type-heading-2 dp-section-heading" data-animate="entrance">
          {copy.teamTitle}
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

function Announcement({ variant, copy }: { variant: string; copy: SampleCopy }) {
  if (variant === "none") return null;
  return (
    <div className={`dp-announcement dp-announcement-${variant}`}>
      <span>{copy.announcement}</span>
      <a href="#0">Learn more →</a>
    </div>
  );
}

function Blog({ variant, copy }: { variant: string; copy: SampleCopy }) {
  if (variant === "none") return null;
  const posts = copy.posts;
  const shown = variant === "featured" ? posts.slice(0, 3) : posts;

  return (
    <section className={`dp-blog dp-blog-${variant}`}>
      <div className="dp-section-inner">
        <h2 className="dp-type dp-type-heading-2 dp-section-heading" data-animate="entrance">
          {copy.blogTitle}
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

function Cta({ variant, copy }: { variant: string; copy: SampleCopy }) {
  return (
    <section className={`dp-cta dp-cta-${variant}`} data-animate="entrance">
      <div className="dp-section-inner dp-cta-inner">
        <h2 className="dp-type dp-type-heading-2">{copy.ctaTitle}</h2>
        <p className="dp-type dp-type-body-l">{copy.ctaBody}</p>
        <div className="dp-row">
          <input className="dp-input" placeholder={copy.ctaPlaceholder} readOnly />
          <button className="dp-btn dp-btn-solid">{copy.ctaButton}</button>
        </div>
      </div>
    </section>
  );
}

function Footer({ variant, brand, copy }: { variant: string; brand: string; copy: SampleCopy }) {
  const groups = copy.footerGroups;
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
          <p className="dp-type dp-type-small">{copy.footerTagline}</p>
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

/**
 * A reviewer's note above an effect: what it is and how it behaves, in plain words, with
 * the project's own note for it. It is an annotation on the sample, like the banner
 * saying the copy is illustrative, not part of the site being designed.
 */
function ReviewNote({ title, lines, note }: { title: string; lines: string[]; note?: string }) {
  return <aside className="dp-review-note" aria-label={`About ${title}`}>
    <strong>{title}</strong>
    {lines.filter(Boolean).map(line => <p key={line}>{line}</p>)}
    {note?.trim() && <p className="dp-review-note-own">Your note: {note.trim()}</p>}
  </aside>;
}
