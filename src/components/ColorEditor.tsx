"use client";

import { useProjectStore } from "@/store/project-store";
import { SEMANTIC_TOKENS, type SemanticToken } from "@/schema/primitives";
import type { ColorTokens } from "@/schema/tokens";
import { fromCss, toHex } from "@/color/oklch";
import { resolveSemantic } from "@/color/semantic";
import { generateScale } from "@/color/scale";
import { evaluatePair, type ContrastFinding } from "@/color/contrast";
import { Field, Panel } from "./controls";

/**
 * Semantic colour editing with continuous contrast feedback (§10.2, §13.3).
 *
 * Editing primary regenerates the brand ramp so the whole scale stays coherent rather
 * than leaving one rung out of step with the rest. Contrast warnings are advisory and
 * inline — they never silently override an intentional brand choice.
 */

export function ColorEditor() {
  const project = useProjectStore((s) => s.project);
  const theme = useProjectStore((s) => s.theme);
  const advanced = useProjectStore((s) => s.advanced);
  const edit = useProjectStore((s) => s.edit);

  if (!project) return null;
  const colors = project.tokens.colors;

  const setSemantic = (token: SemanticToken, hex: string) => {
    const parsed = fromCss(hex);
    if (!parsed) return;

    edit(
      `Set ${token}`,
      (draft) => {
        const themeKey = theme === "dark" && draft.tokens.colors.dark ? "dark" : "light";
        const target = themeKey === "dark" ? draft.tokens.colors.dark! : draft.tokens.colors.light;

        // Editing a token that owns a ramp regenerates the whole ramp, so the scale
        // stays internally consistent instead of developing one odd rung.
        const ref = target.semantic[token];
        if (ref.kind === "scale" && OWNS_SCALE[token] === ref.scale) {
          draft.tokens.colors.scales[ref.scale] = generateScale(parsed);
        } else {
          target.semantic[token] = { kind: "raw", color: parsed };
        }
        draft.provenance[`tokens.colors.${token}`] = "user";
      },
      // Coalesce so dragging a colour picker leaves one undo entry, not hundreds.
      `color.${token}.${theme}`,
    );
  };

  const findings = contrastFindings(project.tokens.colors, theme);

  return (
    <>
      <Panel title="Semantic colours">
        <div className="flex flex-col gap-3">
          {SEMANTIC_TOKENS.map((token) => {
            const color = resolveSemantic(colors, theme, token);
            const hex = toHex(color);
            return (
              <div key={token} className="flex items-center gap-3">
                <label className="relative h-8 w-12 shrink-0 cursor-pointer overflow-hidden rounded-md border border-chrome-border">
                  <span className="absolute inset-0" style={{ background: hex }} />
                  <input
                    type="color"
                    value={hex}
                    onChange={(e) => setSemantic(token, e.target.value)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    aria-label={`${token} colour`}
                  />
                </label>
                <span className="flex-1 text-[13px] capitalize">{token}</span>
                {advanced && (
                  <span className="font-mono text-[11px] text-chrome-muted">
                    {`oklch(${color.l} ${color.c} ${color.h})`}
                  </span>
                )}
                {!advanced && (
                  <span className="font-mono text-[11px] text-chrome-muted">{hex}</span>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="Accessibility">
        {findings.length === 0 ? (
          <p className="text-[12px] text-chrome-muted">
            All checked pairs meet WCAG AA on this theme.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {findings.map((finding) => (
              <div
                key={finding.label}
                className="rounded-md border border-chrome-border bg-chrome-hover px-3 py-2.5"
              >
                <p className="text-[12px] text-chrome-text">⚠ {finding.message}</p>
                <p className="mt-1 font-mono text-[11px] text-chrome-muted">
                  {finding.ratio}:1 · APCA {finding.apca}
                </p>
              </div>
            ))}
          </div>
        )}
        {advanced && <PassingPairs tokens={project.tokens.colors} theme={theme} />}
      </Panel>
    </>
  );
}

/** Which semantic token is the canonical owner of each generated ramp. */
const OWNS_SCALE: Partial<Record<SemanticToken, string>> = {
  primary: "brand",
  accent: "accent",
  secondary: "secondary",
  success: "success",
  warning: "warning",
  error: "error",
};

/** The pairs worth checking continuously, per §13.3. */
const PAIRS: Array<[string, SemanticToken, SemanticToken, boolean]> = [
  ["Body text on background", "foreground", "background", false],
  ["Body text on surface", "foreground", "surface", false],
  ["Secondary text on background", "muted", "background", false],
  ["Secondary text on surface", "muted", "surface", false],
  ["Button label on primary", "background", "primary", false],
  ["Link on background", "primary", "background", false],
  ["Large headings on background", "foreground", "background", true],
];

function allFindings(tokens: ColorTokens, theme: "light" | "dark"): ContrastFinding[] {
  return PAIRS.map(([label, fg, bg, large]) =>
    evaluatePair(label, resolveSemantic(tokens, theme, fg), resolveSemantic(tokens, theme, bg), large),
  );
}

function contrastFindings(tokens: ColorTokens, theme: "light" | "dark"): ContrastFinding[] {
  return allFindings(tokens, theme).filter((f) => f.level === "fail");
}

function PassingPairs({ tokens, theme }: { tokens: ColorTokens; theme: "light" | "dark" }) {
  const passing = allFindings(tokens, theme).filter((f) => f.level !== "fail");
  return (
    <div className="mt-2 flex flex-col gap-1">
      {passing.map((finding) => (
        <div key={finding.label} className="flex justify-between font-mono text-[11px] text-chrome-muted">
          <span className="truncate">{finding.label}</span>
          <span>
            {finding.ratio}:1 {finding.level}
          </span>
        </div>
      ))}
    </div>
  );
}
