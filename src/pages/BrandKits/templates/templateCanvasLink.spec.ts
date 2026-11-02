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
