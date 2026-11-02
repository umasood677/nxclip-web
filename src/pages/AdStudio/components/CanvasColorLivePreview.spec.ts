import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const path='src/pages/ClipEditor/CanonicalTypographyControls.tsx',source=readFileSync(path,'utf8'),tree=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let listener:ts.ArrowFunction|undefined;
function visit(n:ts.Node){if(ts.isCallExpression(n)&&n.expression.getText(tree)==='useEffect'&&n.arguments[0]?.getText(tree).includes("addEventListener('input', preview)"))listener=n.arguments[0] as ts.ArrowFunction;ts.forEachChild(n,visit);}visit(tree);assert.ok(listener);
function harness(livePreview:boolean,disabled=false){
 const events=new Map<string,()=>void>(),applied:string[]=[],drafts:string[]=[];
 const input={value:'#000000',disabled,addEventListener:(name:string,fn:()=>void)=>events.set(name,fn),removeEventListener:(name:string)=>events.delete(name)};
 const code=ts.transpileModule('const attach='+listener!.getText(tree)+';attach();',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const cleanup=vm.runInNewContext(code,{inputRef:{current:input},onChangeRef:{current:(value:string)=>applied.push(value)},setDraft:(value:string)=>drafts.push(value),livePreview,normalized:'#000000'}) as ()=>void;
 return {input,events,applied,drafts,cleanup,emit:(event:string)=>events.get(event)?.()};
}
test('Ad Studio color input applies immediately before picker dismissal and deduplicates the final change',()=>{
 const h=harness(true);h.input.value='#ab12cd';h.emit('input');assert.deepEqual(h.applied,['#AB12CD']);
 h.emit('input');h.emit('change');assert.equal(h.applied.length,1);
 h.input.value='#123456';h.emit('input');assert.deepEqual(h.applied,['#AB12CD','#123456']);h.cleanup();assert.equal(h.events.size,0);
});
test('existing editors retain deferred commits unless live preview is explicitly enabled',()=>{
 const h=harness(false);h.input.value='#ab12cd';h.emit('input');assert.deepEqual(h.applied,[]);assert.deepEqual(h.drafts,['#AB12CD']);h.emit('change');assert.deepEqual(h.applied,['#AB12CD']);
});
test('disabled palettes cannot update graph colors',()=>{
 const h=harness(true,true);h.input.value='#123456';h.emit('input');h.emit('change');assert.deepEqual(h.applied,[]);assert.deepEqual(h.drafts,[]);
});
test('Ad Studio opts in for text, stroke and shadow; its native background/fill inputs use input events',()=>{
 const typography=readFileSync('src/pages/AdStudio/components/AdStudioTypographyPanel.tsx','utf8');assert.equal((typography.match(/<ColorSwatchRow\s+livePreview/g)||[]).length,3);
 for(const path of ['src/pages/AdStudio/components/AdStudioTypographyPanel.tsx','src/pages/AdStudio/components/TemplateCanvasControls.tsx']){
  const text=readFileSync(path,'utf8'),ast=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let count=0;
  function check(n:ts.Node){if(ts.isJsxSelfClosingElement(n)){const attrs=n.attributes.properties;if(attrs.some(a=>ts.isJsxAttribute(a)&&a.name.getText(ast)==='type'&&a.initializer?.getText(ast)==='"color"')){count++;assert.ok(attrs.some(a=>ts.isJsxAttribute(a)&&a.name.getText(ast)==='onInput'));}}ts.forEachChild(n,check);}check(ast);assert.ok(count>0);
 }
});
