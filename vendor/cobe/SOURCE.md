# cobe, vendored

The WebGL globe behind the Magic UI Globe port (`21st-globe`).

- `cobe.esm.js` is `dist/index.esm.js` from the npm package `cobe@0.6.5`
  (shasum `193c0fb38f23b3e9fc80fa64828ad95d58858c18`), https://github.com/shuding/cobe.
  MIT, Shu Ding; see `LICENSE-cobe`. 0.6.5 is what the component's `cobe@^0.6.4`
  resolves to.
- `phenomenon.mjs` is `dist/phenomenon.mjs` from `phenomenon@1.6.0`
  (shasum `7b5b7647d0b48152cc0846994da3d92e8f6da677`), the WebGL helper cobe imports.
  MIT, Colin van Eenige; see `LICENSE-phenomenon`.

Both are copied unchanged. Do not edit them here. To update, copy the new files over
these and run `node scripts/vendor-cobe.mjs`, which bundles them into
`src/elements/cobe-source.ts` with both licence notices at its head. A test fails if
that module falls out of step with these files.
