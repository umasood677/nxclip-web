import type { ConceptId, Format, PreviewState } from "./model";
export const ROADMAP_TITLES = {
 director:"A creative partner. A clear point of view.",
 "brand-intelligence":"The details that make a brand.",
 "product-lab":"Preserve the product. Prepare the possibility.",
 "visual-lab":"Build the world around your product.",
 composition:"An advertisement, considered layer by layer.",
 "advanced-canvas":"Precision, with room to explore.",
 "variation-lab":"Change the expression. Keep the signature.",
 adaptation:"Designed for wherever it goes.",
 "campaign-manager":"A campaign with a memory.",
 "motion-studio":"From a still to a story.",
 delivery:"The final detail is the handoff.",
 "dna-quality":"A creative signature you can carry forward.",
 preflight:"Know what's ready before you create.",
} as const;
export type RoadmapScreen = keyof typeof ROADMAP_TITLES;
export interface EditorSnapshot {
 productX:number;productY:number;productScale:number;logoX:number;logoY:number;
 font:"inter"|"playfair_display"|"montserrat";fontSize:number;align:"left"|"center"|"right";
 background:ConceptId;headline:string;cta:string;hidden:string[];locked:string[];order:"product-front"|"type-front";
 maskInset:number;safeZones:boolean;brandText:string;
}
export interface Proposal {kind:"strategy"|"refinement"|"dna"|"quality";title:string;rationale:string;headline:string;cta:string;direction:string;audience:string}
export interface CreativeVersion {id:string;label:string;editor:EditorSnapshot}
export interface DemoVariation {id:string;axis:string;concept:ConceptId;headline:string;format:Format;editor:EditorSnapshot}
export interface ExperienceState {
 revision:1;editor:EditorSnapshot;past:EditorSnapshot[];future:EditorSnapshot[];versions:CreativeVersion[];
 proposal:Proposal|null;recommendationRevision:number;isolation:"unprepared"|"review"|"approved-illustration"|"rejected";maskNotes:string;
 reference:"original-text"|"local-editorial"|"missing-external";mood:"sculptural"|"soft"|"bold";visualCandidatesReady:boolean;
 dna:EditorSnapshot|null;dnaLocks:string[];qualityReviewed:boolean;variationAxes:string[];variations:DemoVariation[];
 platform:"Instagram"|"Meta Feed"|"YouTube";placements:Format[];reframed:boolean;
 collection:string;history:string[];creativeStatus:"Draft"|"In review"|"Approved demo";
 libraryVersion:number;libraryPending:number|null;
 motion:{duration:6|10|15|30;camera:"push-in"|"pan"|"static";product:"float"|"reveal"|"none";type:"fade"|"slide"|"none";video:"deterministic"|"provider-planned";music:"none"|"ambient-demo";sound:boolean;voice:boolean;script:string;voiceStart:number;volume:number;easing:"linear"|"easeInOut";keyframe:number;format:Format};
 delivery:{type:"PNG"|"JPEG"|"MP4";destination:"Download"|"Instagram"|"Meta";date:string;time:string;state:"idle"|"queued"|"complete"|"failed";failNext:boolean;scheduled:boolean};
}
export function initialExperience(s:Pick<PreviewState,"concept"|"headline"|"cta"|"brand"|"format"|"brandContext">):ExperienceState {
 return {revision:1,editor:{productX:35,productY:35,productScale:1,logoX:7,logoY:5,font:(["inter","playfair_display","montserrat"].includes(s.brandContext?.typography?.[0]?.family||"")?s.brandContext!.typography![0].family:"playfair_display") as EditorSnapshot["font"],fontSize:88,align:"left",background:s.concept,headline:s.headline,cta:s.cta,hidden:[],locked:[],order:"type-front",maskInset:0,safeZones:false,brandText:s.brandContext?.name||(s.brand==="zoe"?"ZOE / ATELIER":"YOUR BRAND")},past:[],future:[],versions:[],proposal:null,recommendationRevision:0,isolation:"unprepared",maskNotes:"",reference:"original-text",mood:"sculptural",visualCandidatesReady:false,dna:null,dnaLocks:[],qualityReviewed:false,variationAxes:["style","headline"],variations:[],platform:"Instagram",placements:[s.format],reframed:false,collection:"Signature campaign",history:[],creativeStatus:"Draft",libraryVersion:1,libraryPending:null,motion:{duration:10,camera:"push-in",product:"float",type:"fade",video:"deterministic",music:"none",sound:false,voice:false,script:"A signature, entirely your own.",voiceStart:1,volume:70,easing:"easeInOut",keyframe:5,format:s.format},delivery:{type:"PNG",destination:"Download",date:"",time:"12:00",state:"idle",failNext:false,scheduled:false}};
}
const cloneEditor=(e:EditorSnapshot):EditorSnapshot=>({...e,hidden:[...e.hidden],locked:[...e.locked]});
export function commitEditor(s:ExperienceState,patch:Partial<EditorSnapshot>):ExperienceState {
 return {...s,editor:{...cloneEditor(s.editor),...patch},past:[...s.past,cloneEditor(s.editor)].slice(-30),future:[],history:[...s.history,"Creative edit "+(s.history.length+1)].slice(-60)};
}
export function stepHistory(s:ExperienceState,redo=false):ExperienceState {
 const from=redo?s.future:s.past;if(!from.length)return s;
 const editor=cloneEditor(from[from.length-1]);
 return {...s,editor,past:redo?[...s.past,cloneEditor(s.editor)]:s.past.slice(0,-1),future:redo?s.future.slice(0,-1):[...s.future,cloneEditor(s.editor)]};
}
export function saveVersion(s:ExperienceState):ExperienceState {
 const v={id:"demo-version-"+(Math.max(0,...s.versions.map(v=>Number(v.id.split("-").at(-1))||0))+1),label:"Version "+(Math.max(0,...s.versions.map(v=>Number(v.id.split("-").at(-1))||0))+1),editor:cloneEditor(s.editor)};
 return {...s,versions:[...s.versions,v].slice(-20),history:[...s.history,"Captured "+v.label].slice(-60)};
}
export function restoreVersion(s:ExperienceState,id:string):ExperienceState {const v=s.versions.find(v=>v.id===id);return v?commitEditor(s,v.editor):s;}
export function makeProposal(s:PreviewState,e:ExperienceState,kind:Proposal["kind"]):Proposal {
 const alternate=e.recommendationRevision%2===1;
 return {kind,title:kind==="strategy"?"A quieter kind of confidence":kind==="dna"?"Carry the signature forward":kind==="quality"?"Make room for the focal product":"Give the message more space",rationale:"Deterministic demonstration proposal using the selected "+(s.brandContext?.name||(s.brand==="zoe"?"ZOE study":"Default Brand"))+" context. Review before applying; no AI inference.",headline:s.brandContext?(alternate?"A new perspective.\n"+s.brandContext.name:s.headline):alternate?"A ritual. A signature.":"Make your presence felt.",cta:s.brandContext?String(s.brandContext.voice?.preferredCta||s.cta):alternate?"Explore the ritual":"Discover your signature",direction:s.brandContext?String(s.brandContext.voice?.creative?.visualStyle||s.direction):alternate?"Soft editorial light with warm paper and generous margins.":"Sculptural light, a single focal product and restrained typography.",audience:s.brandContext?String(s.brandContext.voice?.targetAudience||s.audience):alternate?"Beauty enthusiasts who value a personal ritual":"Design-conscious beauty enthusiasts"};
}
export function generateVariations(s:PreviewState,e:ExperienceState):DemoVariation[] {
 const concepts:ConceptId[]=["cinematic","editorial","spotlight","collection"];
 return e.variationAxes.map((axis,i)=>{const concept=axis==="style"&&!e.dnaLocks.includes("palette")?concepts[i%4]:s.concept;const editor=cloneEditor(e.editor);if(axis==="style"){if(!e.dnaLocks.includes("palette"))editor.background=e.editor.background==="editorial"?"cinematic":"editorial";if(!e.dnaLocks.includes("typography"))editor.font=e.editor.font==="inter"?"playfair_display":"inter";}if(axis==="background"&&!e.dnaLocks.includes("palette"))editor.background="editorial";if(axis==="composition"&&!e.dnaLocks.includes("productPosition"))editor.productX=22;if(axis==="headline")editor.headline="Your signature. Your story.";return{id:"demo-variation-"+axis,axis,concept,headline:editor.headline,format:axis==="platform"?"square":s.format,editor};});
}
export function validEditor(v:unknown):v is EditorSnapshot {
 if(!v||typeof v!=="object")return false;const e=v as EditorSnapshot;
 return ["productX","productY","productScale","logoX","logoY","fontSize","maskInset"].every(k=>Number.isFinite(e[k as keyof EditorSnapshot]))&&e.productX>=0&&e.productX<=80&&e.productY>=0&&e.productY<=80&&e.productScale>=.5&&e.productScale<=1.5&&e.logoX>=0&&e.logoX<=80&&e.logoY>=0&&e.logoY<=30&&e.fontSize>=36&&e.fontSize<=120&&e.maskInset>=0&&e.maskInset<=10&&["cinematic","editorial","spotlight","collection"].includes(e.background)&&["inter","playfair_display","montserrat"].includes(e.font)&&["left","center","right"].includes(e.align)&&typeof e.headline==="string"&&typeof e.cta==="string"&&typeof e.brandText==="string"&&Array.isArray(e.hidden)&&Array.isArray(e.locked);
}
export function restoreExperience(value:unknown,s:Pick<PreviewState,"concept"|"headline"|"cta"|"brand"|"format">):ExperienceState {
 const initial=initialExperience(s);if(!value||typeof value!=="object")return initial;
 const v=value as ExperienceState;if(v.revision!==1||!validEditor(v.editor))return initial;
 const strings=(a:unknown,fallback:string[])=>Array.isArray(a)?a.filter(x=>typeof x==="string").slice(-60):fallback;
 const formats=(a:unknown)=>strings(a,[s.format]).filter(x=>["portrait","square","story","landscape"].includes(x)) as Format[];
 return {...initial,editor:v.editor,past:Array.isArray(v.past)?v.past.filter(validEditor).slice(-30):[],future:Array.isArray(v.future)?v.future.filter(validEditor).slice(-30):[],versions:Array.isArray(v.versions)?v.versions.filter(x=>x&&typeof x.id==="string"&&typeof x.label==="string"&&validEditor(x.editor)).slice(-20):[],dna:validEditor(v.dna)?v.dna:null,dnaLocks:strings(v.dnaLocks,[]),history:strings(v.history,[]),variationAxes:strings(v.variationAxes,initial.variationAxes),placements:formats(v.placements),collection:typeof v.collection==="string"?v.collection.slice(0,100):initial.collection,creativeStatus:["Draft","In review","Approved demo"].includes(v.creativeStatus)?v.creativeStatus:"Draft",isolation:["unprepared","review","approved-illustration","rejected"].includes(v.isolation)?v.isolation:"unprepared",maskNotes:typeof v.maskNotes==="string"?v.maskNotes.slice(0,2000):"",reference:["original-text","local-editorial","missing-external"].includes(v.reference)?v.reference:"original-text",mood:["sculptural","soft","bold"].includes(v.mood)?v.mood:"sculptural",visualCandidatesReady:v.visualCandidatesReady===true,qualityReviewed:v.qualityReviewed===true,reframed:v.reframed===true,libraryVersion:Number.isInteger(v.libraryVersion)&&v.libraryVersion>0?v.libraryVersion:1,motion:{...initial.motion,...(v.motion&&typeof v.motion==="object"?v.motion:{}),duration:[6,10,15,30].includes(v.motion?.duration)?v.motion.duration:10},delivery:{...initial.delivery,...(v.delivery&&typeof v.delivery==="object"?v.delivery:{}),state:"idle",scheduled:false,failNext:false}};
}
