import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
test('asset completion rebases a clean wizard draft but preserves unsaved user edits',()=>{
 const source=readFileSync('src/pages/BrandKits/guided/GuidedBrandKit.tsx','utf8'),tree=ts.createSourceFile('guided.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let callback:ts.Expression|undefined;
 function visit(n:ts.Node){if(ts.isJsxAttribute(n)&&n.name.getText(tree)==='onKitUpdated'&&n.initializer&&ts.isJsxExpression(n.initializer)&&n.initializer.expression?.getText(tree).includes('Asset changes saved'))callback=n.initializer.expression;ts.forEachChild(n,visit);}visit(tree);assert.ok(callback);
 for(const dirty of [false,true]){const draft={name:dirty?'Unsaved':'Saved'},saved={current:JSON.stringify({name:'Saved'})};let next:unknown,kit:unknown;
 const fn=vm.runInNewContext(ts.transpileModule('const fn='+callback.getText(tree)+';fn;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{draft,saved,setKit:(v:unknown)=>{kit=v;},setDraft:(v:unknown)=>{next=v;},draftFromKit:(v:unknown)=>v,setMessage:()=>{}});
 const updated={name:'Saved',version:2};fn(updated);assert.equal(kit,updated);assert.equal(next,dirty?undefined:updated);assert.equal(saved.current,JSON.stringify(dirty?{name:'Saved'}:updated));}
});
