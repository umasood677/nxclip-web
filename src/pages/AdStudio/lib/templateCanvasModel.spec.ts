import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {defaultTemplateSelection,isRasterArtwork,positionPatch,safeCenter,scaledPlacement,templateTextLayers} from './templateCanvasModel';
import {updateLayer} from './sceneGraph';
import type {AdSceneGraph,AdImageLayer} from '../types';
const fixture=():AdSceneGraph=>({schemaVersion:'1.0',canvas:{width:1000,height:1000},layers:[{id:'original',type:'image',assetId:'immutable-photo',visible:false,x:0,y:0,width:200,height:400,zIndex:1},{id:'ai-background-result',type:'image',assetId:'raster',x:0,y:0,width:1000,height:1000,zIndex:0},{id:'brand',type:'text',name:'Brand signature',text:'Brand',x:20,y:20,width:200,height:50,zIndex:3},{id:'headline',type:'text',name:'Headline',text:'Heading',x:50,y:80,width:900,height:100,zIndex:4},{id:'cta',type:'text',name:'CTA button',text:'Explore',x:80,y:900,width:200,height:50,zIndex:5}]});
test('initial selection targets visible artwork rather than a hidden source photo',()=>{const g=fixture();assert.equal(defaultTemplateSelection(g),'ai-background-result');assert.equal(isRasterArtwork(g.layers[1]),true);assert.equal(templateTextLayers(g).headline?.id,'headline');assert.equal(templateTextLayers(g).cta?.id,'cta');assert.equal(templateTextLayers(g).brand?.id,'brand');});
test('percentage placement, centered scale and safe center preserve source identity and aspect ratio',()=>{
 const g=fixture(),original=structuredClone(g);const moved=positionPatch(g,'original','x',25);assert.equal(moved.layers[0].x,250);assert.equal((moved.layers[0] as AdImageLayer).assetId,'immutable-photo');assert.deepEqual(g,original);
 const scaled=scaledPlacement(g.layers[0],{width:200,height:400},2);assert.deepEqual(scaled,{width:400,height:800,x:-100,y:-200});
 const centered=safeCenter({...g,layers:[{...g.layers[0],width:800,height:1600}]},'original');assert.equal(centered.layers[0].height,900);assert.equal(centered.layers[0].width,450);assert.equal(centered.layers[0].x,275);assert.equal(centered.layers[0].y,50);assert.equal((centered.layers[0] as AdImageLayer).assetId,'immutable-photo');
 const locked={...g,layers:[{...g.layers[0],locked:true}]};assert.equal(positionPatch(locked,'original','x',25),locked);assert.equal(safeCenter(locked,'original'),locked);assert.throws(()=>scaledPlacement(g.layers[0],{width:200,height:400},NaN));
});
test('actual editor transform callbacks commit one undo step per slider gesture and retain redo',()=>{
 const source=readFileSync(process.cwd()+'/src/pages/AdStudio/AdStudioEditor.tsx','utf8'),tree=ts.createSourceFile('editor.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),found=new Map<string,string>();
 function visit(n:ts.Node){if(ts.isVariableDeclaration(n)&&['liveMove','liveResize','commitTransform','undo','redo'].includes(n.name.getText(tree))&&n.initializer)found.set(n.name.getText(tree),n.initializer.getText(tree));ts.forEachChild(n,visit);}visit(tree);assert.equal(found.size,5);
 let graph=fixture(),history:AdSceneGraph[]=[],future:AdSceneGraph[]=[];const original=structuredClone(graph);
 const context={previewMode:false,dragBaselineRef:{current:null},updateLayer,markDirty:()=>{},setGraph:(value:AdSceneGraph|((g:AdSceneGraph)=>AdSceneGraph))=>{graph=typeof value==='function'?value(graph):value;},setHistory:(fn:(v:AdSceneGraph[])=>AdSceneGraph[])=>{history=fn(history);},setFuture:(value:AdSceneGraph[]|((v:AdSceneGraph[])=>AdSceneGraph[]))=>{future=typeof value==='function'?value(future):value;},get graph(){return graph;},get history(){return history;},get future(){return future;}};
 const code=[...found].map(([key,value])=>'const '+key+'='+value+';').join('\n')+';({liveMove,liveResize,commitTransform,undo,redo});';const handlers=vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
 handlers.liveMove('ai-background-result',100,100);handlers.liveMove('ai-background-result',150,200);handlers.liveResize('ai-background-result',800,800);handlers.commitTransform();assert.equal(history.length,1);const edited=structuredClone(graph);handlers.undo();assert.deepEqual(graph,original);handlers.redo();assert.deepEqual(graph,edited);assert.equal((graph.layers[0] as AdImageLayer).assetId,'immutable-photo');
});
