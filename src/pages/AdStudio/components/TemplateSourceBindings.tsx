import React,{useState} from 'react';import {ImagePlus,UserRound} from 'lucide-react';
import {TemplateAssetPicker} from '../../BrandKits/templates/TemplateAssetPicker';
import {bindProductLayer,sourceSlot,resizeTemplateSourceGraph} from '../../BrandKits/templates/templateProductSettings';
import type {BrandKitSummary} from '../../BrandKits/lib/brandKitTypes';import type {AdSceneGraph} from '../types';
export function TemplateSourceBindings({graph,brand,selectedId,readOnly,onGraph,onKitUpdated,onRefine}:{graph:AdSceneGraph;brand:BrandKitSummary;selectedId:string|null;readOnly:boolean;onGraph:(graph:AdSceneGraph,selected:string)=>void;onKitUpdated:(kit:BrandKitSummary)=>void;onRefine:()=>void}){
 const [pick,setPick]=useState<'product'|'model'|null>(null),[error,setError]=useState('');
 const layer=graph.layers.find(l=>l.id===selectedId),selectedModel=layer?.id.startsWith('brand-character-'),model=selectedModel?layer:graph.layers.find(l=>l.id.startsWith('brand-character-'));
 const count=graph.layers.filter(sourceSlot).length;
 const product=sourceSlot(layer)||!!layer&&layer.type==='image'&&'assetId'in layer&&brand.assets?.some(a=>a.id===layer.assetId&&a.role==='product_image'),hasArtwork=graph.layers.some(l=>l.id.startsWith('ai-background-'));
 return <section className="tc-source-bindings"><h3>Template sources</h3>{count>0&&<label className="tc-field">Product count<select value={count} disabled={readOnly} onChange={e=>{const next=Number(e.target.value);if(next<count&&!window.confirm('Remove extra product slots from this draft? Original files remain unchanged.'))return;try{const updated=resizeTemplateSourceGraph(graph,next);onGraph(updated,updated.layers.find(sourceSlot)?.id||selectedId||'');setError('');}catch(e){setError(e instanceof Error?e.message:'Product slots could not be changed.');}}}>{[1,2,3,4].map(n=><option key={n}>{n}</option>)}</select></label>}
 {product&&<><p className="tc-caption">{layer?.name}</p><button type="button" className="tc-button" disabled={readOnly||layer?.locked} onClick={()=>setPick('product')}><ImagePlus size={14}/> Upload or choose product</button></>}
 <button type="button" className="tc-button" disabled={readOnly||model?.locked} onClick={()=>setPick('model')}><UserRound size={14}/>{model?'Change Brand Model':'Add Brand Model'}</button>
 {model&&<button type="button" className="tc-button" disabled={readOnly||model.locked} onClick={()=>{const next=structuredClone(graph);next.layers=next.layers.filter(l=>l.id!==model.id);for(const group of next.layers)if(group.type==='group'&&'children'in group&&Array.isArray(group.children))group.children=group.children.filter(id=>id!==model.id);onGraph(next,next.layers[0]?.id||'');}}>Remove model</button>}
 {hasArtwork&&<><p className="tc-caption">Product changes update the source. Refine the artwork to apply them. Models remain editable photo layers.</p><button type="button" className="tc-button" disabled={readOnly} onClick={onRefine}>Refine with updated sources</button></>}
 {error&&<p role="alert" className="tc-caption">{error}</p>}
 {pick&&<TemplateAssetPicker kit={brand} kind={pick} onKitUpdated={onKitUpdated} onClose={()=>setPick(null)} onSelect={(assetId,profileId)=>{
  try{
   if(pick==='product'&&layer){const result=bindProductLayer(graph,layer.id,assetId);onGraph(result.graph,result.selectedId);}
   else if(profileId){const id='brand-character-'+profileId;if(graph.layers.some(l=>l.id===id&&l.id!==model?.id))throw Error('This model is already in the template.');
    const result=model?bindProductLayer(graph,model.id,assetId):{graph:structuredClone(graph),selectedId:id};
    if(model){const target=result.graph.layers.find(l=>l.id===result.selectedId)!;const old=target.id;target.id=id;target.name=brand.voice?.studio?.characters?.find(p=>p.id===profileId)?.name||'Brand Model';target.visible=true;for(const group of result.graph.layers)if(group.type==='group'&&'children'in group&&Array.isArray(group.children))group.children=group.children.map(v=>v===old?id:v);}
    else result.graph.layers.push({id,type:'image',name:brand.voice?.studio?.characters?.find(p=>p.id===profileId)?.name||'Brand Model',assetId,objectFit:'contain',x:graph.canvas.width*.05,y:graph.canvas.height*.2,width:graph.canvas.width*.35,height:graph.canvas.height*.6,zIndex:Math.max(0,...graph.layers.map(l=>l.zIndex))+1});
    onGraph(result.graph,id);
   }
   setError('');setPick(null);
  }catch(e){setError(e instanceof Error?e.message:'Source could not be replaced.');setPick(null);}
 }}/>} </section>;
}
