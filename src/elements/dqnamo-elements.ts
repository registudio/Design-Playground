/**
 * Experiments from dqnamo's Kitchen (https://www.dqnamo.com/kitchen), rebuilt as plain
 * HTML, CSS and JavaScript.
 *
 * The Kitchen is a set of interaction studies by dqnamo, published as React components
 * on Tailwind and Motion. Its repository states no licence, so nothing here is copied
 * from it: these are ports in the same sense as the cult-ui and 21st.dev elements, the
 * idea, the proportions and the timings read from the published experiment and the
 * implementation written here. Where an experiment shows dqnamo's own marks (the logo
 * the trace loader draws, his signature, his studio's card, the audio clip in the
 * cassette) a mark of this project's own stands in, because those are his, not the
 * component's. Phosphor icons are drawn as plain strokes for the same reason.
 *
 * All of them carry the `dqnamo-` prefix, which credits them through `PORT_SOURCES` and
 * puts them in `INTERACTION_ONLY` in catalogue.ts: their scripts run under
 * `prefers-reduced-motion`, and each damps its own movement there instead.
 */
import type { BrowseCategory } from "./taxonomy";

interface DqnamoElement {
  id: string;
  title: string;
  category: BrowseCategory;
  description: string;
  tag: string;
  html: string;
  css: string;
  js: string;
}

/** The Kitchen's light, quiet page: warm greys, one ink, Inter-like sans. */
const PAGE = `:root{color-scheme:light}[hidden]{display:none!important}body{background:#f5f5f3;color:#1d1d1b;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
button:focus-visible,input:focus-visible,textarea:focus-visible,[tabindex]:focus-visible{outline:2px solid #2f6bff;outline-offset:3px}`;

/** Scales a stage down, never up, to fit the frame. */
const FIT = `var fit=function(stage){var go=function(){stage.style.zoom='1';var box=stage.getBoundingClientRect();stage.style.zoom=String(Math.min(1,(innerWidth-20)/box.width,(innerHeight-20)/box.height))};addEventListener('resize',go);go();requestAnimationFrame(go)};`;
const REDUCED = `var reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;`;

const svg = (body: string, size = 16, stroke = 2) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const ICON = {
  arrow: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  trash: '<path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>',
  file: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/>',
  upload: '<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/>',
  floppy: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3"/><rect x="8" y="13" width="8" height="6"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18.5 20a6.5 6.5 0 0 0-2.5-5.1"/>',
  command: '<path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z"/>',
  spinner: '<path d="M12 3a9 9 0 1 0 9 9"/>',
  restart: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
  play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/>',
  volume: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/>',
  mute: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="m17 9 5 6"/><path d="m22 9-5 6"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  send: '<path d="M21 3 10 14"/><path d="M21 3l-7 18-4-7-7-4z"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.9-4"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.9 4"/><path d="M20 20v-4h-4"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
} as const;
const icon = (name: keyof typeof ICON, size = 16, stroke = 2) => svg(ICON[name], size, stroke);

/* ── Tactile button ─────────────────────────────────────────────────────────── */

const tactile = (size: string, label: string) =>
  `<button class="tb${size}" type="button"><span class="tb-face">${label}${icon("arrow", 14, 2.4)}</span></button>`;

/* ── Receipt printer ────────────────────────────────────────────────────────── */

/**
 * The paper feeds in nine short pulls with a rest between each, like a thermal head
 * advancing a line at a time: each pull covers less paper than the last.
 */
const FEED_STEPS = 9;
const feedKeyframes = (() => {
  const frames: string[] = ["0%{transform:translateY(calc(-100% + 2px))}"];
  for (let step = 1; step <= FEED_STEPS; step++) {
    const travelled = 1 - (1 - step / FEED_STEPS) ** 1.35;
    const end = ((step / FEED_STEPS) * 100).toFixed(2);
    const rest = Math.min(100, (step / FEED_STEPS) * 100 + 3.2).toFixed(2);
    const at = `translateY(${(-100 + travelled * 100).toFixed(2)}%)`;
    frames.push(`${end}%{transform:${at}}`);
    if (step < FEED_STEPS) frames.push(`${rest}%{transform:${at}}`);
  }
  return `@keyframes rp-feed{${frames.join("")}}`;
})();
const receiptTeeth = (() => {
  const teeth = 36;
  const points = ["0 0", "100% 0", "100% calc(100% - 4px)"];
  for (let i = 1; i <= teeth * 2; i++) {
    const x = (100 - (i * 100) / (teeth * 2)).toFixed(3);
    points.push(`${x}% ${i % 2 ? "100%" : "calc(100% - 4px)"}`);
  }
  return `polygon(${points.join(",")})`;
})();

/* ── Playing cards ──────────────────────────────────────────────────────────── */

/** Pip positions (percent of the pip field) for the number cards; lower half pips turn over. */
const PIPS: Record<string, [number, number][]> = {
  "2": [[50, 0], [50, 100]],
  "3": [[50, 0], [50, 50], [50, 100]],
  "4": [[22, 0], [78, 0], [22, 100], [78, 100]],
  "5": [[22, 0], [78, 0], [50, 50], [22, 100], [78, 100]],
  "6": [[22, 0], [78, 0], [22, 50], [78, 50], [22, 100], [78, 100]],
  "7": [[22, 0], [78, 0], [50, 25], [22, 50], [78, 50], [22, 100], [78, 100]],
  "8": [[22, 0], [78, 0], [50, 25], [22, 50], [78, 50], [50, 75], [22, 100], [78, 100]],
  "9": [[22, 0], [78, 0], [22, 33], [78, 33], [50, 50], [22, 67], [78, 67], [22, 100], [78, 100]],
  "10": [[22, 0], [78, 0], [50, 17], [22, 33], [78, 33], [22, 67], [78, 67], [50, 83], [22, 100], [78, 100]],
};

/* ── Stamp ──────────────────────────────────────────────────────────────────── */

/** A perforated edge: a half-round bite every step along all four sides. */
const perforations = (across: number, down: number, depth: number) => {
  const points: string[] = ["0% 0%"];
  const edge = (count: number, at: (t: number, inward: boolean) => string) => {
    for (let i = 0; i < count; i++) {
      for (const [f, inward] of [[0.3, false], [0.5, true], [0.7, false], [1, false]] as const) points.push(at((i + f) / count, inward));
    }
  };
  edge(across, (t, inward) => `${(t * 100).toFixed(2)}% ${inward ? depth : 0}%`);
  edge(down, (t, inward) => `${inward ? 100 - depth : 100}% ${(t * 100).toFixed(2)}%`);
  edge(across, (t, inward) => `${(100 - t * 100).toFixed(2)}% ${inward ? 100 - depth : 100}%`);
  edge(down, (t, inward) => `${inward ? depth : 0}% ${(100 - t * 100).toFixed(2)}%`);
  return `polygon(${points.join(",")})`;
};
const STAMP_EDGE = perforations(11, 14, 2.6);

const STAMPS = [
  {
    kicker: "LAKE DISTRICT",
    value: "24",
    rotate: -4,
    art: `<svg viewBox="0 0 120 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="st-sky1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2f7a"/><stop offset=".55" stop-color="#d9547a"/><stop offset="1" stop-color="#ffb36b"/></linearGradient></defs><rect width="120" height="150" fill="url(#st-sky1)"/><circle cx="72" cy="86" r="16" fill="#ffd89a"/><path d="M0 98 28 62l18 20 22-30 26 34 26-18v82H0z" fill="#3b2f63"/><path d="M0 112 22 92l20 14 26-20 30 22 22-10v52H0z" fill="#22204a"/><rect y="118" width="120" height="32" fill="#e86f78" opacity=".5"/><path d="M0 124h120M8 132h104M20 140h80" stroke="#ffd2a1" stroke-width="1.2" opacity=".7"/></svg>`,
  },
  {
    kicker: "NORTH SEA",
    value: "36",
    rotate: 3,
    art: `<svg viewBox="0 0 120 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="120" height="150" fill="#cfe6ea"/><circle cx="34" cy="40" r="13" fill="#f6efcf"/><path d="M0 92c16-6 28 6 44 0s28-8 44 0 22 4 32 0v58H0z" fill="#2c6f86"/><path d="M0 108c18-6 30 6 46 0s30-8 44 0 20 4 30 0v42H0z" fill="#1d4c63"/><path d="M70 92V58l16 26z" fill="#fffaf0"/><path d="M60 94h32l-5 7H65z" fill="#7a3a2b"/><path d="M0 126c20-5 36 5 60 0s40-5 60 0" stroke="#e8f3f4" stroke-width="1.4" fill="none" opacity=".6"/></svg>`,
  },
  {
    kicker: "FIELD NOTES",
    value: "12",
    rotate: -1.5,
    art: `<svg viewBox="0 0 120 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="120" height="150" fill="#f1e2bf"/><circle cx="60" cy="64" r="34" fill="#e4572e"/><path d="M60 30v68M26 64h68M36 40l48 48M84 40 36 88" stroke="#f1e2bf" stroke-width="3"/><circle cx="60" cy="64" r="10" fill="#2b2a28"/><path d="M60 98v40" stroke="#4d6b3c" stroke-width="4"/><path d="M60 122c-14-2-22-10-24-20 12 0 22 8 24 20zM60 116c12-2 20-10 22-18-12 0-20 8-22 18z" fill="#4d6b3c"/></svg>`,
  },
] as const;

/* ── Scroll fade list ───────────────────────────────────────────────────────── */

const CITIES = [
  ["🇵🇹", "Lisbon"], ["🇯🇵", "Kyoto"], ["🇲🇽", "Oaxaca"], ["🇳🇴", "Bergen"], ["🇿🇦", "Cape Town"], ["🇨🇦", "Montréal"],
  ["🇮🇹", "Bologna"], ["🇰🇷", "Busan"], ["🇦🇷", "Mendoza"], ["🇬🇭", "Accra"], ["🇫🇮", "Helsinki"], ["🇻🇳", "Hội An"],
  ["🇳🇿", "Wellington"], ["🇲🇦", "Fès"], ["🇮🇸", "Akureyri"], ["🇨🇴", "Medellín"], ["🇬🇷", "Chania"], ["🇮🇳", "Jaipur"],
  ["🇪🇸", "San Sebastián"], ["🇦🇺", "Hobart"], ["🇩🇪", "Leipzig"], ["🇵🇪", "Cusco"], ["🇸🇪", "Gothenburg"], ["🇹🇭", "Chiang Mai"],
] as const;

/* ── Model selector ─────────────────────────────────────────────────────────── */

/** Invented models: the component is the menu, not anyone's price list. */
const MODELS = [
  { id: "atlas", label: "Atlas 4", provider: "Northwind", color: "#e0703a", blurb: "The flagship. Deep reasoning for long, ambiguous work.", metrics: [92, 48, 80, 30], fast: false },
  { id: "atlas-mini", label: "Atlas 4 Mini", provider: "Northwind", color: "#e0703a", blurb: "Most of the flagship's judgement at a fraction of the wait.", metrics: [74, 82, 64, 78], fast: true },
  { id: "nova", label: "Nova Pro", provider: "Corelabs", color: "#3a7be0", blurb: "Strong at code and tools, with a very long memory.", metrics: [86, 60, 96, 46], fast: true },
  { id: "lumen", label: "Lumen 2", provider: "Halcyon", color: "#2fa37a", blurb: "Small, quick and cheap. Good for drafts and routing.", metrics: [58, 94, 50, 92], fast: false },
] as const;

/* ── Signature ──────────────────────────────────────────────────────────────── */

/** A loose hand-drawn flourish, not anyone's name. */
const FLOURISH =
  "M36 128 C52 52 102 40 96 112 C93 150 62 148 72 110 C86 64 138 74 130 122 C126 150 150 148 166 104 C176 74 202 72 196 112 C192 142 218 146 238 104 C252 76 274 86 264 118 C258 140 292 138 324 92 M110 162 C176 150 262 148 336 152";

/* ── Logo trace loader ──────────────────────────────────────────────────────── */

/** This project's own mark: a rounded hexagon around a triangle, traced while work runs. */
const MARK_OUTER = "M50 6 Q54 4 58 6 L88 23 Q92 26 92 30 L92 70 Q92 74 88 77 L58 94 Q54 96 50 96 Q46 96 42 94 L12 77 Q8 74 8 70 L8 30 Q8 26 12 23 L42 6 Q46 4 50 6 Z";
const MARK_INNER = "M50 28 L72 66 L28 66 Z";

export const DQNAMO_ELEMENTS: DqnamoElement[] = [
  {
    id: "dqnamo-tactile-button",
    title: "Tactile button",
    category: "Buttons & inputs",
    description:
      "A button with real depth: a shaped face on a darker base, which sinks a little on hover and all the way when pressed. Comes in three sizes, in dark and light. Rebuilt from dqnamo's Kitchen.",
    tag: "dqnamo",
    html: `<main class="tb-stage">
<div class="tb-row">${tactile(" tb-sm", "Continue")}${tactile("", "Continue")}${tactile(" tb-lg", "Continue")}</div>
<div class="tb-row tb-light">${tactile(" tb-sm", "Continue")}${tactile("", "Continue")}${tactile(" tb-lg", "Continue")}</div>
<p class="tb-note" aria-live="polite">Press one. Space and Enter work too.</p></main>`,
    css: `${PAGE}
.tb-stage{display:grid;gap:30px;justify-items:center}
.tb-row{display:flex;gap:20px;align-items:flex-end}
.tb{--depth:6px;--face:#4a4a46;--hi:#64645e;--ink:#eeeeec;--base:#292926;--shade:#141412;position:relative;border:0;background:none;padding:0 0 var(--depth);border-radius:.75rem;color:var(--ink);-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.tb-light .tb{--face:#fdfdfc;--hi:#ffffff;--ink:#242422;--base:#d2d2ce;--shade:#a9a9a4}
.tb-sm{--depth:3px;border-radius:.625rem}.tb-lg{--depth:8px;border-radius:.875rem}
.tb::before{content:"";position:absolute;left:0;right:0;bottom:0;top:var(--depth);border-radius:inherit;background:var(--base);box-shadow:inset 0 -1px 0 var(--shade),0 10px 16px -10px rgba(20,20,18,.6)}
.tb-face{position:relative;display:flex;align-items:center;gap:6px;height:40px;padding:0 16px;border-radius:inherit;background:linear-gradient(180deg,var(--hi),var(--face) 60%);box-shadow:inset 0 1px 0 rgba(255,255,255,.16),inset 0 0 0 1px rgba(0,0,0,.18);font-size:14px;font-weight:600;letter-spacing:-.01em;transition:transform 150ms cubic-bezier(.23,1,.32,1)}
.tb-sm .tb-face{height:32px;padding:0 12px;font-size:13px}.tb-lg .tb-face{height:48px;padding:0 20px;font-size:16px}
@media(hover:hover){.tb:hover .tb-face{transform:translateY(2px)}}
.tb:active .tb-face,.tb.is-down .tb-face{transform:translateY(var(--depth))}
.tb-note{margin:0;font-size:12px;color:#7b7b76}`,
    js: `var note=document.querySelector('.tb-note'),count=0;
document.querySelectorAll('.tb').forEach(function(b){
b.addEventListener('click',function(){count++;note.textContent='Pressed '+count+(count===1?' time':' times')});
b.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' ')b.classList.add('is-down')});
b.addEventListener('keyup',function(){b.classList.remove('is-down')});
b.addEventListener('blur',function(){b.classList.remove('is-down')});});`,
  },
  {
    id: "dqnamo-receipt-printer",
    title: "Receipt printer",
    category: "Loaders & feedback",
    description:
      "A checkout that prints its receipt. The order processes on a small screen, then the paper feeds out a line at a time with the totals, the card and a barcode. Rebuilt from dqnamo's Kitchen.",
    tag: "dqnamo",
    html: `<main class="rp-stage"><button class="rp-replay" type="button">${icon("restart", 13)}Replay</button>
<section class="rp" aria-label="Receipt printer" data-stage="processing">
<div class="rp-machine"><div class="rp-head"><span class="rp-logo" aria-hidden="true"></span><span class="rp-pill">Checkout</span></div>
<div class="rp-screen"><div class="rp-line"><div><b>Pro plan</b><span>Annual subscription</span></div><div class="rp-total"><span>Total</span><b>£230.40</b></div></div>
<div class="rp-status"><span class="rp-ind" aria-hidden="true"><i class="rp-spin">${icon("spinner", 16, 2.4)}</i><i class="rp-ok">${icon("check", 16, 3)}</i></span><span role="status" aria-live="polite" class="rp-label">Processing your order</span></div></div>
<div class="rp-slot" aria-hidden="true"></div></div>
<div class="rp-out"><div class="rp-feed"><article class="rp-paper" aria-label="Receipt">
<div class="rp-row"><b>PRO PLAN</b><span>£192.00</span></div><div class="rp-sub">Annual subscription</div><hr>
<div class="rp-row rp-dim"><span>Subtotal</span><span>£192.00</span></div><div class="rp-row rp-dim"><span>VAT 20%</span><span>£38.40</span></div>
<div class="rp-row rp-big"><b>TOTAL PAID</b><b>£230.40</b></div><hr>
<div class="rp-row rp-dim"><span>Order</span><span>ORD-2048</span></div><div class="rp-row rp-dim"><span>Paid with</span><span>Visa •••• 4242</span></div><div class="rp-row rp-dim"><span>Date</span><span class="rp-date"></span></div>
<div class="rp-bars" aria-hidden="true"></div><div class="rp-code">ORD 2048</div></article></div></div></section></main>`,
    css: `${PAGE}
.rp-stage{position:relative;width:420px;height:560px;display:flex;justify-content:center;padding-top:28px}
.rp-replay{position:absolute;top:0;right:0;display:flex;align-items:center;gap:5px;height:28px;padding:0 10px;border:1px solid #e2e2de;border-radius:8px;background:#fff;color:#55554f;font-size:12px}
.rp{width:320px;display:flex;flex-direction:column;align-items:center}
.rp-machine{position:relative;width:100%;padding:12px 12px 30px;border-radius:24px;background:linear-gradient(170deg,#3b3b38,#2a2a28);border:1px solid #1d1d1b;box-shadow:0 22px 36px -20px rgba(20,20,18,.6),0 6px 14px -8px rgba(20,20,18,.3),inset 0 1px 0 rgba(255,255,255,.12),inset 0 -1px 0 rgba(0,0,0,.5);z-index:2}
.rp-head{display:flex;justify-content:space-between;align-items:center;height:40px;padding:0 2px 8px}
.rp-logo{width:22px;height:22px;border-radius:5px;background:linear-gradient(135deg,#6b6b66,#4a4a46);box-shadow:inset 0 1px 0 rgba(255,255,255,.2)}
.rp-pill{height:26px;padding:0 12px;display:flex;align-items:center;border-radius:9px;background:#4a4a46;color:#eeeeec;font-size:12px;font-weight:600;box-shadow:inset 0 1px 0 #64645e,0 3px 0 #1a1a18}
.rp-screen{position:relative;padding:16px;border-radius:12px;background:#1b1b19;color:#f3f3f1;box-shadow:inset 0 0 24px 4px rgba(0,0,0,.55)}
.rp-line{display:flex;justify-content:space-between;gap:12px}.rp-line b{display:block;font-size:14px;font-weight:600}.rp-line span{font-size:12px;color:#a3a39d}
.rp-total{text-align:right}.rp-total b{font-size:17px;margin-top:2px;font-variant-numeric:tabular-nums}
.rp-status{display:flex;align-items:center;gap:8px;margin-top:18px;font-size:12px;color:#a3a39d}
.rp-ind{position:relative;width:18px;height:18px}.rp-ind i{position:absolute;inset:0;display:grid;place-items:center;transition:opacity .16s,transform .16s cubic-bezier(.23,1,.32,1)}
.rp-spin svg{animation:rp-rot .8s linear infinite}.rp-ok{color:#3fbf6f;opacity:0;transform:scale(.94)}
.rp[data-stage=complete] .rp-spin{opacity:0;transform:scale(.96)}.rp[data-stage=complete] .rp-ok{opacity:1;transform:none}
.rp-label{transition:opacity .18s}.rp-label.is-out{opacity:0}
.rp-slot{position:absolute;left:24px;right:24px;bottom:12px;height:8px;border-radius:4px;background:#0f0f0e;box-shadow:inset 0 2px 3px #000}
.rp-out{position:relative;margin-top:-18px;width:280px;height:380px;overflow:hidden;padding:0 10px;z-index:3}
.rp-out::before{content:"";position:absolute;left:10px;right:10px;top:-2px;height:8px;background:rgba(15,15,14,.7);filter:blur(5px);z-index:2;opacity:0;transition:opacity .2s}
.rp[data-stage=printing] .rp-out::before,.rp[data-stage=complete] .rp-out::before{opacity:1}
.rp-feed{transform:translateY(calc(-100% + 2px));opacity:0;filter:drop-shadow(0 8px 14px rgba(20,20,18,.16))}
.rp[data-stage=printing] .rp-feed{opacity:1;transform:translateY(0);animation:rp-feed 1.75s linear}
.rp[data-stage=complete] .rp-feed{opacity:1;transform:translateY(0)}
.rp-paper{padding:22px 20px 26px;background:#fdfdfb;color:#1d1d1b;font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;clip-path:${receiptTeeth};background-image:repeating-linear-gradient(0deg,rgba(0,0,0,.012) 0 1px,transparent 1px 3px)}
.rp-paper hr{border:0;border-top:1px dashed #cfcfca;margin:12px 0}
.rp-row{display:flex;justify-content:space-between}.rp-sub,.rp-dim{color:#8a8a84;font-size:10px}.rp-big{margin-top:8px;font-size:12px;letter-spacing:.06em}.rp-big b:last-child{font-size:15px;letter-spacing:0}
.rp-bars{display:flex;justify-content:center;gap:1px;height:32px;margin-top:16px}.rp-bars i{background:#1d1d1b}
.rp-code{text-align:center;font-size:8px;letter-spacing:.3em;color:#9a9a94;margin-top:4px}
@keyframes rp-rot{to{transform:rotate(360deg)}}
${feedKeyframes}`,
    js: `${FIT}fit(document.querySelector('.rp-stage'));
var root=document.querySelector('.rp'),label=document.querySelector('.rp-label'),timers=[];
var labels={processing:'Processing your order',printing:'Printing your receipt',complete:'Order complete'};
var bars=document.querySelector('.rp-bars'),seed=2048;
for(var i=0;i<44;i++){seed=(seed*16807)%2147483647;var b=document.createElement('i');b.style.width=(1+seed%3)+'px';if(seed%5===0)b.style.background='transparent';bars.appendChild(b)}
var d=new Date();document.querySelector('.rp-date').textContent=d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}).toUpperCase()+' · '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
var set=function(stage){root.dataset.stage=stage;label.classList.add('is-out');setTimeout(function(){label.textContent=labels[stage];label.classList.remove('is-out')},120)};
var run=function(){timers.forEach(clearTimeout);timers=[];root.dataset.stage='processing';label.textContent=labels.processing;
timers.push(setTimeout(function(){set('printing')},1400));timers.push(setTimeout(function(){set('complete')},1400+1800))};
document.querySelector('.rp-replay').addEventListener('click',run);run();`,
  },
  {
    id: "dqnamo-cassette-player",
    title: "Cassette player",
    category: "Galleries & media",
    description:
      "An audio player built into a compact cassette: the reels turn while it plays, tape winds from one spool to the other, and restart rewinds it with a whirr. The tune is synthesised in the page. Rebuilt from dqnamo's Kitchen.",
    tag: "dqnamo",
    html: `<main class="cs-stage"><section class="cs" aria-label="Side A audio player">
<span class="cs-screw" style="top:4%;left:2.6%"></span><span class="cs-screw" style="top:4%;right:2.6%"></span><span class="cs-screw" style="bottom:4%;left:2.6%"></span><span class="cs-screw" style="bottom:4%;right:2.6%"></span>
<div class="cs-label"><div class="cs-top"><div><span class="cs-kicker">ARCHIVE 07</span><span class="cs-title">Late Bloom</span></div><div class="cs-side"><span>SIDE A</span><small>PG-0207</small></div></div>
<div class="cs-band"><div class="cs-stripes" aria-hidden="true"><i></i><i></i><i></i></div>
<div class="cs-window" aria-hidden="true"><span class="cs-pack cs-pack-l"></span><span class="cs-pack cs-pack-r"></span><div class="cs-glass"></div>
<svg class="cs-reel cs-reel-l" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="#f4f1ea"/><g fill="#2b2925">${[0, 60, 120, 180, 240, 300].map(a => `<rect x="46" y="20" width="8" height="14" rx="2" transform="rotate(${a} 50 50)"/>`).join("")}</g><circle cx="50" cy="50" r="13" fill="none" stroke="#1b1a18" stroke-width="3"/></svg>
<svg class="cs-reel cs-reel-r" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="#f4f1ea"/><g fill="#2b2925">${[0, 60, 120, 180, 240, 300].map(a => `<rect x="46" y="20" width="8" height="14" rx="2" transform="rotate(${a} 50 50)"/>`).join("")}</g><circle cx="50" cy="50" r="13" fill="none" stroke="#1b1a18" stroke-width="3"/></svg></div></div>
<div class="cs-progress"><input class="cs-seek" type="range" min="0" max="1000" value="0" aria-label="Seek"><div class="cs-times"><span><span class="cs-sr">Elapsed </span><span class="cs-now">0:00</span></span><span><span class="cs-sr">Total </span><span class="cs-len">0:24</span></span></div></div></div>
<div class="cs-bay"><button type="button" class="cs-btn cs-restart" aria-label="Restart track">${icon("restart", 14, 2.2)}</button><button type="button" class="cs-btn cs-play" aria-label="Play">${icon("play", 16)}</button><button type="button" class="cs-btn cs-mute" aria-label="Mute">${icon("volume", 14, 2.2)}</button></div>
</section></main>`,
    css: `${PAGE}
.cs-stage{width:520px}
.cs{position:relative;aspect-ratio:1.58;border-radius:18px;border:1px solid #050505;background:linear-gradient(165deg,#373735,#20201f 52%,#0e0e0d);box-shadow:0 28px 48px rgba(0,0,0,.24),0 8px 16px rgba(0,0,0,.18),inset 0 2px 1px rgba(255,255,255,.2),inset 0 -3px 3px rgba(0,0,0,.74)}
.cs::before{content:"";position:absolute;inset:6px;border-radius:13px;border:1px solid rgba(255,255,255,.12);box-shadow:inset 0 0 0 1px rgba(0,0,0,.6);pointer-events:none}
.cs-screw{position:absolute;width:11px;height:11px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#77756f,#2b2a27);box-shadow:inset 0 0 0 1px #111}.cs-screw::after{content:"";position:absolute;left:2px;right:2px;top:5px;height:1px;background:#111;transform:rotate(35deg)}
.cs-label{position:absolute;top:9.5%;left:8.5%;right:8.5%;bottom:24%;border-radius:9px;background:#f3ecdc;color:#25211d;box-shadow:0 0 0 4px #e6dcc5,inset 0 0 12px rgba(92,74,49,.12);container-type:inline-size;overflow:hidden}
.cs-top{display:flex;justify-content:space-between;margin:14px 16px 0}
.cs-kicker{display:block;font:700 10px ui-monospace,Menlo,monospace;letter-spacing:.12em;color:#8b7b63}
.cs-title{display:block;margin-top:7px;font-size:19px;font-weight:600;letter-spacing:-.04em}
.cs-side{display:grid;justify-items:end;gap:7px;font:700 10px ui-monospace,Menlo,monospace}.cs-side span{padding:3px 7px;border-radius:99px;background:#25211d;color:#f3ecdc;letter-spacing:.08em}.cs-side small{font-size:9px;color:#a2927a;letter-spacing:.08em}
.cs-band{position:relative;height:34%;margin-top:12px}
.cs-stripes{position:absolute;left:-4px;right:-4px;top:50%;height:58%;transform:translateY(-50%);display:grid;grid-template-rows:repeat(3,1fr);gap:4px}.cs-stripes i:nth-child(1){background:#e2a640}.cs-stripes i:nth-child(2){background:#d0612f}.cs-stripes i:nth-child(3){background:#2f6b72}
.cs-window{position:absolute;top:0;bottom:0;left:17.5%;right:17.5%;border-radius:99px;background:#1b1a18;box-shadow:0 0 0 4px #e6dcc5,inset 0 3px 8px rgba(0,0,0,.6);overflow:hidden}
.cs-glass{position:absolute;top:12%;bottom:12%;left:28%;right:28%;border:2px solid #11100f;border-radius:3px;background:linear-gradient(#45413b,#393631);box-shadow:inset 0 3px 6px rgba(0,0,0,.7);overflow:hidden}
.cs-pack{position:absolute;top:50%;width:150px;height:150px;margin:-75px 0 0 -75px;border-radius:50%;background:repeating-radial-gradient(circle,#050505 0 2px,#191919 2px 4px);box-shadow:inset 0 0 5px #000;z-index:1;transition:transform .2s linear}
.cs-pack-l{left:22%}.cs-pack-r{left:78%}
.cs-reel{position:absolute;top:50%;width:62px;height:62px;margin:-31px 0 0 -31px;z-index:2;filter:drop-shadow(0 1px 1px rgba(0,0,0,.4))}
.cs-reel-l{left:17%}.cs-reel-r{left:83%}
.cs-progress{position:absolute;left:16px;right:16px;bottom:12px}
.cs-seek{width:100%;height:20px;margin:0;appearance:none;background:transparent;cursor:pointer}
.cs-seek::-webkit-slider-runnable-track{height:3px;border-radius:3px;background:linear-gradient(#25211d,#25211d) 0/var(--p,0%) 100% no-repeat,#25211d47}
.cs-seek::-webkit-slider-thumb{appearance:none;width:13px;height:13px;margin-top:-5px;border-radius:50%;background:#fff;border:2px solid #25211d;box-shadow:0 1px 4px rgba(37,33,29,.4)}
.cs-seek::-moz-range-track{height:3px;border-radius:3px;background:#25211d47}.cs-seek::-moz-range-progress{height:3px;background:#25211d}.cs-seek::-moz-range-thumb{width:10px;height:10px;border-radius:50%;background:#fff;border:2px solid #25211d}
.cs-times{display:flex;justify-content:space-between;font-size:12px;font-variant-numeric:tabular-nums}
.cs-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.cs-bay{position:absolute;left:27%;right:27%;bottom:3.5%;height:16%;display:flex;align-items:center;justify-content:center;gap:12px;background:rgba(99,99,94,.2);box-shadow:inset 0 3px 8px rgba(0,0,0,.5);clip-path:polygon(13% 0,87% 0,100% 100%,0 100%)}
.cs-btn{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;border:1px solid #111;background:linear-gradient(#4a4945,#2e2d2a);color:#e9e6de;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 2px 3px rgba(0,0,0,.5)}
.cs-play{width:36px;height:36px;background:linear-gradient(#efece4,#cfcac0);color:#1d1c1a}
.cs-btn:active{transform:translateY(1px);box-shadow:inset 0 1px 2px rgba(0,0,0,.4)}`,
    js: `${FIT}fit(document.querySelector('.cs-stage'));${REDUCED}
var LENGTH=24,pos=0,playing=false,scrub=false,last=0,spin=0,muted=false,raf=0;
var seek=document.querySelector('.cs-seek'),now=document.querySelector('.cs-now'),play=document.querySelector('.cs-play'),mute=document.querySelector('.cs-mute');
var reels=document.querySelectorAll('.cs-reel'),packL=document.querySelector('.cs-pack-l'),packR=document.querySelector('.cs-pack-r');
var ICONS={play:'${icon("play", 16)}',pause:'${icon("pause", 16)}',volume:'${icon("volume", 14, 2.2)}',mute:'${icon("mute", 14, 2.2)}'};
var fmt=function(s){s=Math.max(0,Math.floor(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
/* A short tune in a pentatonic scale, synthesised: [beat, semitone from A3, beats long]. */
var TUNE=[],SCALE=[0,3,5,7,10,12,15,17],s=7;
for(var i=0;i<48;i++){s=(s*13+5)%31;TUNE.push([i*0.5,SCALE[s%SCALE.length]+(i%8===0?-12:0),i%4===3?1:0.5])}
var ctx=null,master=null,session=null,next=0,startAt=0,startPos=0;
var audio=function(){if(ctx)return ctx;var A=window.AudioContext||window.webkitAudioContext;if(!A)return null;ctx=new A();master=ctx.createGain();master.gain.value=muted?0:0.18;var lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2400;master.connect(lp);lp.connect(ctx.destination);return ctx};
var note=function(at,semi,len){var o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=220*Math.pow(2,semi/12);o.detune.value=(Math.random()-.5)*14;
g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(0.9,at+0.02);g.gain.exponentialRampToValueAtTime(0.001,at+len*0.5+0.25);o.connect(g);g.connect(session);o.start(at);o.stop(at+len*0.5+0.3)};
var schedule=function(){if(!ctx||!playing)return;var horizon=pos+0.25;while(next<TUNE.length&&TUNE[next][0]*0.5<horizon){var t=TUNE[next][0]*0.5;if(t>=pos-0.01)note(startAt+(t-startPos),TUNE[next][1],TUNE[next][2]);next++}};
var startSound=function(){if(!audio())return;ctx.resume();session=ctx.createGain();session.connect(master);startAt=ctx.currentTime+0.03;startPos=pos;next=0;while(next<TUNE.length&&TUNE[next][0]*0.5<pos)next++};
var stopSound=function(){if(session){var old=session;old.gain.setTargetAtTime(0,ctx.currentTime,0.02);setTimeout(function(){old.disconnect()},200);session=null}};
var paint=function(){var p=pos/LENGTH;now.textContent=fmt(pos);if(!scrub)seek.value=String(Math.round(p*1000));seek.style.setProperty('--p',(p*100)+'%');
packL.style.transform='scale('+(1-p*0.45)+')';packR.style.transform='scale('+(0.55+p*0.45)+')';reels.forEach(function(r){r.style.transform='rotate('+spin+'deg)'})};
var tick=function(t){var dt=Math.min(0.1,(t-last)/1000);last=t;if(playing&&!scrub){pos+=dt;if(!reduced)spin-=dt*190;if(pos>=LENGTH){pos=LENGTH;setPlaying(false)}schedule()}paint();raf=requestAnimationFrame(tick)};
var setPlaying=function(on){playing=on;play.innerHTML=on?ICONS.pause:ICONS.play;play.setAttribute('aria-label',on?'Pause':'Play');if(on){if(pos>=LENGTH)pos=0;startSound()}else stopSound()};
play.addEventListener('click',function(){setPlaying(!playing)});
mute.addEventListener('click',function(){muted=!muted;mute.innerHTML=muted?ICONS.mute:ICONS.volume;mute.setAttribute('aria-label',muted?'Unmute':'Mute');if(master)master.gain.value=muted?0:0.18});
document.querySelector('.cs-restart').addEventListener('click',function(){var was=playing,from=pos;if(was)setPlaying(false);
var dur=reduced?0:Math.min(1000,Math.max(220,from*60)),t0=performance.now();var step=function(t){var k=dur?Math.min(1,(t-t0)/dur):1,e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;var before=pos;pos=from*(1-e);spin+=(before-pos)*900/Math.max(1,from);if(k<1)requestAnimationFrame(step);else{pos=0;if(was)setPlaying(true)}};requestAnimationFrame(step)});
seek.addEventListener('pointerdown',function(){scrub=true;stopSound()});
seek.addEventListener('input',function(){var before=pos;pos=Number(seek.value)/1000*LENGTH;spin-=(pos-before)*60;if(!scrub&&playing){stopSound();startSound()}});
var endScrub=function(){if(!scrub)return;scrub=false;if(playing){stopSound();startSound()}};
seek.addEventListener('pointerup',endScrub);seek.addEventListener('pointercancel',endScrub);seek.addEventListener('change',endScrub);
last=performance.now();raf=requestAnimationFrame(tick);`,
  },
  {
    id: "dqnamo-hold-to-confirm",
    title: "Hold to confirm",
    category: "Buttons & inputs",
    description:
      "A destructive action that has to be held: the button fills while you press it, lets go if you slide off, and once done offers a timed undo. Works with a held Space or Enter too. Rebuilt from dqnamo's Kitchen.",
    tag: "dqnamo",
    html: `<main class="hc-stage"><section class="hc-card" role="dialog" aria-labelledby="hc-title" aria-describedby="hc-desc">
<h2 id="hc-title">Delete this project?</h2><p id="hc-desc">This permanently removes the project and everything stored inside it.</p>
<div class="hc-actions"><button class="hc-cancel" type="button">Cancel</button>
<button class="hc-hold" type="button" aria-describedby="hc-how"><span class="hc-label">${icon("trash", 14)}Hold to delete</span><span class="hc-fill" aria-hidden="true">${icon("trash", 14)}Hold to delete</span></button></div>
<span id="hc-how" class="hc-sr">Press and hold for under two seconds to confirm.</span></section>
<div class="hc-undo" role="status" aria-live="polite" hidden><span>${icon("check", 14, 2.4)}Project deleted</span><button type="button">${icon("undo", 13)}Undo</button><i class="hc-timer" aria-hidden="true"></i></div></main>`,
    css: `${PAGE}
.hc-stage{position:relative;width:340px;min-height:200px;display:grid;place-items:center}
.hc-card{width:100%;padding:18px;border-radius:14px;background:#fff;border:1px solid #e6e6e2;box-shadow:0 1px 2px rgba(0,0,0,.04),0 12px 28px -14px rgba(0,0,0,.18)}
.hc-card h2{margin:0;font-size:14px;font-weight:600;letter-spacing:-.01em}.hc-card p{margin:6px 0 16px;font-size:12.5px;line-height:1.45;color:#7b7b76}
.hc-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.hc-actions button{position:relative;height:36px;border-radius:9px;font-size:13px;font-weight:600}
.hc-cancel{border:1px solid #e2e2de;background:#fff;color:#33332f}
.hc-hold{border:1px solid #f2b8b5;background:#fff3f2;color:#d23b32;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none}
.hc-label,.hc-fill{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:6px}
.hc-fill{background:#e5483e;color:#fff;clip-path:inset(0 100% 0 0);transition:clip-path .22s cubic-bezier(.23,1,.32,1)}
.hc-hold.is-holding .hc-fill{clip-path:inset(0 0 0 0);transition:clip-path 1.6s linear}
.hc-hold.is-done .hc-fill{clip-path:inset(0 0 0 0);transition:none}
.hc-hold:active{transform:scale(.985)}
.hc-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.hc-undo{position:absolute;left:50%;bottom:-6px;transform:translateX(-50%);display:flex;align-items:center;gap:14px;padding:8px 8px 8px 14px;border-radius:12px;background:#1d1d1b;color:#f3f3f1;font-size:13px;box-shadow:0 12px 26px -10px rgba(0,0,0,.5);overflow:hidden;white-space:nowrap;animation:hc-in .28s cubic-bezier(.23,1,.32,1)}
.hc-undo>span{display:flex;align-items:center;gap:6px}.hc-undo svg{flex:none}
.hc-undo button{display:flex;align-items:center;gap:5px;height:28px;padding:0 10px;border:0;border-radius:7px;background:#3a3a37;color:#fff;font-size:12px;font-weight:600}
.hc-timer{position:absolute;left:0;bottom:0;height:2px;width:100%;background:#6f6f6a;transform-origin:left;animation:hc-time 5s linear forwards}
.hc-card.is-gone{opacity:.35;filter:grayscale(1);transition:opacity .3s}
@keyframes hc-in{from{opacity:0;transform:translate(-50%,8px)}}@keyframes hc-time{to{transform:scaleX(0)}}`,
    js: `var hold=document.querySelector('.hc-hold'),card=document.querySelector('.hc-card'),undo=document.querySelector('.hc-undo'),label=hold.querySelector('.hc-label');
var DURATION=1600,timer=0,undoTimer=0,holding=false,done=false;
var start=function(){if(done||holding)return;holding=true;hold.classList.add('is-holding');timer=setTimeout(confirm,DURATION)};
var cancel=function(){if(!holding)return;holding=false;clearTimeout(timer);hold.classList.remove('is-holding')};
var confirm=function(){holding=false;done=true;hold.classList.remove('is-holding');hold.classList.add('is-done');card.classList.add('is-gone');hold.disabled=true;
undo.hidden=false;var t=undo.querySelector('.hc-timer');t.style.animation='none';t.offsetWidth;t.style.animation='';undo.querySelector('button').focus();undoTimer=setTimeout(function(){undo.hidden=true},5000)};
var reset=function(){clearTimeout(undoTimer);done=false;undo.hidden=true;hold.disabled=false;hold.classList.remove('is-done');card.classList.remove('is-gone');hold.focus()};
hold.addEventListener('pointerdown',function(e){if(e.button)return;hold.setPointerCapture(e.pointerId);start()});
hold.addEventListener('pointermove',function(e){if(!holding)return;var r=hold.getBoundingClientRect(),m=8;if(e.clientX<r.left-m||e.clientX>r.right+m||e.clientY<r.top-m||e.clientY>r.bottom+m)cancel()});
['pointerup','pointercancel','lostpointercapture'].forEach(function(n){hold.addEventListener(n,cancel)});
hold.addEventListener('keydown',function(e){if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();start()}else if(e.key===' '||e.key==='Enter')e.preventDefault()});
hold.addEventListener('keyup',function(e){if(e.key===' '||e.key==='Enter')cancel()});hold.addEventListener('blur',cancel);
hold.addEventListener('contextmenu',function(e){e.preventDefault()});
undo.querySelector('button').addEventListener('click',reset);
document.querySelector('.hc-cancel').addEventListener('click',function(){card.animate([{transform:'translateX(0)'},{transform:'translateX(-4px)'},{transform:'translateX(3px)'},{transform:'translateX(0)'}],{duration:220})});`,
  },
  {
    id: "dqnamo-magnetic-drop-zone",
    title: "Magnetic drop zone",
    category: "Buttons & inputs",
    description:
      "A file drop zone that reaches for the file as it comes near: it leans toward the pointer, then glows and says so when the file is close enough to let go. Drag the sample file in, or any real one. Rebuilt from dqnamo's Kitchen.",
    tag: "dqnamo",
    html: `<main class="md-stage"><div class="md-zone" tabindex="0" role="button" aria-describedby="md-sub">
<span class="md-glow" aria-hidden="true"></span>
<div class="md-empty"><span class="md-icon">${icon("upload", 18)}</span><b class="md-title" aria-live="polite">Drop a file here</b><span id="md-sub" class="md-sub">or click to browse · up to 20 MB</span></div>
<div class="md-ready" hidden><span class="md-icon md-icon-ok">${icon("file", 18)}</span><b>Ready to upload</b><span class="md-name"></span><div class="md-btns"><button type="button" class="md-replace">Replace</button><button type="button" class="md-remove">Remove</button></div></div>
<input class="md-input" type="file" tabindex="-1" aria-hidden="true"></div>
<div class="md-chip" draggable="true" aria-label="Sample file, drag it into the drop zone">${icon("file", 14)}<span>brief-v3.pdf</span><small>2.4 MB</small></div></main>`,
    css: `${PAGE}
.md-stage{position:relative;width:100vw;height:100vh;display:grid;place-items:center}
.md-zone{position:relative;width:min(24rem,calc(100vw - 48px));min-height:min(256px,calc(100vh - 110px));display:grid;place-items:center;border-radius:18px;border:1.5px dashed #d4d4cf;background:#fbfbfa;cursor:pointer;transition:border-color .2s,background-color .2s,box-shadow .2s;will-change:transform}
.md-zone.is-near{border-color:#9db6f5}.md-zone.is-over{border-color:#2f6bff;border-style:solid;background:#f3f6ff;box-shadow:0 0 0 4px rgba(47,107,255,.12)}
.md-glow{position:absolute;inset:20%;border-radius:50%;background:#2f6bff;filter:blur(60px);opacity:0;transition:opacity .25s;pointer-events:none}.md-zone.is-near .md-glow{opacity:.12}.md-zone.is-over .md-glow{opacity:.28}
.md-empty,.md-ready{position:relative;display:grid;justify-items:center;gap:6px;text-align:center;padding:20px}
.md-icon{display:grid;place-items:center;width:40px;height:40px;margin-bottom:6px;border-radius:11px;background:#fff;border:1px solid #e6e6e2;box-shadow:0 2px 6px -2px rgba(0,0,0,.12);color:#3f3f3b;transition:transform .25s cubic-bezier(.23,1,.32,1)}
.md-zone.is-near .md-icon{transform:translateY(-3px)}.md-zone.is-over .md-icon{transform:translateY(-6px) scale(1.06);color:#2f6bff}
.md-icon-ok{color:#2f6bff}
.md-title,.md-ready b{font-size:14px;font-weight:600}.md-sub,.md-name{font-size:12px;color:#8a8a84}
.md-btns{display:flex;gap:8px;margin-top:10px}.md-btns button{height:30px;padding:0 12px;border-radius:8px;border:1px solid #e2e2de;background:#fff;font-size:12px;font-weight:600;color:#33332f}
.md-input{display:none}
.md-chip{position:absolute;left:18px;bottom:16px;display:flex;align-items:center;gap:7px;height:34px;padding:0 12px;border-radius:10px;background:#fff;border:1px solid #e2e2de;box-shadow:0 6px 16px -8px rgba(0,0,0,.25);font-size:12px;font-weight:600;color:#33332f;cursor:grab}
.md-chip small{font-weight:400;color:#8a8a84}.md-chip.is-used{opacity:.4}`,
    js: `${REDUCED}var zone=document.querySelector('.md-zone'),title=document.querySelector('.md-title'),input=document.querySelector('.md-input'),chip=document.querySelector('.md-chip');
var empty=zone.querySelector('.md-empty'),ready=zone.querySelector('.md-ready'),nameEl=zone.querySelector('.md-name');
var DIST=180,MAX=10,x=0,y=0,vx=0,vy=0,tx=0,ty=0,s=1,vs=0,ts=1,raf=0,depth=0;
var spring=function(){var k=280,c=24,m=0.65,dt=1/60;var ax=(-k*(x-tx)-c*vx)/m,ay=(-k*(y-ty)-c*vy)/m,as=(-k*(s-ts)-c*vs)/m;vx+=ax*dt;vy+=ay*dt;vs+=as*dt;x+=vx*dt;y+=vy*dt;s+=vs*dt;
if(reduced){x=0;y=0;s=1}zone.style.transform='translate('+x.toFixed(2)+'px,'+y.toFixed(2)+'px) scale('+s.toFixed(4)+')';
if(Math.abs(x-tx)+Math.abs(y-ty)+Math.abs(s-ts)+Math.abs(vx)+Math.abs(vy)>0.01)raf=requestAnimationFrame(spring);else raf=0};
var kick=function(){if(!raf)raf=requestAnimationFrame(spring)};
var state=function(name){zone.classList.toggle('is-near',name!=='idle');zone.classList.toggle('is-over',name==='over');title.textContent=name==='over'?'Let go to add it':name==='near'?'Bring it closer':'Drop a file here'};
var track=function(cx,cy){var r=zone.getBoundingClientRect();var dx=Math.max(r.left-cx,0,cx-r.right),dy=Math.max(r.top-cy,0,cy-r.bottom),d=Math.hypot(dx,dy);
if(d===0){tx=0;ty=0;ts=1.02;state('over')}else if(d<DIST){var pull=(1-d/DIST),ox=cx-(r.left+r.width/2),oy=cy-(r.top+r.height/2),len=Math.hypot(ox,oy)||1;tx=ox/len*MAX*pull;ty=oy/len*MAX*pull;ts=1+pull*0.01;state('near')}else{tx=0;ty=0;ts=1;state('idle')}kick()};
var release=function(){tx=0;ty=0;ts=1;state('idle');kick()};
var show=function(name,size){empty.hidden=true;ready.hidden=false;nameEl.textContent=name+' · '+size;zone.setAttribute('aria-label','Ready to upload '+name)};
var fmt=function(b){return b>1048576?(b/1048576).toFixed(1)+' MB':Math.max(1,Math.round(b/1024))+' KB'};
document.addEventListener('dragenter',function(e){e.preventDefault();depth++});
document.addEventListener('dragover',function(e){e.preventDefault();track(e.clientX,e.clientY)});
document.addEventListener('dragleave',function(){depth=Math.max(0,depth-1);if(!depth)release()});
document.addEventListener('drop',function(e){e.preventDefault();depth=0;var r=zone.getBoundingClientRect(),inside=e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;release();
if(!inside)return;var f=e.dataTransfer&&e.dataTransfer.files[0];if(f)show(f.name,fmt(f.size));else if(e.dataTransfer.getData('text/plain')==='sample'){show('brief-v3.pdf','2.4 MB');chip.classList.add('is-used')}});
chip.addEventListener('dragstart',function(e){e.dataTransfer.setData('text/plain','sample');e.dataTransfer.effectAllowed='copy'});
chip.addEventListener('dragend',release);
zone.addEventListener('click',function(e){if(e.target.closest('.md-remove'))return;input.click()});
zone.addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&e.target===zone){e.preventDefault();input.click()}});
input.addEventListener('change',function(){var f=input.files[0];if(f)show(f.name,fmt(f.size))});
zone.querySelector('.md-remove').addEventListener('click',function(e){e.stopPropagation();ready.hidden=true;empty.hidden=false;input.value='';chip.classList.remove('is-used');zone.removeAttribute('aria-label');zone.focus()});`,
  },
  {
    id: "dqnamo-dynamic-button",
    title: "Dynamic button",
    category: "Buttons & inputs",
    description:
      "One button whose content changes without jumping: its width springs to the new label while the old one slides out and the new one slides in. Pick a label, then press Save to watch it work. Rebuilt from dqnamo's Kitchen.",
    tag: "dqnamo",
    html: `<main class="db-stage"><div class="db-demo"><button class="db" type="button" data-variant="primary"><span class="db-inner"></span></button></div>
<div class="db-panel"><span class="db-cap">LABEL</span><div class="db-chips" role="group" aria-label="Button content">
<button type="button" data-key="save" aria-pressed="true">${icon("floppy", 13)}Save</button><button type="button" data-key="copy" aria-pressed="false">${icon("copy", 13)}Copy</button><button type="button" data-key="invite" aria-pressed="false">${icon("users", 13)}Invite teammates</button><button type="button" data-key="palette" aria-pressed="false">${icon("command", 13)}Open command palette</button><button type="button" data-key="busy" aria-pressed="false">${icon("spinner", 13)}Processing</button></div>
<span class="db-cap">VARIANT</span><div class="db-chips" role="group" aria-label="Variant"><button type="button" data-variant="primary" aria-pressed="true">Primary</button><button type="button" data-variant="secondary" aria-pressed="false">Secondary</button></div></div>
<span class="db-measure" aria-hidden="true"></span></main>`,
    css: `${PAGE}
.db-stage{display:grid;gap:22px;width:min(430px,calc(100vw - 32px))}
.db-demo{display:grid;place-items:center;height:110px;border-radius:14px;background:#fff;border:1px solid #ebebe7}
.db{height:36px;padding:0;border-radius:10px;border:1px solid #1d1d1b;background:#1d1d1b;color:#fafaf8;font-size:13px;font-weight:600;overflow:hidden;transition:width .26s cubic-bezier(.22,1,.36,1),background-color .2s,color .2s,border-color .2s}
.db[data-variant=secondary]{background:#fff;color:#1d1d1b;border-color:#dcdcd7;box-shadow:0 1px 2px rgba(0,0,0,.05)}
.db-inner{position:relative;display:grid;height:100%}
.db-label,.db-measure{display:flex;align-items:center;justify-content:center;gap:6px;padding:0 14px;white-space:nowrap;font-size:13px;font-weight:600}
.db-label{grid-area:1/1;transition:opacity .18s ease,transform .18s cubic-bezier(.23,1,.32,1)}
.db-label.is-in{opacity:0;transform:translateY(8px)}.db-label.is-out{opacity:0;transform:translateY(-8px)}
.db-spin svg{animation:db-rot .8s linear infinite}
.db-measure{position:absolute;visibility:hidden;left:-999px;top:0}
.db-panel{display:grid;gap:8px}.db-cap{font:600 10px ui-monospace,Menlo,monospace;letter-spacing:.08em;color:#9a9a94}
.db-chips{display:flex;flex-wrap:wrap;gap:6px}
.db-chips button{display:flex;align-items:center;gap:5px;height:28px;padding:0 10px;border-radius:8px;border:1px solid transparent;background:transparent;color:#6a6a65;font-size:12px}
.db-chips button[aria-pressed=true]{background:#fff;border-color:#e2e2de;color:#1d1d1b;box-shadow:0 1px 2px rgba(0,0,0,.05)}
@keyframes db-rot{to{transform:rotate(360deg)}}`,
    js: `var button=document.querySelector('.db'),inner=button.querySelector('.db-inner'),measure=document.querySelector('.db-measure'),current=null,timers=[];
var I={save:'${icon("floppy", 14)}',check:'${icon("check", 14, 2.6)}',copy:'${icon("copy", 14)}',invite:'${icon("users", 14)}',palette:'${icon("command", 14)}',spin:'<span class="db-spin">${icon("spinner", 14, 2.4)}</span>'};
var CONTENT={save:[I.save,'Save'],saving:[I.spin,'Saving…'],saved:[I.check,'Saved'],copy:[I.copy,'Copy'],copied:[I.check,'Copied'],invite:[I.invite,'Invite teammates'],sent:[I.check,'Invites sent'],palette:[I.palette,'Open command palette'],busy:[I.spin,'Processing']};
var FLOW={save:['saving',900,'saved',1300,'save'],copy:['copied',1300,'copy'],invite:['sent',1400,'invite']};
var show=function(key){if(key===current)return;current=key;var html=CONTENT[key][0]+'<span>'+CONTENT[key][1]+'</span>';measure.innerHTML=html;
button.style.width=Math.ceil(measure.getBoundingClientRect().width+2)+'px';button.setAttribute('aria-label',CONTENT[key][1]);
inner.querySelectorAll('.db-label').forEach(function(old){old.classList.add('is-out');setTimeout(function(){old.remove()},200)});
var label=document.createElement('span');label.className='db-label is-in';label.innerHTML=html;inner.appendChild(label);requestAnimationFrame(function(){requestAnimationFrame(function(){label.classList.remove('is-in')})})};
var base='save';
button.addEventListener('click',function(){var flow=FLOW[base];if(!flow||current!==base)return;timers.forEach(clearTimeout);timers=[];var t=0;
show(flow[0]);for(var i=1;i<flow.length;i+=2){t+=flow[i];(function(k){timers.push(setTimeout(function(){show(k)},t))})(flow[i+1])}});
document.querySelectorAll('[data-key]').forEach(function(chip){chip.addEventListener('click',function(){timers.forEach(clearTimeout);base=chip.dataset.key;show(base);
document.querySelectorAll('[data-key]').forEach(function(c){c.setAttribute('aria-pressed',String(c===chip))})})});
document.querySelectorAll('.db-chips [data-variant]').forEach(function(chip){chip.addEventListener('click',function(){button.dataset.variant=chip.dataset.variant;
document.querySelectorAll('.db-chips [data-variant]').forEach(function(c){c.setAttribute('aria-pressed',String(c===chip))})})});
show('save');`,
  },
  {
    id: "dqnamo-playing-cards",
    title: "Playing cards",
    category: "Hover effects",
    description:
      "A hand of playing cards fanned in an arc. Hover lifts a card and nudges its neighbours aside; tap or flick one upward to throw it onto the pile; deal again for a new hand of three, five or seven. Rebuilt from dqnamo's Kitchen.",
    tag: "dqnamo",
    html: `<main class="pc-stage"><p class="pc-hint">PLAY A CARD</p><div class="pc-table" aria-label="Your hand"></div>
<div class="pc-bar"><div class="pc-sizes" role="group" aria-label="Hand size"><button type="button" data-n="3" aria-pressed="false">3 cards</button><button type="button" data-n="5" aria-pressed="false">5 cards</button><button type="button" data-n="7" aria-pressed="true">7 cards</button></div><button type="button" class="pc-deal">Redeal</button></div>
<p class="pc-sr" aria-live="polite"></p></main>`,
    css: `${PAGE}
.pc-stage{position:relative;width:480px;height:400px;display:grid;grid-template-rows:auto 1fr auto;border-radius:16px;background:#fff;border:1px solid #ebebe7;overflow:hidden}
.pc-hint{margin:22px 0 0;text-align:center;font:600 10px ui-monospace,Menlo,monospace;letter-spacing:.12em;color:#a6a6a0}
.pc-table{position:relative}
.pc-slot{position:absolute;left:50%;bottom:-14px;width:96px;margin-left:-48px;transition:transform .5s cubic-bezier(.3,1.35,.5,1);transform-origin:50% 100%}
.pc-card{display:block;width:96px;height:134px;padding:0;border:0;border-radius:8px;background:none;cursor:grab;touch-action:none;transition:transform .15s}
.pc-card:disabled{cursor:default}.pc-card.is-drag{transition:none;cursor:grabbing}
.pc-face{position:relative;display:block;width:100%;height:100%;border-radius:8px;background:#fffefb;box-shadow:0 0 0 1px rgba(0,0,0,.09),0 4px 10px -4px rgba(0,0,0,.25);color:#1d1d1b;font-family:Georgia,"Times New Roman",serif;overflow:hidden}
.pc-face.is-red{color:#c8322b}
.pc-face::before{content:"";position:absolute;inset:5px;border-radius:5px;border:1px solid rgba(0,0,0,.08)}
.pc-corner{position:absolute;top:6px;left:7px;display:grid;justify-items:center;line-height:1}.pc-corner b{font-size:17px;letter-spacing:-.04em}.pc-corner i{font-style:normal;font-size:13px}
.pc-corner.is-flip{top:auto;left:auto;bottom:6px;right:7px;transform:rotate(180deg)}
.pc-pips{position:absolute;inset:16px 22px}.pc-pip{position:absolute;font-size:19px;line-height:1;transform:translate(-50%,-50%)}.pc-pip.is-flip{transform:translate(-50%,-50%) rotate(180deg)}
.pc-ace{position:absolute;inset:0;display:grid;place-items:center;font-size:48px}
.pc-court{position:absolute;inset:20px 22px;display:grid;place-items:center;border:1px solid currentColor;border-radius:4px;opacity:.9;background:repeating-linear-gradient(45deg,transparent 0 5px,rgba(0,0,0,.04) 5px 6px)}
.pc-court b{font-size:34px}.pc-court i{position:absolute;font-style:normal;font-size:14px}.pc-court i:first-of-type{top:4px;left:5px}.pc-court i:last-of-type{bottom:4px;right:5px;transform:rotate(180deg)}
.pc-bar{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-top:1px solid #f0f0ec;background:#fafaf8;position:relative;z-index:200}
.pc-sizes{display:flex;gap:4px}.pc-sizes button,.pc-deal{height:28px;padding:0 10px;border-radius:8px;border:1px solid transparent;background:none;color:#6a6a65;font-size:12px}
.pc-sizes button[aria-pressed=true]{background:#fff;border-color:#e2e2de;color:#1d1d1b}
.pc-deal{background:#1d1d1b;color:#fff;font-weight:600}.pc-deal:disabled{background:#d6d6d1}
.pc-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}`,
    js: `${FIT}fit(document.querySelector('.pc-stage'));
var PIPS=${JSON.stringify(PIPS)};
var table=document.querySelector('.pc-table'),say=document.querySelector('.pc-sr'),deal=document.querySelector('.pc-deal');
var SUITS=[['spades','♠',0],['hearts','♥',1],['diamonds','♦',1],['clubs','♣',0]],RANKS=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
var NAMES={A:'ace',J:'jack',Q:'queen',K:'king','2':'two','3':'three','4':'four','5':'five','6':'six','7':'seven','8':'eight','9':'nine','10':'ten'};
var size=7,cards=[],hover=null;
var face=function(r,s){var h='<span class="pc-face'+(s[2]?' is-red':'')+'"><span class="pc-corner"><b>'+r+'</b><i>'+s[1]+'</i></span><span class="pc-corner is-flip"><b>'+r+'</b><i>'+s[1]+'</i></span>';
if(r==='A')h+='<span class="pc-ace">'+s[1]+'</span>';else if(PIPS[r])h+='<span class="pc-pips">'+PIPS[r].map(function(p){return '<span class="pc-pip'+(p[1]>50?' is-flip':'')+'" style="left:'+p[0]+'%;top:'+p[1]+'%">'+s[1]+'</span>'}).join('')+'</span>';
else h+='<span class="pc-court"><i>'+s[1]+'</i><b>'+r+'</b><i>'+s[1]+'</i></span>';return h+'</span>'};
var layout=function(){var hand=cards.filter(function(c){return !c.played}),n=hand.length,hi=hand.indexOf(hover),spacing=Math.min(n>5?44:56,Math.max(26,(table.clientWidth/2-80)/Math.max(1,(n-1)/2)));
cards.forEach(function(c){var t;if(c.played){t='translate('+c.px+'px,'+c.py+'px) rotate('+c.pr+'deg)';c.slot.style.zIndex=100+c.order}else{var i=hand.indexOf(c),off=i-(n-1)/2,step=n>1?Math.min(9,46/(n-1)):0,rot=off*step,x=off*spacing,y=Math.abs(rot)*1.9,isH=c===hover;
if(hi!==-1&&!isH)x+=Math.sign(i-hi)*24/Math.max(1,Math.abs(i-hi));t='translate('+x+'px,'+(isH?-54:y)+'px) rotate('+(isH?rot*.3:rot)+'deg) scale('+(isH?1.06:1)+')';c.slot.style.zIndex=isH?60:10+i}c.slot.style.transform=t})};
var order=0,play=function(c){if(c.played)return;c.played=true;c.order=order++;c.px=(Math.random()-.5)*28;c.py=-200+(Math.random()-.5)*12;c.pr=(Math.random()-.5)*26;c.btn.disabled=true;c.btn.setAttribute('aria-label',NAMES[c.r]+' of '+c.s[0]+', played');if(hover===c)hover=null;say.textContent='Played the '+NAMES[c.r]+' of '+c.s[0];layout()};
var dealHand=function(){table.innerHTML='';cards=[];hover=null;order=0;var deck=[];SUITS.forEach(function(s){RANKS.forEach(function(r){deck.push({r:r,s:s})})});
for(var i=0;i<size;i++){var c=deck.splice(Math.floor(Math.random()*deck.length),1)[0];var slot=document.createElement('div');slot.className='pc-slot';slot.style.transform='translate(0,220px)';
var b=document.createElement('button');b.type='button';b.className='pc-card';b.setAttribute('aria-label','Play the '+NAMES[c.r]+' of '+c.s[0]);b.innerHTML=face(c.r,c.s);slot.appendChild(b);table.appendChild(slot);c.slot=slot;c.btn=b;cards.push(c);wire(c)}
requestAnimationFrame(function(){requestAnimationFrame(layout)})};
var wire=function(c){var b=c.btn,startY=0,dy=0,down=false,t0=0;
b.addEventListener('pointerenter',function(){if(!c.played){hover=c;layout()}});b.addEventListener('pointerleave',function(){if(hover===c&&!down){hover=null;layout()}});
b.addEventListener('focus',function(){if(!c.played){hover=c;layout()}});b.addEventListener('blur',function(){if(hover===c){hover=null;layout()}});
b.addEventListener('pointerdown',function(e){if(c.played)return;down=true;startY=e.clientY;dy=0;t0=performance.now();b.setPointerCapture(e.pointerId);b.classList.add('is-drag')});
b.addEventListener('pointermove',function(e){if(!down)return;dy=Math.max(-260,Math.min(0,e.clientY-startY));b.style.transform='translateY('+dy+'px)'});
var up=function(e){if(!down)return;down=false;b.classList.remove('is-drag');b.style.transform='';var v=dy/Math.max(1,performance.now()-t0)*1000;if(dy<-80||v<-600||Math.abs(dy)<4)play(c)};
b.addEventListener('pointerup',up);b.addEventListener('pointercancel',function(){down=false;b.classList.remove('is-drag');b.style.transform=''});
b.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();play(c)}});
b.addEventListener('click',function(e){if(e.detail===0)play(c)})};
document.querySelectorAll('[data-n]').forEach(function(btn){btn.addEventListener('click',function(){size=Number(btn.dataset.n);document.querySelectorAll('[data-n]').forEach(function(o){o.setAttribute('aria-pressed',String(o===btn))});dealHand()})});
deal.addEventListener('click',dealHand);dealHand();`,
  },
  {
    id: "dqnamo-ticket",
    title: "Ticket",
    category: "Hover effects",
    description:
      "An event ticket with notched sides, a perforated stub and a halftone pattern, which tilts toward the pointer like card stock in the hand. Three paper colours to choose from. Rebuilt from dqnamo's Kitchen.",
    tag: "dqnamo",
    html: `<main class="tk-stage"><div class="tk-wrap"><article class="tk" aria-label="Ticket: Open Studio, 14 November, 19:30, admit one">
<div class="tk-body"><div class="tk-meta"><span>EVENING NO. 07</span><span>LISBON · PT</span></div><svg class="tk-dots" viewBox="0 0 176 176" aria-hidden="true"></svg>
<h2>OPEN<br>STUDIO</h2><p>A night of prototypes, talks and things that move.</p><div class="tk-when"><span><small>DATE</small>14.11</span><span><small>DOORS</small>19:30</span></div></div>
<div class="tk-stub"><div class="tk-admit"><span><small>ADMIT</small>ONE</span><span><small>SEAT</small>GA-0412</span></div><div class="tk-bars" aria-hidden="true"></div></div></article></div>
<div class="tk-swatches" role="group" aria-label="Paper colour"><button type="button" data-paper="#2f4fe0" data-ink="#f4f6ff" aria-label="Blue" aria-pressed="true"></button><button type="button" data-paper="#ff633f" data-ink="#1a1714" aria-label="Orange" aria-pressed="false"></button><button type="button" data-paper="#d6f25c" data-ink="#1a1c12" aria-label="Lime" aria-pressed="false"></button></div></main>`,
    css: `${PAGE}
.tk-stage{display:flex;align-items:center;gap:26px}
.tk-wrap{--paper:#2f4fe0;--ink:#f4f6ff;--notch:13px;--stub:24%;width:230px;aspect-ratio:5/11;perspective:1100px;filter:drop-shadow(0 1px 1px rgba(15,15,15,.1)) drop-shadow(0 18px 26px rgba(15,15,15,.14))}
.tk{position:relative;display:grid;grid-template-rows:1fr var(--stub);width:100%;height:100%;color:var(--ink);background:linear-gradient(145deg,rgba(255,255,255,.12),transparent 42%),var(--paper);transition:transform .22s cubic-bezier(.23,1,.32,1),background-color .18s,color .18s;transform-style:preserve-3d;
clip-path:polygon(0 0,100% 0,100% calc(100% - var(--stub) - var(--notch)),calc(100% - var(--notch)) calc(100% - var(--stub)),100% calc(100% - var(--stub) + var(--notch)),100% 100%,0 100%,0 calc(100% - var(--stub) + var(--notch)),var(--notch) calc(100% - var(--stub)),0 calc(100% - var(--stub) - var(--notch)))}
.tk::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at var(--gx,50%) var(--gy,30%),rgba(255,255,255,.22),transparent 45%);opacity:0;transition:opacity .2s;pointer-events:none}.tk.is-tilt::after{opacity:1}
.tk-body{position:relative;padding:16px 18px;display:flex;flex-direction:column}
.tk-body::after{content:"";position:absolute;left:calc(var(--notch) + 6px);right:calc(var(--notch) + 6px);bottom:0;border-bottom:1.5px dashed currentColor;opacity:.32}
.tk-meta{display:flex;justify-content:space-between;font:600 8px ui-monospace,Menlo,monospace;letter-spacing:.1em;opacity:.85}
.tk-dots{width:100%;margin:14px 0 6px;fill:currentColor}
.tk h2{margin:auto 0 0;font-size:30px;line-height:.9;letter-spacing:-.05em;font-weight:800}
.tk-body p{margin:8px 0 12px;font-size:10px;line-height:1.35;opacity:.85}
.tk-when,.tk-admit{display:flex;gap:22px;font:600 13px ui-monospace,Menlo,monospace}.tk-when small,.tk-admit small{display:block;font-size:7px;letter-spacing:.12em;opacity:.7;margin-bottom:2px}
.tk-stub{padding:14px 18px;display:flex;flex-direction:column;justify-content:space-between}
.tk-bars{display:flex;gap:1px;height:26px}.tk-bars i{background:currentColor}
.tk-swatches{display:grid;gap:10px}.tk-swatches button{width:22px;height:22px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px #d9d9d4}.tk-swatches button[aria-pressed=true]{box-shadow:0 0 0 2px #1d1d1b}`,
    js: `${FIT}fit(document.querySelector('.tk-stage'));
var wrap=document.querySelector('.tk-wrap'),tk=document.querySelector('.tk'),dots=document.querySelector('.tk-dots'),bars=document.querySelector('.tk-bars');
var h='',N=11,c=(N-1)/2;for(var r=0;r<N;r++)for(var q=0;q<N;q++){var d=Math.hypot(q-c,r-c)/Math.hypot(c,c),near=1-d,sz=2+near*4.2;h+='<rect x="'+(8+q*16-sz/2)+'" y="'+(8+r*16-sz/2)+'" width="'+sz.toFixed(2)+'" height="'+sz.toFixed(2)+'" opacity="'+(0.3+near*0.6).toFixed(2)+'"/>'}dots.innerHTML=h;
var seed=412;for(var i=0;i<46;i++){seed=(seed*48271)%2147483647;var b=document.createElement('i');b.style.width=(1+seed%3)+'px';if(seed%6===0)b.style.opacity='0';bars.appendChild(b)}
var can=matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches;
if(can){wrap.addEventListener('pointermove',function(e){var r=wrap.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
tk.classList.add('is-tilt');tk.style.transform='rotateX('+((0.5-y)*12).toFixed(2)+'deg) rotateY('+((x-0.5)*12).toFixed(2)+'deg) scale(1.018)';tk.style.setProperty('--gx',(x*100)+'%');tk.style.setProperty('--gy',(y*100)+'%')});
wrap.addEventListener('pointerleave',function(){tk.classList.remove('is-tilt');tk.style.transform=''})}
document.querySelectorAll('[data-paper]').forEach(function(s){s.style.background=s.dataset.paper;s.addEventListener('click',function(){wrap.style.setProperty('--paper',s.dataset.paper);wrap.style.setProperty('--ink',s.dataset.ink);
document.querySelectorAll('[data-paper]').forEach(function(o){o.setAttribute('aria-pressed',String(o===s))})})});`,
  },
  {
    id: "dqnamo-stamp",
    title: "Stamp",
    category: "Layout blocks",
    description:
      "A postage-stamp frame with perforated edges cut by a clip path, for any content: here, three illustrated stamps that straighten and lift when you hover them. Rebuilt from dqnamo's Kitchen.",
    tag: "dqnamo",
    html: `<main class="sp-sheet">${STAMPS.map(
      stamp =>
        `<figure class="sp" style="--r:${stamp.rotate}deg" tabindex="0" aria-label="${stamp.kicker} stamp, value ${stamp.value}"><div class="sp-paper"><div class="sp-art">${stamp.art}<span class="sp-kicker">${stamp.kicker}</span><span class="sp-value">${stamp.value}</span><span class="sp-foot">PLAYGROUND POST</span></div></div></figure>`,
    ).join("")}</main>`,
    css: `${PAGE}
.sp-sheet{display:flex;gap:26px;align-items:center;padding:20px}
.sp{margin:0;width:150px;aspect-ratio:4/5;transform:rotate(var(--r));filter:drop-shadow(0 1px 1px rgba(15,15,15,.12)) drop-shadow(0 12px 22px rgba(15,15,15,.1));transition:transform .35s cubic-bezier(.23,1,.32,1),filter .35s;outline:none}
.sp:hover,.sp:focus-visible{transform:rotate(0) translateY(-6px) scale(1.04);filter:drop-shadow(0 2px 2px rgba(15,15,15,.12)) drop-shadow(0 22px 30px rgba(15,15,15,.16))}
.sp:focus-visible .sp-paper{box-shadow:inset 0 0 0 2px #2f6bff}
.sp-paper{width:100%;height:100%;padding:11px;background:linear-gradient(145deg,rgba(255,255,255,.34),transparent 42%),#fffdf8;clip-path:${STAMP_EDGE}}
.sp-art{position:relative;width:100%;height:100%;overflow:hidden;color:#fff}.sp-art svg{display:block;width:100%;height:100%}
.sp-kicker{position:absolute;top:7px;left:8px;font:700 8px ui-monospace,Menlo,monospace;letter-spacing:.12em;text-shadow:0 1px 2px rgba(0,0,0,.3)}
.sp-value{position:absolute;top:4px;right:8px;font-size:22px;font-weight:800;letter-spacing:-.04em;text-shadow:0 1px 2px rgba(0,0,0,.3)}
.sp-foot{position:absolute;bottom:6px;left:8px;font:600 6.5px ui-monospace,Menlo,monospace;letter-spacing:.14em;opacity:.9}`,
    js: `${FIT}fit(document.querySelector('.sp-sheet'));`,
  },
  {
    id: "dqnamo-scroll-fade-list",
    title: "Scroll fade list",
    category: "Scroll effects",
    description:
      "A scrolling list whose top and bottom fade only as far as there is more to see: no fade at the very top, none at the end, and a short one near either edge. Rebuilt from dqnamo's Kitchen.",
    tag: "dqnamo",
    html: `<main class="sf"><div class="sf-scroll" tabindex="0" aria-label="Cities, scrollable"><ol>${CITIES.map(([flag, name]) => `<li><span aria-hidden="true">${flag}</span>${name}</li>`).join("")}</ol></div></main>`,
    css: `${PAGE}
.sf{--top:0px;--bottom:0px;--bg:#fff;position:relative;width:min(300px,calc(100vw - 40px));border-radius:13px;border:1px solid #e9e9e5;background:var(--bg);overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.04)}
.sf::before,.sf::after{content:"";position:absolute;left:0;right:10px;pointer-events:none;transition:height 75ms linear;z-index:1}
.sf::before{top:0;height:var(--top);background:linear-gradient(var(--bg),transparent)}.sf::after{bottom:0;height:var(--bottom);background:linear-gradient(transparent,var(--bg))}
.sf-scroll{height:min(390px,calc(100vh - 40px));overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#cfcfca transparent;scrollbar-gutter:stable}
.sf ol{list-style:none;margin:0;padding:8px}.sf li{display:flex;align-items:center;gap:10px;min-height:40px;padding:0 10px;border-radius:9px;font-size:14px;font-weight:500;transition:background-color .15s}.sf li:hover{background:#f4f4f1}.sf li span{width:20px;text-align:center}`,
    js: `var frame=document.querySelector('.sf'),list=document.querySelector('.sf-scroll'),MAX=76,raf=0;
var update=function(){var max=Math.max(0,list.scrollHeight-list.clientHeight);frame.style.setProperty('--top',Math.min(MAX,list.scrollTop)+'px');frame.style.setProperty('--bottom',Math.min(MAX,Math.max(0,max-list.scrollTop))+'px')};
list.addEventListener('scroll',function(){cancelAnimationFrame(raf);raf=requestAnimationFrame(update)},{passive:true});new ResizeObserver(update).observe(list);update();`,
  },
  {
    id: "dqnamo-model-selector",
    title: "Model selector",
    category: "Buttons & inputs",
    description:
      "A prompt box with a model picker. Hovering a model shows how it compares on intelligence, speed, context and cost, and each model keeps its own reasoning and speed settings, which the trigger shows as badges. Rebuilt from dqnamo's Kitchen.",
    tag: "dqnamo",
    html: `<main class="ms-stage"><form class="ms" onsubmit="return false"><label class="ms-sr" for="ms-prompt">Prompt</label><textarea id="ms-prompt" rows="3" placeholder="What do you want to do?"></textarea>
<div class="ms-bar"><button type="button" class="ms-trigger" aria-haspopup="listbox" aria-expanded="false" aria-label="Select model"></button><button type="submit" class="ms-send">${icon("send", 13)}Send</button></div>
<div class="ms-pop" hidden><ul class="ms-list" role="listbox" aria-label="Models" tabindex="-1"></ul><div class="ms-card" aria-live="polite"></div></div></form><p class="ms-out" role="status"></p></main>`,
    css: `${PAGE}
.ms-stage{position:relative;width:min(460px,calc(100vw - 32px));height:330px;display:flex;flex-direction:column;justify-content:flex-end}
.ms{position:relative;padding:12px;border-radius:16px;background:#fff;border:1px solid #e6e6e2;box-shadow:0 1px 2px rgba(0,0,0,.04),0 16px 32px -20px rgba(0,0,0,.2)}
.ms textarea{width:100%;border:0;resize:none;font:inherit;font-size:14px;line-height:1.5;color:#1d1d1b;background:none;outline:none;padding:2px 4px}
.ms-bar{display:flex;justify-content:space-between;align-items:center;margin-top:6px}
.ms-trigger{display:flex;align-items:center;gap:6px;height:30px;padding:0 8px;border-radius:9px;border:1px solid transparent;background:none;color:#33332f;font-size:12.5px;font-weight:500}
.ms-trigger:hover,.ms-trigger[aria-expanded=true]{background:#f3f3f0;border-color:#e6e6e2}
.ms-dot{width:9px;height:9px;border-radius:3px;flex:none}
.ms-badge{padding:1px 6px;border-radius:5px;background:#eeeeea;font-size:10.5px;color:#6a6a65}
.ms-send{display:flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:9px;border:0;background:#1d1d1b;color:#fff;font-size:12.5px;font-weight:600}
.ms-pop{position:absolute;left:12px;bottom:52px;display:flex;gap:8px;align-items:flex-end;animation:ms-in .16s cubic-bezier(.23,1,.32,1)}
.ms-list{list-style:none;margin:0;padding:4px;width:236px;border-radius:12px;background:#fff;border:1px solid #e6e6e2;box-shadow:0 14px 30px -16px rgba(0,0,0,.3);outline:none}
.ms-list li{display:flex;align-items:center;gap:8px;height:34px;padding:0 8px;border-radius:8px;font-size:12.5px;white-space:nowrap;cursor:pointer}
.ms-list li small{margin-left:auto;color:#a2a29c;font-size:10.5px}.ms-list li.is-active{background:#f3f3f0}.ms-list li[aria-selected=true]::after{content:"✓";margin-left:4px;font-size:11px}
.ms-list li[aria-selected=true] small{margin-left:auto}
.ms-card{width:210px;padding:12px;border-radius:12px;background:#fff;border:1px solid #e6e6e2;box-shadow:0 14px 30px -16px rgba(0,0,0,.3);font-size:12px}
.ms-card h3{margin:0;font-size:13px}.ms-card p{margin:4px 0 10px;color:#7b7b76;line-height:1.4;font-size:11.5px}
.ms-metric{display:grid;grid-template-columns:70px 1fr;align-items:center;gap:8px;margin:5px 0;color:#6a6a65;font-size:11px}
.ms-metric i{display:block;height:5px;border-radius:3px;background:#efefeb;overflow:hidden}.ms-metric i b{display:block;height:100%;border-radius:3px;background:#1d1d1b;transition:width .25s cubic-bezier(.23,1,.32,1)}
.ms-seg{display:flex;gap:2px;margin-top:10px;padding:2px;border-radius:8px;background:#f3f3f0}.ms-seg button{flex:1;height:24px;border:0;border-radius:6px;background:none;font-size:11px;color:#6a6a65}.ms-seg button[aria-pressed=true]{background:#fff;color:#1d1d1b;box-shadow:0 1px 2px rgba(0,0,0,.08)}
.ms-fast{display:flex;align-items:center;justify-content:space-between;margin-top:8px;font-size:11px;color:#6a6a65}.ms-fast button{width:30px;height:18px;border-radius:9px;border:0;background:#dcdcd7;position:relative}.ms-fast button::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:transform .15s}.ms-fast button[aria-checked=true]{background:#1d1d1b}.ms-fast button[aria-checked=true]::after{transform:translateX(12px)}
.ms-out{min-height:16px;margin:8px 4px 0;font-size:11.5px;color:#8a8a84}
.ms-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@keyframes ms-in{from{opacity:0;transform:translateY(4px)}}`,
    js: `var MODELS=${JSON.stringify(MODELS)};
var trigger=document.querySelector('.ms-trigger'),pop=document.querySelector('.ms-pop'),list=document.querySelector('.ms-list'),card=document.querySelector('.ms-card'),out=document.querySelector('.ms-out');
var config={},selected=0,active=0;MODELS.forEach(function(m){config[m.id]={reasoning:'Medium',fast:false}});
var DELTA={Low:[-10,14,0,12],Medium:[0,0,0,0],High:[8,-16,0,-14]};
var paintTrigger=function(){var m=MODELS[selected],c=config[m.id],b='';if(c.reasoning!=='Medium')b+='<span class="ms-badge">'+c.reasoning+'</span>';if(c.fast)b+='<span class="ms-badge">Fast</span>';
trigger.innerHTML='<span class="ms-dot" style="background:'+m.color+'"></span>'+m.label+b+'${icon("chevron", 13)}';trigger.setAttribute('aria-label','Model: '+m.label+(c.reasoning!=='Medium'?', '+c.reasoning+' reasoning':'')+(c.fast?', fast':''))};
var paintCard=function(i){var m=MODELS[i],c=config[m.id],d=DELTA[c.reasoning],names=['Intelligence','Speed','Context','Cost'];
card.innerHTML='<h3>'+m.label+'</h3><p>'+m.provider+' · '+m.blurb+'</p>'+m.metrics.map(function(v,k){var x=Math.max(4,Math.min(100,v+d[k]+(c.fast&&k===1?14:0)+(c.fast&&k===3?-10:0)));return '<div class="ms-metric"><span>'+names[k]+'</span><i><b style="width:'+x+'%"></b></i></div>'}).join('')+
'<div class="ms-seg" role="group" aria-label="Reasoning level">'+['Low','Medium','High'].map(function(l){return '<button type="button" aria-pressed="'+(c.reasoning===l)+'" data-r="'+l+'">'+l+'</button>'}).join('')+'</div>'+
(m.fast?'<div class="ms-fast"><span id="ms-fast-l">Fast mode</span><button type="button" role="switch" aria-labelledby="ms-fast-l" aria-checked="'+c.fast+'"></button></div>':'');
card.querySelectorAll('[data-r]').forEach(function(b){b.addEventListener('click',function(){c.reasoning=b.dataset.r;paintCard(i);paintTrigger()})});
var sw=card.querySelector('[role=switch]');if(sw)sw.addEventListener('click',function(){c.fast=!c.fast;paintCard(i);paintTrigger()})};
var paintList=function(){list.innerHTML=MODELS.map(function(m,i){return '<li role="option" id="ms-o'+i+'" aria-selected="'+(i===selected)+'" class="'+(i===active?'is-active':'')+'"><span class="ms-dot" style="background:'+m.color+'"></span>'+m.label+'<small>'+m.provider+'</small></li>'}).join('');list.setAttribute('aria-activedescendant','ms-o'+active);
list.querySelectorAll('li').forEach(function(li,i){li.addEventListener('pointerenter',function(){active=i;mark();paintCard(i)});li.addEventListener('click',function(){choose(i)})})};
var mark=function(){list.querySelectorAll('li').forEach(function(li,i){li.classList.toggle('is-active',i===active)});list.setAttribute('aria-activedescendant','ms-o'+active)};
var open=function(){pop.hidden=false;trigger.setAttribute('aria-expanded','true');active=selected;paintList();paintCard(active);list.focus()};
var close=function(focus){pop.hidden=true;trigger.setAttribute('aria-expanded','false');if(focus)trigger.focus()};
var choose=function(i){selected=i;paintTrigger();paintList();paintCard(i)};
trigger.addEventListener('click',function(){pop.hidden?open():close(false)});
list.addEventListener('keydown',function(e){if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();active=(active+(e.key==='ArrowDown'?1:MODELS.length-1))%MODELS.length;mark();paintCard(active)}else if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(active);close(true)}else if(e.key==='Escape'){close(true)}});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!pop.hidden)close(true)});
document.addEventListener('pointerdown',function(e){if(!pop.hidden&&!e.target.closest('.ms-pop')&&!e.target.closest('.ms-trigger'))close(false)});
document.querySelector('.ms-send').addEventListener('click',function(){var t=document.getElementById('ms-prompt').value.trim(),m=MODELS[selected];out.textContent=t?'Sent to '+m.label+' with '+config[m.id].reasoning.toLowerCase()+' reasoning.':'Write a prompt first.'});
paintTrigger();`,
  },
  {
    id: "dqnamo-signature",
    title: "Animated signature",
    category: "Text animations",
    description:
      "A signature that writes itself: the stroke draws along its own path on load. Sign the pad below and your own strokes replay the same way, one after another. Rebuilt from dqnamo's Kitchen.",
    tag: "dqnamo",
    html: `<main class="sg"><section class="sg-panel"><header><span>ANIMATED</span><button type="button" class="sg-replay">${icon("restart", 12)}Replay</button></header><svg class="sg-play" viewBox="0 0 380 200" role="img" aria-label="Animated signature"></svg></section>
<section class="sg-panel"><header><span>SIGN HERE</span><span class="sg-tools"><button type="button" class="sg-undo">${icon("undo", 12)}Undo</button><button type="button" class="sg-clear">${icon("x", 12)}Clear</button></span></header><svg class="sg-pad" viewBox="0 0 380 150" aria-label="Signature pad. Draw with a mouse, pen or finger."></svg></section></main>`,
    css: `${PAGE}
.sg{display:grid;gap:12px;width:min(420px,calc(100vw - 32px))}
.sg-panel{border-radius:14px;background:#fff;border:1px solid #e9e9e5;overflow:hidden}
.sg-panel header{display:flex;justify-content:space-between;align-items:center;height:34px;padding:0 8px 0 12px;border-bottom:1px solid #f1f1ee;font:600 9.5px ui-monospace,Menlo,monospace;letter-spacing:.1em;color:#a2a29c}
.sg-tools{display:flex;gap:4px}.sg-panel header button{display:flex;align-items:center;gap:4px;height:24px;padding:0 8px;border-radius:7px;border:1px solid #e9e9e5;background:#fff;font:500 11px Inter,system-ui,sans-serif;letter-spacing:0;color:#55554f}
.sg-play,.sg-pad{display:block;width:100%;height:auto;color:#1d1d1b}
.sg-pad{touch-action:none;cursor:crosshair;background:linear-gradient(transparent calc(100% - 34px),#ececE8 calc(100% - 34px),#ececE8 calc(100% - 33px),transparent calc(100% - 33px))}
.sg path{fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round}
.sg-stroke{stroke-dasharray:1;stroke-dashoffset:1;animation:sg-draw var(--d,2.4s) cubic-bezier(.2,.2,.8,.9) var(--delay,0s) forwards}
@keyframes sg-draw{to{stroke-dashoffset:0}}
@media(prefers-reduced-motion:reduce){.sg-stroke{stroke-dashoffset:0}}`,
    js: `var play=document.querySelector('.sg-play'),pad=document.querySelector('.sg-pad'),strokes=[],live=null;
var NS='http://www.w3.org/2000/svg',DEFAULT='${FLOURISH}';
var path=function(d,w){var p=document.createElementNS(NS,'path');p.setAttribute('d',d);p.setAttribute('stroke-width',w);return p};
var smooth=function(pts){if(pts.length<2)return 'M'+pts[0][0]+' '+pts[0][1]+'l.1 0';var d='M'+pts[0][0].toFixed(1)+' '+pts[0][1].toFixed(1);for(var i=1;i<pts.length-1;i++){var mx=(pts[i][0]+pts[i+1][0])/2,my=(pts[i][1]+pts[i+1][1])/2;d+=' Q'+pts[i][0].toFixed(1)+' '+pts[i][1].toFixed(1)+' '+mx.toFixed(1)+' '+my.toFixed(1)}var l=pts[pts.length-1];return d+' L'+l[0].toFixed(1)+' '+l[1].toFixed(1)};
var replay=function(){play.innerHTML='';if(!strokes.length){play.setAttribute('viewBox','0 0 380 200');var p=path(DEFAULT,7);p.setAttribute('pathLength','1');p.setAttribute('class','sg-stroke');p.setAttribute('transform','translate(8 4) scale(1.04 1.04)');play.appendChild(p);return}
play.setAttribute('viewBox','0 0 380 150');var delay=0;strokes.forEach(function(s){var p=path(s.d,4);play.appendChild(p);var len=p.getTotalLength(),dur=Math.max(0.25,Math.min(1.6,len/260));p.setAttribute('pathLength','1');p.setAttribute('class','sg-stroke');p.style.setProperty('--d',dur+'s');p.style.setProperty('--delay',delay+'s');delay+=dur*0.92})};
var paintPad=function(){pad.innerHTML='';strokes.forEach(function(s){pad.appendChild(path(s.d,4))});if(live)pad.appendChild(live.el)};
var point=function(e){var r=pad.getBoundingClientRect();return[(e.clientX-r.left)/r.width*380,(e.clientY-r.top)/r.height*150]};
pad.addEventListener('pointerdown',function(e){pad.setPointerCapture(e.pointerId);live={pts:[point(e)],el:path('',4)};paintPad();live.el.setAttribute('d',smooth(live.pts))});
pad.addEventListener('pointermove',function(e){if(!live)return;var p=point(e),l=live.pts[live.pts.length-1];if(Math.hypot(p[0]-l[0],p[1]-l[1])<1.5)return;live.pts.push(p);live.el.setAttribute('d',smooth(live.pts))});
var end=function(){if(!live)return;strokes.push({d:smooth(live.pts)});live=null;paintPad();replay()};pad.addEventListener('pointerup',end);pad.addEventListener('pointercancel',end);
document.querySelector('.sg-undo').addEventListener('click',function(){strokes.pop();paintPad();replay()});
document.querySelector('.sg-clear').addEventListener('click',function(){strokes=[];paintPad();replay()});
document.querySelector('.sg-replay').addEventListener('click',replay);replay();`,
  },
  {
    id: "dqnamo-logo-trace-loader",
    title: "Logo trace loader",
    category: "Loaders & feedback",
    description:
      "A loader made from a logo's outline: a short stroke runs round the mark while work is in progress, then closes the outline, traces the inner shape and fills in when it finishes. Rebuilt from dqnamo's Kitchen.",
    tag: "dqnamo",
    html: `<main class="lt-stage"><svg class="lt" viewBox="-8 -8 116 116" width="44" height="44" role="status" aria-label="Ready"><path class="lt-guide" d="${MARK_OUTER}"/><g class="lt-live"></g></svg>
<form class="lt-card" onsubmit="return false"><h2>Sign in</h2><p>Enter your email and we'll send you a code. We'll create your account if you don't have one yet.</p><label class="lt-sr" for="lt-email">Email</label><div class="lt-row"><input id="lt-email" type="email" placeholder="you@email.com" autocomplete="off"><button type="submit">Send code</button></div></form>
<p class="lt-state" aria-live="polite"><i></i><span>Ready</span></p></main>`,
    css: `${PAGE}
.lt-stage{display:grid;justify-items:center;gap:18px;width:min(380px,calc(100vw - 32px))}
.lt{overflow:visible;color:#2f6bff;transition:color .2s}.lt.is-filled{color:#1d1d1b}
.lt path{fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:7}
.lt .lt-guide{stroke-width:3.5;opacity:.18}.lt .lt-fill{fill:currentColor;fill-rule:evenodd;stroke:none;animation:lt-fade .14s ease-out both}
.lt-loop{stroke-dasharray:.16 .84;animation:lt-loop .62s linear infinite}
.lt-close{stroke-dasharray:1;animation:lt-close var(--t) linear both}
@keyframes lt-loop{to{stroke-dashoffset:-1}}@keyframes lt-close{from{stroke-dashoffset:.84}to{stroke-dashoffset:0}}@keyframes lt-fade{from{opacity:0}}
.lt-card{width:100%;padding:16px;border-radius:14px;background:#fff;border:1px solid #e9e9e5;box-shadow:0 12px 28px -18px rgba(0,0,0,.2)}
.lt-card h2{margin:0;font-size:14px}.lt-card p{margin:5px 0 14px;font-size:12px;line-height:1.45;color:#7b7b76}
.lt-row{display:flex;gap:8px}.lt-row input{flex:1;min-width:0;height:34px;padding:0 10px;border-radius:9px;border:1px solid #e2e2de;font:inherit;font-size:13px;outline:none}.lt-row input:focus{border-color:#2f6bff}
.lt-row button{height:34px;padding:0 12px;border-radius:9px;border:0;background:#1d1d1b;color:#fff;font-size:12.5px;font-weight:600}.lt-row button:disabled{opacity:.6}
.lt-state{display:flex;align-items:center;gap:6px;margin:0;font-size:12px;color:#7b7b76}.lt-state i{width:7px;height:7px;border-radius:50%;background:#3fbf6f}.lt-state.is-busy i{background:#2f6bff;animation:lt-pulse 1s ease-in-out infinite}
.lt-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@keyframes lt-pulse{50%{opacity:.3}}`,
    js: `${REDUCED}var svg=document.querySelector('.lt'),live=svg.querySelector('.lt-live'),state=document.querySelector('.lt-state'),btn=document.querySelector('.lt-row button'),email=document.getElementById('lt-email');
var OUTER='${MARK_OUTER}',INNER='${MARK_INNER}',timers=[],complete=false;
var p=function(d,cls,t){return '<path d="'+d+'" pathLength="1" class="'+(cls||'')+'"'+(t?' style="--t:'+t+'s"':'')+'/>'};
var at=function(ms,fn){timers.push(setTimeout(fn,ms))};
var setStatus=function(text,busy){state.querySelector('span').textContent=text;state.classList.toggle('is-busy',busy);svg.setAttribute('aria-label',text)};
var fill=function(){svg.classList.add('is-filled');live.innerHTML='<path class="lt-fill" d="'+OUTER+' '+INNER+'"/>'+p(OUTER)+p(INNER)};
var loop=function(){timers.forEach(clearTimeout);timers=[];complete=false;svg.classList.remove('is-filled');live.innerHTML=reduced?'':p(OUTER,'lt-loop');setStatus('Sending code…',true)};
var finish=function(){if(reduced){fill();return}var wait=0.62*1000-((performance.now()-started)%620);
at(wait,function(){live.innerHTML=p(OUTER,'lt-close',0.52)});at(wait+520,function(){live.innerHTML=p(OUTER)+p(INNER,'lt-close',0.24)});at(wait+520+240,fill)};
var started=0;
document.querySelector('.lt-card').addEventListener('submit',function(){btn.disabled=true;started=performance.now();loop();
at(1900,function(){finish();at(reduced?0:900,function(){setStatus('Code sent to '+(email.value||'you@email.com'),false);btn.disabled=false})})});
fill();`,
  },
  {
    id: "dqnamo-iridescent-foil",
    title: "Iridescent foil",
    category: "Hover effects",
    description:
      "A business card printed on holographic foil, made only of layered CSS gradients: the rainbow sheen and the glare follow the pointer, and drift as the page scrolls. Rebuilt from dqnamo's Kitchen.",
    tag: "dqnamo",
    html: `<main class="if-page"><div class="if-spacer"></div><div class="if-card" tabindex="0" aria-label="Business card: Northern Press, letterpress and print, established 2026">
<span class="if-foil" aria-hidden="true"></span><span class="if-film" aria-hidden="true"></span><span class="if-pearl" aria-hidden="true"></span>
<div class="if-content"><span class="if-kick">EST. 2026</span><b>NORTHERN<br>PRESS</b><span class="if-sub">Letterpress &amp; print</span><span class="if-addr">12 Foundry Lane · Leeds</span></div>
<span class="if-shine" aria-hidden="true"></span><span class="if-glare" aria-hidden="true"></span></div><p class="if-hint">Move the pointer over the card, or scroll.</p><div class="if-spacer"></div></main>`,
    css: `${PAGE}
body{display:block!important;overflow:auto!important;height:100vh}
.if-page{display:flex;flex-direction:column;align-items:center;gap:14px}.if-spacer{height:calc(50vh - 110px);flex:none}
.if-card{--fx:0%;--fy:0%;--gx:50%;--gy:50%;--angle:135deg;--shine:.6;position:relative;flex:none;width:340px;height:200px;border-radius:14px;overflow:hidden;isolation:isolate;background:#dedede;box-shadow:inset 0 0 0 1px rgba(255,255,255,.4),0 22px 40px -22px rgba(0,0,0,.35),0 2px 6px rgba(0,0,0,.08);outline:none}
.if-card:focus-visible{box-shadow:0 0 0 2px #2f6bff,0 22px 40px -22px rgba(0,0,0,.35)}
.if-card>span{position:absolute;inset:-45%;pointer-events:none;background-repeat:no-repeat}
.if-foil{z-index:0;background:linear-gradient(110deg,transparent 26%,rgba(0,214,255,.09) 31%,rgba(90,255,190,.08) 36%,rgba(200,255,90,.06) 41%,transparent 47%,rgba(255,225,80,.05) 51%,rgba(255,80,180,.08) 57%,rgba(150,95,255,.08) 64%,rgba(60,125,255,.07) 70%,transparent 76%),linear-gradient(135deg,#efefef,#dadada 42%,#c8c8c8 72%,#e9e9e9);background-size:320% 100%,100% 100%;background-position:var(--fx) center,center;filter:saturate(1.2) contrast(1.2)}
.if-film{z-index:1;background:radial-gradient(ellipse at 18% 30%,rgba(255,80,180,.11),transparent 48%),radial-gradient(ellipse at 64% 20%,rgba(0,214,255,.11),transparent 52%),radial-gradient(ellipse at 76% 72%,rgba(90,255,190,.11),transparent 55%),radial-gradient(ellipse at 40% 80%,rgba(150,95,255,.11),transparent 52%);background-size:150% 150%;background-position:calc(var(--fx) * -.25) calc(var(--fy) * .3);mix-blend-mode:screen;opacity:.4}
.if-pearl{z-index:2;background:radial-gradient(ellipse at var(--gx) var(--gy),rgba(225,234,241,.5),rgba(205,217,226,.16) 22%,transparent 54%),linear-gradient(110deg,rgba(220,230,238,.32),rgba(220,230,238,0) 28%,rgba(84,108,128,.2) 48%,rgba(215,226,235,.3) 72%,transparent);background-size:100% 100%,180% 100%;background-position:center,var(--fx) center;mix-blend-mode:soft-light}
.if-content{position:absolute;inset:0;z-index:3;padding:20px 22px;display:flex;flex-direction:column;color:#2c2f33;mix-blend-mode:multiply}
.if-kick{font:700 8.5px ui-monospace,Menlo,monospace;letter-spacing:.2em;color:#6a6f76}.if-content b{margin-top:auto;font:700 30px/0.95 Georgia,"Times New Roman",serif;letter-spacing:-.02em}
.if-sub{margin-top:8px;font-size:11.5px;color:#4b5057}.if-addr{position:absolute;right:22px;bottom:20px;font-size:9.5px;color:#6a6f76}
.if-shine{z-index:4;background:linear-gradient(var(--angle),transparent,rgba(220,230,238,.05) 12%,rgba(226,235,242,.48) 31%,rgba(37,52,66,.22) 52%,rgba(0,124,255,.08) 64%,rgba(255,0,147,.08) 74%,rgba(223,232,239,.28) 88%,transparent);background-size:220% 100%;background-position:calc(50% + (var(--gx) - 50%) * .35) calc(50% + (var(--gy) - 50%) * .24);mix-blend-mode:screen;opacity:var(--shine)}
.if-glare{z-index:5;inset:0!important;background:radial-gradient(circle at var(--gx) var(--gy),rgba(226,235,242,.36),rgba(205,218,228,.14) 9%,rgba(226,237,246,.08) 22%,transparent 36%);mix-blend-mode:screen;opacity:.42}
.if-hint{margin:0;font-size:12px;color:#8a8a84}`,
    js: `var card=document.querySelector('.if-card'),px=0.5,py=0.5,raf=0,t0=performance.now(),idle=true;
var clamp=function(v,a,b){return Math.min(b,Math.max(a,v))};
var apply=function(){raf=0;var r=card.getBoundingClientRect(),range=innerHeight+r.height,scroll=range>0?clamp((innerHeight-r.top)/range,0,1):0,s=card.style;
s.setProperty('--fx',((scroll*0.82+(px-0.5)*0.18)*100).toFixed(2)+'%');s.setProperty('--fy',((scroll*0.28+(py-0.5)*0.12)*100).toFixed(2)+'%');
s.setProperty('--gx',(px*100).toFixed(2)+'%');s.setProperty('--gy',(py*100).toFixed(2)+'%');s.setProperty('--angle',(105+scroll*80+(px-0.5)*28).toFixed(1)+'deg');s.setProperty('--shine',(0.56+Math.abs(px-0.5)*0.24+scroll*0.12).toFixed(3))};
var schedule=function(){if(!raf)raf=requestAnimationFrame(apply)};
addEventListener('pointermove',function(e){idle=false;var r=card.getBoundingClientRect();px=clamp((e.clientX-r.left)/r.width,0.08,0.92);py=clamp((e.clientY-r.top)/r.height,0.08,0.92);schedule()},{passive:true});
addEventListener('scroll',schedule,{passive:true});document.addEventListener('scroll',schedule,{passive:true,capture:true});addEventListener('resize',schedule);
card.addEventListener('keydown',function(e){var k={ArrowLeft:[-.05,0],ArrowRight:[.05,0],ArrowUp:[0,-.05],ArrowDown:[0,.05]}[e.key];if(k){e.preventDefault();idle=false;px=clamp(px+k[0],0.08,0.92);py=clamp(py+k[1],0.08,0.92);schedule()}});
/* Until someone moves, the light drifts slowly so the foil reads as foil. */
if(!matchMedia('(prefers-reduced-motion: reduce)').matches){var drift=function(t){if(!idle)return;var a=(t-t0)/2400;px=0.5+Math.sin(a)*0.3;py=0.45+Math.cos(a*0.7)*0.2;apply();requestAnimationFrame(drift)};requestAnimationFrame(drift)}
schedule();`,
  },
  {
    id: "dqnamo-scramble-text",
    title: "Scramble text",
    category: "Text animations",
    description:
      "Text that decodes into place: symbols settle into the real characters left to right in a fixed number of steps, whatever the length. Screen readers get the final text at once. Regenerate the invite link to see it. Rebuilt from dqnamo's Kitchen.",
    tag: "dqnamo",
    html: `<main class="sc"><h2 class="sc-head" data-text="Your invite is ready"></h2><div class="sc-row"><span class="sc-link" data-text=""></span><button type="button" class="sc-btn">${icon("refresh", 13)}Regenerate</button></div><p class="sc-note">Share this link with your team.</p></main>`,
    css: `${PAGE}
.sc{display:grid;justify-items:center;gap:14px;width:min(440px,calc(100vw - 32px))}
.sc-head{margin:0;font-size:22px;font-weight:600;letter-spacing:-.03em;white-space:pre}
.sc-row{display:flex;align-items:center;gap:8px;padding:4px 4px 4px 12px;width:100%;border-radius:11px;background:#fff;border:1px solid #e6e6e2;box-shadow:0 1px 2px rgba(0,0,0,.04)}
.sc-link{flex:1;min-width:0;overflow:hidden;font:12.5px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#4b4b46;white-space:pre}
.sc-btn{display:flex;align-items:center;gap:5px;height:30px;padding:0 10px;border:0;border-radius:8px;background:#1d1d1b;color:#fff;font-size:12px;font-weight:600;flex:none}
.sc-note{margin:0;font-size:12px;color:#8a8a84}
.sc-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}`,
    js: `var CHARS='-_~!@#$%^&*()+=[]{}|;:,.<>?',STEPS=48,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
var parts=function(t){if(window.Intl&&Intl.Segmenter){return Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(t),function(s){return s.segment})}return Array.from(t)};
var mix=function(segs,n){return segs.map(function(c,i){return c.trim()===''||i<n?c:CHARS[Math.floor(Math.random()*CHARS.length)]}).join('')};
var scramble=function(el,text,interval){if(!el._shown){el._shown=document.createElement('span');el._shown.setAttribute('aria-hidden','true');el._sr=document.createElement('span');el._sr.className='sc-sr';el._sr.setAttribute('aria-live','polite');el._sr.setAttribute('aria-atomic','true');el.append(el._shown,el._sr)}
clearInterval(el._timer);el._sr.textContent=text;var segs=parts(text);if(reduced||!segs.length){el._shown.textContent=text;return}
var n=0,step=Math.max(1,Math.ceil(segs.length/STEPS));el._shown.textContent=mix(segs,0);el._timer=setInterval(function(){n=Math.min(segs.length,n+step);el._shown.textContent=mix(segs,n);if(n>=segs.length)clearInterval(el._timer)},interval||32)};
var code=function(){var a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',s='';for(var i=0;i<12;i++){s+=a[Math.floor(Math.random()*a.length)];if(i===3||i===7)s+='-'}return s};
var link=document.querySelector('.sc-link'),head=document.querySelector('.sc-head');
scramble(head,head.dataset.text,40);scramble(link,'playground.dev/invite/'+code());
document.querySelector('.sc-btn').addEventListener('click',function(){scramble(link,'playground.dev/invite/'+code())});`,
  },
];
