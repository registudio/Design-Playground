import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import * as esbuild from "esbuild";
import { compile as compileTailwind } from "tailwindcss";
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

/**
 * Registry item documents are small JSON files. Twenty seconds meant a source that had
 * stopped answering held a card on its placeholder long enough to read as broken rather
 * than slow, so this is short enough that an unresponsive host resolves to a visible
 * outcome while still tolerating an ordinary cold response.
 */
const TIMEOUT_MS = 9_000;

/**
 * How long a surface may stay empty before the generated visual is laid over it.
 *
 * Short, because the fallback is no longer final: it sits over the component, and a
 * component that paints late — a staggered reveal, a delayed entrance — removes it and
 * reports ready. A long grace only kept cards that will never paint empty for longer.
 */
const BLANK_GRACE_MS = 2000;
/** How long after load the document keeps polling for a late first paint. */
const LATE_PAINT_WATCH_MS = 8000;
const PUBLISHED_ITEM_CACHE_ENTRIES = 640;
const REMOTE_MODULE_CACHE_ENTRIES = 256;

/**
 * Promises, not results.
 *
 * Caching the in-flight promise is what makes simultaneous requests for the same item
 * — which a grid of cards scrolling into view produces constantly — share one fetch and
 * one compile instead of racing.
 */
const documents = new Map<string, Promise<string>>();
const publishedItems = new Map<string, Promise<PublishedItem>>();
const remoteModules = new Map<string, Promise<string>>();
let tailwindCompiler: ReturnType<typeof compileTailwind> | null = null;
let preflightCss: Promise<string> | null = null;

/**
 * Shares both completed and in-flight downloads across independent component builds.
 * A row often contains twelve cards that all need React, Motion and the same registry
 * primitives; without this cache every card opened its own copy of those requests.
 */
function rememberResource<T>(
  cache: Map<string, Promise<T>>,
  key: string,
  limit: number,
  fetchResource: () => Promise<T>,
): Promise<T> {
  const existing = cache.get(key);
  if (existing) {
    cache.delete(key);
    cache.set(key, existing);
    return existing;
  }

  const pending = fetchResource().catch((cause: unknown) => {
    if (cache.get(key) === pending) cache.delete(key);
    throw cause;
  });
  cache.set(key, pending);
  while (cache.size > limit) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
  return pending;
}

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
const CACHE_VERSION = "4";
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
    const names = await readdir(/* turbopackIgnore: true */ DISK_CACHE);
    if (names.length <= DISK_CACHE_ENTRIES) return;
    const entries = await Promise.all(
      names.map(async (name) => {
        const file = path.join(/* turbopackIgnore: true */ DISK_CACHE, name);
        return { file, at: (await stat(/* turbopackIgnore: true */ file)).mtimeMs };
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

interface PublishedItem {
  files?: RegistryFile[];
  registryDependencies?: string[];
}

/** The published item document, which carries the component's own source files. */
/**
 * Drops every cached trace of one item so a retry genuinely starts over.
 *
 * Deliberately does not clear the shared remote-module cache: those are npm packages,
 * identical across items, and evicting them would make one retry re-download React for
 * every other preview on the page.
 */
function forget(source: SourceId, name: string): void {
  documents.delete(`${source}:${name}`);
  for (const key of [...publishedItems.keys()]) {
    if (key.startsWith(`${source}:`)) publishedItems.delete(key);
  }
}

async function fetchItem(source: SourceId, name: string) {
  const seen = new Set<string>();
  const files = new Map<string, RegistryFile>();
  const queue = [name];
  while (queue.length && seen.size < 80) {
    const next = queue.shift()!;
    if (seen.has(next)) continue;
    seen.add(next);
    let item: PublishedItem;
    try {
      item = await fetchPublishedItem(source, next);
    } catch (cause) {
      if (next === name) throw cause;
      // Some registries refer to shared shadcn primitives they do not publish. Those
      // are supplied by the preview shim below.
      continue;
    }
    for (const file of item.files ?? []) files.set(normalize(file.path), file);
    for (const dependency of item.registryDependencies ?? []) {
      const dependencyName = dependency.split("/").pop();
      if (dependencyName && !seen.has(dependencyName)) queue.push(dependencyName);
    }
  }
  return { files: [...files.values()] } satisfies PublishedItem;
}

async function fetchPublishedItem(source: SourceId, name: string): Promise<PublishedItem> {
  return rememberResource(
    publishedItems,
    `${source}:${name}`,
    PUBLISHED_ITEM_CACHE_ENTRIES,
    () => fetchPublishedItemUncached(source, name),
  );
}

/**
 * Where one published item's JSON lives.
 *
 * Item documents sit beside registry.json in the same directory on every one of the
 * five, which is the shadcn registry layout rather than a per-vendor guess.
 *
 * DP_REGISTRY_BASE redirects every source at one origin. That exists so the compile
 * path can be exercised against a local fixture registry — the failures this runtime
 * actually produces are only reproducible by compiling something, and depending on five
 * third-party hosts to reproduce a bug makes the bug untestable.
 */
function itemEndpoint(endpoint: string, item: string): string {
  const base = process.env.DP_REGISTRY_BASE;
  if (!base) return endpoint.replace(/registry\.json$/, `${item}.json`);
  const source = new URL(endpoint).hostname.split(".")[0];
  return `${base.replace(/\/$/, "")}/${source}/${item}.json`;
}

async function fetchPublishedItemUncached(source: SourceId, name: string): Promise<PublishedItem> {
  const registry = REGISTRY_SOURCES.find((entry) => entry.id === source)!;
  // Item documents sit beside registry.json in the same directory on every one of the
  // five, which is part of the shadcn registry layout rather than a per-vendor guess.
  const candidates = source === "react-bits" && !/-(?:JS|TS)-(?:CSS|TW)$/i.test(name)
    ? [`${name}-TS-TW`, name]
    : [name];
  let lastFailure = `${registry.label} did not publish "${name}"`;
  for (const candidate of candidates) {
    const url = itemEndpoint(registry.endpoint, candidate);
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    const body = await response.text();
    if (!response.ok) {
      lastFailure = `${registry.label} returned HTTP ${response.status} for "${candidate}"`;
      continue;
    }
    try {
      return JSON.parse(body) as PublishedItem;
    } catch {
      lastFailure = `${registry.label} returned a page instead of registry JSON for "${candidate}"`;
    }
  }
  throw new Error(lastFailure);
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
    const retry = Number(params.get("retry") ?? 0) > 0;
    // Every layer, not just the compiled document. Dropping only the document cache
    // left the retry joining the *same* in-flight item fetch, so a registry that had
    // stopped responding could never be escaped: each retry waited on the original
    // hung request and reported the same failure at the same moment.
    if (retry) forget(source as SourceId, name);
    const html = await remember(`${source}:${name}`, async () => {
      const cached = retry ? null : await readDisk(key);
      if (cached) return cached;
      const compiled = await compile(source as SourceId, name);
      await writeDisk(key, compiled);
      return compiled;
    });
    return new Response(withStatus(html), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": `public, max-age=${BROWSER_FRESH_SECONDS}, stale-while-revalidate=${BROWSER_STALE_SECONDS}`,
      },
    });
  } catch (cause) {
    // A registry can temporarily remove an item. The gallery still gets a visual
    // interpretation instead of surfacing compiler prose inside the design surface.
    return new Response(withStatus(generatedDocument(name, cause instanceof Error ? cause.message : String(cause))), {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
}

async function compile(source: SourceId, name: string): Promise<string> {
  const item = await fetchItem(source, name);
  const files = (item.files ?? []).filter((file) => typeof file.content === "string");
  if (!files.length) return generatedDocument(name, "This registry entry publishes no source files");

  const entry = chooseEntry(files, name);
  if (!entry) return generatedDocument(name, "This registry entry is a helper rather than a React component");

  const bundle = await esbuild.build({
    stdin: { contents: harness(entry.path, propRecipe(source, name)), resolveDir: "/", loader: "tsx", sourcefile: "preview.tsx" },
    bundle: true,
    write: false,
    outdir: "out",
    format: "esm",
    target: "es2020",
    jsx: "automatic",
    logLevel: "silent",
    plugins: [virtualFiles(files)],
  });

  const code = bundle.outputFiles?.find((file) => file.path.endsWith(".js"))?.text;
  if (!code) throw new Error("Nothing was produced by the bundler");
  const bundledCss = bundle.outputFiles?.find((file) => file.path.endsWith(".css"))?.text ?? "";
  const utilityCss = await tailwindFor(files);
  return documentFor(name, code, `${utilityCss}\n${bundledCss}`);
}

/**
 * Reports what the mounted surface actually looks like, to its owning card.
 *
 * Two things were wrong with counting `root.childElementCount`. A component can mount,
 * produce DOM and paint nothing — an absolutely positioned layer against a parent with
 * no height is the common shape — so a card said "Ready" over a blank rectangle. And
 * the report was effectively one-shot: a double rAF plus a MutationObserver, which for
 * a component that renders once and never mutates means a single message. Miss it and
 * the card waits forever.
 *
 * So status is decided by measured area rather than by node count, and the document
 * answers whenever it is asked, rather than announcing once and hoping.
 */
function withStatus(html: string): string {
  const script = `<script>
(() => {
  // Echoed back so the card can tell this document's reports from its predecessor's.
  // Changing the src starts a new document, but the old one keeps polling for a few
  // seconds — and its late "fallback" was landing on top of the retry's "rendering",
  // making Retry look like it had done nothing.
  const attempt = new URLSearchParams(location.search).get("retry") || "0";
  const send = (status) => { try { parent.postMessage({ type: "dp-preview-status", status, attempt }, "*"); } catch {} };

  // Occupying a box is not the same as making a mark. A component whose outer element
  // is \`position:absolute; inset:0\` resolves against the viewport and therefore
  // measures full size while painting nothing at all — which is exactly the shape that
  // produced cards reading "Ready" over an empty rectangle. So each element has to show
  // some actual ink: a fill, an edge, a shadow, text, or its own replaced content.
  const inks = (node) => {
    const box = node.getBoundingClientRect();
    if (box.width < 4 || box.height < 4) return false;
    const style = getComputedStyle(node);
    if (style.visibility === "hidden" || style.display === "none") return false;
    if (Number.parseFloat(style.opacity) < 0.02) return false;
    if (/^(IMG|CANVAS|SVG|VIDEO|PICTURE)$/.test(node.tagName)) return true;
    // Parsed rather than pattern-matched. This lives inside a template literal, so a
    // regex written here loses its backslashes on the way into the document — which is
    // how the transparency test silently inverted and made every empty box count as ink.
    const background = style.backgroundColor || "";
    const alpha = background.startsWith("rgba(")
      ? Number.parseFloat(background.slice(5).split(",")[3] || "1")
      : background && background !== "transparent" ? 1 : 0;
    if (alpha > 0.02) return true;
    if (style.backgroundImage && style.backgroundImage !== "none") return true;
    const border = ["borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth"]
      .reduce((total, side) => total + Number.parseFloat(style[side] || "0"), 0);
    if (border > 0) return true;
    if (style.boxShadow && style.boxShadow !== "none") return true;
    if (style.outlineStyle && style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth || "0") > 0) return true;
    // Direct text, not a descendant's — descendants are visited in their own right.
    for (const child of node.childNodes) {
      if (child.nodeType === 3 && child.textContent && child.textContent.trim()) return true;
    }
    return false;
  };

  const painted = () => {
    const root = document.getElementById("root");
    if (!root) return false;
    for (const node of [root, ...root.querySelectorAll("*")]) {
      if (inks(node)) return true;
    }
    return false;
  };

  const started = Date.now();
  let errored = false;

  // A card that ends empty is a card that was scrolled to and showed nothing, which is
  // the one outcome the gallery cannot have. So a surface that is still blank after the
  // grace, or that threw before painting anything, is replaced with the same generated
  // visual used when a component cannot be compiled, and reported as a fallback — the
  // card says so, and Retry is still there.
  //
  // Laid over the component rather than replacing it, so one that was merely slow can
  // still take over: the moment it paints, the layer is removed and the card reports
  // ready.
  let layer = null;
  const fallBack = () => {
    if (layer || document.querySelector(".dp-auto-visual")) return;
    layer = document.createElement("div");
    layer.style.cssText = "position:fixed;inset:0;display:grid;place-items:center;pointer-events:none;z-index:2147483647";
    layer.innerHTML = '<div class="dp-auto-visual" aria-label="Generated visual fallback"><div class="dp-auto-orbit"><i></i><i></i><i></i></div><div class="dp-auto-bars"><i></i><i></i><i></i><i></i><i></i></div><small></small></div>';
    layer.querySelector("small").textContent = document.title;
    document.body.appendChild(layer);
  };

  const evaluate = () => {
    if (painted()) {
      if (layer) { layer.remove(); layer = null; }
      return document.querySelector(".dp-auto-visual") ? "fallback" : "ready";
    }
    if (document.querySelector(".dp-auto-visual")) return "fallback";
    // Components legitimately render late — a transition, a timer, an effect that
    // measures first. Only after that grace is an empty surface really empty.
    if (errored || Date.now() - started > ${BLANK_GRACE_MS}) { fallBack(); return "fallback"; }
    return "rendering";
  };

  const report = () => {
    const status = evaluate();
    send(status);
    return status;
  };

  new MutationObserver(report).observe(document.documentElement, { childList: true, subtree: true, attributes: true });
  // An error is only a failure if nothing is showing. Components throw from effects and
  // handlers all the time after painting perfectly well, and reporting those as failed
  // hid a working preview behind the placeholder.
  addEventListener("error", () => { errored = true; report(); });
  addEventListener("unhandledrejection", () => { errored = true; report(); });
  // The card may ask at any time, which removes the race entirely: a status that
  // arrives before anyone is listening is no longer lost.
  addEventListener("message", (event) => { if (event.data && event.data.type === "dp-preview-ping") report(); });

  requestAnimationFrame(() => requestAnimationFrame(report));
  // Polled briefly as well, so a surface that appears without mutating the DOM — a
  // canvas drawing itself, an image decoding — is still noticed.
  // Kept going past a fallback: a CSS-only entrance changes nothing in the DOM, so the
  // mutation observer alone would never see it arrive.
  const poll = setInterval(() => { const status = report(); if (status === "ready" || Date.now() - started > ${LATE_PAINT_WATCH_MS}) clearInterval(poll); }, 400);
  addEventListener("load", report);
})();
</script>`;
  // Appended rather than substituted into </body>: a document without that exact
  // closing tag would silently lose its reporter.
  return html.includes("</body>") ? html.replace("</body>", `${script}</body>`) : html + script;
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
  const shimImports = new Map<string, { names: Set<string>; hasDefault: boolean }>();

  const localTarget = (request: string, importer: string): string | null => {
    if (request.startsWith("@/") || request.startsWith("~/")) {
      return resolvePublished(request.slice(2), byPath);
    }
    if (request.startsWith(".") || request.startsWith("/")) {
      return resolveRelative(importer, request, byPath);
    }
    return null;
  };

  const shim = (request: string, importer: string, namespace?: "shim" | "hook-shim" | "icon-shim" | "font-shim") => {
    const key = `${importer}::${request}`;
    const imported = readImports(byPath.get(normalize(importer)) ?? "", request);
    shimImports.set(key, imported);
    const inferred = request.includes("/lib/utils")
      ? "shim"
      : imported.names.size && [...imported.names].every((name) => name.startsWith("use")) || /(?:^|\/)use[-A-Z]/.test(request)
        ? "hook-shim"
        : "shim";
    return { path: key, namespace: namespace ?? inferred };
  };

  return {
    name: "registry-virtual-fs",
    setup(build) {
      const resolveRegistryImport = (args: esbuild.OnResolveArgs) => {
        // Once a local package has been admitted, let esbuild resolve its own relative
        // and transitive imports normally rather than treating them as registry files.
        if (args.namespace === "file" && args.importer.includes("node_modules")) return;
        const local = localTarget(args.path, args.importer);
        if (local) return { path: local, namespace: "virtual" };
        if (args.path.startsWith("@/") || args.path.startsWith("~/") || args.path.startsWith(".") || args.path.startsWith("/")) {
          if (/\.(css|scss|sass|less)$/.test(args.path)) return { path: args.path, namespace: "empty-style" };
          return shim(args.path, args.importer);
        }
        if (args.path === "lucide-react" || args.path === "@central-icons-react/all") return shim(args.path, args.importer, "icon-shim");
        if (args.path.startsWith("next/font")) return shim(args.path, args.importer, "font-shim");
        const installed = installedPackagePath(args.path);
        if (installed) return { path: installed };
        return { path: packageUrl(args.path), namespace: "remote" };
      };

      build.onResolve({ filter: /.*/, namespace: "file" }, resolveRegistryImport);
      build.onResolve({ filter: /.*/, namespace: "virtual" }, resolveRegistryImport);
      build.onResolve({ filter: /.*/, namespace: "shim" }, (args) => ({ path: packageUrl(args.path), namespace: "remote" }));
      build.onResolve({ filter: /.*/, namespace: "hook-shim" }, (args) => ({ path: packageUrl(args.path), namespace: "remote" }));
      build.onResolve({ filter: /.*/, namespace: "icon-shim" }, (args) => ({ path: packageUrl(args.path), namespace: "remote" }));
      build.onResolve({ filter: /.*/, namespace: "font-shim" }, (args) => ({ path: packageUrl(args.path), namespace: "remote" }));
      build.onResolve({ filter: /.*/, namespace: "remote" }, (args) => {
        if (args.path.startsWith("http://") || args.path.startsWith("https://")) return { path: args.path, namespace: "remote" };
        if (args.path.startsWith(".") || args.path.startsWith("/")) {
          return { path: new URL(args.path, args.importer).href, namespace: "remote" };
        }
        return { path: packageUrl(args.path), namespace: "remote" };
      });

      build.onLoad({ filter: /.*/, namespace: "virtual" }, (args) => {
        const contents = byPath.get(args.path);
        if (contents === undefined) throw new Error(`Imports "${args.path}", which this item does not publish`);
        return { contents, loader: args.path.endsWith(".ts") ? "ts" : "tsx", resolveDir: "/" };
      });

      build.onLoad({ filter: /.*/, namespace: "shim" }, (args) => ({
        // Lightweight stand-ins for the shadcn-style primitives most items assume are
        // already in the consuming project. Enough to render; not a reimplementation.
        contents: shimModule(shimImports.get(args.path)),
        loader: "tsx",
        resolveDir: "/",
      }));

      build.onLoad({ filter: /.*/, namespace: "hook-shim" }, (args) => ({
        contents: hookShimModule(shimImports.get(args.path)),
        loader: "js",
        resolveDir: "/",
      }));

      build.onLoad({ filter: /.*/, namespace: "icon-shim" }, (args) => ({
        contents: iconShimModule(shimImports.get(args.path)),
        loader: "tsx",
        resolveDir: "/",
      }));

      build.onLoad({ filter: /.*/, namespace: "font-shim" }, (args) => ({
        contents: fontShimModule(shimImports.get(args.path)),
        loader: "js",
        resolveDir: "/",
      }));

      build.onLoad({ filter: /.*/, namespace: "empty-style" }, () => ({ contents: "", loader: "css" }));

      build.onLoad({ filter: /.*/, namespace: "remote" }, async (args) => {
        const contents = await rememberResource(
          remoteModules,
          args.path,
          REMOTE_MODULE_CACHE_ENTRIES,
          async () => {
            const response = await fetch(args.path, { signal: AbortSignal.timeout(TIMEOUT_MS) });
            if (!response.ok) throw new Error(`Could not fetch ${args.path} (HTTP ${response.status})`);
            return response.text();
          },
        );
        return { contents, loader: "js" };
      });
    },
  };
}

/**
 * Static paths keep these packages on local disk without asking Next's server bundler
 * to evaluate a dynamic require.resolve expression. Esbuild resolves every import
 * below these entry files normally, including Motion's nested Framer Motion package.
 */
function installedPackagePath(specifier: string): string | null {
  const modules = path.join(process.cwd(), "node_modules");
  if (specifier === "react") return path.join(modules, "react/index.js");
  if (specifier.startsWith("react/")) return path.join(modules, `react/${specifier.slice(6)}.js`);
  if (specifier === "react-dom") return path.join(modules, "react-dom/index.js");
  if (specifier.startsWith("react-dom/")) return path.join(modules, `react-dom/${specifier.slice(10)}.js`);

  if (specifier === "motion") return path.join(modules, "motion/dist/es/index.mjs");
  if (specifier.startsWith("motion/")) {
    return path.join(modules, `motion/dist/es/${specifier.slice(7)}.mjs`);
  }
  if (specifier === "framer-motion") {
    return path.join(modules, "motion/node_modules/framer-motion/dist/es/index.mjs");
  }
  if (specifier.startsWith("framer-motion/")) {
    return path.join(modules, `motion/node_modules/framer-motion/dist/es/${specifier.slice(14)}.mjs`);
  }

  if (specifier === "gsap") return path.join(modules, "gsap/index.js");
  if (specifier.startsWith("gsap/")) {
    const subpath = specifier.slice(5);
    return path.join(modules, `gsap/${subpath}${subpath.endsWith(".js") ? "" : ".js"}`);
  }
  return null;
}

const normalize = (path: string) => path.replace(/^\.?\//, "");

function resolveRelative(importer: string, request: string, byPath: Map<string, string>): string | null {
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
  return null;
}

function resolvePublished(target: string, byPath: Map<string, string>): string | null {
  const clean = normalize(target);
  for (const candidate of [clean, `${clean}.tsx`, `${clean}.ts`, `${clean}.jsx`, `${clean}.js`, `${clean}/index.tsx`, `${clean}/index.ts`]) {
    if (byPath.has(candidate)) return candidate;
  }
  const stem = baseName(clean);
  for (const key of byPath.keys()) if (baseName(key) === stem) return key;
  return null;
}

/** Minimal stand-ins so an item importing app-local primitives still renders. */
function readImports(source: string, request: string): { names: Set<string>; hasDefault: boolean } {
  const names = new Set<string>();
  let hasDefault = false;
  const escaped = request.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`import\\s+([^;]+?)\\s+from\\s+["']${escaped}["']`, "g");
  for (const match of source.matchAll(pattern)) {
    const clause = match[1]!.trim();
    if (!clause.startsWith("{") && !clause.startsWith("*")) hasDefault = true;
    const block = clause.match(/\{([\s\S]*?)\}/)?.[1];
    for (const part of block?.split(",") ?? []) {
      const exported = part.trim().split(/\s+as\s+/)[0];
      if (exported && /^[A-Za-z_$][\w$]*$/.test(exported)) names.add(exported);
    }
  }
  return { names, hasDefault };
}

const KNOWN_TAGS: Record<string, string> = {
  Button: "button", Input: "input", Textarea: "textarea", Label: "label", Separator: "hr",
  CardTitle: "h3", CardDescription: "p", AvatarImage: "img",
};

function shimModule(requested = { names: new Set<string>(), hasDefault: true }): string {
  const exports = [...requested.names].map((name) => {
    if (name === "cn") return "";
    if (name.startsWith("use")) return `export const ${name}=(value)=>value ?? false;`;
    if (/^[A-Z][A-Z0-9_]+$/.test(name)) return `export const ${name}=${name.includes("MS") ? "300" : "\"idle\""};`;
    if (/^[a-z]/.test(name)) return `export const ${name}=(...args)=>args[0] ?? {};`;
    const tag = KNOWN_TAGS[name] ?? "div";
    return `export const ${name}=pass(${JSON.stringify(tag)});`;
  }).join("\n");
  return `import * as React from "react"; const pass=(tag)=>React.forwardRef(({children,className,...rest},ref)=>React.createElement(tag,{ref,className,...rest},children)); export const cn=(...parts)=>parts.flat(Infinity).filter(p=>typeof p==="string").join(" "); ${exports} ${requested.hasDefault ? "export default pass(\"div\");" : ""}`;
}

function hookShimModule(requested = { names: new Set<string>(), hasDefault: true }): string {
  const hook = `(value)=>Array.isArray(value)?value:[value??false,()=>{}]`;
  const exports = [...requested.names].map((name) => name === "useAutoHeight"
    ? `export const ${name}=()=>({ref:()=>{},height:0});`
    : `export const ${name}=${hook};`).join("\n");
  return `${exports} ${requested.hasDefault ? `export default ${hook};` : ""}`;
}

function iconShimModule(requested = { names: new Set<string>(), hasDefault: false }): string {
  const icon = `(props)=>React.createElement("svg",{viewBox:"0 0 24 24",width:props?.size??20,height:props?.size??20,fill:"none",stroke:"currentColor",...props},React.createElement("circle",{cx:12,cy:12,r:8}),React.createElement("path",{d:"M8 12h8M12 8v8"}))`;
  const exports = [...requested.names].map((name) => `export const ${name}=${icon};`).join("\n");
  return `import * as React from "react"; ${exports} ${requested.hasDefault ? `export default ${icon};` : ""}`;
}

function fontShimModule(requested = { names: new Set<string>(), hasDefault: false }): string {
  const font = `()=>({className:"",variable:"",style:{fontFamily:"ui-sans-serif, system-ui"}})`;
  const exports = [...requested.names].map((name) => `export const ${name}=${font};`).join("\n");
  return `${exports} ${requested.hasDefault ? `export default ${font};` : ""}`;
}

function packageUrl(specifier: string): string {
  const options = "?bundle&target=es2020";
  if (specifier === "react") return `https://esm.sh/react@19.2.0${options}`;
  if (specifier.startsWith("react/")) return `https://esm.sh/react@19.2.0/${specifier.slice(6)}${options}`;
  if (specifier === "react-dom") return `https://esm.sh/react-dom@19.2.0${options}&external=react`;
  if (specifier.startsWith("react-dom/")) return `https://esm.sh/react-dom@19.2.0/${specifier.slice(10)}${options}&external=react`;
  return `https://esm.sh/${specifier}${options}&external=react,react-dom`;
}

/** Compiles just the utility candidates present in this item, once, on the server. */
async function tailwindFor(files: RegistryFile[]): Promise<string> {
  if (!tailwindCompiler) {
    tailwindCompiler = readFile(path.join(process.cwd(), "node_modules/tailwindcss/theme.css"), "utf-8")
      .then((theme) => compileTailwind(`${theme}\n@tailwind utilities;`));
  }
  if (!preflightCss) {
    preflightCss = readFile(path.join(process.cwd(), "node_modules/tailwindcss/preflight.css"), "utf-8");
  }
  const candidates = new Set<string>();
  for (const file of files) {
    for (const match of (file.content ?? "").matchAll(/(?:className|class)\s*=\s*(?:\{\s*)?["'`]([^"'`]+)["'`]/g)) {
      for (const candidate of match[1]!.split(/\s+/)) {
        const clean = candidate.replace(/^\$\{.*?\}|\$\{.*?\}$/g, "").trim();
        if (clean && !clean.includes("${")) candidates.add(clean);
      }
    }
    // Utilities assembled through cn()/clsx()/cva() still appear as string literals.
    for (const match of (file.content ?? "").matchAll(/["'`]([^"'`\n]{2,240})["'`]/g)) {
      if (!match[1]!.includes("-") && !match[1]!.includes(":")) continue;
      for (const candidate of match[1]!.split(/\s+/)) if (candidate && !candidate.includes("${")) candidates.add(candidate);
    }
  }
  const compiler = await tailwindCompiler;
  return `${await preflightCss}\n${compiler.build([...candidates])}`;
}

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

function VisualFallback() {
  return React.createElement("div", { className: "dp-auto-visual", "aria-label": "Generated visual fallback" },
    React.createElement("div", { className: "dp-auto-orbit" },
      React.createElement("i"), React.createElement("i"), React.createElement("i")),
    React.createElement("div", { className: "dp-auto-bars" },
      React.createElement("i"), React.createElement("i"), React.createElement("i"), React.createElement("i"), React.createElement("i")),
    React.createElement("small", null, ${JSON.stringify(entryPath.split("/").pop()?.replace(/\.[jt]sx?$/, "") ?? "Component")})
  );
}

class Boundary extends React.Component {
  constructor(p) { super(p); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return React.createElement(VisualFallback);
    }
    return this.props.children;
  }
}

const root = createRoot(document.getElementById("root"));
root.render(
  Component
    ? React.createElement(Boundary, null, React.createElement(Component, PROPS))
    : React.createElement(VisualFallback)
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
.dp-auto-visual{position:relative;width:min(178px,70vw);height:min(178px,70vw);display:grid;place-items:center;border-radius:50%;background:radial-gradient(circle,#29401f 0,#151d12 48%,transparent 70%)}
.dp-auto-orbit{position:absolute;inset:18px;border:1px solid #a8d47b88;border-radius:50%;animation:dp-spin 7s linear infinite}.dp-auto-orbit:before,.dp-auto-orbit:after{content:"";position:absolute;inset:18px;border:1px solid #75985766;border-radius:50%}.dp-auto-orbit:after{inset:43px;background:#cbe99a2b;box-shadow:0 0 32px #b8e78b44}
.dp-auto-orbit i{position:absolute;width:9px;height:9px;border-radius:50%;background:#d8f6ae;box-shadow:0 0 13px #d8f6ae}.dp-auto-orbit i:nth-child(1){left:8px;top:21px}.dp-auto-orbit i:nth-child(2){right:-4px;top:63px;width:6px;height:6px}.dp-auto-orbit i:nth-child(3){left:63px;bottom:-4px;width:7px;height:7px}
.dp-auto-bars{z-index:1;display:flex;align-items:center;gap:4px}.dp-auto-bars i{display:block;width:3px;height:18px;border-radius:3px;background:#e1fbc0;animation:dp-wave .8s ease-in-out infinite alternate}.dp-auto-bars i:nth-child(2){height:30px;animation-delay:-.6s}.dp-auto-bars i:nth-child(3){height:43px;animation-delay:-.4s}.dp-auto-bars i:nth-child(4){height:27px;animation-delay:-.2s}.dp-auto-bars i:nth-child(5){height:14px}
.dp-auto-visual small{position:absolute;bottom:6px;max-width:140px;overflow:hidden;text-overflow:ellipsis;color:#90aa78;font-size:8px;letter-spacing:.12em;text-transform:uppercase;white-space:nowrap}
@keyframes dp-spin{to{transform:rotate(360deg)}}@keyframes dp-wave{to{transform:scaleY(.45);opacity:.5}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
`;

/** Connections denied outright: everything the module needs is already bundled in. */
const CSP =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; " +
  "img-src data: https:; font-src data: https:; connect-src 'none'";

function documentFor(name: string, code: string, componentCss: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<title>${escapeHtml(name)}</title><style>${componentCss.replace(/<\/style/gi, "<\\/style")}\n${BASE_CSS}</style></head>
<body><div id="root"></div><script type="module">${safeForScript(code)}</script></body></html>`;
}

/** Shown when the component could not be compiled at all. */
function generatedDocument(name: string, reason: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<title>${escapeHtml(name)}</title><style>${BASE_CSS}</style></head>
<body data-generated="true" data-reason="${escapeHtml(reason)}"><div class="dp-auto-visual" aria-label="Visual demonstration for ${escapeHtml(name)}"><div class="dp-auto-orbit"><i></i><i></i><i></i></div><div class="dp-auto-bars"><i></i><i></i><i></i><i></i><i></i></div><small>${escapeHtml(name)}</small></div></body></html>`;
}
