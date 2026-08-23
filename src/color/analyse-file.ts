import { extractFromPixels, extractFromSvg } from "./extract";
import type { DetectedColor } from "@/schema/project";

/**
 * Shared file → colour extraction, used by both the primary logo upload and the
 * additional-assets upload. SVG is parsed for exact paint values; raster is decoded
 * and quantized. The SVG path is strongly preferred — it returns the designer's
 * actual colours rather than an approximation contaminated by antialiasing.
 */

export interface FileAnalysis {
  colors: DetectedColor[];
  hasTransparency: boolean;
  dimensions?: { width: number; height: number };
  method: "svg-attributes" | "raster-quantize";
}

export async function analyseFile(file: File): Promise<FileAnalysis> {
  const isSvg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");

  if (isSvg) {
    const text = await file.text();
    const colors = extractFromSvg(text);
    if (colors.length === 0) throw new Error("No colours found in that SVG");
    return { colors, hasTransparency: true, method: "svg-attributes" };
  }

  const bitmap = await createImageBitmap(file);
  // Downscale before sampling: 128px is ample for palette extraction and keeps this
  // fast enough to stay on the main thread.
  const size = 128;
  const ratio = Math.min(size / bitmap.width, size / bitmap.height, 1);
  const w = Math.max(1, Math.round(bitmap.width * ratio));
  const h = Math.max(1, Math.round(bitmap.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not read image data");
  ctx.drawImage(bitmap, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  const { colors, hasTransparency } = extractFromPixels(data);
  if (colors.length === 0) throw new Error("No colours found in that image");

  return {
    colors,
    hasTransparency,
    dimensions: { width: bitmap.width, height: bitmap.height },
    method: "raster-quantize",
  };
}
