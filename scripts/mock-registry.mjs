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

/** Throws on mount. The error boundary should catch it and the card should say so. */
const broken = `
export default function Broken() { throw new Error("needs an application provider"); }
`;

/** A helper module with no component to render at all. */
const helper = `export function useThing() { return true; }`;

const ITEMS = {
  visible: { name: "visible", files: [file("components/visible.tsx", visible)] },
  "zero-area": { name: "zero-area", files: [file("components/zero-area.tsx", zeroArea)] },
  slow: { name: "slow", files: [file("components/slow.tsx", slow)] },
  broken: { name: "broken", files: [file("components/broken.tsx", broken)] },
  helper: { name: "helper", files: [file("hooks/use-thing.ts", helper)] },
  empty: { name: "empty", files: [] },
};

const server = createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");
  const item = url.pathname.split("/").pop()?.replace(/\.json$/, "") ?? "";

  // "never" hangs, so a preview that never resolves can be reproduced deliberately.
  if (item === "never") return;

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
