import type {AdSceneGraph,AdSceneLayer,AdTextLayer} from '../types';
import {updateLayer} from './sceneGraph';
export const isRasterArtwork=(layer:AdSceneLayer)=>layer.type==='image' && layer.id.startsWith('ai-background-');
export function defaultTemplateSelection(graph:AdSceneGraph){return graph.layers.find(l=>l.visible!==false && isRasterArtwork(l))?.id ?? graph.layers.find(l=>l.visible!==false && l.type==='image')?.id ?? graph.layers.find(l=>l.visible!==false)?.id ?? null;}
export function templateTextLayers(graph:AdSceneGraph){
 const texts=graph.layers.filter((l):l is AdTextLayer=>l.type==='text');
 const cta=texts.find(l=>/cta|call.to.action/i.test(l.name || l.id));
 const brand=texts.find(l=>/brand|signature/i.test(l.name || l.id) && l!==cta);
 const headline=texts.find(l=>/headline/i.test(l.name || l.id)) ?? texts.find(l=>l!==cta && l!==brand);
 return {headline,cta,brand};
}
export function positionPatch(graph:AdSceneGraph,id:string,axis:'x'|'y',percent:number){
 const layer=graph.layers.find(l=>l.id===id);if(!layer || layer.locked || !Number.isFinite(percent))return graph;
 return updateLayer(graph,id,{[axis]:Math.round((axis==='x'?graph.canvas.width:graph.canvas.height)*Math.max(-100,Math.min(100,percent))/100)});
}
export function scaledPlacement(layer:AdSceneLayer,base:{width:number;height:number},factor:number){
 if(!Number.isFinite(factor) || !Number.isFinite(base.width) || !Number.isFinite(base.height) || base.width<=0 || base.height<=0)throw Error('Invalid layer scale.');
 const scale=Math.max(.1,Math.min(3,factor)),width=Math.max(1,Math.round(base.width*scale)),height=Math.max(1,Math.round(base.height*scale));
 return {width,height,x:Math.round(layer.x+(layer.width-width)/2),y:Math.round(layer.y+(layer.height-height)/2)};
}
export function safeCenter(graph:AdSceneGraph,id:string){
 const layer=graph.layers.find(l=>l.id===id);if(!layer || layer.locked)return graph;
 const scale=Math.min(1,.9*graph.canvas.width/layer.width,.9*graph.canvas.height/layer.height);
 const width=Math.max(1,Math.round(layer.width*scale)),height=Math.max(1,Math.round(layer.height*scale));
 return updateLayer(graph,id,{width,height,x:Math.round((graph.canvas.width-width)/2),y:Math.round((graph.canvas.height-height)/2)});
}
