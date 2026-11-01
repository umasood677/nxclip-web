import type {BrandKitSummary} from '../lib/brandKitTypes';
import type {TemplateProductConfiguration} from './templateProductSettings';
import {suggestedProductCount} from './templateProductSettings';
import {eligibleTemplateProfiles} from './TemplateAssetPicker';

export type ProductSelectionMode='automatic'|'specific';
export type TemplateProductChoice={key:string;label:string;assetId?:string;sku?:string|null;kind:'product'|'photograph';approved:boolean};
export const TEMPLATE_IDEA_SUGGESTIONS=[
 {name:'Luxury Product Hero',idea:'A cinematic luxury product hero with sculpted warm lighting, elegant negative space and refined brand typography. Use the supplied product references.'},
 {name:'Beauty Editorial',idea:'An editorial beauty advertisement with a confident visual hierarchy, soft directional light and sophisticated brand colors. Use only the selected products and optional approved Brand Model.'},
 {name:'Product Collection',idea:'A coordinated product collection with balanced spacing, clear shade differentiation and a premium campaign composition. Show only products supported by the supplied references.'},
] as const;
export function brandKitProductChoices(kit:BrandKitSummary):TemplateProductChoice[]{
 const approved=new Set(kit.voice?.studio?.approvedAssetIds||[]);
 return [
  ...(kit.products||[]).filter(p=>p.status==='active').sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0)).map(p=>({key:'product:'+p.id,label:p.name.slice(0,80),sku:p.sku,kind:'product' as const,approved:false})),
  ...(kit.assets||[]).filter(a=>a.role==='product_image'&&a.status==='ready').map(a=>({key:'photo:'+a.id,label:(a.label||a.fileName||'Product photograph').slice(0,80),assetId:a.id,kind:'photograph' as const,approved:approved.has(a.id)})),
 ];
}
/** Reference preparation only: no provider ranking, invented variants or inferred product/photo association. */
export function automaticTemplateProducts(kit:BrandKitSummary,idea:string,modelProfileId?:string):TemplateProductConfiguration{
 const photos=brandKitProductChoices(kit).filter(p=>p.assetId&&p.approved);
 const count=suggestedProductCount(idea)||(/collection/i.test(idea)?Math.max(1,Math.min(4,photos.length)):1);
 return {schemaVersion:1,slots:Array.from({length:count},(_,i)=>photos[i]?{label:photos[i].label,assetId:photos[i].assetId,color:'#9e2440'}:{label:count===1?'Choose a product':'Product reference '+(i+1),color:'#9e2440'}),...(modelProfileId?{modelProfileId}:{})};
}
export function chooseTemplateProduct(c:TemplateProductConfiguration,index:number,choice:TemplateProductChoice):TemplateProductConfiguration{
 if(index<0||index>c.slots.length||index>3)throw Error('Choose up to four products.');
 const slots=c.slots.map(s=>({...s})),slot={label:choice.label,color:slots[index]?.color||'#9e2440',...(choice.assetId?{assetId:choice.assetId}:{})};
 if(index===slots.length)slots.push(slot);else slots[index]=slot;
 return {...c,slots};
}
export function templateCreatorIssues(kit:BrandKitSummary,c:TemplateProductConfiguration,idea:string,native:boolean,layoutValid:boolean,draftOnly=false):string[]{
 const issues:string[]=[];
 if(!kit.version)issues.push('Reload the Brand Kit before continuing.');
 if(!native&&!idea.trim())issues.push('Describe your creative idea.');
 if(!layoutValid)issues.push('Choose a composition that supports this format.');
 if(c.modelProfileId&&!eligibleTemplateProfiles(kit).some(p=>p.id===c.modelProfileId))issues.push('Review the selected model authorization or choose No model.');
 for(const slot of c.slots){
  if(!slot.assetId){if(!native&&!draftOnly)issues.push('Choose a photograph for '+slot.label+'.');continue;}
  const asset=kit.assets?.find(a=>a.id===slot.assetId&&a.role==='product_image'&&a.status==='ready');
  if(!asset)issues.push(slot.label+': choose an available Brand Kit photograph.');
  else if(!kit.voice?.studio?.approvedAssetIds?.includes(asset.id))issues.push(slot.label+': approve the photograph using Review photo.');
 }
 return issues;
}
