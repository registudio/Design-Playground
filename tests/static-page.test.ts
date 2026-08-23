import { describe, expect, it } from "vitest";
import { buildStaticPage } from "@/export/staticPage";
import { fixtureProject } from "./fixture";

const FAKE_PREVIEW_CSS = ".dp-page { color: var(--dp-color-foreground); }";

describe("buildStaticPage", () => {
  it("renders the Sample Page markup with no client-only motion attached", () => {
    const html = buildStaticPage(fixtureProject(), FAKE_PREVIEW_CSS);
    expect(html).toContain('class="dp-page dp-sample"');
    // Structural markers used by the live motion runtime should still be present as
    // static attributes (SSR renders the tree; only the client-side effect is absent).
    expect(html).toContain('data-animate="entrance"');
  });

  it("inlines the tokens CSS and the given preview stylesheet", () => {
    const html = buildStaticPage(fixtureProject(), FAKE_PREVIEW_CSS);
    expect(html).toContain("--dp-color-primary");
    expect(html).toContain(FAKE_PREVIEW_CSS);
  });

  it("forces light theme so the shared page never flips to the viewer's OS dark mode", () => {
    const html = buildStaticPage(fixtureProject(), FAKE_PREVIEW_CSS);
    expect(html).toContain('<html lang="en" class="light">');
  });

  it("escapes the project name and client in the title", () => {
    const project = fixtureProject();
    project.name = "<script>alert(1)</script>";
    const html = buildStaticPage(project, FAKE_PREVIEW_CSS);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("is a single self-contained document with no external script tags", () => {
    const html = buildStaticPage(fixtureProject(), FAKE_PREVIEW_CSS);
    expect(html).not.toMatch(/<script/i);
  });
});
