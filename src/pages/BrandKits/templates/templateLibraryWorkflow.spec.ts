import {test} from 'node:test';import assert from 'node:assert/strict';
import {templateResponseId,templateError,unlistedDrafts} from './templateLibraryWorkflow';
import type {BrandTemplate} from './brandTemplateModel';import type {WorkspaceCreative} from '../../AdStudio/lib/projectWorkspace';
test('no action result can produce a request to templates/undefined',()=>{
 for(const bad of [null,undefined,{}, {id:'different'}])assert.throws(()=>templateResponseId(bad,'current'));
 assert.equal(templateResponseId({id:'current'},'current'),'current');assert.equal(templateResponseId({id:'copy'},'current',true),'copy');
});
test('drafts and saved records share one gallery without duplicate source entries',()=>{
 const records=[{id:'published',provenance:{sourceCreativeId:'source'}}] as BrandTemplate[];
 const drafts=[{id:'source',name:'Published source'},{id:'unreviewed',name:'New proposal'}] as WorkspaceCreative[];
 assert.deepEqual(unlistedDrafts(records,drafts).map(d=>d.id),['unreviewed']);assert.equal(unlistedDrafts(records,drafts,'absent').length,0);
});
test('a revision conflict is explicit and never reported as success',()=>{
 assert.match(templateError({statusCode:409}),/latest version/);assert.equal(templateError({message:'Permission denied'}),'Permission denied');
});

test('Canvas working copies of an existing template are not separate gallery entries',()=>{const records=[{id:'saved-template',provenance:{sourceCreativeId:'original'}}] as BrandTemplate[];const drafts=[{id:'editor-copy',name:'Working copy',templateContext:{brandKitId:'kit',draftKind:'native',brandTemplateId:'saved-template'}},{id:'new',name:'New proposal'}] as WorkspaceCreative[];assert.deepEqual(unlistedDrafts(records,drafts).map(d=>d.id),['new']);});
