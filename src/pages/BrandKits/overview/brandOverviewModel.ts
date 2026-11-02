import {homeEntryPath} from '../../AdStudio/lib/homeEntryFlow';
import {characterReviewIssues,modelProfileForAsset} from '../guided/brandCharacterModel';
import type {BrandKitSummary,BrandCharacterProfile} from '../lib/brandKitTypes';
export function brandOverviewPaths(id:string){
 const base='/brands/'+encodeURIComponent(id);
 return {overview:base+'/overview',edit:base+'/guided?step=brand',identity:base+'/guided?step=identity',assets:base+'/guided?step=assets',guidelines:base+'/guided?step=guidelines',ready:base+'/guided?step=ready',templates:base+'/templates?tab=brand',generate:base+'/templates?tab=brand&mode=ai',createAd:homeEntryPath({brandId:id})};
}
export function overviewInventory(kit:BrandKitSummary){
 const assets=(kit.assets||[]).filter(a=>a.status==='ready'),images=assets.filter(a=>a.mimeType?.startsWith('image/'));
 return {assets,images,logos:images.filter(a=>a.role?.startsWith('logo')),productPhotos:images.filter(a=>a.role==='product_image'),products:kit.products||[],characters:kit.voice?.studio?.characters||[],reviewed:kit.voice?.studio?.identityApproved===true&&kit.voice?.studio?.guidelinesApproved===true};
}
export function overviewCharacterState(profile:BrandCharacterProfile,kit:BrandKitSummary,now=new Date()){
 if(profile.status==='archived')return {label:'Archived',usable:false};
 if(profile.status!=='approved')return {label:'Draft',usable:false};
 const issues=characterReviewIssues(profile,kit.assets||[],now);
 if(issues.some(i=>/expired|invalid/i.test(i)))return {label:'Authorization expired',usable:false};
 if(issues.length)return {label:'Review needed',usable:false};
 if(profile.referenceAssetIds.some(id=>!kit.voice?.studio?.approvedAssetIds?.includes(id)))return {label:'Reference review needed',usable:false};
 if(!profile.permissions.scopes.includes('ad-studio'))return {label:'Scope limited',usable:false};
 return {label:'Approved',usable:true};
}


export function overviewHeaderAssets(kit:BrandKitSummary){
 const inventory=overviewInventory(kit),approved=new Set(kit.voice?.studio?.approvedAssetIds||[]);
 const profile=inventory.characters.find(p=>overviewCharacterState(p,kit).usable&&p.referenceAssetIds.some(id=>inventory.images.some(a=>a.id===id)));
 return {product:inventory.productPhotos.find(a=>approved.has(a.id))||inventory.productPhotos[0],model:profile?inventory.images.find(a=>profile.referenceAssetIds.includes(a.id)):undefined};
}

export function overviewModelEntries(kit:BrandKitSummary){
 const inventory=overviewInventory(kit),profiles=inventory.characters;
 const referenceIds=new Set(profiles.flatMap(profile=>profile.referenceAssetIds));
 const images=inventory.images.filter(asset=>asset.role==="brand_model"||referenceIds.has(asset.id));
 const entries=images.map(asset=>{const profile=modelProfileForAsset(profiles,inventory.assets,asset.id);return {key:"asset:"+asset.id,asset,profile};});
 const represented=new Set(entries.filter(entry=>entry.profile).map(entry=>entry.profile!.id));
 const profileOnly=profiles.filter(profile=>!represented.has(profile.id)&&!profile.referenceAssetIds.some(id=>images.some(asset=>asset.id===id))).map(profile=>({key:"profile:"+profile.id,asset:undefined,profile}));
 return {entries:[...entries,...profileOnly],imageCount:images.length,profileCount:profiles.length};
}
