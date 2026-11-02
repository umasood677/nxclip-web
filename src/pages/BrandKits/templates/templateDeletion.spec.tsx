import React from 'react';import {test} from 'node:test';import assert from 'node:assert/strict';import {renderToStaticMarkup} from 'react-dom/server';
import {deletionEntries,deletionKey,deletionPayload,deletionSummary,deletionFeedback,type TemplateDeleteResult} from './templateDeletion';
import {TemplateBulkActions,TemplateDeleteDialog} from './TemplateBulkDelete';
import type {BrandTemplate} from './brandTemplateModel';import type {WorkspaceCreative} from '../../AdStudio/lib/projectWorkspace';
const entries=deletionEntries([{id:'template',name:'Rejected design',revision:4,state:'rejected'},{id:'pending',name:'Retry design',revision:5,state:'archived',deletion:{status:'pending'}}] as BrandTemplate[],[{id:'draft',name:'Draft design',currentVersion:2,deletionPending:true}] as Array<WorkspaceCreative&{deletionPending:boolean}>);
test('gallery selections retain separate record/draft identities and expected revisions',()=>{
 assert.deepEqual(entries.map(deletionKey),['template:template','template:pending','draft:draft']);assert.equal(entries[0].rejected,true);assert.equal(entries[1].pending,true);
 assert.deepEqual(deletionPayload(entries,['template:template','draft:draft']),[{kind:'template',id:'template',expectedVersion:4},{kind:'draft',id:'draft',expectedVersion:2}]);
});
test('empty, stale and oversized selections cannot issue a deletion payload',()=>{
 for(const keys of [[],['foreign'],Array.from({length:51},(_,i)=>String(i))])assert.throws(()=>deletionPayload(entries,keys));
});
test('partial results clearly distinguish deletion from pending cleanup and shared retention',()=>{
 const request=deletionPayload(entries,['template:template','draft:draft']);
 const results:TemplateDeleteResult[]=[{...request[0],status:'deleted',removedObjects:1,retainedObjects:1},{...request[1],status:'cleanup_pending',removedObjects:0,retainedObjects:0,message:'Retry cleanup'}];
 assert.deepEqual(deletionSummary(results,request),{deleted:1,pending:1,removedObjects:1,retainedObjects:1});
 for(const invalid of [[],[results[0],results[0]],[{...results[0],id:'another'},results[1]]])assert.throws(()=>deletionSummary(invalid,request));
});
test('multi-selection toolbar exposes selection, rejected shortcut and destructive action concisely',()=>{
 const html=renderToStaticMarkup(<TemplateBulkActions entries={entries} selected={['template:template']} busy={false} onSelect={()=>{}} onDelete={()=>{}}/>);
 assert.match(html,/Select visible/);assert.match(html,/Select rejected/);assert.match(html,/1 selected/);assert.match(html,/Delete selected/);assert.match(html,/type="checkbox"/);
});
test('empty selection offers no accidental Delete action',()=>{
 const html=renderToStaticMarkup(<TemplateBulkActions entries={entries} selected={[]} busy={false} onSelect={()=>{}} onDelete={()=>{}}/>);assert.doesNotMatch(html,/Delete selected/);
});
import {readFileSync} from 'node:fs';import ts from 'typescript';import vm from 'node:vm';
test('Delete dialog is confirmation-only and explains original/shared asset protection',()=>{
 const source=readFileSync(process.cwd()+'/src/pages/BrandKits/templates/TemplateBulkDelete.tsx','utf8');
 assert.match(source,/Uploaded Brand Kit assets and files used elsewhere are kept/);assert.match(source,/This cannot be undone/);assert.match(source,/onClick=\{onConfirm\}/);
 assert.equal(typeof TemplateDeleteDialog,'function');assert.doesNotMatch(source,/brandTemplateApi|adImageApi|fetch\(/);
});
test('confirmed bulk action makes one API request, reports results and reloads without generation',async()=>{
 const source=readFileSync(process.cwd()+'/src/pages/BrandKits/templates/BrandTemplateLibrary.tsx','utf8'),tree=ts.createSourceFile('library.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let expression:ts.Expression|undefined;
 function visit(n:ts.Node){if(ts.isVariableDeclaration(n)&&n.name.getText(tree)==='deleteTemplates')expression=n.initializer;ts.forEachChild(n,visit);}visit(tree);assert.ok(expression);
 const code=ts.transpileModule('const handler='+expression.getText(tree)+';handler;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const order:string[]=[];let result:unknown,work:Promise<void>|undefined;
 const handler=vm.runInNewContext(code,{deleteRequest:[entries[0]],brandId:'brand',activeBrand:{current:'brand'},deletionPayload,deletionKey,deletionSummary,deletionFeedback,run:(fn:()=>Promise<void>)=>{work=fn();return work;},brandTemplateApi:{bulkDelete:async(kit:string,items:unknown[])=>{assert.equal(kit,'brand');assert.equal(items.length,1);order.push('delete');return {items:[{kind:'template',id:'template',status:'deleted',removedObjects:1,retainedObjects:0}]};}},setDeleteResults:(r:unknown)=>{result=r;},setDeleteRequest:()=>{},setDeleteSelection:()=>{},toast:{success:()=>order.push('toast'),warning:()=>assert.fail()},load:async()=>{order.push('reload');}}) as ()=>Promise<void>;
 handler();await work;assert.deepEqual(order,['delete','toast','reload']);assert.match(JSON.stringify(result),/Rejected design/);
});

test('a fully blocked request displays the reason rather than a misleading zero-deleted toast',()=>{
 const request=deletionPayload(entries,['draft:draft']);
 const result=[{...request[0],status:'blocked' as const,removedObjects:0,retainedObjects:0,message:'Only template drafts can be deleted here.'}];
 assert.deepEqual(deletionFeedback(result,request),{tone:'error',message:'Only template drafts can be deleted here.'});
});
