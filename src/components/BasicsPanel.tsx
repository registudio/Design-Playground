"use client";
import { useState } from "react";
import { useProjectStore } from "@/store/project-store";
import { Foundation } from "./Foundation";
import { ComponentsPanel } from "./ComponentsPanel";
import { BasicsSpecimen } from "./BasicsSpecimen";
import { CursorVariant } from "@/schema/recipe";
import { defaultTokens } from "@/schema/defaults";

export function BasicsPanel() {
  const project = useProjectStore(s => s.project)!;
  const edit = useProjectStore(s => s.edit);
  const advanced = useProjectStore(s => s.advanced);
  const [error, setError] = useState("");
  const upload = async (file: File) => {
    setError("");
    if (!["image/png", "image/webp", "image/jpeg"].includes(file.type) || file.size > 250000) { setError("Use a PNG, WebP, or JPEG under 250 KB."); return; }
    try {
      const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
      edit("Upload custom cursor", d => { d.recipe.cursorImage = data; d.recipe.components.cursor = "image-aware"; });
    } catch { setError("Could not read this image. Try another file."); }
  };
  return <><div className="optional-note"><span>↳</span><div><strong>Nothing here is mandatory.</strong><p>Leave colours or fonts undecided. Neutral defaults keep your preview readable.</p></div>{(["colors", "typography"] as const).map(key => <button key={key} className="quiet-button" onClick={() => edit(`Leave ${key} undecided`, d => { d.recipe.unset = [...new Set([...(d.recipe.unset ?? []), key])]; d.tokens[key] = defaultTokens()[key] as never; if (key === "typography") { for (const role of ["display", "body"] as const) { d.tokens.typography[role].family = "system-ui"; d.tokens.typography[role].source = "system"; } } })}>No {key === "colors" ? "colour scheme" : "font"}</button>)}</div><div className="basics-layout"><div className="foundation-grid"><Foundation hideAssets/></div><BasicsSpecimen/></div><section className="cursor-settings"><div><div className="eyebrow">THE FINISHING TOUCH</div><h2>Make an entrance. Even with your cursor.</h2><p>Custom cursors stay inside the preview and fall back on touch devices.</p></div><div className="cursor-choices">{CursorVariant.options.map((v, i) => <button className={project.recipe.components.cursor === v && !project.recipe.cursorImage ? "active" : ""} key={v} onClick={() => edit(`Choose ${v} cursor`, d => { d.recipe.components.cursor = v; delete d.recipe.cursorImage; })}><span>{["↖", "•", "◯", "View", "✳", "◎"][i]}</span>{v.replaceAll("-", " ")}</button>)}<label className="cursor-upload"><span>{project.recipe.cursorImage ? <img alt="Custom cursor" src={project.recipe.cursorImage}/> : "+"}</span>Upload image<input aria-label="Upload cursor image" type="file" accept="image/png,image/webp,image/jpeg" onChange={e => { if (e.target.files?.[0]) void upload(e.target.files[0]); e.target.value = ""; }}/></label></div>{error && <p role="alert">{error}</p>}</section>{advanced && <details className="advanced-presets"><summary>All component variants & interactive primitives</summary><ComponentsPanel/></details>}</>;
}
