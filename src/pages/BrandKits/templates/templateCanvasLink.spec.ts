import {test} from 'node:test';import assert from 'node:assert/strict';
import {templateCanvasPath,templateEditTarget,retainTemplateTarget,saveCanvasTemplate} from './templateCanvasLink';
const id='11111111-1111-4111-8111-111111111111';
test('selected template identity and revision survive Canvas navigation and return',()=>{
 const path=templateCanvasPath('source',id,4),search=path.slice(path.indexOf('?'));
 assert.deepEqual(templateEditTarget(search),{id,revision:4});assert.match(retainTemplateTarget('/brands/kit/templates?source=source',search),/revision=4/);
 assert.equal(templateEditTarget('?template=undefined&revision=1'),null);assert.equal(templateEditTarget('?template='+id+'&revision=-1'),null);
});
test('Canvas edits use existing template PATCH and preserve its ID',async()=>{
 const graph={schemaVersion:'1.0',canvas:{width:1080,height:1080},layers:[]},calls:unknown[]=[];
 const existing={id,brandKitId:'kit',name:'Before',revision:4,sceneGraph:graph,provenance:{sourceCreativeId:'source'}};
 const api={get:async()=>existing,edit:async(...args:unknown[])=>{calls.push(args);return {...existing,name:'After',revision:5};}} as unknown as Parameters<typeof saveCanvasTemplate>[0];
 const result=await saveCanvasTemplate(api,'kit',{id:'source',projectId:'internal',name:'After',sceneGraph:{...graph,layers:[{id:'edited'}]} as never},{id,revision:4});
 assert.equal(result.id,id);assert.equal(result.revision,5);assert.equal(calls.length,1);assert.equal((calls[0] as unknown[])[1],id);
 await assert.rejects(saveCanvasTemplate(api,'kit',{id:'source',projectId:'internal',name:'After',sceneGraph:graph as never},{id,revision:3}),/changed/);assert.equal(calls.length,1);
 await assert.rejects(saveCanvasTemplate(api,'kit',{id:'foreign',projectId:'internal',name:'After',sceneGraph:graph as never},{id,revision:4}),/changed/);
});
test('opening unchanged Canvas does not clear approval or increment a revision',async()=>{
 const graph={schemaVersion:'1.0',canvas:{width:1080,height:1080},layers:[]},existing={id,brandKitId:'kit',name:'Same',revision:4,sceneGraph:graph,provenance:{sourceCreativeId:'source'}},api={get:async()=>existing,edit:async()=>{throw Error('unexpected write');}} as unknown as Parameters<typeof saveCanvasTemplate>[0];
 assert.equal((await saveCanvasTemplate(api,'kit',{id:'source',projectId:'internal',name:'Same',sceneGraph:graph as never},{id,revision:4})).revision,4);
});

test('Canvas loading keeps the selected revision across initial project reloads, then respects newer source versions',async()=>{
 const fs=await import('node:fs'),ts=await import('typescript'),vm=await import('node:vm');
 const sourceText=fs.readFileSync('src/pages/AdStudio/AdStudioEditor.tsx','utf8'),file=ts.createSourceFile('editor.tsx',sourceText,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let callback:import('typescript').Expression|undefined;
 function visit(n:import('typescript').Node){if(ts.isVariableDeclaration(n)&&n.name.getText(file)==='reloadCreative'&&n.initializer&&ts.isCallExpression(n.initializer))callback=n.initializer.arguments[0];ts.forEachChild(n,visit);}visit(file);assert.ok(callback);
 const code=ts.transpileModule('('+callback.getText(file)+')',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const base={schemaVersion:'1.0',canvas:{width:1080,height:1080},layers:[]},chosen={...base,layers:[{id:'chosen'}]},later={...base,layers:[{id:'later'}]},creative={id:'source',projectId:'internal',name:'Source',currentVersion:1,sceneGraph:base,templateContext:{brandKitId:'kit',draftKind:'ai'}};
 const rendered:unknown[]=[],loaded={current:null},noop=()=>{},ctx:Record<string,unknown>={structuredClone,creativeId:'source',canvasSearch:'?template='+id+'&revision=4',templateEditTarget,templateLoadedRef:loaded,adStudioApi:{getCreative:async()=>creative},brandTemplateApi:{get:async()=>({id,revision:4,name:'Saved template',sceneGraph:chosen,provenance:{sourceCreativeId:'source'}})},isTemplateDraftCreative:()=>true,setGraph:(g:unknown)=>rendered.push(g),originalGraphRef:{current:null},normalizeBrandSnapshot:()=>({brandKitId:'kit'}),sanitizeSceneGraphForClient:(g:unknown)=>g,refreshBrandKit:async()=>{},editEpochRef:{current:0},dragBaselineRef:{current:null},lastPersistedHashRef:{current:null},defaultTemplateSelection:()=>null};
 for(const key of ['setName','setTemplateDocument','setProjectId','setSelectedLayerId','setFitZoom','setOriginalGraph','setBrandSnapshot','setCurrentVersion','setSaveState','setHistory','setFuture'])ctx[key]=noop;
 const reload=vm.runInNewContext(code,ctx) as ()=>Promise<void>;await reload();await reload();assert.deepEqual(rendered,[chosen,chosen]);
 creative.currentVersion=2;creative.sceneGraph=later as unknown as typeof base;await reload();assert.equal(rendered[2],later);
});
