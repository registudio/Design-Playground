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

## Export contract

Export writes a `design/` folder:

```
design/
  design.tokens.json     global visual values
  site.recipe.json       structural and interaction decisions
  asset-manifest.json    company assets, by reference
  globals.css            generated from the tokens
  assets/                the referenced binaries
```

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
