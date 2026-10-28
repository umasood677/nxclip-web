import { CREATOR_CATEGORY_NICHES } from "../../../lib/creatorNiches";
import snapshot from "./taxonomy.snapshot.json";
import type { BrandKitSummary } from "../../BrandKits/lib/brandKitTypes";
import type { AdSceneGraph } from "../types";
import type { PreviewState, ConceptId, Format } from "./model";
export const TAXONOMY = CREATOR_CATEGORY_NICHES.map(c=>{
 const source=snapshot.categories.find(s=>s.category===c.category);
 const seed=source?.niches||[];
 return {id:c.category,label:source?.label||c.label,niches:[...seed,...c.suggestions.filter(n=>!seed.some(s=>s.label===n)).map(n=>({id:n,label:n}))]};
});
export const BRAND_SCREENS = {
 "brand-info":"A brand starts with a story.","brand-category":"Find your creative territory.","brand-goals":"What does success look like?",
 "brand-assets":"Build a library with a point of view.","brand-analysis":"An identity, ready for your judgment.",
 "brand-guidelines":"Make the signature unmistakable.","brand-overview":"Your brand. Ready to create.",
 "brand-templates":"Templates with your signature.","brand-template-detail":"A reusable creative starting point.",
 "category-studio":"Different worlds. One creative workspace.","brand-manager":"Your demonstration Brand Kits.",
} as const;
export type BrandScreen = keyof typeof BRAND_SCREENS;
export const GOALS=["Increase awareness","Generate leads","Increase sales","Promote a service","Promote an event","Drive app installs","Increase engagement"] as const;
export const PERSONALITIES=["Premium","Professional","Playful","Bold","Minimal","Energetic"] as const;
export const PROFILES = [
 {id:"products",label:"Physical products",name:"ZOE",category:"beauty-skincare",niche:"makeup-grwm",color:"#b89263",secondary:"#26141d",font:"playfair_display",headline:"Presence, without a word.",cta:"Discover the signature",family:"Product hero",assets:["Product photography","Packaging detail","Logo","Background"],goals:["Product launch","Product spotlight","Promotional offer"],direction:"Sculptural light, a red focal product, restrained copy and warm metallic detail."},
 {id:"gaming",label:"Gaming",name:"NOVA ARENA",category:"Gaming",niche:"game-launches-trailers",color:"#b6ff69",secondary:"#101c29",font:"montserrat",headline:"THE NEXT LEVEL\nIS YOURS.",cta:"Join the launch",family:"Launch impact",assets:["Game artwork","Game screenshot","Platform logo","Event visual"],goals:["Game launch advertisement","Esports event promotion","Gaming platform advertisement"],direction:"Electric contrast, a cinematic arena, kinetic hierarchy and a clear launch action."},
 {id:"corporate",label:"Corporate",name:"NORTHLINE",category:"finance-business",niche:"entrepreneurship-startups",color:"#245a75",secondary:"#f0eee7",font:"inter",headline:"Build what\ncomes next.",cta:"Explore our services",family:"Service editorial",assets:["Company logo","Team imagery","Service visual","Business event"],goals:["Corporate service advertisement","Company introduction","Business event promotion"],direction:"Architectural clarity, generous space, an evidence-led service story and confident typography."},
 {id:"fashion",label:"Fashion",name:"FORME",category:"fashion-personal-styling",niche:"high-fashion-haute-couture",color:"#805849",secondary:"#e6ddd0",font:"playfair_display",headline:"A study\nin movement.",cta:"Explore the collection",family:"Collection editorial",assets:["Fashion photography","Collection image","Brand logo","Fabric detail"],goals:["Fashion collection launch","Editorial campaign","Seasonal promotion"],direction:"Oversized editorial type, fabric silhouettes, muted paper and a collection rhythm."},
 {id:"travel",label:"Travel",name:"AZURE STAYS",category:"Travel",niche:"Luxury Destinations",color:"#197b8c",secondary:"#e7d9ba",font:"playfair_display",headline:"Somewhere\nworth staying.",cta:"Explore the escape",family:"Destination story",assets:["Destination imagery","Accommodation photography","Experience visual","Brand logo"],goals:["Destination promotion","Hotel campaign","Travel experience advertisement"],direction:"Open coastal space, sunlit architecture, horizon depth and an inviting editorial message."},
] as const;
export type ProfileId=typeof PROFILES[number]["id"];
export interface DemoAsset {id:string;role:string;label:string;source:"original-fixture";approved:boolean}
export interface DemoBrand extends Pick<BrandKitSummary,"id"|"name"|"description"|"guidelines"|"colors"|"typography"|"voice"> {
 profile:ProfileId|"generic";category:string;niche:string;goal:string;personality:string;assets:DemoAsset[];
 identityApproved:boolean;guidelinesApproved:boolean;taxonomyConfirmed:boolean;website:string;
}
export interface BrandTemplate {id:string;brandId:string|null;name:string;family:string;status:"suggested"|"approved"|"rejected"|"archived";saved:boolean;revision:number;headline:string;format:Format;concept:ConceptId;layout:"hero"|"split"|"banner"|"minimal"}
export interface BrandLibrary {revision:1;kits:DemoBrand[];draft:DemoBrand;activeKitId:string|null;templates:BrandTemplate[];selectedTemplateId:string|null;generation:number;tab:"default"|"brand"}
export function profileFor(category:string){return PROFILES.find(p=>p.category===category);}
export function demoKit(profile:ProfileId,index=0):DemoBrand {
 const p=PROFILES.find(p=>p.id===profile)!;
 return {id:"demo-brand-"+profile+"-"+index,name:p.name,description:"Illustrative "+p.label.toLowerCase()+" brand for a local UX demonstration.",profile,category:p.category,niche:p.niche,goal:profile==="corporate"?"Generate leads":profile==="gaming"?"Increase awareness":"Increase sales",personality:profile==="gaming"?"Energetic":profile==="corporate"?"Professional":"Premium",assets:p.assets.map((role:string,i:number):DemoAsset=>({id:"demo-asset-"+profile+"-"+i,role,label:role+" / original illustration",source:"original-fixture",approved:true})),colors:[{role:"primary",hex:p.color},{role:"secondary",hex:p.secondary}],typography:[{role:"heading",family:p.font},{role:"body",family:"inter"}],voice:{tone:profile==="gaming"?"Energetic":"Confident",targetAudience:profile==="corporate"?"Business decision makers":"Design-conscious "+p.label.toLowerCase()+" enthusiasts",preferredCta:p.cta,creative:{visualStyle:p.direction,restrictedTreatments:"Do not invent claims, verified assets or product variants."}},guidelines:"Use the approved illustrative palette, keep brand text editable, protect source identity and respect safe margins.",identityApproved:true,guidelinesApproved:true,taxonomyConfirmed:true,website:""};
}
export function emptyDraft():DemoBrand {const d=demoKit("products",99);return {...d,id:"demo-draft",name:"",description:"",assets:[],identityApproved:false,guidelinesApproved:false,taxonomyConfirmed:false};}
export function generateBrandTemplates(kit:DemoBrand,revision:number):BrandTemplate[] {
 if(!kit.identityApproved||!kit.guidelinesApproved||!kit.taxonomyConfirmed||!kit.assets.length||kit.assets.some(a=>!a.approved))return [];
 const p=PROFILES.find(p=>p.id===kit.profile);const niche=TAXONOMY.find(c=>c.id===kit.category)?.niches.find(n=>n.id===kit.niche)?.label||kit.niche;const layouts=["hero","split","banner","minimal"] as const;
 return layouts.map((layout,i)=>({id:"demo-template-"+kit.id+"-"+revision+"-"+i,brandId:kit.id,name:kit.name+" / "+(p?.family||"Brand story")+" "+(i+1),family:(p?.family||"Brand story")+" / "+niche+" / "+kit.goal,status:"suggested",saved:false,revision,headline:(p?.headline||kit.name+" / A story worth sharing.")+(kit.goal==="Promote an event"?"\nJoin the event.":kit.goal==="Generate leads"?"\nStart a conversation.":""),format:i===2?"story":"portrait",concept:(["cinematic","editorial","spotlight","collection"] as const)[i],layout}));
}
export function initialBrandLibrary():BrandLibrary {
 const kits=PROFILES.map(p=>demoKit(p.id));return {revision:1,kits,draft:emptyDraft(),activeKitId:null,templates:[],selectedTemplateId:null,generation:0,tab:"default"};
}
export function changeCategory(d:DemoBrand,category:string):DemoBrand {
 const c=TAXONOMY.find(c=>c.id===category);if(!c)return d;
 const profile=profileFor(category);return {...d,category,niche:c.niches[0]?.id||"",profile:profile?.id||"generic",taxonomyConfirmed:false,identityApproved:false,guidelinesApproved:false,assets:[]};
}
export function identitySuggestion(d:DemoBrand,alternate=false):DemoBrand {
 const p=PROFILES.find(p=>p.id===d.profile);const color=alternate?"#916b55":p?.color||"#466b78";
 return {...d,colors:[{role:"primary",hex:color},{role:"secondary",hex:p?.secondary||"#ece7df"}],typography:[{role:"heading",family:alternate?"inter":p?.font||"inter"},{role:"body",family:"inter"}],voice:{...d.voice,tone:d.personality==="Energetic"?"Energetic":"Confident",preferredCta:p?.cta||"Discover more",creative:{...d.voice?.creative,visualStyle:p?.direction||"A clear editorial story using approved brand assets.",restrictedTreatments:"No invented claims or unapproved assets."}},identityApproved:false,guidelinesApproved:false};
}
export function templateAction(library:BrandLibrary,id:string,action:"approve"|"reject"|"save"|"duplicate"|"archive"):BrandLibrary {
 const t=library.templates.find(t=>t.id===id);if(!t)return library;
 if(action==="duplicate"){const copy={...t,id:t.id+"-copy-"+library.templates.length,name:t.name+" / Copy",status:"suggested" as const,saved:false};return {...library,templates:[...library.templates,copy]};}
 return {...library,templates:library.templates.map(item=>item.id!==id?item:{...item,...(action==="save"?{saved:true}:{status:action==="approve"?"approved":action==="reject"?"rejected":"archived"})})};
}
export function applyBrandToCampaign(s:PreviewState,kit:DemoBrand,t?:BrandTemplate):Partial<PreviewState> {
 const p=PROFILES.find(p=>p.id===kit.profile);
 return {assetSelected:true,brandContext:kit,brand:kit.profile==="products"?"zoe":"neutral",prompt:"Create a "+(p?.goals[0]||"brand advertisement")+" for "+kit.name+".",objective:kit.goal,audience:String(kit.voice?.targetAudience||"Interested customers"),direction:String(kit.voice?.creative?.visualStyle||p?.direction||"Clear brand-led composition"),headline:t?.headline||p?.headline||kit.name+" / A story worth sharing.",cta:String(kit.voice?.preferredCta||p?.cta||"Discover more"),concept:t?.concept||"cinematic",format:t?.format||s.format,brandTemplate:t,experience:undefined};
}
export function brandGraph(s:PreviewState):AdSceneGraph|null {
 const kit=s.brandContext;if(!kit)return null;
 const p=PROFILES.find(p=>p.id===kit.profile),product=kit.profile==="products",editor=s.experience?.editor;
 const dims=s.format==="landscape"?{width:1920,height:1080}:s.format==="square"?{width:1080,height:1080}:s.format==="story"?{width:1080,height:1920}:{width:1080,height:1350};
 const w=dims.width,h=dims.height,k=w/1080,layout=s.brandTemplate?.layout||({cinematic:"hero",editorial:"split",spotlight:"banner",collection:"minimal"} as const)[s.concept];
 const light=["corporate","fashion"].includes(kit.profile),ink=light?"#172e3c":"#faf6e9";
 const color=kit.colors?.find(c=>c.role==="primary")?.hex||p?.color||"#d8b98a";
 const heroX=layout==="split"?.46:layout==="minimal"?.26:0,heroW=layout==="split"?.54:layout==="minimal"?.74:1;
 const graph:AdSceneGraph={schemaVersion:"1.0",canvas:{...dims,backgroundColor:kit.colors?.find(c=>c.role==="secondary")?.hex||"#171720"},layers:[
 {id:"demo-artwork",type:"image",name:"Original illustrative "+kit.profile+" campaign artwork",assetId:product?"demo-"+s.concept:"demo-industry-"+kit.profile,x:w*heroX,y:layout==="banner"?h*.22:0,width:w*heroW,height:layout==="banner"?h*.78:h,zIndex:0,objectFit:"cover"},
 {id:"demo-accent",type:"shape",name:"Approved palette accent",shape:"rectangle",fill:color,x:w*.07,y:h*.105,width:w*.09,height:4*k,zIndex:3},
 {id:"demo-brand",type:"text",name:"Editable brand text / illustrative",x:w*(editor?.logoX??7)/100,y:h*(editor?.logoY??5)/100,width:w*.85,height:65*k,zIndex:4,text:editor?.brandText||kit.name,fontId:"inter",fontSize:27*k,letterSpacing:6*k,color:ink,fontWeight:500},
 {id:"demo-headline",type:"text",name:"Headline",x:w*.07,y:h*(kit.profile==="fashion"?.57:.15),width:w*(layout==="split"?.43:.86),height:h*.3,zIndex:4,text:s.headline,fontId:editor?.font||kit.typography?.find(t=>t.role==="heading")?.family||"inter",fontSize:(editor?.fontSize||88)*k,fontWeight:kit.profile==="gaming"?800:400,color:ink,align:editor?.align||"left",lineHeight:1.05},
 {id:"demo-cta",type:"text",name:"CTA",x:w*.07,y:h-110*k,width:w*.85,height:55*k,zIndex:4,text:s.cta.toUpperCase(),fontId:"inter",fontSize:24*k,letterSpacing:3*k,color:ink},
 ]};
 if(editor){
  const changed=editor.background!==s.concept;const back=changed?({cinematic:"#26141d",editorial:"#e8ddcc",spotlight:"#211c18",collection:"#332739"} as const)[editor.background]:(kit.colors?.find(c=>c.role==="secondary")?.hex||"#171720");
  graph.canvas.backgroundColor=back;
  graph.layers[0]={id:"demo-artwork",type:"shape",name:"Editable background",shape:"rectangle",fill:back,x:0,y:0,width:w,height:h,zIndex:0};
  graph.layers.push({id:"demo-product",type:"image",name:product?"Illustrative product / source protected":"Illustrative "+kit.profile+" focal artwork",assetId:product?"demo-product":"demo-foreground-"+kit.profile,x:w*editor.productX/100,y:h*editor.productY/100,width:Math.min(w*.8,h*.6)*(product?.7:.8)*editor.productScale,height:Math.min(w*.8,h*.6)*editor.productScale,zIndex:editor.order==="product-front"?5:1,objectFit:"contain"});
  const rgb=/^#[0-9a-f]{6}$/i.test(back)?parseInt(back.slice(1),16):0;const bright=((rgb>>16)*.299+((rgb>>8)&255)*.587+(rgb&255)*.114)>150;
  graph.layers=graph.layers.map(l=>({...l,...(l.type==="text"?{color:bright?"#172e3c":"#faf6e9"}:{}),visible:!editor.hidden.includes(l.id),locked:editor.locked.includes(l.id)}));
 }

 return graph;
}
export function restoreBrandLibrary(v:unknown):BrandLibrary {
 const initial=initialBrandLibrary();if(!v||typeof v!=="object")return initial;const l=v as BrandLibrary;
 const valid=(k:unknown):k is DemoBrand=>{if(!k||typeof k!=="object")return false;const b=k as DemoBrand;return typeof b.id==="string"&&b.id.startsWith("demo-")&&typeof b.name==="string"&&TAXONOMY.some(c=>c.id===b.category&&c.niches.some(n=>n.id===b.niche))&&Array.isArray(b.assets)&&Array.isArray(b.colors)&&Array.isArray(b.typography);};
 if(l.revision!==1)return initial;const kits=Array.isArray(l.kits)?l.kits.filter(valid).slice(-30):initial.kits;
 const templates=Array.isArray(l.templates)?l.templates.filter(t=>t&&typeof t.id==="string"&&t.id.startsWith("demo-")&&kits.some(k=>k.id===t.brandId)&&["suggested","approved","rejected","archived"].includes(t.status)&&["portrait","square","story","landscape"].includes(t.format)).slice(-100):[];
 return {...initial,kits,templates,draft:valid(l.draft)?l.draft:initial.draft,activeKitId:kits.some(k=>k.id===l.activeKitId)?l.activeKitId:null,selectedTemplateId:templates.some(t=>t.id===l.selectedTemplateId)?l.selectedTemplateId:null,generation:Number.isInteger(l.generation)?l.generation:0,tab:l.tab==="brand"?"brand":"default"};
}
