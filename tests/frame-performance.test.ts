import { describe, expect, it } from "vitest";
import { GET } from "../app/api/element-preview/route";
import { elementDocument, ELEMENTS } from "@/elements/catalogue";
import { FRAME_ESCAPE, FRAME_HOST_SCRIPT } from "@/elements/frame-host";
import { onlyTokensChanged } from "@/components/PreviewFrame";
import { createProject } from "@/schema/defaults";
import { produce } from "immer";

const routeBody = async (query: string) =>
  (await GET(new Request(`http://localhost/api/element-preview?${query}`))).text();

describe("the frame host script", () => {
  it("rides along with registry documents", async () => {
    const html = await routeBody("source=react-bits&name=DefinitelyNotPublished");
    expect(html).toContain(FRAME_HOST_SCRIPT);
  });

  it("rides along with originals in the app, and stays out of exports", () => {
    const id = ELEMENTS[0]!.id;
    expect(elementDocument(id, undefined, { host: true })).toContain(FRAME_HOST_SCRIPT);
    expect(elementDocument(id)).not.toContain(FRAME_HOST_SCRIPT);
  });

  it("is valid script that forwards Escape and releases WebGL", () => {
    expect(() => new Function(FRAME_HOST_SCRIPT)).not.toThrow();
    expect(FRAME_HOST_SCRIPT).toContain(FRAME_ESCAPE);
    expect(FRAME_HOST_SCRIPT).toContain("WEBGL_lose_context");
    expect(FRAME_HOST_SCRIPT).toContain("pagehide");
  });
});

describe("the status reporter", () => {
  it("coalesces mutation reports and stops observing once settled", async () => {
    const html = await routeBody("source=react-bits&name=DefinitelyNotPublished");
    // Not one report per mutation: an animating component mutates every frame.
    expect(html).not.toContain("new MutationObserver(report)");
    expect(html).toContain("new MutationObserver(schedule)");
    expect(html).toContain("observer.disconnect()");
  });
});

describe("the preview frame's fast path", () => {
  const project = createProject("Test");

  it("treats a token edit as tokens only, provenance included", () => {
    const next = produce(project, (draft) => {
      draft.tokens.geometry.radius.md += 0.25;
      draft.provenance["tokens.geometry.radius.md"] = "user";
    });
    expect(onlyTokensChanged(project, next)).toBe(true);
  });

  it("treats anything else as structural", () => {
    const next = produce(project, (draft) => {
      draft.tokens.geometry.radius.md += 0.25;
      draft.name = "Renamed";
    });
    expect(onlyTokensChanged(project, next)).toBe(false);
    expect(onlyTokensChanged(project, project)).toBe(false);
  });
});
