import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { ENGINES } from './engine-demos.mjs';

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
 */
await mkdir('public/engine-demos', { recursive: true });

for (const [engine, { imports, demos, helpers = '' }] of Object.entries(ENGINES)) {
  const body = demos.map((demo) => `try{(()=>{
const root=document.querySelector(${JSON.stringify(demo.root)});
if(!root)return;
${helpers}
${demo.source}
})()}catch(error){console.error(${JSON.stringify(demo.id)},error)}`).join('\n');

  await build({
    stdin: { contents: `${imports}\n${body}`, resolveDir: process.cwd() },
    bundle: true,
    format: 'iife',
    minify: true,
    legalComments: 'eof',
    outfile: `public/engine-demos/${engine}.js`,
  });
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
