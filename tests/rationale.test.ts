import { describe, expect, it } from "vitest";
import { buildRationale } from "@/export/rationale";
import { fixtureProject } from "./fixture";

describe("buildRationale", () => {
  it("includes the project name and client", () => {
    const html = buildRationale(fixtureProject());
    expect(html).toContain("Acme");
    expect(html).toContain("Acme Pte Ltd");
  });

  it("lists every semantic colour token with hex and oklch", () => {
    const html = buildRationale(fixtureProject());
    for (const token of ["primary", "secondary", "accent", "background", "surface", "foreground", "muted", "border"]) {
      expect(html).toContain(token);
    }
    expect(html).toMatch(/#[0-9a-f]{6}/i);
    expect(html).toContain("oklch(");
  });

  it("reports the accessibility section with a pass/fail table", () => {
    const html = buildRationale(fixtureProject());
    expect(html).toContain("Accessibility");
    expect(html).toContain("Body text on background");
  });

  it("escapes user-supplied project name and client to prevent HTML injection", () => {
    const project = fixtureProject();
    project.name = '<script>alert(1)</script>';
    project.client = "A & B \"Co\"";
    const html = buildRationale(project);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("A &amp; B &quot;Co&quot;");
  });

  it("is deterministic given the same project (aside from the generated date)", () => {
    const project = fixtureProject();
    const a = buildRationale(project).replace(/Generated \d{4}-\d{2}-\d{2}/, "Generated X");
    const b = buildRationale(project).replace(/Generated \d{4}-\d{2}-\d{2}/, "Generated X");
    expect(a).toBe(b);
  });

  it("describes the motion profile and density in plain language", () => {
    const project = fixtureProject();
    const html = buildRationale(project);
    expect(html).toContain("Motion:");
    expect(html).toContain("Density:");
  });
});
