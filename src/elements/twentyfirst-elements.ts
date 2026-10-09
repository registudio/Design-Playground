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

/* ── Contribution skyline ───────────────────────────────────────────────────── */

/**
 * After Kedhareswer Naidu's Contribution Skyline on 21st.dev. The scene maths is
 * upstream's, carried over function for function: the seeded sample year, the grid and
 * its 95th-percentile levels, the streaks, the camera that swings from straight down to
 * the isometric corner, the wave that raises each week's bars, the painter's order and
 * the hit test. The React shell around it (header, toggle, stat blocks, tooltip, legend)
 * is rebuilt as plain DOM, and the card takes the playground's dark page, so the
 * component's own theme reading picks GitHub's dark palette.
 */
const SKYLINE_GRID = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1" fill="currentColor"/><rect x="9" y="1.5" width="5.5" height="5.5" rx="1" fill="currentColor"/><rect x="1.5" y="9" width="5.5" height="5.5" rx="1" fill="currentColor"/><rect x="9" y="9" width="5.5" height="5.5" rx="1" fill="currentColor"/></svg>`;
const SKYLINE_CUBE = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M8 1.2 14.2 4.6v6.8L8 14.8 1.8 11.4V4.6Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M1.8 4.6 8 8l6.2-3.4M8 8v6.8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`;

const SKYLINE_HTML = `<section class="sk">
<header class="sk-head"><h3 class="sk-title"></h3><div class="sk-toggle" role="group" aria-label="Chart view"><span class="sk-thumb" aria-hidden="true"></span><button type="button" data-v="2d" aria-label="Flat heat map" title="Flat heat map">${SKYLINE_GRID}</button><button type="button" data-v="3d" aria-label="3D skyline" title="3D skyline">${SKYLINE_CUBE}</button></div></header>
<div class="sk-frame"><div class="sk-pad"><div class="sk-stage"><canvas tabindex="0" role="img"></canvas><div class="sk-corner sk-tr" aria-hidden="true"></div><div class="sk-corner sk-bl" aria-hidden="true"></div></div>
<div class="sk-tip" role="tooltip" aria-hidden="true"><strong></strong><span></span><i aria-hidden="true"></i></div></div>
<div class="sk-rowwrap"><div class="sk-rowin"><div class="sk-row"></div></div></div>
<div class="sk-foot"><span class="sk-hints"><span>Hover a day for details · arrow keys to explore</span><span>Drag to orbit · double-click to reset</span></span><div class="sk-legend"><span>Less</span><span class="sk-swatches"></span><span>More</span></div></div></div>
<p class="sk-sr" aria-live="polite"></p></section>`;

const SKYLINE_CSS = `body{display:block!important;overflow:auto!important;height:auto!important;min-height:100vh;padding:16px}
.sk{--bg:#141815;--fg:#eef0e8;--line:#2b312c;--muted:#8f998d;--accent:#39d353;--ease:cubic-bezier(.65,0,.35,1);position:relative;width:100%;max-width:980px;margin:0 auto;border-radius:12px;border:1px solid var(--line);padding:16px;background:var(--bg);color:var(--fg);font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;text-align:left}
@media(min-width:640px){.sk{padding:20px}}
.sk-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 16px;margin-bottom:12px}
.sk-title{margin:0;font-size:15px;font-weight:400;line-height:1.375;letter-spacing:0}.sk-title b{font-weight:600;font-variant-numeric:tabular-nums}
.sk-toggle{position:relative;display:inline-flex;border:1px solid var(--line);border-radius:6px;padding:2px}
.sk-thumb{position:absolute;top:2px;bottom:2px;left:2px;width:32px;border-radius:4px;background:var(--fg);transition:transform .5s var(--ease)}.sk[data-view="3d"] .sk-thumb{transform:translateX(100%)}
.sk-toggle button{position:relative;z-index:1;display:grid;place-items:center;width:32px;height:28px;padding:0;border:0;border-radius:4px;background:transparent;color:var(--muted);transition:color .5s}
.sk-toggle button[aria-pressed=true]{color:var(--bg)}.sk-toggle button:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
.sk-frame{position:relative;border:1px solid var(--line);border-radius:8px}
.sk-pad{position:relative;padding:12px 12px 0}@media(min-width:640px){.sk-pad{padding:16px 16px 0}}
.sk-stage{position:relative;width:100%;height:150px;overflow:hidden;border-radius:6px}.sk-stage:has(:focus-visible){outline:2px solid var(--fg);outline-offset:4px}
.sk-stage canvas{position:absolute;top:0;left:0;display:block;outline:none;max-width:none}
.sk-corner{position:absolute;display:none;flex-direction:column;gap:20px;pointer-events:none;opacity:0;transition:opacity .3s var(--ease),transform .3s var(--ease)}
.sk-tr{top:4px;right:4px;align-items:flex-end;transform:translateY(-10px)}.sk-bl{bottom:4px;left:4px;align-items:flex-start;transform:translateY(10px)}
.sk.has-corners .sk-corner{display:flex}
.sk.has-corners[data-view="3d"] .sk-corner{opacity:1;transform:none;transition-duration:.6s}
.sk[data-view="3d"] .sk-tr{transition-delay:715ms}.sk[data-view="3d"] .sk-bl{transition-delay:845ms}
.sk-tip{position:absolute;top:12px;left:12px;z-index:20;white-space:nowrap;border-radius:6px;padding:6px 10px;font-size:12px;line-height:1;background:var(--fg);color:var(--bg);box-shadow:0 10px 15px -3px rgba(0,0,0,.3);pointer-events:none;opacity:0;transition:opacity .15s}
@media(min-width:640px){.sk-tip{top:16px;left:16px}}
.sk-tip.is-on{opacity:1}.sk-tip span{opacity:.75}
.sk-tip i{position:absolute;top:100%;left:var(--arrow,50%);margin-left:-5px;width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:5px solid var(--fg)}
.sk-rowwrap{display:grid;grid-template-rows:1fr;opacity:1;transition:grid-template-rows 1.3s var(--ease),opacity 1.3s var(--ease)}.sk-rowwrap.is-hidden{grid-template-rows:0fr;opacity:0}
.sk-rowin{min-height:0;overflow:hidden}
.sk-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;padding:16px 12px 4px}@media(min-width:640px){.sk-row{padding:16px 16px 4px}}@media(min-width:768px){.sk-row{grid-template-columns:repeat(4,minmax(0,1fr))}}
.st-l{font-size:13px;line-height:1.25;color:var(--muted)}
.st-v{font-weight:600;font-variant-numeric:tabular-nums;color:var(--accent);letter-spacing:-.02em;transition:color .5s}
.st-stack .st-vr{display:flex;align-items:baseline;gap:6px;margin-top:4px}.st-stack .st-v{font-size:28px;line-height:1}.st-stack .st-u{font-size:14px}
.st-stack .st-s{margin-top:2px;font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.st-side{display:grid;grid-template-columns:auto auto;align-items:end;column-gap:8px}.st-side .st-v{text-align:right;line-height:.95}
.st-start{justify-content:start}.st-start .st-l{grid-column:span 2}.st-end{justify-content:end}.st-end .st-l{text-align:right}
.st-side .st-b{padding-bottom:.15em;line-height:1.25}.st-side .st-u{font-size:15px}.st-side .st-s{font-size:13px;white-space:nowrap;color:var(--muted)}
.sk-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 16px;padding:12px;font-size:12px;color:var(--muted)}@media(min-width:640px){.sk-foot{padding:12px 16px}}
.sk-hints{position:relative;display:grid;flex:1}.sk-hints span{grid-area:1/1;transition:opacity .5s}
.sk-legend{display:flex;align-items:center;gap:6px}.sk-swatches{display:flex;gap:6px}
.sk-swatches button{width:11px;height:11px;padding:0;border:0;border-radius:2px;box-shadow:inset 0 0 0 1px rgba(127,127,127,.12);transition:background-color .5s,transform .5s}.sk-swatches button:hover{transform:scale(1.25)}
.sk-swatches button:focus-visible{outline:2px solid var(--fg);outline-offset:1px}
.sk-sr{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}`;

const SKYLINE_JS = `(function(){
var DAY=86400000,END='2017-11-08',SEED=7,DURATION=1300,HEIGHT=1,ORBIT=true,WEEK_START=0,LOCALE='en-US',UNIT='contribution',PLURAL='contributions';
var clamp01=function(v){return v>0?(v<1?v:1):0};
var lerp=function(a,b,t){return a+(b-a)*t};
var easeInOutCubic=function(x){var t=clamp01(x);return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2};
var easeOutCubic=function(x){return 1-Math.pow(1-clamp01(x),3)};
var smoothstep=function(a,b,x){var t=clamp01((x-a)/(b-a));return t*t*(3-2*t)};
var toKey=function(ms){return new Date(ms).toISOString().slice(0,10)};
var dayMs=function(v){if(typeof v==='number')return Math.floor(v/DAY)*DAY;if(typeof v==='string'){var m=/^([0-9]{4})-([0-9]{2})-([0-9]{2})/.exec(v);if(m)return Date.UTC(+m[1],+m[2]-1,+m[3]);v=new Date(v)}return Date.UTC(v.getFullYear(),v.getMonth(),v.getDate())};
var rng=function(seed){var a=seed>>>0;return function(){a=(a+0x6d2b79f5)>>>0;var t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}};
var generate=function(endMs,seed,days){days=days||371;var r=rng(seed),bursts=[],out=[],mood=0.5;for(var b=0;b<4;b++)bursts.push({at:r(),width:0.035+r()*0.07,gain:0.6+r()*1.1});
for(var i=0;i<days;i++){var ms=endMs-(days-1-i)*DAY,x=i/Math.max(1,days-1),dow=new Date(ms).getUTCDay(),weekend=dow===0||dow===6,heat=0.2;
for(var k=0;k<bursts.length;k++){var u=bursts[k];heat+=u.gain*Math.exp(-Math.pow(x-u.at,2)/(2*u.width*u.width))}
mood=mood*0.85+r()*0.15;heat*=0.55+mood*0.9;var pActive=Math.min(0.94,(weekend?0.22:0.5)+heat*0.4),count=0;
if(r()<pActive)count=1+Math.floor(-Math.log(1-r())*(1.2+heat*7)*(weekend?0.5:1));if(r()<0.01)count+=18+Math.floor(r()*24);out.push({date:toKey(ms),count:count})}return out};
var levelOf=function(count,busy){return count<=0?0:busy<=0?4:1+Math.min(3,Math.floor((count/busy)*4))};
var buildGrid=function(data,endMs,weekStart){var counts=new Map();data.forEach(function(d){if(!d||typeof d.date!=='string')return;var ms=dayMs(d.date),c=Number(d.count);if(!isFinite(ms)||!(c>0)||!isFinite(c))return;var k=toKey(ms);counts.set(k,(counts.get(k)||0)+c)});
var start=endMs-364*DAY;start-=((new Date(start).getUTCDay()-weekStart+7)%7)*DAY;var cells=[];
for(var ms=start,i=0;ms<=endMs;ms+=DAY,i++){var date=toKey(ms);cells.push({date:date,count:counts.get(date)||0,level:0,week:Math.floor(i/7),day:i%7})}
var nz=cells.map(function(c){return c.count}).filter(function(c){return c>0}).sort(function(a,b){return a-b}),busy=nz.length?nz[Math.floor(0.95*(nz.length-1))]:0;
cells.forEach(function(c){c.level=levelOf(c.count,busy)});return{cells:cells,weeks:cells.length?cells[cells.length-1].week+1:0,max:nz.length?nz[nz.length-1]:0}};
var computeStats=function(cells){var total=0,best=0,bestDate=null,run=0,runStart=null,longest={days:0,start:null,end:null};
cells.forEach(function(c){total+=c.count;if(c.count>best){best=c.count;bestDate=c.date}if(c.count>0){if(run===0)runStart=c.date;run++;if(run>longest.days)longest={days:run,start:runStart,end:c.date}}else run=0});
var j=cells.length-1;if(j>=0&&cells[j].count===0)j--;var endAt=j;while(j>=0&&cells[j].count>0)j--;var days=endAt-j;
return{total:total,first:cells.length?cells[0].date:null,last:cells.length?cells[cells.length-1].date:null,busiest:{count:best,date:bestDate},longest:longest,current:days>0?{days:days,start:cells[j+1].date,end:cells[endAt].date}:{days:0,start:null,end:null}}};
var monthLabels=function(cells,weeks){var fmt=new Intl.DateTimeFormat(LOCALE,{month:'short',timeZone:'UTC'}),out=[],prev=-1;
for(var w=0;w<weeks;w++){var c=cells[w*7];if(!c)break;var m=+c.date.slice(5,7);if(m!==prev)out.push({week:w,label:fmt.format(dayMs(c.date))});prev=m}
if(out.length>1&&out[1].week-out[0].week<3)out.shift();return out};
var barHeight=function(count,max,scale){return count>0&&max>0?0.4+Math.pow(count/max,0.85)*7.2*scale:0.2};
var WAVE=0.42,riseAt=function(t,week,weeks,day){var d=(weeks>1?week/(weeks-1):0)*0.36+(day/6)*0.06;return easeOutCubic((t-d)/(1-WAVE))};
var YAW_3D=Math.PI/4,ELEV_3D=34*Math.PI/180,YAW_RANGE=[8*Math.PI/180,82*Math.PI/180],ELEV_RANGE=[18*Math.PI/180,62*Math.PI/180];
var camera=function(e,dYaw,dElev){dYaw=dYaw||0;dElev=dElev||0;var yaw=Math.min(YAW_RANGE[1],Math.max(0,lerp(0,YAW_3D+dYaw,e))),elev=lerp(Math.PI/2,Math.min(ELEV_RANGE[1],Math.max(ELEV_RANGE[0],ELEV_3D+dElev)),e);return{cs:Math.cos(yaw),sn:Math.sin(yaw),se:Math.sin(elev),ce:Math.cos(elev)}};
var project=function(c,x,y,z){return[x*c.cs-y*c.sn,(x*c.sn+y*c.cs)*c.se-z*c.ce]};
var mixRGB=function(a,b,t){return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]};
var luminance=function(c){return(0.2126*c[0]+0.7152*c[1]+0.0722*c[2])/255};
var PALETTE={light:['#c6e48b','#7bc96f','#239a3b','#196127'],dark:['#0e4429','#006d32','#26a641','#39d353']};
var FG_FALLBACK=[23,23,23],BG_FALLBACK=[255,255,255],probe=null;
var toRGB=function(color,fallback){if(!probe){var c=document.createElement('canvas');c.width=c.height=1;probe=c.getContext('2d',{willReadFrequently:true})}if(!probe)return fallback;
probe.clearRect(0,0,1,1);probe.fillStyle='rgba(0,0,0,0)';probe.fillStyle=color;probe.fillRect(0,0,1,1);var d=probe.getImageData(0,0,1,1).data;if(d[3]<8)return fallback;return[d[0],d[1],d[2]]};
var rgbString=function(r,g,b){return 'rgb('+Math.round(r)+','+Math.round(g)+','+Math.round(b)+')'};
var pointInQuad=function(p,o,x,y){var sign=0;for(var k=0;k<4;k++){var ax=p[o+k*2],ay=p[o+k*2+1],bx=p[o+((k+1)%4)*2],by=p[o+((k+1)%4)*2+1],cross=(bx-ax)*(y-ay)-(by-ay)*(x-ax);if(Math.abs(cross)<1e-9)continue;var s=cross>0?1:-1;if(sign===0)sign=s;else if(s!==sign)return false}return sign!==0};
var quadPath=function(ctx,p,o,r){if(r<0.3){ctx.moveTo(p[o],p[o+1]);ctx.lineTo(p[o+2],p[o+3]);ctx.lineTo(p[o+4],p[o+5]);ctx.lineTo(p[o+6],p[o+7]);ctx.closePath();return}
ctx.moveTo((p[o+6]+p[o])/2,(p[o+7]+p[o+1])/2);for(var k=0;k<4;k++){var b=(k+1)%4;ctx.arcTo(p[o+k*2],p[o+k*2+1],p[o+b*2],p[o+b*2+1],r)}ctx.closePath()};

/* The model */
var end=dayMs(END),grid=buildGrid(generate(end,SEED),end,WEEK_START),stats=computeStats(grid.cells),model={cells:grid.cells,weeks:grid.weeks,max:grid.max,months:monthLabels(grid.cells,grid.weeks)};
var nf=new Intl.NumberFormat(LOCALE),df=new Intl.DateTimeFormat(LOCALE,{month:'short',day:'numeric',timeZone:'UTC'}),dfy=new Intl.DateTimeFormat(LOCALE,{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}),dfl=new Intl.DateTimeFormat(LOCALE,{weekday:'long',month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
var noun=function(n){return n===1?UNIT:PLURAL};
var describe=function(i){var c=model.cells[i];if(!c)return '';return(c.count?nf.format(c.count)+' '+noun(c.count):'No '+PLURAL)+' on '+dfl.format(dayMs(c.date))};
var range=function(a,b,y){if(!a||!b)return '—';var f=y?dfy:df;return f.format(dayMs(a))+' — '+f.format(dayMs(b))};

/* The DOM around the scene */
var root=document.querySelector('.sk'),stage=root.querySelector('.sk-stage'),canvas=root.querySelector('canvas'),tip=root.querySelector('.sk-tip'),sr=root.querySelector('.sk-sr');
var view='3d',legendLevel=-1,width=0,accent='#39d353',levelNames=['No '+PLURAL,'Light','Moderate','Heavy','Heaviest'];
root.querySelector('.sk-title').innerHTML='<b>'+nf.format(stats.total)+'</b> '+noun(stats.total)+' in the last year';
canvas.setAttribute('aria-label',nf.format(stats.total)+' '+noun(stats.total)+' between '+range(stats.first,stats.last,true)+', shown as a 3D skyline. Use the arrow keys to read individual days.');
var blocks=[{label:'1 year total',value:nf.format(stats.total),unit:noun(stats.total),sub:range(stats.first,stats.last,true)},{label:'Busiest day',value:nf.format(stats.busiest.count),unit:noun(stats.busiest.count),sub:stats.busiest.date?df.format(dayMs(stats.busiest.date)):'—'},{label:'Longest streak',value:nf.format(stats.longest.days),unit:stats.longest.days===1?'day':'days',sub:range(stats.longest.start,stats.longest.end)},{label:'Current streak',value:nf.format(stats.current.days),unit:stats.current.days===1?'day':'days',sub:range(stats.current.start,stats.current.end)}];
var stack=function(b){return '<div class="st-stack"><div class="st-l">'+b.label+'</div><div class="st-vr"><span class="st-v">'+b.value+'</span><span class="st-u">'+b.unit+'</span></div><div class="st-s">'+b.sub+'</div></div>'};
var side=function(b,align){return '<div class="st-side st-'+align+'"><div class="st-l">'+b.label+'</div>'+(align==='end'?'<div></div>':'')+'<div class="st-v">'+b.value+'</div><div class="st-b"><div class="st-u">'+b.unit+'</div><div class="st-s">'+b.sub+'</div></div></div>'};
root.querySelector('.sk-row').innerHTML=blocks.map(stack).join('');
root.querySelector('.sk-tr').innerHTML=side(blocks[0],'end')+side(blocks[1],'end');root.querySelector('.sk-bl').innerHTML=side(blocks[2],'start')+side(blocks[3],'start');
var swatchBox=root.querySelector('.sk-swatches');levelNames.forEach(function(name,i){var b=document.createElement('button');b.type='button';b.title=name;b.setAttribute('aria-label','Highlight '+name.toLowerCase()+' days');b.setAttribute('aria-pressed','false');
b.addEventListener('mouseenter',function(){setLegend(i)});b.addEventListener('focus',function(){setLegend(i)});b.addEventListener('blur',function(){setLegend(-1)});b.addEventListener('click',function(){setLegend(legendLevel===i?-1:i)});swatchBox.appendChild(b)});
root.querySelector('.sk-legend').addEventListener('mouseleave',function(){setLegend(-1)});
var setLegend=function(l){legendLevel=l;swatchBox.querySelectorAll('button').forEach(function(b,i){b.setAttribute('aria-pressed',String(l===i))});kick()};
var paintChrome=function(){var is3d=view==='3d',corners=width>=560,big=Math.round(Math.max(30,Math.min(56,width*0.058)));root.dataset.view=view;root.classList.toggle('has-corners',corners);
root.querySelectorAll('.sk-toggle button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.v===view))});
root.querySelectorAll('.sk-corner .st-v').forEach(function(v){v.style.fontSize=big+'px'});root.querySelectorAll('.sk-corner').forEach(function(c){c.setAttribute('aria-hidden',String(!is3d))});
var showRow=!(is3d&&corners),row=root.querySelector('.sk-rowwrap');row.classList.toggle('is-hidden',!showRow);row.setAttribute('aria-hidden',String(!showRow));
var hints=root.querySelectorAll('.sk-hints span'),on=is3d&&ORBIT?1:0;hints.forEach(function(h,i){h.style.opacity=i===on?'1':'0';h.setAttribute('aria-hidden',String(i!==on))});
canvas.setAttribute('aria-label',canvas.getAttribute('aria-label').replace(/shown as a (3D skyline|heat map)/,'shown as a '+(is3d?'3D skyline':'heat map')));
canvas.style.touchAction=is3d&&ORBIT?'pan-y':'auto'};
var showTip=function(i){if(i<0||!model.cells[i]){tip.classList.remove('is-on');tip.setAttribute('aria-hidden','true');return}var c=model.cells[i];
tip.querySelector('strong').textContent=c.count?nf.format(c.count)+' '+noun(c.count):'No '+PLURAL;tip.querySelector('span').textContent=' on '+dfy.format(dayMs(c.date));tip.classList.add('is-on');tip.setAttribute('aria-hidden','false');tipW=tip.offsetWidth;draw()};
var onTheme=function(sw){swatchBox.querySelectorAll('button').forEach(function(b,i){b.style.background=sw[i]});accent=sw[4];root.style.setProperty('--accent',accent)};
root.querySelectorAll('.sk-toggle button').forEach(function(b){b.addEventListener('click',function(){view=b.dataset.v;paintChrome();setTarget()})});

/* The scene */
var ctx=canvas.getContext('2d');if(!ctx)return;
var reduceMq=matchMedia('(prefers-reduced-motion: reduce)'),reduced=reduceMq.matches;
var t=0,target=0,entered=false,yaw=0,elev=0,yawGoal=0,elevGoal=0,W=0,H2=0,H3=0,Hmax=0,lastH=-1,dpr=1,gutter=30,labelW=30,font='10px sans-serif';
var col=new Float32Array(15),colGoal=new Float32Array(15),colReady=false,fg=FG_FALLBACK,bg=BG_FALLBACK,isDark=false;
var n=model.cells.length,weeks=model.weeks,wk=new Float32Array(n),dy=new Float32Array(n),lv=new Uint8Array(n),hgt=new Float32Array(n),zs=new Float32Array(n),hover=new Float32Array(n),dim=new Float32Array(n),polys=new Float32Array(n*24),faces=new Uint8Array(n),order=[];
for(var i0=0;i0<n;i0++){var c0=model.cells[i0];wk[i0]=c0.week;dy[i0]=c0.day;lv[i0]=c0.level;hgt[i0]=barHeight(c0.count,model.max,HEIGHT);order.push(i0)}
var months=model.months,weekdayRows=[],wf=new Intl.DateTimeFormat(LOCALE,{weekday:'short',timeZone:'UTC'});
for(var d0=0;d0<7&&d0<n;d0++){var dow0=new Date(dayMs(model.cells[d0].date)).getUTCDay();if(dow0===1||dow0===3||dow0===5)weekdayRows.push({day:d0,label:wf.format(dayMs(model.cells[d0].date))})}
var hovered=-1,pinned=-1,activeIdx=-1,tipW=0,raf=0,last=0;

var retheme=function(){var cs=getComputedStyle(root);fg=toRGB(cs.color,FG_FALLBACK)||FG_FALLBACK;var b=toRGB(cs.backgroundColor,null);bg=b||(luminance(fg)>0.5?[10,10,10]:BG_FALLBACK);isDark=luminance(bg)<0.45;font='400 10px '+(cs.fontFamily||'sans-serif');
var pal=isDark?PALETTE.dark:PALETTE.light,empty=mixRGB(bg,fg,isDark?0.11:0.075),all=[empty].concat(pal.map(function(c){return toRGB(c,FG_FALLBACK)||FG_FALLBACK}));
for(var k=0;k<5;k++)for(var ch=0;ch<3;ch++)colGoal[k*3+ch]=all[k][ch];if(!colReady||reduced){col.set(colGoal);colReady=true}
ctx.font=font;labelW=Math.ceil(Math.max.apply(null,[20].concat(weekdayRows.map(function(r){return ctx.measureText(r.label).width}))))+8;
onTheme(all.map(function(c){return rgbString(c[0],c[1],c[2])}));kick()};

var extent=function(cam,e,full){var w=lerp(0.78,0.9,e),off=(1-w)/2,minx=Infinity,maxx=-Infinity,miny=Infinity,maxy=-Infinity;
var add=function(x,y,z){var p=project(cam,x,y,z);if(p[0]<minx)minx=p[0];if(p[0]>maxx)maxx=p[0];if(p[1]<miny)miny=p[1];if(p[1]>maxy)maxy=p[1]};
for(var i=0;i<n;i++){var x0=wk[i]+off,y0=dy[i]+off,z=full?hgt[i]*e:zs[i];add(x0,y0,z);add(x0+w,y0,z);add(x0,y0+w,z);add(x0+w,y0+w,0);add(x0,y0+w,0);add(x0+w,y0,0)}
add(0,7+1.5*e,0);add(weeks,7+1.5*e,0);return{minx:minx,maxx:maxx,miny:miny,maxy:maxy}};

var relayout=function(){var w=Math.round(stage.clientWidth);if(!w||!n)return;W=w;gutter=W<520?0:labelW;dpr=Math.min(2,window.devicePixelRatio||1);
var b2=extent(camera(0),0,true);H2=20+4+((b2.maxy-b2.miny)/(b2.maxx-b2.minx))*(W-gutter-4);
var b3=extent(camera(1),1,true),natural=((b3.maxy-b3.miny)/(b3.maxx-b3.minx))*(W-40)+40;H3=Math.max(Math.min(natural,W*0.72,620),Math.min(natural,240));
Hmax=Math.ceil(Math.max(H2,H3));canvas.width=Math.round(W*dpr);canvas.height=Math.round(Hmax*dpr);canvas.style.width=W+'px';canvas.style.height=Hmax+'px';lastH=-1;width=W;paintChrome();draw()};

var draw=function(){if(!W||!n)return;var e=easeInOutCubic(t),cam=camera(e,yaw,elev),Hc=lerp(H2,H3,e);if(Math.abs(Hc-lastH)>0.2){stage.style.height=Hc.toFixed(1)+'px';lastH=Hc}
for(var i=0;i<n;i++)zs[i]=riseAt(t,wk[i],weeks,dy[i])*hgt[i];
var b=extent(cam,e,false),pad=lerp(2,20,e),left=pad+gutter*(1-e),top=pad+20*(1-e),aw=W-left-pad,ah=Hc-top-pad,bw=Math.max(1e-6,b.maxx-b.minx),bh=Math.max(1e-6,b.maxy-b.miny),s=Math.min(aw/bw,ah/bh);
var ox=left+(aw-bw*s)/2-b.minx*s,oy=top+(ah-bh*s)/2-b.miny*s,cs=cam.cs,sn=cam.sn,se=cam.se,ce=cam.ce;
var px=function(x,y){return ox+(x*cs-y*sn)*s},py=function(x,y,z){return oy+((x*sn+y*cs)*se-z*ce)*s};
ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,Hmax);
order.sort(function(a,c){return(wk[a]+0.5)*sn+(dy[a]+0.5)*cs-((wk[c]+0.5)*sn+(dy[c]+0.5)*cs)});
var w=lerp(0.78,0.9,e),off=(1-w)/2,radius=lerp(0.17,0.03,e)*s,outline=(1-e)*0.07,lift=0.7*e,ex=col[0],ey=col[1],ez=col[2];
for(var k=0;k<n;k++){var j=order[k],x0=wk[j]+off,y0=dy[j]+off,x1=x0+w,y1=y0+w,z=zs[j]+hover[j]*lift,o=j*24;
polys[o]=px(x0,y0);polys[o+1]=py(x0,y0,z);polys[o+2]=px(x1,y0);polys[o+3]=py(x1,y0,z);polys[o+4]=px(x1,y1);polys[o+5]=py(x1,y1,z);polys[o+6]=px(x0,y1);polys[o+7]=py(x0,y1,z);
polys[o+8]=px(x0,y1);polys[o+9]=py(x0,y1,0);polys[o+10]=px(x1,y1);polys[o+11]=py(x1,y1,0);polys[o+12]=polys[o+4];polys[o+13]=polys[o+5];polys[o+14]=polys[o+6];polys[o+15]=polys[o+7];
polys[o+16]=px(x1,y0);polys[o+17]=py(x1,y0,0);polys[o+18]=polys[o+10];polys[o+19]=polys[o+11];polys[o+20]=polys[o+4];polys[o+21]=polys[o+5];polys[o+22]=polys[o+2];polys[o+23]=polys[o+3];
var tall=z*ce*s,f=0;if(tall>0.35&&w*cs*s>0.35)f|=1;if(tall>0.35&&w*sn*s>0.35)f|=2;faces[j]=f;
var L=lv[j]*3,r=col[L],g=col[L+1],bl=col[L+2],dd=dim[j];if(dd>0.002){r+=(ex-r)*0.72*dd;g+=(ey-g)*0.72*dd;bl+=(ez-bl)*0.72*dd}
var hv=hover[j];if(hv>0.002){var m=0.16*hv;r+=(fg[0]-r)*m;g+=(fg[1]-g)*m;bl+=(fg[2]-bl)*m}
if(f&1){ctx.beginPath();quadPath(ctx,polys,o+8,0);ctx.fillStyle=rgbString(r*0.84,g*0.84,bl*0.84);ctx.fill()}
if(f&2){ctx.beginPath();quadPath(ctx,polys,o+16,0);ctx.fillStyle=rgbString(r*0.68,g*0.68,bl*0.68);ctx.fill()}
ctx.beginPath();quadPath(ctx,polys,o,radius);ctx.fillStyle=rgbString(r,g,bl);ctx.fill();
if(outline>0.004){ctx.strokeStyle='rgba('+fg[0]+','+fg[1]+','+fg[2]+','+outline.toFixed(3)+')';ctx.lineWidth=1;ctx.stroke()}
if(hv>0.02){ctx.strokeStyle='rgba('+fg[0]+','+fg[1]+','+fg[2]+','+(0.85*hv).toFixed(3)+')';ctx.lineWidth=1.5;ctx.stroke()}}
var muted=mixRGB(bg,fg,0.55),mc='rgba('+Math.round(muted[0])+','+Math.round(muted[1])+','+Math.round(muted[2])+',';ctx.font=font;
var a2=1-smoothstep(0,0.4,e),a3=smoothstep(0.62,1,e),edge;
if(a2>0.004){ctx.fillStyle=mc+a2.toFixed(3)+')';ctx.textAlign='left';ctx.textBaseline='bottom';edge=-Infinity;
months.forEach(function(mo){var x=px(mo.week+off,-0.3),tw=ctx.measureText(mo.label).width;if(x<edge||x+tw>W)return;ctx.fillText(mo.label,x,py(mo.week+off,-0.3,0)-3);edge=x+tw+6});
ctx.textAlign='right';ctx.textBaseline='middle';if(gutter>0)weekdayRows.forEach(function(row){ctx.fillText(row.label,px(0,row.day+0.5)-6,py(0,row.day+0.5,0))})}
if(a3>0.004){ctx.fillStyle=mc+a3.toFixed(3)+')';ctx.textAlign='left';ctx.textBaseline='top';edge=-Infinity;
months.forEach(function(mo){var x=px(mo.week+0.5,7.3),tw=ctx.measureText(mo.label).width;if(x<edge||x+tw>W)return;ctx.fillText(mo.label,x,py(mo.week+0.5,7.3,0)+2);edge=x+tw+10})}
if(activeIdx>=0&&activeIdx<n){var a=activeIdx,za=zs[a]+hover[a]*lift,tx=px(wk[a]+0.5,dy[a]+0.5),ty=Math.min(py(wk[a]+off,dy[a]+off,za),py(wk[a]+off+w,dy[a]+off,za),py(wk[a]+off,dy[a]+off+w,za)),half=tipW/2,cx=Math.min(W-half-2,Math.max(half+2,tx));
tip.style.transform='translate('+(cx-half).toFixed(1)+'px,'+(ty-8).toFixed(1)+'px) translateY(-100%)';tip.style.setProperty('--arrow',(tx-cx+half).toFixed(1)+'px')}};

var tick=function(now){raf=0;var dt=Math.min(0.05,Math.max(0,(now-last)/1000));last=now;var moving=false;
if(t!==target){var step=reduced?1:(dt*1000)/Math.max(1,DURATION);t=target>t?Math.min(target,t+step):Math.max(target,t-step);moving=true}
var ko=reduced?1:1-Math.exp(-dt*12);yaw+=(yawGoal-yaw)*ko;elev+=(elevGoal-elev)*ko;if(Math.abs(yawGoal-yaw)>1e-4||Math.abs(elevGoal-elev)>1e-4)moving=true;else{yaw=yawGoal;elev=elevGoal}
var kc=reduced?1:1-Math.exp(-dt*7);for(var k=0;k<15;k++){var dc=colGoal[k]-col[k];if(Math.abs(dc)>0.4){col[k]+=dc*kc;moving=true}else col[k]=colGoal[k]}
var kh=reduced?1:1-Math.exp(-dt*16),kd=reduced?1:1-Math.exp(-dt*10);
for(var i=0;i<n;i++){var hg=i===activeIdx?1:0,dg=legendLevel>=0&&lv[i]!==legendLevel?1:0,h=hover[i],d=dim[i];
if(h!==hg){hover[i]=Math.abs(hg-h)<0.003?hg:h+(hg-h)*kh;moving=true}if(d!==dg){dim[i]=Math.abs(dg-d)<0.003?dg:d+(dg-d)*kd;moving=true}}
draw();if(moving)raf=requestAnimationFrame(tick)};
var kick=function(){if(raf)return;last=performance.now();raf=requestAnimationFrame(tick)};

var refreshActive=function(){var next=hovered>=0?hovered:pinned;if(next===activeIdx)return;activeIdx=next;showTip(next);kick()};
var hit=function(x,y){for(var k=n-1;k>=0;k--){var i=order[k],o=i*24;if(pointInQuad(polys,o,x,y))return i;if(faces[i]&1&&pointInQuad(polys,o+8,x,y))return i;if(faces[i]&2&&pointInQuad(polys,o+16,x,y))return i}return -1};
var local=function(ev){var r=canvas.getBoundingClientRect();return[ev.clientX-r.left,ev.clientY-r.top]};
var drag=null;
canvas.addEventListener('pointerdown',function(ev){if(ev.button!==0)return;var can=ORBIT&&target===1;drag={id:ev.pointerId,x:ev.clientX,y:ev.clientY,yaw:yawGoal,elev:elevGoal,moved:false,orbit:can,mouse:ev.pointerType==='mouse'};if(can){try{canvas.setPointerCapture(ev.pointerId)}catch(e){}}});
canvas.addEventListener('pointermove',function(ev){if(drag&&drag.orbit&&ev.pointerId===drag.id){var dx=ev.clientX-drag.x,dyy=ev.clientY-drag.y;if(drag.moved||Math.hypot(dx,dyy)>4){drag.moved=true;
yawGoal=Math.min(YAW_RANGE[1]-YAW_3D,Math.max(YAW_RANGE[0]-YAW_3D,drag.yaw+dx*0.006));if(drag.mouse)elevGoal=Math.min(ELEV_RANGE[1]-ELEV_3D,Math.max(ELEV_RANGE[0]-ELEV_3D,drag.elev+dyy*0.004));
canvas.style.cursor='grabbing';hovered=-1;refreshActive();kick();return}}
if(ev.pointerType!=='mouse')return;var p=local(ev),i=hit(p[0],p[1]);if(i!==hovered){hovered=i;refreshActive()}canvas.style.cursor=ORBIT&&target===1?'grab':i>=0?'pointer':'default'});
canvas.addEventListener('pointerup',function(ev){if(!drag||ev.pointerId!==drag.id)return;var was=drag.moved;drag=null;if(canvas.hasPointerCapture(ev.pointerId))canvas.releasePointerCapture(ev.pointerId);
canvas.style.cursor=ORBIT&&target===1?'grab':'default';if(was)return;var p=local(ev),i=hit(p[0],p[1]);pinned=i===pinned?-1:i;if(ev.pointerType!=='mouse')hovered=-1;refreshActive()});
canvas.addEventListener('pointercancel',function(){drag=null});
canvas.addEventListener('pointerleave',function(){if(drag)return;hovered=-1;refreshActive()});
canvas.addEventListener('dblclick',function(){yawGoal=0;elevGoal=0;kick()});
canvas.addEventListener('keydown',function(ev){var keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','Escape','Enter',' '];if(keys.indexOf(ev.key)<0||!n)return;ev.preventDefault();
if(ev.key==='Escape'){pinned=-1;hovered=-1;refreshActive();return}var i=pinned>=0?pinned:activeIdx>=0?activeIdx:n-1;if(ev.key==='Enter'||ev.key===' ')return;
if(pinned>=0||activeIdx>=0){if(ev.key==='ArrowLeft')i-=7;if(ev.key==='ArrowRight')i+=7;if(ev.key==='ArrowUp')i-=1;if(ev.key==='ArrowDown')i+=1;if(ev.key==='Home')i=0;if(ev.key==='End')i=n-1}
i=Math.max(0,Math.min(n-1,i));pinned=i;hovered=-1;refreshActive();sr.textContent=describe(i)});
canvas.addEventListener('blur',function(){pinned=-1;refreshActive()});

var setTarget=function(){var goal=view==='3d'?1:0;if(!entered)return;if(goal!==target){target=goal;if(goal===0){yawGoal=0;elevGoal=0}canvas.style.cursor=ORBIT&&target===1?'grab':'default';kick()}};
retheme();relayout();paintChrome();
var enter=function(){if(entered)return;entered=true;if(reduced)t=view==='3d'?1:0;setTarget()};
if('IntersectionObserver' in window){var io=new IntersectionObserver(function(entries){if(entries.some(function(en){return en.isIntersecting})){enter();io.disconnect()}},{threshold:0.35});io.observe(stage)}else enter();
new ResizeObserver(function(){if(Math.round(stage.clientWidth)!==W)relayout()}).observe(stage);
reduceMq.addEventListener('change',function(){reduced=reduceMq.matches;kick()});
})();`;

/* ── Morph gallery ──────────────────────────────────────────────────────────── */

/**
 * After Kedhareswer Naidu's Morph Gallery on 21st.dev. The dissolve is upstream's
 * shader, unchanged: an fbm noise threshold biased by the incoming frame's brightness,
 * swept by a quintic-eased progress, with both frames drifting against each other and
 * mirrored at the edges. So are the 1500ms default, the 4.5s autoplay of its demo, the
 * shortest-way-round direction, swipe, arrow keys, pause on hover, focus or a hidden tab,
 * and the cross-fade fallback when WebGL is missing. What differs: the demo's photos are
 * on a CDN this sandbox cannot reach, so the six scenes it captions are painted on
 * canvases here and uploaded from those, which also makes them CORS-clean.
 */
const MORPH_SCENES = [
  { kind: "forest", alt: "Sun rays through a forest" },
  { kind: "night", alt: "Snow-capped mountain peak at night" },
  { kind: "lake", alt: "Mountain reflected in a still lake" },
  { kind: "hills", alt: "Aerial view of green hills" },
  { kind: "field", alt: "Orange wildflower field" },
  { kind: "beach", alt: "Tropical beach with clear water" },
] as const;

const MORPH_VERT = `attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const MORPH_FRAG = `precision highp float;
uniform sampler2D u_from;
uniform sampler2D u_to;
uniform float u_progress;
uniform vec2 u_resolution;
uniform float u_fromAspect;
uniform float u_toAspect;
uniform float u_scale;
uniform float u_direction;
uniform float u_edge;
uniform float u_drift;
varying vec2 v_uv;
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float fbm(vec2 v) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) { value += amplitude * snoise(v); v *= 2.0; amplitude *= 0.5; }
  return value;
}
vec2 mirror(vec2 uv) { return 1.0 - abs(1.0 - mod(uv, 2.0)); }
vec2 coverUV(vec2 uv, float imgAspect) {
  float canvasAspect = u_resolution.x / u_resolution.y;
  vec2 scale = (canvasAspect > imgAspect) ? vec2(1.0, imgAspect / canvasAspect) : vec2(canvasAspect / imgAspect, 1.0);
  return mirror((uv - 0.5) * scale + 0.5);
}
void main() {
  float adjusted = u_progress * (1.0 + 2.0 * u_edge) - u_edge;
  float noise = fbm(v_uv * u_scale + vec2(0.0, u_progress * u_direction)) * 0.5 + 0.5;
  noise = smoothstep(0.0, 2.0, length(texture2D(u_to, coverUV(v_uv, u_toAspect)).rgb) + noise);
  float mixFactor = 1.0 - smoothstep(adjusted - u_edge, adjusted + u_edge, noise);
  vec2 fromUV = coverUV(v_uv + vec2(0.0, noise * u_progress * u_drift * u_direction), u_fromAspect);
  vec2 toUV = coverUV(v_uv + vec2(0.0, noise * (1.0 - u_progress) * -0.5 * u_drift * u_direction), u_toAspect);
  gl_FragColor = mix(texture2D(u_from, fromUV), texture2D(u_to, toUV), mixFactor);
}`;

const MORPH_CHEVRON = (points: string) =>
  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="${points}"/></svg>`;

const MORPH_HTML = `<section class="mg" role="region" aria-roledescription="carousel" aria-label="Image gallery" tabindex="0">
<canvas class="mg-canvas" aria-hidden="true"></canvas><div class="mg-fallback" hidden></div><div class="mg-shade" aria-hidden="true"></div>
<button type="button" class="mg-arrow mg-prev" aria-label="Previous image">${MORPH_CHEVRON("15 18 9 12 15 6")}</button>
<button type="button" class="mg-arrow mg-next" aria-label="Next image">${MORPH_CHEVRON("9 18 15 12 9 6")}</button>
<ul class="mg-thumbs"></ul><span class="mg-sr" aria-live="polite"></span></section>`;

const MORPH_CSS = `body{display:block!important}
.mg{position:fixed;inset:0;overflow:hidden;background:#000;outline:none;touch-action:pan-y}
.mg:focus-visible{box-shadow:inset 0 0 0 2px #fff}
.mg-canvas,.mg-fallback,.mg-fallback img{position:absolute;inset:0;display:block;width:100%;height:100%}
.mg-canvas{opacity:0;transition:opacity .4s ease}.mg-canvas.is-ready{opacity:1}
.mg-fallback img{object-fit:cover;max-width:none;opacity:0;transition:opacity .7s}.mg-fallback img.is-on{opacity:1}
.mg-shade{position:absolute;inset:auto 0 0;z-index:5;height:14rem;pointer-events:none;background:linear-gradient(to bottom,transparent,rgba(0,0,0,.65))}
.mg-arrow{position:absolute;top:50%;z-index:10;display:flex;align-items:center;justify-content:center;width:44px;height:44px;transform:translateY(-50%);border-radius:50%;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.1);color:#fff;-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);transition:background-color .15s;cursor:pointer}
.mg-arrow:hover{background:rgba(255,255,255,.25)}.mg-arrow:focus-visible{outline:2px solid #fff;outline-offset:2px}
.mg-prev{left:16px}.mg-next{right:16px}@media(min-width:640px){.mg-prev{left:32px}.mg-next{right:32px}}
.mg-thumbs{position:absolute;left:0;right:0;bottom:32px;z-index:10;display:flex;gap:8px;width:max-content;max-width:calc(100% - 2rem);margin:0 auto;padding:0 0 10px;list-style:none;overflow-x:auto;scroll-behavior:smooth}
.mg-thumbs::-webkit-scrollbar{height:6px}.mg-thumbs::-webkit-scrollbar-track{border-radius:4px;background:rgba(255,255,255,.1)}.mg-thumbs::-webkit-scrollbar-thumb{border-radius:4px;background:rgba(255,255,255,.3)}
@media(max-width:639px){.mg-thumbs{display:none}}
.mg-thumbs li{flex:none}
.mg-thumbs button{display:block;padding:0;overflow:hidden;border-radius:4px;border:2px solid transparent;background:none;opacity:.55;cursor:pointer;transition:opacity .15s,border-color .15s}
.mg-thumbs button:hover{opacity:.85}.mg-thumbs button[aria-current=true]{border-color:#fff;opacity:1}.mg-thumbs button:focus-visible{outline:2px solid #fff;outline-offset:2px}
.mg-thumbs img{display:block;width:80px;height:50px;max-width:none;object-fit:cover}
.mg-sr{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}`;

const MORPH_JS = `(function(){
var ITEMS=${JSON.stringify(MORPH_SCENES)},VERT=${JSON.stringify(MORPH_VERT)},FRAG=${JSON.stringify(MORPH_FRAG)};
var DURATION=1500,NOISE=3.5,EDGE=0.15,DRIFT=0.5,LOOP=true,AUTOPLAY=4500;
var wrapIndex=function(i,n,loop){if(n<=0)return 0;return loop?((i%n)+n)%n:Math.min(Math.max(i,0),n-1)};
var easeInOutQuint=function(t){var x=Math.min(Math.max(t,0),1);return x<0.5?16*Math.pow(x,5):1-Math.pow(-2*x+2,5)/2};

/* The six scenes the demo captions, painted. */
var rng=function(seed){var a=seed>>>0;return function(){a=(a+0x6d2b79f5)>>>0;var t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}};
var W=1200,H=750;
var paint=function(kind,seed){var c=document.createElement('canvas');c.width=W;c.height=H;var g=c.getContext('2d'),r=rng(seed);
var vgrad=function(y0,y1,stops){var gr=g.createLinearGradient(0,y0,0,y1);stops.forEach(function(s,i){gr.addColorStop(i/(stops.length-1),s)});return gr};
var sky=function(stops,hz){g.fillStyle=vgrad(0,hz,stops);g.fillRect(0,0,W,H)};
var ridge=function(base,amp,fill,f){var ph=[r()*6,r()*6,r()*6],fr=f||[2+r()*2,5+r()*3,13+r()*6];g.beginPath();g.moveTo(0,H);
for(var x=0;x<=W;x+=6){var u=x/W;g.lineTo(x,base-amp*(0.6*Math.sin(u*fr[0]+ph[0])+0.3*Math.sin(u*fr[1]+ph[1])+0.1*Math.sin(u*fr[2]+ph[2])))}g.lineTo(W,H);g.closePath();g.fillStyle=fill;g.fill()};
var glow=function(x,y,rad,col){var gr=g.createRadialGradient(x,y,0,x,y,rad);gr.addColorStop(0,col);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,W,H)};
if(kind==='forest'){sky(['#fff4d1','#cfd9a4','#6f8b52'],H);
var TR=[[16,8,8,'rgba(80,100,66,.4)'],[9,18,16,'rgba(44,60,36,.8)'],[5,38,30,'#182214']];TR.forEach(function(T){for(var i=0;i<T[0];i++){var x=r()*W,w=T[1]+r()*T[2];g.fillStyle=T[3];g.fillRect(x,0,w,H);g.fillStyle='rgba(255,240,190,.08)';g.fillRect(x+w*0.7,0,w*0.12,H)}})
g.globalCompositeOperation='lighter';for(var k=0;k<7;k++){var sx=W*(0.55+r()*0.35),sw=30+r()*70;g.beginPath();g.moveTo(sx,-10);g.lineTo(sx+sw,-10);g.lineTo(sx+sw-W*0.5,H);g.lineTo(sx-W*0.62,H);g.closePath();g.fillStyle='rgba(255,236,170,'+(0.05+r()*0.07)+')';g.fill()}
g.globalCompositeOperation='source-over';glow(W*0.82,0,W*0.5,'rgba(255,245,200,.7)');g.fillStyle=vgrad(H*0.78,H,['rgba(30,44,22,0)','#24331b']);g.fillRect(0,H*0.78,W,H*0.22)}
else if(kind==='night'){sky(['#03060f','#0d1838','#26386a'],H*0.8);for(var s=0;s<360;s++){g.fillStyle='rgba(255,255,255,'+(0.2+r()*0.8)+')';var z=r()*1.6+0.3;g.fillRect(r()*W,r()*H*0.7,z,z)}
g.fillStyle='#f4f1e3';g.beginPath();g.arc(W*0.8,H*0.18,26,0,7);g.fill();glow(W*0.8,H*0.18,180,'rgba(200,215,255,.25)');
var peak=[[W*0.08,H],[W*0.3,H*0.52],[W*0.42,H*0.38],[W*0.5,H*0.24],[W*0.58,H*0.36],[W*0.68,H*0.33],[W*0.86,H*0.6],[W,H*0.66],[W,H]];
g.beginPath();peak.forEach(function(p,i){i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1])});g.closePath();g.fillStyle=vgrad(H*0.24,H,['#5d6f99','#1b2440']);g.fill();
g.save();g.clip();g.beginPath();g.moveTo(0,0);g.lineTo(W,0);for(var x2=W;x2>=0;x2-=20)g.lineTo(x2,H*0.47+Math.sin(x2*0.05)*14+r()*16);g.closePath();g.fillStyle=vgrad(H*0.24,H*0.5,['#f6f8ff','#b8c5e6']);g.fill();g.restore();
ridge(H*0.84,H*0.05,'#05070d')}
else if(kind==='lake'){var hz=H*0.56;sky(['#f7c59f','#f0d7c4','#a9c3df'],hz);glow(W*0.3,hz*0.8,W*0.4,'rgba(255,214,170,.5)');
g.beginPath();g.moveTo(0,hz);[[0.12,0.78],[0.3,0.5],[0.44,0.2],[0.52,0.28],[0.6,0.16],[0.78,0.52],[1,0.7]].forEach(function(p){g.lineTo(W*p[0],hz*p[1])});g.lineTo(W,hz);g.closePath();g.fillStyle=vgrad(hz*0.16,hz,['#8a98b8','#5b6b8c']);g.fill();ridge(hz-H*0.02,H*0.05,'#2c3a33');g.fillStyle='#2c3a33';g.fillRect(0,hz-4,W,H-hz+4);
g.save();g.translate(0,2*hz);g.scale(1,-1);g.drawImage(c,0,0,W,hz,0,0,W,hz);g.restore();g.fillStyle='rgba(40,70,110,.35)';g.fillRect(0,hz,W,H-hz);
for(var q=0;q<90;q++){g.fillStyle='rgba(255,255,255,'+(0.04+r()*0.08)+')';g.fillRect(r()*W,hz+r()*(H-hz),40+r()*160,1.2)}}
else if(kind==='hills'){sky(['#bfe0f5','#e7f2ee'],H*0.4);var greens=['#9fc58b','#7fb06a','#5d9a4e','#3f7d3a','#2b5f2b'];
for(var h=0;h<5;h++){ridge(H*(0.32+h*0.13),H*(0.06+h*0.02),greens[h],[1.5+r(),3+r()*2,7+r()*3])}
for(var tr=0;tr<60;tr++){var tx=r()*W,ty=H*(0.5+r()*0.5);g.fillStyle='rgba(20,60,25,.8)';g.beginPath();g.arc(tx,ty,4+r()*7,0,7);g.fill()}}
else if(kind==='field'){var fz=H*0.5;sky(['#f9935a','#ffd29a','#fff1cf'],fz);g.fillStyle='#fff3c4';g.beginPath();g.arc(W*0.62,fz-30,46,0,7);g.fill();glow(W*0.62,fz-30,W*0.4,'rgba(255,220,150,.6)');
ridge(fz+6,H*0.03,'#8b6a52');g.fillStyle=vgrad(fz,H,['#6f7432','#3d4a1c']);g.fillRect(0,fz+4,W,H-fz);
for(var f=0;f<3200;f++){var dpt=Math.pow(r(),1.6),fy=fz+8+dpt*(H-fz),fr2=0.6+dpt*7;g.fillStyle=['#ff7a1a','#ff9a2e','#f05a14','#ffb347'][f%4];g.globalAlpha=0.55+dpt*0.45;g.beginPath();g.arc(r()*W,fy,fr2,0,7);g.fill()}g.globalAlpha=1}
else{var sz=H*0.48,bz=H*0.74;sky(['#5fc3ef','#bfe9fb','#eefaff'],sz);g.fillStyle='rgba(255,255,255,.85)';for(var cl=0;cl<5;cl++){var cx=r()*W,cy=H*(0.1+r()*0.2);for(var b=0;b<6;b++){g.beginPath();g.arc(cx+b*26,cy+Math.sin(b)*8,20+r()*18,0,7);g.fill()}}
g.fillStyle=vgrad(sz,bz,['#0f8fb3','#25c0c9','#8be6d8']);g.fillRect(0,sz,W,bz-sz);g.fillStyle=vgrad(bz,H,['#f6e7c1','#e7cf98']);g.beginPath();g.moveTo(0,bz);for(var x3=0;x3<=W;x3+=10)g.lineTo(x3,bz+Math.sin(x3*0.012)*10);g.lineTo(W,H);g.lineTo(0,H);g.closePath();g.fill();
g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=3;g.beginPath();for(var x4=0;x4<=W;x4+=10)g.lineTo(x4,bz-4+Math.sin(x4*0.012)*10+Math.sin(x4*0.08)*2);g.stroke();
g.strokeStyle='#3a2a1a';g.lineWidth=14;g.lineCap='round';g.beginPath();g.moveTo(W*0.14,H);g.quadraticCurveTo(W*0.12,H*0.55,W*0.2,H*0.3);g.stroke();
g.strokeStyle='#1f4a2a';g.lineWidth=9;for(var fd=0;fd<8;fd++){var a=fd/8*Math.PI*2;g.beginPath();g.moveTo(W*0.2,H*0.3);g.quadraticCurveTo(W*0.2+Math.cos(a)*90,H*0.3+Math.sin(a)*40-50,W*0.2+Math.cos(a)*170,H*0.3+Math.sin(a)*70+40);g.stroke()}}
var vg=g.createRadialGradient(W/2,H/2,H*0.35,W/2,H/2,W*0.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.35)');g.fillStyle=vg;g.fillRect(0,0,W,H);
var img=g.getImageData(0,0,W,H),d=img.data;for(var p=0;p<d.length;p+=4){var v=(r()-0.5)*10;d[p]+=v;d[p+1]+=v;d[p+2]+=v}g.putImageData(img,0,0);return c};
var shrink=function(src,w,h){var c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(src,0,0,w,h);return c.toDataURL('image/jpeg',0.82)};

var root=document.querySelector('.mg'),canvas=root.querySelector('.mg-canvas'),fallback=root.querySelector('.mg-fallback'),list=root.querySelector('.mg-thumbs'),sr=root.querySelector('.mg-sr');
var prev=root.querySelector('.mg-prev'),next=root.querySelector('.mg-next');
var reducedMq=matchMedia('(prefers-reduced-motion: reduce)'),reduced=reducedMq.matches;reducedMq.addEventListener('change',function(){reduced=reducedMq.matches;schedule()});
var n=ITEMS.length,active=0,pictures=ITEMS.map(function(it,i){return paint(it.kind,11+i*7)});
ITEMS.forEach(function(it,i){var li=document.createElement('li'),b=document.createElement('button');b.type='button';b.setAttribute('aria-label','Show '+it.alt);
b.innerHTML='<img alt="" width="80" height="50" src="'+shrink(pictures[i],160,100)+'">';b.addEventListener('click',function(){go(i)});li.appendChild(b);list.appendChild(li)});
var thumbs=list.querySelectorAll('button');

/* WebGL, or the cross-fade without it. */
var gl=null,failed=false,uniforms={},textures=[],from=0,to=0,progress=1,startedAt=0,direction=1,raf=0;
var useFallback=function(){failed=true;canvas.hidden=true;fallback.hidden=false;fallback.innerHTML=pictures.map(function(p,i){return '<img alt="'+ITEMS[i].alt+'" src="'+p.toDataURL('image/jpeg',0.9)+'"'+(i===active?' class="is-on"':' aria-hidden="true"')+'>'}).join('')};
var compile=function(type,src){var s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s};
try{gl=canvas.getContext('webgl',{alpha:false,antialias:false})||canvas.getContext('experimental-webgl');if(!gl)throw new Error('no webgl');
var prog=gl.createProgram();gl.attachShader(prog,compile(gl.VERTEX_SHADER,VERT));gl.attachShader(prog,compile(gl.FRAGMENT_SHADER,FRAG));gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw new Error('link');gl.useProgram(prog);
var buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);var loc=gl.getAttribLocation(prog,'a_position');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
['from','to','progress','resolution','fromAspect','toAspect','scale','direction','edge','drift'].forEach(function(nm){uniforms[nm]=gl.getUniformLocation(prog,'u_'+nm)});
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
textures=pictures.map(function(p){var t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,p);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);return t});
canvas.addEventListener('webglcontextlost',function(e){e.preventDefault();cancelAnimationFrame(raf);useFallback()});
}catch(e){useFallback()}

var resize=function(){if(failed)return;var dpr=Math.min(devicePixelRatio||1,2),w=Math.round(canvas.clientWidth*dpr),h=Math.round(canvas.clientHeight*dpr);if(!w||!h)return;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}draw()};
var draw=function(){if(failed)return;if(progress<1){var span=reduced?0:DURATION;progress=span===0?1:easeInOutQuint(Math.min((performance.now()-startedAt)/span,1))}
gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,textures[from]);gl.uniform1i(uniforms.from,0);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,textures[to]);gl.uniform1i(uniforms.to,1);
gl.uniform1f(uniforms.progress,progress);gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);gl.uniform1f(uniforms.fromAspect,W/H);gl.uniform1f(uniforms.toAspect,W/H);
gl.uniform1f(uniforms.scale,NOISE);gl.uniform1f(uniforms.direction,direction);gl.uniform1f(uniforms.edge,Math.max(EDGE,0.001));gl.uniform1f(uniforms.drift,DRIFT);gl.drawArrays(gl.TRIANGLE_STRIP,0,4)};
/* Frames are drawn while a dissolve runs, not forever: a grid of cards should idle. */
var loop=function(){raf=0;draw();if(progress<1)raf=requestAnimationFrame(loop)};
var schedule=function(){if(!raf&&!failed)raf=requestAnimationFrame(loop)};

var paint2=function(){thumbs.forEach(function(b,i){b.setAttribute('aria-current',String(i===active))});
var cur=thumbs[active];if(cur&&cur.parentElement)list.scrollTo({left:cur.parentElement.offsetLeft-list.clientWidth/2+44,behavior:reduced?'auto':'smooth'});
prev.disabled=!LOOP&&active===0;next.disabled=!LOOP&&active===n-1;sr.textContent=ITEMS[active].alt+' — '+(active+1)+' of '+n;
if(failed)fallback.querySelectorAll('img').forEach(function(im,i){im.classList.toggle('is-on',i===active);if(i===active)im.removeAttribute('aria-hidden');else im.setAttribute('aria-hidden','true')})};
var go=function(target){var nextIndex=wrapIndex(target,n,LOOP);if(nextIndex===active)return;var was=active;active=nextIndex;
if(!failed){from=was;to=active;progress=0;startedAt=performance.now();direction=LOOP?(((active-was+n)%n)*2<=n?1:-1):(active>was?1:-1);schedule()}paint2();restart()};

/* Autoplay, paused on hover, focus or a hidden tab, and off under reduced motion. */
var timer=0,hovering=false,focused=false;
var restart=function(){clearInterval(timer);if(!AUTOPLAY||reduced||hovering||focused||document.hidden||n<2)return;timer=setInterval(function(){go(active+1)},Math.max(AUTOPLAY,600))};
root.addEventListener('mouseenter',function(){hovering=true;restart()});root.addEventListener('mouseleave',function(){hovering=false;restart()});
root.addEventListener('focusin',function(){focused=true;restart()});root.addEventListener('focusout',function(e){if(!root.contains(e.relatedTarget)){focused=false;restart()}});
document.addEventListener('visibilitychange',restart);
prev.addEventListener('click',function(){go(active-1)});next.addEventListener('click',function(){go(active+1)});
root.addEventListener('keydown',function(e){if(e.key==='ArrowLeft'){e.preventDefault();go(active-1)}else if(e.key==='ArrowRight'){e.preventDefault();go(active+1)}});
var swipeX=null;root.addEventListener('pointerdown',function(e){swipeX=e.clientX});root.addEventListener('pointerup',function(e){if(swipeX===null)return;var dx=e.clientX-swipeX;swipeX=null;if(Math.abs(dx)>48)go(active+(dx<0?1:-1))});

new ResizeObserver(resize).observe(canvas);
if(!failed){resize();canvas.classList.add('is-ready')}
paint2();restart();
})();`;

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
  {
    id: "21st-contribution-skyline",
    title: "Contribution skyline",
    category: "Charts & data viz",
    description:
      "A year of activity as a GitHub-style heat map that folds up into an isometric skyline and back down: one camera swings from overhead to the corner while each week's bars rise in a wave. Hover or tap a day for its count, walk the grid with the arrow keys, hover a legend swatch to isolate a level, and drag to orbit in 3D. After Kedhareswer Naidu's Contribution Skyline on 21st.dev.",
    tag: "21st.dev",
    html: SKYLINE_HTML,
    css: SKYLINE_CSS,
    js: SKYLINE_JS,
  },
  {
    id: "21st-morph-gallery",
    title: "Morph gallery",
    category: "Galleries & media",
    description:
      "A full-bleed photo gallery whose slides dissolve into each other through noise instead of cutting or fading: one WebGL shader tears the old picture away in drifting tatters while the new one's bright areas burn through first. Arrows, swipe, arrow keys, thumbnails and autoplay that pauses on hover. After Kedhareswer Naidu's Morph Gallery on 21st.dev.",
    tag: "21st.dev",
    html: MORPH_HTML,
    css: MORPH_CSS,
    js: MORPH_JS,
  },
];
