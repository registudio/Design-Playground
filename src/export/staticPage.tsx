import { renderToStaticMarkup } from "react-dom/server";
import type { DesignProject } from "@/schema/project";
import { generateCss } from "./css";
import { findFont, googleFontUrl } from "@/fonts/catalogue";
import { SamplePage } from "@/preview/surfaces/SamplePage";
import { escapeHtml } from "./htmlUtil";

/**
 * A shareable, standalone Sample Page (§Wave D Features-3): a frozen HTML bundle a
 * client can open with no playground, no account, and no build step. §13.5 names
 * "shareable review links" as future scope; this gets most of that value with no
 * backend — a plain file.
 *
 * "Frozen" is deliberate: this renders through react-dom/server, so none of the
 * client-only motion effects (useAutoAnimate, the custom cursor) ever attach — they
 * only run in a browser's useEffect, which SSR never calls. What ships is the settled,
 * final look of the page, styled by the exact same tokens CSS and component
 * stylesheet the live preview uses, so it can never drift from what was approved.
 */
export function buildStaticPage(project: DesignProject, previewCss: string): string {
  const tokensCss = generateCss(project.tokens, { tailwindTheme: false });

  const fontEntries = [
    project.tokens.typography.display.family,
    project.tokens.typography.body.family,
    project.tokens.typography.mono.family,
  ]
    .map(findFont)
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  const fontHref = googleFontUrl(fontEntries);

  const markup = renderToStaticMarkup(<SamplePage project={project} />);
  const title = project.client ? `${project.name} — ${project.client}` : project.name;

  return `<!doctype html>
<html lang="en" class="light">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
${fontHref ? `<link rel="stylesheet" href="${escapeHtml(fontHref)}">` : ""}
<style>
${tokensCss}
${previewCss}
</style>
</head>
<body>
${markup}
</body>
</html>`;
}

export async function downloadStaticPage(project: DesignProject): Promise<void> {
  const response = await fetch("/api/preview-css");
  const previewCss = await response.text();
  const html = buildStaticPage(project, previewCss);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slug(project.name)}-preview.html`;
  anchor.click();
  URL.revokeObjectURL(url);
}

const slug = (s: string) => s.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "project";
