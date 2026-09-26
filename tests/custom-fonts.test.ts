import { describe, expect, it } from "vitest";
import { createProject } from "@/schema/defaults";
import { DesignTokens } from "@/schema/tokens";
import { fontFaceCss, generateCss } from "@/export/css";
import { buildExport } from "@/export/bundle";
import { customFaces } from "@/fonts/use-custom-fonts";
import { guessFromFileName } from "@/components/FontUpload";

const withFont = () => {
  const project = createProject("Fonts");
  project.assets.fonts = [{ file: "fonts/acme-sans-700.woff2", kind: "font", mime: "font/woff2", bytes: 10, hash: "abc", family: "Acme Sans", weight: 700, style: "normal", license: "SIL OFL 1.1" }];
  project.tokens.typography.display = { ...project.tokens.typography.display, family: "Acme Sans", source: "custom", weights: [700], license: "SIL OFL 1.1", files: [{ file: "fonts/acme-sans-700.woff2", weight: 700, style: "normal" }] };
  return project;
};

describe("uploaded fonts", () => {
  it("declares each face in globals.css from the tokens alone, beside the assets", () => {
    const css = generateCss(withFont().tokens);
    expect(css).toContain('font-family: "Acme Sans";');
    expect(css).toContain('src: url("assets/fonts/acme-sans-700.woff2") format("woff2");');
    expect(css).toContain("font-weight: 700;");
    expect(css.indexOf("@font-face")).toBeLessThan(css.indexOf("@theme"));
  });

  it("leaves @font-face out where the faces are registered another way", () => {
    expect(generateCss(withFont().tokens, { fontUrl: () => null })).not.toContain("@font-face");
    expect(fontFaceCss(createProject("None").tokens)).toEqual([]);
  });

  it("ships the file and keeps the tokens valid", () => {
    const project = withFont();
    expect(DesignTokens.safeParse(project.tokens).success).toBe(true);
    const files = buildExport(project, new Map([["fonts/acme-sans-700.woff2", new Uint8Array([1, 2, 3])]])).files;
    expect(files.some(f => f.path === "design/assets/fonts/acme-sans-700.woff2")).toBe(true);
  });

  it("still blocks an export when an uploaded face has no licence", () => {
    const project = withFont();
    project.assets.fonts[0]!.license = " ";
    expect(buildExport(project).issues.some(i => i.severity === "error" && /no recorded licence/.test(i.message))).toBe(true);
  });

  it("joins each role's files to the stored bytes", () => {
    expect(customFaces(withFont())).toEqual([{ family: "Acme Sans", file: "fonts/acme-sans-700.woff2", hash: "abc", weight: 700, style: "normal" }]);
  });

  it("reads family, weight and style from a typical file name", () => {
    expect(guessFromFileName("AcmeSans-BoldItalic.woff2")).toEqual({ family: "Acme Sans", weight: 700, style: "italic" });
    expect(guessFromFileName("brand_grotesk-regular.ttf")).toEqual({ family: "brand grotesk", weight: 400, style: "normal" });
    expect(guessFromFileName("Display-SemiBold.otf").weight).toBe(600);
  });
});
