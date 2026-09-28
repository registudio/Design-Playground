import { build } from 'esbuild';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { ENGINES } from './engine-demos.mjs';

const require = createRequire(import.meta.url);

/**
 * Bundles one runtime per engine, carrying every demo that engine drives.
 *
 * One bundle per engine rather than one per demo, because the library dominates the
 * size — Three.js alone is ~600 KB, so four Vanta demos sharing a bundle cost a
 * fraction of four bundles each carrying their own copy, and the gallery fetches it
 * once for every card. Each demo is guarded on its own root element, so a document
 * containing one demo runs only that one.
 *
 * Each demo is wrapped in its own try/catch: a bundle is shared, so an exception from
 * one demo must not take the rest of the engine's cards down with it.
 *
 * The exception is an engine marked `split` (Vanta): there each effect is a different
 * file of the library, so a shared bundle made every card download all four. Those
 * build one small bundle per demo, named after the demo, plus one `<engine>-three.js`
 * holding the part of Three.js the demos use, published as `window.DP_THREE`. A card
 * loads the shared file then its own; the browser caches the shared one once for every
 * card, so four Vanta cards cost one Three.js and four effects rather than four of both.
 */
// Emptied first, so a bundle that stops being built (vanta.js, once Vanta went split)
// cannot linger and be served to a document that still names it.
await rm('public/engine-demos', { recursive: true, force: true });
await mkdir('public/engine-demos', { recursive: true });

/**
 * `import { A, B } from 'three'; window.DP_THREE = { A, B };` for exactly the Three.js
 * exports the given files reference.
 *
 * Vanta's effects are prebuilt and take Three.js as an object, so esbuild cannot shake
 * a namespace import — every card carried all of it. A minified Vanta file still names
 * each class it uses as a property (`h.WebGLRenderer`), so every capitalised property
 * access that is also a Three.js export is kept. Over-matching only keeps a class that
 * was not needed; there is no way for it to drop one that was.
 */
async function threeSubset(imports) {
  const exported = new Set(Object.keys(await import('three')));
  const used = new Set();
  for (const [, specifier] of imports.matchAll(/from\s+'([^']+)'/g)) {
    const source = await readFile(require.resolve(specifier), 'utf8');
    for (const [, name] of source.matchAll(/\.([A-Z][A-Za-z0-9_]*)\b/g)) if (exported.has(name)) used.add(name);
  }
  const names = [...used].sort().join(',');
  return `import {${names}} from 'three';\nwindow.DP_THREE={${names}};`;
}

const wrap = (demo, helpers) => `try{(()=>{
const root=document.querySelector(${JSON.stringify(demo.root)});
if(!root)return;
${helpers}
${demo.source}
})()}catch(error){console.error(${JSON.stringify(demo.id)},error)}`;

const bundle = (contents, name) => build({
  stdin: { contents, resolveDir: process.cwd() },
  bundle: true,
  format: 'iife',
  minify: true,
  legalComments: 'eof',
  outfile: `public/engine-demos/${name}.js`,
});

for (const [engine, { imports, demos, helpers = '', split, threeSubset: subset }] of Object.entries(ENGINES)) {
  if (!split) {
    await bundle(`${imports}\n${demos.map((demo) => wrap(demo, helpers)).join('\n')}`, engine);
    continue;
  }
  if (subset) await bundle(await threeSubset(demos.map((demo) => demo.imports ?? '').join('\n')), `${engine}-three`);
  for (const demo of demos) {
    const three = subset ? 'const THREE=window.DP_THREE;' : '';
    await bundle(`${imports}\n${demo.imports ?? ''}\n${three}\n${wrap(demo, helpers)}`, demo.id);
  }
}

const notices = await Promise.all(['motion', 'lenis', 'vanta', 'three'].map(async (name) => {
  for (const filename of ['LICENSE', 'LICENSE.md']) {
    try { return `## ${name}\n\n${await readFile(`node_modules/${name}/${filename}`, 'utf8')}`; } catch {}
  }
  throw new Error(`Missing license for ${name}`);
}));

/**
 * The shader bundle installs nothing, so there is no node_modules licence to copy — but
 * it does carry glsl-noise's Perlin function verbatim and reproduces ShaderGradient's
 * technique, and both deserve naming. Written by hand for exactly that reason.
 */
const borrowed = [
  `## glsl-noise (MIT)

Classic Perlin 3D noise in scripts/shader-cnoise.glsl is taken unmodified from
https://github.com/hughsk/glsl-noise — MIT licensed, (c) Hugh Kennedy, after
Stefan Gustavson and Ashima Arts.`,
  `## ShaderGradient (MIT)

The gradients in the shader bundle follow the technique published by ShaderGradient,
https://shadergradient.co/ — MIT licensed, (c) ruucm. No ShaderGradient code ships
here; the runtime is this project's own WebGL, see scripts/shader-runtime.mjs.`,
];
await writeFile('public/engine-demos/LICENSES.txt', [...notices, ...borrowed].join('\n\n'));
