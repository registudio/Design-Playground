import type { DesignProject } from "@/schema/project";
import { SEMANTIC_TOKENS, type SemanticToken } from "@/schema/primitives";
import { toHex, toCss } from "@/color/oklch";
import { resolveSemantic } from "@/color/semantic";
import { evaluatePair, type ContrastFinding } from "@/color/contrast";
import { escapeHtml } from "./htmlUtil";

/**
 * A client-facing rationale document (§Wave D Features-4): a standalone HTML file
 * explaining *why* the design looks the way it does — palette, typography, motion,
 * and an accessibility pass/fail table — in plain language a client can read without
 * opening the playground. Self-contained (inline styles, no external requests) so it
 * survives being emailed or dropped in a shared drive.
 */

const PAIRS: Array<[string, SemanticToken, SemanticToken, boolean]> = [
  ["Body text on background", "foreground", "background", false],
  ["Body text on surface", "foreground", "surface", false],
  ["Secondary text on background", "muted", "background", false],
  ["Secondary text on surface", "muted", "surface", false],
  ["Button label on primary", "background", "primary", false],
  ["Link on background", "primary", "background", false],
  ["Large headings on background", "foreground", "background", true],
];

const DENSITY_COPY: Record<string, string> = {
  compact: "Compact — tighter spacing, more content visible without scrolling.",
  balanced: "Balanced — the default rhythm, comfortable for most content types.",
  spacious: "Spacious — generous whitespace, a calmer and more premium feel.",
  editorial: "Editorial — wide measure and generous vertical rhythm, built for reading.",
};

const MOTION_COPY: Record<string, string> = {
  none: "No motion — every element appears instantly. Chosen for accessibility, performance, or a deliberately static brand.",
  subtle: "Subtle — small, quick transitions that acknowledge interaction without drawing attention to themselves.",
  professional: "Professional — measured, confident motion. Present but never showy.",
  expressive: "Expressive — motion is part of the brand voice: noticeable easing, stagger, and hover response.",
  cinematic: "Cinematic — the most pronounced motion profile, with longer durations and larger movement, for brands that want an immersive feel.",
};

function swatchRow(project: DesignProject, theme: "light" | "dark", token: SemanticToken): string {
  const color = resolveSemantic(project.tokens.colors, theme, token);
  const hex = toHex(color);
  return `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e5e5;">
        <span style="display:inline-block;width:20px;height:20px;border-radius:5px;border:1px solid #d8d8d8;background:${hex};vertical-align:middle;margin-right:10px;"></span>
        <span style="text-transform:capitalize;">${token}</span>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e5e5;font-family:ui-monospace,monospace;font-size:12px;color:#555;">${hex}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e5e5;font-family:ui-monospace,monospace;font-size:12px;color:#555;">${toCss(color)}</td>
    </tr>`;
}

function contrastRow(finding: ContrastFinding): string {
  const pass = finding.level !== "fail";
  const badge = pass
    ? `<span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#e6f4ea;color:#1e7a34;font-size:11px;font-weight:600;">${finding.level.toUpperCase()}</span>`
    : `<span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#fbe9e7;color:#b23c1f;font-size:11px;font-weight:600;">FAIL</span>`;
  return `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e5e5;">${escapeHtml(finding.label)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e5e5;">${badge}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e5e5;font-family:ui-monospace,monospace;font-size:12px;color:#555;">${finding.ratio}:1</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e5e5;font-family:ui-monospace,monospace;font-size:12px;color:#555;">${finding.apca}</td>
    </tr>`;
}

export function buildRationale(project: DesignProject): string {
  const light = SEMANTIC_TOKENS.map((t) => swatchRow(project, "light", t)).join("");
  const findings = PAIRS.map(([label, fg, bg, large]) =>
    evaluatePair(label, resolveSemantic(project.tokens.colors, "light", fg), resolveSemantic(project.tokens.colors, "light", bg), large),
  );
  const contrastRows = findings.map(contrastRow).join("");
  const failCount = findings.filter((f) => f.level === "fail").length;

  const type = project.tokens.typography;
  const motion = project.tokens.motion;
  const density = project.tokens.layout.density;
  const generatedAt = new Date().toISOString().slice(0, 10);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(project.name)} — Design rationale</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:48px 24px;background:#fafafa;color:#1a1a1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:760px;margin:0 auto;">
    <p style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#888;margin:0 0 6px;">Design rationale</p>
    <h1 style="font-size:28px;margin:0 0 6px;">${escapeHtml(project.name)}</h1>
    <p style="color:#666;font-size:14px;margin:0 0 40px;">
      ${project.client ? `Prepared for ${escapeHtml(project.client)} · ` : ""}Generated ${generatedAt}
    </p>

    <section style="margin-bottom:40px;">
      <h2 style="font-size:16px;margin:0 0 6px;">Colour palette</h2>
      <p style="color:#666;font-size:13px;line-height:1.6;margin:0 0 16px;">
        Every colour in this design is drawn from one of the semantic roles below, so the
        same palette reads consistently across every page and component.
      </p>
      <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.06);">
        <thead>
          <tr style="text-align:left;background:#f2f2f2;">
            <th style="padding:10px 12px;font-size:12px;color:#666;font-weight:600;">Role</th>
            <th style="padding:10px 12px;font-size:12px;color:#666;font-weight:600;">Hex</th>
            <th style="padding:10px 12px;font-size:12px;color:#666;font-weight:600;">OKLCH</th>
          </tr>
        </thead>
        <tbody>${light}</tbody>
      </table>
    </section>

    <section style="margin-bottom:40px;">
      <h2 style="font-size:16px;margin:0 0 6px;">Accessibility</h2>
      <p style="color:#666;font-size:13px;line-height:1.6;margin:0 0 16px;">
        ${failCount === 0
          ? "Every checked text/background pair on this page meets WCAG 2.1 AA contrast requirements."
          : `${failCount} of ${findings.length} checked pair${findings.length === 1 ? "" : "s"} fall${failCount === 1 ? "s" : ""} short of WCAG 2.1 AA and should be revisited before this palette ships.`}
        APCA (a newer, more perceptually accurate contrast model) is shown alongside for reference.
      </p>
      <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.06);">
        <thead>
          <tr style="text-align:left;background:#f2f2f2;">
            <th style="padding:10px 12px;font-size:12px;color:#666;font-weight:600;">Pair</th>
            <th style="padding:10px 12px;font-size:12px;color:#666;font-weight:600;">WCAG 2.1</th>
            <th style="padding:10px 12px;font-size:12px;color:#666;font-weight:600;">Ratio</th>
            <th style="padding:10px 12px;font-size:12px;color:#666;font-weight:600;">APCA</th>
          </tr>
        </thead>
        <tbody>${contrastRows}</tbody>
      </table>
    </section>

    <section style="margin-bottom:40px;">
      <h2 style="font-size:16px;margin:0 0 6px;">Typography</h2>
      <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.06);">
        <tbody>
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e5e5;color:#666;font-size:12px;width:120px;">Display</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e5e5;font-size:15px;">${escapeHtml(type.display.family)}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e5e5;color:#666;font-size:12px;">Body</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e5e5;font-size:15px;">${escapeHtml(type.body.family)}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;color:#666;font-size:12px;">Monospace</td>
            <td style="padding:10px 12px;font-size:15px;">${escapeHtml(type.mono.family)}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section style="margin-bottom:40px;">
      <h2 style="font-size:16px;margin:0 0 6px;">Layout &amp; motion</h2>
      <p style="color:#666;font-size:13px;line-height:1.6;margin:0 0 8px;">
        <strong style="color:#1a1a1a;">Density:</strong> ${DENSITY_COPY[density] ?? density}
      </p>
      <p style="color:#666;font-size:13px;line-height:1.6;margin:0;">
        <strong style="color:#1a1a1a;">Motion:</strong> ${MOTION_COPY[motion.profile] ?? motion.profile}
      </p>
    </section>

    <p style="color:#999;font-size:11px;margin-top:56px;">
      Generated by Design Playground from the current design specification.
    </p>
  </div>
</body>
</html>`;
}

export function downloadRationale(project: DesignProject): void {
  const html = buildRationale(project);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slug(project.name)}-rationale.html`;
  anchor.click();
  URL.revokeObjectURL(url);
}

const slug = (s: string) => s.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "project";
