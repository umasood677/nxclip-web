import {readyBrandSourceIds} from '../lib/readyBrandSources';
import type {BrandKitSummary} from '../lib/brandKitTypes';
/** Change source approval only. BrandService deep-merges studio; omitted profiles remain untouched. */
export function templateAssetApprovalPatch(kit:BrandKitSummary,assetId:string,approved=true){
 const studio=kit.voice?.studio;
 if(!studio||!Number.isInteger(kit.version))throw Error('Reload the Brand Kit before changing source approval.');
 if(!kit.assets?.some(a=>a.id===assetId&&a.status==='ready'))throw Error('Choose a ready image from this Brand Kit.');
 const current=readyBrandSourceIds(studio.approvedAssetIds||[],kit.assets);
 const patch={...studio,approvedAssetIds:approved?[...new Set([...current,assetId])]:current.filter(id=>id!==assetId)};
 delete patch.characters;
 return {expectedVersion:kit.version,voice:{studio:patch}};
}
