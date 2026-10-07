# Ship Notes components, vendored

The six web components in this folder are copied unchanged from
https://github.com/aqualang89/shipnotes-components at commit
`3e950856c8e27e7835e6bc5af1b29b37a7debaee` (2026-10-04), `components/<name>/<name>.js`.
They are MIT licensed by Ship Notes; see `LICENSE`.

Do not edit them here. To update, copy the new files over these and run
`node scripts/vendor-shipnotes.mjs`, which minifies them into
`src/elements/shipnotes-sources.ts` with the licence notice at the head of each.
A test fails if that module falls out of step with these files.

Not vendored: the repository's `worlds/` and `motion/` pieces, which are full pages
carrying a 2 MB copy of Three.js, fonts and an audio score.
