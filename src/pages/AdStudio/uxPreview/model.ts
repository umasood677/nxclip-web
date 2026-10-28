import { BRAND_SCREENS, PROFILES, brandGraph, restoreBrandLibrary, type BrandLibrary, type DemoBrand, type BrandTemplate } from "./brandPrototypeModel";
import { ROADMAP_TITLES, restoreExperience, type ExperienceState } from "./roadmapModel";
import type { AdSceneGraph } from "../types";

export const PREVIEW_PATH = "/create/ad/ux-preview";
export const STORAGE_KEY = "nxclip.ad-studio.ux-preview.v1";
export const SCREENS = ["home","brief","templates","template","assets","progress","concepts","detail","compare","preview","edit","variations","workspace","formats","export","performance",...Object.keys(ROADMAP_TITLES) as (keyof typeof ROADMAP_TITLES)[],...Object.keys(BRAND_SCREENS) as (keyof typeof BRAND_SCREENS)[]] as const;
export type Screen = typeof SCREENS[number];
export type Journey = "prompt" | "example" | "template";
export const FORMATS = { landscape:{label:"Landscape · 16:9",width:1920,height:1080}, portrait: {label:"Portrait · 4:5",width:1080,height:1350}, square:{label:"Square · 1:1",width:1080,height:1080}, story:{label:"Story · 9:16",width:1080,height:1920} } as const;
export type Format = keyof typeof FORMATS;
export const CONCEPTS = [
  {id:"cinematic",name:"Cinematic Luxury",headline:"Presence,\nwithout a word.",description:"A sculptural silhouette, warm metallic light and a deep garnet palette.",tone:"Intimate · Sculptural",color:"#26141d"},
  {id:"editorial",name:"Editorial Beauty",headline:"The art of\nbeing yourself.",description:"Warm paper, architectural framing and generous editorial space.",tone:"Refined · Expressive",color:"#e8ddcc"},
  {id:"spotlight",name:"Product Spotlight",headline:"One detail.\nAll the difference.",description:"A precise hero composition with a luminous collar and a focused message.",tone:"Focused · Confident",color:"#352c20"},
  {id:"collection",name:"Collection Campaign",headline:"One signature.\nEvery expression.",description:"A campaign rhythm built from the same illustrative product, repeated.",tone:"Rhythmic · Considered",color:"#332739"},
] as const;
export type ConceptId = typeof CONCEPTS[number]["id"];
export interface SavedCreative {id:string;concept:ConceptId;headline:string;format:Format;cta:string;brand?:"zoe"|"neutral";experience?:ExperienceState;brandContext?:DemoBrand;brandTemplate?:BrandTemplate}
export interface PreviewState {
 brandLibrary?:BrandLibrary;brandContext?:DemoBrand;brandTemplate?:BrandTemplate;experience?:ExperienceState;version:1;journey:Journey;brand:"zoe"|"neutral";prompt:string;objective:string;audience:string;direction:string;
 concept:ConceptId;headline:string;cta:string;format:Format;assetSelected:boolean;
 saved:SavedCreative[];variationsReady:boolean;failNext:boolean;exported:boolean;published:boolean;
}
export const INITIAL: PreviewState = {
 version:1,journey:"prompt",brand:"zoe",prompt:"Create a premium beauty campaign around a red lipstick in black and gold packaging.",
 objective:"Introduce a signature beauty ritual",audience:"Design-conscious beauty enthusiasts",direction:"Elegant light, restrained composition, confident editorial typography.",
 concept:"cinematic",headline:CONCEPTS[0].headline,cta:"Discover the signature",format:"portrait",assetSelected:true,
 saved:[],variationsReady:false,failNext:false,exported:false,published:false,
};
export type Action = {type:"update";patch:Partial<Omit<PreviewState,"version"|"saved">>}|{type:"start";journey:Journey}|{type:"concept";id:ConceptId}|{type:"save";snapshot?:Omit<SavedCreative,"id">}|{type:"open";id:string}|{type:"reset"};
export function reducer(state:PreviewState,action:Action):PreviewState {
 switch(action.type){
 case "update":return {...state,...action.patch};
 case "start":return {...state,journey:action.journey,exported:false,published:false};
 case "concept":return {...state,concept:action.id,headline:state.brandContext?(PROFILES.find(p=>p.id===state.brandContext?.profile)?.headline||state.headline):CONCEPTS.find(c=>c.id===action.id)!.headline,experience:state.experience?{...state.experience,editor:{...state.experience.editor,background:action.id}}:undefined,exported:false};
 case "save":{const item:SavedCreative={id:"demo-creative-"+(Math.max(0,...state.saved.map(c=>Number(c.id.split("-").at(-1))||0))+1),concept:state.concept,headline:state.headline,format:state.format,cta:state.cta,brand:state.brand,experience:state.experience?JSON.parse(JSON.stringify(state.experience)):undefined,brandContext:state.brandContext,brandTemplate:state.brandTemplate,...action.snapshot};return {...state,saved:[...state.saved,item]};}
 case "open":{const item=state.saved.find(c=>c.id===action.id);return item?{...state,concept:item.concept,headline:item.headline,format:item.format,cta:item.cta,brand:item.brand||state.brand,experience:item.experience,brandContext:item.brandContext,brandTemplate:item.brandTemplate}:state;}
 case "reset":return {...INITIAL,saved:[]};
 }
}
export function restore(raw:string|null):PreviewState {
 try {
  const p:unknown=JSON.parse(raw||"null");
  if(!p||typeof p!=="object")return {...INITIAL,saved:[]};
  const v=p as Record<string,unknown>;
  if(v.version!==1||!CONCEPTS.some(c=>c.id===v.concept)||!Object.hasOwn(FORMATS,String(v.format)))return {...INITIAL,saved:[]};
  const text=(key:string,fallback:string)=>typeof v[key]==="string"?(v[key] as string).slice(0,2000):fallback;
  const saved=Array.isArray(v.saved)?v.saved.filter((x):x is SavedCreative=>Boolean(x&&typeof x==="object"&&typeof x.id==="string"&&typeof x.headline==="string"&&typeof x.cta==="string"&&CONCEPTS.some(c=>c.id===x.concept)&&Object.hasOwn(FORMATS,x.format))).slice(-50):[];
  const restored:PreviewState = {...INITIAL,journey:["prompt","example","template"].includes(String(v.journey))?v.journey as Journey:"prompt",brand:v.brand==="neutral"?"neutral":"zoe",concept:v.concept as ConceptId,format:v.format as Format,prompt:text("prompt",INITIAL.prompt),objective:text("objective",INITIAL.objective),audience:text("audience",INITIAL.audience),direction:text("direction",INITIAL.direction),headline:text("headline",INITIAL.headline),cta:text("cta",INITIAL.cta),assetSelected:v.assetSelected===true,saved,variationsReady:v.variationsReady===true};
  if(v.experience)restored.experience=restoreExperience(v.experience,restored);
  restored.saved=restored.saved.map(item=>({...item,experience:item.experience?restoreExperience(item.experience,{...restored,...item}):undefined}));
  if(v.brandLibrary)restored.brandLibrary=restoreBrandLibrary(v.brandLibrary);
  if(v.brandContext&&restored.brandLibrary){restored.brandContext=restored.brandLibrary.kits.find(k=>k.id===(v.brandContext as DemoBrand).id);}
  if(v.brandTemplate&&restored.brandLibrary)restored.brandTemplate=restored.brandLibrary.templates.find(t=>t.id===(v.brandTemplate as BrandTemplate).id);
  const defaultTemplate=v.brandTemplate as BrandTemplate|undefined;
  if(!restored.brandTemplate&&defaultTemplate?.brandId===null&&defaultTemplate.id?.startsWith("demo-default-")&&Object.hasOwn(FORMATS,defaultTemplate.format)&&["hero","split","banner","minimal"].includes(defaultTemplate.layout))restored.brandTemplate=defaultTemplate;
  return restored;
 }catch{return {...INITIAL,saved:[]};}
}
export function screenFrom(value:string|null):Screen {return SCREENS.includes(value as Screen)?value as Screen:"home";}
export function graphFor(state:PreviewState,concept:ConceptId=state.concept):AdSceneGraph {
 const branded=brandGraph({...state,concept});if(branded)return branded;
 const {width,height}=FORMATS[state.format],scale=width/1080;
 const editorial=concept==="editorial",color=editorial?"#29221c":"#f9f1e5";
 const headline=concept===state.concept?state.headline:CONCEPTS.find(c=>c.id===concept)!.headline;
 const graph:AdSceneGraph = {schemaVersion:"1.0",canvas:{width,height,backgroundColor:CONCEPTS.find(c=>c.id===concept)!.color},layers:[
 {id:"demo-artwork",type:"image",name:"Illustrative product artwork",assetId:"demo-"+concept,x:0,y:0,width,height,zIndex:0,objectFit:"cover"},
 {id:"demo-brand",type:"text",name:"Editable demonstration brand text",x:75*scale,y:65*scale,width:920*scale,height:75*scale,zIndex:1,text:state.brand==="zoe"?"ZOE / ATELIER":"YOUR BRAND",fontId:"inter",fontSize:27*scale,fontWeight:400,color,letterSpacing:9*scale},
 {id:"demo-headline",type:"text",name:"Headline",x:75*scale,y:155*scale,width:900*scale,height:250*scale,zIndex:2,text:headline,fontId:"playfair_display",fontSize:concept==="editorial"?83*scale:90*scale,fontWeight:400,color,lineHeight:1.08},
 {id:"demo-cta",type:"text",name:"Call to action",x:75*scale,y:height-120*scale,width:900*scale,height:50*scale,zIndex:3,text:state.cta.toUpperCase(),fontId:"inter",fontSize:23*scale,fontWeight:400,color,letterSpacing:4*scale},
 ]};
 if(state.experience){
  const e=state.experience.editor;
  graph.layers[0]={...graph.layers[0],assetId:"demo-bg-"+e.background} as AdSceneGraph["layers"][number];
  graph.layers.push({id:"demo-product",type:"image",name:"Illustrative product / source protected",assetId:"demo-product",x:width*e.productX/100,y:height*e.productY/100,width:Math.min(width*.74,height*.6)*.7*e.productScale,height:Math.min(width*.74,height*.6)*e.productScale,zIndex:e.order==="product-front"?5:1,objectFit:"contain"});
  graph.layers=graph.layers.map(l=>{
   let next:AdSceneGraph["layers"][number]={...l,visible:!e.hidden.includes(l.id),locked:e.locked.includes(l.id)};
   if(l.type==="text")next={...next,zIndex:4,color:e.background==="editorial"?"#29221c":"#f9f1e5"} as AdSceneGraph["layers"][number];
   if(l.id==="demo-brand")next={...next,x:width*e.logoX/100,y:height*e.logoY/100,text:e.brandText} as AdSceneGraph["layers"][number];
   if(l.id==="demo-headline")next={...next,fontId:e.font,fontSize:e.fontSize*scale,align:e.align} as AdSceneGraph["layers"][number];
   return next;
  });
 }
 return graph;
}


export function syncPreviewPatch(state:PreviewState,patch:Partial<Omit<PreviewState,"version"|"saved">>):Partial<Omit<PreviewState,"version"|"saved">> {
 return state.experience&&!Object.prototype.hasOwnProperty.call(patch,"experience")&&(patch.headline!==undefined||patch.cta!==undefined)?{...patch,experience:{...state.experience,editor:{...state.experience.editor,...(patch.headline!==undefined?{headline:patch.headline}:{}),...(patch.cta!==undefined?{cta:patch.cta}:{})}}}:patch;
}
