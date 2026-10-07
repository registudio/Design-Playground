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
import { propRecipe, RECIPES_FINGERPRINT } from "@/elements/preview-props";

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
 * The fallback is not final — it sits over the component, and one that paints late
 * removes it and reports ready — but it is still visible, and a card that says
 * "Fallback demo" for a second before changing its mind is worse than one that says
 * "Rendering…" a moment longer. So the grace is long enough to cover an ordinary
 * staggered entrance, and the watch after it runs longer still.
 */
const BLANK_GRACE_MS = 4000;
/** How long after load the document keeps polling for a late first paint. */
const LATE_PAINT_WATCH_MS = 12000;
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

/**
 * Keyed by source, name and a fingerprint of everything that shapes a compiled document.
 *
 * This used to be a hand-bumped version, and it went stale: it stayed at "4" while the
 * compiler moved React and Motion from esm.sh onto local packages, taught the error
 * boundary to record why it caught, and more. Entries never expire, so documents built
 * by the older compiler kept being served after the fixes landed, and only Retry, which
 * skips the disk, ever replaced them. A card could read "Fallback demo" days after
 * the bug behind it was fixed. The fingerprint changes whenever that code or a bundled
 * package's version changes, so an update retires the old documents automatically.
 * CACHE_VERSION remains for retiring them by hand when nothing else would.
 */
const CACHE_VERSION = "5";

/** Packages compiled into every document from local disk; see installedPackagePath. */
const BUNDLED_PACKAGES = ["react", "react-dom", "motion", "motion/node_modules/framer-motion", "gsap", "tailwindcss"];

let compilerFingerprint: Promise<string> | null = null;

function fingerprint(): Promise<string> {
  compilerFingerprint ??= (async () => {
    const modules = path.join(process.cwd(), "node_modules");
    const versions = await Promise.all(
      BUNDLED_PACKAGES.map(async (name) => {
        try {
          const manifest = await readFile(/* turbopackIgnore: true */ path.join(modules, name, "package.json"), "utf-8");
          return `${name}@${(JSON.parse(manifest) as { version?: string }).version ?? "?"}`;
        } catch {
          return `${name}@absent`;
        }
      }),
    );
    // Function source rather than a list kept by hand: a hand-kept list is exactly what
    // went stale. Each of these decides something about what ends up in the document.
    const code = [
      fetchItem, demonstrationOf, patched, chooseEntry, compile, withAssets, previewAssets, withDefaultTextFont, virtualFiles, installedPackagePath, installedPath, normalize, resolveRelative, resolvePublished,
      readImports, shimModule, hookShimModule, iconShimModule, fontShimModule, packageUrl, tailwindFor,
      harness, documentFor, generatedDocument,
    ].map(String);
    return createHash("sha256")
      .update([CACHE_VERSION, ...versions, RECIPES_FINGERPRINT, BASE_CSS, CSP, JSON.stringify(KNOWN_TAGS), JSON.stringify(NEXT_SHIMS), JSON.stringify(SINGLETONS), JSON.stringify(PREVIEW_ASSETS), ...Object.values(PREVIEW_PATCHES).flat().map((patch) => `${patch?.file}|${patch?.when}|${patch?.apply}`), THEME_CSS, TAILWIND_PROJECT, ...code].join("\n"))
      .digest("hex")
      .slice(0, 16);
  })();
  return compilerFingerprint;
}

const diskKey = async (source: string, name: string) =>
  createHash("sha256").update(`${await fingerprint()}:${source}:${name}`).digest("hex").slice(0, 32);

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
  /** Where `shadcn add` writes the file in the consuming project. */
  target?: string;
}

/**
 * A file's place in the preview's virtual project: where it would be installed, not
 * where its publisher keeps it.
 *
 * Imports are written against the installed layout. A Bklit example imports
 * "@/components/charts", which is its barrel's target (components/charts/index.ts) but
 * nothing like its path (registry/examples/area-chart-index.ts). Laid out by path, the
 * import missed, fell through to the generic shim, and the chart was assembled from
 * empty divs: mounted, painted nothing, "Fallback demo".
 */
const installedPath = (file: RegistryFile) => normalize(file.target || file.path);

interface PublishedItem {
  files?: RegistryFile[];
  registryDependencies?: string[];
  description?: string;
  /** npm packages the item needs, as `name@range` (or a bare name). */
  dependencies?: string[];
  /** CSS variables the item asks the consuming project to define. */
  cssVars?: { theme?: Record<string, string>; light?: Record<string, string>; dark?: Record<string, string> };
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
  const cssVars: Record<string, string> = {};
  const versions: Record<string, string> = {};
  let description: string | undefined;
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
    if (next === name) description = item.description;
    for (const file of item.files ?? []) files.set(installedPath(file), file);
    for (const dependency of item.dependencies ?? []) {
      const at = dependency.lastIndexOf("@");
      if (at > 0) versions[dependency.slice(0, at)] ??= dependency.slice(at + 1);
    }
    // The preview surface is dark, so an item's dark values win over its light ones.
    Object.assign(cssVars, item.cssVars?.theme, item.cssVars?.dark);
    for (const dependency of item.registryDependencies ?? []) {
      const dependencyName = dependency.split("/").pop();
      if (dependencyName && !seen.has(dependencyName)) queue.push(dependencyName);
    }
  }
  return { files: [...files.values()], cssVars: { theme: cssVars }, versions, description } satisfies PublishedItem & { versions: Record<string, string> };
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
    // An example item's page is the demonstration, whatever its file is called.
    candidates.find((file) => file.type === "registry:page") ??
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
    const key = await diskKey(source, name);
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

/**
 * Corrections to bugs in a publisher's own demo code, so its preview shows what the
 * component does rather than the bug.
 *
 * Each names the published file it corrects and applies only while the broken code is
 * still there (`when`), so a fix upstream switches the patch off rather than fighting
 * it. Kept to demos — a component's own source is never patched.
 */
const PREVIEW_PATCHES: Partial<Record<SourceId, { file: RegExp; when: RegExp; apply: (code: string) => Promise<string> | string }[]>> = {
  bklit: [
    {
      // RadarArea reads row.values[metric.key]; the example passes flat rows, so the
      // chart threw "Cannot read properties of undefined (reading 'speed')".
      file: /examples\/radar-chart\.tsx$/,
      when: /\{ id: "[^"]+", (?!values:)\w+: \d/,
      apply: (code) => code.replace(/\{ id: ("[^"]+"), ((?:\w+: [\d.]+,? ?)+) \}/g, "{ id: $1, values: { $2 } }"),
    },
    {
      // ChoroplethChart takes a GeoJSON FeatureCollection; the example passes three
      // plain rows and the chart threw on data.features.map. Given the world map Bklit's
      // own dashboard block loads (vendored, see data/preview-assets/bklit).
      file: /examples\/choropleth-chart\.tsx$/,
      when: /data=\{features\}/,
      apply: async (code) => {
        const world = await readFile(/* turbopackIgnore: true */ path.join(process.cwd(), "data/preview-assets/bklit/world-countries.json"), "utf-8");
        return `import { feature as __dpFeature } from "topojson-client";\nconst __dpWorld = ${world.trim()};\n${code.replace(/data=\{features\}/, "data={__dpFeature(__dpWorld, __dpWorld.objects.countries)}")}`;
      },
    },
  ],
};

async function patched(source: SourceId, files: RegistryFile[]): Promise<RegistryFile[]> {
  const patches = PREVIEW_PATCHES[source];
  if (!patches) return files;
  return Promise.all(files.map(async (file) => {
    let content = file.content!;
    for (const patch of patches) {
      if (patch.file.test(file.path) && patch.when.test(content)) content = await patch.apply(content);
    }
    return content === file.content ? file : { ...file, content };
  }));
}

/** Files a component imports or fetches that are models, textures or media. */
const ASSET_FILE = /\.(?:glb|gltf|png|jpe?g|webp|avif|gif|hdr|exr|ktx2|bin|mp4|webm|mp3|wav)$/i;

/**
 * Demo files a registry's components load, which its registry does not publish.
 *
 * React Bits' 3D components load models from its own site (FluidGlass fetches
 * /assets/3d/lens.glb) or import them beside their source (Lanyard's card.glb). The
 * sandbox has no network, so they are vendored under data/preview-assets — see the
 * README there — and inlined as data: URLs. Keyed by file name, scoped to the source.
 */
const PREVIEW_ASSETS: Partial<Record<SourceId, string[]>> = {
  "react-bits": ["lens.glb", "bar.glb", "cube.glb", "card.glb", "lanyard.png"],
};

const assetCache = new Map<SourceId, Promise<Map<string, string>>>();

function previewAssets(source: SourceId): Promise<Map<string, string>> {
  const names = PREVIEW_ASSETS[source];
  if (!names) return Promise.resolve(new Map());
  if (!assetCache.has(source)) {
    assetCache.set(source, Promise.all(names.map(async (file) => {
      const bytes = await readFile(/* turbopackIgnore: true */ path.join(process.cwd(), "data/preview-assets", source, file));
      const type = file.endsWith(".png") ? "image/png" : "model/gltf-binary";
      return [file, `data:${type};base64,${bytes.toString("base64")}`] as const;
    })).then((entries) => new Map(entries)));
  }
  return assetCache.get(source)!;
}

/**
 * Points a held file's path at its data: URL wherever it appears as a string, so a
 * component's `useGLTF("/assets/3d/lens.glb")` loads the vendored model.
 *
 * Import specifiers are left alone — `import card from "./card.glb"` goes through the
 * resolver's asset namespace instead; rewritten, it became an import *from* a data: URL.
 * The URL keeps the file name as a fragment, which fetch ignores: ModelViewer chooses
 * its loader from the extension at the end of the URL, and a bare data: URL has none.
 */
function withAssets(code: string, assets: Map<string, string>): string {
  if (!assets.size) return code;
  return code.replace(/(?<!\b(?:from|import)\s*\(?\s*)(["'`])((?:\.{0,2}\/)?(?:[\w.-]+\/)*)([\w.-]+)\1/g, (whole, quote: string, _dir: string, file: string) =>
    assets.has(file) && ASSET_FILE.test(file) ? `${quote}${assets.get(file)}#${file}${quote}` : whole);
}

/**
 * The item that best demonstrates `name`.
 *
 * Bklit's charts are composable roots — `<AreaChart>` draws nothing until it is given
 * `<Area>`, `<Grid>` and an axis as children — so on their own they mounted, painted
 * nothing and showed a stand-in. Bklit publishes a `-example` item beside each chart that
 * composes it the way its documentation does, and that is what a preview should run.
 */
async function demonstrationOf(source: SourceId, name: string) {
  if (source === "bklit" && !name.endsWith("-example")) {
    try {
      return { item: await fetchItem(source, `${name}-example`), entryName: `${name}-example` };
    } catch {
      // Parts and helpers publish no example; preview the item itself.
    }
  }
  return { item: await fetchItem(source, name), entryName: name };
}

async function compile(source: SourceId, name: string): Promise<string> {
  const { item, entryName } = await demonstrationOf(source, name);
  const assets = await previewAssets(source);
  const files = await patched(source, (item.files ?? []).filter((file) => typeof file.content === "string"));
  if (!files.length) return generatedDocument(name, "This registry entry publishes no source files");

  const entry = chooseEntry(files, entryName);
  if (!entry) return generatedDocument(name, "This registry entry is a helper rather than a React component");

  const bundle = await esbuild.build({
    stdin: { contents: withAssets(harness(installedPath(entry), propRecipe(source, name)), assets), resolveDir: "/", loader: "tsx", sourcefile: "preview.tsx" },
    bundle: true,
    write: false,
    outdir: "out",
    // Next inlines process.env at build time, so registry code reads it freely at module
    // scope (kokonut's v0-button does) and threw "process is not defined" here before
    // anything mounted. An empty environment is the honest answer in a sandbox.
    // Shaped like the browser polyfill bundlers ship: code that finds a `process` goes on
    // to call emitWarning, nextTick or cwd (Ballpit's dependencies do), and a bare
    // { env } stub threw "process.emitWarning is not a function".
    banner: { js: 'var process = { env: { NODE_ENV: "production" }, browser: true, version: "", versions: {}, platform: "browser", argv: [], cwd: () => "/", emitWarning: () => {}, nextTick: (fn, ...args) => queueMicrotask(() => fn(...args)), on: () => {}, off: () => {} };' },
    // Production React, to match everything esm.sh serves (its default build). Bundled
    // unminified, esbuild picked React's development build, and React 19.2's dev
    // createElement calls dispatcher.getOwner(), which only a dev renderer provides — so
    // @react-three/fiber's production reconciler crashed every Canvas on first render.
    define: { "process.env.NODE_ENV": '"production"' },
    format: "esm",
    target: "es2020",
    jsx: "automatic",
    logLevel: "silent",
    plugins: [virtualFiles(files, assets, (item as { versions?: Record<string, string> }).versions ?? {})],
  });

  const code = bundle.outputFiles?.find((file) => file.path.endsWith(".js"))?.text;
  if (!code) throw new Error("Nothing was produced by the bundler");
  const bundledCss = bundle.outputFiles?.find((file) => file.path.endsWith(".css"))?.text ?? "";
  const utilityCss = await tailwindFor(files);
  const itemVars = Object.entries(item.cssVars?.theme ?? {})
    .filter(([key, value]) => /^[\w-]+$/.test(key) && !/[;{}<]/.test(value))
    .map(([key, value]) => `${key.startsWith("--") ? key : `--${key}`}:${value}`).join(";");
  // Theme defaults first, then the item's own variables, then its utilities and styles,
  // so anything the component defines for itself still wins.
  // An item that describes itself as shared helpers (Bklit's chart-series and
  // chart-animation) draws nothing alone by design; if so, the card says that plainly
  // instead of "painted nothing". Read from the item's own words, not guessed from its
  // source: a component that really does draw nothing must still be reported as such.
  const part = /\bshared\b[^.]*\bhelpers?\b/i.test(item.description ?? "");
  return documentFor(name, code, `${THEME_CSS}\n${itemVars ? `:root{${itemVars}}` : ""}\n${utilityCss}\n${bundledCss}`, part);
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
  const send = (status, reason) => { try { parent.postMessage({ type: "dp-preview-status", status, attempt, reason }, "*"); } catch {} };

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
    // Upper-cased: an SVG element keeps its lowercase tagName in an HTML document, so
    // "svg" never matched and a chart or illustration drawn purely in SVG shapes read as
    // empty — the stand-in was laid over a component that had rendered perfectly.
    if (/^(IMG|CANVAS|SVG|VIDEO|PICTURE)$/.test(node.tagName.toUpperCase())) return true;
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
      if (node.closest("[data-dp-backdrop]")) continue;
      if (inks(node)) return true;
    }
    return false;
  };

  // A component whose outer element holds only positioned children (a canvas laid
  // absolutely over its box, say) has no size of its own; centred in #root it shrank to
  // 0x0 and drew into nothing. Given the frame instead, once, it draws.
  const expandCollapsed = () => {
    const first = document.getElementById("root")?.firstElementChild;
    if (!first || first.dataset.dpExpanded || !first.children.length) return;
    const box = first.getBoundingClientRect();
    if (box.width >= 4 && box.height >= 4) return;
    first.dataset.dpExpanded = "";
    first.style.width = "100%";
    first.style.height = "100%";
  };

  const started = Date.now();
  let errored = false;
  let thrown = "";

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

  // Three very different things put a stand-in on a card — the item never compiled, the
  // component threw on mount, or it mounted and painted nothing — and they looked
  // identical, which made every report of "it isn't rendering" unanswerable. The status
  // now travels with the reason, and the card keeps it.
  const reason = () => document.body.dataset.reason
    || thrown
    || (document.body.dataset.generated ? "This item could not be compiled." : "")
    || (document.body.dataset.part !== undefined ? "Shared helpers other components are built from: they draw nothing on their own, so there is no preview." : "")
    || "The component mounted but painted nothing in this frame.";

  const evaluate = () => {
    expandCollapsed();
    if (painted()) {
      if (layer) { layer.remove(); layer = null; }
      return document.querySelector(".dp-auto-visual") ? "fallback" : "ready";
    }
    if (document.querySelector(".dp-auto-visual")) return "fallback";
    // A cursor or hover effect on its sample scene draws nothing until a pointer moves
    // over it. The scene is what the card should show meanwhile, unless it threw.
    if (!errored && document.querySelector("[data-dp-backdrop]") && Date.now() >= started + 1500) return "ready";
    // Components legitimately render late — a transition, a timer, an effect that
    // measures first. Only after that grace is an empty surface really empty.
    if (errored || Date.now() - started > ${BLANK_GRACE_MS}) { fallBack(); return "fallback"; }
    return "rendering";
  };

  const report = () => {
    const status = evaluate();
    send(status, status === "fallback" ? reason() : undefined);
    return status;
  };

  new MutationObserver(report).observe(document.documentElement, { childList: true, subtree: true, attributes: true });
  // An error is only a failure if nothing is showing. Components throw from effects and
  // handlers all the time after painting perfectly well, and reporting those as failed
  // hid a working preview behind the placeholder.
  addEventListener("error", (event) => { errored = true; thrown = thrown || ("An error was thrown: " + (event.message || event.error)); report(); });
  addEventListener("unhandledrejection", (event) => { errored = true; thrown = thrown || ("A promise rejected: " + (event.reason && event.reason.message ? event.reason.message : event.reason)); report(); });
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
  // Before the *last* </body>, by slicing. replace() took the first, and a bundle can
  // contain that text: PillNav's does, so the reporter landed inside the component's own
  // module script, which then failed to parse — nothing mounted and nothing reported,
  // and the card sat on "Rendering…" until it timed out. Slicing also keeps a "$&" in
  // the script from being read as a replacement pattern. With no </body> at all, it is
  // appended, so a document is never left without its reporter.
  const end = html.lastIndexOf("</body>");
  return end === -1 ? html + script : html.slice(0, end) + script + html.slice(end);
}

/**
 * Resolves the published files, project aliases and npm packages.
 *
 * Packages are fetched server-side from esm.sh and bundled in, so the iframe needs no
 * network of its own and the CSP can deny connections outright. React is pinned to one
 * copy: the component and the renderer sharing a React instance is the difference
 * between a preview and an invariant violation.
 */
function virtualFiles(files: RegistryFile[], assets: Map<string, string> = new Map(), versions: Record<string, string> = {}): esbuild.Plugin {
  const byPath = new Map(files.map((file) => [installedPath(file), file.content!]));
  // The published path still answers, for the imports a publisher wrote against its own
  // repository instead — but as an alias, so one file is never bundled twice.
  const aliases = new Map<string, string>();
  for (const file of files) {
    const published = normalize(file.path);
    if (published !== installedPath(file) && !byPath.has(published)) aliases.set(published, installedPath(file));
  }
  const known = new Map([...byPath, ...[...aliases].map(([alias, real]) => [alias, byPath.get(real)!] as const)]);
  const canonical = (key: string | null) => key && (aliases.get(key) ?? key);
  const shimImports = new Map<string, { names: Set<string>; hasDefault: boolean }>();

  const localTarget = (request: string, importer: string): string | null => {
    if (request.startsWith("@/") || request.startsWith("~/")) {
      return canonical(resolvePublished(request.slice(2), known));
    }
    if (request.startsWith(".") || request.startsWith("/")) {
      return canonical(resolveRelative(importer, request, known));
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
          if (ASSET_FILE.test(args.path)) return { path: args.path.split("/").pop()!, namespace: "asset" };
          return shim(args.path, args.importer);
        }
        if (args.path === "lucide-react" || args.path === "@central-icons-react/all") return shim(args.path, args.importer, "icon-shim");
        if (args.path.startsWith("next/font")) return shim(args.path, args.importer, "font-shim");
        if (args.path in NEXT_SHIMS) return { path: args.path, namespace: "next-shim" };
        const installed = installedPackagePath(args.path);
        if (installed) return { path: installed };
        return { path: packageUrl(args.path, versions), namespace: "remote" };
      };

      // Every bare import, wherever it comes from, goes through here. The shims and the
      // esm.sh modules used to send theirs straight to esm.sh, so a package that imports
      // React (visx, use-gesture, Radix…) got esm.sh's copy while the component and the
      // renderer used the local one. Two Reacts in one document: the package's first hook
      // read a null dispatcher and threw "Cannot read properties of null (reading
      // 'useState')", which took out every Bklit chart. The same split would hand a
      // package its own gsap or motion, whose plugins and contexts then never meet.
      const bare = (specifier: string) => {
        const installed = installedPackagePath(specifier);
        return installed ? { path: installed } : { path: packageUrl(specifier, versions), namespace: "remote" };
      };

      build.onResolve({ filter: /.*/, namespace: "file" }, resolveRegistryImport);
      build.onResolve({ filter: /.*/, namespace: "virtual" }, resolveRegistryImport);
      build.onResolve({ filter: /.*/, namespace: "shim" }, (args) => bare(args.path));
      build.onResolve({ filter: /.*/, namespace: "hook-shim" }, (args) => bare(args.path));
      build.onResolve({ filter: /.*/, namespace: "icon-shim" }, (args) => bare(args.path));
      build.onResolve({ filter: /.*/, namespace: "font-shim" }, (args) => bare(args.path));
      build.onResolve({ filter: /.*/, namespace: "remote" }, (args) => {
        if (args.path.startsWith("http://") || args.path.startsWith("https://")) return { path: args.path, namespace: "remote" };
        if (args.path.startsWith(".") || args.path.startsWith("/")) {
          return { path: new URL(args.path, args.importer).href, namespace: "remote" };
        }
        return bare(args.path);
      });

      build.onLoad({ filter: /.*/, namespace: "virtual" }, (args) => {
        const contents = byPath.get(args.path);
        if (contents === undefined) throw new Error(`Imports "${args.path}", which this item does not publish`);
        return { contents: withAssets(contents, assets), loader: args.path.endsWith(".ts") ? "ts" : "tsx", resolveDir: "/" };
      });

      // An imported model or image is a URL, not a component. These used to fall through
      // to the generic shim, so `cardGLB` arrived as a React component and the loader
      // was handed a function. A file we hold becomes a data: URL; one we do not becomes
      // an empty string, which fails as a missing file rather than as a type error.
      build.onLoad({ filter: /.*/, namespace: "asset" }, (args) => ({
        contents: `export default ${JSON.stringify(assets.has(args.path) ? `${assets.get(args.path)}#${args.path}` : "")};`,
        loader: "js",
      }));

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

      build.onLoad({ filter: /.*/, namespace: "next-shim" }, (args) => ({
        contents: NEXT_SHIMS[args.path], loader: "js", resolveDir: "/",
      }));
      build.onResolve({ filter: /.*/, namespace: "next-shim" }, (args) => bare(args.path));

      build.onLoad({ filter: /.*/, namespace: "empty-style" }, () => ({ contents: "", loader: "css" }));

      build.onLoad({ filter: /.*/, namespace: "remote" }, async (args) => {
        const fetched = await rememberResource(
          remoteModules,
          args.path,
          REMOTE_MODULE_CACHE_ENTRIES,
          async () => {
            const response = await fetch(args.path, { signal: AbortSignal.timeout(TIMEOUT_MS) });
            if (!response.ok) throw new Error(`Could not fetch ${args.path} (HTTP ${response.status})`);
            return response.text();
          },
        );
        return { contents: await withDefaultTextFont(fetched), loader: "js" };
      });
    },
  };
}

/**
 * Gives troika — the text renderer behind drei's <Text>, bundled inside drei — a default
 * font. With none, troika asks a CDN which font covers the text; the sandbox refuses
 * the request, the text suspends, and everything under the same Suspense with it.
 * FluidGlass drew only its background for that reason. Set where troika declares its
 * defaults, since the copy inside drei's bundle is not reachable from anywhere else.
 */
let defaultTextFont: Promise<string> | null = null;

async function withDefaultTextFont(code: string): Promise<string> {
  if (!/defaultFontURL:\s*null/.test(code)) return code;
  defaultTextFont ??= readFile(/* turbopackIgnore: true */ path.join(process.cwd(), DEFAULT_TEXT_FONT))
    .then((bytes) => `data:font/ttf;base64,${bytes.toString("base64")}`);
  const font = await defaultTextFont;
  return code.replace(/defaultFontURL:\s*null/, () => `defaultFontURL:${JSON.stringify(font)}`);
}

/** See data/preview-assets/fonts/README.md. */
const DEFAULT_TEXT_FONT = "data/preview-assets/fonts/figtree-black.ttf";

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

const normalize = (path: string) => path.replace(/^(?:\.|~)?\//, "");

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

/**
 * Next.js modules a registry component may import, as plain-DOM stand-ins.
 *
 * Fetched for real, `next/link` and `next/image` brought the Next client runtime from
 * esm.sh, which reads process.env.__NEXT_* at module scope and threw "process is not
 * defined" before the component mounted. Outside a Next app they are only an anchor and
 * an image, so that is what they become; props only Next understands are dropped rather
 * than landing on the DOM as unknown attributes.
 */
const NEXT_SHIMS: Record<string, string> = {
  "next/link": `import * as React from "react";
const Link = React.forwardRef(({ href, prefetch, replace, scroll, shallow, passHref, legacyBehavior, locale, ...rest }, ref) =>
  React.createElement("a", { ref, href: typeof href === "string" ? href : (href && href.pathname) || "#", ...rest }));
export default Link;`,
  "next/image": `import * as React from "react";
const Image = React.forwardRef(({ src, fill, priority, quality, placeholder, blurDataURL, loader, unoptimized, overrideSrc, style, ...rest }, ref) =>
  React.createElement("img", { ref, src: typeof src === "string" ? src : src && src.src, decoding: "async",
    style: fill ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...style } : style, ...rest }));
export default Image;`,
  "next/navigation": `const router = { push() {}, replace() {}, back() {}, forward() {}, refresh() {}, prefetch() {} };
export const useRouter = () => router;
export const usePathname = () => "/";
export const useSearchParams = () => new URLSearchParams();
export const useParams = () => ({});
export const useSelectedLayoutSegment = () => null;
export const useSelectedLayoutSegments = () => [];
export const redirect = () => {};
export const notFound = () => {};`,
};

function fontShimModule(requested = { names: new Set<string>(), hasDefault: false }): string {
  const font = `()=>({className:"",variable:"",style:{fontFamily:"ui-sans-serif, system-ui"}})`;
  const exports = [...requested.names].map((name) => `export const ${name}=${font};`).join("\n");
  return `${exports} ${requested.hasDefault ? `export default ${font};` : ""}`;
}

/**
 * DP_PACKAGE_BASE stands in for esm.sh, for the same reason DP_REGISTRY_BASE stands in
 * for the registries: almost every item reaches a package through it, so without a local
 * substitute nothing could be compiled where esm.sh is unreachable.
 */
const PACKAGE_BASE = (process.env.DP_PACKAGE_BASE ?? "https://esm.sh").replace(/\/$/, "");

/**
 * The esm.sh URL for a bare import, at the version the item declared.
 *
 * Every package used to be fetched at its latest version, whatever the component was
 * written against. Ballpit declares three@^0.180.0 — on a 0.x line that means 0.180.x —
 * and was served 0.186, whose shader chunks had changed shape; its material failed to
 * compile ("cannot convert from vec4 to vec3"). Bklit pins visx 4 alphas and was getting
 * visx 3. The ranges come from the items' own `dependencies`, across the whole closure,
 * and apply to imports from inside esm.sh modules too, so shared libraries still meet a
 * single copy at the declared version.
 */
function packageUrl(specifier: string, versions: Record<string, string> = {}): string {
  const options = "?bundle&target=es2020";
  if (specifier === "react") return `${PACKAGE_BASE}/react@19.2.0${options}`;
  if (specifier.startsWith("react/")) return `${PACKAGE_BASE}/react@19.2.0/${specifier.slice(6)}${options}`;
  if (specifier === "react-dom") return `${PACKAGE_BASE}/react-dom@19.2.0${options}&external=react`;
  if (specifier.startsWith("react-dom/")) return `${PACKAGE_BASE}/react-dom@19.2.0/${specifier.slice(10)}${options}&external=react`;
  // A package bundled with its own copy of one of these breaks whatever it shares
  // with: drei's hooks threw outside fiber's Canvas, postprocessing passes rejected the
  // component's three.js objects, @gsap/react registered plugins on a gsap no one else
  // used. Kept bare, they come back through the resolver and meet the document's one copy.
  // Only the package itself is left out of its own externals. A subpath keeps its
  // parent external: `three/examples/jsm/...` bundled with three's core inside it was a
  // second three.js in the document ("Multiple instances of Three.js being imported").
  const own = SINGLETONS.filter((name) => specifier !== name);
  const parts = specifier.split("/");
  const name = parts.slice(0, specifier.startsWith("@") ? 2 : 1).join("/");
  const range = versions[name];
  const versioned = range ? `${name}@${range}${specifier.slice(name.length)}` : specifier;
  return `${PACKAGE_BASE}/${versioned}${options}&external=${own.join(",")}`;
}

/** Libraries a document must hold exactly one instance of. */
const SINGLETONS = [
  "react", "react-dom", "three", "@react-three/fiber", "@react-three/drei", "@react-three/postprocessing",
  "postprocessing", "gsap", "motion", "framer-motion",
];

/** Compiles just the utility candidates present in this item, once, on the server. */
async function tailwindFor(files: RegistryFile[]): Promise<string> {
  if (!tailwindCompiler) {
    tailwindCompiler = readFile(path.join(process.cwd(), "node_modules/tailwindcss/theme.css"), "utf-8")
      .then((theme) => compileTailwind(`${theme}\n${TAILWIND_PROJECT}\n@tailwind utilities;`));
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
  componentDidCatch(error) {
    // Recorded where the status reporter can read it. A component that rejects this
    // environment is the most common reason a card shows a stand-in, and swallowing the
    // message left every one of those looking identical to a failed download.
    const message = error && error.message ? error.message : String(error);
    // A part that needs its parent (a chart's axis, a menu's item) throws a context
    // error by design. Said in plain words: on a card the raw message read as a bug.
    document.body.dataset.reason = /must be (?:used|wrapped|rendered) (?:within|inside|in)|outside (?:of )?(?:a|an|the) .*(?:Provider|context)|within a .*Provider/i.test(message)
      ? "Part of a larger component: it only renders inside its parent, so it has no preview of its own."
      : "The component threw while rendering: " + message;
  }
  render() {
    if (this.state.error) {
      return React.createElement(VisualFallback);
    }
    return this.props.children;
  }
}

// Overlay effects (a blur edge, film grain, cursor trails) act on whatever is under
// them, and a preview has nothing under them, so they showed an empty frame. A recipe
// asks for a sample scene behind them with __backdrop; the reporter ignores the scene
// when deciding whether the component painted.
const { __backdrop, ...props } = PROPS;
const app = React.createElement(Boundary, null, React.createElement(Component, props));
const root = createRoot(document.getElementById("root"));
root.render(
  !Component
    ? React.createElement(VisualFallback)
    : __backdrop
      ? React.createElement("div", { className: "dp-backdrop-stage" },
          React.createElement("div", { className: "dp-backdrop", "data-dp-backdrop": "", "aria-hidden": true },
            React.createElement("small", null, "Design Playground"),
            // cursor-target: what TargetCursor and its kind lock onto.
            React.createElement("strong", { className: "cursor-target" }, "Small details. Big possibilities."),
            React.createElement("p", null, "Motion, interactions and a little unexpected delight."),
            React.createElement("span", { className: "dp-backdrop-button cursor-target" }, "Explore")),
          app)
      : app
);
`;

/**
 * What a shadcn project defines and every registry here assumes: the theme variables,
 * the Tailwind colours mapped onto them, and a class-driven dark variant.
 *
 * Without them a component styled `text-muted-foreground` or `bg-background` got no CSS
 * at all, and Bklit's charts drew in var(--chart-1) — undefined, so near-black on the
 * near-black surface. Dark is a class here, not the viewer's OS setting: the surface is
 * always dark, and following the OS gave light-mode viewers white cards and dark-grey
 * text (`text-gray-800 dark:text-gray-200`) on it.
 */
const THEME_CSS = `:root{--background:#111412;--foreground:#eef2e6;--card:#181d16;--card-foreground:#eef2e6;--popover:#181d16;--popover-foreground:#eef2e6;--primary:#cbe99a;--primary-foreground:#111412;--secondary:#25311f;--secondary-foreground:#eef2e6;--muted:#222a1e;--muted-foreground:#9aa98c;--accent:#25311f;--accent-foreground:#eef2e6;--destructive:#f87171;--destructive-foreground:#111412;--border:#2e3a28;--input:#2e3a28;--ring:#cbe99a;--radius:.625rem;--chart-1:#cbe99a;--chart-2:#a78bfa;--chart-3:#7dd3fc;--chart-4:#f5a97f;--chart-5:#f0abfc;--chart-line-primary:var(--chart-1);--chart-line-secondary:var(--chart-2);--chart-grid:#2e3a28;--chart-background:transparent;--chart-foreground:#eef2e6;--chart-foreground-muted:#9aa98c;--chart-label:#9aa98c}`;

const SHADCN_COLOURS = ["background", "foreground", "card", "card-foreground", "popover", "popover-foreground", "primary", "primary-foreground", "secondary", "secondary-foreground", "muted", "muted-foreground", "accent", "accent-foreground", "destructive", "destructive-foreground", "border", "input", "ring", "chart-1", "chart-2", "chart-3", "chart-4", "chart-5"];

const TAILWIND_PROJECT = `@custom-variant dark (&:where(.dark, .dark *));
@theme inline { ${SHADCN_COLOURS.map((name) => `--color-${name}: var(--${name});`).join(" ")} --radius-sm: calc(var(--radius) - 4px); --radius-md: calc(var(--radius) - 2px); --radius-lg: var(--radius); --radius-xl: calc(var(--radius) + 4px); }`;

/**
 * Base styling so a component with no CSS of its own is still legible and contained.
 *
 * #root takes the frame's whole content box (the body's 18px padding aside). It used to
 * shrink to fit its content, which is circular for anything sized to its container: a
 * w-full chart measured 0 wide and drew nothing, an h-full WebGL background got a 0px
 * canvas. Content-sized components are still centred within it by place-items.
 */
const BASE_CSS = `
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:18px;background:#111412;color:#eef2e6;font-family:ui-sans-serif,system-ui,"Segoe UI",sans-serif;overflow:hidden}
#root{width:100%;height:calc(100vh - 36px);overflow:hidden;display:grid;place-items:center}
img,svg,canvas,video{max-width:100%;height:auto}
button{font:inherit;cursor:pointer}
.dp-backdrop-stage{position:relative;width:100%;height:100%}
.dp-backdrop{position:absolute;inset:0;display:grid;align-content:center;justify-items:center;gap:10px;padding:24px;text-align:center;background:radial-gradient(120% 90% at 20% 10%,#3b2d6b 0,transparent 55%),radial-gradient(90% 80% at 85% 90%,#1f5f4a 0,transparent 60%),#15131c;color:#f3f1ea}
.dp-backdrop-button{margin-top:6px;padding:8px 16px;border-radius:999px;background:#f3f1ea;color:#15131c;font-size:13px;font-weight:600}
.dp-backdrop small{font-size:11px;letter-spacing:.18em;text-transform:uppercase;opacity:.7}.dp-backdrop strong{font-size:clamp(22px,6vw,44px);line-height:1.05;letter-spacing:-.02em}.dp-backdrop p{margin:0;opacity:.75;font-size:14px}
.dp-auto-visual{position:relative;width:min(178px,70vw);height:min(178px,70vw);display:grid;place-items:center;border-radius:50%;background:radial-gradient(circle,#29401f 0,#151d12 48%,transparent 70%)}
.dp-auto-orbit{position:absolute;inset:18px;border:1px solid #a8d47b88;border-radius:50%;animation:dp-spin 7s linear infinite}.dp-auto-orbit:before,.dp-auto-orbit:after{content:"";position:absolute;inset:18px;border:1px solid #75985766;border-radius:50%}.dp-auto-orbit:after{inset:43px;background:#cbe99a2b;box-shadow:0 0 32px #b8e78b44}
.dp-auto-orbit i{position:absolute;width:9px;height:9px;border-radius:50%;background:#d8f6ae;box-shadow:0 0 13px #d8f6ae}.dp-auto-orbit i:nth-child(1){left:8px;top:21px}.dp-auto-orbit i:nth-child(2){right:-4px;top:63px;width:6px;height:6px}.dp-auto-orbit i:nth-child(3){left:63px;bottom:-4px;width:7px;height:7px}
.dp-auto-bars{z-index:1;display:flex;align-items:center;gap:4px}.dp-auto-bars i{display:block;width:3px;height:18px;border-radius:3px;background:#e1fbc0;animation:dp-wave .8s ease-in-out infinite alternate}.dp-auto-bars i:nth-child(2){height:30px;animation-delay:-.6s}.dp-auto-bars i:nth-child(3){height:43px;animation-delay:-.4s}.dp-auto-bars i:nth-child(4){height:27px;animation-delay:-.2s}.dp-auto-bars i:nth-child(5){height:14px}
.dp-auto-visual small{position:absolute;bottom:6px;max-width:140px;overflow:hidden;text-overflow:ellipsis;color:#90aa78;font-size:8px;letter-spacing:.12em;text-transform:uppercase;white-space:nowrap}
@keyframes dp-spin{to{transform:rotate(360deg)}}@keyframes dp-wave{to{transform:scaleY(.45);opacity:.5}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
`;

/**
 * No network: everything the module needs is already bundled in. Connections reach only
 * data: and blob: URLs, which is how a model loader reads a vendored model (see
 * PREVIEW_ASSETS) and the textures inside it. A loader may decode in a worker it builds
 * from a blob: of its own code, hence worker-src, and that worker importScripts() further
 * blobs under this same policy (troika, behind drei's <Text>), hence blob: in script-src
 * — code the page made itself, which 'unsafe-inline' already lets it run. 'wasm-unsafe-eval' lets a component
 * compile WebAssembly it carries (Rapier physics, for one) without permitting eval of
 * JavaScript.
 */
const CSP =
  "default-src 'none'; script-src 'unsafe-inline' 'wasm-unsafe-eval' blob:; style-src 'unsafe-inline'; " +
  "img-src data: blob: https:; font-src data: https:; connect-src data: blob:; worker-src blob:";

function documentFor(name: string, code: string, componentCss: string, part = false): string {
  return `<!doctype html><html lang="en" class="dark"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<title>${escapeHtml(name)}</title><style>${componentCss.replace(/<\/style/gi, "<\\/style")}\n${BASE_CSS}</style></head>
<body${part ? ' data-part=""' : ""}><div id="root"></div><script type="module">${safeForScript(code)}</script></body></html>`;
}

/** Shown when the component could not be compiled at all. */
function generatedDocument(name: string, reason: string): string {
  return `<!doctype html><html lang="en" class="dark"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<title>${escapeHtml(name)}</title><style>${BASE_CSS}</style></head>
<body data-generated="true" data-reason="${escapeHtml(reason)}"><div class="dp-auto-visual" aria-label="Visual demonstration for ${escapeHtml(name)}"><div class="dp-auto-orbit"><i></i><i></i><i></i></div><div class="dp-auto-bars"><i></i><i></i><i></i><i></i><i></i></div><small>${escapeHtml(name)}</small></div></body></html>`;
}
