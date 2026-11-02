import {useMemo} from 'react';
import {useAuthenticatedBrandAssetUrls} from '../../AdStudio/canvas/useAuthenticatedBrandAssetUrls';
import type {BrandKitSummary} from '../lib/brandKitTypes';
import type {AdSceneGraph} from '../../AdStudio/types';
export function templateImageIds(graphs:readonly (AdSceneGraph|null|undefined)[]){return [...new Set(graphs.flatMap(g=>g?.layers.filter(l=>l.visible!==false&&(l.type==='image'||l.type==='logo')).flatMap(l=>'assetId' in l&&l.assetId?[l.assetId]:[])||[]))].sort();}
/** Hydrate only the images used by this surface, without changing Brand Kit bindings. */
export function useTemplateAssetUrls(kit:BrandKitSummary|null|undefined,ids:readonly string[]){
 const key=JSON.stringify([...new Set(ids)].sort());
 const subset=useMemo(()=>{if(!kit)return null;const selected=new Set(JSON.parse(key) as string[]);return {...kit,assets:(kit.assets||[]).filter(a=>selected.has(a.id))};},[kit,key]);
 return useAuthenticatedBrandAssetUrls(subset);
}
