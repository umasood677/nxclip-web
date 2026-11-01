import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';import ts from 'typescript';
import {templateAssetApprovalPatch} from './templateAssetApproval';
const source=readFileSync(process.cwd()+'/src/pages/BrandKits/templates/TemplateAssetPicker.tsx','utf8');
const tree=ts.createSourceFile('picker.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let callback:ts.Expression|undefined;
function visit(n:ts.Node){if(ts.isVariableDeclaration(n)&&n.name.getText(tree)==='approve'&&n.initializer)callback=n.initializer;ts.forEachChild(n,visit);}visit(tree);assert.ok(callback);
const code=ts.transpileModule('const fn='+callback.getText(tree)+';fn;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
test('source approval refreshes the owned kit and uses its current version and ready sources',async()=>{
 const calls:string[]=[],latest={id:'kit',name:'Fixture',version:44,assets:[{id:'product',status:'ready'}],voice:{studio:{schemaVersion:1 as const,categoryId:'General',nicheId:'Fashion',businessGoals:[],identityApproved:true,guidelinesApproved:true,approvedAssetIds:['removed']}}};
 const fn=vm.runInNewContext(code,{busy:false,kit:{id:'kit'},setBusy:()=>{},setError:(v:string)=>{assert.equal(v,'');},templateAssetApprovalPatch,
 brandApi:{getKit:async(id:string)=>{assert.equal(id,'kit');calls.push('read');return latest;},updateKit:async(id:string,p:ReturnType<typeof templateAssetApprovalPatch>)=>{assert.equal(id,'kit');assert.equal(p.expectedVersion,44);assert.deepEqual(p.voice.studio.approvedAssetIds,['product']);calls.push('patch');return {...latest,version:45};}},update:()=>calls.push('update')}) as (id:string)=>Promise<void>;
 await fn('product');assert.deepEqual(calls,['read','patch','update']);
});
test('failed refresh does not issue a write or invent a new Brand Kit',async()=>{let writes=0,error='';
 const fn=vm.runInNewContext(code,{busy:false,kit:{id:'kit'},setBusy:()=>{},setError:(v:string)=>{error=v;},Error,templateAssetApprovalPatch,brandApi:{getKit:async()=>{throw Error('Reload failed');},updateKit:async()=>{writes++;}},update:()=>{throw Error('no update');}}) as (id:string)=>Promise<void>;
 await fn('product');assert.equal(writes,0);assert.equal(error,'Reload failed');
});
