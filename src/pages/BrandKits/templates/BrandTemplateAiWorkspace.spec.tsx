import React from 'react';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {BrandTemplateAiWorkspace,TemplateDraftNavigation,verifyTemplateSource} from './BrandTemplateAiWorkspace';
const source={id:'draft',projectId:'storage',name:'Template',currentVersion:1,documentPurpose:'template-draft' as const,templateContext:{brandKitId:'brand',draftKind:'ai' as const},sceneGraph:{schemaVersion:'1.0' as const,canvas:{width:1080,height:1080},layers:[]}};
for(const kind of ['ai','native'] as const)test(kind+' entry prepares a template without campaign selection or automatic generation',()=>{
 const html=renderToStaticMarkup(<MemoryRouter><BrandTemplateAiWorkspace kit={{id:'brand',name:'Synthetic brand'}} entryKind={kind} initialFormat='portrait_1080x1350' onBack={()=>{}}/></MemoryRouter>);
 assert.match(html,kind==='ai'?/Describe your template/:/Preview template/);assert.match(html,/Format/);assert.match(html,kind==='ai'?/Composition guidance/:/Layout/);if(kind==='ai')assert.match(html,/Let AI compose from my brief/);
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

import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
test('generated proposal proceeds directly to one review record without approving or saving',async()=>{
 const text=readFileSync(process.cwd()+'/src/pages/BrandKits/templates/BrandTemplateAiWorkspace.tsx','utf8');
 const tree=ts.createSourceFile('workspace.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let callback:ts.Expression|undefined;
 function visit(n:ts.Node){if(ts.isJsxAttribute(n)&&n.name.getText(tree)==='onSaved'&&n.initializer&&ts.isJsxExpression(n.initializer))callback=n.initializer.expression;ts.forEachChild(n,visit);}visit(tree);assert.ok(callback);
 const code=ts.transpileModule('const fn='+callback.getText(tree)+';fn;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const order:string[]=[];const generated={...source,id:'result',currentVersion:2};
 const handler=vm.runInNewContext(code,{remember:(v:unknown)=>{assert.equal(v,generated);order.push('retain');},publish:async(v:unknown)=>{assert.equal(v,generated);order.push('review');}}) as (v:unknown)=>Promise<void>;
 await handler(generated);assert.deepEqual(order,['retain','review']);
 assert.equal(text.includes('proposalReviewed:true'),false);assert.equal(text.includes('Review this template</h3>'),false);
});
