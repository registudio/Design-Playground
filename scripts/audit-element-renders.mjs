// Browser runtime audit. Screenshots remain review evidence, not proof of visual correctness.
import { chromium } from 'playwright';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const base = process.env.DP_PREVIEW_BASE ?? 'http://localhost:3000';
const index = JSON.parse(await readFile(new URL('../data/registry-snapshot.json', import.meta.url), 'utf8'));
const entries = index.elements.filter(e => !process.env.DP_AUDIT_QUERY || e.title.toLowerCase().includes(process.env.DP_AUDIT_QUERY.toLowerCase()));
const directory = 'artifacts/render-audit';
await mkdir(directory, {recursive:true});
const browser = await chromium.launch({headless:true});
const results=[];
try {
  const page=await browser.newPage({viewport:{width:720,height:480}});
  await page.addInitScript(()=>{ window.__auditStatus='pending'; addEventListener('message',e=>{if(e.data?.type==='dp-preview-status') window.__auditStatus=e.data.status;}); });
  for (const [i,entry] of entries.entries()) {
    const errors=[];const onError=e=>errors.push(e.message);page.on('pageerror',onError);
    const name=entry.source==='react-bits'&&entry.variant?`${entry.name}-${entry.variant.language}-${entry.variant.styling}`:entry.name;
    const url=new URL('/api/element-preview',base);url.searchParams.set('source',entry.source);url.searchParams.set('name',name);
    const start=Date.now();let status='failed',elapsed=0;
    try {
      await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:30000});
      await page.waitForFunction(()=>['ready','failed','fallback','blank'].includes(window.__auditStatus),{},{timeout:15000});
      status=await page.evaluate(()=>window.__auditStatus);elapsed=Date.now()-start;
      await page.screenshot({path:`${directory}/${String(i).padStart(3,'0')}.png`});
    } catch(e){errors.push(e.message);elapsed=Date.now()-start;}
    results.push({id:entry.id,status,elapsedMs:elapsed,withinThreeSeconds:status==='ready'&&elapsed<=3000,errors,screenshot:`${String(i).padStart(3,'0')}.png`});
    page.off('pageerror',onError);
    console.log(`${i+1}/${entries.length} ${entry.title}: ${status} (${elapsed}ms)`);
  }
} finally {await browser.close();await writeFile(`${directory}/report.json`,JSON.stringify({note:'Ready is a runtime heuristic; inspect screenshots for visual correctness. Serial standalone previews do not measure concurrent grid performance.',results},null,2));}
if(results.some(r=>r.status!=='ready'||r.errors.length))process.exitCode=1;
