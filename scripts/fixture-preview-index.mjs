import { writeFileSync } from "node:fs";

/**
 * A registry index whose entries are the preview runtime's failure shapes.
 *
 * Pairs with scripts/mock-registry.mjs: each name here resolves to a fixture that
 * reproduces one way a preview used to go wrong. Written to a path given on the command
 * line, never over the committed snapshot.
 */
const target = process.argv[2];
if (!target) {
  console.error("usage: node scripts/fixture-preview-index.mjs <output-path>");
  process.exit(1);
}
if (target.includes("data/registry-snapshot.json")) {
  console.error("refusing to overwrite the committed snapshot with fixture data");
  process.exit(1);
}

const now = new Date().toISOString();
const names = ["visible", "zero-area", "slow", "later", "latest", "broken", "helper", "empty", "missing", "never"];
const elements = names.map((name) => ({
  id: `bklit:${name}`, name,
  title: name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  description: `Fixture: ${name}`,
  source: "bklit", category: "charts",
  installCommand: `npx shadcn@latest add @bklit/${name}`,
  npmDependencies: [], registryDependencies: [], availableVariants: [],
  engineDependency: [], referenceOnly: false, lastVerified: now,
}));

writeFileSync(target, `${JSON.stringify({
  schema: "dp-registry-index/v1",
  fetchedAt: now,
  sources: [{ id: "bklit", ok: true, itemCount: elements.length, skipped: 0, lastVerified: now }],
  elements,
}, null, 2)}\n`);
console.log(`wrote ${elements.length} preview fixtures to ${target}`);
