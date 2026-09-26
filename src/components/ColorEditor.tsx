"use client";

import { useProjectStore } from "@/store/project-store";
import { SEMANTIC_TOKENS, type SemanticToken } from "@/schema/primitives";
import type { ColorTokens } from "@/schema/tokens";
import { fromCss, toHex } from "@/color/oklch";
import { darkThemeFor, OWNS_SCALE, resolveSemantic } from "@/color/semantic";
import { generateScale } from "@/color/scale";
import { evaluatePair, type ContrastFinding } from "@/color/contrast";
import { Panel, ProvenanceDot } from "./controls";

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
  const setTheme = useProjectStore((s) => s.setTheme);

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
  const hasDark = !!colors.dark;
  const editingDark = theme === "dark" && hasDark;

  return (
    <>
      <Panel title="Semantic colours">
        {/* The colours below belong to one theme at a time. Said out loud, because the
            theme is also switched from the preview toolbar and the command palette, and
            editing dark colours while believing they were light was easy to do. */}
        {hasDark && (
          <div className="mb-3 flex items-center gap-2 text-[11px] text-chrome-muted" role="group" aria-label="Theme being edited">
            Editing
            {(["light", "dark"] as const).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={(key === "dark") === editingDark}
                onClick={() => setTheme(key)}
                className={`rounded-md border px-2.5 py-1 capitalize ${(key === "dark") === editingDark ? "border-chrome-accent bg-chrome-accent text-white" : "border-chrome-border text-chrome-muted hover:bg-chrome-hover"}`}
              >
                {key}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-3">
          {SEMANTIC_TOKENS.map((token) => {
            const color = resolveSemantic(colors, theme, token);
            const hex = toHex(color);
            // Surfaced right here, not just in the separate Accessibility panel below
            // (§13.3) — the point of the warning is to be seen while the swatch that
            // caused it is still the thing your eye is on.
            const tokenFindings = findingsForToken(findings, token);
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
                <span className="flex items-center gap-1.5 flex-1 text-[13px] capitalize">
                  {token}
                  <ProvenanceDot path={`tokens.colors.${token}`} />
                  {tokenFindings.length > 0 && (
                    <span
                      className="cursor-help text-chrome-danger"
                      title={tokenFindings.map((f) => f.message).join("\n")}
                    >
                      ⚠
                    </span>
                  )}
                </span>
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

      <Panel title="Dark theme">
        <DarkTheme />
      </Panel>
    </>
  );
}

/**
 * Whether the site has a dark theme, and keeping it sound.
 *
 * One is generated with the palette, which left it implicit: it could not be left out,
 * and once edited by hand there was no way back to a generated one. Both are a decision
 * worth recording, and the export follows it — left out, the tokens carry no dark theme
 * and globals.css no dark block.
 */
function DarkTheme() {
  const project = useProjectStore((s) => s.project);
  const edit = useProjectStore((s) => s.edit);
  const theme = useProjectStore((s) => s.theme);
  const setTheme = useProjectStore((s) => s.setTheme);
  if (!project) return null;
  const colors = project.tokens.colors;
  const status = (key: "light" | "dark") => {
    const failing = contrastFindings(colors, key).length;
    return failing ? `⚠ ${failing} ${failing === 1 ? "pair fails" : "pairs fail"} AA` : "✓ all pairs pass AA";
  };
  const regenerate = (label: string) => edit(label, (draft) => {
    draft.tokens.colors.dark = { semantic: darkThemeFor(draft.tokens.colors.scales) };
    draft.provenance["tokens.colors.dark"] = "user";
  });

  if (!colors.dark) {
    return (
      <div className="flex flex-col gap-2 text-[12px]">
        <p className="text-chrome-muted">Not included — the site will be light only.</p>
        <button type="button" className="self-start rounded-md border border-chrome-border px-3 py-1.5 hover:bg-chrome-hover" onClick={() => regenerate("Add a dark theme")}>
          Add a dark theme
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 text-[12px]">
      <p className="text-chrome-muted">Included, from the same brand colours read off the dark end of each ramp.</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="text-chrome-muted">Light</dt><dd>{status("light")}</dd>
        <dt className="text-chrome-muted">Dark</dt><dd>{status("dark")}</dd>
      </dl>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded-md border border-chrome-border px-3 py-1.5 hover:bg-chrome-hover" onClick={() => regenerate("Regenerate the dark theme")}>
          Regenerate from brand colours
        </button>
        <button
          type="button"
          className="rounded-md border border-chrome-border px-3 py-1.5 hover:bg-chrome-hover"
          onClick={() => {
            edit("Leave out the dark theme", (draft) => {
              delete draft.tokens.colors.dark;
              draft.provenance["tokens.colors.dark"] = "user";
            });
            if (theme === "dark") setTheme("light");
          }}
        >
          Leave out
        </button>
      </div>
    </div>
  );
}

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

interface AnnotatedFinding extends ContrastFinding {
  fg: SemanticToken;
  bg: SemanticToken;
}

function allFindings(tokens: ColorTokens, theme: "light" | "dark"): AnnotatedFinding[] {
  return PAIRS.map(([label, fg, bg, large]) => ({
    ...evaluatePair(label, resolveSemantic(tokens, theme, fg), resolveSemantic(tokens, theme, bg), large),
    fg,
    bg,
  }));
}

function contrastFindings(tokens: ColorTokens, theme: "light" | "dark"): AnnotatedFinding[] {
  return allFindings(tokens, theme).filter((f) => f.level === "fail");
}

/** Failing pairs that involve a given token, either as the foreground or background. */
function findingsForToken(findings: AnnotatedFinding[], token: SemanticToken): AnnotatedFinding[] {
  return findings.filter((f) => f.fg === token || f.bg === token);
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
