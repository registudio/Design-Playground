"use client";
import { useEffect, useRef, useState } from "react";
import { useProjectStore } from "@/store/project-store";
import { ElementLibrary } from "@/components/ElementLibrary";
import { ProjectPicker } from "@/components/ProjectPicker";
import { CompositionPanel, SectionOrder } from "@/components/CompositionPanel";
import { TemplateGallery } from "@/components/TemplateGallery";
import { BasicsPanel } from "@/components/BasicsPanel";
import { AssetUpload } from "@/components/AssetUpload";
import { AdditionalAssets } from "@/components/AdditionalAssets";
import { AnimationsPanel } from "@/components/AnimationsPanel";
import { ElementsPanel } from "@/components/ElementsPanel";
import { PreviewFrame } from "@/components/PreviewFrame";
import { ExportPanel } from "@/components/ExportPanel";
import { CommandPalette, openCommandPalette } from "@/components/CommandPalette";
import { HelpOverlay, openHelp } from "@/components/HelpOverlay";
import { DeviceBar, HistoryButton, SnapshotButton, OverridesButton, useRestoredPreferences, useKeyboardShortcuts } from "@/components/ProjectTools";
import { isUntouched, stepHasChoices } from "@/workflow/step-progress";

type Step = "assets" | "templates" | "basics" | "sections" | "elements" | "motion" | "preview";
const STEPS: { id: Step; label: string; icon: string; description: string }[] = [
  { id: "assets", label: "Brand assets", icon: "◇", description: "Bring a little of your world." },
  { id: "templates", label: "Templates", icon: "▤", description: "A starting point, never a limit." },
  { id: "basics", label: "The basics", icon: "◐", description: "Set the tone. Find your type." },
  { id: "sections", label: "Page sections", icon: "▥", description: "Give your ideas a little structure." },
  { id: "elements", label: "Elements", icon: "✳", description: "The details that make it different." },
  { id: "motion", label: "Motion", icon: "≈", description: "Find your rhythm." },
];

export default function Playground() {
  const [screen, setScreen] = useState<"welcome" | "explore" | "projects" | "workspace">("welcome");
  const [step, setStep] = useState<Step>("assets");
  const [exporting, setExporting] = useState(false);
  const [previous, setPrevious] = useState<Step>("elements");
  const project = useProjectStore(s => s.project);
  const advanced = useProjectStore(s => s.advanced);
  const setAdvanced = useProjectStore(s => s.setAdvanced);
  const setPreviewMode = useProjectStore(s => s.setPreviewMode);
  const previewMode = useProjectStore(s => s.previewMode);
  const setTheme = useProjectStore(s => s.setTheme);
  const theme = useProjectStore(s => s.theme);
  const dirty = useProjectStore(s => s.dirty);
  const saveError = useProjectStore(s => s.saveError);
  const history = useProjectStore(s => s.history);
  const undo = useProjectStore(s => s.undo);
  const redo = useProjectStore(s => s.redo);
  const setSection = useProjectStore(s => s.setSection);
  useRestoredPreferences();
  useKeyboardShortcuts();
  // The window no longer scrolls — main does — so resetting scroll has to target it,
  // otherwise moving between steps leaves you halfway down the previous one.
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => { mainRef.current?.scrollTo({ top: 0, behavior: "instant" }); }, [screen, step]);
  useEffect(() => useProjectStore.subscribe((state, old) => {
    if (state.section !== old.section) setStep(state.section === "components" ? "sections" : state.section === "animations" ? "motion" : "elements");
    if (state.previewMode !== old.previewMode) setStep("preview");
  }), []);
  const workspace = screen === "workspace" && !!project;
  const explore = screen === "explore";
  const navigate = (next: Step) => { setStep(next); if (["elements", "motion", "sections"].includes(next)) setSection(next === "motion" ? "animations" : next === "sections" ? "components" : "elements"); };
  const visualise = () => { setPrevious(step === "preview" ? previous : step); setPreviewMode("sample"); setStep("preview"); };
  const selectedCount = (project?.recipe.elements?.length ?? 0) + (project?.selections.length ?? 0);
  const stepIndex = STEPS.findIndex(s => s.id === step);

  return <div className="studio-app">
    <header className="studio-header"><button className="studio-brand" onClick={() => setScreen("welcome")} aria-label="Design Playground home"><span className="brand-mark">✳</span><span>design playground<span className="brand-dot">®</span></span></button><div className="header-divider"/><span className="header-context">{workspace ? project.name : explore ? "Explore the collection" : "A space for possibilities"}</span><div className="header-actions">{workspace ? <><span className={`save-status ${saveError ? "save-error" : ""}`} title={saveError ?? "Saved on this device"}><i/>{saveError ? "Not saved" : dirty ? "Saving…" : "All changes saved"}</span><button className="icon-button" aria-label="Search commands" onClick={openCommandPalette}>⌕</button><button className="quiet-button" onClick={() => setScreen("projects")}>Projects</button><button className="primary-button" onClick={step === "preview" ? () => setExporting(true) : visualise}>{step === "preview" ? "Export project ↗" : "Visualise →"}</button></> : <><button className="quiet-button" onClick={() => setScreen("explore")}>Explore</button><button className="primary-button" onClick={() => setScreen("projects")}>+ New project</button></>}</div></header>
    {screen === "welcome" && <main className="welcome"><div className="eyebrow"><i/> YOUR NEXT IDEA STARTS HERE</div><h1>A playground for<br/>your <span>what ifs.</span><sup>✳</sup></h1><p>Explore the details. Mix your favourites.<br/>Make something unmistakably yours.</p><div className="welcome-paths"><button onClick={() => setScreen("explore")} className="welcome-path explore-path"><div className="path-art"><span>✳</span><span>↗</span><span>◒</span></div><div><small>FOLLOW YOUR CURIOSITY</small><h2>Just exploring <span>↗</span></h2><p>A collection of motion, interactions, and inspiration.<br/>No project needed. Go play.</p></div></button><button onClick={() => setScreen("projects")} className="welcome-path create-path"><div className="path-art"><div className="mini-page"><i/><b/><b/><span/><span/><span/></div></div><div><small>BRING AN IDEA TO LIFE</small><h2>Create a project <span>↗</span></h2><p>Your brand, your building blocks, your flow.<br/>From blank canvas to a ready-to-build brief.</p></div></button></div>{project && <button className="resume-project" onClick={() => { setScreen("workspace"); setStep("elements"); }}>↳ Pick up where you left off: <strong>{project.name}</strong> →</button>}<div className="welcome-bottom"><span>CURATE. COMPOSE. CREATE.</span><span>Made for the way you imagine.</span></div></main>}
    {screen === "projects" && <div className="project-directory"><button className="quiet-button" onClick={() => setScreen("welcome")}>← Back to playground</button><ProjectPicker onSelect={() => { setScreen("workspace"); setStep("assets"); }}/></div>}
    {(explore || workspace) && <div className="studio-body"><aside className="studio-sidebar"><div className="sidebar-top"><span className="eyebrow">{explore ? "THE PLAYGROUND" : "YOUR WORKSPACE"}</span><button className={`sidebar-link ${explore ? "active" : ""}`} onClick={() => setScreen("explore")}><span>⌘</span>Explore library <span className="link-arrow">↗</span></button></div>{workspace ? <><span className="sidebar-label">MAKE IT YOURS</span><nav aria-label="Project steps">{STEPS.map((s, i) => { const done = stepHasChoices(project, s.id as Exclude<Step, "preview">); return <button key={s.id} className={`sidebar-link ${s.id === step ? "active" : ""} ${done ? "has-choices" : ""}`} aria-current={s.id === step ? "step" : undefined} title={done ? "Something chosen here" : "Nothing chosen yet"} onClick={() => navigate(s.id)}><span>{s.icon}</span>{s.label}<small>{s.id === "elements" && selectedCount > 0 ? `✓ ${selectedCount}` : done ? "✓" : String(i + 1).padStart(2, "0")}</small></button>; })}</nav><div className="sidebar-spacer"/><div className="sidebar-project"><span className="project-monogram">{project.name[0]?.toUpperCase()}</span><div><strong>{project.name}</strong><small>{project.client || "Personal project"}</small></div></div><div className="mode-switch" role="group" aria-label="Level of detail"><button className={!advanced ? "active" : ""} aria-pressed={!advanced} title="Plain language and the main choices. Good for working with a client." onClick={() => setAdvanced(false)}>Basic</button><button className={advanced ? "active" : ""} aria-pressed={advanced} title="Every control, plus technical detail: engines, sources, runtimes." onClick={() => setAdvanced(true)}>Advanced</button></div><p className="mode-hint">{advanced ? "Showing technical detail." : "Plain view, good with clients."}</p><button className="sidebar-help" onClick={openHelp}>ⓘ &nbsp; A little guidance <kbd>?</kbd></button></> : <div className="explore-sidebar-note"><span>✳</span><h3>Good things start<br/>with a little play.</h3><p>Try the live previews.<br/>See what catches your eye.</p><button className="primary-button" onClick={() => setScreen("projects")}>Make it a project →</button>{project && <button className="quiet-button" onClick={() => setScreen("workspace")}>Return to {project.name} →</button>}</div>}</aside>
      <main ref={mainRef} className={`studio-main ${step === "preview" && workspace ? "preview-main" : ""}`}>
        {workspace && <div className="workspace-tools"><div>{step === "preview" ? <strong>Visualise</strong> : <><span>Step {stepIndex + 1} of {STEPS.length}</span><b>·</b><strong>{STEPS[stepIndex]?.label}</strong></>}</div><div><button onClick={undo} disabled={!history.past.length} aria-label="Undo">↶</button><button onClick={redo} disabled={!history.future.length} aria-label="Redo">↷</button><HistoryButton/><SnapshotButton/><OverridesButton/></div></div>}
        {explore || step === "elements" ? <div className="studio-content"><ElementLibrary exploring={explore} onCreate={() => setScreen("projects")}/></div> : workspace && step === "preview" ? <><div className="preview-toolbar"><button className="quiet-button" onClick={() => setStep(previous)}>← Back to editing</button><div>{([['sample','Sample page'],['system','Style guide'],['components','Component gallery']] as const).map(([value,label]) => <button className={previewMode === value ? "active" : ""} key={value} onClick={() => setPreviewMode(value)}>{label}</button>)}</div><button className="quiet-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "☾ Dark" : "☼ Light"}</button></div><PreviewFrame/><DeviceBar/></> : workspace && <div className="studio-content"><div className="step-heading"><div className="eyebrow">{step === "assets" || step === "templates" ? "OPTIONAL · START ANYWHERE" : "MAKE IT YOURS"}</div><h1>{STEPS.find(s => s.id === step)?.description}</h1><p>{step === "assets" ? "A logo, a favourite image, the assets that make your brand. Everything you add stays with this project." : step === "templates" ? "Choose a website template, then change absolutely anything. Or start with nothing at all." : step === "basics" ? "Colours, typography, spacing, and the smallest details. Choose as much or as little as you like." : step === "sections" ? "Choose a style for each section. Add it to your page, then drag it into place." : "How your page moves: how content arrives, how it responds to a pointer, and how it scrolls."}</p></div>
          {step === "assets" && isUntouched(project) && <div className="first-steps" role="note"><strong>Six short steps, all optional.</strong> Press <em>Continue</em> to go through them in order, or jump to any step on the left. A tick appears beside each step once something is chosen there.</div>}
          {step === "assets" && <div className="asset-grid"><section><h2>Your brand starts here.</h2><AssetUpload/></section><section><h2>The supporting cast.</h2><AdditionalAssets/></section></div>}
          {step === "templates" && <TemplateGallery/>}{step === "basics" && <BasicsPanel/>}{step === "sections" && <CompositionPanel/>}{step === "motion" && <div className="motion-layout"><div><AnimationsPanel/></div><div><ElementsPanel/></div></div>}
          <div className="step-footer"><span>Everything is optional. You can always come back.</span><div className="step-footer-actions">{stepIndex > 0 && <button className="quiet-button" onClick={() => navigate(STEPS[stepIndex - 1]!.id)}>← {STEPS[stepIndex - 1]!.label}</button>}<button className="primary-button" onClick={() => { if (stepIndex === STEPS.length - 1) visualise(); else navigate(STEPS[stepIndex + 1]!.id); }}>{step === "motion" ? "Visualise your page →" : `Continue to ${STEPS[stepIndex + 1]?.label.toLowerCase()} →`}</button></div></div></div>}
      </main>{workspace && step === "elements" && <aside className="selection-sidebar"><div className="eyebrow">YOUR COMPOSITION</div><SectionOrder compact/><div className="selection-summary"><span>✳</span><strong>{selectedCount} selected elements</strong><p>A little motion goes a long way.</p><button className="primary-button" onClick={visualise}>Visualise your page →</button></div></aside>}
    </div>}
    {exporting && <ExportPanel onClose={() => setExporting(false)}/>}<CommandPalette/><HelpOverlay/>
  </div>;
}
