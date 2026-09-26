"use client";

import { useEffect, useRef, useState } from "react";
import { useProjectStore } from "@/store/project-store";
import { scopedTokenCss } from "@/export/css";
import { PRESETS } from "@/presets";
import { resolveCopy } from "@/presets/copy";
import { SEMANTIC_TOKENS } from "@/schema/primitives";
import { useGoogleFonts } from "@/fonts/use-google-fonts";
import { useCustomFonts } from "@/fonts/use-custom-fonts";

/**
 * A live specimen of the project's design, beside the Basics controls.
 *
 * The Basics step was a wall of controls whose only visible result was a hex code, a
 * font's name and a number — you had to press Visualise to learn what "Rounded" or
 * "Editorial Serif" actually did. This renders a small page in the project's own type,
 * colour, radius, spacing, shadow, alignment and image treatment, and it redraws on the
 * same store update the controls write to, so every change is visible the instant it
 * is made.
 *
 * The variables are the generator's own output under a scoped selector, not a restated
 * approximation, so the specimen cannot disagree with the preview or the export.
 *
 * The part of the page an edit affected is briefly outlined, so a control and its
 * result are connected even when the change is subtle — a shadow step, a tracking tweak.
 */

/** Which region of the specimen an edit touches, read from its history label. */
const FOCUS_RULES: Array<[RegExp, string]> = [
  [/pairing|font|type scale|casing|weight|line height|tracking|size/i, "type"],
  [/radius/i, "radius"],
  [/spacing|density|gutter|width/i, "space"],
  [/shadow/i, "shadow"],
  [/align/i, "align"],
  [/image|overlay|treatment/i, "image"],
  [/border/i, "border"],
  [/colour|color|primary|secondary|accent|background|surface|foreground|muted|palette|theme/i, "colour"],
];

export function BasicsSpecimen() {
  const project = useProjectStore(s => s.project);
  const theme = useProjectStore(s => s.theme);
  const setTheme = useProjectStore(s => s.setTheme);
  const lastLabel = useProjectStore(s => s.history.past.at(-1)?.label ?? "");
  const lastAt = useProjectStore(s => s.history.past.at(-1)?.at ?? 0);
  const [focus, setFocus] = useState<string | null>(null);
  const first = useRef(true);

  useEffect(() => {
    // Not on mount: arriving on the step is not an edit.
    if (first.current) { first.current = false; return; }
    const match = FOCUS_RULES.find(([pattern]) => pattern.test(lastLabel));
    if (!match) return;
    setFocus(match[1]);
    const timer = setTimeout(() => setFocus(null), 1100);
    return () => clearTimeout(timer);
  }, [lastLabel, lastAt]);

  const typography = project?.tokens.typography;
  useGoogleFonts(typography ? [typography.display.family, typography.body.family, typography.mono.family] : []);
  useCustomFonts(project);

  if (!project || !typography) return null;
  const { tokens } = project;
  const brand = project.client || project.name || "Your brand";
  const copy = resolveCopy(PRESETS.find(p => p.id === project.appliedPreset)?.copy, brand);
  const dark = theme === "dark" && !!tokens.colors.dark;
  const scale = typography.scale;

  return (
    <aside className="basics-specimen" aria-label="Live preview of your design">
      <style>{scopedTokenCss(tokens, ".bs-page", dark ? "dark" : "light")}</style>
      <header className="bs-chrome">
        <span><i />Live · updates as you edit</span>
        {tokens.colors.dark && (
          <button type="button" onClick={() => setTheme(dark ? "light" : "dark")} aria-label={`Show ${dark ? "light" : "dark"} theme`}>
            {dark ? "☾ Dark" : "☼ Light"}
          </button>
        )}
      </header>

      <div className="bs-page" data-focus={focus ?? undefined} data-treatment={tokens.imagery.treatment}>
        <nav className="bs-nav">
          <b>{brand}</b>
          <span>{copy.footerGroups[0]?.links.slice(0, 3).join("   ")}</span>
          <button className="bs-btn bs-btn-solid bs-btn-sm" type="button" tabIndex={-1}>{copy.navCta}</button>
        </nav>

        <section className="bs-hero">
          <span className="bs-badge">{copy.badge}</span>
          <h2 className="bs-display">{copy.headline}</h2>
          <p className="bs-lede">{copy.lede}</p>
          <div className="bs-actions">
            <button className="bs-btn bs-btn-solid" type="button" tabIndex={-1}>{copy.primaryCta}</button>
            <button className="bs-btn bs-btn-outline" type="button" tabIndex={-1}>{copy.secondaryCta}</button>
          </div>
        </section>

        <div className="bs-image" role="img" aria-label="Image treatment" />

        <section className="bs-cards">
          {copy.features.slice(0, 2).map(feature => (
            <article key={feature.title} className="bs-card">
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </section>

        <section className="bs-type" aria-label="Type ladder">
          <div><small>Display · {typography.display.family}</small><span className="bs-t-h1">Aa Heading {scale.heading1.size}rem</span></div>
          <div><small>Body · {typography.body.family}</small><span className="bs-t-body">The quick brown fox jumps over the lazy dog. 0123456789</span></div>
          <div><small>Mono · {typography.mono.family}</small><span className="bs-t-mono">{`const brand = "${brand}";`}</span></div>
        </section>

        <section className="bs-swatches" aria-label="Colours">
          {SEMANTIC_TOKENS.slice(0, 8).map(token => (
            <span key={token} title={token} style={{ background: `var(--dp-color-${token})` }}><em>{token}</em></span>
          ))}
        </section>
      </div>
    </aside>
  );
}
