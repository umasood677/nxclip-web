import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function loadFunction(path:string,name:string,context:Record<string,unknown>) {
 const source=readFileSync(path,'utf8'),tree=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const declaration=tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);
 assert.ok(declaration);
 return vm.runInNewContext(ts.transpileModule(declaration.getText(tree).replace(/^export /,''),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+';'+name,context);
}
test('canonical renderer retains timed playback while explicit authoring can show all layers',()=>{
 let draws=0;const context={save(){},restore(){},fillText(){draws++}},layer={startMs:100,endMs:200,lines:[{text:'Caption',x:10,baseline:30}],outline:0};
 const draw=loadFunction('src/lib/clipTypography/canonicalLayout.ts','drawCanonicalLayout',{validateTypographyLayout:(p:unknown)=>p,resolveLayerFaceId:()=> 'face',parity:{faces:[{id:'face',weight:700,style:'normal',sha256:'hash'}]},loader:{getFontLoadStatus:()=> 'loaded'},configure:()=>{}});
 const plan={faceId:'face',rendererSha256:'hash',layers:[layer]};
 draw(context,plan,99);assert.equal(draws,0);draw(context,plan,100);assert.equal(draws,1);draw(context,plan,200);assert.equal(draws,1);draw(context,plan,999,{ignoreTime:true});assert.equal(draws,2);
});
test('live drag changes only its target layer and keeps glyph boxes in frame',()=>{
 const shift=loadFunction('src/pages/ClipEditor/ClipTypographyOverlay.tsx','planWithLivePosition',{});
 const other={id:'other',lines:[]},plan={width:100,height:100,layers:[{id:'target',lines:[{x:20,baseline:30,width:40}]},other]};
 const result=shift(plan,{layerId:'target',positionX:.94,verticalAnchor:.94});
 assert.equal(result.layers[1],other);assert.equal(plan.layers[0].lines[0].x,20);assert.ok(result.layers[0].lines[0].x+result.layers[0].lines[0].width<=100);assert.ok(result.layers[0].lines[0].baseline<=100);
});
