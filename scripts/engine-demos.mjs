/**
 * The runtime source for every authored demo that drives a real third-party engine.
 *
 * Separate from the build script so it can be imported without building — a test holds
 * these ids and root selectors against the element catalogue, since a demo whose root
 * does not match its element's HTML fails silently and looks like a dead card.
 *
 * Each demo's source runs with `root` already bound to its root element, inside a
 * function, so `return` is an early exit and nothing leaks between demos.
 */

/** Every demo honours the OS setting the same way: same expression, one place. */
const REDUCED = `matchMedia('(prefers-reduced-motion:reduce)').matches`;

export const ENGINES = {
  motion: {
    imports: `import {animate,inView,scroll,stagger} from 'motion';`,
    demos: [
      {
        id: 'motion-spring',
        root: '.spring-stage',
        source: `const ball=root.querySelector('.spring-ball');let animation;
root.onclick=e=>{const r=root.getBoundingClientRect();animation?.stop();
const x=Math.max(0,Math.min(r.width-82,(e.detail===0?r.width/2:e.clientX-r.left)-51)),y=Math.max(0,Math.min(r.height-82,(e.detail===0?r.height/2:e.clientY-r.top)-51));
if(${REDUCED}){ball.style.transform='translate('+x+'px,'+y+'px)';return}
animation=animate(ball,{x,y},{type:'spring',stiffness:180,damping:12})};
ball.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();root.click()}};`,
      },
      {
        id: 'motion-stagger',
        root: '.stagger-line',
        source: `const words=[...root.querySelectorAll('.stagger-word')];
const play=()=>{if(${REDUCED}){for(const word of words)word.style.cssText='opacity:1;transform:none;filter:none';return}
animate(words,{opacity:[0,1],y:[28,0],filter:['blur(10px)','blur(0px)']},
  {type:'spring',stiffness:200,damping:20,delay:stagger(0.07)})};
root.querySelector('.replay').onclick=play;play();`,
      },
      {
        id: 'motion-scroll-track',
        root: '.mscroll',
        source: `const viewport=root.querySelector('.mscroll-viewport');
const bar=root.querySelector('.mscroll-bar i'),pct=root.querySelector('.mscroll-pct');
const layers=[...root.querySelectorAll('.mscroll-layer')];
scroll(progress=>{bar.style.transform='scaleX('+progress+')';pct.textContent=Math.round(progress*100)+'%';},{source:viewport});
if(${REDUCED})return;
for(const[index,layer]of layers.entries())
  scroll(animate(layer,{y:[0,-30-index*50]},{ease:'linear'}),{source:viewport});`,
      },
      {
        id: 'motion-inview',
        root: '.minview',
        source: `if(${REDUCED})return;
for(const card of root.querySelectorAll('.minview-card')){
  card.style.opacity='0';
  inView(card,element=>{
    animate(element,{opacity:[0,1],y:[36,0],scale:[0.95,1]},{type:'spring',stiffness:150,damping:20});
    return()=>animate(element,{opacity:0,y:36,scale:0.95},{duration:0.3});
  },{root:root.querySelector('.minview-viewport'),amount:0.6});
}`,
      },
      {
        id: 'motion-drag-deck',
        root: '.deck',
        source: `const cards=[...root.querySelectorAll('.deck-card')],note=root.querySelector('.deck-note');
let top=cards.length;
for(const card of cards){
  let pointer=null,origin={x:0,y:0},at={x:0,y:0};
  card.addEventListener('pointerdown',event=>{
    if(pointer!==null)return;
    pointer=event.pointerId;card.setPointerCapture(pointer);
    origin={x:event.clientX-at.x,y:event.clientY-at.y};
    card.style.cursor='grabbing';card.style.zIndex=String(++top);
  });
  card.addEventListener('pointermove',event=>{
    if(event.pointerId!==pointer)return;
    at={x:event.clientX-origin.x,y:event.clientY-origin.y};
    card.style.transform='translate('+at.x+'px,'+at.y+'px) rotate('+at.x/24+'deg)';
  });
  const release=event=>{
    if(event.pointerId!==pointer)return;
    pointer=null;card.style.cursor='grab';
    note.textContent=Math.hypot(at.x,at.y)>90?'Let go, and it springs home.':'Drag a card anywhere.';
    at={x:0,y:0};
    if(${REDUCED}){card.style.transform='none';return}
    animate(card,{x:0,y:0,rotate:0},{type:'spring',stiffness:250,damping:17});
  };
  card.addEventListener('pointerup',release);
  card.addEventListener('pointercancel',release);
}`,
      },
      {
        id: 'motion-tab-slider',
        root: '.mtabs',
        source: `const row=root.querySelector('.mtabs-row'),glider=root.querySelector('.mtabs-glider'),panel=root.querySelector('.mtabs-panel');
const tabs=[...root.querySelectorAll('[role=tab]')];
const select=(tab,animated=true)=>{
  for(const other of tabs){const on=other===tab;other.setAttribute('aria-selected',String(on));other.tabIndex=on?0:-1;}
  const box=tab.getBoundingClientRect(),within=row.getBoundingClientRect();
  const to={x:box.left-within.left,width:box.width};
  if(${REDUCED}||!animated){glider.style.transform='translateX('+to.x+'px)';glider.style.width=to.width+'px';}
  else animate(glider,to,{type:'spring',stiffness:420,damping:34});
  panel.textContent=tab.dataset.panel;
  if(${REDUCED}||!animated)return;
  animate(panel,{opacity:[0,1],y:[8,0]},{duration:0.3});
};
for(const[index,tab]of tabs.entries()){
  tab.onclick=()=>select(tab);
  tab.onkeydown=event=>{
    const step=event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0;
    if(!step)return;
    event.preventDefault();
    const next=tabs[(index+step+tabs.length)%tabs.length];
    next.focus();select(next);
  };
}
const current=()=>tabs.find(tab=>tab.getAttribute('aria-selected')==='true')??tabs[0];
select(current(),false);
addEventListener('resize',()=>select(current(),false));`,
      },
      {
        id: 'motion-counter',
        root: '.mcount',
        source: `const figures=[...root.querySelectorAll('[data-to]')];
const play=()=>{
  for(const figure of figures){
    const to=Number(figure.dataset.to),suffix=figure.dataset.suffix??'';
    const write=value=>{figure.textContent=(to%1?value.toFixed(1):Math.round(value).toLocaleString('en-GB'))+suffix;};
    if(${REDUCED}){write(to);continue}
    animate(0,to,{duration:1.6,ease:[0.16,1,0.3,1],onUpdate:write});
  }
};
root.querySelector('.replay').onclick=play;play();`,
      },
    ],
  },

  lenis: {
    imports: `import Lenis from 'lenis';`,
    demos: [
      {
        id: 'lenis-scroll',
        root: '.smooth-scroll-window',
        source: `if(${REDUCED})return;
const instance=new Lenis({wrapper:root,content:root.querySelector('.smooth-scroll-content'),autoRaf:true});
document.addEventListener('visibilitychange',()=>document.hidden?instance.stop():instance.start());
addEventListener('pagehide',()=>instance.destroy());`,
      },
      {
        id: 'lenis-velocity',
        root: '.lvel',
        source: `const readout=root.querySelector('.lvel-readout'),rows=[...root.querySelectorAll('.lvel-row')];
if(${REDUCED}){readout.textContent='Reduced motion · native scrolling';return}
const instance=new Lenis({wrapper:root,content:root.querySelector('.lvel-content'),autoRaf:true});
instance.on('scroll',({velocity})=>{
  const skew=Math.max(-8,Math.min(8,velocity*0.45));
  for(const row of rows)row.style.transform='skewY('+skew.toFixed(2)+'deg)';
  readout.textContent=Math.abs(velocity)<0.05?'At rest':Math.abs(velocity).toFixed(1)+' px/frame';
});
addEventListener('pagehide',()=>instance.destroy());`,
      },
      {
        id: 'lenis-anchor',
        root: '.lanchor',
        source: `const viewport=root.querySelector('.lanchor-viewport');
const links=[...root.querySelectorAll('.lanchor-nav a')];
const sections=[...root.querySelectorAll('.lanchor-section')];
const mark=id=>{for(const link of links)link.setAttribute('aria-current',link.hash==='#'+id?'true':'false');};
const instance=${REDUCED}?null:new Lenis({wrapper:viewport,content:root.querySelector('.lanchor-content'),autoRaf:true});
for(const link of links)link.onclick=event=>{
  event.preventDefault();
  const target=root.querySelector(link.hash);
  if(!target)return;
  mark(link.hash.slice(1));
  if(instance)instance.scrollTo(target,{offset:-10,duration:1.1});
  else target.scrollIntoView({block:'start'});
};
const spy=new IntersectionObserver(entries=>{
  for(const entry of entries)if(entry.isIntersecting)mark(entry.target.id);
},{root:viewport,rootMargin:'-45% 0px -45% 0px'});
for(const section of sections)spy.observe(section);
addEventListener('pagehide',()=>instance?.destroy());`,
      },
    ],
  },

  vanta: {
    imports: `import * as THREE from 'three';
import NET from 'vanta/dist/vanta.net.min.js';
import WAVES from 'vanta/dist/vanta.waves.min.js';
import GLOBE from 'vanta/dist/vanta.globe.min.js';
import FOG from 'vanta/dist/vanta.fog.min.js';`,
    /**
     * Vanta effects differ only in which constructor they call, so the parts that
     * matter — the reduced-motion opt-out, the WebGL check, the teardown and the
     * honest status line — are written once here rather than four times.
     */
    helpers: `const start=(effect,options)=>{
  const status=root.querySelector('.engine-status');
  if(${REDUCED}){if(status)status.textContent='Reduced motion · static scene';return}
  try{
    const instance=effect({el:root,THREE,scale:2,scaleMobile:2,...options});
    if(!instance.renderer)throw Error('WebGL unavailable');
    addEventListener('pagehide',()=>instance.destroy());
  }catch{if(status)status.textContent='WebGL unavailable here · static scene shown'}
};`,
    demos: [
      { id: 'vanta-net', root: '#vanta-scene', source: `start(NET,{color:0xd2ef9e,backgroundColor:0x111412,points:7,maxDistance:19,spacing:17});` },
      { id: 'vanta-waves', root: '#vanta-waves', source: `start(WAVES,{color:0x24422c,shininess:38,waveHeight:16,waveSpeed:0.75,zoom:0.92});` },
      { id: 'vanta-globe', root: '#vanta-globe', source: `start(GLOBE,{color:0xd2ef9e,color2:0x7fa563,backgroundColor:0x111412,size:0.9});` },
      { id: 'vanta-fog', root: '#vanta-fog', source: `start(FOG,{highlightColor:0xd2ef9e,midtoneColor:0x4c7a3f,lowlightColor:0x1d3326,baseColor:0x111412,blurFactor:0.62,speed:1.1,zoom:0.8});` },
    ],
  },
};

/** Flat {id, engine, root} for anything that needs to reason about demos, like tests. */
export const ENGINE_DEMO_LIST = Object.entries(ENGINES).flatMap(([engine, { demos }]) =>
  demos.map(({ id, root }) => ({ id, engine, root })),
);
