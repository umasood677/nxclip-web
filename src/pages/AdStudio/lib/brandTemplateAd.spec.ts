import {test} from 'node:test';
import assert from 'node:assert/strict';
import {alignProjectToTemplateFormat,openBrandTemplateAd} from './brandTemplateAd';
import type {BrandTemplate} from '../../BrandKits/templates/brandTemplateModel';
import type {WorkspaceCreative} from './projectWorkspace';
const template={id:'t',brandKitId:'kit',format:'portrait_1080x1350',revision:3,state:'approved',saved:true,blockers:[]} as BrandTemplate;
const project={id:'p',brandKitId:'kit',outputFormat:template.format};
function setup(items:WorkspaceCreative[]=[],fresh:BrandTemplate=template){let calls=0;return {api:{get:async()=>fresh,reuse:async()=>{calls++;return {id:'new-ad'};}},reader:{listCreatives:async()=>({items})},calls:()=>calls};}
test('opening a saved template twice reopens the same campaign draft without a second creation',async()=>{
 const items:WorkspaceCreative[]=[],s=setup(items);
 assert.deepEqual(await openBrandTemplateAd(s.api,s.reader,project,template),{id:'new-ad',existing:false});
 items.push({id:'new-ad',projectId:'p',name:'Ad',documentPurpose:'campaign-ad',conceptSnapshot:{brandTemplateId:'t',brandTemplateRevision:3}});
 assert.deepEqual(await openBrandTemplateAd(s.api,s.reader,project,template),{id:'new-ad',existing:true});assert.equal(s.calls(),1);
});
test('other template revisions and authoring sources never replace the selected ad',async()=>{
 const s=setup([{id:'old',projectId:'p',name:'Old',conceptSnapshot:{brandTemplateId:'t',brandTemplateRevision:2}},{id:'source',projectId:'p',name:'Source',documentPurpose:'template-draft',conceptSnapshot:{brandTemplateId:'t',brandTemplateRevision:3}}]);
 assert.equal((await openBrandTemplateAd(s.api,s.reader,project,template)).existing,false);assert.equal(s.calls(),1);
});
test('ownership, format and review failures stop before creating or opening a draft',async()=>{
 for(const fresh of [{...template,brandKitId:'other'},{...template,format:'square_1080'},{...template,saved:false},{...template,state:'rejected'}] as BrandTemplate[]){const s=setup([],fresh);await assert.rejects(openBrandTemplateAd(s.api,s.reader,project,template));assert.equal(s.calls(),0);}
 const s=setup([{id:'other',projectId:'wrong',name:'Wrong'}]);await assert.rejects(openBrandTemplateAd(s.api,s.reader,project,template),/ownership/);assert.equal(s.calls(),0);
});
test('a failed campaign list never falls through to another create request',async()=>{
 const s=setup();await assert.rejects(openBrandTemplateAd(s.api,{listCreatives:async()=>{throw Error('Unavailable');}},project,template));assert.equal(s.calls(),0);
});
test('a deliberate template-format switch persists the campaign before reuse',async()=>{
 const source={id:'p',name:'Campaign',brandKitId:'kit',outputFormat:'square_1080',brief:{productOrService:'Lipstick',advertisingObjective:'brand_awareness',platform:'instagram_feed',targetAudience:'Luxury beauty buyers',coreMessage:'A premium launch',desiredTone:'Editorial and refined',campaignIdea:'A premium launch',cta:'Discover',outputFormat:'square_1080'}};
 let payload:Record<string,unknown>|undefined;
 const aligned=await alignProjectToTemplateFormat({updateProject:async(_id,body)=>{payload=body;const normalized=Object.fromEntries(Object.entries(body.brief as Record<string,unknown>).filter(([key,value])=>value!==undefined&&(value!==''||key==='supportingCopy')));return {...source,outputFormat:template.format,brief:normalized};}},source,template.format);
 assert.equal(aligned.outputFormat,template.format);
 assert.equal(aligned.brief?.outputFormat,template.format);
 assert.equal((payload?.brief as Record<string,unknown>).outputFormat,template.format);
});
test('an already compatible campaign is not saved again',async()=>{
 let calls=0;
 const aligned=await alignProjectToTemplateFormat({updateProject:async()=>{calls++;throw Error('unexpected');}},project,template.format);
 assert.equal(calls,0);assert.equal(aligned.outputFormat,template.format);
});
