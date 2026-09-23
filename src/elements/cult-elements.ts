/**
 * Eight components from cult-ui (https://www.cult-ui.com/docs/components), rebuilt as
 * plain HTML, CSS and JavaScript.
 *
 * cult-ui is MIT licensed (c) Jordan-Gilliam / nolly-studio, and every component it
 * publishes is a React component built on Motion and Tailwind. An element here is a
 * standalone document rendered in a sandboxed iframe with no framework and no build, so
 * these are ports rather than copies: the behaviour, the proportions and the named
 * controls are taken from the upstream source (apps/www/registry/default/ui/*.tsx), and
 * the implementation underneath is this project's own.
 *
 * Where upstream uses a spring, these use a spring-shaped cubic-bezier or a Web
 * Animations spring approximation, which is the closest a document with no runtime can
 * get. Where a number is load-bearing it is kept: the dock magnifies between 40px and
 * 80px across a 150px radius, and the dynamic island's presets keep their real widths
 * and corner radii, because those are what make each one recognisable.
 *
 * All eight carry the `cult-` prefix, which puts them in `INTERACTION_ONLY` in
 * catalogue.ts: their scripts run under `prefers-reduced-motion` rather than being
 * skipped, because a tab strip that cannot change tabs or a list that cannot be
 * reordered is broken rather than calmed. Each script damps its own animation instead.
 */
import type { BrowseCategory } from "./taxonomy";

interface CultElement {
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
 * Shared surface treatment. cult-ui's look is mostly one idea — a panel lit from above
 * by a hairline inset highlight, over stacked diffuse shadows — applied at every scale,
 * so it is written once here.
 */
const SURFACE = `--cult-line:rgba(255,255,255,.09);
  --cult-fill:#1c211d;
  --cult-lift:0 1px 0 0 rgba(255,255,255,.06) inset,0 0 0 1px rgba(255,255,255,.04) inset,
    0 1px 2px rgba(0,0,0,.4),0 4px 12px rgba(0,0,0,.28),0 12px 32px rgba(0,0,0,.22);`;

/** A spring that overshoots slightly, standing in for Motion's stiffness/damping pairs. */
const SPRING = "cubic-bezier(.2,1.5,.35,1)";
const EASE = "cubic-bezier(.32,.72,0,1)";

/** Reads the OS setting at call time, so a script can damp itself rather than not run. */
const STILL = "matchMedia('(prefers-reduced-motion:reduce)').matches";

export const CULT_ELEMENTS: CultElement[] = [
  {
    id: "cult-texture-button",
    title: "Texture button",
    category: "Buttons & inputs",
    description:
      "A button built as two stacked layers — a 1px gradient shell around a gradient face — so its edge catches light like a physical key. Four variants, after cult-ui's TextureButton.",
    tag: "cult-ui",
    html: `<div class="tx-set">
  <button class="tx tx-primary"><span>Continue</span></button>
  <button class="tx tx-accent"><span>Publish site</span></button>
  <button class="tx tx-minimal"><span>Save draft</span></button>
  <button class="tx tx-destructive"><span>Delete</span></button>
  <p class="tx-note">Four variants. The edge is a separate layer.</p>
</div>`,
    css: `.tx-set{${SURFACE}display:grid;gap:12px;width:min(86%,260px)}
.tx{padding:1px;border:1px solid rgba(0,0,0,.35);border-radius:12px;background:linear-gradient(180deg,#6f7a6b,#2b332c);
  box-shadow:var(--cult-lift);transition:filter .3s ease,transform .12s ease}
.tx span{display:flex;align-items:center;justify-content:center;gap:8px;border-radius:11px;
  padding:11px 18px;font-size:14px;font-weight:600;letter-spacing:-.01em;color:#f2f3ed;
  background:linear-gradient(180deg,#3a4339,#20261f);transition:background .3s ease}
.tx:hover{filter:brightness(1.12)}
.tx:active{transform:translateY(1px)}
.tx-primary{background:linear-gradient(180deg,#f4f5ef,#c9cdbe)}
.tx-primary span{background:linear-gradient(180deg,#fbfcf7,#e3e6d9);color:#161a15}
.tx-accent{background:linear-gradient(180deg,#a9c98a,#5f7f45)}
.tx-accent span{background:linear-gradient(180deg,#9dbd7c,#587a3f);color:#10160c}
.tx-minimal{background:rgba(255,255,255,.12)}
.tx-destructive{background:linear-gradient(180deg,#e58b83,#a8342a)}
.tx-destructive span{background:linear-gradient(180deg,#d1756c,#932f27);color:#fff2ef}
.tx-note{grid-column:1;margin:4px 0 0;font-size:11px;color:#8b968b;text-align:center}`,
    js: "",
  },
  {
    id: "cult-bg-animate-button",
    title: "Conic halo button",
    category: "Buttons & inputs",
    description:
      "A conic gradient turns behind the button and is clipped to a 1px ring, so the border appears to rotate. cult-ui's BgAnimateButton, with its own gradients.",
    tag: "cult-ui",
    html: `<div class="halo-set">
  <button class="halo halo-sunrise"><span>Start a project</span></button>
  <button class="halo halo-ocean"><span>Read the brief</span></button>
  <button class="halo halo-forest"><span>See the work</span></button>
  <p class="halo-note">The ring turns; the face does not.</p>
</div>`,
    css: `.halo-set{${SURFACE}display:grid;gap:14px;place-items:center}
.halo{position:relative;padding:2px;border:0;border-radius:999px;overflow:hidden;background:#1a1f19}
.halo::before{content:'';position:absolute;inset:-60%;animation:halo-turn 4s linear infinite}
.halo-sunrise::before{background:conic-gradient(from 90deg at 50% 50%,#fe5d75 0%,#f5af19 50%,#fe5d75 100%)}
.halo-ocean::before{background:conic-gradient(from 90deg at 50% 50%,#a1c4fd 0%,#c2e9fb 50%,#a1c4fd 100%)}
.halo-forest::before{background:conic-gradient(from 90deg at 50% 50%,#85d797 0%,#1a806b 50%,#85d797 100%)}
@keyframes halo-turn{to{transform:rotate(1turn)}}
.halo span{position:relative;display:block;border-radius:999px;padding:11px 22px;font-size:14px;font-weight:600;
  color:#f2f3ed;background:#161b15;box-shadow:var(--cult-lift)}
.halo:hover span{background:#1e241c}
.halo-note{margin:2px 0 0;font-size:11px;color:#8b968b}`,
    js: "",
  },
  {
    id: "cult-family-button",
    title: "Family button",
    category: "Buttons & inputs",
    description:
      "A 64px button that expands into a 200px panel in one continuous motion, the way the Family app's compose button does. After cult-ui's FamilyButton.",
    tag: "cult-ui",
    html: `<div class="fam">
  <div class="fam-shell">
    <div class="fam-body" data-open="false">
      <div class="fam-content" aria-hidden="true">
        <p class="fam-title">Send a note</p>
        <div class="fam-rows">
          <button class="fam-row"><i>◎</i> Share the link</button>
          <button class="fam-row"><i>✉</i> Email the brief</button>
          <button class="fam-row"><i>↗</i> Open in a new tab</button>
        </div>
      </div>
      <button class="fam-toggle" aria-expanded="false" aria-label="Open actions"><span>+</span></button>
    </div>
  </div>
  <p class="fam-note">One element, two sizes.</p>
</div>`,
    css: `.fam{${SURFACE}display:grid;gap:14px;place-items:center}
.fam-shell{padding:3px;border-radius:26px;border:1px solid var(--cult-line);background:linear-gradient(180deg,#232a22,#12160f)}
.fam-body{position:relative;display:flex;align-items:flex-end;justify-content:center;width:64px;height:64px;
  border-radius:21px;border:1px solid rgba(255,255,255,.1);overflow:hidden;
  background:linear-gradient(180deg,#38402f,#1b2016);box-shadow:var(--cult-lift);
  transition:width .42s ${SPRING},height .42s ${SPRING},border-radius .42s ${SPRING}}
.fam-body[data-open=true]{width:min(200px,82vw);height:min(250px,80vh);border-radius:20px}
.fam-content{position:absolute;inset:0;padding:14px 14px 48px;text-align:left;opacity:0;
  transition:opacity .28s ease .16s;pointer-events:none}
.fam-body[data-open=true] .fam-content{opacity:1;pointer-events:auto}
.fam-title{margin:0 0 8px;font-size:12px;letter-spacing:.08em;color:#a4af9b}
.fam-rows{display:grid;gap:5px}
.fam-row{display:flex;align-items:center;gap:9px;width:100%;padding:7px 10px;font-size:12.5px;text-align:left;
  color:#f2f3ed;background:rgba(255,255,255,.05);border:1px solid var(--cult-line);border-radius:11px}
.fam-row:hover{background:rgba(255,255,255,.1)}
.fam-row i{font-style:normal;color:var(--accent)}
.fam-toggle{position:absolute;bottom:8px;width:44px;height:44px;border-radius:50%;
  border:1px solid rgba(255,255,255,.22);background:rgba(0,0,0,.45);color:#f2f3ed;
  transition:left .3s ${EASE},transform .4s ease;left:calc(50% - 22px)}
.fam-body[data-open=true] .fam-toggle{left:10px;transform:rotate(-315deg)}
.fam-toggle span{display:block;font-size:26px;line-height:1}
.fam-note{margin:0;font-size:11px;color:#8b968b}`,
    js: `const body=document.querySelector('.fam-body'),toggle=document.querySelector('.fam-toggle');
const content=document.querySelector('.fam-content');
const set=open=>{
  body.dataset.open=String(open);
  toggle.setAttribute('aria-expanded',String(open));
  toggle.setAttribute('aria-label',open?'Close actions':'Open actions');
  content.setAttribute('aria-hidden',String(!open));
};
toggle.onclick=()=>set(body.dataset.open!=='true');
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&body.dataset.open==='true'){set(false);toggle.focus()}});
// Opens itself once so a card in the gallery shows what it does without being touched.
if(!${STILL})setTimeout(()=>set(true),700);`,
  },
  {
    id: "cult-dynamic-island",
    title: "Dynamic island",
    category: "Loaders & feedback",
    description:
      "A pill that changes size and corner radius to match whatever it is currently saying. The presets keep cult-ui's own widths and radii, from the 150×44 default to the 371×210 tall state.",
    tag: "cult-ui",
    html: `<div class="di">
  <div class="di-blob" data-preset="default" role="status" aria-live="polite">
    <div class="di-slot" data-for="default"><b>Ready</b></div>
    <div class="di-slot" data-for="compact"><i class="di-dot"></i> Uploading brand.zip <b>48%</b></div>
    <div class="di-slot" data-for="long"><i class="di-wave"><s></s><s></s><s></s><s></s></i> Now playing · Studio Session 04</div>
    <div class="di-slot" data-for="tall">
      <p class="di-head">Export finished</p>
      <p class="di-sub">design-spec.zip · 4 files · 812 KB</p>
      <span class="di-cta">Open folder →</span>
    </div>
  </div>
  <div class="di-controls" role="group" aria-label="Island states">
    <button data-preset="default" aria-pressed="true">Default</button>
    <button data-preset="compact" aria-pressed="false">Compact</button>
    <button data-preset="long" aria-pressed="false">Long</button>
    <button data-preset="tall" aria-pressed="false">Tall</button>
  </div>
</div>`,
    css: `.di{${SURFACE}display:grid;gap:18px;place-items:center;width:100%;padding:0 12px}
.di-blob{position:relative;display:grid;place-items:center;overflow:hidden;background:#000;
  color:#f2f3ed;box-shadow:var(--cult-lift);width:150px;height:44px;border-radius:46px;
  transition:width .45s ${SPRING},height .45s ${SPRING},border-radius .45s ${SPRING}}
.di-blob[data-preset=compact]{width:min(235px,84vw);height:44px;border-radius:46px}
.di-blob[data-preset=long]{width:min(320px,88vw);height:60px;border-radius:42px}
.di-blob[data-preset=tall]{width:min(320px,88vw);height:160px;border-radius:26px}
.di-slot{position:absolute;display:none;align-items:center;justify-content:center;gap:9px;
  width:100%;padding:0 16px;font-size:12.5px;text-align:center;animation:di-in .36s ${EASE} both}
.di-blob[data-preset=default] .di-slot[data-for=default],
.di-blob[data-preset=compact] .di-slot[data-for=compact],
.di-blob[data-preset=long] .di-slot[data-for=long],
.di-blob[data-preset=tall] .di-slot[data-for=tall]{display:flex}
.di-slot[data-for=tall]{flex-direction:column;gap:5px}
@keyframes di-in{from{opacity:0;transform:scale(.9) translateY(6px);filter:blur(4px)}}
.di-dot{width:9px;height:9px;border-radius:50%;background:var(--accent);animation:di-pulse 1.1s ease-in-out infinite}
@keyframes di-pulse{50%{opacity:.3}}
.di-wave{display:flex;align-items:flex-end;gap:2.5px;height:16px;font-style:normal}
.di-wave s{width:3px;height:100%;border-radius:2px;background:var(--accent);
  animation:di-bar .9s ease-in-out infinite alternate;transform-origin:bottom}
.di-wave s:nth-child(2){animation-delay:.15s}
.di-wave s:nth-child(3){animation-delay:.3s}
.di-wave s:nth-child(4){animation-delay:.45s}
@keyframes di-bar{from{transform:scaleY(.25)}to{transform:scaleY(1)}}
.di-head{margin:0;font-size:15px;font-weight:600}
.di-sub{margin:0;font-size:11.5px;color:#a4af9b}
.di-cta{font-size:12px;color:var(--accent)}
.di-controls{display:flex;flex-wrap:wrap;gap:7px;justify-content:center}
.di-controls button{padding:6px 12px;font-size:11.5px;border-radius:999px;color:#cfd6cb;
  background:var(--cult-fill);border:1px solid var(--cult-line)}
.di-controls button[aria-pressed=true]{color:#10160c;background:var(--accent);border-color:transparent}`,
    js: `const blob=document.querySelector('.di-blob');
const buttons=[...document.querySelectorAll('.di-controls button')];
const show=preset=>{
  blob.dataset.preset=preset;
  for(const button of buttons)button.setAttribute('aria-pressed',String(button.dataset.preset===preset));
};
for(const button of buttons)button.onclick=()=>{show(button.dataset.preset);stop()};
// Cycles on its own so the card demonstrates itself, and stops the moment anyone
// chooses a state — including under reduced motion, where it never starts.
let timer=0;
const stop=()=>clearInterval(timer);
if(!${STILL}){
  const order=['default','compact','long','tall'];let at=0;
  timer=setInterval(()=>show(order[at=(at+1)%order.length]),2600);
  blob.addEventListener('pointerdown',stop);
}`,
  },
  {
    id: "cult-direction-aware-tabs",
    title: "Direction-aware tabs",
    category: "Layout blocks",
    description:
      "Panels enter from whichever side you came from, and the selected pill slides between tabs rather than jumping. After cult-ui's DirectionAwareTabs.",
    tag: "cult-ui",
    html: `<div class="dat">
  <div class="dat-rail" role="tablist" aria-label="Project sections">
    <span class="dat-pill" aria-hidden="true"></span>
    <button role="tab" id="dat-t1" aria-selected="true" aria-controls="dat-p1">Overview</button>
    <button role="tab" id="dat-t2" aria-selected="false" aria-controls="dat-p2" tabindex="-1">Brand</button>
    <button role="tab" id="dat-t3" aria-selected="false" aria-controls="dat-p3" tabindex="-1">Handoff</button>
  </div>
  <div class="dat-stage">
    <div class="dat-panel" id="dat-p1" role="tabpanel" aria-labelledby="dat-t1">
      <h2>Overview</h2><p>Three pages, one landing route and a contact form. Two weeks end to end.</p>
    </div>
    <div class="dat-panel" id="dat-p2" role="tabpanel" aria-labelledby="dat-t2" hidden>
      <h2>Brand</h2><p>Warm neutrals, one accent, and a grotesque set at a tight measure.</p>
    </div>
    <div class="dat-panel" id="dat-p3" role="tabpanel" aria-labelledby="dat-t3" hidden>
      <h2>Handoff</h2><p>Tokens, components and a spec the build can read without a meeting.</p>
    </div>
  </div>
</div>`,
    css: `.dat{${SURFACE}display:grid;gap:16px;width:min(90%,420px)}
.dat-rail{position:relative;display:flex;gap:4px;padding:3px;border-radius:999px;
  background:#2a302a;box-shadow:0 1px 2px rgba(0,0,0,.4) inset}
.dat-rail button{position:relative;z-index:1;flex:1;padding:7px 12px;font-size:13px;font-weight:500;
  border:0;border-radius:999px;background:none;color:#b9c2b4;transition:color .25s ease}
.dat-rail button[aria-selected=true]{color:#fff}
.dat-pill{position:absolute;top:3px;bottom:3px;left:0;width:0;border-radius:999px;
  border:1px solid rgba(255,255,255,.1);background:#3f473e;
  transition:transform .4s ${SPRING},width .4s ${SPRING}}
.dat-stage{position:relative;overflow:hidden;min-height:112px;padding:2px}
.dat-panel[hidden]{display:none}
.dat-panel h2{margin:0 0 7px;font-size:17px}
.dat-panel p{margin:0;font-size:13px;line-height:1.55;color:#b9c2b4}
.dat-panel.dat-in{animation:dat-enter .4s ${EASE} both}
@keyframes dat-enter{from{opacity:0;transform:translateX(var(--from));filter:blur(4px)}}`,
    js: `const rail=document.querySelector('.dat-rail'),pill=document.querySelector('.dat-pill');
const tabs=[...rail.querySelectorAll('[role=tab]')];
const panels=tabs.map(tab=>document.getElementById(tab.getAttribute('aria-controls')));
let current=0;
const place=()=>{
  const box=tabs[current].getBoundingClientRect(),within=rail.getBoundingClientRect();
  pill.style.width=box.width+'px';
  pill.style.transform='translateX('+(box.left-within.left-3)+'px)';
};
const select=index=>{
  // The direction is the whole point: a panel to the right of the one you left enters
  // from the right, so the strip reads as one surface rather than a set of swaps.
  const direction=index>current?1:-1;
  current=index;
  for(const[i,tab]of tabs.entries()){
    const on=i===index;
    tab.setAttribute('aria-selected',String(on));
    tab.tabIndex=on?0:-1;
    panels[i].hidden=!on;
    panels[i].classList.remove('dat-in');
  }
  place();
  if(${STILL})return;
  panels[index].style.setProperty('--from',(300*direction)+'px');
  void panels[index].offsetWidth;
  panels[index].classList.add('dat-in');
};
for(const[index,tab]of tabs.entries()){
  tab.onclick=()=>{if(index!==current)select(index)};
  tab.onkeydown=event=>{
    const step=event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0;
    if(!step)return;
    event.preventDefault();
    const next=(current+step+tabs.length)%tabs.length;
    tabs[next].focus();select(next);
  };
}
place();
addEventListener('resize',place);`,
  },
  {
    id: "cult-sortable-list",
    title: "Sortable list",
    category: "Layout blocks",
    description:
      "Drag a row by its handle and the rest move aside as you pass them. Ticking a row locks it in place, exactly as cult-ui's SortableList does.",
    tag: "cult-ui",
    html: `<div class="srt">
  <p class="srt-head">This week <span class="srt-count"></span></p>
  <ul class="srt-list">
    <li class="srt-item"><button class="srt-grip" aria-label="Reorder: Write the brief">⠿</button>
      <label><input type="checkbox"> Write the brief</label></li>
    <li class="srt-item"><button class="srt-grip" aria-label="Reorder: Pick two typefaces">⠿</button>
      <label><input type="checkbox"> Pick two typefaces</label></li>
    <li class="srt-item"><button class="srt-grip" aria-label="Reorder: Build the token set">⠿</button>
      <label><input type="checkbox"> Build the token set</label></li>
    <li class="srt-item"><button class="srt-grip" aria-label="Reorder: Send for review">⠿</button>
      <label><input type="checkbox"> Send for review</label></li>
  </ul>
  <p class="srt-note">Drag a handle, or focus one and use ↑ ↓.</p>
</div>`,
    css: `.srt{${SURFACE}display:grid;gap:10px;width:min(90%,340px)}
.srt-head{display:flex;justify-content:space-between;margin:0;font-size:11px;letter-spacing:.12em;color:#8b968b}
.srt-list{display:grid;gap:8px;margin:0;padding:0;list-style:none}
.srt-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;
  border:1px solid var(--cult-line);background:var(--cult-fill);box-shadow:var(--cult-lift);
  transition:transform .28s ${EASE},opacity .2s ease}
.srt-item.srt-lifted{position:relative;z-index:2;transition:none;cursor:grabbing;
  box-shadow:0 12px 28px rgba(0,0,0,.5);border-color:var(--accent)}
.srt-item.srt-done label{color:#71806f;text-decoration:line-through}
.srt-item.srt-done .srt-grip{opacity:.3;cursor:not-allowed}
.srt-grip{padding:0 2px;font-size:15px;line-height:1;color:#8b968b;background:none;border:0;cursor:grab;touch-action:none}
.srt-item label{display:flex;align-items:center;gap:10px;flex:1;font-size:13.5px;cursor:pointer}
.srt-item input{accent-color:var(--accent);width:15px;height:15px}
.srt-note{margin:0;font-size:11px;color:#8b968b}`,
    js: `const list=document.querySelector('.srt-list');
const count=document.querySelector('.srt-count');
const items=()=>[...list.querySelectorAll('.srt-item')];
const tally=()=>{const all=items();count.textContent=all.filter(i=>i.classList.contains('srt-done')).length+' / '+all.length};
for(const box of list.querySelectorAll('input')){
  box.onchange=()=>{box.closest('.srt-item').classList.toggle('srt-done',box.checked);tally()};
}
const move=(item,to)=>{
  const all=items(),from=all.indexOf(item);
  const target=Math.max(0,Math.min(all.length-1,to));
  if(target===from)return;
  list.insertBefore(item,target>from?all[target].nextSibling:all[target]);
};
// Pointer drag: the lifted row follows the pointer while the rows it passes shift in
// the DOM, so wherever it is dropped the order is already correct.
for(const grip of list.querySelectorAll('.srt-grip')){
  const item=grip.closest('.srt-item');
  grip.addEventListener('pointerdown',event=>{
    if(item.classList.contains('srt-done'))return;
    event.preventDefault();
    grip.setPointerCapture(event.pointerId);
    const startY=event.clientY;let offset=0;
    item.classList.add('srt-lifted');
    const onMove=moved=>{
      offset=moved.clientY-startY;
      item.style.transform='translateY('+offset+'px)';
      const box=item.getBoundingClientRect(),middle=box.top+box.height/2;
      for(const other of items()){
        if(other===item)continue;
        const theirs=other.getBoundingClientRect();
        if(middle>theirs.top&&middle<theirs.bottom)move(item,items().indexOf(other));
      }
    };
    const onUp=()=>{
      grip.removeEventListener('pointermove',onMove);
      grip.removeEventListener('pointerup',onUp);
      grip.removeEventListener('pointercancel',onUp);
      item.classList.remove('srt-lifted');
      item.style.transform='';
    };
    grip.addEventListener('pointermove',onMove);
    grip.addEventListener('pointerup',onUp);
    grip.addEventListener('pointercancel',onUp);
  });
  grip.onkeydown=event=>{
    const step=event.key==='ArrowDown'?1:event.key==='ArrowUp'?-1:0;
    if(!step||item.classList.contains('srt-done'))return;
    event.preventDefault();
    move(item,items().indexOf(item)+step);
    grip.focus();
  };
}
tally();`,
  },
  {
    id: "cult-shift-card",
    title: "Shift card",
    category: "Hover effects",
    description:
      "A card whose footer grows from a single line into a full panel, pushing its own artwork out of the way. After cult-ui's ShiftCard, with a tap fallback for touch.",
    tag: "cult-ui",
    html: `<article class="shift" tabindex="0" aria-expanded="false">
  <header class="shift-top">
    <p class="shift-eyebrow">SEASONAL</p>
    <h2>Longer light</h2>
  </header>
  <div class="shift-art" aria-hidden="true">
    <svg viewBox="0 0 200 140" role="img"><rect width="200" height="140" rx="14" fill="#2b3a2d"/>
      <circle cx="140" cy="44" r="26" fill="#d2ef9e"/>
      <path d="M0 108 Q52 58 104 96 T200 72 V140 H0Z" fill="#5d7f5a"/>
      <path d="M0 126 Q72 86 200 122 V140 H0Z" fill="#8fae7d"/></svg>
  </div>
  <div class="shift-bottom">
    <p class="shift-line">Six weeks · From £2,400 <span class="shift-chevron" aria-hidden="true">↑</span></p>
    <div class="shift-detail">
      <p>A landing page, a booking flow and the copy to fill them. Ready for the spring intake.</p>
      <ul><li>Two rounds of revisions</li><li>Analytics wired on day one</li><li>Handover in a single ZIP</li></ul>
      <button class="shift-cta">Start the brief →</button>
    </div>
  </div>
</article>`,
    css: `.shift{${SURFACE}position:relative;display:flex;flex-direction:column;
  width:min(84%,270px);height:min(290px,calc(100vh - 14px));padding:14px 14px 58px;overflow:hidden;border-radius:16px;
  border:1px solid var(--cult-line);background:var(--cult-fill);box-shadow:var(--cult-lift);
  text-align:left;cursor:pointer;transition:transform .3s ${EASE}}
.shift:hover,.shift:focus-visible{transform:scale(1.02)}
.shift-eyebrow{margin:0;font-size:9px;letter-spacing:.2em;color:#8b968b}
.shift-top h2{margin:4px 0 0;font-size:21px}
.shift-art{flex:1;min-height:0;margin:8px 0 0;transition:opacity .3s ease,transform .35s ${EASE}}
.shift-art svg{display:block;width:100%;height:100%;object-fit:cover;border-radius:12px}
.shift-bottom{position:absolute;left:14px;right:14px;bottom:14px;padding:11px 12px;border-radius:13px;
  border:1px solid var(--cult-line);background:#232a23;
  transition:max-height .34s ${EASE};max-height:40px;overflow:hidden}
.shift-line{display:flex;justify-content:space-between;margin:0;font-size:12.5px;color:#cfd6cb}
.shift-chevron{transition:transform .34s ${EASE}}
.shift-detail{padding-top:11px;font-size:12px;line-height:1.5;color:#b9c2b4}
.shift-detail p{margin:0 0 9px}
.shift-detail ul{margin:0 0 11px;padding-left:16px;display:grid;gap:4px}
.shift-cta{width:100%;padding:8px;font-size:12.5px;font-weight:600;color:#10160c;
  background:var(--accent);border:0;border-radius:9px}
.shift[aria-expanded=true] .shift-bottom{max-height:210px}
.shift[aria-expanded=true] .shift-art{opacity:0;transform:translateY(14px)}
.shift[aria-expanded=true] .shift-chevron{transform:rotate(180deg)}`,
    js: `const card=document.querySelector('.shift');
const set=open=>card.setAttribute('aria-expanded',String(open));
// Hover on a pointer, tap or Enter everywhere else: a hover-only reveal hides the
// price on every phone in the client base.
card.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')set(true)});
card.addEventListener('pointerleave',event=>{if(event.pointerType==='mouse')set(false)});
card.addEventListener('click',event=>{
  if(event.target.closest('.shift-cta'))return;
  set(card.getAttribute('aria-expanded')!=='true');
});
card.addEventListener('keydown',event=>{
  if(event.key!=='Enter'&&event.key!==' ')return;
  event.preventDefault();
  set(card.getAttribute('aria-expanded')!=='true');
});
card.addEventListener('focus',()=>set(true));
card.addEventListener('blur',()=>set(false));`,
  },
  {
    id: "cult-dock",
    title: "Magnifying dock",
    category: "Hover effects",
    description:
      "Icons swell as the pointer nears them and settle back as it leaves, keeping cult-ui's own curve: 40px to 80px across a 150px radius.",
    tag: "cult-ui",
    html: `<div class="dock-stage">
  <p class="dock-label">Move along the row</p>
  <div class="dock" role="toolbar" aria-label="Dock">
    <button class="dock-item" aria-label="Files"><span aria-hidden="true">▤</span></button>
    <button class="dock-item" aria-label="Palette"><span aria-hidden="true">◍</span></button>
    <button class="dock-item" aria-label="Type"><span aria-hidden="true">Aa</span></button>
    <button class="dock-item" aria-label="Layers"><span aria-hidden="true">◈</span></button>
    <button class="dock-item" aria-label="Export"><span aria-hidden="true">↓</span></button>
    <button class="dock-item" aria-label="Settings"><span aria-hidden="true">⚙</span></button>
  </div>
</div>`,
    css: `.dock-stage{${SURFACE}display:grid;gap:16px;place-items:center;width:100%}
.dock-label{margin:0;font-size:11px;letter-spacing:.14em;color:#8b968b}
.dock{display:flex;align-items:flex-end;gap:8px;padding:9px 12px;border-radius:20px;
  border:1px solid var(--cult-line);background:rgba(28,33,29,.85);box-shadow:var(--cult-lift)}
.dock-item{display:grid;place-items:center;width:40px;height:40px;padding:0;border-radius:12px;
  border:1px solid var(--cult-line);background:linear-gradient(180deg,#333c31,#1c2119);color:#e7ebe2;
  transition:width .18s ease-out,height .18s ease-out}
.dock-item span{font-size:calc(var(--dock-size,40px)*.4);line-height:1}
.dock-item:hover{border-color:var(--accent)}`,
    js: `const dock=document.querySelector('.dock');
const items=[...dock.querySelectorAll('.dock-item')];
const MIN=40,MAX=80,REACH=150;
const size=distance=>{
  // cult-ui maps distance to width across [-150,0,150] -> [40,80,40]; a cosine over the
  // same span gives the identical endpoints without the kink at the midpoint.
  const near=Math.max(0,1-Math.abs(distance)/REACH);
  return MIN+(MAX-MIN)*Math.cos((1-near)*Math.PI/2)**2;
};
const apply=x=>{
  for(const item of items){
    const box=item.getBoundingClientRect();
    const width=x===null?MIN:size(x-(box.left+box.width/2));
    item.style.width=item.style.height=width.toFixed(1)+'px';
    item.style.setProperty('--dock-size',width.toFixed(1)+'px');
  }
};
// Under reduced motion the row stays at rest and focus alone marks the target, which
// is what the magnification was standing in for.
if(${STILL}){apply(null)}
else{
  dock.addEventListener('pointermove',event=>apply(event.clientX));
  dock.addEventListener('pointerleave',()=>apply(null));
  for(const item of items){
    item.addEventListener('focus',()=>{const box=item.getBoundingClientRect();apply(box.left+box.width/2)});
    item.addEventListener('blur',()=>apply(null));
  }
  apply(null);
}`,
  },
];
