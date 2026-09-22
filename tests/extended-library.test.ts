import { afterEach, describe, expect, it, vi } from 'vitest';
import { ELEMENTS, elementDocument } from '@/elements/catalogue';
import { browseCategory } from '@/elements/taxonomy';
import { createProject } from '@/schema/defaults';
import { DesignProject } from '@/schema/project';
import { SelectedElement } from '@/schema/selection';
import { previewKey, previewStatuses, recordPreview } from '@/elements/preview-status';
import { qualityReport } from '@/export/quality-report';
import { embedEngineAssets } from '@/export/engine-assets';
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
  it('embeds engine scripts and licenses into exported files without localhost dependencies',async()=>{
    vi.stubGlobal('fetch',vi.fn(async(path:string)=>new Response(path.endsWith('.txt')?'MIT license':'window.demo=true;')));
    const files=[{path:'elements/vanta-net.html',content:elementDocument('vanta-net')}];
    await embedEngineAssets(files);
    expect(files[0].content).toContain('data:text/javascript;base64,');
    expect(files[0].content).not.toContain('/engine-demos/');
    expect(files[1].content).toContain('MIT license');
  });
  it('fails export explicitly when a required runtime cannot be included',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>new Response('',{status:503})));
    await expect(embedEngineAssets([{path:'motion.html',content:elementDocument('motion-spring')}])).rejects.toThrow('Motion');
  });
});
