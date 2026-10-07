/**
 * Components from 21st.dev (https://21st.dev), rebuilt as plain HTML, CSS and JavaScript.
 *
 * 21st.dev publishes community React components built on Tailwind and shadcn/ui. An
 * element here is a standalone document in a sandboxed iframe with no framework and no
 * build, so these are ports rather than copies, the same relationship the cult-ui
 * elements have: the look, the proportions and the behaviour are taken from the
 * published source, and the implementation underneath is this project's own. lucide
 * icons are drawn inline from lucide's own paths (ISC), since nothing can be installed.
 *
 * All of them carry the `21st-` prefix, which credits them through `PORT_SOURCES` and
 * puts them in `INTERACTION_ONLY` in catalogue.ts: their scripts run under
 * `prefers-reduced-motion` and damp their own movement, because a control that stops
 * responding is broken rather than calmed.
 */
import type { BrowseCategory } from "./taxonomy";

interface TwentyFirstElement {
  id: string;
  title: string;
  category: BrowseCategory;
  description: string;
  tag: string;
  html: string;
  css: string;
  js: string;
}

/** lucide icon bodies, from lucide's published SVGs. */
const LUCIDE = {
  calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  fileText: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
} as const;
const icon = (name: keyof typeof LUCIDE, size: number) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LUCIDE[name]}</svg>`;

/** Upstream's demo data, unchanged. */
const TIMELINE = [
  { id: 1, title: "Planning", date: "Jan 2024", content: "Project planning and requirements gathering phase.", icon: "calendar", related: [2], status: "completed", energy: 100 },
  { id: 2, title: "Design", date: "Feb 2024", content: "UI/UX design and system architecture.", icon: "fileText", related: [1, 3], status: "completed", energy: 90 },
  { id: 3, title: "Development", date: "Mar 2024", content: "Core features implementation and testing.", icon: "code", related: [2, 4], status: "in-progress", energy: 60 },
  { id: 4, title: "Testing", date: "Apr 2024", content: "User testing and bug fixes.", icon: "user", related: [3, 5], status: "pending", energy: 30 },
  { id: 5, title: "Release", date: "May 2024", content: "Final deployment and release.", icon: "clock", related: [4], status: "pending", energy: 10 },
] as const;
const STATUS_LABEL = { completed: "COMPLETE", "in-progress": "IN PROGRESS", pending: "PENDING" } as const;

const orbitalNode = (item: (typeof TIMELINE)[number]) => {
  const glow = item.energy * 0.5 + 40;
  const connected = item.related.map(id => {
    const other = TIMELINE.find(entry => entry.id === id)!;
    return `<button class="rot-go" data-go="${id}">${other.title}${icon("arrowRight", 8)}</button>`;
  }).join("");
  return `<div class="rot-node" data-id="${item.id}" data-related="${item.related.join(",")}">
  <i class="rot-glow" style="width:${glow}px;height:${glow}px;left:${(40 - glow) / 2}px;top:${(40 - glow) / 2}px"></i>
  <button class="rot-dot" aria-expanded="false" aria-controls="rot-card-${item.id}" aria-label="${item.title}, ${item.date}">${icon(item.icon, 16)}</button>
  <span class="rot-label" aria-hidden="true">${item.title}</span>
  <div class="rot-card" id="rot-card-${item.id}" role="region" aria-label="${item.title}" hidden>
    <div class="rot-card-head"><span class="rot-badge rot-${item.status}">${STATUS_LABEL[item.status]}</span><span class="rot-date">${item.date}</span></div>
    <h3>${item.title}</h3>
    <p>${item.content}</p>
    <div class="rot-section"><div class="rot-energy"><span>${icon("zap", 10)}Energy Level</span><span class="rot-mono">${item.energy}%</span></div><div class="rot-bar"><i style="width:${item.energy}%"></i></div></div>
    <div class="rot-section"><h4>${icon("link", 10)}Connected Nodes</h4><div class="rot-links">${connected}</div></div>
  </div>
</div>`;
};

/**
 * The screen inside the container-scroll frame. Upstream's demo shows a photo; a drawn
 * dashboard reads as the same thing, needs no network, and so still paints in an
 * exported ZIP opened offline. Sized in container units so it scales with the frame.
 */
const DASHBOARD = `<div class="dash" aria-hidden="true">
  <aside class="dash-side"><b class="dash-logo"></b>${["Overview", "Projects", "Clients", "Invoices", "Reports", "Settings"].map((label, index) => `<span class="dash-nav${index === 0 ? " on" : ""}"><i></i>${label}</span>`).join("")}</aside>
  <div class="dash-main">
    <div class="dash-head"><div><small>Studio dashboard</small><strong>Overview</strong></div><span class="dash-pill">Last 30 days</span></div>
    <div class="dash-stats">${[["Revenue", "£48.2k", "+12.4%"], ["Active clients", "2,841", "+3.1%"], ["Conversion", "3.6%", "+0.4%"]].map(([label, value, change]) => `<div class="dash-stat"><small>${label}</small><strong>${value}</strong><em>${change}</em></div>`).join("")}</div>
    <div class="dash-chart"><small>Weekly revenue</small><svg viewBox="0 0 300 90" preserveAspectRatio="none"><defs><linearGradient id="dash-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".35"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><path d="M0 70 L25 64 L50 68 L75 52 L100 56 L125 40 L150 46 L175 30 L200 36 L225 22 L250 26 L275 12 L300 16 L300 90 L0 90Z" fill="url(#dash-fill)"/><path d="M0 70 L25 64 L50 68 L75 52 L100 56 L125 40 L150 46 L175 30 L200 36 L225 22 L250 26 L275 12 L300 16" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"/></svg></div>
    <div class="dash-rows">${[["Northfield rebrand", "In review", "72%"], ["Harbour & Co. site", "Building", "45%"], ["Atlas annual report", "Planning", "18%"]].map(([name, state, done]) => `<div class="dash-row"><span>${name}</span><em>${state}</em><i><b style="width:${done}"></b></i></div>`).join("")}</div>
  </div>
</div>`;

/** Upstream's demo testimonials, unchanged; three columns of three. */
const TESTIMONIALS = [
  ["This ERP revolutionized our operations, streamlining finance and inventory. The cloud-based platform keeps us productive, even remotely.", "Briana Patton", "Operations Manager"],
  ["Implementing this ERP was smooth and quick. The customizable, user-friendly interface made team training effortless.", "Bilal Ahmed", "IT Manager"],
  ["The support team is exceptional, guiding us through setup and providing ongoing assistance, ensuring our satisfaction.", "Saman Malik", "Customer Support Lead"],
  ["This ERP's seamless integration enhanced our business operations and efficiency. Highly recommend for its intuitive interface.", "Omar Raza", "CEO"],
  ["Its robust features and quick support have transformed our workflow, making us significantly more efficient.", "Zainab Hussain", "Project Manager"],
  ["The smooth implementation exceeded expectations. It streamlined processes, improving overall business performance.", "Aliza Khan", "Business Analyst"],
  ["Our business functions improved with a user-friendly design and positive customer feedback.", "Farhan Siddiqui", "Marketing Director"],
  ["They delivered a solution that exceeded expectations, understanding our needs and enhancing our operations.", "Sana Sheikh", "Sales Manager"],
  ["Using this ERP, our online presence and conversions significantly improved, boosting business performance.", "Hassan Ali", "E-commerce Manager"],
] as const;

/**
 * Upstream's portraits are photos on 21st.dev's CDN. Drawn initials keep the card
 * painting offline and in an exported ZIP, the same reason the container scroll draws
 * its screen.
 */
const AVATAR_TONES = ["#f0abfc,#818cf8", "#fdba74,#f43f5e", "#86efac,#0ea5e9", "#fde68a,#f97316", "#a5b4fc,#14b8a6", "#fca5a5,#a855f7"];
const testimonialCard = ([text, name, role]: (typeof TESTIMONIALS)[number], index: number) =>
  `<figure class="tcol-card"><blockquote>${text}</blockquote><figcaption><span class="tcol-avatar" style="background:linear-gradient(135deg,${AVATAR_TONES[index % AVATAR_TONES.length]})" aria-hidden="true">${name.split(" ").map(part => part[0]).join("")}</span><span><b>${name}</b><small>${role}</small></span></figcaption></figure>`;
/** One column, its cards written twice so a -50% translate loops without a seam. */
const testimonialColumn = (from: number, seconds: number, column: number) => {
  const cards = TESTIMONIALS.slice(from, from + 3).map((item, i) => testimonialCard(item, from + i)).join("");
  return `<div class="tcol tcol-${column}"><div class="tcol-track" style="animation-duration:${seconds}s">${cards}<div class="tcol-copy" aria-hidden="true">${cards}</div></div></div>`;
};

export const TWENTYFIRST_ELEMENTS: TwentyFirstElement[] = [
  {
    id: "21st-radial-orbital-timeline",
    title: "Radial orbital timeline",
    category: "Charts & data viz",
    description:
      "Project phases orbit a pulsing core. Open one and the orbit turns it to the top, shows its status, date and energy level, and lights up the phases it connects to. After the Radial Orbital Timeline on 21st.dev.",
    tag: "21st.dev",
    html: `<div class="rot">
<div class="rot-orbit">
  <div class="rot-core" aria-hidden="true"><i class="rot-ping"></i><i class="rot-ping rot-ping-late"></i><b></b></div>
  <div class="rot-ring" aria-hidden="true"></div>
  ${TIMELINE.map(orbitalNode).join("\n  ")}
</div>
<p class="rot-hint">Open a phase</p>
</div>`,
    css: `.rot{position:fixed;inset:0;background:#000;overflow:hidden;color:#fff}
.rot-orbit{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;perspective:1000px}
.rot-core{position:absolute;z-index:10;width:64px;height:64px;border-radius:50%;display:grid;place-items:center;
  background:linear-gradient(135deg,#a855f7,#3b82f6,#14b8a6);animation:rot-pulse 2s cubic-bezier(.4,0,.6,1) infinite}
.rot-core b{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.8);backdrop-filter:blur(12px)}
.rot-ping{position:absolute;width:80px;height:80px;border-radius:50%;border:1px solid rgba(255,255,255,.2);opacity:.7;
  animation:rot-ping 1s cubic-bezier(0,0,.2,1) infinite}
.rot-ping-late{width:96px;height:96px;border-color:rgba(255,255,255,.1);opacity:.5;animation-delay:.5s}
@keyframes rot-pulse{50%{opacity:.5}}
@keyframes rot-ping{75%,100%{transform:scale(2);opacity:0}}
.rot-ring{position:absolute;width:384px;height:384px;border-radius:50%;border:1px solid rgba(255,255,255,.1)}
.rot-node{position:absolute;left:50%;top:50%;width:40px;height:40px;margin:-20px 0 0 -20px;transition:opacity .7s cubic-bezier(.4,0,.2,1)}
.rot-glow{position:absolute;border-radius:50%;pointer-events:none;background:radial-gradient(circle,rgba(255,255,255,.2) 0%,rgba(255,255,255,0) 70%)}
.rot-node.related .rot-glow{animation:rot-pulse 1s cubic-bezier(.4,0,.6,1) infinite}
.rot-dot{position:relative;width:40px;height:40px;padding:0;border-radius:50%;display:grid;place-items:center;
  background:#000;color:#fff;border:2px solid rgba(255,255,255,.4);transition:all .3s cubic-bezier(.4,0,.2,1)}
.rot-node.related .rot-dot{background:rgba(255,255,255,.5);color:#000;border-color:#fff;animation:rot-pulse 2s cubic-bezier(.4,0,.6,1) infinite}
.rot-node.open .rot-dot{background:#fff;color:#000;border-color:#fff;box-shadow:0 10px 15px -3px rgba(255,255,255,.3);transform:scale(1.5)}
.rot-label{position:absolute;top:48px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:12px;font-weight:600;
  letter-spacing:.05em;color:rgba(255,255,255,.7);pointer-events:none;transition:all .3s cubic-bezier(.4,0,.2,1)}
.rot-node.open .rot-label{color:#fff;transform:translateX(-50%) scale(1.25)}
.rot-card{position:absolute;top:80px;left:50%;transform:translateX(-50%);width:min(256px,calc(100vw - 24px));overflow:auto;
  padding:16px 16px 18px;border:1px solid rgba(255,255,255,.3);border-radius:8px;background:rgba(0,0,0,.9);backdrop-filter:blur(16px);
  box-shadow:0 20px 25px -5px rgba(255,255,255,.1);font-size:12px;cursor:auto;text-align:left}
.rot-card[hidden]{display:none}
.rot-node.open::after{content:'';position:absolute;top:68px;left:50%;width:1px;height:12px;background:rgba(255,255,255,.5)}
.rot-card-head{display:flex;justify-content:space-between;align-items:center}
.rot-badge{border:1px solid;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:600}
.rot-completed{color:#fff;background:#000;border-color:#fff}
.rot-in-progress{color:#000;background:#fff;border-color:#000}
.rot-pending{color:#fff;background:rgba(0,0,0,.4);border-color:rgba(255,255,255,.5)}
.rot-date,.rot-mono{font-family:ui-monospace,monospace;color:rgba(255,255,255,.5)}
.rot-mono{color:#fff}
.rot-card h3{margin:10px 0 0;font-size:14px;font-weight:600;letter-spacing:-.01em;line-height:1}
.rot-card p{margin:12px 0 0;line-height:1.5;color:rgba(255,255,255,.8)}
.rot-section{margin-top:16px;padding-top:12px;border-top:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.8)}
.rot-energy{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
.rot-energy span,.rot-card h4{display:flex;align-items:center;gap:4px}
.rot-bar{height:4px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}
.rot-bar i{display:block;height:100%;background:linear-gradient(90deg,#3b82f6,#a855f7)}
.rot-card h4{margin:0 0 8px;font-size:12px;font-weight:500;letter-spacing:.05em;text-transform:uppercase;color:rgba(255,255,255,.7)}
.rot-links{display:flex;flex-wrap:wrap;gap:4px}
.rot-go{display:flex;align-items:center;gap:4px;height:24px;padding:0 8px;border:1px solid rgba(255,255,255,.2);border-radius:0;
  background:transparent;color:rgba(255,255,255,.8);font-size:12px;transition:all .15s}
.rot-go:hover{background:rgba(255,255,255,.1);color:#fff}
.rot-go svg{color:rgba(255,255,255,.6)}
.rot-hint{position:absolute;bottom:10px;left:0;right:0;margin:0;text-align:center;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.4);pointer-events:none}
.rot:has(.rot-node.open) .rot-hint{display:none}
@media(max-height:320px){.rot-hint{display:none}}`,
    js: `const still=matchMedia('(prefers-reduced-motion:reduce)').matches;
const root=document.querySelector('.rot'),orbit=root.querySelector('.rot-orbit'),ring=root.querySelector('.rot-ring');
const nodes=[...root.querySelectorAll('.rot-node')].map(el=>({el,id:Number(el.dataset.id),related:el.dataset.related.split(',').filter(Boolean).map(Number),dot:el.querySelector('.rot-dot'),card:el.querySelector('.rot-card')}));
let angle=0,auto=!still,active=null,tween=null,last=performance.now();
// Upstream's orbit is a fixed 200px; a card frame is shorter than that orbit is wide.
const radius=()=>Math.max(70,Math.min(200,Math.min(innerWidth,innerHeight)/2-46));
function place(){
  const r=radius();
  ring.style.width=ring.style.height=r*1.92+'px';
  nodes.forEach((node,index)=>{
    const rad=(((index/nodes.length)*360+angle)%360)*Math.PI/180,open=node.id===active;
    node.el.style.transform='translate('+r*Math.cos(rad)+'px,'+r*Math.sin(rad)+'px)';
    node.el.style.zIndex=open?200:Math.round(100+50*Math.cos(rad));
    node.el.style.opacity=open?1:Math.max(.4,Math.min(1,.4+.6*((1+Math.sin(rad))/2)));
    if(open)node.card.style.maxHeight=Math.max(120,innerHeight/2+r-92)+'px';
  });
}
function close(resume=true){
  for(const node of nodes){node.el.classList.remove('open','related');node.dot.setAttribute('aria-expanded','false');node.card.hidden=true;}
  active=null;tween=null;if(resume)auto=!still;
}
function open(id){
  if(active===id){close();return}
  close(false);
  const index=nodes.findIndex(node=>node.id===id),node=nodes[index];
  active=id;auto=false;
  node.el.classList.add('open');node.dot.setAttribute('aria-expanded','true');node.card.hidden=false;
  for(const other of nodes)if(node.related.includes(other.id))other.el.classList.add('related');
  // Turn the opened phase to the top (270deg) by the short way round.
  const delta=(((270-(index/nodes.length)*360-angle)%360)+540)%360-180;
  if(still)angle+=delta;else tween={from:angle,to:angle+delta,start:performance.now()};
  place();
}
function frame(now){
  const step=Math.min(64,now-last);last=now;
  if(tween){const t=Math.min(1,(now-tween.start)/700);angle=tween.from+(tween.to-tween.from)*(1-Math.pow(1-t,3));if(t===1)tween=null;place();}
  else if(auto){angle=(angle+step*.006)%360;place();}
  requestAnimationFrame(frame);
}
for(const node of nodes)node.dot.onclick=()=>open(node.id);
for(const go of root.querySelectorAll('.rot-go'))go.onclick=event=>{event.stopPropagation();open(Number(go.dataset.go));nodes.find(node=>node.id===active)?.dot.focus();};
root.addEventListener('click',event=>{if(event.target===root||event.target===orbit||event.target===ring)close();});
addEventListener('keydown',event=>{if(event.key==='Escape'&&active!==null){const node=nodes.find(item=>item.id===active);close();node.dot.focus();}});
addEventListener('resize',place);
place();requestAnimationFrame(frame);`,
  },
  {
    // After Aceternity UI's ContainerScroll, as published on 21st.dev: the device frame, its
    // 20° tilt, the 0.7→0.9 / 1.05→1 scales either side of 768px and the 100px title lift
    // are upstream's. Upstream scrolls a 60–80rem section past the page; a card frame is a
    // few hundred pixels tall, so here the stage is pinned inside its own viewport and the
    // same progress is spent while it holds still.
    id: "21st-container-scroll",
    title: "Container scroll tilt",
    category: "Scroll effects",
    description:
      "A device frame tipped back 20° lowers itself flat as you scroll, while the headline lifts away above it. After Aceternity UI's ContainerScroll on 21st.dev.",
    tag: "21st.dev",
    html: `<div class="cscroll"><div class="cscroll-viewport"><section class="cscroll-track"><div class="cscroll-stage"><div class="cscroll-title"><small>SCROLL INSIDE ↓</small><h1>Unleash the power of<br><span>Scroll Animations</span></h1></div><div class="cscroll-card"><div class="cscroll-screen">${DASHBOARD}</div></div></div></section><div class="cscroll-end">END OF SECTION</div></div></div>`,
    css: `body{display:block!important}.cscroll{height:100vh}.cscroll-viewport{position:relative;height:100vh;overflow:auto;overscroll-behavior:contain}.cscroll-track{height:220vh}
.cscroll-stage{position:sticky;top:0;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:12px;perspective:1000px}
.cscroll-title{max-width:64rem;text-align:center;will-change:transform}.cscroll-title small{display:block;margin-bottom:12px}.cscroll-title h1{font-size:clamp(14px,3.6vw,30px);letter-spacing:-.03em;font-weight:600}
.cscroll-title span{display:inline-block;margin-top:4px;font-size:clamp(26px,9vw,96px);font-weight:700;letter-spacing:-.05em;line-height:1;color:var(--accent)}
.cscroll-card{width:min(100%,64rem);height:min(58vh,40rem);margin-top:-6px;padding:clamp(6px,1.4vw,24px);border:4px solid #6c6c6c;border-radius:clamp(16px,3vw,30px);background:#222;
  box-shadow:0 0 #0000004d,0 9px 20px #0000004a,0 37px 37px #00000042,0 84px 50px #00000026,0 149px 60px #0000000a,0 233px 65px #00000003;will-change:transform}
.cscroll-screen{height:100%;overflow:hidden;border-radius:clamp(10px,1.6vw,16px);background:#18181b;container-type:size}
.cscroll-end{padding:30px 0 40px;text-align:center;font-size:8px;letter-spacing:.16em;color:#6f7d68}
.dash{display:flex;height:100%;font-size:clamp(5px,1.55cqw,13px);color:#e4e4e7;text-align:left}
.dash small{display:block;font-size:.8em;letter-spacing:0;color:#a1a1aa}
.dash-side{flex:0 0 18%;display:flex;flex-direction:column;gap:.4em;padding:1.4em 1em;background:#111113;border-right:1px solid #27272a}
.dash-logo{width:1.8em;height:1.8em;border-radius:.5em;margin-bottom:1em;background:var(--accent)}
.dash-nav{display:flex;align-items:center;gap:.6em;padding:.45em .6em;border-radius:.4em;color:#a1a1aa;white-space:nowrap;overflow:hidden}
.dash-nav i{flex:none;width:.8em;height:.8em;border-radius:.2em;background:#3f3f46}
.dash-nav.on{background:#27272a;color:#fafafa}.dash-nav.on i{background:var(--accent)}
.dash-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:1em;padding:1.4em 1.6em}
.dash-head{display:flex;justify-content:space-between;align-items:center}.dash-head strong{font-size:1.6em;letter-spacing:-.02em}
.dash-pill{padding:.35em .8em;border:1px solid #3f3f46;border-radius:999px;color:#a1a1aa;font-size:.85em}
.dash-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:.8em}
.dash-stat{padding:.8em 1em;border:1px solid #27272a;border-radius:.6em;background:#1f1f23}
.dash-stat strong{display:block;margin:.2em 0;font-size:1.5em;letter-spacing:-.02em}.dash-stat em{font-style:normal;font-size:.8em;color:#86efac}
.dash-chart{flex:1;min-height:0;display:flex;flex-direction:column;padding:.8em 1em;border:1px solid #27272a;border-radius:.6em;background:#1f1f23;color:var(--accent)}
.dash-chart svg{flex:1;width:100%;min-height:0;margin-top:.4em}
.dash-rows{display:grid;gap:.45em}
.dash-row{display:grid;grid-template-columns:2fr 1fr 1.2fr;align-items:center;gap:1em;padding:.45em .2em;border-top:1px solid #27272a}
.dash-row em{font-style:normal;color:#a1a1aa}.dash-row i{height:.4em;border-radius:999px;background:#27272a;overflow:hidden}.dash-row b{display:block;height:100%;background:var(--accent)}`,
    js: `if(!matchMedia('(prefers-reduced-motion:reduce)').matches){
const viewport=document.querySelector('.cscroll-viewport'),track=document.querySelector('.cscroll-track');
const title=document.querySelector('.cscroll-title'),card=document.querySelector('.cscroll-card');
const mix=(from,to,progress)=>from+(to-from)*progress;
let frame=0;
function paint(){
  frame=0;
  // Progress runs from the track's top meeting the viewport's top to its bottom meeting the viewport's bottom.
  const span=Math.max(1,track.offsetHeight-viewport.clientHeight);
  const progress=Math.min(1,Math.max(0,(viewport.scrollTop-track.offsetTop)/span));
  const[from,to]=innerWidth<=768?[0.7,0.9]:[1.05,1];
  const lift=Math.min(100,viewport.clientHeight*0.12);
  title.style.transform='translateY('+(-lift*progress)+'px)';
  card.style.transform='rotateX('+mix(20,0,progress)+'deg) scale('+mix(from,to,progress)+')';
}
const queue=()=>{if(!frame)frame=requestAnimationFrame(paint)};
viewport.addEventListener('scroll',queue,{passive:true});
addEventListener('resize',queue);
paint();
}`,
  },
  {
    // After the Testimonials Columns on 21st.dev: three columns at 15s, 19s and 17s so
    // they never line up, the 25%/75% fade mask, and the second and third columns
    // dropping out below 768px and 1024px are upstream's. Motion's endless linear tween
    // is a CSS animation here, which the reduced-motion rule already stills.
    id: "21st-testimonials-columns",
    title: "Testimonial columns",
    category: "Layout blocks",
    description:
      "Three columns of testimonials drift upward at different speeds and fade at the edges, a wall of social proof that never lines up. After the Testimonials Columns on 21st.dev.",
    tag: "21st.dev",
    html: `<section class="tcol-wrap" aria-label="Testimonials"><header class="tcol-head"><span class="tcol-badge">Testimonials</span><h2>What our users say</h2><p>See what our customers have to say about us.</p></header><div class="tcol-cols">${testimonialColumn(0, 15, 1)}${testimonialColumn(3, 19, 2)}${testimonialColumn(6, 17, 3)}</div></section>`,
    css: `body{display:block!important}
.tcol-wrap{height:100vh;display:flex;flex-direction:column;align-items:center;padding:clamp(14px,4vh,48px) 16px 0}
.tcol-head{display:flex;flex-direction:column;align-items:center;max-width:540px;text-align:center;animation:tcol-rise .8s .1s cubic-bezier(.16,1,.3,1) both}
@keyframes tcol-rise{from{opacity:0;transform:translateY(20px)}}
.tcol-badge{padding:4px 16px;border:1px solid #2f362e;border-radius:8px;font-size:clamp(11px,1.6vw,14px)}
.tcol-head h2{margin:clamp(8px,2vh,20px) 0 0;font-size:clamp(20px,4.2vw,48px);font-weight:700;letter-spacing:-.05em;line-height:1.1}
.tcol-head p{margin:clamp(6px,2vh,20px) 0 0;font-size:clamp(12px,1.6vw,16px);opacity:.75}
.tcol-cols{flex:1;min-height:0;width:100%;max-height:740px;margin-top:clamp(12px,4vh,40px);display:flex;justify-content:center;gap:24px;overflow:hidden;
  -webkit-mask-image:linear-gradient(to bottom,transparent,#000 25%,#000 75%,transparent);mask-image:linear-gradient(to bottom,transparent,#000 25%,#000 75%,transparent)}
.tcol{flex:0 1 20rem;min-width:0}
.tcol-track,.tcol-copy{display:flex;flex-direction:column;gap:24px}
.tcol-track{padding-bottom:24px;animation:tcol-drift linear infinite}
@keyframes tcol-drift{to{transform:translateY(-50%)}}
.tcol-card{margin:0;padding:clamp(18px,3.2vw,40px);font-size:clamp(13px,1.5vw,16px);border:1px solid #2a3029;border-radius:24px;background:#111412;
  box-shadow:0 10px 15px -3px color-mix(in srgb,var(--accent) 10%,transparent),0 4px 6px -4px color-mix(in srgb,var(--accent) 10%,transparent)}
.tcol-card blockquote{margin:0;line-height:1.5}
.tcol-card figcaption{display:flex;align-items:center;gap:8px;margin-top:20px}
.tcol-avatar{flex:none;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-size:13px;font-weight:700;color:#111412}
.tcol-card b{display:block;font-weight:500;letter-spacing:-.02em;line-height:1.25}
.tcol-card small{display:block;font-size:inherit;letter-spacing:-.02em;line-height:1.25;color:inherit;opacity:.6}
@media(max-width:767px){.tcol-2{display:none}}
@media(max-width:1023px){.tcol-3{display:none}}
@media(max-height:320px){.tcol-head p{display:none}}`,
    js: "",
  },
];
