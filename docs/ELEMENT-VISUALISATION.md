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
3. React, React DOM, Motion, Framer Motion and GSAP resolve from the app's installed packages; other npm packages are fetched through `esm.sh` on the server and bundled into the result.
4. Imports made by remote npm modules remain remote URL imports during compilation, rather than being mistaken for missing registry files.

React and React DOM are pinned to one version and bundled into the same module. This avoids duplicate React instances and hook invariant failures. Keeping the common render and motion runtimes on local disk also removes CDN latency from the first preview. Tailwind utilities are extracted from the published source and compiled on the server; the iframe does not need a runtime Tailwind compiler.

The generated harness supplies representative text, images, collections, chart data, progress values, open states and no-op callbacks. Source and name based prop recipes cover charts, galleries, carousels, text effects, forms, overlays and loaders. A React error boundary swaps an unexpected runtime exception for an animated visual surface, so one component cannot blank its card or stop adjacent previews.

## Loading and optimisation

### 1. Proximity and search activation

An external iframe is created when its card comes within 320 px of the catalogue viewport. A search that narrows the result to eight or fewer entries activates those entries immediately. Offscreen previews retain their slot for only 750 ms, allowing the newly visible row to start within the three-second interaction budget.

### 2. Visible-grid concurrency budget

Up to 12 external previews may be live together. This covers a large three-column viewport and one approaching row, so visible cards do not remain stuck in a waiting poster. Additional near-viewport cards enter a FIFO queue. Iframes use eager loading once admitted because proximity has already performed the lazy-loading decision.

### 3. Shared downloads, memory, disk and browser caching

In-flight promises are shared at three levels. Simultaneous requests for one preview produce one compile, registry dependencies are fetched once across different cards, and uncommon npm modules are downloaded once across different bundles. The server keeps 96 compiled documents in memory, 640 registry item documents, 256 remote module documents and up to 400 compiled previews on disk. Browser responses remain fresh for one hour and may be reused during one day of stale revalidation. A compiler version is included in disk-cache keys so runtime changes invalidate old error documents.

### 4. Bounded catalogue DOM and teardown

Search results enter the DOM in batches of 36. At most four batches remain mounted, with measured spacers preserving scroll position for removed rows. A near-edge sentinel mounts the next batch before normal scrolling reaches a spacer, while separate far-edge sentinels handle direct Home, End and scrollbar jumps. Changing a filter returns the catalogue to its first row. When an offscreen preview passes its grace period, its iframe is removed, releasing its React root, observers, timers, animation loops and WebGL context.

The loading poster is itself visual: an animated orbit and waveform remain visible until the source iframe reports that it has loaded. No card shows its description as a substitute for a preview.

## Isolation

Registry code runs in an iframe with `sandbox="allow-scripts"`. The frame receives no same-origin access, forms, popups or top-level navigation. Its Content Security Policy denies connections and every unneeded resource class. Scripts and compiled styles are inline; images and fonts may use data URLs or HTTPS.

The route accepts only the five allow-listed registry sources and conservative component names. It cannot be used as a general URL fetcher. Closing script and style tags are escaped before generated code is inserted into the document.

## Attribution and export

Each card identifies its publishing library and inferred motion engine. Playground Originals can be exported as runnable HTML because their implementation belongs to this project. External elements retain their verified install command, concrete variant, dependencies, placement and user note; their third-party source is executed for preview and is not silently vendored into an export.

## Verification

### Precompile a starting collection

With the dev server or a deployment running, run `npm run warm:previews` (set `DP_PREVIEW_BASE` for a deployment). This compiles eight curated entry points with three workers into the existing disk cache. Run before directing traffic to the deployment. No popularity telemetry is collected; the shortlist can be replaced with measured popular IDs later.

### Preview state and queue priority

Cards show queued, rendering, ready, fallback or failed. The sandbox reports component mounting and fallback DOM using a message checked against the owning iframe window. Ready does not certify pixels or interaction correctness. Retry recompiles the preview. Queue priority is evaluated from current viewport distance, with narrow searches and pointer interest promoted. Leaving proximity immediately removes queued work; already active frames retain the short teardown grace. Compact selected previews use distinct queue identities so duplicate cards cannot steal one another's slots.

ZIP handoffs include `EXPORT-QUALITY.md`. Preview observations are session-local; unviewed elements are explicitly unobserved. Runtime cost is qualitative and dependency installation in the target repository is not verified.

Run the focused catalogue audit while the development server is active:

```bash
npm run audit:previews
```

The HTTP audit requests all registry entries and fails for error documents or generated replacement demos. Earlier HTTP-only results did not verify browser rendering; the previous claim of 427 source previews and nine helper demos must not be read as a visual pass. Use `npm run audit:render` for runtime status, errors, timings, and screenshots, then review those screenshots.

Run the complete project validation before release:

```bash
npm run verify
```

For visual QA, search for at least one item from each source, confirm the loading poster is replaced by a visual iframe, scroll far enough to exercise teardown and remounting, and check a WebGL or canvas item such as React Bits `ASCIIText`.

An earlier local BlurText sample measured 406 ms from search edit to poster removal and 389 ms for a direct compile. Those are historical single-item observations, not proof of correct rendering or a catalogue-wide three-second guarantee.

## Local engine demos and curated media (23 September)

Motion.dev, Lenis, and Vanta each have a Playground-authored demo using their actual runtime. `scripts/build-engine-demos.mjs` produces separate local bundles before development and production builds. Bundles load only in the relevant sandboxed demo frame and are embedded in ZIP/standalone HTML exports with license notices.

Nine curated carousel designs and seven gallery/media designs now have distinct browse categories. Existing registry entries are retained. Every card supports a viewport-sized expanded preview; background card runtimes pause while it is open. Phone filters start collapsed.

Read [QA fixes and verification limits](./QA-FIXES-2026-09-23.md) for remaining limitations and [future improvements](./FUTURE-IMPROVEMENTS.md) for the proposed next round.
