"use client";

import { useRef, useState } from "react";
import { useProjectStore } from "@/store/project-store";
import { hashBlob, putAsset } from "@/store/persistence";
import { analyseFile } from "@/color/analyse-file";
import { aggregateAssetColors } from "@/color/aggregate";
import { suggestPalette } from "@/color/semantic";
import { AssetKind } from "@/schema/assets";
import { toHex } from "@/color/oklch";

/**
 * Additional assets — second logo variants, gradients, photography, illustrations,
 * anything beyond the primary logo (§10.1's asset library: "Logo Light, Logo Dark,
 * Hero Image, Product Screenshot, Icon, Illustration, Photography, Other").
 *
 * Each upload is analysed for colour the same way the primary logo is. Rather than
 * the newest file simply overwriting the palette suggestion, every analysed asset in
 * the library is re-aggregated together (see @/color/aggregate): logo-kind assets
 * count for more, and a colour that recurs across several assets outranks a colour
 * that only appears once. If a palette already exists, adding an asset updates the
 * suggestion but never silently overwrites the working colours — that needs an
 * explicit click, same principle as "reset to suggestion".
 */

const ACCEPTED = "image/svg+xml,image/png,image/jpeg,image/webp";

/** Kinds selectable here. "logo" and "font" have their own dedicated flows. */
const ADDITIONAL_KINDS = AssetKind.options.filter((k) => k !== "logo" && k !== "font");

const KIND_LABELS: Record<(typeof ADDITIONAL_KINDS)[number], string> = {
  "logo-mark": "Logo mark",
  "logo-light": "Logo (light)",
  "logo-dark": "Logo (dark)",
  "hero-image": "Hero image",
  "product-screenshot": "Product screenshot",
  icon: "Icon",
  illustration: "Illustration",
  photography: "Photography",
  other: "Other",
};

/** A first guess at classification from the filename — always user-editable after. */
function guessKind(filename: string): (typeof ADDITIONAL_KINDS)[number] {
  const name = filename.toLowerCase();
  if (name.includes("mark")) return "logo-mark";
  if (name.includes("light")) return "logo-light";
  if (name.includes("dark")) return "logo-dark";
  if (name.includes("icon")) return "icon";
  if (name.includes("hero")) return "hero-image";
  if (name.includes("screenshot") || name.includes("product")) return "product-screenshot";
  if (name.includes("illustration")) return "illustration";
  if (name.includes("gradient") || name.includes("bg") || name.includes("background")) return "other";
  if (name.includes("photo") || name.includes("team")) return "photography";
  return "other";
}

export function AdditionalAssets() {
  const project = useProjectStore((s) => s.project);
  const edit = useProjectStore((s) => s.edit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!project) return null;

  /** Re-ranks the combined palette across every asset and updates the suggestion. */
  const recomputeSuggestion = (
    draft: Parameters<Parameters<typeof edit>[1]>[0],
  ) => {
    const combined = aggregateAssetColors(draft.assets.images);
    draft.suggestion = combined.length > 0 ? suggestPalette({ detected: combined }) : draft.suggestion;
  };

  const handleFiles = async (files: FileList) => {
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const hash = await hashBlob(file);
        await putAsset(hash, file.type, file);

        let colors: Awaited<ReturnType<typeof analyseFile>>["colors"] = [];
        let dimensions: { width: number; height: number } | undefined;
        try {
          const analysis = await analyseFile(file);
          colors = analysis.colors;
          dimensions = analysis.dimensions;
        } catch {
          // Some assets (a plain photo, a solid-fill gradient PNG the extractor can't
          // read) may yield nothing analysable — still worth keeping in the library.
        }

        const kind = guessKind(file.name);

        edit(`Add asset: ${file.name}`, (draft) => {
          draft.assets.images = [
            ...draft.assets.images.filter((i) => i.hash !== hash),
            {
              file: file.name,
              kind,
              mime: file.type,
              bytes: file.size,
              hash,
              detectedColors: colors.map((c) => c.color),
              ...(dimensions ?? {}),
            },
          ];
          if (kind === "logo-mark") draft.assets.logo.mark = file.name;
          if (kind === "logo-light") draft.assets.logo.light = file.name;
          if (kind === "logo-dark") draft.assets.logo.dark = file.name;
          recomputeSuggestion(draft);
        });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read that file");
    } finally {
      setBusy(false);
    }
  };

  const additional = project.assets.images.filter((i) => i.file !== project.assets.logo.primary);

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="rounded-lg border border-dashed border-chrome-border px-4 py-6 text-[13px] text-chrome-muted transition-colors hover:border-chrome-accent hover:text-chrome-text disabled:opacity-50"
      >
        {busy ? "Analysing…" : "Add assets — second logo, gradients, photography…"}
      </button>
      <p className="text-[12px] text-chrome-muted">
        Each one is analysed for colour and folded into the palette suggestion below,
        weighted toward logo variants and colours that repeat across several assets.
      </p>

      {error && <p className="text-[12px] text-chrome-danger">{error}</p>}

      {additional.length > 0 && (
        <div className="flex flex-col gap-2">
          {additional.map((asset) => (
            <div key={asset.hash} className="flex items-start gap-2.5 rounded-md border border-chrome-border px-2.5 py-2">
              {asset.detectedColors && asset.detectedColors.length > 0 ? (
                <div className="mt-0.5 flex h-6 w-10 shrink-0 overflow-hidden rounded border border-chrome-border">
                  {asset.detectedColors.slice(0, 4).map((c, i) => (
                    <span key={i} className="flex-1" style={{ background: toHex(c) }} />
                  ))}
                </div>
              ) : (
                <div className="mt-0.5 h-6 w-10 shrink-0 rounded border border-chrome-border bg-chrome-hover" />
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px]" title={asset.file}>{asset.file}</p>
                <div className="mt-1 flex items-center gap-2">
                  <select
                    value={ADDITIONAL_KINDS.includes(asset.kind as (typeof ADDITIONAL_KINDS)[number]) ? asset.kind : "other"}
                    onChange={(e) => {
                      const nextKind = e.target.value as (typeof ADDITIONAL_KINDS)[number];
                      edit(`Classify ${asset.file}`, (draft) => {
                        const entry = draft.assets.images.find((i) => i.hash === asset.hash);
                        if (entry) entry.kind = nextKind;
                        if (nextKind === "logo-mark") draft.assets.logo.mark = asset.file;
                        if (nextKind === "logo-light") draft.assets.logo.light = asset.file;
                        if (nextKind === "logo-dark") draft.assets.logo.dark = asset.file;
                        recomputeSuggestion(draft);
                      });
                    }}
                    className="min-w-0 flex-1 rounded border border-chrome-border bg-chrome-panel px-1.5 py-1 text-[11px]"
                  >
                    {ADDITIONAL_KINDS.map((k) => (
                      <option key={k} value={k}>{KIND_LABELS[k]}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() =>
                      edit(`Remove ${asset.file}`, (draft) => {
                        draft.assets.images = draft.assets.images.filter((i) => i.hash !== asset.hash);
                        for (const slot of ["mark", "light", "dark"] as const) {
                          if (draft.assets.logo[slot] === asset.file) delete draft.assets.logo[slot];
                        }
                        recomputeSuggestion(draft);
                      })
                    }
                    className="shrink-0 text-[11px] text-chrome-muted hover:text-chrome-danger"
                    aria-label={`Remove ${asset.file}`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {project.suggestion && additional.length > 0 && (
        <button
          type="button"
          onClick={() =>
            edit("Apply combined palette", (draft) => {
              if (!draft.suggestion) return;
              draft.tokens.colors = draft.suggestion;
              for (const key of Object.keys(draft.suggestion.light.semantic)) {
                draft.provenance[`tokens.colors.${key}`] = "extracted";
              }
            })
          }
          className="self-start text-[12px] text-chrome-accent hover:underline"
        >
          Apply combined palette from all assets
        </button>
      )}
    </div>
  );
}
