# Element visualisation runtime

This is the implementation contract for rendering the complete Elements catalogue. It covers the 54 authored Playground Originals and all 436 entries currently indexed from Bklit, KokonutUI, Sora UI, Componentry and React Bits.

## Rendering contract

Every catalogue card must contain a visual surface. Prose descriptions, dependency lists and compiler errors are not valid previews.

- Playground Originals run their authored HTML, CSS and JavaScript in a sandboxed `iframe[srcDoc]`.
- Visual registry components are fetched from their published registry, compiled and mounted as real React components.
- Registry dependencies are fetched recursively and combined with the item before compilation.
- Helper entries such as hooks and utilities receive an animated functional demonstration because they do not export a visual React component.
- If an upstream item is temporarily missing, its card receives the same visual demonstration rather than an error message.
- Source attribution remains visible on every card regardless of the rendering path.

The generated helper demonstration is a deliberate render type, not a textual failure state. It is currently used for nine of the 436 registry records. The other 427 records produce source-compiled preview documents.

## Runtime flow

```text
registry snapshot
      │
      ▼
catalogue card ── proximity observer or narrow search
      │
      ▼
12-slot live-preview queue
      │
      ▼
GET /api/element-preview?source=…&name=…
      │
      ├── resolve the concrete registry variant
      ├── fetch item and registry dependencies
      ├── select the primary TSX/JSX entry
      ├── resolve local files, aliases and npm packages
      ├── generate representative props
      ├── compile Tailwind utilities found in the source
      ├── bundle the component into one browser module
      └── return an isolated HTML document
                         │
                         ▼
                sandboxed iframe
```

React Bits records collapse four upstream variants into one catalogue entry. The preview requests the selected concrete variant, such as `BlurText-TS-TW`, rather than the collapsed display name. This prevents the registry endpoint from returning its HTML fallback page.

## Source compilation

`app/api/element-preview/route.ts` maintains an in-memory virtual filesystem for every requested item. It follows `registryDependencies` recursively, merges the published files, and prefers an entry filename matching the requested item. Storybook and test files are excluded from entry selection.

The esbuild resolver keeps four file families separate:

1. Published local source files resolve inside the virtual filesystem.
2. Missing project aliases resolve to lightweight shadcn, hook, icon or font adapters.
3. npm packages are fetched through `esm.sh` on the server and bundled into the result.
4. Imports made by remote npm modules remain remote URL imports during compilation, rather than being mistaken for missing registry files.

React and React DOM are pinned to one version and bundled into the same module. This avoids duplicate React instances and hook invariant failures. Tailwind utilities are extracted from the published source and compiled on the server; the iframe does not need a runtime Tailwind compiler.

The generated harness supplies representative text, images, collections, chart data, progress values, open states and no-op callbacks. Source and name based prop recipes cover charts, galleries, carousels, text effects, forms, overlays and loaders. A React error boundary swaps an unexpected runtime exception for an animated visual surface, so one component cannot blank its card or stop adjacent previews.

## Loading and optimisation

### 1. Proximity and search activation

An external iframe is created when its card comes within 700 px of the catalogue viewport. A search that narrows the result to eight or fewer entries activates those entries immediately. Offscreen previews remain mounted for a 12-second grace period to avoid recompiling during a small reverse scroll.

### 2. Visible-grid concurrency budget

Up to 12 external previews may be live together. This covers a large three-column viewport and one approaching row, so visible cards do not remain stuck in a waiting poster. Additional near-viewport cards enter a FIFO queue.

### 3. Memory, disk and browser caching

In-flight promises are shared, so simultaneous requests for one item produce one fetch and compile. The server keeps 96 compiled documents in memory and up to 400 on disk. Browser responses remain fresh for one hour and may be reused during one day of stale revalidation. A compiler version is included in disk-cache keys so runtime changes invalidate old error documents.

### 4. Bounded catalogue DOM and teardown

Search results enter the DOM in batches of 36. At most four batches remain mounted, with measured spacers preserving scroll position for removed rows. When an offscreen preview passes its grace period, its iframe is removed, releasing its React root, observers, timers, animation loops and WebGL context.

The loading poster is itself visual: an animated orbit and waveform remain visible until the source iframe reports that it has loaded. No card shows its description as a substitute for a preview.

## Isolation

Registry code runs in an iframe with `sandbox="allow-scripts"`. The frame receives no same-origin access, forms, popups or top-level navigation. Its Content Security Policy denies connections and every unneeded resource class. Scripts and compiled styles are inline; images and fonts may use data URLs or HTTPS.

The route accepts only the five allow-listed registry sources and conservative component names. It cannot be used as a general URL fetcher. Closing script and style tags are escaped before generated code is inserted into the document.

## Attribution and export

Each card identifies its publishing library and inferred motion engine. Playground Originals can be exported as runnable HTML because their implementation belongs to this project. External elements retain their verified install command, concrete variant, dependencies, placement and user note; their third-party source is executed for preview and is not silently vendored into an export.

## Verification

Run the focused catalogue audit while the development server is active:

```bash
npm run audit:previews
```

The audit requests all 436 registry entries and fails if any route returns an error document. It also reports how many entries use generated helper demonstrations. The current verified result is zero errors, 427 source-compiled previews and nine generated helper or unavailable-source demonstrations.

Run the complete project validation before release:

```bash
npm run verify
```

For visual QA, search for at least one item from each source, confirm the loading poster is replaced by a visual iframe, scroll far enough to exercise teardown and remounting, and check a WebGL or canvas item such as React Bits `ASCIIText`.
