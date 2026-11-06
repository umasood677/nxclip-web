import {resolveProductShade} from './templateProductShade';
import React,{useState,type CSSProperties} from 'react';
import {Plus,ImagePlus,X,UserRound,ArrowRight,ChevronDown,Package} from 'lucide-react';
import {Skeleton} from '../../../components/ui/skeleton';
import {Popover,PopoverTrigger,PopoverContent} from '../../../components/ui/popover';
import {TemplateAssetPicker,templateModelChoices} from './TemplateAssetPicker';
import type {TemplateProductConfiguration} from './templateProductSettings';
import {brandKitProductChoices,chooseTemplateProduct,productShadeColor,type TemplateProductChoice,type ProductSelectionMode} from './templateCreatorSetup';
import {useTemplateAssetUrls} from './useTemplateAssetUrls';
import type {BrandKitSummary} from '../lib/brandKitTypes';

export function TemplateSourceThumbnail({url,label,hasAsset,model=false}:{url?:string;label:string;hasAsset:boolean;model?:boolean}){
 const [failed,setFailed]=useState(false);
 if(url&&!failed)return <img src={url} alt={label} onError={()=>setFailed(true)}/>;
 if(hasAsset&&!url&&!failed)return <Skeleton className="h-full w-full" aria-label={'Loading '+label+' preview'}/>;
 return <span className="bt-source-thumb-empty">{model?<UserRound size={22}/>:<ImagePlus size={22}/>}<span>{failed?'Preview unavailable':model?'Model':'Add photo'}</span></span>;
}
export function TemplateProductChooser({label,choices,urls,disabled,onChoose,onPhoto,add=false}:{label:string;choices:TemplateProductChoice[];urls:Record<string,string>;disabled:boolean;onChoose:(choice:TemplateProductChoice)=>void;onPhoto:()=>void;add?:boolean}){
 const [open,setOpen]=useState(false);
 return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><button type="button" className={add?'bt-add-product':'bt-product-selector'} disabled={disabled} aria-label={add?'Add product':'Choose Brand Kit product: '+label}>{add?<Plus size={14}/>:<Package size={13}/>}<span>{label}</span>{!add&&<ChevronDown size={14}/>}</button></PopoverTrigger>
 <PopoverContent align="start" className="bt-product-menu" aria-label="Brand Kit products">
  {!choices.length?<p>No product references yet.</p>:<div className="bt-product-options">{choices.map(choice=><button type="button" key={choice.key} className="bt-product-option" onClick={()=>{onChoose(choice);setOpen(false);}}>
   <span className="bt-product-option-thumb">{choice.assetId?<TemplateSourceThumbnail url={urls[choice.assetId]} hasAsset label={choice.label}/>:<Package size={20}/>}</span>
   <span><strong>{choice.label}</strong><small>{choice.kind==='product'?(choice.sku?'SKU '+choice.sku+' · Choose a photo':'Product · Choose a photo'):choice.approved?'Approved photograph':'Photograph · Review needed'}</small></span>
  </button>)}</div>}
  <button type="button" className="bt-product-menu-upload" onClick={()=>{setOpen(false);onPhoto();}}><ImagePlus size={14}/> Upload or choose a photo</button>
 </PopoverContent></Popover>;
}
export function TemplateProductSettings({value,onChange,kit,onKitUpdated,disabled=false,modelRequired=false,creativeIdea='',onShadeChange,selectionMode='specific',onSelectionModeChange}:{value:TemplateProductConfiguration;onChange:(value:TemplateProductConfiguration)=>void;kit:BrandKitSummary;onKitUpdated:(kit:BrandKitSummary)=>void;disabled?:boolean;modelRequired?:boolean;creativeIdea?:string;onShadeChange?:(index:number,color:string)=>void;showCount?:boolean;selectionMode?:ProductSelectionMode;onSelectionModeChange?:(mode:ProductSelectionMode)=>void}){
 const [pick,setPick]=useState<number|'model'|null>(null),[manageProfiles,setManageProfiles]=useState(false);
 const urls=useTemplateAssetUrls(kit,(kit.assets||[]).filter(a=>a.role==="product_image"||a.role==="brand_model").map(a=>a.id)),models=templateModelChoices(kit),choices=brandKitProductChoices(kit),automatic=selectionMode==='automatic';
 const selectedModel=models.find(p=>p.id===value.modelProfileId),previewModel=selectedModel||models.find(p=>p.eligible)||models[0];
 const chooseModel=(review=false)=>{setManageProfiles(review);setPick('model');};
 const selectProduct=(index:number,choice:TemplateProductChoice)=>onChange(chooseTemplateProduct(value,index,choice));
 const addIndex=value.slots.length===1&&!value.slots[0].assetId&&value.slots[0].label==='Choose a product'?0:value.slots.length;
 return <section className="bt-product-settings">
  <header><h3>Brand Kit products</h3>{onSelectionModeChange&&<div className="bt-product-mode" role="group" aria-label="Product selection"><button type="button" disabled={disabled} aria-pressed={automatic} onClick={()=>onSelectionModeChange('automatic')}>Let AI choose</button><button type="button" disabled={disabled} aria-pressed={!automatic} onClick={()=>onSelectionModeChange('specific')}>Choose products</button></div>}</header>
  <div className={'bt-source-layout'+(value.slots.length===1?' bt-source-layout--single':'')}>
   <div className="bt-product-slots" style={{'--bt-products':value.slots.length} as CSSProperties}>
    {value.slots.map((slot,index)=>{
     const asset=kit.assets?.find(a=>a.id===slot.assetId),assetLabel=asset?.label||asset?.fileName||'Product photograph',approved=!!slot.assetId&&!!kit.voice?.studio?.approvedAssetIds?.includes(slot.assetId);
     return <article key={index} className="bt-product-card">
      <button type="button" className="bt-product-thumb" aria-label={(slot.assetId?'Change':'Add')+' photograph for '+slot.label} disabled={disabled} onClick={()=>setPick(index)}><TemplateSourceThumbnail key={slot.assetId?slot.assetId+':'+(urls[slot.assetId]||''):'empty'} url={slot.assetId?urls[slot.assetId]:undefined} hasAsset={!!slot.assetId} label={assetLabel}/></button>
      <div className="bt-product-card-fields">
       <TemplateProductChooser label={slot.label} choices={choices} urls={urls} disabled={disabled} onChoose={choice=>selectProduct(index,choice)} onPhoto={()=>setPick(index)}/>
       {slot.assetId&&<span className="bt-product-asset-name" title={assetLabel}>{assetLabel}</span>}
       <div className="bt-product-card-actions"><label className="bt-shade-chip" title={resolveProductShade(kit,slot.label,creativeIdea,value.slots.length===1).source}><input aria-label={'Shade direction for product '+(index+1)} type="color" value={slot.color||'#808080'} disabled={disabled} onChange={e=>{onShadeChange?.(index,e.target.value);onChange({...value,slots:value.slots.map((v,j)=>j===index?{...v,color:e.target.value}:v)});}}/></label>
        <button type="button" className="bt-product-change" disabled={disabled} onClick={()=>setPick(index)}>{slot.assetId?(approved?'Change photo':'Review photo'):'Add photograph'}</button>
        {value.slots.length>1&&<button type="button" className="bt-product-clear" title="Remove product" aria-label={'Remove '+slot.label} disabled={disabled} onClick={()=>onChange({...value,slots:value.slots.filter((_,j)=>j!==index)})}><X size={14}/></button>}
       </div>
      </div>
     </article>;
    })}
   </div>
   <aside className="bt-model-settings">
    <div className="bt-model-controls"><label className="xp-field"><span>Brand Model <span className="bt-field-optional">{modelRequired?"Required for this idea":"Optional"}</span></span><select aria-label="Brand Model" aria-required={modelRequired} disabled={disabled} value={value.modelProfileId||''} onChange={e=>{const id=e.target.value;if(!id||models.some(p=>p.id===id&&p.eligible))onChange({...value,modelProfileId:id||undefined});}}><option value="">No model</option>{models.filter(p=>p.eligible||p.id===value.modelProfileId).map(p=><option key={p.id} value={p.id} disabled={!p.eligible}>{p.name}{p.eligible?'':' — '+p.status}</option>)}</select></label><button type="button" className="xp-secondary" disabled={disabled} onClick={()=>chooseModel(!models.some(p=>p.eligible))}><Plus size={14}/> Add or choose model</button></div>
    {previewModel&&<div className="bt-model-reference"><div className="bt-model-reference-thumb"><TemplateSourceThumbnail key={previewModel.assetId?previewModel.assetId+':'+(urls[previewModel.assetId]||''):'model'} url={previewModel.assetId?urls[previewModel.assetId]:undefined} hasAsset={!!previewModel.assetId} label={previewModel.name} model/></div><div className="bt-model-reference-copy"><strong>{previewModel.name}</strong><span>{selectedModel&&previewModel.eligible?'Selected':previewModel.status}</span></div>{previewModel.eligible?<button type="button" className="bt-product-change" disabled={disabled||previewModel.id===value.modelProfileId} onClick={()=>onChange({...value,modelProfileId:previewModel.id})}>{value.modelProfileId===previewModel.id?'Selected':'Select'}</button>:<button type="button" className="bt-product-change" disabled={disabled} onClick={()=>chooseModel(true)}>Review <ArrowRight size={12}/></button>}</div>}
   </aside>
  </div>
  {!automatic&&value.slots.length<4&&<div className="bt-product-add-row"><TemplateProductChooser add label="Add product" choices={choices} urls={urls} disabled={disabled} onChoose={choice=>selectProduct(addIndex,choice)} onPhoto={()=>setPick(addIndex)}/><span>{value.slots.filter(s=>s.assetId||s.label!=='Choose a product').length} selected · Up to 4</span></div>}
  {automatic&&<span className="bt-auto-reference-caption">{value.slots.filter(s=>s.assetId).length} approved reference{value.slots.filter(s=>s.assetId).length===1?'':'s'} supplied from your Brand Kit</span>}
  {pick!==null&&<TemplateAssetPicker kit={kit} kind={pick==='model'?'model':'product'} initialManageProfiles={pick==='model'&&manageProfiles} onKitUpdated={onKitUpdated} onClose={()=>setPick(null)} onSelect={(assetId,profileId)=>{if(pick==='model')onChange({...value,modelProfileId:profileId});else{const asset=kit.assets?.find(a=>a.id===assetId);selectProduct(pick,{key:'photo:'+assetId,label:(asset?.label||asset?.fileName||'Product photograph').slice(0,80),color:productShadeColor(kit,asset?.label||asset?.fileName||''),assetId,kind:'photograph',approved:true});}setPick(null);}}/>}
 </section>;
}
