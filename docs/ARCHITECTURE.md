# Architecture

Where things live and why, for anyone — person or agent — picking this up cold. The
README says what the app does and what the export contains; this says how the code is
arranged and which parts are easy to break. Keep it current when a part moves.

## Before changing…

- **how or when preview frames mount** — read `src/components/use-live-slot.ts` and
  `src/elements/preview-queue.ts` first. Every card in the grid, original or registry,
  draws from one queue of 12 live slots. Before that was true, authored cards ran
  unbudgeted (45 frames at once, 11 of them WebGL) and far-scrolled full-screen views
  painted nothing. Anything drawn over the whole grid pauses the cards behind it
  (`covered` in `ElementLibrary.tsx`).
- **engines or attribution** — read the comments on `ENGINE_SOURCES` and
  `PORT_SOURCES` in `src/elements/extended-catalogue.ts`. `label` (whose design) and
  `runtime` (what code runs) are separate on purpose: ShaderGradient's technique runs on
  this project's own WebGL, and cult-ui's components are ports. Neither ships the
  library it credits.
- **an engine bundle's name or layout** — `engineBundles()` in `extended-catalogue.ts`
  and `ENGINE_DEMO_LIST` in `scripts/engine-demos.mjs` must agree; a test holds them
  together. A mismatch is a 404 and a card that never moves.
- **the export** — the selection file (`design-playground-selection.json`) is a fixed
  three-field contract that `web-stack-init` Phase 2 reads. Add information in new files
  (as `THIRD-PARTY-LICENCES.md` did), not new fields.
- **anything that fetches a URL someone typed** — go through `src/brand/safe-fetch.ts`.

## The element catalogue

- `src/elements/catalogue.ts` — `ELEMENTS` (103 authored originals), `elementOrigin(id)`
  for attribution, and `elementDocument(id, accent)`, which wraps an element's
  `{html, css, js}` into the standalone document every card, dialog and export runs.
  `INTERACTION_ONLY` names the elements whose script still runs under reduced motion
  (controls — carousels, charts, cult-ui ports — rather than decoration).
  `engineLoader()` loads engine bundles after the frame's first paint, when idle: one
  Vanta bundle starting synchronously held up its neighbours' first paint.
- `src/elements/extended-catalogue.ts` — assembles `EXTENDED_ELEMENTS` from
  `engine-elements.ts`, `shader-elements.ts`, `cult-elements.ts`, `chart-elements.ts`
  and a few inline carousels. Defines `ENGINE_SOURCES` (motion, lenis, vanta, shader),
  `engineFor(id)` (by id prefix), `engineBundles(id)` and `PORT_SOURCES`.
- `scripts/engine-demos.mjs` — the runtime JS for every engine demo, keyed by element id
  and root selector. Plain `.mjs` so the build imports it with no compile step;
  `engine-demos.d.mts` types it for tests.
- `scripts/build-engine-demos.mjs` — runs on `predev`/`prebuild`. One esbuild bundle per
  engine into `public/engine-demos/`, except Vanta, built split: a shared
  `vanta-three.js` carrying only the Three.js classes the effects reference (worked out
  from the effect files at build time) and ~14 KB per effect. Also writes
  `LICENSES.txt`. The directory is emptied first, so a bundle that stops being built
  cannot linger.
- `scripts/shader-runtime.mjs` + `scripts/shader-cnoise.glsl` — the WebGL mesh-gradient
  runtime standing in for ShaderGradient (whose package would force a `three` upgrade
  that breaks Vanta). The noise function is glsl-noise's, unmodified.
- `src/elements/taxonomy.ts` — `BROWSE_CATEGORIES` and `browseCategory()`, the derived
  browsing facet for both populations. Every category the originals cover must hold at
  least six.
- `src/elements/descriptions.ts` — curated lines for registry entries whose published
  description is empty or boilerplate. A test fails, naming the entry, if any catalogue
  item falls back to its bare name.
- `src/elements/plain-language.ts` — the client-facing note on the review page: what an
  effect is, how it behaves, who sees what.

## The registries

- `src/registry/sources.ts` — the five `REGISTRY_SOURCES` with endpoints and routing
  metadata. `src/registry/licences.ts` — each source's licence, read from its licence
  file with the date (two are `null`: none could be found).
- `data/registry-snapshot.json` — the committed index (436 entries on 22 Sep 2026),
  refreshed weekly by `.github/workflows/refresh-registry.yml` as a PR.
- `app/api/element-preview/route.ts` — compiles a registry item's published source with
  esbuild into a sandboxed document, reporting `ready` / `fallback` / `blank` /
  `failed`. Two cache tiers: memory, and `.next/cache/element-preview` on disk
  (`DISK_CACHE_ENTRIES`, sized to hold the whole index — ~1 MB a document).
  `DP_REGISTRY_BASE` points every source at one origin, for the stand-in registry.
- `src/components/RegistryPreview.tsx` — a registry card's live preview. `previewSrc()`
  is the one URL builder for card and full screen alike.

## The library UI

- `src/components/ElementLibrary.tsx` — the grid. A bounded window of mounted cards
  (`windowAround`, `advanceCatalogueWindow`, `retreatCatalogueWindow` in
  `preview-budget.ts`) with spacers for the rest; a roving tabindex (one tab stop, arrow
  keys between cards, the tab-stop card's own controls in the tab order); one `fullId`
  for the full-screen view of either kind, stepping through the current results.
- `src/elements/library-url.ts` — the library's view as URL parameters. Read after mount
  (the page is prerendered), written back with `replaceState`; opening full screen pushes
  an entry so Back closes it. `app/page.tsx` opens the library directly for a link that
  carries a view.
- `src/elements/preview-budget.ts` — the tunables. They interact; the comments say how.

## Tokens, preview and export

- `src/schema/` — zod schemas for the project, tokens, recipe, assets and selections.
- `src/export/css.ts` — `generateCss(tokens)`: `globals.css` from the tokens alone,
  including `@font-face` for uploaded faces (`fontUrl` decides where the file is served
  from; the live preview passes `null` and registers faces itself).
- `src/color/semantic.ts` — the palette suggestion, and `darkThemeFor(scales)`, the one
  definition of a generated dark theme (the suggestion uses it too).
- `src/components/PreviewFrame.tsx` ↔ `app/preview/page.tsx` — the same-origin preview
  frame and its postMessage protocol (`src/preview/bridge.ts`): full state for
  structural changes, CSS only for token changes, and the contrast lens
  (`src/preview/contrast-lens.ts`) switched on and reporting back.
- `src/fonts/use-custom-fonts.ts` — registers uploaded faces from IndexedDB with a
  document; used by the preview frame and the Basics specimen.
- `src/export/bundle.ts` — `validate()` and `buildExport()`, scope `everything` or
  `elements`. `src/export/engine-assets.ts` — `embedEngineAssets(files, "shared")` for
  the ZIP (each bundle once in `elements/engines/`, relative paths; the review page's
  sandboxed `srcdoc` frames cannot load `file://`, so it carries each bundle once and
  fills its frames in on load) or `"inline"` for the single-file page download.

## Brand from a website

- `src/brand/site-extract.ts` — pure: HTML and CSS in, ranked colours, faces and logo
  candidates out.
- `src/brand/safe-fetch.ts` — fetches only the public internet: the address check runs
  inside each socket's own DNS lookup (no gap for rebinding), every redirect is
  re-checked. `DP_BRAND_ALLOW_ADDRESSES` exempts named addresses, for tests only.
- `app/api/brand-from-url/route.ts` — the route; `src/components/BrandFromUrl.tsx` — the
  UI, which reuses the logo upload's pipeline (`useLogoUpload` in `AssetUpload.tsx`).

## Tests

`npm run verify` — typecheck, `npm test` (vitest) and a production build. Run before
every commit.

Browser checks run against a production server — `npm run build && npx next start -p
3100` — and share their set-up via `scripts/lib/studio.mjs`. All take `BASE_URL`,
`E2E_OUTPUT_DIR` and `PLAYWRIGHT_EXECUTABLE_PATH`.

| Script | Covers | In CI |
| --- | --- | --- |
| `e2e` | preview bridge, templates as one undo, device media queries, light/dark/side by side | every push |
| `e2e:library` | URL state, keyboard grid, full-screen stepping, hooks hidden | every push |
| `e2e:export` | real ZIP; unpacked files load their runtimes from `file://`; elements-only | every push |
| `e2e:studio` | shell layout, library windowing, steps, contrast lens, export | every push |
| `e2e:fonts` | font upload, refusal, licence, preview, export | every push |
| `e2e:brand-url` | reading a fixture site; private addresses refused (needs `DP_BRAND_ALLOW_ADDRESSES=127.0.0.1` on the server) | every push |
| `e2e:customisation`, `e2e:preferences`, `e2e:safety`, `e2e:dropzone` | controls and resets, persistence, confirmations and save failure, drag and drop | every push |
| `e2e:render-all` | every element in its card and full screen, timed from pixels | nightly, 8 shards |
| `e2e:preview-states` | one fixture per registry failure shape | by hand |
| `e2e:elements` | the registry browser, against a fixture index | by hand |
| `audit:originals` | every original renders and moves, in both motion modes | by hand |
| `audit:grid` | fling-scrolling the whole grid, cards that never show | by hand |

The stand-in registry, `node scripts/mock-registry.mjs <port> [--any|--healthy]`, with
`DP_REGISTRY_BASE=http://127.0.0.1:<port>` on the server, makes registry checks
independent of the five real hosts. `--healthy` renders every item, so anything slow or
empty is this app's fault.

## Environment notes

- In sandboxes without general internet, the five registries and esm.sh are
  unreachable; `raw.githubusercontent.com` and `registry.npmjs.org` have been reachable.
  Check with `curl -s -o /dev/null -w '%{http_code}' <url>` rather than assuming.
- Chromium for Playwright may be preinstalled; never `playwright install` where
  `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` is set. For WebGL in headless Chromium use
  `--enable-unsafe-swiftshader --use-gl=angle --use-angle=swiftshader`, but leave it off
  for long runs: after a few hundred frames, screenshots intermittently capture blank —
  a harness artifact, not a product bug.
- Measured in Chromium: a sandboxed card frame clipped out of the grid's scroll
  container gets no requestAnimationFrame callbacks, and hidden tabs stop them — which is
  why there is no in-document pause for off-screen cards.
