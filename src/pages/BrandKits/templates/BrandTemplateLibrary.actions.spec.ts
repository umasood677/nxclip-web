import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {templateResponseId} from './templateLibraryWorkflow';

const source=readFileSync('src/pages/BrandKits/templates/BrandTemplateLibrary.tsx','utf8');
const tree=ts.createSourceFile('library.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let action:ts.Expression|undefined;
function visit(node:ts.Node){
 if(ts.isVariableDeclaration(node)&&node.name.getText(tree)==='action')action=node.initializer;
 ts.forEachChild(node,visit);
}
visit(tree);assert.ok(action);
const code=ts.transpileModule('const action='+action.getText(tree)+';action;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;

for(const decision of ['approve','reject'] as const)test('normal '+decision+' works without a fidelity checklist',async()=>{
 const calls:unknown[][]=[];
 const selected={id:'template',revision:3,provenance:{compositionMode:'reference-guided-template-v1'}};
 let work:Promise<unknown>|undefined;
 const handler=vm.runInNewContext(code,{
  selected,dirty:false,brandId:'brand',depictionReviewed:false,activeBrand:{current:'brand'},
  run:(fn:()=>Promise<unknown>)=>{work=fn();},
  brandTemplateApi:{action:async(...args:unknown[])=>{calls.push(args);return {...selected,revision:4};}},
  templateResponseId,upsert:()=>{},setMessage:()=>{},navigate:()=>{},base:'/brands/brand/templates',
 }) as (value:string)=>void;
 handler(decision);await work;
 assert.deepEqual(calls,[['brand','template',3,decision,decision==='approve']]);
});
