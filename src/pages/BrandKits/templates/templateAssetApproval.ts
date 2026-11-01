import {readyBrandSourceIds} from '../lib/readyBrandSources';
import type {BrandKitSummary} from '../lib/brandKitTypes';
/** Change source approval only. BrandService deep-merges studio; omitted profiles remain untouched. */
export function templateAssetApprovalPatch(kit:BrandKitSummary,assetId:string){
 const studio=kit.voice?.studio;
 if(!studio||!Number.isInteger(kit.version))throw Error('Reload the Brand Kit before approving a source.');
 if(!kit.assets?.some(a=>a.id===assetId&&a.status==='ready'))throw Error('Choose a ready image from this Brand Kit.');
 const patch={...studio,approvedAssetIds:[...new Set([...readyBrandSourceIds(studio.approvedAssetIds||[],kit.assets),assetId])]};
 delete patch.characters;
 return {expectedVersion:kit.version,voice:{studio:patch}};
}
