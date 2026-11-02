import React,{useMemo} from 'react';
import {FileImage} from 'lucide-react';
import {BrandAssetPhoto} from './BrandAssetPhoto';
import {BrandProductPhotos} from './BrandProductPhotos';
import {useAuthenticatedBrandAssetUrls} from '../../AdStudio/canvas/useAuthenticatedBrandAssetUrls';
import {ASSET_SLOTS} from '../lib/assetSlots';
import type {BrandAssetEntry,BrandKitSummary,BrandCharacterProfile} from '../lib/brandKitTypes';

type Props={modelProfiles?:BrandCharacterProfile[];brandId:string;assets:BrandAssetEntry[];onKitUpdated:(kit:BrandKitSummary)=>void;onManageCharacters?:()=>void;onUseModelImage?:(assetId:string)=>void;modelProfilePanel?:React.ReactNode};
const LOGO_ROLES=ASSET_SLOTS.filter(slot=>slot.role!=='product_image'&&slot.role!=='brand_model').map(slot=>({role:slot.role,label:slot.label}));
export function BrandAssetsSection({brandId,assets,onKitUpdated,onManageCharacters,onUseModelImage,modelProfiles=[],modelProfilePanel}:Props){
 const kit=useMemo(()=>({id:brandId,name:'',assets}),[brandId,assets]),assetUrls=useAuthenticatedBrandAssetUrls(kit);
 return <div className="space-y-5 bpp-assets" id={'brand-'+brandId+'-assets'}>
 <h2 className="font-display text-lg font-semibold">Logos &amp; Assets ({assets.length})</h2>
 <BrandProductPhotos key={brandId+':logos'} brandId={brandId} assets={assets} urls={assetUrls} onKitUpdated={onKitUpdated} role="logo_primary" roleOptions={LOGO_ROLES} title="Logos & campaign references" addLabel="Add logo or reference" singleRow/>
 <BrandProductPhotos key={brandId+':products'} brandId={brandId} assets={assets} urls={assetUrls} onKitUpdated={onKitUpdated}/>
 <div className={"bp-model-workspace"+(modelProfilePanel?" bp-model-workspace--with-profiles":"")}>  <BrandProductPhotos key={brandId+':models'} brandId={brandId} assets={assets} urls={assetUrls} onKitUpdated={onKitUpdated} role="brand_model" modelProfiles={modelProfiles} onManageCharacters={onManageCharacters} onUseModelImage={onUseModelImage}/>{modelProfilePanel&&<aside className="bp-model-profiles">{modelProfilePanel}</aside>}</div>
      {assets.some(a=>!ASSET_SLOTS.some(s=>s.role===a.role))&&<section className="bpp-section"><header><h3>Additional assets ({assets.filter(a=>!ASSET_SLOTS.some(s=>s.role===a.role)).length})</h3></header><p className="bpp-additional-caption">Supporting files and older references outside the categories above.</p><div className="bpp-grid">{assets.filter(a=>!ASSET_SLOTS.some(s=>s.role===a.role)).map(asset=><article key={asset.id} className="bpp-card bpp-extra-card"><div className="bpp-image">{asset.mimeType?.startsWith("image/")||!asset.mimeType&&assetUrls[asset.id]?<BrandAssetPhoto asset={asset} brandId={brandId} url={assetUrls[asset.id]}/>:<FileImage size={26}/>}</div><div className="bpp-fields"><strong>{asset.label||asset.fileName||"Attached file"}</strong>{asset.fileName&&<small>{asset.fileName}</small>}<span className="bpp-extra-status">{asset.status==="ready"?"Available":asset.status||"Status unavailable"}</span></div></article>)}</div></section>}

 </div>;
}
