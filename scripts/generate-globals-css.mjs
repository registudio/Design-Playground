#!/usr/bin/env node
/**
 * Standalone globals.css generator.
 *
 * Reads a design.tokens.json and writes the Tailwind v4 theme block. This is the
 * same output the playground produces at export time, exposed as a CLI so
 * web-stack-init (or any consumer) can regenerate the stylesheet from the tokens file
 * without running the playground.
 *
 *   node scripts/generate-globals-css.mjs design/design.tokens.json > globals.css
 */
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const input = process.argv[2];
if (!input) {
  console.error("usage: generate-globals-css.mjs <design.tokens.json>");
  process.exit(1);
}

// The generator is TypeScript, so this defers to the project's own build output.
// Run via `npx tsx` or import from the built app; kept simple here on purpose.
const { generateCss } = await import("../src/export/css.ts").catch(() => {
  console.error(
    "Run this through a TypeScript loader, e.g.:\n" +
    "  npx tsx scripts/generate-globals-css.mjs design/design.tokens.json",
  );
  process.exit(1);
});

process.stdout.write(generateCss(JSON.parse(readFileSync(input, "utf8"))));
