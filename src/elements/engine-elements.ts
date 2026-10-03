/**
 * Authored demos that run on a real third-party engine.
 *
 * Only the markup and styling live here. Each demo's behaviour is bundled from
 * `scripts/engine-demos.mjs` into one script per engine, matched to the element by the
 * root selector named in the comment above it — a test holds the two together, because
 * a root that stops matching produces a card that renders but never moves.
 *
 * Every demo is written so the static document already reads correctly: the script adds
 * the motion, and under `prefers-reduced-motion` it either does not run or takes an
 * explicit static path. The tag is the engine, since that is the runtime a client would
 * be installing; the demo itself is Playground's.
 */

const CHAPTERS = [
  ["Take your time", "A page that respects the pace someone reads at."],
  ["Find your rhythm", "Motion that follows the scroll rather than fighting it."],
  ["Keep exploring", "Enough room for the next idea to arrive."],
  ["Then hand it over", "Everything readable by the next person to touch it."],
] as const;

export const ENGINE_ELEMENTS = [
  // --- Motion.dev -----------------------------------------------------------------
  // root: .stagger-line
  {
    id: "motion-stagger",
    title: "Stagger cascade",
    category: "Text animations",
    description: "Words spring in one after another on Motion's stagger, each with its own blur clearing.",
    tag: "Motion.dev",
    html: `<div class="center stagger-line"><small>MOTION · STAGGER</small><h1>${
      ["Every", "word", "in", "its", "own", "time."].map(word => `<span class="stagger-word">${word}</span>`).join(" ")
    }</h1><button class="replay">Replay ↻</button></div>`,
    css: `.stagger-line h1{display:flex;flex-wrap:wrap;justify-content:center;gap:0 .28em;max-width:9ch}.stagger-word{display:inline-block;will-change:transform,opacity}.replay{background:none;border:1px solid #4d6339;color:var(--accent);border-radius:20px;padding:7px 15px;font-size:10px;letter-spacing:.1em}`,
    js: "",
  },

  // root: .mscroll
  {
    id: "motion-scroll-track",
    title: "Scroll-linked track",
    category: "Scroll effects",
    description: "Motion's scroll() drives a progress bar and three parallax layers from the same gesture, frame for frame.",
    tag: "Motion.dev",
    html: `<div class="mscroll"><div class="mscroll-bar"><i></i></div><b class="mscroll-pct">0%</b><div class="mscroll-viewport"><div class="mscroll-stage"><i class="mscroll-layer far"></i><i class="mscroll-layer mid"></i><i class="mscroll-layer near"></i><em>DEPTH</em></div><small>SCROLL INSIDE ↓</small><h2>Three layers,<br>one gesture.</h2><p>Each moves at its own rate because the scroll position drives them directly — not a timer approximating one.</p><p>Let go and everything stops exactly where the scroll did.</p><div class="mscroll-end">END OF TRACK</div></div></div>`,
    css: `body{display:block!important}.mscroll{position:relative;height:100vh}.mscroll-bar{position:absolute;top:0;left:0;right:0;height:3px;background:#28331f;z-index:3}.mscroll-bar i{display:block;height:100%;background:var(--accent);transform:scaleX(0);transform-origin:0 50%}.mscroll-pct{position:absolute;top:12px;right:14px;z-index:3;font-size:10px;font-family:ui-monospace,monospace;color:var(--accent)}.mscroll-viewport{height:100vh;overflow:auto;padding:0 26px 40px}.mscroll-stage{position:sticky;top:0;height:46vh;display:grid;place-items:center;overflow:hidden;margin:0 -26px}.mscroll-layer{position:absolute;border-radius:50%;will-change:transform}.mscroll-layer.far{width:230px;height:230px;background:#22301c}.mscroll-layer.mid{width:150px;height:150px;background:#38502a}.mscroll-layer.near{width:74px;height:74px;background:var(--accent)}.mscroll-stage em{position:relative;font-style:normal;font-size:10px;letter-spacing:.34em;color:#101309;font-weight:700}.mscroll-viewport small{display:block;text-align:center;padding:18px 0}.mscroll-viewport h2{font-size:clamp(20px,4.5vw,30px);margin:0 0 14px;max-width:16ch}.mscroll-viewport p{font-size:13px;line-height:1.75;color:#a9b5a2;max-width:44ch;margin:0 0 20px}.mscroll-end{margin-top:40vh;text-align:center;font-size:8px;letter-spacing:.16em;color:#6f7d68;border-top:1px dashed #2f3a28;padding-top:18px}`,
    js: "",
  },

  // root: .minview
  {
    id: "motion-inview",
    title: "In-view reveal",
    category: "Scroll effects",
    description: "Motion's inView() brings each card in as it arrives and lets it go again on the way out.",
    tag: "Motion.dev",
    html: `<div class="minview"><div class="minview-viewport"><small>SCROLL INSIDE ↓ · MOTION · INVIEW</small>${
      CHAPTERS.map(([title, body], index) => `<article class="minview-card"><b>0${index + 1}</b><div><h3>${title}</h3><p>${body}</p></div></article>`).join("")
    }<div class="minview-end">END OF SECTION</div></div></div>`,
    css: `body{display:block!important}.minview{height:100vh}.minview-viewport{height:100vh;overflow:auto;padding:22px 24px 30px}.minview-viewport>small{display:block;text-align:center;padding-bottom:26px}.minview-card{display:flex;gap:16px;align-items:flex-start;padding:20px;margin:0 auto 26px;max-width:420px;background:#1a2317;border:1px solid #2f3d27;border-radius:14px;will-change:transform,opacity}.minview-card b{flex:none;width:30px;height:30px;border-radius:50%;background:var(--accent);color:#141a10;display:grid;place-items:center;font-size:11px}.minview-card h3{margin:2px 0 6px;font-size:16px;letter-spacing:-.02em}.minview-card p{margin:0;font-size:12px;line-height:1.7;color:#a9b5a2}.minview-end{margin-top:30vh;text-align:center;font-size:8px;letter-spacing:.16em;color:#6f7d68}`,
    js: "",
  },

  // root: .deck
  {
    id: "motion-drag-deck",
    title: "Drag deck",
    category: "Hover effects",
    description: "Throw a card anywhere and a Motion spring carries it home, with the rotation following the throw.",
    tag: "Motion.dev",
    html: `<div class="center deck"><small>MOTION · SPRING RETURN</small><div class="deck-cards">${
      [["✳", "Discover"], ["◒", "Compose"], ["↗", "Deliver"]].map(([glyph, label], index) =>
        `<div class="deck-card" style="--i:${index}"><span>${glyph}</span><b>${label}</b></div>`).join("")
    }</div><span class="deck-note hint">Drag a card anywhere.</span></div>`,
    css: `.deck-cards{position:relative;width:250px;height:190px}.deck-card{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:linear-gradient(160deg,#2b3a22,#1a2317);border:1px solid #475c36;border-radius:18px;cursor:grab;touch-action:none;user-select:none;transform:rotate(calc((var(--i) - 1) * 5deg)) translateY(calc(var(--i) * -6px));box-shadow:0 18px 40px #0007;will-change:transform}.deck-card span{font-size:38px;color:var(--accent)}.deck-card b{font-size:11px;letter-spacing:.16em;color:#b9c7ac;font-weight:500}`,
    js: "",
  },

  // root: .mtabs
  {
    id: "motion-tab-slider",
    title: "Sliding tabs",
    category: "Buttons & inputs",
    description: "The indicator springs to whichever tab you choose, and arrow keys move through them.",
    tag: "Motion.dev",
    html: `<div class="center mtabs"><small>MOTION · SHARED INDICATOR</small><div class="mtabs-row" role="tablist" aria-label="Billing period"><i class="mtabs-glider"></i>${
      [["Monthly", "Pay as you go, cancel whenever you like."], ["Yearly", "Two months free when you pay for the year."], ["Forever", "One payment, and it stays yours."]]
        .map(([label, panel], index) => `<button role="tab" aria-selected="${index === 0}" data-panel="${panel}">${label}</button>`).join("")
    }</div><p class="mtabs-panel"></p></div>`,
    css: `.mtabs-row{position:relative;display:flex;gap:4px;padding:5px;background:#1b2417;border:1px solid #33422a;border-radius:30px}.mtabs-glider{position:absolute;top:5px;bottom:5px;left:0;width:0;background:var(--accent);border-radius:24px;will-change:transform,width}.mtabs-row button{position:relative;z-index:1;border:0;background:none;color:#a9b5a2;padding:9px 17px;border-radius:24px;font-size:12px;transition:color .25s}.mtabs-row button[aria-selected=true]{color:#141a10;font-weight:600}.mtabs-panel{margin:0;font-size:12px;line-height:1.7;color:#a9b5a2;max-width:34ch;text-align:center;min-height:2.6em}`,
    js: "",
  },

  // root: .mcount
  {
    id: "motion-counter",
    title: "Counting figures",
    category: "Charts & data viz",
    description: "Headline figures that run up to their value on Motion, then hold — no chart, because the number is the point.",
    tag: "Motion.dev",
    html: `<div class="center mcount"><small>MOTION · ANIMATED FIGURES</small><div class="mcount-row">${
      [["1284", "", "Projects delivered"], ["98.6", "%", "Client retention"], ["16", "", "Years in practice"]]
        .map(([to, suffix, label]) => `<div class="mcount-tile"><b data-to="${to}"${suffix ? ` data-suffix="${suffix}"` : ""}>0${suffix}</b><span>${label}</span></div>`).join("")
    }</div><button class="replay">Replay ↻</button></div>`,
    css: `.mcount-row{display:flex;gap:30px;flex-wrap:wrap;justify-content:center}.mcount-tile{display:flex;flex-direction:column;gap:7px;align-items:center}.mcount-tile b{font-size:clamp(28px,7vw,44px);font-weight:600;letter-spacing:-.04em;color:var(--accent);line-height:1}.mcount-tile span{font-size:11px;color:#a9b5a2}.replay{background:none;border:1px solid #4d6339;color:var(--accent);border-radius:20px;padding:7px 15px;font-size:10px;letter-spacing:.1em}`,
    js: "",
  },

  // --- Lenis ----------------------------------------------------------------------
  // root: .lvel
  {
    id: "lenis-velocity",
    title: "Velocity skew",
    category: "Scroll effects",
    description: "Lenis reports how fast you are scrolling, and the rows lean into it and settle when you stop.",
    tag: "Lenis",
    html: `<div class="lvel"><div class="lvel-content"><small>SCROLL INSIDE ↓ · LENIS VELOCITY</small>${
      ["Momentum", "Easing", "Damping", "Friction", "Inertia", "Settle", "At rest", "Again"]
        .map((word, index) => `<div class="lvel-row"><b>${String(index + 1).padStart(2, "0")}</b><span>${word}</span></div>`).join("")
    }</div><b class="lvel-readout">At rest</b></div>`,
    css: `body{display:block!important}.lvel{height:100vh;overflow:auto;position:relative}.lvel-content{padding:22px 24px 45vh}.lvel-content>small{display:block;text-align:center;padding-bottom:22px}.lvel-row{display:flex;align-items:center;gap:16px;padding:20px 22px;margin:0 auto 12px;max-width:390px;background:#1a2317;border:1px solid #2f3d27;border-radius:12px;will-change:transform}.lvel-row b{font-size:10px;font-family:ui-monospace,monospace;color:var(--accent)}.lvel-row span{font-size:19px;letter-spacing:-.02em}.lvel-readout{position:fixed;right:14px;bottom:14px;padding:7px 12px;background:#1a2317e6;border:1px solid #3a4b30;border-radius:20px;font-size:10px;font-family:ui-monospace,monospace;color:var(--accent)}`,
    js: "",
  },

  // root: .lanchor
  {
    id: "lenis-anchor",
    title: "Smooth anchors",
    category: "Scroll effects",
    description: "Jump between sections and Lenis eases the whole way, with the marker following what you are actually reading.",
    tag: "Lenis",
    html: `<div class="lanchor"><nav class="lanchor-nav" aria-label="Sections">${
      CHAPTERS.map(([title], index) => `<a href="#lan-${index + 1}" aria-current="${index === 0}">${String(index + 1).padStart(2, "0")}<i>${title}</i></a>`).join("")
    }</nav><div class="lanchor-viewport"><div class="lanchor-content">${
      CHAPTERS.map(([title, body], index) => `<section class="lanchor-section" id="lan-${index + 1}"><small>0${index + 1}</small><h2>${title}</h2><p>${body}</p></section>`).join("")
    }</div></div></div>`,
    css: `body{display:block!important}.lanchor{display:grid;grid-template-columns:118px minmax(0,1fr);height:100vh}.lanchor-nav{display:flex;flex-direction:column;gap:3px;padding:20px 10px;border-right:1px solid #2b3724;overflow:auto}.lanchor-nav a{display:flex;flex-direction:column;gap:3px;padding:9px 11px;border-radius:9px;text-decoration:none;color:#7f8d78;font-size:9px;font-family:ui-monospace,monospace;transition:background .3s,color .3s}.lanchor-nav a i{font-style:normal;font-family:Arial,sans-serif;font-size:10px}.lanchor-nav a[aria-current=true]{background:#26331d;color:var(--accent)}.lanchor-viewport{height:100vh;overflow:auto}.lanchor-section{min-height:100vh;display:flex;flex-direction:column;justify-content:center;padding:30px 28px;border-bottom:1px solid #222c1d}.lanchor-section small{color:var(--accent)}.lanchor-section h2{font-size:clamp(21px,5vw,32px);margin:10px 0}.lanchor-section p{margin:0;font-size:13px;line-height:1.75;color:#a9b5a2;max-width:40ch}`,
    js: "",
  },

  // --- Vanta ----------------------------------------------------------------------
  // root: #vanta-waves
  {
    id: "vanta-waves",
    title: "Vanta waves",
    category: "Backgrounds",
    description: "A lit three-dimensional surface rolling under the copy, rendered by Vanta WAVES on Three.js.",
    tag: "Vanta",
    html: '<div id="vanta-waves"><div class="center"><small>VANTA · WAVES</small><h1>Steady<br>as it goes.</h1><p class="engine-status" aria-live="polite"></p></div></div>',
    css: "#vanta-waves{width:100%;height:100%;display:grid;place-items:center;background:linear-gradient(#1c2a1c,#111412)}#vanta-waves .center{z-index:1;pointer-events:none;text-shadow:0 2px 24px #0009}.engine-status{font-size:11px;color:#c3cdb8}",
    js: "",
  },

  // root: #vanta-globe
  {
    id: "vanta-globe",
    title: "Vanta globe",
    category: "Backgrounds",
    description: "A rotating point-cloud globe that answers the pointer, rendered by Vanta GLOBE on Three.js.",
    tag: "Vanta",
    html: '<div id="vanta-globe"><div class="center"><small>VANTA · GLOBE</small><h1>Wherever<br>they are.</h1><p class="engine-status" aria-live="polite"></p></div></div>',
    css: "#vanta-globe{width:100%;height:100%;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 40%,#1e2f22,#111412)}#vanta-globe .center{z-index:1;pointer-events:none;text-shadow:0 2px 24px #000b}.engine-status{font-size:11px;color:#c3cdb8}",
    js: "",
  },

  // root: #vanta-fog
  {
    id: "vanta-fog",
    title: "Vanta fog",
    category: "Backgrounds",
    description: "Soft fields of colour drifting behind the copy, rendered by Vanta FOG on Three.js.",
    tag: "Vanta",
    html: '<div id="vanta-fog"><div class="center"><small>VANTA · FOG</small><h1>Room to<br>breathe.</h1><p class="engine-status" aria-live="polite"></p></div></div>',
    css: "#vanta-fog{width:100%;height:100%;display:grid;place-items:center;background:#111412}#vanta-fog .center{z-index:1;pointer-events:none;text-shadow:0 2px 26px #000c}.engine-status{font-size:11px;color:#c3cdb8}",
    js: "",
  },
] as const;
