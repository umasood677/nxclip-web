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
