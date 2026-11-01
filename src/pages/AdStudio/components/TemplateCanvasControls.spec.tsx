import React from 'react';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import {TemplateCanvasControls} from './TemplateCanvasControls';
import {LayerList} from './LayerList';
import {AD_STUDIO_FONTS} from '../lib/adFonts';
import * as model from '../lib/templateCanvasModel';
import type {AdSceneGraph} from '../types';
const graph:AdSceneGraph={schemaVersion:'1.0',canvas:{width:1000,height:1000},layers:[{id:'product',name:'Original product photograph with a fully readable layer name',type:'image',assetId:'product-photo',x:100,y:200,width:200,height:400,zIndex:1},{id:'headline',name:'Headline',type:'text',text:'Actual heading',fontSize:60,x:100,y:50,width:800,height:150,zIndex:2},{id:'cta',name:'CTA button',type:'text',text:'Explore',x:100,y:900,width:300,height:60,zIndex:3},{id:'logo',name:'Approved logo',type:'logo',assetId:'mark',x:850,y:50,width:100,height:100,zIndex:4}]};
const callbacks={onPatch:()=>{},onSelect:()=>{},onMove:()=>{},onResize:()=>{},onCommit:()=>{},onCenter:()=>{},onBackground:()=>{}};
test('advanced inspector exposes the prototype control groups without selecting a text layer',()=>{
 const html=renderToStaticMarkup(<TemplateCanvasControls graph={graph} selectedId='product' readOnly={false} {...callbacks}/>);
 for(const label of ['Product placement','Product horizontal %','Product vertical %','Product scale','Align to safe center','Typography','Headline','CTA','Heading font','Heading size','Text alignment','Logo / brand text','Logo horizontal %','Logo vertical %'])assert.ok(html.includes(label),label);
 assert.match(html,/Actual heading/);assert.doesNotMatch(html,/Select a text layer to refine|Layer properties/);
});
test('embedded products are described as whole artwork rather than independent editable product pixels',()=>{
 const raster={...graph,layers:[{...graph.layers[0],id:'ai-background-generated'}]};const html=renderToStaticMarkup(<TemplateCanvasControls graph={raster} selectedId='ai-background-generated' readOnly={false} {...callbacks}/>);
 assert.match(html,/Artwork horizontal/);assert.match(html,/moves the whole image/);assert.match(html,/Relighting requires AI refinement/);assert.doesNotMatch(html,/Product horizontal/);
});
test('advanced layer list uses readable names and only selected-layer actions; stack view remains available',()=>{
 const props={layers:graph.layers,selectedLayerId:'product',onSelect:()=>{},onToggleVisible:()=>{},onToggleLock:()=>{},onDuplicate:()=>{},onDelete:()=>{},onReorder:()=>{}};
 const advanced=renderToStaticMarkup(<LayerList {...props} presentation='advanced'/>);assert.match(advanced,/fully readable layer name/);assert.match(advanced,/Toggle visibility/);assert.match(advanced,/Toggle lock/);assert.match(advanced,/Layer order/);assert.equal((advanced.match(/>Duplicate</g)||[]).length,1);assert.doesNotMatch(advanced,/Stack/);
 const stack=renderToStaticMarkup(<LayerList {...props}/>);assert.match(stack,/Stack/);
});
test('actual placement, typography and replacement handlers call existing editor adapters',()=>{
 const text=readFileSync(process.cwd()+'/src/pages/AdStudio/components/TemplateCanvasControls.tsx','utf8'),tree=ts.createSourceFile('controls.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),functions=tree.statements.filter(n=>ts.isFunctionDeclaration(n));
 const code=functions.map(n=>n.getText(tree).replace(/^export /,'')).join('\n')+';TemplateCanvasControls;';
 type Element={type:unknown;props:Record<string,unknown>;children:unknown[]};
 const calls:{kind:string;values:unknown[]}[]=[];const component=vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText,{...model,AD_STUDIO_FONTS,React:{createElement:(type:unknown,props:Record<string,unknown>,...children:unknown[])=>({type,props:props||{},children})},useRef:(v:unknown)=>({current:v}),useState:(v:unknown)=>[v,()=>{}]});
 const record=(kind:string)=>(...values:unknown[])=>calls.push({kind,values});
 const result=component({graph,brand:{assets:[{id:'approved-product',label:'Approved product',role:'product_image',status:'ready'},{id:'unapproved-product',label:'Unavailable product',role:'product_image',status:'ready'}],voice:{studio:{approvedAssetIds:['approved-product']}}},selectedId:'product',readOnly:false,...callbacks,onMove:record('move'),onPatch:record('patch'),onCommit:record('commit'),onSelect:record('select')});
 function nodes(value:unknown):Element[]{return Array.isArray(value)?value.flatMap(nodes):value&&typeof value==='object'&&'children'in value?[value as Element,...nodes((value as Element).children)]:[];}
 const all=nodes(result),horizontal=all.find(n=>n.props.label==='Product horizontal %');assert.ok(horizontal);(horizontal.props.onChange as (n:number)=>void)(25);(horizontal.props.onCommit as ()=>void)();assert.deepEqual(calls.find(c=>c.kind==='move')?.values,['product',250,200]);assert.equal(calls.filter(c=>c.kind==='commit').length,1);
 const textarea=all.find(n=>n.type==='textarea');assert.ok(textarea);(textarea.props.onChange as (e:unknown)=>void)({target:{value:'Edited headline'}});assert.equal(calls.filter(c=>c.kind==='patch')[0].values[0],'headline');assert.equal((calls.filter(c=>c.kind==='patch')[0].values[1] as {text:string}).text,'Edited headline');
 const replacement=all.find(n=>n.type==='select'&&n.props.value==='product-photo');assert.ok(replacement);const replace=replacement.props.onChange as (e:unknown)=>void;
 const before=calls.filter(c=>c.kind==='patch').length;replace({target:{value:'unapproved-product'}});assert.equal(calls.filter(c=>c.kind==='patch').length,before);
 replace({target:{value:'approved-product'}});assert.equal((calls.filter(c=>c.kind==='patch').at(-1)!.values[1] as {assetId:string}).assetId,'approved-product');

});

test('preview mode disables advanced editing controls and destructive layer actions',()=>{
 const controls=renderToStaticMarkup(<TemplateCanvasControls graph={graph} selectedId='product' readOnly {...callbacks}/>);assert.match(controls,/disabled=""/);
 const layers=renderToStaticMarkup(<LayerList layers={graph.layers} selectedLayerId='product' presentation='advanced' readOnly onSelect={()=>{}} onToggleVisible={()=>{}} onToggleLock={()=>{}} onDuplicate={()=>{}} onDelete={()=>{}} onReorder={()=>{}}/>);
 assert.match(layers,/<button[^>]*disabled=""[^>]*>Delete/);assert.match(layers,/<button[^>]*disabled=""[^>]*>Toggle visibility/);
});
