import type {BrandAssetEntry} from './brandKitTypes';
/** Retain existing approval only for currently attached, ready sources. Never approve a replacement. */
export function readyBrandSourceIds(ids:readonly string[],assets:readonly BrandAssetEntry[]|undefined){
 if(ids.length&&!assets)throw Error('Reload the Brand Kit before reviewing source approval.');
 const ready=new Set((assets||[]).filter(a=>a.status==='ready').map(a=>a.id));
 return [...new Set(ids)].filter(id=>ready.has(id));
}
