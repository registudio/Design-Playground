# GradFlow, vendored

The gradients behind the `gradflow-*` elements, from https://github.com/meerbahadin/gradflow
at commit `756e55df1025b66e3fe3c72215cd249bda2ffc13` (2026-10-12), by Meer Bahadin
(https://gradflow.meerbahadin.dev).

- `shader.ts` is `src/core/shader.ts`: the one fragment shader that draws all twenty
  gradient types, switched by `u_type`.
- `gradients.ts` is `src/constants/gradients.ts`: the default config, the type numbers
  and the twenty-two presets.

Both are copied unchanged. GradFlow is MIT: its `package.json` and README say so, but
the repository carries no licence file, so `LICENSE` here is the standard MIT text with
the author named in that `package.json`.

Do not edit them here. To update, copy the new files over these and run
`node scripts/vendor-gradflow.mjs`, which writes `src/elements/gradflow-source.ts`.
A test fails if that module falls out of step with these files.

The renderer and its React hook (`src/core/renderer.ts`, `src/hooks/useWebGLRenderer.ts`)
are not vendored: `src/elements/gradflow-elements.ts` rebuilds them as plain script,
blends and all, because an element document has no React to run the hook in.
