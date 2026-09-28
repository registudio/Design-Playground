"use client";

import { useRef, useState } from "react";
import { useProjectStore } from "@/store/project-store";
import { hashBlob, putAsset } from "@/store/persistence";
import { Field } from "./controls";

/**
 * Upload a brand's own typeface and use it for headings, body text or both.
 *
 * The licence is asked for up front and cannot be left empty: an uploaded face with no
 * recorded licence already blocks the export (§10.1), and asking at the moment of upload
 * — when the person has the licence to hand — beats a blocked export later.
 *
 * The file is checked by loading it as a real FontFace before anything is saved, so a
 * renamed PDF is refused here rather than silently falling back in the preview.
 */
const ACCEPT = ".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf";
const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];
const MIME: Record<string, string> = { woff2: "font/woff2", woff: "font/woff", ttf: "font/ttf", otf: "font/otf" };

/** "AcmeSans-BoldItalic.woff2" → "Acme Sans", weight 700, italic. */
export function guessFromFileName(name: string): { family: string; weight: number; style: "normal" | "italic" } {
  const base = name.replace(/\.[^.]+$/, "");
  const style = /italic|oblique/i.test(base) ? "italic" : "normal";
  const table: [RegExp, number][] = [[/thin|hairline/i, 100], [/extra.?light|ultra.?light/i, 200], [/light/i, 300], [/medium/i, 500], [/semi.?bold|demi.?bold/i, 600], [/extra.?bold|ultra.?bold/i, 800], [/black|heavy/i, 900], [/bold/i, 700]];
  const weight = table.find(([pattern]) => pattern.test(base))?.[1] ?? 400;
  // Words first (camelCase and separators), then drop the ones naming a weight or style.
  const family = base
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\b(thin|hairline|extra ?light|ultra ?light|light|regular|book|medium|semi ?bold|demi ?bold|extra ?bold|ultra ?bold|bold|black|heavy|italic|oblique|variable|vf|webfont)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return { family: family || base, weight, style };
}

export function FontUpload() {
  const project = useProjectStore(s => s.project);
  const edit = useProjectStore(s => s.edit);
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [family, setFamily] = useState("");
  const [weight, setWeight] = useState(400);
  const [style, setStyle] = useState<"normal" | "italic">("normal");
  const [roles, setRoles] = useState<"display" | "body" | "both">("display");
  const [license, setLicense] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!project) return null;

  const choose = (picked: File) => {
    const guess = guessFromFileName(picked.name);
    setFile(picked);
    setFamily(guess.family);
    setWeight(guess.weight);
    setStyle(guess.style);
    setError(null);
  };

  const add = async () => {
    if (!file || !family.trim() || !license.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!MIME[extension]) throw new Error("Use a .woff2, .woff, .ttf or .otf file.");
      // Proves it is a font a browser can actually use before anything is stored.
      const face = new FontFace(`dp-check-${Date.now()}`, await file.arrayBuffer());
      await face.load().catch(() => { throw new Error("That file could not be read as a font."); });
      const mime = file.type || MIME[extension];
      const blob = new Blob([await file.arrayBuffer()], { type: mime });
      const hash = await hashBlob(blob);
      await putAsset(hash, mime, blob);
      const name = family.trim();
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "font";
      const path = `fonts/${slug}-${weight}${style === "italic" ? "-italic" : ""}.${extension}`;
      edit(`Upload ${name} ${weight}${style === "italic" ? " italic" : ""}`, draft => {
        draft.assets.fonts = [
          ...draft.assets.fonts.filter(entry => entry.file !== path),
          { file: path, kind: "font", mime, bytes: blob.size, hash, family: name, weight, style, license: license.trim() },
        ];
        for (const role of roles === "both" ? (["display", "body"] as const) : [roles]) {
          const current = draft.tokens.typography[role];
          const sameFamily = current.source === "custom" && current.family === name;
          const files = [...(sameFamily ? current.files ?? [] : []).filter(f => f.file !== path), { file: path, weight, style }];
          draft.tokens.typography[role] = {
            ...current,
            family: name,
            // The role's existing stack stays behind it while it loads: it was chosen for
            // this role, so it is the closer stand-in.
            fallback: current.fallback.length ? current.fallback : ["system-ui", "sans-serif"],
            source: "custom",
            weights: [...new Set(files.map(f => f.weight))].sort((a, b) => a - b),
            license: license.trim(),
            files,
          };
          draft.provenance[`tokens.typography.${role}`] = "user";
        }
      });
      setFile(null);
      setLicense("");
      if (input.current) input.current.value = "";
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The font could not be added.");
    } finally {
      setBusy(false);
    }
  };

  const remove = (path: string) => edit("Remove uploaded font", draft => {
    draft.assets.fonts = draft.assets.fonts.filter(entry => entry.file !== path);
    for (const role of ["display", "body", "mono"] as const) {
      const font = draft.tokens.typography[role];
      if (font.source !== "custom" || !font.files?.some(f => f.file === path)) continue;
      font.files = font.files.filter(f => f.file !== path);
      font.weights = font.files.length ? [...new Set(font.files.map(f => f.weight))] : [400];
      if (!font.files.length) {
        // Nothing left of it: back to the system face rather than a name with no file.
        draft.tokens.typography[role] = { ...font, family: "system-ui", fallback: ["sans-serif"], source: "system", files: undefined, license: undefined };
      }
    }
  });

  return (
    <Field label="Your own font" hint="Upload the brand's typeface. Its licence is recorded and travels with the export.">
      <div className="font-upload">
        {project.assets.fonts.length > 0 && <ul className="font-upload-list">
          {project.assets.fonts.map(font => <li key={font.file}>
            <span style={{ fontFamily: `"${font.family}"`, fontWeight: font.weight, fontStyle: font.style }}>{font.family} {font.weight}{font.style === "italic" ? " italic" : ""}</span>
            <small>{font.license}</small>
            <button type="button" className="quiet-button" onClick={() => remove(font.file)} aria-label={`Remove ${font.family} ${font.weight}`}>Remove</button>
          </li>)}
        </ul>}
        <label className="font-upload-pick">
          <span>{file ? file.name : "Choose a .woff2, .woff, .ttf or .otf file"}</span>
          <input ref={input} type="file" accept={ACCEPT} aria-label="Upload a font file" onChange={e => { const picked = e.target.files?.[0]; if (picked) choose(picked); }}/>
        </label>
        {file && <div className="font-upload-form">
          <label>Family name<input value={family} onChange={e => setFamily(e.target.value)}/></label>
          <label>Weight<select value={weight} onChange={e => setWeight(Number(e.target.value))}>{WEIGHTS.map(w => <option key={w} value={w}>{w}</option>)}</select></label>
          <label>Style<select value={style} onChange={e => setStyle(e.target.value as "normal" | "italic")}><option value="normal">Normal</option><option value="italic">Italic</option></select></label>
          <label>Use for<select value={roles} onChange={e => setRoles(e.target.value as typeof roles)}><option value="display">Headings</option><option value="body">Body text</option><option value="both">Both</option></select></label>
          <label className="font-upload-licence">Licence<input value={license} onChange={e => setLicense(e.target.value)} placeholder="e.g. SIL OFL 1.1, or the web licence number" aria-describedby="font-licence-hint"/></label>
          <p id="font-licence-hint">Required. A font without a recorded licence cannot be exported to a client build.</p>
          <button type="button" className="primary-button" disabled={busy || !family.trim() || !license.trim()} onClick={() => void add()}>{busy ? "Adding…" : "Add font"}</button>
        </div>}
        {error && <p role="alert" className="font-upload-error">{error}</p>}
      </div>
    </Field>
  );
}
