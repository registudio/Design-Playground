import { describe, expect, it } from "vitest";
import { createProject } from "@/schema/defaults";
import { DesignProject } from "@/schema/project";
import { pageSections, moveSection } from "@/schema/composition";
import { buildStaticPage } from "@/export/staticPage";
import { buildExport, toZip } from "@/export/bundle";
import { unzipSync, strFromU8 } from "fflate";
import { commit, emptyHistory, undo, redo } from "@/store/history";
import { ELEMENTS, elementDocument, elementOrigin } from "@/elements/catalogue";
import { toHex } from "@/color/oklch";
import { resolveSemantic } from "@/color/semantic";

describe("composed projects", () => {
  it("opens legacy projects with the original order, but respects an explicitly empty page", () => {
    const project = DesignProject.parse(createProject("Legacy"));
    expect(pageSections(project.recipe).slice(0, 3)).toEqual(["navbar", "hero", "features"]);
    project.recipe.sectionOrder = [];
    const html = buildStaticPage(project, "");
    expect(html).not.toContain('class="dp-hero');
    expect(html).toContain("Your blank canvas");
  });
  it("preserves reordered sections, notes and effects across schema, history, HTML and ZIP", () => {
    const original = createProject("Compose");
    original.recipe.sectionOrder = ["hero", "socialProof", "footer"];
    original.recipe.components.socialProof = "testimonial-grid";
    const change = commit(original, emptyHistory(), "Compose page", d => {
      d.recipe.sectionOrder = moveSection(pageSections(d.recipe), "socialProof", "hero");
      d.recipe.elements = [{ id: "aurora", placement: "hero", note: "Keep it calm." }];
    });
    const back = undo(change.state, change.history);
    expect(pageSections(back.state.recipe)).toEqual(["hero", "socialProof", "footer"]);
    const restored = DesignProject.parse(redo(back.state, back.history).state);
    const html = buildStaticPage(restored, "");
    expect(html.indexOf("dp-proof-testimonial-grid")).toBeLessThan(html.indexOf("dp-hero-split"));
    expect(html.indexOf('data-element="aurora"')).toBeGreaterThan(html.indexOf("dp-hero-split"));
    expect(html).not.toContain("dp-features-grid");
    const zip = unzipSync(toZip(buildExport(restored).files));
    expect(strFromU8(zip["README.md"]!)).toContain("Keep it calm.");
    expect(strFromU8(zip["README.md"]!)).toContain("Playground Originals");
    expect(strFromU8(zip["elements/aurora.html"]!)).toContain("@keyframes drift");
    expect(strFromU8(zip["elements/aurora.html"]!)).toContain(`--accent:${toHex(resolveSemantic(restored.tokens.colors, "light", "primary"))}`);
    expect(JSON.parse(strFromU8(zip["design/site.recipe.json"]!)).sectionOrder).toEqual(["socialProof", "hero", "footer"]);
  });
  it("keeps effects visible at the end if their target section is removed", () => {
    const p = createProject("Removed target");
    p.recipe.sectionOrder = [];
    p.recipe.elements = [{ id: "stack", placement: "hero", note: "" }];
    expect(buildStaticPage(p, "")).toContain('data-element="stack"');
  });
  it("includes uploaded image references in the standalone review page", () => {
    const p = createProject("Assets");
    p.assets.logo.primary = "brand.png";
    p.assets.images = [
      { file: "brand.png", kind: "logo", mime: "image/png", bytes: 1, hash: "logo" },
      { file: "hero.png", kind: "hero-image", mime: "image/png", bytes: 1, hash: "hero" },
    ];
    const html = buildStaticPage(p, "", { "brand.png": "data:image/png;base64,bG9nbw==", "hero.png": "design/assets/hero.png" });
    expect(html).toContain('src="data:image/png;base64,bG9nbw=="');
    expect(html).toContain("design/assets/hero.png");
  });
  it("rejects duplicate sections and non-image cursor payloads", () => {
    const p = createProject("Invalid");
    p.recipe.sectionOrder = ["hero", "hero"];
    expect(DesignProject.safeParse(p).success).toBe(false);
    p.recipe.sectionOrder = [];
    p.recipe.cursorImage = "javascript:alert(1)";
    expect(DesignProject.safeParse(p).success).toBe(false);
  });
  it("exports every authored demo with honest origins and reduced-motion support", () => {
    for (const item of ELEMENTS) {
      expect(elementOrigin(item.id).name).toMatch(/Playground/);
      expect(elementDocument(item.id)).toContain("prefers-reduced-motion:reduce");
      expect(elementDocument(item.id)).toContain(item.html);
    }
    expect(elementDocument("unknown")).toBe("");
    expect(elementDocument("aurora", '</style><script>alert(1)</script>')).not.toContain("alert(1)");
  });
});
