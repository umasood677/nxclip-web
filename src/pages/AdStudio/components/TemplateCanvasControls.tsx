import React,{useRef,useState} from 'react';
import type {AdSceneGraph,AdSceneLayer,AdTextLayer} from '../types';
import type {BrandKitSummary} from '../../BrandKits/lib/brandKitTypes';
import {isRasterArtwork,positionPatch,scaledPlacement,templateTextLayers} from '../lib/templateCanvasModel';
type Props={graph:AdSceneGraph;brand?:BrandKitSummary|null;selectedId:string|null;readOnly:boolean;onPatch:(id:string,patch:Partial<AdSceneLayer>)=>void;onSelect:(id:string)=>void;onMove:(id:string,x:number,y:number)=>void;onResize:(id:string,width:number,height:number)=>void;onCommit:()=>void;onCenter:(id:string)=>void;onBackground:(color:string)=>void};
function Range({label,value,min,max,step=1,disabled,onChange,onCommit}:{label:string;value:number;min:number;max:number;step?:number;disabled:boolean;onChange:(n:number)=>void;onCommit:()=>void}){
 return <label className="tc-field">{label}<span className="tc-range-value">{Number(value.toFixed(2))}</span><input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={e=>onChange(Number(e.target.value))} onPointerUp={onCommit} onKeyUp={onCommit} onBlur={onCommit}/></label>;
}
export function TemplateCanvasControls({graph,brand,selectedId,readOnly,onPatch,onSelect,onMove,onResize,onCommit,onCenter,onBackground}:Props){
 const images=graph.layers.filter(l=>l.type==='image'),logos=graph.layers.filter(l=>l.type==='logo');
 const [target,setTarget]=useState('');
 const image=images.find(l=>l.id===selectedId) ?? images.find(l=>l.id===target) ?? images.find(l=>l.visible!==false && isRasterArtwork(l)) ?? images.find(l=>l.visible!==false) ?? images[0];
 const logo=logos.find(l=>l.id===selectedId) ?? logos[0],selected=graph.layers.find(l=>l.id===selectedId);
 const selectedAssetId=selected && 'assetId' in selected && typeof selected.assetId==='string'?selected.assetId:'';
 const replaceableAssets=(brand?.assets || []).filter(a=>a.status==='ready'&&brand?.voice?.studio?.approvedAssetIds?.includes(a.id)&&(selected?.type==='logo'?a.role.startsWith('logo_'):['product_image','campaign_reference'].includes(a.role)));
 const bases=useRef(new Map<string,{width:number;height:number}>());
 if(image && !bases.current.has(image.id))bases.current.set(image.id,{width:image.width,height:image.height});
 const base=image?bases.current.get(image.id):undefined;
 const {brand:brandText}=templateTextLayers(graph);
 const disabled=(l:AdSceneLayer|undefined)=>readOnly || !l || !!l.locked;
 const move=(layer:AdSceneLayer,axis:'x'|'y',percent:number)=>{const next=positionPatch(graph,layer.id,axis,percent).layers.find(l=>l.id===layer.id);if(next){onSelect(layer.id);onMove(layer.id,next.x,next.y);}};
 const editText=(layer:AdTextLayer|undefined,text:string)=>{if(layer){onSelect(layer.id);onPatch(layer.id,{text} as Partial<AdTextLayer>);}};
 const patch=(layer:AdSceneLayer|undefined,value:Partial<AdSceneLayer>)=>{if(layer){onSelect(layer.id);onPatch(layer.id,value);}};
 const imageLabel=image&&isRasterArtwork(image)?'Artwork':image?.id.startsWith('brand-character-')?'Model':'Product';
 return <div className="tc-controls">
  <section><h3>{imageLabel==='Model'?'Model placement':'Product placement'}</h3>
   <label className="tc-field">Image layer<select value={image?.id || ''} disabled={readOnly || !images.length} onChange={e=>{onCommit();setTarget(e.target.value);onSelect(e.target.value);}}>{!images.length&&<option value="">No image layers</option>}{images.map(l=><option key={l.id} value={l.id}>{isRasterArtwork(l)?'AI artwork (whole image)':l.name || 'Image layer'}{l.visible===false?' · hidden':''}</option>)}</select></label>
   {image&&isRasterArtwork(image)&&<p className="tc-caption">The product is embedded in this artwork; placement moves the whole image.</p>}
   {image&&image.visible===false&&<p className="tc-caption">This source layer is hidden. Use the eye icon in Layers to show it.</p>}
   <Range label={imageLabel+' horizontal %'} value={image?100*image.x/graph.canvas.width:0} min={-100} max={100} disabled={disabled(image)} onChange={n=>image&&move(image,'x',n)} onCommit={onCommit}/>
   <Range label={imageLabel+' vertical %'} value={image?100*image.y/graph.canvas.height:0} min={-100} max={100} disabled={disabled(image)} onChange={n=>image&&move(image,'y',n)} onCommit={onCommit}/>
   <Range label={imageLabel+' scale'} value={image&&base?image.width/base.width:1} min={.1} max={3} step={.01} disabled={disabled(image)} onChange={n=>{if(image&&base){const p=scaledPlacement(image,base,n);onSelect(image.id);onMove(image.id,p.x,p.y);onResize(image.id,p.width,p.height);}}} onCommit={onCommit}/>
   <button className="tc-button" disabled={disabled(image)} onClick={()=>{if(image){onCommit();onSelect(image.id);onCenter(image.id);}}}>Align to safe center</button>
   <label className="tc-field">Canvas background<input type="color" value={graph.canvas.backgroundColor || '#111827'} disabled={readOnly} onInput={e=>onBackground(e.currentTarget.value)}/></label>
   {image&&isRasterArtwork(image)&&<p className="tc-caption">Canvas color sits behind the artwork. Relighting requires AI refinement.</p>}
  </section>
  <section><h3>Logo / brand text</h3><label className="tc-field">Brand text<input value={brandText?.text || ''} disabled={disabled(brandText)} onChange={e=>editText(brandText,e.target.value)} placeholder="No brand text layer"/></label>
   <Range label="Logo horizontal %" value={logo?100*logo.x/graph.canvas.width:0} min={0} max={100} disabled={disabled(logo)} onChange={n=>logo&&move(logo,'x',n)} onCommit={onCommit}/>
   <Range label="Logo vertical %" value={logo?100*logo.y/graph.canvas.height:0} min={0} max={100} disabled={disabled(logo)} onChange={n=>logo&&move(logo,'y',n)} onCommit={onCommit}/>
  </section>
  {selected&&(selected.type==='image'||selected.type==='logo')&&<section><h3>Replace selected image</h3><label className="tc-field">Approved Brand Kit asset<select value={selectedAssetId || ''} disabled={disabled(selected)} onChange={e=>{if(replaceableAssets.some(a=>a.id===e.target.value))patch(selected,{assetId:e.target.value,storageKey:undefined} as Partial<AdSceneLayer>);}}><option value={selectedAssetId || ''}>Keep current image</option>{replaceableAssets.map(a=><option key={a.id} value={a.id}>{a.label || a.role.replaceAll('_',' ')}</option>)}</select></label></section>}
  {selected&&<section><h3>Selected layer</h3><Range label="Opacity %" value={Math.round((selected.opacity??1)*100)} min={0} max={100} disabled={disabled(selected)} onChange={n=>patch(selected,{opacity:n/100})} onCommit={onCommit}/><Range label="Rotation °" value={selected.rotation??0} min={-180} max={180} disabled={disabled(selected)} onChange={n=>patch(selected,{rotation:n})} onCommit={onCommit}/></section>}
 </div>;
}
