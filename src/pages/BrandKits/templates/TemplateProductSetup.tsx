import React,{useState,type CSSProperties} from 'react';
import {Plus,ImagePlus,X,UserRound,ArrowRight} from 'lucide-react';
import {Skeleton} from '../../../components/ui/skeleton';
import {TemplateAssetPicker,templateModelChoices} from './TemplateAssetPicker';
import {resizeProductSlots,type TemplateProductConfiguration} from './templateProductSettings';
import {useAuthenticatedBrandAssetUrls} from '../../AdStudio/canvas/useAuthenticatedBrandAssetUrls';
import type {BrandKitSummary} from '../lib/brandKitTypes';

export function TemplateSourceThumbnail({url,label,hasAsset,model=false}:{url?:string;label:string;hasAsset:boolean;model?:boolean}){
 const [failed,setFailed]=useState(false);
 if(url&&!failed)return <img src={url} alt={label} onError={()=>setFailed(true)}/>;
 if(hasAsset&&!url&&!failed)return <Skeleton className="h-full w-full" aria-label={'Loading '+label+' preview'}/>;
 return <span className="bt-source-thumb-empty">{model?<UserRound size={22}/>:<ImagePlus size={22}/>}<span>{failed?'Preview unavailable':model?'Model':'Add photo'}</span></span>;
}
export function TemplateProductSettings({value,onChange,kit,onKitUpdated,disabled=false,showCount=true}:{value:TemplateProductConfiguration;onChange:(value:TemplateProductConfiguration)=>void;kit:BrandKitSummary;onKitUpdated:(kit:BrandKitSummary)=>void;disabled?:boolean;showCount?:boolean}){
 const [pick,setPick]=useState<number|'model'|null>(null),[manageProfiles,setManageProfiles]=useState(false);
 const urls=useAuthenticatedBrandAssetUrls(kit),models=templateModelChoices(kit);
 const selectedModel=models.find(p=>p.id===value.modelProfileId),previewModel=selectedModel||models.find(p=>p.eligible)||models[0];
 const chooseModel=(review=false)=>{setManageProfiles(review);setPick('model');};
 return <section className="bt-product-settings">
  <header><h3>Products</h3>{showCount&&<label className="xp-field bt-product-count">Product count<select disabled={disabled} value={value.slots.length} onChange={e=>onChange(resizeProductSlots(value,Number(e.target.value)))}>{[1,2,3,4].map(n=><option key={n}>{n}</option>)}</select></label>}</header>
  <div className={'bt-source-layout'+(value.slots.length===1?' bt-source-layout--single':'')}>
   <div className="bt-product-slots" style={{'--bt-products':value.slots.length} as CSSProperties}>
    {value.slots.map((slot,index)=>{
     const asset=kit.assets?.find(a=>a.id===slot.assetId),assetLabel=asset?.label||asset?.fileName||'Product photograph';
     return <article key={index} className="bt-product-card">
      <button type="button" className="bt-product-thumb" aria-label={(slot.assetId?'Change':'Add')+' photograph for '+slot.label} disabled={disabled} onClick={()=>setPick(index)}><TemplateSourceThumbnail key={slot.assetId?slot.assetId+':'+(urls[slot.assetId]||''):'empty'} url={slot.assetId?urls[slot.assetId]:undefined} hasAsset={!!slot.assetId} label={assetLabel}/></button>
      <div className="bt-product-card-fields">
       <label className="xp-field">Product {index+1}<input aria-label={'Product '+(index+1)+' name'} disabled={disabled} maxLength={80} value={slot.label} onChange={e=>onChange({...value,slots:value.slots.map((v,j)=>j===index?{...v,label:e.target.value}:v)})}/></label>
       {slot.assetId&&<span className="bt-product-asset-name" title={assetLabel}>{assetLabel}</span>}
       <div className="bt-product-card-actions"><label className="bt-shade-chip" title="Shade direction"><input aria-label={'Shade direction for product '+(index+1)} type="color" value={slot.color||'#9e2440'} disabled={disabled} onChange={e=>onChange({...value,slots:value.slots.map((v,j)=>j===index?{...v,color:e.target.value}:v)})}/></label>
        <button type="button" className="bt-product-change" disabled={disabled} onClick={()=>setPick(index)}>{slot.assetId?'Change photo':'Add photograph'}</button>
        {slot.assetId&&<button type="button" className="bt-product-clear" title="Use placeholder" aria-label={'Remove photograph from product '+(index+1)} disabled={disabled} onClick={()=>onChange({...value,slots:value.slots.map((v,j)=>j===index?{label:v.label,color:v.color}:v)})}><X size={14}/></button>}
       </div>
      </div>
     </article>;
    })}
   </div>
   <aside className="bt-model-settings">
    <div className="bt-model-controls"><label className="xp-field">Brand Model<select aria-label="Brand Model" disabled={disabled} value={value.modelProfileId||''} onChange={e=>{const id=e.target.value;if(!id||models.some(p=>p.id===id&&p.eligible))onChange({...value,modelProfileId:id||undefined});}}><option value="">No model selected</option>{models.map(p=><option key={p.id} value={p.id} disabled={!p.eligible}>{p.name}{p.eligible?'':' — '+p.status}</option>)}</select></label><button type="button" className="xp-secondary" disabled={disabled} onClick={()=>chooseModel(!models.some(p=>p.eligible))}><Plus size={14}/> Add or choose model</button></div>
    {previewModel&&<div className="bt-model-reference"><div className="bt-model-reference-thumb"><TemplateSourceThumbnail key={previewModel.assetId?previewModel.assetId+':'+(urls[previewModel.assetId]||''):'model'} url={previewModel.assetId?urls[previewModel.assetId]:undefined} hasAsset={!!previewModel.assetId} label={previewModel.name} model/></div><div className="bt-model-reference-copy"><strong>{previewModel.name}</strong><span>{selectedModel&&previewModel.eligible?'Selected':previewModel.status}</span></div>{previewModel.eligible?<button type="button" className="bt-product-change" disabled={disabled||previewModel.id===value.modelProfileId} onClick={()=>onChange({...value,modelProfileId:previewModel.id})}>{value.modelProfileId===previewModel.id?'Selected':'Select'}</button>:<button type="button" className="bt-product-change" disabled={disabled} onClick={()=>chooseModel(true)}>Review <ArrowRight size={12}/></button>}</div>}
   </aside>
  </div>
  {pick!==null&&<TemplateAssetPicker kit={kit} kind={pick==='model'?'model':'product'} initialManageProfiles={pick==='model'&&manageProfiles} onKitUpdated={onKitUpdated} onClose={()=>setPick(null)} onSelect={(assetId,profileId)=>{if(pick==='model')onChange({...value,modelProfileId:profileId});else onChange({...value,slots:value.slots.map((v,j)=>j===pick?{...v,assetId}:v)});setPick(null);}}/>}
 </section>;
}
