import {resolveAdFontFamily} from '../../AdStudio/lib/adFonts';
import {loadBrandFontPreviews} from '../lib/brandFontPreview';
import type {AdSceneGraph} from '../../AdStudio/types';
export function reviewImageUrls(graph:AdSceneGraph,urls:Readonly<Record<string,string>>):string[]|null{
 const ids=[...new Set(graph.layers.filter(l=>l.visible!==false&&(l.type==='image'||l.type==='logo')).flatMap(l=>'assetId'in l&&l.assetId?[l.assetId]:[]))];
 return ids.some(id=>!urls[id])?null:ids.map(id=>urls[id]);
}
type PreviewImage=Pick<HTMLImageElement,'onload'|'onerror'|'src'> & {decode?:()=>Promise<void>};
export function preloadReviewImages(urls:readonly string[],create:()=>PreviewImage=()=>new Image()):Promise<void>{
 return Promise.all([...new Set(urls)].map(url=>new Promise<void>((resolve,reject)=>{
  const image=create();image.onload=()=>{const decoded=image.decode?.();if(decoded)void decoded.then(resolve,reject);else resolve();};image.onerror=()=>reject(Error('Preview image unavailable'));image.src=url;
 }))).then(()=>{});
}

export type ReviewMediaPhase='loading'|'ready'|'failed';
/** Binding can include authenticated GETs; do not confuse it with image decode failure. */
export function watchReviewMedia(sources:readonly string[]|null,waiting:boolean,onPhase:(phase:ReviewMediaPhase)=>void,decode=preloadReviewImages,clock:{set:(fn:()=>void,ms:number)=>unknown;clear:(id:unknown)=>void}={set:(fn,ms)=>setTimeout(fn,ms),clear:id=>clearTimeout(id as ReturnType<typeof setTimeout>)}){
 let active=true;onPhase('loading');let timer:unknown;
 if(!waiting){timer=clock.set(()=>{if(active)onPhase('failed');},sources===null?60000:30000);if(sources!==null)void decode(sources).then(()=>{if(active){clock.clear(timer);onPhase('ready');}},()=>{if(active){clock.clear(timer);onPhase('failed');}});}
 return()=>{active=false;if(timer!==undefined)clock.clear(timer);};
}

/** One read-only media recovery per review identity; never replay generation. */
export function createReviewMediaRecovery(){
 let identity='',used=false;
 return (key:string,phase:ReviewMediaPhase,reload:()=>void)=>{
  if(key!==identity){identity=key;used=false;}
  if(phase!=='failed'||used||!key)return false;
  used=true;reload();return true;
 };
}

export function reviewFontRequests(graph:AdSceneGraph|null|undefined):Array<[string,string]>{
 const requests=new Map<string,[string,string]>();
 for(const layer of graph?.layers||[]){if(layer.visible===false||layer.type!=='text'||!('text' in layer)||!layer.text?.trim())continue;
  const family=resolveAdFontFamily(layer.fontId||layer.fontFamily).split(',')[0].replace(/["\\]/g,'');
  const spec=String(layer.fontWeight||400)+' 16px "'+family+'"';requests.set(spec,[spec,layer.text]);
 }
 return [...requests.values()];
}
export async function preloadReviewFonts(requests:readonly [string,string][],fonts:Pick<FontFaceSet,'load'>|undefined=typeof document==='undefined'?undefined:document.fonts,prepare=loadBrandFontPreviews):Promise<void>{
 if(!fonts)return;
 let registeredRequests=requests;
 // document.fonts.load() succeeds with an empty array for an unregistered
 // family. Register the existing checksum-verified bundled face first.
 if(typeof document!=='undefined'&&fonts===document.fonts){
   const entries=requests.map(([spec])=>{const match=spec.match(/^(\d+) 16px "(.+)"$/);if(!match)throw Error('Invalid scene font request.');return {family:match[2],weight:match[1],style:'normal'};});
   const loaded=await prepare(entries,requests.map(([,text])=>text).join(' '));
   if(Object.values(loaded).some(face=>face.status!=='loaded'))throw Error('The exact preview font could not load.');
   registeredRequests=requests.map(([spec,text],index)=>{
     const entry=entries[index],face=loaded[[entry.family,entry.weight,entry.style].join('/')];
     if(!face)throw Error('The preview font was not registered.');
     return [String(face.weight)+' 16px "'+face.family+'"',text] as [string,string];
   });
 }
 await Promise.all(registeredRequests.map(([spec,text])=>fonts.load(spec,text)));
}
