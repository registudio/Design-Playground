/**
 * Six web components from Ship Notes (https://github.com/aqualang89/shipnotes-components),
 * running as published.
 *
 * Unlike the cult-ui and 21st.dev sets these are not ports. Ship Notes publishes plain
 * JavaScript custom elements with no framework and no build, which is exactly what an
 * element document can run, so each element is the component's own script (vendored
 * unchanged, minified, MIT notice at its head; see vendor/shipnotes-components) followed
 * by a small demo of this project's that lays it out for a card and full screen. The
 * demos are cut down from the ones Ship Notes ships: the page copy goes, the component
 * and its controls stay.
 *
 * All carry the `shipnotes-` prefix, which puts them in `INTERACTION_ONLY`: the script
 * is what defines the custom element, so skipping it under reduced motion would leave an
 * empty card. Each component already honours the setting itself.
 *
 * Two things the upstream demos offer are left out because a sandboxed frame cannot do
 * them: the microphone (no permission is granted to a srcdoc frame), and Jelly Stack's
 * Google-hosted serif, which would make the card depend on a network it may not have —
 * it falls back to Georgia, as the component's own CSS allows.
 */
import { SHIPNOTES_SOURCES } from "./shipnotes-sources";
import type { BrowseCategory } from "./taxonomy";

interface ShipNotesElement {
  id: string;
  title: string;
  category: BrowseCategory;
  description: string;
  tag: string;
  html: string;
  css: string;
  js: string;
}

/**
 * Scales a fixed-size stage to the frame with CSS zoom, which, unlike a transform, also
 * scales hit-testing and layout, so dragging and tapping land where they look. Measured
 * at zoom 1 each time, since the components settle their own size after defining.
 */
const FIT = `const fit=stage=>{const go=()=>{stage.style.zoom='1';const box=stage.getBoundingClientRect();stage.style.zoom=String(Math.min(1,(innerWidth-16)/box.width,(innerHeight-16)/box.height))};addEventListener('resize',go);go();requestAnimationFrame(go);};`;

/** The component's script, then the demo's. */
const run = (component: keyof typeof SHIPNOTES_SOURCES, demo: string) => `${SHIPNOTES_SOURCES[component]}\n;${demo}`;

/** Upstream's sample projects; Project Stack's demo gives Orbit an accent, Jelly Stack's does not. */
const SAMPLE_PROJECTS = [
  { title: "Orbit", tag: "BRAND & WEB", description: "A home for your next big idea.", href: "https://example.com/#orbit" },
  { title: "Forma", tag: "DESIGN SYSTEM", description: "A small system for making things feel consistent.", href: "https://example.com/#forma" },
  { title: "Echo", tag: "DIGITAL PRODUCT", description: "A quieter place for your favourite sounds.", href: "https://example.com/#echo" },
];
const PROJECTS = JSON.stringify(SAMPLE_PROJECTS.map((project, index) => index === 0 ? { ...project, accent: "#7ee0b8" } : project));
const JELLY_PROJECTS = JSON.stringify(SAMPLE_PROJECTS);

/** A row of state buttons, one pressed. */
const stateButtons = (label: string, states: string[], pressed: string) =>
  `<div class="sn-states" role="group" aria-label="${label}">${states.map(state =>
    `<button type="button" data-state="${state}" aria-pressed="${state === pressed}">${state[0].toUpperCase()}${state.slice(1)}</button>`).join("")}</div>`;
const STATE_CSS = `.sn-states{display:flex;gap:4px;padding:4px;border-radius:14px;background:#ffffff0a;box-shadow:0 0 0 1px #ffffff12}
.sn-states button{min-height:34px;padding:0 12px;border:0;border-radius:10px;background:transparent;color:#a7aab6;font-size:12px;transition:background .2s,color .2s}
.sn-states button:hover{color:#fff}
.sn-states button[aria-pressed=true]{background:#292d36;color:#fff;box-shadow:0 1px 0 #ffffff15 inset,0 3px 8px #0005}
@media(max-width:380px){.sn-states button{padding:0 8px;font-size:11px}}`;
const STATE_JS = `const pick=set=>{const buttons=[...document.querySelectorAll('.sn-states [data-state]')];for(const button of buttons)button.addEventListener('click',()=>{set(button.dataset.state);for(const b of buttons)b.setAttribute('aria-pressed',String(b===button));});};`;

export const SHIPNOTES_ELEMENTS: ShipNotesElement[] = [
  {
    id: "shipnotes-pull-lamp",
    title: "Pull lamp",
    category: "Buttons & inputs",
    description:
      "A desk lamp whose brass cord switches the page between light and dark. Pull it, tap it or use the keyboard, and the whole page follows the lamp. Ship Notes' own component.",
    tag: "Ship Notes",
    html: `<main class="sn-lamp" data-theme="dark"><span class="sn-badge" id="sn-theme">NIGHT MODE</span><pull-lamp></pull-lamp><p>Pull the brass cord, or Tab + Enter.</p></main>`,
    css: `.sn-lamp{--bg:#101b17;--ink:#f2eee0;--muted:#a0afa6;--line:#ffffff18;position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;
  background:var(--bg);color:var(--ink);font-family:system-ui,sans-serif;transition:background-color .65s,color .65s}
.sn-lamp[data-theme=light]{--bg:#f0e7d6;--ink:#263c30;--muted:#596451;--line:#223c3020}
.sn-lamp pull-lamp{width:auto;height:calc(100vh - 64px);max-width:100%}
.sn-lamp p{margin:0;font-size:12px;color:var(--muted)}
.sn-badge{position:absolute;top:12px;right:12px;padding:6px 10px;border:1px solid var(--line);border-radius:30px;font-size:9px;letter-spacing:1px;color:var(--muted)}`,
    js: run("pull-lamp", `const page=document.querySelector('.sn-lamp');document.addEventListener('themechange',e=>{page.dataset.theme=e.detail.theme;document.getElementById('sn-theme').textContent=e.detail.theme==='light'?'DAY MODE':'NIGHT MODE';});`),
  },
  {
    id: "shipnotes-signal-orb",
    title: "Signal orb",
    category: "Loaders & feedback",
    description:
      "A status light for an AI assistant: 12,000 particles on WebGL that rebuild into a new shape for listening, thinking, searching and done. Ship Notes' own component.",
    tag: "Ship Notes",
    html: `<main class="sn-orb-page sn-signal"><signal-orb state="listening" level="0.5"></signal-orb><p class="sn-hint" aria-live="polite">A soft pulse. Ready for your input.</p>${stateButtons("Assistant state", ["listening", "thinking", "searching", "done"], "listening")}</main>`,
    css: `.sn-orb-page{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:10px;background:#080a0e;color:#eeeff4;font-family:system-ui,sans-serif}
.sn-signal signal-orb{width:min(100%,calc(100vh - 92px),620px)}
.sn-hint{margin:0;min-height:16px;font-size:12px;color:#a7aab6}
${STATE_CSS}`,
    js: run("signal-orb", `${STATE_JS}const orb=document.querySelector('signal-orb'),hint=document.querySelector('.sn-hint');
const hints={listening:'A soft pulse. Ready for your input.',thinking:'Gathering the pieces.',searching:'Following a different orbit.',done:'Everything falls into place.'};
pick(state=>{orb.setAttribute('state',state);hint.textContent=hints[state];});`),
  },
  {
    id: "shipnotes-voice-orb",
    title: "Voice orb",
    category: "Loaders & feedback",
    description:
      "A particle sphere that reacts to sound: bass moves the whole orb and the highs throw sparks off its edge. Play the synthesized sample or beat to drive it. Ship Notes' own component.",
    tag: "Ship Notes",
    html: `<main class="sn-orb-page sn-voice"><voice-orb state="idle"></voice-orb>${stateButtons("Orb state", ["idle", "listening", "thinking", "speaking"], "idle")}<div class="sn-actions"><button type="button" id="sample" aria-pressed="false">Play sample</button><button type="button" id="beat" aria-pressed="false">Play beat</button></div><p class="sn-hint" role="status">Synthesized in the page. No microphone, nothing leaves it.</p></main>`,
    css: `.sn-orb-page{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:10px;background:#050507;color:#eeeaf6;font-family:system-ui,sans-serif}
.sn-voice voice-orb{width:min(100%,calc(100vh - 150px),570px)}
.sn-actions{display:flex;gap:8px}
.sn-actions button{min-height:34px;padding:0 14px;border:1px solid #ffffff12;border-radius:99px;background:#141217;color:#cfc6da;font-size:12px}
.sn-actions button:first-child{color:#201b29;background:#e7dbfa;border-color:#e7dbfa}
.sn-actions button[aria-pressed=true]{box-shadow:0 0 0 2px #ad8bd844;border-color:#ae8bcf}
.sn-hint{margin:0;font-size:11px;color:#88808f;text-align:center}
@media(max-height:330px){.sn-hint{display:none}.sn-voice voice-orb{width:min(100%,calc(100vh - 120px))}}
${STATE_CSS}`,
    // The two sample generators are Ship Notes' demo code, unchanged; the microphone path is not carried.
    js: run("voice-orb", `${STATE_JS}const orb=document.querySelector('voice-orb'),status=document.querySelector('.sn-hint');
const actions=[...document.querySelectorAll('.sn-actions button')],labels={sample:'Play sample',beat:'Play beat'};
let context=null,source=null,mode=null,serial=0;
const setState=value=>{orb.state=value;for(const b of document.querySelectorAll('.sn-states [data-state]'))b.setAttribute('aria-pressed',String(b.dataset.state===value));};
pick(setState);
function setMode(value){mode=value;for(const b of actions){b.setAttribute('aria-pressed',String(b.id===value));b.textContent=b.id===value?'Stop':labels[b.id];}}
function stop(){serial++;if(source){source.onended=null;try{source.stop();}catch(_){}source.disconnect();source=null;}orb.disconnect();setMode(null);setState('idle');status.textContent='Ready when you are. Nothing leaves the page.';}
function audio(){context??=new(window.AudioContext||window.webkitAudioContext)();if(context.state==='suspended')context.resume();return context;}
function noise(i){let n=(i+1)*374761393;n=(n^(n>>>13))*1274126177;return ((n^(n>>>16))>>>0)/2147483648-1;}
function makeSample(ctx,kind){
  const seconds=kind==='beat'?8:6,sr=ctx.sampleRate,buffer=ctx.createBuffer(1,Math.ceil(sr*seconds),sr),out=buffer.getChannelData(0);
  if(kind==='beat'){
    const beat=60/112;
    for(let i=0;i<out.length;i++){
      const t=i/sr,bar=t/(beat*4),gap=t>3.55&&t<4.28;
      if(gap)continue;
      const local=t%beat,hat=t%(beat*.5),step=Math.floor(t/beat),note=[55,55,65.406,49][Math.floor(bar)%4];
      const kick=.59*Math.exp(-local*20)*Math.sin(2*Math.PI*(48*local+95*(1-Math.exp(-local*38))/38));
      const bass=.14*Math.sin(2*Math.PI*note*t)*Math.min(1,local/.012)*Math.exp(-local*3.8);
      const hatSound=.047*noise(i)*Math.exp(-hat*95)*(step%2?.7:1);
      const snare=step%2?.095*noise(i+271)*Math.exp(-local*29):0;
      const fade=Math.min(1,t/.008,(seconds-t)/.08);
      out[i]=(kick+bass+hatSound+snare)*Math.max(0,fade);
    }
  }else{
    const starts=[.25,.78,1.21,1.86,2.30,2.85,3.62,4.16,4.67,5.17],vowels=[[650,1100,2500],[350,2100,2900],[400,850,2300],[750,1250,2600]];
    for(let j=0;j<starts.length;j++){
      const start=starts[j],duration=j%3===0?.43:.30,f0=126+(j%4)*13,formants=vowels[j%vowels.length];
      const amps=[];for(let k=1;k<=26;k++)amps[k]=(.14/k+formants.reduce((a,f)=>a+Math.exp(-.5*((k*f0-f)/125)**2),0)*.17);
      for(let i=Math.floor(start*sr);i<Math.min(out.length,(start+duration)*sr);i++){
        const t=i/sr-start,u=t/duration,env=Math.sin(Math.PI*u)**1.4;let value=0;
        for(let k=1;k<=26;k++)value+=amps[k]*Math.sin(2*Math.PI*k*f0*t+.10*k*Math.sin(t*14));
        out[i]+=(value*.24+noise(i+j*79)*.007)*env;
      }
    }
  }
  return buffer;
}
async function play(kind){
  if(mode===kind){stop();return;}
  stop();const token=serial;
  try{
    const ctx=audio(),node=ctx.createBufferSource();node.buffer=makeSample(ctx,kind);node.connect(ctx.destination);source=node;
    await orb.connect(node);if(token!==serial)return;
    setState('speaking');setMode(kind);
    status.textContent=kind==='beat'?'112 BPM. Kick, bass and hats. Wait for the break.':'Synthesized vowels. No recording, no voice service.';
    node.onended=()=>{if(token===serial)stop();};node.start();
  }catch(e){stop();status.textContent=e.message;}
}
document.getElementById('sample').addEventListener('click',()=>play('sample'));
document.getElementById('beat').addEventListener('click',()=>play('beat'));
addEventListener('pagehide',()=>{stop();context?.close().catch(()=>{});context=null;});`),
  },
  {
    id: "shipnotes-speaking-orb",
    title: "Speaking orb",
    category: "Loaders & feedback",
    description:
      "A face for a voice assistant. It speaks with the browser's own voice, swells with it, and every word flies out as particles and lands as a live caption. Ship Notes' own component.",
    tag: "Ship Notes",
    html: `<main class="sn-orb-page sn-speak"><speaking-orb state="listening" level="0.3"></speaking-orb><div class="sn-lines">${[
      ["Good morning. You have three meetings today. The first one moved to ten.", "Morning brief"],
      ["Done. Your site is live, and it loads in under a second.", "Site is live"],
      ["I found two flights under three hundred dollars. Want me to hold the cheaper one?", "Two flights"],
    ].map(([line, label]) => `<button type="button" data-line="${line}">${label}</button>`).join("")}</div>${stateButtons("State", ["listening", "thinking", "searching", "done"], "listening")}</main>`,
    css: `.sn-orb-page{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:10px;background:#07070c;color:#f4f1fa;font-family:system-ui,sans-serif}
/* The host is its sphere plus a 73px caption strip, so the width comes from the height left over. */
.sn-speak speaking-orb{width:min(100%,calc(100vh - 200px),440px)}
.sn-lines{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}
.sn-lines button{min-height:32px;padding:0 12px;border:1px solid #ffffff1a;border-radius:12px;background:#ff96d6;color:#1b0c16;font-size:12px;font-weight:600}
.sn-lines button:hover{background:#ffb0e0}
.sn-lines button:focus-visible,.sn-states button:focus-visible{outline:2px solid #ff96d6;outline-offset:2px}
@media(max-height:330px){.sn-speak .sn-states{display:none}.sn-speak speaking-orb{width:min(100%,calc(100vh - 150px))}}
${STATE_CSS}`,
    js: run("speaking-orb", `${STATE_JS}const orb=document.querySelector('speaking-orb');
const mark=state=>{for(const b of document.querySelectorAll('.sn-states [data-state]'))b.setAttribute('aria-pressed',String(b.dataset.state===state));};
for(const button of document.querySelectorAll('[data-line]'))button.addEventListener('click',()=>{orb.setAttribute('rest','listening');orb.say(button.dataset.line);mark('');});
pick(state=>{window.speechSynthesis?.cancel();orb.state=state;});
orb.addEventListener('end',()=>mark(orb.state));`),
  },
  {
    id: "shipnotes-project-stack",
    title: "Project stack",
    category: "Layout blocks",
    description:
      "Three portfolio cards in a stack. Pick a tab or use the arrow keys and the next card comes forward; a project's accent colour carries through its card. Ship Notes' own component.",
    tag: "Ship Notes",
    html: `<main class="sn-fit-page sn-project"><div class="sn-stage"><project-stack><script type="application/json">${PROJECTS}</script></project-stack></div></main>`,
    css: `.sn-fit-page{position:fixed;inset:0;display:grid;place-items:center;font-family:system-ui,sans-serif}
.sn-project{background:radial-gradient(ellipse at 50% 40%,#22232a,#0e1014 65%);color:#eeece7}
.sn-stage{width:460px}`,
    js: run("project-stack", `${FIT}fit(document.querySelector('.sn-stage'));`),
  },
  {
    id: "shipnotes-jelly-stack",
    title: "Jelly stack",
    category: "Layout blocks",
    description:
      "Three project cards made of jelly, 81 sprung points each. Pull a corner and it stretches, flick it and it whips, tap the card behind and it hops out and splats. Ship Notes' own component.",
    tag: "Ship Notes",
    html: `<main class="sn-fit-page sn-jelly"><div class="sn-stage"><jelly-stack intro><script type="application/json">${JELLY_PROJECTS}</script></jelly-stack><button class="sn-poke" type="button">Poke</button></div></main>`,
    css: `.sn-fit-page{position:fixed;inset:0;display:grid;place-items:center;font-family:system-ui,sans-serif}
.sn-jelly{background:#ede7df;color:#2b2521}
.sn-jelly .sn-stage{width:460px;display:flex;flex-direction:column;align-items:center}
.sn-jelly jelly-stack{--jelly-serif:"Instrument Serif",Georgia,serif}
.sn-poke{margin-top:6px;min-height:44px;padding:0 24px;border-radius:22px;border:1px solid #2b252126;background:#ffffff99;font-size:14px;color:#2b2521}
.sn-poke:active{transform:scale(.95)}
.sn-poke:focus-visible{outline:2px solid #2b2521;outline-offset:3px}`,
    js: run("jelly-stack", `${FIT}fit(document.querySelector('.sn-stage'));document.querySelector('.sn-poke').addEventListener('click',()=>document.querySelector('jelly-stack').poke());`),
  },
];
