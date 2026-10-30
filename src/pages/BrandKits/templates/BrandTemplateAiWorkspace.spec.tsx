import React from 'react';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {BrandTemplateAiWorkspace,TemplateDraftNavigation,verifyTemplateSource} from './BrandTemplateAiWorkspace';
const source={id:'draft',projectId:'storage',name:'Template',currentVersion:1,documentPurpose:'template-draft' as const,templateContext:{brandKitId:'brand',draftKind:'ai' as const},sceneGraph:{schemaVersion:'1.0' as const,canvas:{width:1080,height:1080},layers:[]}};
for(const kind of ['ai','native'] as const)test(kind+' entry prepares a template without campaign selection or automatic generation',()=>{
 const html=renderToStaticMarkup(<MemoryRouter><BrandTemplateAiWorkspace kit={{id:'brand',name:'Synthetic brand'}} entryKind={kind} initialFormat='portrait_1080x1350' onBack={()=>{}}/></MemoryRouter>);
 assert.match(html,kind==='ai'?/Describe your template/:/Preview template/);assert.match(html,/Format/);assert.match(html,/Starting composition/);
 assert.doesNotMatch(html,/Create a campaign|Owned campaign|Working Brief|name="campaign"/);assert.equal(html.includes("/create/ad/projects"),false);
});
test('draft resolution requires owned-brand context, template purpose and persisted version',()=>{
 assert.equal(verifyTemplateSource(source,'brand').id,'draft');
 for(const invalid of [{...source,templateContext:{brandKitId:'other',draftKind:'ai' as const}},{...source,currentVersion:0},{...source,documentPurpose:'campaign-ad' as const}])assert.throws(()=>verifyTemplateSource(invalid,'brand'),/unavailable/);
});
test('template navigation returns to brand library or existing Canvas, never a campaign',()=>{
 const html=renderToStaticMarkup(<MemoryRouter><TemplateDraftNavigation source={{id:'draft/a'}} brandId='brand/b'/></MemoryRouter>);
 assert.equal(html.includes("/brands/brand%2Fb/templates?tab=brand"),true);assert.equal(html.includes("/create/ad/draft%2Fa"),true);assert.equal(html.includes("/projects/"),false);assert.doesNotMatch(html,/Campaign workspace|Concept Gallery/);
});
