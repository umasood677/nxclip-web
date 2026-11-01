import React from 'react';import {test} from 'node:test';import assert from 'node:assert/strict';import {renderToStaticMarkup} from 'react-dom/server';
import {BrandTemplateTile} from './BrandTemplateTile';
import {BrandTemplateScenePreview} from './BrandTemplateScenePreview';
import {readFileSync} from 'node:fs';
const graph={schemaVersion:'1.0' as const,canvas:{width:1080,height:1350},layers:[]};
const props={name:'Brand template',graph,assetUrls:{},status:'Saved',kind:'AI artwork',selected:false,busy:false,onToggle:()=>{},onPreview:()=>{},onDelete:()=>{}};
test('saved tile uses the Default Templates card, body, meta, format and preview-button classes',()=>{
 const html=renderToStaticMarkup(<BrandTemplateTile {...props}/>);
 for(const name of ['w0a-card','w0a-brand-preview','w0a-card-body','w0a-meta','w0a-formats','w0a-chip','w0a-btn'])assert.match(html,new RegExp(name));
 assert.match(html,/Preview template/);assert.match(html,/aspect-ratio:1080 \/ 1350/);assert.match(html,/Format 4:5/);
 assert.doesNotMatch(html,/xp-card-copy|bt-card-art|Editable text, product/);
});
test('thumbnail fills its width at the real aspect without changing the graph or review preview',()=>{
 const before=JSON.stringify(graph),full=renderToStaticMarkup(<BrandTemplateScenePreview graph={graph} assetUrls={{}} size="card" fillCard/>),review=renderToStaticMarkup(<BrandTemplateScenePreview graph={graph} assetUrls={{}} size="card" maxHeight={256}/>);
 assert.match(full,/width:260px;height:325px/);assert.match(review,/height:256px/);assert.equal(JSON.stringify(graph),before);
});
test('actual stored shapes are retained for landscape and story drafts',()=>{
 for(const [width,height,label] of [[1920,1080,'16:9'],[1080,1920,'9:16']] as const){
 const html=renderToStaticMarkup(<BrandTemplateTile {...props} graph={{...graph,canvas:{width,height}}} status="Draft"/>);
 assert.match(html,new RegExp('Format '+label));assert.match(html,new RegExp('aspect-ratio:'+width+' \\/ '+height));
 }
});
test('selection and per-template actions remain accessible icon controls',()=>{
 const html=renderToStaticMarkup(<BrandTemplateTile {...props} selected onReject={()=>{}} onArchive={()=>{}}/>);
 assert.match(html,/bt-card-selected/);assert.match(html,/aria-label="Select Brand template"[^>]*checked=""/);
 for(const action of ['Reject','Archive','Delete'])assert.match(html,new RegExp('aria-label="'+action+' Brand template"'));
});
test('pending cleanup suppresses broken artwork and preview but preserves cleanup action',()=>{
 const html=renderToStaticMarkup(<BrandTemplateTile {...props} pending status="Cleanup pending"/>);
 assert.match(html,/Cleanup pending/);assert.match(html,/Retry cleanup for Brand template/);assert.doesNotMatch(html,/data-scene-stage/);
 assert.match(html,/<button[^>]*class="w0a-btn"[^>]*disabled=""[^>]*>Preview template/);
});
test('both saved and draft rows use the same tile while all four-column breakpoints remain intact',()=>{
 const library=readFileSync(process.cwd()+'/src/pages/BrandKits/templates/BrandTemplateLibrary.tsx','utf8'),css=readFileSync(process.cwd()+'/src/pages/BrandKits/templates/brandTemplates.css','utf8');
 assert.equal((library.match(/<BrandTemplateTile /g)||[]).length,2);assert.doesNotMatch(library,/className="bt-card-art"|className="xp-card-copy"/);
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);assert.match(css,/@media\(max-width:1100px\)/);assert.match(css,/@media\(max-width:700px\)/);
});
