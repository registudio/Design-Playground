# Design Playground

The visual configuration layer for the website-delivery engine. It turns client brand
inputs and design decisions into a structured, machine-readable design specification
that `web-stack-init` and Claude Code can consume.

It is **not** a website builder. It exports design *intent*, not generated code.

```
business.md → assets → Design Playground → live preview → approval → /design/*.json → web-stack-init
```

## Status

The internal MVP vertical slice is built and verified end to end: upload a logo,
extract its palette, edit Foundation, preview live, export, and compile the result
with Tailwind v4.

| Area | State |
|---|---|
| Schemas, provenance, validation | Complete |
| Colour engine (OKLCH, contrast, extraction) | Complete |
| Persistence, undo/redo, project files | Complete |
| Preview (System / Components / Sample Page) | Complete |
| Foundation, Components, Animations panels | Complete |
| Elements: registry index, browser, selection export | Complete; ships with an empty index |
| Deterministic export + globals.css | Complete |
| Presets | 5 authored, values need design review |
| Motion runtime (Motion/GSAP in preview) | Recipes selectable; runtime not yet wired |
| Custom font upload | Schema and validation ready; upload UI pending |

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

```bash
npm run verify       # typecheck + unit tests + production build
npm run e2e          # browser smoke test (needs a server running)
npm run e2e:export   # verifies the exported bundle end to end
```

The Elements browser check needs a populated index, which the committed snapshot
deliberately is not (see **Elements** below), so it runs against a fixture:

```bash
npm run fixture:registry -- /tmp/fixture-index.json
DP_REGISTRY_SNAPSHOT=/tmp/fixture-index.json npm run dev
npm run e2e:elements
```

## Export contract

Export writes a `design/` folder, plus the element selections at the project root:

```
design/
  design.tokens.json     global visual values
  site.recipe.json       structural and interaction decisions
  asset-manifest.json    company assets, by reference
  globals.css            generated from the tokens
  assets/                the referenced binaries
design-playground-selection.json   chosen registry components, if any
```

The selection file sits at the root rather than under `design/` because that is where
`web-stack-init`'s Phase 2 looks for it. It is omitted entirely when nothing is
selected: its presence tells Phase 2 to skip asking where components should come from,
so shipping an empty one would suppress the question while answering nothing.

Two delivery paths: a ZIP download that works anywhere, and a "save to project folder"
that writes straight into the client project via the File System Access API.

### Why `globals.css` is in the export

It is generated from `design.tokens.json` alone. That makes it a continuous proof that
the tokens file is a sufficient contract for the build step — if the stylesheet cannot
be produced from the tokens, the export is not carrying enough information. The
generated CSS is verified to compile with Tailwind v4.

### Determinism

Identical configurations produce byte-identical files. Enforced by sorted keys at every
depth, fixed numeric precision, pinned archive timestamps, and a guard that rejects
time-varying fields. Covered by tests.

## Design decisions worth knowing

**The preview is a same-origin iframe, not an inline React tree.** That isolation does
four jobs: project tokens cannot collide with the playground's own UI variables; device
modes get *real* media queries rather than a resized div that still matches desktop
breakpoints; a custom cursor stays inside the preview; and GSAP ScrollTrigger binds to
the preview's own scroll container.

**Token changes never remount the preview.** They are pushed as CSS and applied to a
single `<style>` element, so dragging a slider stays smooth and running animations keep
their state. Structural changes send full state and re-render.

**Project tokens are namespaced `--dp-*`.** The playground's chrome uses its own
separate variables, so the two can never interfere.

**Every value carries provenance** (`default` / `extracted` / `preset` / `user` /
`imported`). This is what makes reset-to-suggestion work, lets the UI show what a preset
changed, and leaves room for importing a public submission later without a retrofit.

**SVG logos are parsed, not sampled.** Reading `fill`/`stroke` attributes returns the
designer's exact brand colours. Raster quantization is the fallback, not the default.

**Undo granularity is deliberate.** A slider drag coalesces into one history entry; a
preset application collapses to one even though it rewrites most of the document.

**Motion and GSAP conflicts are checked, not just documented.** Each recipe declares the
properties it animates, and export fails if two engines would drive the same one.

## Elements

Elements are real components from the five shadcn-compatible registries this stack
installs from — Bklit, KokonutUI, Sora UI, Componentry and React Bits. Choosing one
records an install command, not code: the playground still exports intent.

**The index ships empty, on purpose.** Registry contents move week to week (Sora UI was
observed going 139 items to 69 inside one week), so a hand-written entry produces an
install command that fails when someone runs it. A wrong entry is worse than a missing
one. The first refresh fetches the real ones.

**Refresh is server-side.** Registry hosts do not reliably send permissive CORS headers,
and fetching from the browser would also expose the whole index to the page. The route
handler at `/api/registry` does it instead, which is one of the advantages of this being
a real app rather than a static page.

**Staleness is surfaced, never hidden.** The browser says how old the index is, and
names any source whose last refresh failed — those keep their previous entries rather
than vanishing, and are correctly reported as the stale ones.

**React Bits' four published variants collapse to one row.** `ClickSpark-JS-CSS` /
`-JS-TW` / `-TS-CSS` / `-TS-TW` are one component published four times; left alone that
source contributes roughly 820 near-duplicate rows for about 205 real components. The
row keys off the base name, so a selection survives a variant being dropped upstream,
while the install command targets the concrete published item. This scaffold is always
TypeScript + Tailwind, so `-TS-TW` is the default.

**Category is assigned per source, never per item.** Ownership is defined at the source
level upstream; there is no per-component classifier to borrow, and inventing one would
be a larger and much shakier project than this.

**Engines are toggles, not search results.** Motion, GSAP, Lenis and Vanta are npm
packages with no registry to browse — they are turned on once for the whole project. A
motion binding that needs a switched-off engine blocks the export, since that recipe
could not run.

**There is no per-component visual preview.** No registry publishes a preview image, so
a thumbnail grid would mean executing arbitrary third-party React per card. Each card
links to its source's own docs instead.

## Deviations from the build specification

The spec's §15.1 example emits flat semantic colours and single geometry values, but
§10.2–§10.6 require primitive tonal scales, an optional dark theme, a nine-step type
scale and radius/spacing/shadow scales. `globals.css` cannot be generated from the
former. The implemented schema is the reconciled superset and remains a strict superset
of the spec's example.

The spec's `asset-manifest.json` uses bare filenames (`logo.svg`) with no stated root,
which a consumer cannot resolve. Paths here are pinned relative to `design/assets`, and
each entry carries mime type, intrinsic dimensions and a content hash.

## Not yet built

Out of scope for the internal MVP per §15.8, and deliberately absent: Figma integration,
multi-framework export, full React code export, drag-and-drop page building, CMS,
real-time collaboration, and the public lead-generation playground (§15A).

From the Elements spec's own non-goals: per-component preview rendering, write access
back to the registries, indexing the engines or Codrops as browsable items, and
per-component category inference.

Its open questions are still open, and each would change the shape of the index rather
than just add to it: whether React Bits' JS/CSS variants are ever wanted here (if never,
they should be dropped from the index rather than modelled), whether Componentry belongs
in search results at all or in a separate inspiration section, and who refreshes the
snapshot and how often.
