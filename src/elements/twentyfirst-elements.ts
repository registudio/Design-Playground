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
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  barChart: '<line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/>',
  shieldCheck: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
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

/**
 * Upstream's default slides: no photos, each a layered-ridge landscape painted on a
 * canvas from a palette and a seed. They are what the component shows with no assets
 * at all, and so they paint offline and in an exported ZIP too.
 */
const LENS_SLIDES = [
  { title: "First Light", caption: "Haze lifting off the eastern ridges.", palette: "dawn", seed: 3 },
  { title: "High Pass", caption: "Cold air, clear to the far range.", palette: "alpine", seed: 8 },
  { title: "Ember Hour", caption: "The last of the sun on the valley floor.", palette: "dusk", seed: 14 },
  { title: "Still Valley", caption: "Morning mist that never quite lifts.", palette: "mist", seed: 21 },
  { title: "Rose Ridge", caption: "Five ridges, one long exhale.", palette: "dawn", seed: 34 },
  { title: "Blue Hour", caption: "Pines going dark against the snow.", palette: "alpine", seed: 55 },
] as const;
const CHEVRON = (d: string) => `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="${d}" stroke="currentColor" stroke-width="1.4"/></svg>`;

/**
 * The three preview panels in the feature block. Upstream shows a photo in each; these
 * draw what each caption says the photo is (a shared workspace, a funnel dashboard, an
 * audit log) in the block's own greys, so they read as part of it and paint offline.
 */
const FEATURE_ART = {
  collaboration: `<div class="ft-art ft-doc"><i style="width:62%"></i><i style="width:88%"></i><i style="width:74%"></i><i style="width:81%"></i><i style="width:46%"></i><span class="ft-cursor" style="left:58%;top:30%">Sarah</span><span class="ft-cursor ft-cursor-b" style="left:24%;top:58%">Marcus</span><span class="ft-comment"><b>PN</b>Can we tighten this intro?</span></div>`,
  analytics: `<div class="ft-art ft-funnel">${[["Visited", 100], ["Signed up", 64], ["Activated", 41], ["Retained", 27]].map(([label, value]) => `<div><span>${label}</span><i style="width:${value}%"></i><em>${value}%</em></div>`).join("")}</div>`,
  security: `<div class="ft-art ft-audit">${[["09:41", "SSO sign-in", "okta"], ["09:38", "Role changed", "admin"], ["09:12", "Export created", "csv"], ["08:57", "MFA verified", "totp"], ["08:30", "Policy updated", "eu-1"]].map(([time, event, detail]) => `<div><time>${time}</time><span>${event}</span><em>${detail}</em></div>`).join("")}</div>`,
};

/** Upstream's rows, unchanged apart from the photos. */
const FEATURE_ROWS = [
  {
    eyebrow: "Collaboration", icon: "users", art: "collaboration",
    title: "Work as one, ship faster together",
    body: "One shared workspace where roles, live presence, and threaded comments keep everyone aligned.",
    bullets: ["Granular roles: viewer, editor, admin", "Real-time presence and inline comments", "Version history with one-click restore", "Guest access with expiring links"],
    cta: "Explore Collaboration", imgAlt: "Team collaboration interface showing shared workspace",
    avatars: [["Sarah Kim", "SK"], ["Marcus Webb", "MW"], ["Priya Nair", "PN"]],
    stat: ["4.2×", "Faster Review Cycles"],
  },
  {
    eyebrow: "Analytics", icon: "barChart", art: "analytics",
    title: "Decisions grounded in real data",
    body: "Turn raw events into clear, actionable dashboards in minutes, with no SQL or data-engineering bottleneck.",
    bullets: ["Sub-second query engine for large datasets", "Funnel, retention, and cohort views built-in", "Scheduled email and Slack reports", "CSV and REST API export"],
    cta: "See Analytics In Action", imgAlt: "Analytics dashboard with funnel and retention charts",
    avatars: [["James Okafor", "JO"], ["Lena Strauss", "LS"]],
    stat: ["98%", "Query Success Rate"],
  },
  {
    eyebrow: "Security", icon: "shieldCheck", art: "security",
    title: "Enterprise-grade protection, zero friction",
    body: "Controls your compliance team will love and developers barely notice, with SSO, MFA, audit logs, and data residency built in.",
    bullets: ["SOC 2 Type II and ISO 27001 certified", "SSO via SAML 2.0 and OIDC", "Immutable audit log with SIEM export", "EU and US data-residency regions"],
    cta: "Review Security Docs", imgAlt: "Security controls panel with audit log",
    avatars: [["Diana Reyes", "DR"], ["Tom Eriksen", "TE"], ["Aiko Tanaka", "AT"]],
    stat: ["0", "Reported Breaches"],
  },
] as const;

const featureRow = (row: (typeof FEATURE_ROWS)[number]) => `<div class="ft-row">
  <div class="ft-copy">
    <div class="ft-eyebrow"><span class="ft-chip">${icon(row.icon, 14)}</span><span>${row.eyebrow}</span></div>
    <h3>${row.title}</h3>
    <p>${row.body}</p>
    <ul>${row.bullets.map(bullet => `<li><span class="ft-tick">${icon("check", 10)}</span>${bullet}</li>`).join("")}</ul>
    <div class="ft-proof"><div class="ft-avatars">${row.avatars.map(([name, initials]) => `<span class="ft-avatar" role="img" aria-label="${name}">${initials}</span>`).join("")}</div><div class="ft-stat"><b>${row.stat[0]}</b><span>${row.stat[1]}</span></div></div>
    <div><button type="button" class="ft-cta">${row.cta}${icon("arrowRight", 16)}</button></div>
  </div>
  <div class="ft-media"><figure class="ft-frame" role="img" aria-label="${row.imgAlt}">${FEATURE_ART[row.art]}<figcaption><span class="ft-chip ft-chip-sm">${icon(row.icon, 12)}</span>${row.eyebrow} Preview</figcaption></figure></div>
</div>`;

export const TWENTYFIRST_ELEMENTS: TwentyFirstElement[] = [
  {
    id: "21st-radial-orbital-timeline",
    title: "Radial orbital timeline",
    category: "Charts & data viz",
    description:
      "Project phases orbit a pulsing core. Open one and the orbit turns it to the top, shows its status, date and energy level, and lights up the phases it connects to. After Jatin Yadav's Radial Orbital Timeline on 21st.dev.",
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
      "A device frame tipped back 20° lowers itself flat as you scroll, while the headline lifts away above it. After Aceternity UI's ContainerScroll by Manu Arora, on 21st.dev.",
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
      "Three columns of testimonials drift upward at different speeds and fade at the edges, a wall of social proof that never lines up. After Efferd's Testimonials Columns on 21st.dev.",
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
  {
    // After the Lens Zoom Carousel on 21st.dev: the 1050ms landing, the 1.35 start scale
    // and its inverse for going back, the two screen-blended ghosts and their 40ms stagger,
    // and the painted landscapes are upstream's, the painter line for line. What differs:
    // the canvas is sized to the frame, autoplay pauses while focus is inside and is off
    // under reduced motion, where a slide changes in place rather than zooming.
    id: "21st-lens-zoom-carousel",
    title: "Lens zoom carousel",
    category: "Carousels",
    description:
      "A full-bleed carousel where the next picture rushes in like a fast zoom pull, landing out of a magnified blur with two ghost copies trailing it while the old one falls back and darkens. Going back zooms out. After Kedhareswer Naidu's Zoom Blur Image Carousel (lens-zoom-carousel) on 21st.dev.",
    tag: "21st.dev",
    html: `<div class="lz-root" role="region" aria-roledescription="carousel" aria-label="Image carousel" tabindex="0" data-moving="0" data-paused="0">
<div class="lz-base"><img class="lz-img" alt="" draggable="false"></div>
<div class="lz-stage"></div>
<div class="lz-shade" aria-hidden="true"></div>
<div class="lz-text" aria-hidden="true"><span class="lz-line lz-title"><span>${LENS_SLIDES[0].title}</span></span><span class="lz-line lz-cap"><span>${LENS_SLIDES[0].caption}</span></span></div>
<div class="lz-nav"><span class="lz-count" aria-hidden="true">01 / ${String(LENS_SLIDES.length).padStart(2, "0")}</span><button type="button" class="lz-btn lz-prev" aria-label="Previous">${CHEVRON("M10 3 5 8l5 5")}</button><button type="button" class="lz-btn lz-next" aria-label="Next">${CHEVRON("m6 3 5 5-5 5")}</button></div>
<div class="lz-track" aria-hidden="true"><div class="lz-fill"></div></div>
<div class="lz-sr" aria-live="polite"></div>
</div>`,
    css: `.lz-root{--lz-ink:#fff;--lz-d:1050ms;--lz-auto:6000ms;position:fixed;inset:0;overflow:hidden;background:#0d0d0f;color:var(--lz-ink);user-select:none;-webkit-user-select:none;touch-action:pan-y;outline:none}
.lz-root:focus-visible{box-shadow:inset 0 0 0 2px var(--lz-ink)}
.lz-base{position:absolute;inset:0;background:linear-gradient(#e7b7a5,#f8e8d6 60%,#3a2a3b 61%);transition:filter .9s ease,transform 1.4s cubic-bezier(.2,.7,.2,1)}
.lz-root[data-moving='1'] .lz-base{filter:brightness(.42);transform:scale(1.04)}
.lz-img{position:absolute;inset:0;width:100%;height:100%;max-width:none;object-fit:cover;display:block;pointer-events:none}
.lz-base .lz-img:not([src]){display:none}
.lz-in{position:absolute;inset:0;overflow:hidden;animation:lz-show var(--lz-d) cubic-bezier(.2,.75,.2,1) both}
.lz-main{animation:lz-zoom var(--lz-d) cubic-bezier(.16,.8,.2,1) both}
.lz-ghost{opacity:0;mix-blend-mode:screen;animation:lz-ghost var(--lz-d) cubic-bezier(.16,.8,.2,1) both}
.lz-shade{position:absolute;inset:auto 0 0 0;height:46%;background:linear-gradient(to top,rgba(0,0,0,.6),rgba(0,0,0,0));pointer-events:none}
.lz-text{position:absolute;left:clamp(20px,4vw,56px);bottom:clamp(44px,8vh,80px);right:clamp(140px,20vw,280px);pointer-events:none}
.lz-line{display:block;overflow:hidden;padding-bottom:.08em}
.lz-line>span{display:block;animation:lz-rise .9s cubic-bezier(.2,.8,.2,1) both}
.lz-title{font:500 clamp(30px,6vw,84px)/1 ui-serif,Georgia,'Times New Roman',serif;letter-spacing:-.02em}
.lz-cap{margin-top:12px;font:400 14px/1.4 ui-sans-serif,system-ui,sans-serif;opacity:.82;max-width:44ch}
.lz-cap>span{animation-delay:.08s}
.lz-nav{position:absolute;right:clamp(20px,4vw,56px);bottom:clamp(44px,8vh,80px);display:flex;align-items:center;gap:14px}
.lz-count{font:500 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em}
.lz-btn{appearance:none;width:44px;height:44px;border-radius:50%;border:1px solid color-mix(in srgb,var(--lz-ink) 45%,transparent);background:transparent;color:inherit;display:grid;place-items:center;cursor:pointer;transition:background .2s ease,color .2s ease}
.lz-btn:hover{background:var(--lz-ink);color:#0d0d0f}
.lz-btn:focus-visible{outline:2px solid var(--lz-ink);outline-offset:2px}
.lz-track{position:absolute;left:clamp(20px,4vw,56px);right:clamp(20px,4vw,56px);bottom:clamp(20px,3.5vh,36px);height:1px;background:color-mix(in srgb,var(--lz-ink) 28%,transparent)}
.lz-root[data-auto='0'] .lz-track{display:none}
.lz-fill{height:100%;background:var(--lz-ink);transform-origin:left;transform:scaleX(0)}
.lz-fill[data-run='1']{animation:lz-fill var(--lz-auto) linear forwards}
.lz-root[data-paused='1'] .lz-fill{animation-play-state:paused}
.lz-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@keyframes lz-show{from{opacity:0}35%{opacity:1}to{opacity:1}}
@keyframes lz-zoom{from{transform:scale(var(--lz-depth));filter:blur(14px) brightness(1.2)}to{transform:none;filter:none}}
@keyframes lz-ghost{from{transform:scale(var(--lz-g));opacity:.4;filter:blur(6px)}to{transform:scale(1);opacity:0;filter:blur(0)}}
@keyframes lz-rise{from{transform:translateY(105%)}to{transform:none}}
@keyframes lz-fill{to{transform:scaleX(1)}}
@media(max-width:480px){.lz-nav{gap:8px}.lz-btn{width:36px;height:36px}.lz-text{right:clamp(20px,4vw,56px);bottom:clamp(88px,22vh,120px)}}`,
    js: `const still=matchMedia('(prefers-reduced-motion:reduce)').matches;
const SLIDES=${JSON.stringify(LENS_SLIDES)},DEPTH=1.35,AUTOPLAY=6000;
const PALETTES={
  dawn:{top:'#e7b7a5',bottom:'#f8e8d6',sun:'#fff4df',far:'#d2b2bb',near:'#3a2a3b',mist:'255,240,232'},
  alpine:{top:'#7ea5c8',bottom:'#e3ecf2',sun:'#ffffff',far:'#a9bfd0',near:'#1c3044',mist:'236,244,250'},
  dusk:{top:'#2a2450',bottom:'#ef8d60',sun:'#ffd9a6',far:'#93607c',near:'#18121f',mist:'255,196,160'},
  mist:{top:'#c4d0cb',bottom:'#eef1ec',sun:'#ffffff',far:'#aebcb5',near:'#2c3a33',mist:'246,248,245'}};
const wrap=(i,n)=>n?((i%n)+n)%n:0;
const ghostScale=(depth,g)=>depth+(depth-1)*0.6*(g+1);
const pad2=n=>n<10?'0'+n:String(n);
function mulberry32(seed){let a=seed>>>0;return()=>{a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
function hexRgb(h){const v=parseInt(h.replace('#',''),16);return[(v>>16)&255,(v>>8)&255,v&255]}
function mixRgb(a,b,t){const A=hexRgb(a),B=hexRgb(b);return'rgb('+A.map((v,i)=>Math.round(v+(B[i]-v)*t)).join(',')+')'}
// Upstream paints at 1600x1000. The drawing keeps those coordinates, so every slide is
// the same picture, but the canvas is only as many pixels as the frame can show.
const SCALE=Math.min(1,Math.max(innerWidth,innerHeight*1.6)*(devicePixelRatio||1)/1600);
function paintLandscape(seed,palette){
  const w=1600,h=1000,c=document.createElement('canvas');
  c.width=Math.round(w*SCALE);c.height=Math.round(h*SCALE);
  const g=c.getContext('2d');if(!g)return'';
  g.scale(SCALE,SCALE);
  const P=PALETTES[palette]||PALETTES.dawn,r=mulberry32(seed*104729+7);
  const sky=g.createLinearGradient(0,0,0,h*0.72);sky.addColorStop(0,P.top);sky.addColorStop(1,P.bottom);
  g.fillStyle=sky;g.fillRect(0,0,w,h);
  const sx=w*(0.22+r()*0.56),sy=h*(0.26+r()*0.16),sun=hexRgb(P.sun).join(',');
  const halo=g.createRadialGradient(sx,sy,0,sx,sy,w*0.45);
  halo.addColorStop(0,'rgba('+sun+',.85)');halo.addColorStop(0.08,'rgba('+sun+',.55)');halo.addColorStop(1,'rgba('+sun+',0)');
  g.fillStyle=halo;g.fillRect(0,0,w,h);
  g.fillStyle=P.sun;g.beginPath();g.arc(sx,sy,h*0.045,0,Math.PI*2);g.fill();
  const layers=5;
  for(let L=0;L<layers;L++){
    const k=L/(layers-1),base=h*(0.42+k*0.4),amp=h*(0.07+k*0.1);
    const ph=[r(),r(),r(),r()].map(v=>v*Math.PI*2),fr=[1.3+r(),3.1+r()*2,7+r()*4,17+r()*8];
    const ridge=x=>{const u=x/w;return base-amp*(0.55*Math.sin(u*fr[0]+ph[0])+0.28*Math.sin(u*fr[1]+ph[1])+0.12*Math.abs(Math.sin(u*fr[2]+ph[2]))+0.05*Math.sin(u*fr[3]+ph[3]))};
    const mist=g.createLinearGradient(0,base-amp*1.4,0,base+amp*0.4);
    mist.addColorStop(0,'rgba('+P.mist+',0)');mist.addColorStop(1,'rgba('+P.mist+','+(0.55-k*0.35).toFixed(2)+')');
    g.fillStyle=mist;g.fillRect(0,base-amp*1.4,w,amp*1.8);
    const body=g.createLinearGradient(0,base-amp,0,h);
    body.addColorStop(0,mixRgb(P.far,P.near,Math.pow(k,1.3)));body.addColorStop(1,mixRgb(P.far,P.near,Math.min(1,Math.pow(k,1.3)+0.18)));
    g.fillStyle=body;g.beginPath();g.moveTo(0,h);for(let x=0;x<=w;x+=6)g.lineTo(x,ridge(x));g.lineTo(w,ridge(w));g.lineTo(w,h);g.closePath();g.fill();
    if(L>=layers-2){
      g.fillStyle=mixRgb(P.far,P.near,Math.min(1,Math.pow(k,1.3)+0.08));
      for(let x=0;x<w;x+=7+r()*9){
        if(r()<0.35)continue;
        const y=ridge(x)+2,th=h*(0.025+r()*0.035)*(0.6+k),tw=th*0.32;
        g.beginPath();g.moveTo(x,y-th);g.lineTo(x+tw,y);g.lineTo(x-tw,y);g.closePath();g.fill();
      }
    }
  }
  const vig=g.createRadialGradient(w/2,h*0.45,h*0.3,w/2,h/2,w*0.78);
  vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(0,0,0,.32)');
  g.fillStyle=vig;g.fillRect(0,0,w,h);
  const grain=g.getImageData(0,0,c.width,c.height),d=grain.data;
  for(let i=0;i<d.length;i+=4){const v=(r()-0.5)*14;d[i]+=v;d[i+1]+=v;d[i+2]+=v}
  g.putImageData(grain,0,0);
  return c.toDataURL('image/jpeg',0.88);
}
const root=document.querySelector('.lz-root'),baseImg=root.querySelector('.lz-base .lz-img'),stage=root.querySelector('.lz-stage');
const text=root.querySelector('.lz-text'),count=root.querySelector('.lz-count'),fill=root.querySelector('.lz-fill'),live=root.querySelector('.lz-sr');
const n=SLIDES.length,srcs=[];
const src=i=>srcs[i]||(srcs[i]=paintLandscape(SLIDES[i].seed,SLIDES[i].palette));
let index=0,moving=false,seen=true,focused=false;
// The current slide is painted now; the rest when the frame is idle, one at a time.
baseImg.src=src(0);baseImg.alt=SLIDES[0].title;
const idle=window.requestIdleCallback||(fn=>setTimeout(fn,80));
(function next(i){if(i<n)idle(()=>{src(i);next(i+1)})})(1);
// No autoplay under reduced motion: a carousel that moves on its own is the motion being asked away.
const auto=!still&&AUTOPLAY>0&&n>1;
root.dataset.auto=auto?'1':'0';
const syncPause=()=>{root.dataset.paused=!seen||document.hidden||focused?'1':'0'};
new IntersectionObserver(([entry])=>{seen=entry.isIntersecting;syncPause()}).observe(root);
document.addEventListener('visibilitychange',syncPause);
root.addEventListener('focusin',()=>{focused=true;syncPause()});
root.addEventListener('focusout',e=>{if(!root.contains(e.relatedTarget)){focused=false;syncPause()}});
function restartFill(){fill.dataset.run='0';if(!auto)return;void fill.offsetWidth;fill.dataset.run='1'}
function caption(i){
  const s=SLIDES[i];
  text.innerHTML='<span class="lz-line lz-title"><span></span></span><span class="lz-line lz-cap"><span></span></span>';
  text.querySelector('.lz-title>span').textContent=s.title;text.querySelector('.lz-cap>span').textContent=s.caption;
  count.textContent=pad2(i+1)+' / '+pad2(n);
  live.textContent='Slide '+(i+1)+' of '+n+': '+s.title;
}
function land(to){index=to;baseImg.src=src(to);baseImg.alt=SLIDES[to].title;moving=false;root.dataset.moving='0';restartFill()}
function go(dir){
  if(moving||n<2)return;
  const to=wrap(index+dir,n);
  caption(to);fill.dataset.run='0';
  if(still){land(to);return}
  moving=true;root.dataset.moving='1';
  const depth=dir>=0?DEPTH:1/DEPTH,image=src(to),layer=document.createElement('div');
  layer.className='lz-in';layer.setAttribute('aria-hidden','true');layer.style.setProperty('--lz-depth',String(depth));
  const img=cls=>{const el=document.createElement('img');el.className='lz-img '+cls;el.src=image;el.alt='';el.draggable=false;return el};
  layer.append(img('lz-main'));
  for(const g of[1,0]){const ghost=img('lz-ghost');ghost.style.setProperty('--lz-g',String(ghostScale(depth,g)));ghost.style.animationDelay=g*40+'ms';layer.append(ghost)}
  layer.addEventListener('animationend',e=>{if(e.target!==layer)return;land(to);layer.remove()});
  stage.append(layer);
}
fill.addEventListener('animationend',()=>go(1));
root.querySelector('.lz-prev').onclick=()=>go(-1);
root.querySelector('.lz-next').onclick=()=>go(1);
for(const b of root.querySelectorAll('.lz-btn'))b.addEventListener('pointerdown',e=>e.stopPropagation());
root.addEventListener('keydown',e=>{if(e.key==='ArrowRight')go(1);else if(e.key==='ArrowLeft')go(-1);else return;e.preventDefault()});
let down=null;
root.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY}});
root.addEventListener('pointerup',e=>{const s=down;down=null;if(!s)return;const dx=e.clientX-s.x;if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(e.clientY-s.y))go(dx<0?1:-1)});
caption(0);restartFill();`,
  },
  {
    // After the Features block (features-2) on 21st.dev: the badge and intro, three rows
    // that alternate sides from 768px, the eyebrow chip, tick list, avatar stack with its
    // stat, outline button and captioned preview are upstream's, in shadcn's dark neutral
    // tokens. The section is taller than any frame, so the frame scrolls inside itself.
    id: "21st-features-block",
    title: "Alternating features block",
    category: "Layout blocks",
    description:
      "A product features section: three rows that alternate sides, each with an eyebrow, a tick list, an avatar stack beside a headline stat, a call to action and a captioned preview. After the Features block on 21st.dev.",
    tag: "21st.dev",
    html: `<section class="ft"><div class="ft-inner">
<header class="ft-head"><span class="ft-badge">Platform</span><h2>Built for every part of your workflow</h2><p>Acme brings collaboration, analytics, and security into one cohesive platform, so nothing falls between the cracks.</p></header>
${FEATURE_ROWS.map(featureRow).join('\n<hr class="ft-rule">\n')}
</div></section>`,
    css: `.ft{--bg:#09090b;--fg:#fafafa;--muted:#27272a;--muted-fg:#a1a1aa;--border:#27272a;--primary:#fafafa;--primary-fg:#18181b;
  position:fixed;inset:0;overflow:auto;background:var(--bg);color:var(--fg);font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;padding:clamp(32px,8vh,96px) 24px}
.ft-inner{max-width:64rem;margin:0 auto}
.ft-head{max-width:36rem;margin:0 auto clamp(24px,8vh,80px);text-align:center}
.ft-badge{display:inline-flex;margin-bottom:20px;padding:2px 10px;border:1px solid var(--border);border-radius:999px;font-size:12px;font-weight:600}
.ft-head h2{margin:0;font-size:clamp(26px,4.4vw,36px);font-weight:700;letter-spacing:-.025em;line-height:1.15}
.ft-head p{margin:16px 0 0;font-size:16px;line-height:1.625;color:var(--muted-fg)}
.ft-row{display:flex;flex-direction:column;gap:40px;padding:64px 0}
.ft-copy{flex:1;display:flex;flex-direction:column;gap:24px}
.ft-eyebrow{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted-fg)}
.ft-chip{flex:none;width:24px;height:24px;display:grid;place-items:center;border:1px solid var(--border);border-radius:6px;background:var(--muted);color:var(--muted-fg)}
.ft-chip-sm{width:20px;height:20px;background:var(--bg)}
.ft-copy h3{margin:0;font-size:clamp(24px,3vw,28px);font-weight:700;letter-spacing:-.025em;line-height:1.375}
.ft-copy p{margin:0;line-height:1.625;color:var(--muted-fg)}
.ft-copy ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}
.ft-copy li{display:flex;align-items:center;gap:12px;font-size:14px}
.ft-tick{flex:none;width:18px;height:18px;display:grid;place-items:center;border-radius:6px;background:var(--primary);color:var(--primary-fg)}
.ft-proof{display:flex;align-items:center;gap:16px;padding-top:20px;border-top:1px solid var(--border)}
.ft-avatars{display:flex}
.ft-avatar{width:28px;height:28px;margin-left:-8px;display:grid;place-items:center;border:2px solid var(--bg);border-radius:50%;background:var(--muted);font-size:10px;color:var(--fg)}
.ft-avatar:first-child{margin-left:0}
.ft-stat{display:flex;align-items:baseline;gap:6px}
.ft-stat b{font-size:18px;font-variant-numeric:tabular-nums}
.ft-stat span{font-size:12px;color:var(--muted-fg)}
.ft-cta{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 12px;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--fg);font-size:14px;font-weight:500;transition:background .15s}
.ft-cta:hover{background:var(--muted)}
.ft-media{flex:1;display:flex;align-items:center;justify-content:center}
.ft-frame{position:relative;width:100%;aspect-ratio:4/3;margin:0;overflow:hidden;border:1px solid var(--border);border-radius:8px;background:var(--muted)}
.ft-frame figcaption{position:absolute;inset:auto 0 0 0;display:flex;align-items:center;gap:8px;padding:10px 16px;border-top:1px solid var(--border);
  background:rgba(9,9,11,.8);backdrop-filter:blur(4px);font-size:11px;font-weight:500;letter-spacing:.025em;color:var(--muted-fg)}
.ft-rule{height:1px;margin:0;border:0;background:var(--border)}
.ft-art{position:absolute;inset:0 0 41px;padding:8%;background:linear-gradient(160deg,#1c1c20,#121214)}
.ft-doc{display:flex;flex-direction:column;gap:10px;padding-top:10%}
.ft-doc i{display:block;height:8px;border-radius:4px;background:#3f3f46}
.ft-cursor{position:absolute;padding:2px 7px;border-radius:4px 4px 4px 0;background:#e4e4e7;color:#18181b;font-size:10px;font-weight:600}
.ft-cursor::before{content:'';position:absolute;left:-9px;top:-13px;width:11px;height:15px;background:inherit;clip-path:polygon(0 0,100% 68%,52% 66%,34% 100%)}
.ft-cursor-b{background:#71717a;color:#fafafa}
.ft-comment{position:absolute;right:7%;bottom:12%;display:flex;align-items:center;gap:8px;max-width:70%;padding:8px 10px;border:1px solid #3f3f46;border-radius:8px;background:#18181b;font-size:11px;color:#d4d4d8}
.ft-comment b{flex:none;width:20px;height:20px;display:grid;place-items:center;border-radius:50%;background:#3f3f46;font-size:8px}
.ft-funnel{display:flex;flex-direction:column;justify-content:center;gap:12px}
.ft-funnel div{display:grid;grid-template-columns:5.5em 1fr 2.6em;align-items:center;gap:10px;font-size:11px;color:#a1a1aa}
.ft-funnel i{display:block;height:14px;border-radius:3px;background:linear-gradient(90deg,#d4d4d8,#71717a)}
.ft-funnel em{font-style:normal;text-align:right;font-variant-numeric:tabular-nums;color:#e4e4e7}
.ft-audit{display:flex;flex-direction:column;justify-content:center;gap:2px;font-size:11px}
.ft-audit div{display:grid;grid-template-columns:3.4em 1fr auto;gap:10px;padding:6px 8px;border-bottom:1px solid #27272a;color:#d4d4d8}
.ft-audit time,.ft-audit em{font-family:ui-monospace,monospace;font-style:normal;color:#71717a}
@media(min-width:640px){.ft-copy h3{line-height:1.375}}
@media(min-width:768px){.ft-row{flex-direction:row;align-items:center;gap:80px}.ft-row:nth-of-type(even){flex-direction:row-reverse}.ft-frame{max-width:24rem}}`,
    js: "",
  },
];
