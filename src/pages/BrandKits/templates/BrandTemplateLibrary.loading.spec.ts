import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import vm from 'node:vm';import ts from 'typescript';
const source=readFileSync(process.cwd()+'/src/pages/BrandKits/templates/BrandTemplateLibrary.tsx','utf8');
const tree=ts.createSourceFile('library.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let callback:ts.Expression|undefined;
function visit(n:ts.Node){if(ts.isVariableDeclaration(n)&&n.name.getText(tree)==='load'&&n.initializer&&ts.isCallExpression(n.initializer))callback=n.initializer.arguments[0];ts.forEachChild(n,visit);}visit(tree);assert.ok(callback);
const code=ts.transpileModule('const fn='+callback.getText(tree)+';fn;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
function deferred(){let resolve!:(v:unknown)=>void,reject!:(v:unknown)=>void;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
function harness(){
 const requests=[deferred(),deferred()],version={current:0};let index=0;
 const state:{loading:boolean;kit:unknown;error:string}={loading:false,kit:null,error:''};
 const load=vm.runInNewContext(code,{enabled:true,brandId:'brand',templateId:undefined,requestVersion:version,
 brandApi:{getKit:()=>requests[index++].promise},brandTemplateApi:{list:async()=>({items:[]}),listDrafts:async()=>({items:[]})},
 setLoading:(v:boolean)=>{state.loading=v;},setKit:(v:unknown)=>{state.kit=v;},setError:(v:string)=>{state.error=v;},setItems:()=>{},setProjects:()=>{},setBusy:()=>{},setTemplateDrafts:()=>{}}) as ()=>Promise<void>;
 return {requests,version,state,load};
}
for(const outcome of ['resolve','reject'] as const)test('stale '+outcome+' cannot flash unavailable while the current request is pending',async()=>{
 const h=harness(),first=h.load(),second=h.load();
 if(outcome==='resolve')h.requests[0].resolve({id:'brand'});else h.requests[0].reject(Error('Old failed request'));
 await first;assert.equal(h.state.loading,true);assert.equal(h.state.error,'');assert.equal(h.state.kit,null);
 h.requests[1].resolve({id:'brand'});await second;assert.equal(h.state.loading,false);assert.deepEqual(h.state.kit,{id:'brand'});assert.equal(h.state.error,'');
});
test('current request failure ends loading and exposes a real error',async()=>{const h=harness(),work=h.load();h.requests[0].reject(Error('Unavailable'));await work;assert.equal(h.state.loading,false);assert.match(h.state.error,/could not be loaded/);});
test('effect cleanup invalidates in-flight requests on StrictMode replay and unmount',async()=>{
 assert.match(source,/return \(\) => \{ requestVersion.current \+= 1; \}/);
 const h=harness(),work=h.load();h.version.current++;const before=JSON.stringify(h.state);h.requests[0].reject(Error('Late'));await work;assert.equal(JSON.stringify(h.state),before);
});
