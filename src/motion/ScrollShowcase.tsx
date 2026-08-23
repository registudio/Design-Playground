"use client";

import { useEffect, useRef } from "react";
import { getGsap, ScrollTrigger } from "./gsapClient";
import { usePrefersReducedMotion } from "./reduced";

/**
 * Live GSAP ScrollTrigger demos for every recipe in §12.4 (§14 "component-level
 * animations"). Each box owns its own scroll container — `scroller: box` rather than
 * the page — so all seven are explorable side by side without needing the whole
 * Sample Page to be tall enough to demonstrate a pinned section or a scrubbed one.
 *
 * These are the classic GSAP/motion.dev demo categories: reveal-on-scroll, parallax,
 * a scroll-tied progress bar, a pinned section, a sticky opacity/scale transition, a
 * scrubbed (not eased) rotation, and a vertical-scroll-drives-horizontal-motion strip.
 */
export function ScrollShowcase() {
  const reduced = usePrefersReducedMotion();

  return (
    <div className="dp-scroll-showcase">
      <RevealDemo reduced={reduced} />
      <ParallaxDemo reduced={reduced} />
      <ProgressDemo reduced={reduced} />
      <PinnedDemo reduced={reduced} />
      <StickyDemo reduced={reduced} />
      <ScrubbedDemo reduced={reduced} />
      <HorizontalDemo reduced={reduced} />
    </div>
  );
}

function Box({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="dp-scroll-box">
      <span className="dp-scroll-box-label">{label}</span>
      {children}
    </div>
  );
}

function RevealDemo({ reduced }: { reduced: boolean }) {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const gsap = getGsap();
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".dp-scroll-card", el).forEach((card) => {
        gsap.fromTo(
          card,
          { opacity: 0, y: reduced ? 0 : 28 },
          {
            opacity: 1, y: 0, duration: reduced ? 0 : 0.5, ease: "power2.out",
            scrollTrigger: { trigger: card, scroller: el, start: "top 90%", toggleActions: "play none none reverse" },
          },
        );
      });
    }, el);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <Box label="Reveal on scroll">
      <div ref={scroller} className="dp-scroll-container">
        {["Strategy", "Design", "Build", "Launch"].map((title) => (
          <div key={title} className="dp-scroll-card">{title}</div>
        ))}
      </div>
    </Box>
  );
}

function ParallaxDemo({ reduced }: { reduced: boolean }) {
  const scroller = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    const bg = layer.current;
    if (!el || !bg || reduced) return;
    const gsap = getGsap();
    const ctx = gsap.context(() => {
      gsap.to(bg, {
        yPercent: 30,
        ease: "none",
        scrollTrigger: { trigger: el, scroller: el, start: "top top", end: "bottom top", scrub: true },
      });
    }, el);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <Box label="Parallax">
      <div ref={scroller} className="dp-scroll-container">
        <div ref={layer} className="dp-parallax-layer" />
        <div className="dp-parallax-content">
          <p className="dp-type dp-type-heading-3">Scroll this box</p>
          <p className="dp-hint">The gradient behind this text moves slower than the scroll itself.</p>
        </div>
      </div>
    </Box>
  );
}

function ProgressDemo({ reduced }: { reduced: boolean }) {
  const scroller = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    const barEl = bar.current;
    if (!el || !barEl) return;
    const gsap = getGsap();
    const ctx = gsap.context(() => {
      gsap.fromTo(
        barEl,
        { scaleX: 0 },
        {
          scaleX: 1, ease: "none",
          scrollTrigger: {
            trigger: el, scroller: el, start: "top top", end: "bottom bottom",
            scrub: reduced ? false : 0.3,
          },
        },
      );
    }, el);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <Box label="Scroll progress">
      <div className="dp-progress-track"><div ref={bar} className="dp-progress-track-fill" /></div>
      <div ref={scroller} className="dp-scroll-container dp-scroll-container-tall">
        {["01", "02", "03", "04", "05"].map((n) => (
          <div key={n} className="dp-scroll-card dp-scroll-card-muted">Section {n}</div>
        ))}
      </div>
    </Box>
  );
}

function PinnedDemo({ reduced }: { reduced: boolean }) {
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    const pin = pinned.current;
    if (!el || !pin || reduced) return;
    const gsap = getGsap();
    const ctx = gsap.context(() => {
      ScrollTrigger.create({ trigger: pin, scroller: el, start: "top top", end: "+=200", pin: true, pinSpacing: false });
    }, el);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <Box label="Pinned section">
      <div ref={scroller} className="dp-scroll-container dp-scroll-container-tall">
        <div ref={pinned} className="dp-scroll-card dp-scroll-card-pinned">Pinned while you scroll</div>
        <div style={{ height: 260 }} />
        <div className="dp-scroll-card">Then the page continues</div>
      </div>
    </Box>
  );
}

function StickyDemo({ reduced }: { reduced: boolean }) {
  const scroller = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    const target = card.current;
    if (!el || !target) return;
    const gsap = getGsap();
    const ctx = gsap.context(() => {
      gsap.fromTo(
        target,
        { opacity: 0.3, scale: 0.9 },
        {
          opacity: 1, scale: 1, ease: "none",
          scrollTrigger: { trigger: target, scroller: el, start: "top 80%", end: "top 30%", scrub: reduced ? false : true },
        },
      );
    }, el);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <Box label="Sticky transition">
      <div ref={scroller} className="dp-scroll-container dp-scroll-container-tall">
        <div style={{ height: 120 }} />
        <div ref={card} className="dp-scroll-card">Fades and scales in as it passes through</div>
        <div style={{ height: 160 }} />
      </div>
    </Box>
  );
}

function ScrubbedDemo({ reduced }: { reduced: boolean }) {
  const scroller = useRef<HTMLDivElement>(null);
  const badge = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    const target = badge.current;
    if (!el || !target || reduced) return;
    const gsap = getGsap();
    const ctx = gsap.context(() => {
      gsap.to(target, {
        rotate: 180, y: 120, ease: "none",
        scrollTrigger: { trigger: el, scroller: el, start: "top top", end: "bottom bottom", scrub: 0 },
      });
    }, el);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <Box label="Scrubbed sequence">
      <div ref={scroller} className="dp-scroll-container dp-scroll-container-tall">
        <div ref={badge} className="dp-scrub-badge">↻</div>
      </div>
    </Box>
  );
}

function HorizontalDemo({ reduced }: { reduced: boolean }) {
  const scroller = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    const trackEl = track.current;
    if (!el || !trackEl || reduced) return;
    const gsap = getGsap();
    const ctx = gsap.context(() => {
      const distance = trackEl.scrollWidth - el.clientWidth;
      gsap.to(trackEl, {
        x: -distance, ease: "none",
        scrollTrigger: { trigger: el, scroller: el, start: "top top", end: "bottom top", scrub: true },
      });
    }, el);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <Box label="Horizontal sequence">
      <div ref={scroller} className="dp-scroll-container dp-scroll-container-tall">
        <div style={{ height: "150%" }}>
          <div ref={track} className="dp-horizontal-track">
            {["Discover", "Design", "Deliver", "Delight"].map((word) => (
              <div key={word} className="dp-horizontal-panel">{word}</div>
            ))}
          </div>
        </div>
      </div>
    </Box>
  );
}
