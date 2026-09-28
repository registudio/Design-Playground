"use client";

import { useState } from "react";
import { useProjectStore } from "@/store/project-store";
import { suggestPalette } from "@/color/semantic";
import { asDetected, type SiteColor, type SiteFont } from "@/brand/site-extract";
import { findFontLoose as findFont } from "@/fonts/catalogue";
import { useLogoUpload } from "./AssetUpload";

/**
 * Start from the client's current website: its colours, typefaces and logo, read by
 * /api/brand-from-url and offered here as suggestions. Nothing is applied until a
 * person chooses it — a stylesheet also carries cookie banners and widgets whose
 * colours are not the brand's, so what was found is shown before it is used.
 */
interface Reading {
  url: string;
  title: string;
  colors: SiteColor[];
  fonts: SiteFont[];
  logo: { dataUrl: string; from: string } | null;
  stylesheetsRead: number;
}

export function BrandFromUrl() {
  const project = useProjectStore(s => s.project);
  const edit = useProjectStore(s => s.edit);
  const { handleFile, busy: logoBusy } = useLogoUpload();
  const [url, setUrl] = useState("");
  const [reading, setReading] = useState<Reading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [used, setUsed] = useState<string[]>([]);
  if (!project) return null;

  const read = async () => {
    setBusy(true);
    setError(null);
    setReading(null);
    setUsed([]);
    try {
      const response = await fetch("/api/brand-from-url", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
      const body = await response.json() as Reading & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "The site could not be read.");
      setReading(body);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The site could not be read.");
    } finally {
      setBusy(false);
    }
  };

  const useColors = () => {
    if (!reading?.colors.length) return;
    const suggestion = suggestPalette({ detected: asDetected(reading.colors) });
    edit("Use the site's colours", draft => {
      draft.suggestion = suggestion;
      draft.tokens.colors = suggestion;
      for (const key of Object.keys(suggestion.light.semantic)) draft.provenance[`tokens.colors.${key}`] = "extracted";
    });
    setUsed(u => [...u, "colours"]);
  };

  const useFont = (font: SiteFont, role: "display" | "body") => {
    const entry = findFont(font.family);
    if (!entry) return;
    edit(`Use ${entry.family} from the site`, draft => {
      draft.tokens.typography[role] = { ...draft.tokens.typography[role], family: entry.family, fallback: entry.fallback, source: entry.source, weights: entry.weights, files: undefined, license: undefined };
      draft.provenance[`tokens.typography.${role}`] = "extracted";
    });
    setUsed(u => [...u, `${role}:${font.family}`]);
  };

  const useLogo = async () => {
    if (!reading?.logo) return;
    const blob = await (await fetch(reading.logo.dataUrl)).blob();
    const name = decodeURIComponent(new URL(reading.logo.from).pathname.split("/").pop() || "logo") || "logo";
    await handleFile(new File([blob], name, { type: blob.type }));
    setUsed(u => [...u, "logo"]);
  };

  const headingFont = reading?.fonts.find(f => f.headings) ?? reading?.fonts[0];
  const bodyFont = reading?.fonts.find(f => f !== headingFont && !f.headings) ?? reading?.fonts.find(f => f !== headingFont);

  return (
    <div className="brand-from-url">
      <form onSubmit={e => { e.preventDefault(); if (url.trim()) void read(); }}>
        <label htmlFor="brand-url">Or start from their current website</label>
        <div>
          <input id="brand-url" type="text" inputMode="url" placeholder="acme.com" value={url} onChange={e => setUrl(e.target.value)} />
          <button type="submit" className="quiet-button" disabled={busy || !url.trim()}>{busy ? "Reading…" : "Read the site"}</button>
        </div>
      </form>
      {error && <p role="alert" className="brand-from-url-error">{error}</p>}
      {reading && (
        <div className="brand-from-url-result" aria-live="polite">
          <p className="brand-from-url-source">From <strong>{reading.title || new URL(reading.url).hostname}</strong> · {reading.stylesheetsRead} {reading.stylesheetsRead === 1 ? "stylesheet" : "stylesheets"} read</p>

          <section>
            <h3>Colours</h3>
            {reading.colors.length ? <>
              <div className="brand-from-url-swatches">{reading.colors.map(c => <span key={c.hex} title={`${c.hex} · ${c.source}`} style={{ background: c.hex }}><em>{c.hex}</em></span>)}</div>
              <button type="button" className="quiet-button" onClick={useColors} disabled={used.includes("colours")}>{used.includes("colours") ? "✓ Palette built from these" : "Build the palette from these"}</button>
            </> : <p>No brand colours found — only greys, or colours the page draws with images.</p>}
          </section>

          <section>
            <h3>Typefaces</h3>
            {reading.fonts.length ? <ul>{[headingFont, bodyFont].filter((f): f is SiteFont => !!f).map((font, i) => {
              const role = i === 0 ? "display" : "body";
              const inCatalogue = !!findFont(font.family);
              return <li key={font.family}>
                <span>{font.family}</span><small>{role === "display" ? "headings" : "body text"}</small>
                {inCatalogue
                  ? <button type="button" className="quiet-button" onClick={() => useFont(font, role)} disabled={used.includes(`${role}:${font.family}`)}>{used.includes(`${role}:${font.family}`) ? "✓ Used" : `Use for ${role === "display" ? "headings" : "body"}`}</button>
                  : <small className="brand-from-url-note">Not in the font catalogue — upload its file under The basics › Typography.</small>}
              </li>;
            })}</ul> : <p>No named typefaces found.</p>}
          </section>

          <section>
            <h3>Logo</h3>
            {reading.logo ? <div className="brand-from-url-logo">
              {/* A data URL the server fetched; next/image would add nothing here. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={reading.logo.dataUrl} alt={`Logo found on ${reading.title || "the site"}`} />
              <button type="button" className="quiet-button" onClick={() => void useLogo()} disabled={logoBusy || used.includes("logo")}>{used.includes("logo") ? "✓ Using this logo" : logoBusy ? "Analysing…" : "Use this logo"}</button>
            </div> : <p>No logo image found. Upload one above.</p>}
          </section>
        </div>
      )}
    </div>
  );
}
