"use client";

import { useEffect } from "react";
import type { DesignProject } from "@/schema/project";
import { getAsset } from "@/store/persistence";

/**
 * Registers the project's uploaded font faces with a document, from the bytes stored in
 * IndexedDB, and removes them again when they change or the component unmounts.
 *
 * Used by the preview frame and by the Basics specimen beside the controls. Both read
 * the same stored files the export ships, so what is previewed is the uploaded face
 * itself, not a URL that only resolves once the ZIP is unpacked.
 */
export function useCustomFonts(project: DesignProject | null | undefined, doc?: Document): void {
  const faces = project ? customFaces(project) : [];
  const key = JSON.stringify(faces.map(({ family, hash, weight, style }) => [family, hash, weight, style]));

  useEffect(() => {
    const target = doc ?? (typeof document === "undefined" ? undefined : document);
    if (!target || !faces.length) return;
    let cancelled = false;
    const added: FontFace[] = [];
    void Promise.all(faces.map(async ({ family, hash, weight, style }) => {
      const blob = await getAsset(hash);
      if (!blob || cancelled) return;
      const face = new FontFace(family, await blob.arrayBuffer(), { weight: String(weight), style });
      await face.load().catch(() => undefined);
      if (cancelled || face.status !== "loaded") return;
      target.fonts.add(face);
      added.push(face);
    }));
    return () => {
      cancelled = true;
      for (const face of added) target.fonts.delete(face);
    };
    // `key` stands for `faces`, which is rebuilt every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, doc]);
}

/** Every uploaded file a typography role uses, joined to its stored hash. */
export function customFaces(project: DesignProject) {
  const out: { family: string; file: string; hash: string; weight: number; style: "normal" | "italic" }[] = [];
  for (const role of ["display", "body", "mono"] as const) {
    const font = project.tokens.typography[role];
    if (font.source !== "custom") continue;
    for (const face of font.files ?? []) {
      const stored = project.assets.fonts.find((entry) => entry.file === face.file);
      if (stored && !out.some((o) => o.family === font.family && o.file === face.file)) {
        out.push({ family: font.family, file: face.file, hash: stored.hash, weight: face.weight, style: face.style });
      }
    }
  }
  return out;
}
