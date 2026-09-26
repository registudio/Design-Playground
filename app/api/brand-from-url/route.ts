import { FetchRefused, safeFetch } from "@/brand/safe-fetch";
import { extractFromHtml, rankColors, rankFonts } from "@/brand/site-extract";

/**
 * POST { url } — reads a client's existing website for its brand: colours, typefaces and
 * a logo. Suggestions only; the browser shows them and a person decides.
 *
 * Server-side for the same reason as the registry refresh: pages and stylesheets do not
 * send CORS headers for this. Every fetch goes through safeFetch, which refuses anything
 * that is not the public internet (see brand/safe-fetch.ts).
 */
const MAX_STYLESHEETS = 6;
// What the logo analyser reads; a .ico is skipped for the next candidate.
const IMAGE_TYPES = /^image\/(svg\+xml|png|jpeg|webp)\b/;

export async function POST(request: Request) {
  let input: unknown;
  try { input = (await request.json() as { url?: unknown }).url; } catch { input = undefined; }
  if (typeof input !== "string" || !input.trim()) return Response.json({ error: "Give the address of the site to read." }, { status: 400 });
  const address = /^[a-z]+:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`;

  try {
    const page = await safeFetch(address, { accept: "text/html" });
    if (page.status >= 400) return Response.json({ error: `The site answered ${page.status}.` }, { status: 502 });
    if (!/html/i.test(page.contentType)) return Response.json({ error: "That address is not a web page." }, { status: 422 });
    const found = extractFromHtml(page.body.toString("utf8"), page.url);

    // Stylesheets are where the colours and faces actually are. One failing is not fatal.
    const sheets = await Promise.all(found.stylesheets.slice(0, MAX_STYLESHEETS).map(async (href) => {
      try {
        const sheet = await safeFetch(href, { accept: "text/css", maxBytes: 1_500_000 });
        return sheet.status < 400 ? sheet.body.toString("utf8") : "";
      } catch { return ""; }
    }));
    const css = [found.inlineCss, ...sheets].join("\n");

    let logo: { dataUrl: string; from: string } | null = null;
    for (const href of found.logoCandidates.slice(0, 4)) {
      try {
        const image = await safeFetch(href, { accept: "image/*", maxBytes: 1_000_000 });
        const type = image.contentType.split(";")[0]!.trim();
        if (image.status >= 400 || !IMAGE_TYPES.test(type)) continue;
        logo = { dataUrl: `data:${type};base64,${image.body.toString("base64")}`, from: href };
        break;
      } catch { /* the next candidate */ }
    }

    return Response.json({
      url: page.url,
      title: found.title,
      colors: rankColors(css, found.themeColor),
      fonts: rankFonts(css, found.googleFamilies),
      logo,
      stylesheetsRead: sheets.filter(Boolean).length,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    const message = cause instanceof FetchRefused ? cause.message : "The site could not be reached.";
    return Response.json({ error: message }, { status: cause instanceof FetchRefused ? 422 : 502 });
  }
}
