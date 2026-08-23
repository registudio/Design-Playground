"use client";

import { useRef, useState } from "react";
import { useProjectStore } from "@/store/project-store";
import { hashBlob, putAsset } from "@/store/persistence";
import { analyseFile } from "@/color/analyse-file";
import { polarityOf, suitableSurfaces } from "@/color/extract";
import { aggregateAssetColors } from "@/color/aggregate";
import { suggestPalette } from "@/color/semantic";
import type { AssetKind } from "@/schema/assets";
import { toHex } from "@/color/oklch";

/**
 * Primary logo upload and analysis (§10.1).
 *
 * The analyser proposes a palette and stores it as a suggestion snapshot; it never
 * locks the design. The user can restore that snapshot at any point, and every
 * assignment stays editable — which is what the spec explicitly requires.
 *
 * The palette suggestion is recomputed from every analysed asset (this logo plus
 * anything added under "Additional assets" below), not just this file — see
 * @/color/aggregate for how logo colours and recurring colours get prioritised.
 */

const ACCEPTED = "image/svg+xml,image/png,image/jpeg,image/webp";

export function AssetUpload() {
  const project = useProjectStore((s) => s.project);
  const edit = useProjectStore((s) => s.edit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!project) return null;

  const handleFile = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const hash = await hashBlob(file);
      await putAsset(hash, file.type, file);
      const analysis = await analyseFile(file);
      const wasFirstAnalysis = project.analysis === null;

      edit("Upload logo", (draft) => {
        draft.assets.images = [
          ...draft.assets.images.filter((i) => i.hash !== hash),
          {
            file: file.name,
            kind: "logo" as AssetKind,
            mime: file.type,
            bytes: file.size,
            hash,
            hasTransparency: analysis.hasTransparency,
            detectedColors: analysis.colors.map((d) => d.color),
            ...(analysis.dimensions ?? {}),
          },
        ];
        draft.assets.logo.primary = file.name;
        draft.analysis = {
          assetFile: file.name,
          method: analysis.method,
          colors: analysis.colors,
          polarity: polarityOf(analysis.colors),
          hasTransparency: analysis.hasTransparency,
          suitableSurfaces: suitableSurfaces(analysis.colors),
        };

        const combined = aggregateAssetColors(draft.assets.images);
        const suggestion = suggestPalette({ detected: combined });
        draft.suggestion = suggestion;

        // Apply automatically only when this is the first colour signal the project
        // has ever had. Once a palette exists — from this logo or a manual edit — a
        // later upload updates the suggestion but never silently overwrites it.
        if (wasFirstAnalysis) {
          draft.tokens.colors = suggestion;
          for (const key of Object.keys(suggestion.light.semantic)) {
            draft.provenance[`tokens.colors.${key}`] = "extracted";
          }
        }
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read that file");
    } finally {
      setBusy(false);
    }
  };

  const detected = project.analysis?.colors ?? [];

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="rounded-lg border border-dashed border-chrome-border px-4 py-6 text-[13px] text-chrome-muted transition-colors hover:border-chrome-accent hover:text-chrome-text disabled:opacity-50"
      >
        {busy ? "Analysing…" : project.assets.logo.primary ?? "Upload a logo (SVG, PNG, JPG, WebP)"}
      </button>

      {/* §10.1 — the analyser is skippable entirely when a company has no logo. */}
      {!project.analysis && !busy && (
        <p className="text-[12px] text-chrome-muted">
          No logo? Skip this — the palette below is fully editable either way.
        </p>
      )}

      {error && <p className="text-[12px] text-chrome-danger">{error}</p>}

      {detected.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-chrome-muted">
            Detected colours
            <span className="ml-2 font-normal normal-case tracking-normal">
              {project.analysis?.method === "svg-attributes" ? "exact, from SVG" : "approximate"}
            </span>
          </span>
          {detected.map((color, index) => (
            <div key={index} className="flex items-center gap-3">
              <span
                className="h-6 w-10 shrink-0 rounded border border-chrome-border"
                style={{ background: toHex(color.color) }}
              />
              <span className="flex-1 text-[13px]">{color.label}</span>
              <span className="font-mono text-[11px] text-chrome-muted">{toHex(color.color)}</span>
              <span className="w-10 text-right font-mono text-[11px] text-chrome-muted">
                {Math.round(color.weight * 100)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {project.suggestion && (
        <button
          type="button"
          onClick={() =>
            edit("Reset to suggested palette", (draft) => {
              if (draft.suggestion) draft.tokens.colors = draft.suggestion;
            })
          }
          className="self-start text-[12px] text-chrome-accent hover:underline"
        >
          Reset to the suggested palette
        </button>
      )}
    </div>
  );
}
