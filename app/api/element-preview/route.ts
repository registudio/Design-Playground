import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import * as esbuild from "esbuild";
import { REGISTRY_SOURCES, type SourceId } from "@/registry/sources";
import {
  BROWSER_FRESH_SECONDS,
  BROWSER_STALE_SECONDS,
  DISK_CACHE_ENTRIES,
  DOCUMENT_CACHE_ENTRIES,
} from "@/elements/preview-budget";
import { propRecipe } from "@/elements/preview-props";

/**
 * Compiles one published registry component into a self-contained preview document.
 *
 * The registries publish source, not screenshots — none of the five embeds a preview
 * image — so the only way to show what a component looks like is to run it. That is
 * third-party code, so it runs in a sandboxed iframe under a restrictive CSP, and this
 * route never becomes a general-purpose fetcher: the source must be one of the five
 * allow-listed registries and the item name must match a conservative expression.
 *
 * A component that cannot run out of context — it needs auth, a backend, an app
 * provider, licensed media, or source files its publisher did not include — produces a
 * diagnostic document rather than an error. A failure belongs inside one card; it must
 * never blank the grid or drop an item out of search.
 */

export const runtime = "nodejs";

/** Conservative: registry item names are plain identifiers, never paths. */
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;

const TIMEOUT_MS = 20_000;

/**
 * Promises, not results.
 *
 * Caching the in-flight promise is what makes simultaneous requests for the same item
 * — which a grid of cards scrolling into view produces constantly — share one fetch and
 * one compile instead of racing.
 */
const documents = new Map<string, Promise<string>>();

/**
 * A second tier behind the in-memory cache, so a restart does not mean recompiling
 * everything.
 *
 * Each compile costs a registry fetch plus one npm fetch per dependency, and the memory
 * cache dies with the process — so in development, where the server restarts on every
 * edit, the same handful of previews were being rebuilt from the network all day. The
 * directory is disposable: anything unreadable or stale is simply recompiled.
 */
const DISK_CACHE = process.env.DP_PREVIEW_CACHE ?? path.join(process.cwd(), ".next/cache/element-preview");

/** Keyed by source, name and the route's own version, so a change here invalidates it. */
const CACHE_VERSION = "1";
const diskKey = (source: string, name: string) =>
  createHash("sha256").update(`${CACHE_VERSION}:${source}:${name}`).digest("hex").slice(0, 32);

async function readDisk(key: string): Promise<string | null> {
  try {
    return await readFile(path.join(DISK_CACHE, `${key}.html`), "utf-8");
  } catch {
    return null;
  }
}

async function writeDisk(key: string, html: string): Promise<void> {
  try {
    await mkdir(DISK_CACHE, { recursive: true });
    await writeFile(path.join(DISK_CACHE, `${key}.html`), html, "utf-8");
    await evictDisk();
  } catch {
    // A read-only or full filesystem costs the cache, not the request.
  }
}

/** Trims the oldest entries. Best-effort: losing the race just means trimming later. */
async function evictDisk(): Promise<void> {
  try {
    const names = await readdir(DISK_CACHE);
    if (names.length <= DISK_CACHE_ENTRIES) return;
    const entries = await Promise.all(
      names.map(async (name) => {
        const file = path.join(DISK_CACHE, name);
        return { file, at: (await stat(file)).mtimeMs };
      }),
    );
    entries.sort((a, b) => a.at - b.at);
    await Promise.all(
      entries.slice(0, entries.length - DISK_CACHE_ENTRIES).map((entry) => unlink(entry.file)),
    );
  } catch {
    // Ignored for the same reason as above.
  }
}

function remember(key: string, produce: () => Promise<string>): Promise<string> {
  const existing = documents.get(key);
  if (existing) {
    // Refresh recency: Map preserves insertion order, so re-inserting moves it to the end.
    documents.delete(key);
    documents.set(key, existing);
    return existing;
  }
  const pending = produce().catch((cause: unknown) => {
    // A failed compile is not cached — the next request should be free to retry, since
    // the cause is often a transient network failure rather than the component itself.
    documents.delete(key);
    throw cause;
  });
  documents.set(key, pending);
  while (documents.size > DOCUMENT_CACHE_ENTRIES) {
    const oldest = documents.keys().next().value;
    if (oldest === undefined) break;
    documents.delete(oldest);
  }
  return pending;
}

interface RegistryFile {
  path: string;
  content?: string;
  type?: string;
}

/** The published item document, which carries the component's own source files. */
async function fetchItem(source: SourceId, name: string) {
  const registry = REGISTRY_SOURCES.find((entry) => entry.id === source)!;
  // Item documents sit beside registry.json in the same directory on every one of the
  // five, which is part of the shadcn registry layout rather than a per-vendor guess.
  const url = registry.endpoint.replace(/registry\.json$/, `${name}.json`);
  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`${registry.label} returned HTTP ${response.status} for "${name}"`);
  return (await response.json()) as { files?: RegistryFile[] };
}

/**
 * Picks the component to render.
 *
 * Published items routinely contain several files — the component, a hook, a demo, a
 * story. Preferring a filename matching the item, and excluding stories and tests,
 * picks the thing a person expects to see far more often than "the first file" does.
 */
function chooseEntry(files: RegistryFile[], name: string): RegistryFile | undefined {
  const candidates = files.filter(
    (file) => /\.(tsx|jsx)$/.test(file.path) && !/\.(stories|test|spec)\./.test(file.path),
  );
  const stem = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return (
    candidates.find((file) => baseName(file.path).replace(/[^a-z0-9]/g, "") === stem) ??
    candidates.find((file) => baseName(file.path).replace(/[^a-z0-9]/g, "").includes(stem)) ??
    candidates[0]
  );
}

const baseName = (path: string) => path.split("/").pop()!.replace(/\.[jt]sx?$/, "").toLowerCase();

/** Escapes a closing script tag so generated source cannot break out of the document. */
const safeForScript = (code: string) => code.replace(/<\/script/gi, "<\\/script");

const escapeHtml = (value: string) =>
  value.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const source = params.get("source") ?? "";
  const name = params.get("name") ?? "";

  const known = REGISTRY_SOURCES.some((entry) => entry.id === source);
  if (!known || !SAFE_NAME.test(name)) {
    return new Response("Unknown source or item name", { status: 400 });
  }

  try {
    const key = diskKey(source, name);
    const html = await remember(`${source}:${name}`, async () => {
      const cached = await readDisk(key);
      if (cached) return cached;
      const compiled = await compile(source as SourceId, name);
      await writeDisk(key, compiled);
      return compiled;
    });
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": `public, max-age=${BROWSER_FRESH_SECONDS}, stale-while-revalidate=${BROWSER_STALE_SECONDS}`,
      },
    });
  } catch (cause) {
    // Still 200 with a document: the iframe must render something explaining itself
    // rather than a browser error page inside the card.
    return new Response(diagnostic(name, cause instanceof Error ? cause.message : String(cause)), {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
}

async function compile(source: SourceId, name: string): Promise<string> {
  const item = await fetchItem(source, name);
  const files = (item.files ?? []).filter((file) => typeof file.content === "string");
  if (!files.length) throw new Error("This item publishes no source files");

  const entry = chooseEntry(files, name);
  if (!entry) throw new Error("This item publishes no React component");

  const bundle = await esbuild.build({
    stdin: { contents: harness(entry.path, propRecipe(source, name)), resolveDir: "/", loader: "tsx", sourcefile: "preview.tsx" },
    bundle: true,
    write: false,
    format: "esm",
    target: "es2020",
    jsx: "automatic",
    logLevel: "silent",
    plugins: [virtualFiles(files)],
  });

  const code = bundle.outputFiles?.[0]?.text;
  if (!code) throw new Error("Nothing was produced by the bundler");
  return documentFor(name, code);
}

/**
 * Resolves the published files, project aliases and npm packages.
 *
 * Packages are fetched server-side from esm.sh and bundled in, so the iframe needs no
 * network of its own and the CSP can deny connections outright. React is pinned to one
 * copy: the component and the renderer sharing a React instance is the difference
 * between a preview and an invariant violation.
 */
function virtualFiles(files: RegistryFile[]): esbuild.Plugin {
  const byPath = new Map(files.map((file) => [normalize(file.path), file.content!]));
  return {
    name: "registry-virtual-fs",
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        if (args.path.startsWith("http")) return { path: args.path, namespace: "remote" };
        // Project-local aliases the publisher did not include in the payload.
        if (args.path.startsWith("@/") || args.path.startsWith("~/")) {
          return { path: args.path, namespace: "shim" };
        }
        if (args.path.startsWith(".") || args.path.startsWith("/")) {
          return { path: resolveRelative(args.importer, args.path, byPath), namespace: "virtual" };
        }
        const pinned = args.path === "react" || args.path.startsWith("react/") || args.path === "react-dom"
          || args.path.startsWith("react-dom/")
          ? `https://esm.sh/${args.path}@19.2.0`
          : `https://esm.sh/${args.path}?external=react,react-dom`;
        return { path: pinned, namespace: "remote" };
      });

      build.onLoad({ filter: /.*/, namespace: "virtual" }, (args) => {
        const contents = byPath.get(args.path);
        if (contents === undefined) throw new Error(`Imports "${args.path}", which this item does not publish`);
        return { contents, loader: args.path.endsWith(".ts") ? "ts" : "tsx", resolveDir: "/" };
      });

      build.onLoad({ filter: /.*/, namespace: "shim" }, () => ({
        // Lightweight stand-ins for the shadcn-style primitives most items assume are
        // already in the consuming project. Enough to render; not a reimplementation.
        contents: SHIM_MODULE,
        loader: "tsx",
        resolveDir: "/",
      }));

      build.onLoad({ filter: /.*/, namespace: "remote" }, async (args) => {
        const response = await fetch(args.path, { signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (!response.ok) throw new Error(`Could not fetch ${args.path} (HTTP ${response.status})`);
        return { contents: await response.text(), loader: "js" };
      });
    },
  };
}

const normalize = (path: string) => path.replace(/^\.?\//, "");

function resolveRelative(importer: string, request: string, byPath: Map<string, string>): string {
  const from = normalize(importer).split("/").slice(0, -1);
  const parts = normalize(request).split("/");
  for (const part of parts) {
    if (part === "..") from.pop();
    else if (part !== ".") from.push(part);
  }
  const target = from.join("/");
  // Published paths carry an extension inconsistently, so try the common ones.
  for (const candidate of [target, `${target}.tsx`, `${target}.ts`, `${target}/index.tsx`, `${target}/index.ts`]) {
    if (byPath.has(candidate)) return candidate;
  }
  // Fall back to matching the basename: publishers often flatten directory structure
  // between what a file imports and where the registry actually puts it.
  const stem = parts[parts.length - 1]!.replace(/\.[jt]sx?$/, "");
  for (const key of byPath.keys()) if (baseName(key) === stem.toLowerCase()) return key;
  return target;
}

/** Minimal stand-ins so an item importing app-local primitives still renders. */
const SHIM_MODULE = `
import * as React from "react";
const pass = (tag) => React.forwardRef(({ children, className, ...rest }, ref) =>
  React.createElement(tag, { ref, className, ...rest }, children));
export const cn = (...parts) => parts.flat(Infinity).filter(p => typeof p === "string").join(" ");
export const Button = pass("button");
export const Input = pass("input");
export const Textarea = pass("textarea");
export const Label = pass("label");
export const Card = pass("div");
export const CardHeader = pass("div");
export const CardContent = pass("div");
export const CardFooter = pass("div");
export const CardTitle = pass("h3");
export const CardDescription = pass("p");
export const Badge = pass("span");
export const Separator = pass("hr");
export const Avatar = pass("div");
export const Skeleton = pass("div");
export default pass("div");
`;

/**
 * Wraps the component in a demonstration harness.
 *
 * Registries do not consistently publish a demo or sample props, so this is
 * representative rather than a copy of the source site's showcase: generic text, a few
 * items, a progress value, and no-op callbacks. An error boundary keeps a component
 * that rejects this environment inside its own card.
 */
const harness = (entryPath: string, props: string) => `
import * as React from "react";
import { createRoot } from "react-dom/client";
import * as mod from ${JSON.stringify(`./${normalize(entryPath)}`)};

const Component = mod.default ?? Object.values(mod).find((v) => typeof v === "function");

const PROPS = ${props};

class Boundary extends React.Component {
  constructor(p) { super(p); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return React.createElement("div", { className: "dp-diagnostic" },
        React.createElement("strong", null, "Needs more than a preview can give it"),
        React.createElement("span", null, String(this.state.error.message || this.state.error)));
    }
    return this.props.children;
  }
}

const root = createRoot(document.getElementById("root"));
root.render(
  Component
    ? React.createElement(Boundary, null, React.createElement(Component, PROPS))
    : React.createElement("div", { className: "dp-diagnostic" },
        React.createElement("strong", null, "No component to render"),
        React.createElement("span", null, "This item exports no React component."))
);
`;

/** Base styling so a component with no CSS of its own is still legible and contained. */
const BASE_CSS = `
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:18px;background:#111412;color:#eef2e6;font-family:ui-sans-serif,system-ui,"Segoe UI",sans-serif;overflow:hidden}
#root{max-width:100%;max-height:100vh;overflow:hidden;display:grid;place-items:center}
img,svg,canvas,video{max-width:100%;height:auto}
button{font:inherit;cursor:pointer}
.dp-diagnostic{display:flex;flex-direction:column;gap:7px;padding:16px;max-width:280px;text-align:center;border:1px dashed #4a5c3b;border-radius:10px;color:#a9bd96;font-size:11px;line-height:1.6}
.dp-diagnostic strong{color:#cbe99a;font-size:12px;font-weight:600}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
`;

/** Connections denied outright: everything the module needs is already bundled in. */
const CSP =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; " +
  "img-src data: https:; font-src data: https:; connect-src 'none'";

function documentFor(name: string, code: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<title>${escapeHtml(name)}</title><style>${BASE_CSS}</style></head>
<body><div id="root"></div><script type="module">${safeForScript(code)}</script></body></html>`;
}

/** Shown when the component could not be compiled at all. */
function diagnostic(name: string, reason: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<title>${escapeHtml(name)}</title><style>${BASE_CSS}</style></head>
<body><div class="dp-diagnostic"><strong>Preview unavailable</strong><span>${escapeHtml(reason)}</span></div></body></html>`;
}
