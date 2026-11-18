import React,{useMemo,useRef,useState} from 'react';
import {BrandProductPhotos} from './BrandProductPhotos';
import {useAuthenticatedBrandAssetUrls} from '../../AdStudio/canvas/useAuthenticatedBrandAssetUrls';
import {ASSET_SLOTS,isCampaignStyleReference} from '../lib/assetSlots';
import type {BrandAssetEntry,BrandKitSummary,BrandCharacterProfile} from '../lib/brandKitTypes';
import {brandApi} from '../../../services/apiClient';
import {toast} from 'sonner';
import {templateAssetApprovalPatch} from '../templates/templateAssetApproval';

type Props={modelProfiles?:BrandCharacterProfile[];brandId:string;assets:BrandAssetEntry[];onKitUpdated:(kit:BrandKitSummary)=>void;onManageCharacters?:()=>void;onUseModelImage?:(assetId:string)=>void;modelProfilePanel?:React.ReactNode;approvalKit?:BrandKitSummary;approvalDisabled?:boolean};
const LOGO_ROLES=ASSET_SLOTS.filter(slot=>slot.role!=='product_image'&&slot.role!=='brand_model').map(slot=>({role:slot.role,label:slot.label}));
export function BrandAssetsSection({brandId,assets,onKitUpdated,onManageCharacters,onUseModelImage,modelProfiles=[],modelProfilePanel,approvalKit,approvalDisabled}:Props){
 const kit=useMemo(()=>({id:brandId,name:'',assets}),[brandId,assets]),assetUrls=useAuthenticatedBrandAssetUrls(kit);
 const [changingApproval,setChangingApproval]=useState<string>();
 const inFlight=useRef(false);
 async function updateAssetApproval(assetId:string,approved:boolean){
  if(!approvalKit||approvalDisabled||inFlight.current)return;
  inFlight.current=true;
  setChangingApproval(assetId);
  try{
   const updated=await brandApi.updateKit(brandId,templateAssetApprovalPatch(approvalKit,assetId,approved));
   onKitUpdated(updated);
   toast.success(approved?'Asset approved for creative use.':'Creative-use approval revoked.');
  }catch(error){
   toast.error(error instanceof Error?error.message:'Could not update asset approval.');
  }finally{
   inFlight.current=false;
   setChangingApproval(undefined);
  }
 }
 return <div className="space-y-5 bpp-assets" id={'brand-'+brandId+'-assets'}>

 <BrandProductPhotos key={brandId+':logos'} brandId={brandId} assets={assets} urls={assetUrls} onKitUpdated={onKitUpdated} role="logo_primary" roleOptions={LOGO_ROLES} title="Logos & campaign references" addLabel="Add logo or reference" singleRow/>
 <BrandProductPhotos key={brandId+':products'} brandId={brandId} assets={assets} urls={assetUrls} onKitUpdated={onKitUpdated}
  approval={approvalKit?.voice?.studio ? {approvedIds:approvalKit.voice.studio.approvedAssetIds??[],changingApproval,disabled:approvalDisabled,onChange:updateAssetApproval}:undefined}/>
 <div className={"bp-model-workspace"+(modelProfilePanel?" bp-model-workspace--with-profiles":"")}>  <BrandProductPhotos key={brandId+':models'} brandId={brandId} assets={assets} urls={assetUrls} onKitUpdated={onKitUpdated} role="brand_model" modelProfiles={modelProfiles} onManageCharacters={onManageCharacters} onUseModelImage={onUseModelImage}/>{modelProfilePanel&&<aside className="bp-model-profiles">{modelProfilePanel}</aside>}</div>
 <BrandProductPhotos key={brandId+':additional'} brandId={brandId}
  assets={assets.filter(asset=>!ASSET_SLOTS.some(slot=>slot.role===asset.role))}
  urls={assetUrls} onKitUpdated={onKitUpdated} role="other" title="Additional assets" addLabel="Add additional image"
  description="Supporting files and older references. Approve eligible images to use them as style references in Ad Studio."
  approval={approvalKit?.voice?.studio ? {
   approvedIds:approvalKit.voice.studio.approvedAssetIds??[],changingApproval,disabled:approvalDisabled,onChange:updateAssetApproval,
   eligible:asset=>isCampaignStyleReference(asset,approvalKit),
  }:undefined}/>

 </div>;
}
