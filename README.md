# Design Playground

The visual configuration layer for the website-delivery engine. It turns client brand
inputs and design decisions into a structured, machine-readable design specification
that `web-stack-init` and Claude Code can consume.

Explore visual effects, compose a sample website, and export a design handoff. The bundle includes runnable original effects and a review page; it is not a production application.

How the code is arranged, which parts are easy to break, and the full test map are in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

```
business.md → assets → Design Playground → live preview → approval → /design/*.json → web-stack-init
```

## Workflow

1. Explore without a project, create one, or resume a saved project.
2. Optionally upload brand assets — or read them off the client's current website — and choose a website template, including a blank canvas.
3. Choose colours, typography and a cursor, including a custom image and the brand's own uploaded typeface. Decide whether the site has a dark theme. Colours and typography can remain undecided.
4. Pick section variants and drag the section order, or use the accessible move buttons. Any section can be omitted.
5. Browse 103 interactive original effects with source/runtime labels, expanded previews, notes and placement, alongside every indexed registry component in the same grid. Registry components are compiled and previewed on approach; both kinds of selection record a note and a placement.
6. Visualise the composition at desktop, tablet or mobile sizes, light, dark or side by side, with a contrast lens that outlines failing text in place. Return to editing as often as needed.
7. Download the ZIP handoff, a standalone review page, or a restorable project backup.

Basic/Advanced modes, history, undo/redo, snapshots, saved templates, overrides, command search, the style guide and component gallery remain available.

## Preview coverage

Original effects run in isolated iframe documents in the library, sample and export. Motion/GSAP page recipes run in the live sample. Registry components are compiled from their published source on the server (`/api/element-preview`) and rendered in sandboxed frames — in the library, full screen, and the live sample page; the exported review page shows their install commands instead, since their code is installed, not shipped. The standalone page preserves the composed appearance and original effects; React-driven page recipes and custom cursors require integration in the target application.

Each effect on the review page carries a plain-language note for the client — what it is, how it behaves, and what visitors who ask for less motion (or whose device lacks WebGL) will see.

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

```bash
npm run verify       # typecheck + unit tests + production build
npm run e2e          # browser smoke test (needs a server running)
npm run e2e:export   # a real ZIP, unpacked and opened from file://
```

The browser checks all run against a production server (`npm run build && npx next start
-p 3100`) and share their set-up through `scripts/lib/studio.mjs`. CI runs `e2e`,
`e2e:library`, `e2e:export`, `e2e:studio`, `e2e:fonts`, `e2e:brand-url`,
`e2e:customisation`, `e2e:preferences`, `e2e:safety` and `e2e:dropzone` on every push.
`e2e:brand-url` serves its own fixture site on 127.0.0.1, so its server needs
`DP_BRAND_ALLOW_ADDRESSES=127.0.0.1` (see "Reading a brand from a website" below).

The Elements browser regression check uses a deterministic fixture instead of depending on changing upstream registry content:

```bash
npm run fixture:registry -- /tmp/fixture-index.json
DP_REGISTRY_SNAPSHOT=/tmp/fixture-index.json npm run dev
npm run e2e:elements
```

Every element, in its card and full screen, timed. Opens each one in the real app and
fails any view that never paints, paints only after 3 seconds, opens smaller than the
window, or will not close on Escape. "Paints" is decided from pixels, not status:

```bash
npm run build && npx next start -p 3100                 # against the live registries
npm run e2e:render-all
```

Offline, or to check the pipeline rather than third-party components, point it at the
stand-in registry — `--healthy` makes every item render, so anything slow or empty is
this app's fault:

```bash
node scripts/mock-registry.mjs 4599 --healthy
npm run build && DP_REGISTRY_BASE=http://127.0.0.1:4599 npx next start -p 3100
STRICT=1 npm run e2e:render-all
```

A full pass takes over an hour; `FILTER` (a regex on element ids) and `SHARD=i/n`
narrow it. `.github/workflows/render-all.yml` runs it nightly as eight shards against
`--healthy`, after warming every registry preview (`WARM=all npm run warm:previews`) so
it measures what a running deployment serves rather than first-ever compiles. `npm run audit:originals` renders the authored elements outside the app, in
both motion modes, in a couple of minutes.

## Export contract

Export writes the design specification, a human-readable brief, the composed review page, and selected effect files:

```
design/
  design.tokens.json     global visual values
  site.recipe.json       structural and interaction decisions
  asset-manifest.json    company assets, by reference
  globals.css            generated from the tokens
  assets/                the referenced binaries
design-playground-selection.json   chosen registry components, if any
THIRD-PARTY-LICENCES.md            their publishers' licences, if any were chosen
elements/<id>.html                 each chosen original effect, runnable
elements/engines/<bundle>.js       engine runtimes, once each, shared by the effects
preview.html                       the composed review page
```

The selection file sits at the root rather than under `design/` because that is where
`web-stack-init`'s Phase 2 looks for it. It is omitted entirely when nothing is
selected: its presence tells Phase 2 to skip asking where components should come from,
so shipping an empty one would suppress the question while answering nothing.

Two delivery paths: a ZIP download that works anywhere, and a "save to project folder"
that writes straight into the client project via the File System Access API.

### Elements only

The export dialog offers a second scope. "Elements only" ships the effects on their own:

```
elements/
  README.md              what each file is, where it was meant to go, its note
  <element-id>.html      one standalone effect per file
  engines/<bundle>.js    each engine runtime they use, once, shared by every file
  ENGINE-LICENSES.txt    if any of them use a runtime
design-playground-selection.json   install commands, if a registry component was picked
components.registries.json
THIRD-PARTY-LICENCES.md
```

No tokens, recipe, asset manifest, `globals.css` or sample page. Those are the parts an
element does not need: the project's accent is already baked into each document, and
any engine runtime it uses ships once in `engines/` and is loaded by relative path, so
the file opens from `file://` with no server and no network. (The review page is the
exception: its sandboxed frames cannot load `file://` at all, so it carries each runtime
once inside itself and hands it to its frames on load.) Registry picks have no source to ship, so they travel as
the same verified install commands the full export uses.

Validation is scoped to match. An elements-only export is not blocked by a schema error
in a document it does not carry, but it is refused outright when nothing is selected,
rather than delivering an empty folder.

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

The visual collection contains authored CSS/JavaScript effects, credited as Playground Originals. Each has an interactive preview and exports its runnable document. The registry browser additionally indexes Bklit, KokonutUI, Sora UI, Componentry and React Bits. Choosing a registry item records its source, install command and intended-use note. These third-party selections export installation references rather than vendored source.

**The index includes a verified snapshot.** It contains 436 entries fetched from all five published registries on 22 September 2026. Refresh retrieves current metadata; failed sources retain their last known entries. No component names or install commands are invented.

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

**Routing category is per source; browsing category is derived.** Ownership is defined
at the source level upstream, and the `RoutingCategory` carried into the export keeps
that. Per-source is the wrong axis for *browsing*, though — it put every React Bits entry
under one heading and left "Hover effects" showing three, while text animations from four
registries sat in four buckets. The grid therefore groups by a derived facet computed
from published metadata, matching name and title before description and falling back to
the source when nothing is decisive.

**Engines are toggles, not search results.** Motion, GSAP, Lenis and Vanta are npm
packages with no registry to browse — they are turned on once for the whole project. A
motion binding that needs a switched-off engine blocks the export, since that recipe
could not run.

**Borrowed designs are credited as borrowed.** Two of the authored sets come from
published libraries rather than from here, and they are credited differently because the
relationships differ. The eight ShaderGradient cards run a WebGL runtime written for this
project from the technique ShaderGradient publishes — installing the library itself would
pull in React Three Fiber and a `three` upgrade that breaks the four working Vanta cards
— so they name ShaderGradient as the source and WebGL as the runtime, in two separate
fields that must not collapse into one. The eight cult-ui cards are ports: cult-ui's
React components rebuilt as plain documents, shown as "cult-ui · Playground port" and
linked to their docs. Neither set ships the library it credits, and neither is presented
as a Playground Original.

**Preview coverage is explicit.** Every original effect has a live visualiser, and every registry entry a compiled one; a card that cannot render says why rather than showing a blank tile. Hooks and utilities, which have nothing to render, are hidden from the grid unless asked for (a search or their own type still finds them).

**The library is keyboard-navigable and linkable.** The grid is one tab stop: arrow keys move between cards, Enter opens one full screen, Space adds it, and ← → step through the results in full screen. The view — search, filters, and the element open full screen — lives in the URL, so a link reproduces it and Back closes a full-screen view.

**Registry licences are recorded per publisher**, in `src/registry/licences.ts`, each read from the publisher's own licence file with the date it was read. Bklit UI and KokonutUI are MIT; React Bits is MIT + Commons Clause (fine inside a client's site, not for reselling the components). Sora UI and Componentry state no licence anywhere that could be found — recorded as unknown, not guessed — and a pick from either exports with a warning to confirm terms with the publisher.

**Reading a brand from a website.** On Brand assets, a client's current site can be read for its colours, typefaces and logo (`/api/brand-from-url`); each is offered, never applied until chosen. The server fetch refuses anything that is not the public internet, checking the address each socket connects to rather than the name beforehand. `DP_BRAND_ALLOW_ADDRESSES` exempts named addresses for tests; never set it on a deployment.

**Uploaded fonts carry their licence.** A typeface is refused if it will not load as a real font, and cannot be added without a licence. Tokens record which asset files a custom face uses, so `globals.css` still comes from the tokens alone, now with its `@font-face`.

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
multi-framework export, full React application export, freeform page building, CMS,
real-time collaboration, and the public lead-generation playground (§15A).

The newer playground flow takes precedence over the older spec where it asks for previews and section reordering. Remaining work includes write access back to registries.

## Known gaps

The three gaps this section used to record — no keyboard navigation in the element
grid, hooks and utilities occupying preview tiles, and no licence information for
registry components — are closed (see "Elements" above). What remains:

**Two registries state no licence.** Sora UI and Componentry publish no licence that
could be found. Picks from them export with a warning; the terms need confirming with
the publishers, and `src/registry/licences.ts` updating when they are.

**Licences are read by hand.** The weekly refresh updates the registry index but not the
licences, which are checked against each publisher's licence file with a date recorded.
Re-read them when that date ages.

The index's open questions are still open, and each would change its shape rather than
just add to it: whether React Bits' JS/CSS variants are ever wanted here (if never, they
should be dropped from the index rather than modelled), whether Componentry belongs in
search results at all or in a separate inspiration section, and who owns the weekly
refresh PRs.
