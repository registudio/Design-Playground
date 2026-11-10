/**
 * GradFlow (https://gradflow.meerbahadin.dev), by Meer Bahadin: twenty animated WebGL
 * gradients drawn by one fragment shader, MIT licensed.
 *
 * The shader, the type numbers, the default config and the twenty-two presets run here as
 * published, vendored unchanged in vendor/gradflow and generated into gradflow-source.ts,
 * so these are credited as GradFlow's own component, as the Ship Notes ones are. What is
 * rebuilt is the React side: GradFlow's renderer and its `useWebGLRenderer` hook become
 * the plain script below, line for line in what they do. That is the speed-integrated
 * clock (so changing speed never makes the pattern jump), the 700ms blend between
 * configs and between types, the pointer lens that trails the cursor, and a single still
 * frame when paused, out of view, on a hidden tab or under reduced motion.
 *
 * One element per gradient type, each opening on GradFlow's own look for it: the library
 * default for aurora, else the first preset of that type, else the default colours. Every
 * element carries the controls of GradFlow's playground (type, the three colours, speed,
 * scale, noise, follow the pointer, pause and the presets, with the same ranges) and
 * shows the `<GradFlow>` code for what is on screen.
 */
import type { BrowseCategory } from "./taxonomy";
import {
  GRADFLOW_DEFAULT_CONFIG,
  GRADFLOW_FRAGMENT_SHADER,
  GRADFLOW_NOTICE,
  GRADFLOW_PRESETS,
  GRADFLOW_TYPE_NUMBER,
  GRADFLOW_VERTEX_SHADER,
} from "./gradflow-source";

interface GradFlowElement {
  id: string;
  title: string;
  category: BrowseCategory;
  description: string;
  tag: string;
  html: string;
  css: string;
  js: string;
}

type GradientType = keyof typeof GRADFLOW_TYPE_NUMBER;
type Config = { color1: { r: number; g: number; b: number }; color2: { r: number; g: number; b: number }; color3: { r: number; g: number; b: number }; speed: number; scale: number; type: string; noise: number };

/** What each type draws, written from its shader and checked against a render. */
const DESCRIBE: Record<GradientType, string> = {
  linear: "A smooth three-colour linear blend, top to bottom, that breathes slowly.",
  conic: "Colour swept round a centre like a slowly turning colour wheel.",
  animated: "Three colours flowing into one another in soft, drifting folds.",
  wave: "Bands of colour rolling past in long, layered waves.",
  silk: "Folds of light sliding over each other like lit silk.",
  smoke: "Colour curling through itself like slow smoke.",
  stripe: "Broad ribbons of colour sweeping diagonally across, bending as they move.",
  mesh: "A soft mesh gradient: pools of colour blending and drifting apart.",
  aurora: "Curtains of light hanging and shifting over a dark sky.",
  eclipse: "A glowing ring around a dark disc, its corona flickering.",
  caustics: "Light rippling across the floor of a pool, cells of brightness forming and breaking.",
  nebula: "Clouds of coloured gas glowing across deep space.",
  rays: "Shafts of light fanning down through the dark.",
  topo: "Contour lines of a moving terrain, like a living topographic map.",
  glass: "Colour seen through ribbed glass, split into vertical reeds.",
  fold: "Glowing folds curving across the dark, like light bent through ribbons.",
  halftone: "A printed halftone: dots of colour swelling and shrinking across the page.",
  prism: "Light split into soft bands of colour, as through the edge of a prism.",
  dunes: "Ridges of sand rolling to a horizon under a warm sky.",
  horizon: "A glowing horizon line where light meets the dark.",
};

/** GradFlow's own opening look for a type: the default, a preset of that type, or the default colours. */
function startConfig(type: GradientType): { config: Config; preset: string | null } {
  if (GRADFLOW_DEFAULT_CONFIG.type === type) return { config: { ...GRADFLOW_DEFAULT_CONFIG }, preset: null };
  const preset = (Object.keys(GRADFLOW_PRESETS) as (keyof typeof GRADFLOW_PRESETS)[]).find(name => GRADFLOW_PRESETS[name].type === type);
  if (preset) return { config: { ...GRADFLOW_PRESETS[preset] }, preset };
  return { config: { ...GRADFLOW_DEFAULT_CONFIG, type }, preset: null };
}

const label = (type: string) => type[0].toUpperCase() + type.slice(1);

const SLIDERS_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>`;

const HTML = (type: GradientType) => `<div class="gf"><canvas class="gf-canvas" role="img" aria-label="GradFlow ${label(type).toLowerCase()} gradient, animated"></canvas>
<p class="gf-name"><span>GradFlow</span> · <b class="gf-type">${label(type)}</b><span class="gf-preset"></span></p>
<button type="button" class="gf-open" aria-expanded="false" aria-controls="gf-panel">${SLIDERS_ICON}<span>Adjust</span></button>
<aside class="gf-panel" id="gf-panel" aria-label="Gradient settings" hidden>
<div class="gf-row"><label for="gf-type-select">Type</label><select id="gf-type-select" class="gf-select"></select></div>
<div class="gf-group" role="group" aria-label="Colours">${[1, 2, 3].map(i => `<label class="gf-color"><input type="color" data-color="color${i}"><span>Color ${i}</span><code></code></label>`).join("")}</div>
${[["speed", "Speed", 0, 3, 0.1], ["scale", "Scale", 0.5, 3, 0.1], ["noise", "Noise", 0, 0.5, 0.01]].map(([key, name, min, max, step]) => `<div class="gf-range"><label for="gf-${key}">${name}</label><output for="gf-${key}" data-out="${key}"></output><input type="range" id="gf-${key}" data-key="${key}" min="${min}" max="${max}" step="${step}"></div>`).join("")}
<label class="gf-switch"><input type="checkbox" class="gf-follow" checked><span>Follow the pointer</span></label>
<label class="gf-switch"><input type="checkbox" class="gf-pause"><span>Pause</span></label>
<div class="gf-presets-head">Presets</div><div class="gf-presets" role="group" aria-label="Presets"></div>
<div class="gf-actions"><button type="button" class="gf-reset">Reset</button><button type="button" class="gf-copy">Copy code</button></div>
<pre class="gf-code" aria-label="Code for this gradient"></pre><p class="gf-sr" aria-live="polite"></p>
</aside></div>`;

const CSS = `body{display:block!important;background:#000}
.gf{position:fixed;inset:0;overflow:hidden;background:#000;color:#fff;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
.gf-canvas{display:block;width:100%;height:100%;user-select:none;touch-action:none}
.gf-name{position:absolute;left:12px;bottom:12px;margin:0;padding:5px 9px;border-radius:999px;background:rgba(10,10,14,.38);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);font:500 11px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.78);text-shadow:0 1px 6px rgba(0,0,0,.35);pointer-events:none}
.gf-name b{font-weight:600;color:#fff}.gf-preset:not(:empty)::before{content:" · "}
.gf-open{position:absolute;top:12px;right:12px;z-index:2;display:flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:999px;border:1px solid rgba(255,255,255,.22);background:rgba(10,10,14,.38);color:#fff;font-size:12px;font-weight:600;-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);cursor:pointer}
.gf-open:hover{background:rgba(10,10,14,.55)}.gf-open:focus-visible,.gf-panel :focus-visible{outline:2px solid #fff;outline-offset:2px}
.gf-panel{position:absolute;top:52px;right:12px;bottom:12px;z-index:2;width:min(272px,calc(100% - 24px));overflow-y:auto;overscroll-behavior:contain;display:grid;align-content:start;gap:12px;padding:14px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:rgba(10,10,14,.74);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);font-size:12px;scrollbar-width:thin}
.gf-panel[hidden]{display:none}
.gf-row{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:10px}
.gf-row label,.gf-range label,.gf-presets-head{font:500 10px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.6)}
.gf-select{height:30px;padding:0 8px;border-radius:8px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);color:#fff;font:inherit}.gf-select option{color:#000}
.gf-group{display:grid;gap:6px}
.gf-color{display:grid;grid-template-columns:28px 1fr auto;align-items:center;gap:8px;cursor:pointer}
.gf-color input{width:28px;height:22px;padding:0;border:1px solid rgba(255,255,255,.25);border-radius:6px;background:none;cursor:pointer}
.gf-color input::-webkit-color-swatch-wrapper{padding:0}.gf-color input::-webkit-color-swatch{border:0;border-radius:5px}
.gf-color code{font:11px ui-monospace,SFMono-Regular,Menlo,monospace;color:rgba(255,255,255,.65)}
.gf-range{display:grid;grid-template-columns:1fr auto;gap:4px 8px}.gf-range input{grid-column:1/-1;width:100%;accent-color:#fff}
.gf-range output{font:11px ui-monospace,SFMono-Regular,Menlo,monospace;color:#fff}
.gf-switch{display:flex;align-items:center;gap:8px;cursor:pointer}.gf-switch input{accent-color:#fff}
.gf-presets{display:grid;grid-template-columns:repeat(auto-fill,minmax(52px,1fr));gap:6px}
.gf-presets button{display:grid;gap:3px;padding:4px;border-radius:8px;border:1px solid transparent;background:rgba(255,255,255,.06);color:rgba(255,255,255,.75);font-size:9.5px;cursor:pointer}
.gf-presets button[aria-pressed=true]{border-color:#fff;color:#fff}.gf-presets button:hover{background:rgba(255,255,255,.12)}
.gf-swatch{display:flex;height:16px;border-radius:4px;overflow:hidden}.gf-swatch i{flex:1}
.gf-actions{display:flex;gap:6px}.gf-actions button{flex:1;height:30px;border-radius:8px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);color:#fff;font-size:12px;font-weight:600;cursor:pointer}
.gf-actions button:hover{background:rgba(255,255,255,.16)}
.gf-code{margin:0;padding:10px;border-radius:8px;background:rgba(0,0,0,.45);font:10.5px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;color:rgba(255,255,255,.85);white-space:pre;overflow-x:auto;user-select:text}
.gf-sr{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0)}`;

/** GradFlow's renderer and hook, as plain script. */
const RUNTIME = `${GRADFLOW_NOTICE}
;(function(){
var VERTEX_SHADER=${JSON.stringify(GRADFLOW_VERTEX_SHADER)},FRAGMENT_SHADER=${JSON.stringify(GRADFLOW_FRAGMENT_SHADER)};
var TYPES=${JSON.stringify(GRADFLOW_TYPE_NUMBER)},PRESETS=${JSON.stringify(GRADFLOW_PRESETS)},START=window.GRADFLOW_START,TRANSITION=700;
var hexToRgb=function(h){var v=parseInt(h.slice(1),16);return{r:(v>>16)&255,g:(v>>8)&255,b:v&255}};
var rgbToHex=function(c){return '#'+[c.r,c.g,c.b].map(function(v){return Math.round(v).toString(16).padStart(2,'0')}).join('')};
var norm=function(c){return[c.r/255,c.g/255,c.b/255]};
var clone=function(c){return JSON.parse(JSON.stringify(c))};
var lerp=function(a,b,k){return a+(b-a)*k},lerp3=function(a,b,k){return[lerp(a[0],b[0],k),lerp(a[1],b[1],k),lerp(a[2],b[2],k)]};
var toBlend=function(c){return{color1:norm(c.color1),color2:norm(c.color2),color3:norm(c.color3),speed:c.speed,scale:c.scale,noise:c.noise}};
var same3=function(a,b){return a[0]===b[0]&&a[1]===b[1]&&a[2]===b[2]};
var sameBlend=function(a,b){return same3(a.color1,b.color1)&&same3(a.color2,b.color2)&&same3(a.color3,b.color3)&&a.speed===b.speed&&a.scale===b.scale&&a.noise===b.noise};
var typeNumber=function(c){return TYPES[c.type]!==undefined?TYPES[c.type]:TYPES.animated};

/* The renderer: one program, one full-screen triangle. */
var canvas=document.querySelector('.gf-canvas');
var gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'high-performance'});
var program=null,locations=null,NAMES=['u_time','u_time2','u_color1','u_color2','u_color3','u_scale','u_type','u_prevType','u_mix','u_noise','u_resolution','u_pointer'];
var compile=function(type,src){var s=gl.createShader(type);if(!s)return null;gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){if(!gl.isContextLost())console.error('gradflow: shader failed to compile',gl.getShaderInfoLog(s));gl.deleteShader(s);return null}return s};
var setup=function(){var v=compile(gl.VERTEX_SHADER,VERTEX_SHADER),f=compile(gl.FRAGMENT_SHADER,FRAGMENT_SHADER),p=gl.createProgram();if(!v||!f||!p)return;
gl.attachShader(p,v);gl.attachShader(p,f);gl.bindAttribLocation(p,0,'position');gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);
if(!gl.getProgramParameter(p,gl.LINK_STATUS)){if(!gl.isContextLost())console.error('gradflow: program failed to link',gl.getProgramInfoLog(p));gl.deleteProgram(p);return}
program=p;var buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
gl.useProgram(program);locations={};NAMES.forEach(function(n){locations[n]=gl.getUniformLocation(program,n)})};
var draw=function(u,w,h,cw,ch){if(!program||!locations)return;gl.viewport(0,0,w,h);gl.uniform1f(locations.u_time,u.time);gl.uniform1f(locations.u_time2,u.time2);
gl.uniform3fv(locations.u_color1,u.color1);gl.uniform3fv(locations.u_color2,u.color2);gl.uniform3fv(locations.u_color3,u.color3);gl.uniform1f(locations.u_scale,u.scale);
gl.uniform1i(locations.u_type,u.type);gl.uniform1i(locations.u_prevType,u.prevType);gl.uniform1f(locations.u_mix,u.mix);gl.uniform1f(locations.u_noise,u.noise);
gl.uniform2f(locations.u_resolution,cw,ch);gl.uniform3fv(locations.u_pointer,u.pointer);gl.drawArrays(gl.TRIANGLES,0,3)};

/* The hook: blends, the speed-integrated clock, the trailing lens, and when to animate. */
var config=clone(START),paused=false,interactive=true;
var size={width:1,height:1,cssWidth:1,cssHeight:1},current=toBlend(config),from=current,to=current,blendStart=0,blendDuration=0;
var uniforms={time:0,time2:0,color1:current.color1,color2:current.color2,color3:current.color3,scale:current.scale,noise:current.noise,type:typeNumber(config),prevType:typeNumber(config),mix:1,pointer:[0.5,0.5,0]};
var pointerTarget=[0.5,0.5,0],rafId=0,lastFrameTime=null;
var reducedQuery=matchMedia('(prefers-reduced-motion: reduce)'),visibility={inView:true,pageVisible:!document.hidden,reducedMotion:reducedQuery.matches};
var renderFrame=function(){uniforms.color1=current.color1;uniforms.color2=current.color2;uniforms.color3=current.color3;uniforms.scale=current.scale;uniforms.noise=current.noise;draw(uniforms,size.width,size.height,size.cssWidth,size.cssHeight)};
var handleResize=function(){var parent=canvas.parentElement,w=parent.clientWidth,h=parent.clientHeight,dpr=Math.min(devicePixelRatio,2);
size.cssWidth=Math.max(w,1);size.cssHeight=Math.max(h,1);size.width=Math.max(Math.round(w*dpr),1);size.height=Math.max(Math.round(h*dpr),1);
canvas.width=size.width;canvas.height=size.height;canvas.style.width=w+'px';canvas.style.height=h+'px';renderFrame()};
var finishBlend=function(){blendStart=0;current=to;uniforms.mix=1;uniforms.prevType=uniforms.type};
var animate=function(now){var dt=lastFrameTime===null?0:Math.min((now-lastFrameTime)/1000,0.1);lastFrameTime=now;
if(blendStart){var k=Math.min((now-blendStart)/blendDuration,1),e=k*k*(3-2*k);
current={color1:lerp3(from.color1,to.color1,e),color2:lerp3(from.color2,to.color2,e),color3:lerp3(from.color3,to.color3,e),speed:lerp(from.speed,to.speed,e),scale:lerp(from.scale,to.scale,e),noise:lerp(from.noise,to.noise,e)};
if(uniforms.prevType!==uniforms.type)uniforms.mix=k;if(k>=1)finishBlend()}
uniforms.time+=dt*current.speed;uniforms.time2+=dt*current.speed*current.speed;
uniforms.pointer=lerp3(uniforms.pointer,pointerTarget,1-Math.exp(-dt*6));renderFrame();rafId=requestAnimationFrame(animate)};
var sync=function(){var run=!paused&&!visibility.reducedMotion&&visibility.inView&&visibility.pageVisible;
if(run&&!rafId){lastFrameTime=null;rafId=requestAnimationFrame(animate)}else if(!run&&rafId){cancelAnimationFrame(rafId);rafId=0;if(blendStart){finishBlend();renderFrame()}}};
var setConfig=function(next){var nextType=typeNumber(next),target=toBlend(next);if(nextType===uniforms.type&&sameBlend(target,to))return;to=target;
if(!rafId||TRANSITION<=0){uniforms.type=nextType;finishBlend();renderFrame();return}
from=current;blendStart=performance.now();blendDuration=TRANSITION;if(nextType!==uniforms.type){uniforms.prevType=uniforms.type;uniforms.type=nextType;uniforms.mix=0}};
if(gl){setup();canvas.addEventListener('webglcontextlost',function(e){e.preventDefault();program=null;locations=null});canvas.addEventListener('webglcontextrestored',function(){setup();requestAnimationFrame(renderFrame)});
new ResizeObserver(handleResize).observe(canvas.parentElement);handleResize();
new IntersectionObserver(function(entries){visibility.inView=entries[0].isIntersecting;sync()}).observe(canvas);
document.addEventListener('visibilitychange',function(){visibility.pageVisible=!document.hidden;sync()});
reducedQuery.addEventListener('change',function(){visibility.reducedMotion=reducedQuery.matches;sync()});sync()}
else canvas.setAttribute('aria-label','This gradient needs WebGL, which is not available here.');
addEventListener('pointermove',function(e){if(!interactive)return;var r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;var x=(e.clientX-r.left)/r.width,y=1-(e.clientY-r.top)/r.height;
pointerTarget[0]=x;pointerTarget[1]=y;pointerTarget[2]=x>=0&&x<=1&&y>=0&&y<=1?1:0},{passive:true});
document.addEventListener('pointerleave',function(){pointerTarget[0]=0.5;pointerTarget[1]=0.5;pointerTarget[2]=0});

/* The playground's controls. */
var $=function(s){return document.querySelector(s)},panel=$('.gf-panel'),open=$('.gf-open'),select=$('.gf-select'),presetBox=$('.gf-presets'),code=$('.gf-code'),say=$('.gf-sr');
Object.keys(TYPES).forEach(function(t){var o=document.createElement('option');o.value=t;o.textContent=t[0].toUpperCase()+t.slice(1);select.appendChild(o)});
Object.keys(PRESETS).forEach(function(name){var p=PRESETS[name],b=document.createElement('button');b.type='button';b.dataset.preset=name;b.title=name+' · '+p.type;
b.setAttribute('aria-label',name+' preset, '+p.type);b.innerHTML='<span class="gf-swatch">'+['color1','color2','color3'].map(function(k){return '<i style="background:'+rgbToHex(p[k])+'"></i>'}).join('')+'</span>'+name;
b.addEventListener('click',function(){apply(clone(p));say.textContent=name+' preset'});presetBox.appendChild(b)});
var activePreset=function(){return Object.keys(PRESETS).find(function(n){var p=PRESETS[n];return p.type===config.type&&['color1','color2','color3'].every(function(k){return rgbToHex(p[k])===rgbToHex(config[k])})})||''};
var toCode=function(){var lines=["import { GradFlow } from 'gradflow'",'','<GradFlow','  config={{',"    type: '"+config.type+"',"];
['color1','color2','color3'].forEach(function(k){lines.push('    '+k+": '"+rgbToHex(config[k])+"',")});lines.push('    speed: '+config.speed+',','    scale: '+config.scale+',','    noise: '+config.noise+',','  }}');
if(interactive)lines.push('  interactive');lines.push('/>');return lines.join('\\n')};
var paint=function(){select.value=config.type;document.querySelectorAll('[data-color]').forEach(function(i){var hex=rgbToHex(config[i.dataset.color]);i.value=hex;i.parentElement.querySelector('code').textContent=hex});
document.querySelectorAll('[data-key]').forEach(function(i){i.value=String(config[i.dataset.key]);document.querySelector('[data-out='+i.dataset.key+']').textContent=Number(config[i.dataset.key]).toFixed(i.dataset.key==='noise'?2:1)});
var ap=activePreset();presetBox.querySelectorAll('button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.preset===ap))});
$('.gf-type').textContent=config.type[0].toUpperCase()+config.type.slice(1);$('.gf-preset').textContent=ap;code.textContent=toCode()};
var apply=function(next){config=next;if(gl)setConfig(config);paint()};
select.addEventListener('change',function(){var n=clone(config);n.type=select.value;apply(n)});
document.querySelectorAll('[data-color]').forEach(function(i){i.addEventListener('input',function(){var n=clone(config);n[i.dataset.color]=hexToRgb(i.value);apply(n)})});
document.querySelectorAll('[data-key]').forEach(function(i){i.addEventListener('input',function(){var n=clone(config);n[i.dataset.key]=Number(i.value);apply(n)})});
$('.gf-follow').addEventListener('change',function(e){interactive=e.target.checked;if(!interactive){pointerTarget[2]=0}paint()});
$('.gf-pause').addEventListener('change',function(e){paused=e.target.checked;sync()});
$('.gf-reset').addEventListener('click',function(){apply(clone(START));say.textContent='Reset'});
$('.gf-copy').addEventListener('click',function(){var text=toCode(),done=function(ok){say.textContent=ok?'Code copied':'Select the code below to copy it';$('.gf-copy').textContent=ok?'Copied':'Copy code';setTimeout(function(){$('.gf-copy').textContent='Copy code'},1400)};
if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(function(){done(true)},function(){done(false)});else done(false)});
var toggle=function(show){panel.hidden=!show;open.setAttribute('aria-expanded',String(show))};
open.addEventListener('click',function(){toggle(panel.hidden)});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!panel.hidden){toggle(false);open.focus()}});
/* Open from the start when the frame has room for the panel and the gradient beside it. */
toggle(innerWidth>=720&&innerHeight>=480);paint();
})();`;

export const GRADFLOW_ELEMENTS: GradFlowElement[] = (Object.keys(GRADFLOW_TYPE_NUMBER) as GradientType[]).map(type => {
  const { config, preset } = startConfig(type);
  return {
    id: `gradflow-${type}`,
    title: `${label(type)} gradient`,
    category: "Backgrounds",
    description: `${DESCRIBE[type]} One of GradFlow's twenty WebGL gradients, opening on ${preset ? `its "${preset}" preset` : "its default colours"}: adjust the type, colours, speed, scale and grain, let it follow the pointer, or try any of the twenty-two presets, and copy the code.`,
    tag: "GradFlow",
    html: HTML(type),
    css: CSS,
    js: `window.GRADFLOW_START=${JSON.stringify(config)};\n${RUNTIME}`,
  };
});
