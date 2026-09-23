import { createServer } from "node:http";

/**
 * A stand-in for the five published registries, for exercising the preview compile path.
 *
 * The runtime's interesting failures only happen when something is actually compiled and
 * mounted, and the real registries are third-party hosts that cannot be made to fail on
 * demand. These fixtures reproduce the shapes that were breaking in the gallery:
 * components that mount but paint nothing, components that never resolve, helpers with
 * no component at all, and items the registry does not publish.
 *
 *   node scripts/mock-registry.mjs 4599
 *   DP_REGISTRY_BASE=http://127.0.0.1:4599 npm run dev
 */
const port = Number(process.argv[2] ?? 4599);

const file = (path, content) => ({ path, content, type: "registry:component" });

/** A perfectly ordinary component. Should render and report ready. */
const visible = `
export default function Visible({ title }) {
  return <div style={{ padding: 24, background: "#22331a", color: "#dbeec0", borderRadius: 12, fontSize: 20 }}>{title ?? "Visible"}</div>;
}
`;

/**
 * Mounts, produces DOM, paints nothing: absolutely positioned against a parent with no
 * height. This is the "says Ready but shows nothing" case — childElementCount is 1, so a
 * status check counting children calls it ready while the card is blank.
 */
const zeroArea = `
export default function ZeroArea() {
  return <div style={{ position: "absolute", inset: 0 }}><span style={{ display: "block", width: 0, height: 0 }} /></div>;
}
`;

/** Renders only after a delay, so the card has to survive the wait. */
const slow = `
import * as React from "react";
export default function Slow() {
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => { const t = setTimeout(() => setShown(true), 1200); return () => clearTimeout(t); }, []);
  return shown ? <div style={{ padding: 24, background: "#243a17", color: "#cde8a6" }}>Arrived late</div> : null;
}
`;

/**
 * Paints only after the blank grace has run out, so the generated visual is laid over it
 * first. It must still take over and report ready when it arrives — the fallback is
 * provisional, not a verdict.
 */
const later = `
import * as React from "react";
export default function Later() {
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => { const t = setTimeout(() => setShown(true), 3200); return () => clearTimeout(t); }, []);
  return shown ? <div style={{ padding: 24, background: "#2b3d1d", color: "#d9f0b8" }}>Arrived after the grace</div> : null;
}
`;

/** Throws on mount. The error boundary should catch it and the card should say so. */
const broken = `
export default function Broken() { throw new Error("needs an application provider"); }
`;

/**
 * Paints only after the blank grace has run out, so the stand-in is laid over it first.
 * It must still take over and report ready when it arrives: the fallback is provisional,
 * not a verdict.
 */
const latest = `
import * as React from "react";
export default function Latest() {
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => { const t = setTimeout(() => setShown(true), 6500); return () => clearTimeout(t); }, []);
  return shown ? <div style={{ padding: 24, background: "#2b3d1d", color: "#d9f0b8" }}>Arrived after the stand-in</div> : null;
}
`;

/** A helper module with no component to render at all. */
const helper = `export function useThing() { return true; }`;

const ITEMS = {
  visible: { name: "visible", files: [file("components/visible.tsx", visible)] },
  "zero-area": { name: "zero-area", files: [file("components/zero-area.tsx", zeroArea)] },
  slow: { name: "slow", files: [file("components/slow.tsx", slow)] },
  later: { name: "later", files: [file("components/later.tsx", later)] },
  broken: { name: "broken", files: [file("components/broken.tsx", broken)] },
  latest: { name: "latest", files: [file("components/latest.tsx", latest)] },
  helper: { name: "helper", files: [file("hooks/use-thing.ts", helper)] },
  empty: { name: "empty", files: [] },
};

/**
 * --any: answer for every item name, not just the fixtures above.
 *
 * The gallery's failures are about scale as much as about any one component — a page of
 * cards competing for a handful of slots while the user scrolls. Reproducing that needs
 * every real item in the snapshot to resolve to *something*, with realistic latency and
 * the same mix of misbehaviour the real registries produce. Each name maps to a stable
 * behaviour by hash, so a run is repeatable.
 *
 *   node scripts/mock-registry.mjs 4599 --any
 */
const ANY = process.argv.includes("--any");

const hash = (text) => { let h = 2166136261; for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };

function synthetic(item) {
  const h = hash(item), roll = h % 100, delay = 150 + (h >>> 8) % 1650;
  const hue = h % 360;
  const kind =
    roll < 80 ? "visible" : roll < 86 ? "zero-area" : roll < 91 ? "broken" : roll < 95 ? "slow" : roll < 98 ? "helper" : "never";
  const component =
    kind === "visible" ? `export default function Item() { return <div style={{ padding: 22, borderRadius: 14, background: "hsl(${hue} 45% 28%)", color: "#fff", fontSize: 18 }}>${item.replace(/[^\w -]/g, "")}</div>; }`
    : kind === "zero-area" ? zeroArea
    : kind === "broken" ? broken
    : kind === "slow" ? slow
    : helper;
  const path = kind === "helper" ? `hooks/${item}.ts` : `components/${item}.tsx`;
  return { kind, delay, body: { name: item, files: [file(path, component)] } };
}

const server = createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");
  const item = url.pathname.split("/").pop()?.replace(/\.json$/, "") ?? "";

  // "never" hangs, so a preview that never resolves can be reproduced deliberately.
  if (item === "never") return;

  if (ANY && !ITEMS[item]) {
    const made = synthetic(item);
    if (made.kind === "never") return;
    setTimeout(() => {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify(made.body));
    }, made.delay);
    return;
  }

  const found = ITEMS[item];
  if (!found) {
    response.writeHead(404, { "Content-Type": "text/plain" });
    response.end("not published");
    return;
  }
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify(found));
});

server.listen(port, "127.0.0.1", () => console.log(`mock registry on http://127.0.0.1:${port}`));
