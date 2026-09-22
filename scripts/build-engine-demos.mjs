import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
await mkdir('public/engine-demos', { recursive: true });
const entries = {
  motion: `import {animate} from 'motion';const stage=document.querySelector('.spring-stage'),ball=document.querySelector('.spring-ball');let animation;stage.onclick=e=>{const r=stage.getBoundingClientRect();animation?.stop();const x=Math.max(0,Math.min(r.width-82,(e.detail===0?r.width/2:e.clientX-r.left)-51)),y=Math.max(0,Math.min(r.height-82,(e.detail===0?r.height/2:e.clientY-r.top)-51));if(matchMedia('(prefers-reduced-motion:reduce)').matches){ball.style.transform='translate('+x+'px,'+y+'px)';return}animation=animate(ball,{x,y},{type:'spring',stiffness:180,damping:12})};ball.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();stage.click()}};`,
  lenis: `import Lenis from 'lenis';if(!matchMedia('(prefers-reduced-motion:reduce)').matches){const instance=new Lenis({wrapper:document.querySelector('.smooth-scroll-window'),content:document.querySelector('.smooth-scroll-content'),autoRaf:true});document.addEventListener('visibilitychange',()=>document.hidden?instance.stop():instance.start());addEventListener('pagehide',()=>instance.destroy())}`,
  vanta: `import * as THREE from 'three';import NET from 'vanta/dist/vanta.net.min.js';const status=document.querySelector('.engine-status');if(!matchMedia('(prefers-reduced-motion:reduce)').matches){try{const effect=NET({el:'#vanta-scene',THREE,color:0xd2ef9e,backgroundColor:0x111412,points:7,maxDistance:19,spacing:17,scale:2,scaleMobile:2});if(!effect.renderer)throw Error('WebGL unavailable');addEventListener('pagehide',()=>effect.destroy())}catch(e){status.textContent='WebGL unavailable on this device — static scene shown.'}}else status.textContent='Reduced motion — static scene';`,
};
for (const [name, contents] of Object.entries(entries)) {
  await build({ stdin:{contents,resolveDir:process.cwd()},bundle:true,format:'iife',minify:true,legalComments:'eof',outfile:`public/engine-demos/${name}.js` });
}
const notices = await Promise.all(['motion','lenis','vanta','three'].map(async name => {
  for(const filename of ['LICENSE','LICENSE.md'])try{return `## ${name}\n\n${await readFile(`node_modules/${name}/${filename}`,'utf8')}`}catch{}
  throw new Error(`Missing license for ${name}`);
}));
await writeFile('public/engine-demos/LICENSES.txt',notices.join('\n\n'));
