import React from 'react';
import {ImageOff} from 'lucide-react';
import type {BrandKitSummary} from '../lib/brandKitTypes';
import type {TemplateReferenceMetadata} from './templateReferenceInput';

export function TemplateSourceReferences({references=[],sourceAssetIds=[],kit,urls}:{references?:readonly TemplateReferenceMetadata[];sourceAssetIds?:readonly string[];kit:BrandKitSummary;urls:Readonly<Record<string,string>>}){
 const sources=references.length?references:sourceAssetIds.flatMap(assetId=>{
  const asset=kit.assets?.find(a=>a.id===assetId);
  return asset&&['product_image','brand_model'].includes(asset.role||'')?[{assetId,purpose:asset.role==='brand_model'?'MODEL_IDENTITY':'PRODUCT_IDENTITY',provenance:{profileId:undefined}}]:[];
 });
 if(!sources.length)return null;
 return <section className="bt-source-references" aria-label="Template source assets">
  <h3>Products &amp; Brand Model</h3>
  <div className="bt-source-reference-grid">{sources.map(ref=>{
   const asset=kit.assets?.find(a=>a.id===ref.assetId),profile=kit.voice?.studio?.characters?.find(p=>p.id===ref.provenance.profileId);
   const kind=ref.purpose==='MODEL_IDENTITY'?'Brand Model':ref.purpose==='PRODUCT_IDENTITY'?'Product':'Style reference';
   const name=profile?.name||asset?.label||asset?.fileName||kind;
   return <figure key={ref.assetId} className="bt-source-reference-card">
    <div className="bt-source-reference-image">{urls[ref.assetId]?<img src={urls[ref.assetId]} alt={name}/>:<ImageOff size={18} aria-label="Reference image unavailable"/>}</div>
    <figcaption><span>{kind}</span><strong title={name}>{name}</strong></figcaption>
   </figure>;
  })}</div>
 </section>;
}
