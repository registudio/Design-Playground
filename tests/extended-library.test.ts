import { afterEach, describe, expect, it, vi } from 'vitest';
import { ELEMENTS, elementDocument } from '@/elements/catalogue';
import { browseCategory } from '@/elements/taxonomy';
import { createProject } from '@/schema/defaults';
import { DesignProject } from '@/schema/project';
import { SelectedElement } from '@/schema/selection';
import { previewKey, previewStatuses, recordPreview } from '@/elements/preview-status';
import { qualityReport } from '@/export/quality-report';
import { embedEngineAssets, relativePath } from '@/export/engine-assets';
import type { ExportFile } from '@/export/bundle';
import snapshot from '../data/registry-snapshot.json';

afterEach(()=>{previewStatuses.clear();vi.unstubAllGlobals();});
describe('extended library regression checks',()=>{
  it('separates carousels and media while keeping nine and seven curated designs',()=>{
    expect(ELEMENTS.filter(e=>e.category==='Carousels')).toHaveLength(9);
    expect(ELEMENTS.filter(e=>e.category==='Galleries & media')).toHaveLength(7);
    expect(browseCategory({name:'ImageCarousel'})).toBe('Carousels');
    expect(browseCategory({name:'MasonryGallery'})).toBe('Galleries & media');
    expect(new Set(ELEMENTS.map(e=>e.id)).size).toBe(ELEMENTS.length);
  });
  it('round trips deliberate progress and accepts legacy projects',()=>{
    const project=createProject('Progress');project.workflow={assets:'skipped',basics:'reviewed'};
    expect(DesignProject.parse(JSON.parse(JSON.stringify(project))).workflow).toEqual(project.workflow);
    expect(DesignProject.parse({...project,workflow:undefined}).workflow).toEqual({});
  });
  it('reports variant-specific status, age and concrete dependency names',()=>{
    const project=createProject('QA');
    const item=snapshot.elements.find(e=>e.source==='react-bits'&&e.variant)!;
    const selection=SelectedElement.parse({...item,addedAt:1,npmDependencies:['three@0.134.0']});
    project.selections=[selection];recordPreview(previewKey(selection),'failed');
    const report=qualityReport(project);
    expect(report).toContain('failed, observed');expect(report).toContain('three@0.134.0');expect(report).toContain('higher');
    project.selections=[{...selection,variant:undefined}];
    expect(qualityReport(project)).toContain('not observed this session');
  });
  it('ships each engine bundle once and points every document at it by relative path',async()=>{
    const fetched:string[]=[];
    vi.stubGlobal('fetch',vi.fn(async(path:string)=>{fetched.push(path);return new Response(path.endsWith('.txt')?'MIT license':`window.demo=${JSON.stringify(path.split("/").pop())};`);}));
    const files:ExportFile[]=[
      {path:'elements/vanta-net.html',content:elementDocument('vanta-net')},
      {path:'elements/vanta-fog.html',content:elementDocument('vanta-fog')},
      {path:'preview.html',content:`<iframe srcdoc="${elementDocument('vanta-net').replaceAll('"','&quot;')}"></iframe>`},
    ];
    await embedEngineAssets(files,'shared');
    const byPath=new Map(files.map(f=>[f.path,f.content as string]));
    // Three.js once for every Vanta document, one small file per effect.
    expect([...byPath.keys()].filter(p=>p.startsWith('elements/engines/'))).toEqual(['elements/engines/vanta-fog.js','elements/engines/vanta-net.js','elements/engines/vanta-three.js']);
    expect(fetched.filter(p=>p==='/engine-demos/vanta-three.js')).toHaveLength(1);
    expect(byPath.get('elements/vanta-net.html')).toContain("'engines/vanta-three.js','engines/vanta-net.js'");
    // Sandboxed srcdoc frames cannot load file:// at all, so the page carries each bundle
    // once and fills its frames in on load rather than pointing them at the folder.
    const page=byPath.get('preview.html')!;
    expect(page).toContain('data-dp-srcdoc=');
    expect(page).not.toMatch(/<iframe[^>]*\ssrcdoc=/);
    expect(page).toContain('dp-engine:vanta-three');
    expect(page.split(btoa('window.demo="vanta-three.js";')).length-1).toBe(1);
    for(const [path,content] of byPath) {
      expect(content,path).not.toContain('/engine-demos/');
      if(path!=='preview.html') expect(content,path).not.toContain('data:text/javascript');
    }
    expect(byPath.get('elements/ENGINE-LICENSES.txt')).toContain('MIT license');
  });
  it('embeds engine bundles as data URIs for the single-file page',async()=>{
    vi.stubGlobal('fetch',vi.fn(async(path:string)=>new Response(path.endsWith('.txt')?'MIT license':'window.demo="é";')));
    const files:ExportFile[]=[{path:'preview.html',content:elementDocument('vanta-net')}];
    await embedEngineAssets(files,'inline');
    const page=files.find(f=>f.path==='preview.html')!.content as string;
    expect(page).toContain('data:text/javascript;base64,');
    expect(page).not.toContain('/engine-demos/');
    expect(files.some(f=>f.path.startsWith('elements/engines/'))).toBe(false);
    // UTF-8, not Latin-1: a minified bundle can carry any character.
    const encoded=page.match(/data:text\/javascript;base64,([A-Za-z0-9+/=]+)/g)!.map(m=>m.split(',')[1]);
    expect(encoded.map(b=>new TextDecoder().decode(Uint8Array.from(atob(b),c=>c.charCodeAt(0))))).toContain('window.demo="é";');
  });
  it('resolves shipped paths relative to the document that loads them',()=>{
    expect(relativePath('elements/a.html','elements/engines/x.js')).toBe('engines/x.js');
    expect(relativePath('preview.html','elements/engines/x.js')).toBe('elements/engines/x.js');
    expect(relativePath('design/deep/a.html','elements/engines/x.js')).toBe('../../elements/engines/x.js');
  });
  it('fails export explicitly when a required runtime cannot be included',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>new Response('',{status:503})));
    await expect(embedEngineAssets([{path:'motion.html',content:elementDocument('motion-spring')}])).rejects.toThrow('Motion');
  });
});
