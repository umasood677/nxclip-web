import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Sparkles, ArrowLeft, Plus } from "lucide-react";

import { brandTemplateApi } from "../../../services/apiClient";
import { Skeleton } from "../../../components/ui/skeleton";
import { ProductionImageGeneration } from "../../AdStudio/production/ProductionImageGeneration";
import { hasGeneratedBackground } from "../../AdStudio/production/imageExecutionModel";
import { BrandTemplateScenePreview } from "./BrandTemplateScenePreview";
import { isTemplateSourceLoading } from "./brandTemplateModel";
import { creativeEditorPath, type WorkspaceCreative } from "../../AdStudio/lib/projectWorkspace";
import { TEMPLATE_CATALOG_V1 } from "../../AdStudio/canvas/templateCatalog";
import { AD_FORMATS } from "../../AdStudio/types";
import { useAuthenticatedBrandAssetUrls } from "../../AdStudio/canvas/useAuthenticatedBrandAssetUrls";
import { useCreativeAssetUrls } from "../../AdStudio/canvas/useCreativeAssetUrls";
import type { BrandKitSummary } from "../lib/brandKitTypes";

export function verifyTemplateSource(value:WorkspaceCreative,brandId:string){
  if(!value?.id || !value.sceneGraph || !Number.isInteger(value.currentVersion) || Number(value.currentVersion)<1 || value.documentPurpose!=="template-draft" || value.templateContext?.brandKitId!==brandId)throw Error("This template draft is unavailable for the selected Brand Kit.");
  return value;
}
export function TemplateDraftNavigation({source,brandId}:{source:Pick<WorkspaceCreative,"id">;brandId:string}){
  return <nav className="xp-actions" aria-label="Template authoring"><Link className="xp-secondary" to={"/brands/"+encodeURIComponent(brandId)+"/templates?tab=brand"}>Brand Template library</Link><Link className="xp-secondary" to={creativeEditorPath(source.id)}>Customize in Canvas</Link></nav>;
}
export function BrandTemplateAiWorkspace({kit,initialFormat,onBack,entryKind="ai"}:{kit:BrandKitSummary;initialFormat:string;onBack:()=>void;entryKind?:"ai"|"native"}){
  const navigate=useNavigate(),[params,setParams]=useSearchParams(),pending=useRef(false),reviewAttempt=useRef("");
  const [format,setFormat]=useState(initialFormat),[layout,setLayout]=useState("product-hero"),[direction,setDirection]=useState("");
  const [source,setSource]=useState<WorkspaceCreative|null>(null),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState("");

  const sourceId=params.get("source"),kind=source?.templateContext?.draftKind || entryKind;
  const generated=!!source && hasGeneratedBackground(source),native=kind==="native";
  const brandUrls=useAuthenticatedBrandAssetUrls(kit),generatedUrls=useCreativeAssetUrls(source?[source.id]:[]),urls={...brandUrls,...generatedUrls};
  const remember=(value:WorkspaceCreative)=>{
    const draft=verifyTemplateSource(value,kit.id);setLoading(false);setSource(draft);
    const next=new URLSearchParams({tab:"brand",mode:draft.templateContext!.draftKind,source:draft.id});setParams(next,{replace:true});
  };
  useEffect(()=>{
    if(!sourceId || source?.id===sourceId)return;
    let active=true;setLoading(true);setError("");
    void brandTemplateApi.getDraft(kit.id,sourceId).then(value=>{const draft=verifyTemplateSource(value,kit.id);if(draft.id!==sourceId)throw Error("Template draft context changed.");if(active){setLoading(false);setSource(draft);}}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Could not open this template draft.");}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[sourceId,source?.id,kit.id]);
  const layouts=TEMPLATE_CATALOG_V1.filter(t=>(native || ["product-hero","minimal-editorial","product-launch","social-story"].includes(t.templateId))&&t.formats.some(f=>f===format));
  async function prepare(){
    if(pending.current || !kit.version || (!native && !direction.trim()))return;
    pending.current=true;setBusy(true);setError("");
    try{const body={templateId:layout,format,expectedBrandVersion:kit.version,...(!native?{creativeDirection:direction.trim()}:{})};remember(await (native?brandTemplateApi.createNativeSource(kit.id,body):brandTemplateApi.createAiSource(kit.id,body)));}
    catch(e){setError(e instanceof Error?e.message:"Could not prepare your template draft.");}
    finally{setBusy(false);pending.current=false;}
  }
  async function publish(value:WorkspaceCreative|null=source){
    if(!value || pending.current || !kit.version || (value.templateContext?.draftKind!=="native" && !hasGeneratedBackground(value)))return;
    pending.current=true;setBusy(true);setError("");
    try{const body={creativeId:value.id,expectedCreativeVersion:value.currentVersion!,expectedBrandVersion:kit.version,name:value.name};
      const record=await (value.templateContext?.draftKind==="native"?brandTemplateApi.fromDraft(kit.id,body):brandTemplateApi.fromCreative(kit.id,body));
navigate("/brands/"+encodeURIComponent(kit.id)+"/templates/"+encodeURIComponent(record.id));
    }catch(e){setError(e instanceof Error?e.message:"Could not submit the template for review. Your draft is retained.");}
    finally{setBusy(false);pending.current=false;}
  }
  useEffect(()=>{
    const key=source?.id+':'+source?.currentVersion;
    if(params.get('review')==='1' && source?.id===sourceId && (native || generated) && reviewAttempt.current!==key){reviewAttempt.current=key;void publish(source);}
  },[params,source,sourceId,native,generated,publish]);
  return <section className="bt-ai-workspace">
    <button className="xp-text-button" onClick={onBack}><ArrowLeft size={14}/> Back to Brand Templates</button>
    <header><span className="xp-kicker">BRAND TEMPLATE STUDIO</span><h2><Sparkles size={22}/>{source?"Template preview":native?"Choose your layout":"Create an AI template"}</h2></header>
    {error && <p className="bt-blocker" role="alert">{error}</p>}
    {isTemplateSourceLoading(loading,sourceId,source?.id)?<section className="xp-panel" role="status"><h3>Opening your template draft…</h3><Skeleton className="h-40 w-full"/></section>:source && source.id===sourceId?<>

      {native?<div className="xp-split"><section className="xp-panel ai-generation-preview"><BrandTemplateScenePreview graph={source.sceneGraph} assetUrls={urls} size="hero" maxHeight={640}/></section><aside className="xp-panel"><h2>Make this template yours.</h2><p>Customize typography, copy, assets and layout in the existing Canvas.</p><Link className="xp-primary" to={creativeEditorPath(source.id)}>Customize in Canvas →</Link></aside></div>:generated && source.imageRenderMode!=="template-proposal"?<section className="xp-panel"><h3>Earlier background-only template draft</h3><BrandTemplateScenePreview graph={source.sceneGraph} assetUrls={urls} size="hero" maxHeight={560}/><button className="xp-primary" onClick={()=>{setSource(null);setLayout("product-hero");setParams({tab:"brand",mode:"ai"});}}>Start a finished template proposal</button></section>:<ProductionImageGeneration key={source.id} source={source} initialInstruction={source.proposalDirection || direction} renderMode="template-proposal" compact autoPreflight={!generated} onReview={()=>void publish(source)} onCustomize={()=>navigate(creativeEditorPath(source.id))} brand={kit} assetUrls={urls} onSaved={async value=>{remember(value);await publish(value);}}/>}
      {native && <button className="xp-primary" disabled={busy} onClick={()=>void publish(source)}>{busy?"Opening review…":"Review template →"}</button>}
      {busy && <p role="status">Opening template review…</p>}
    </>:<div className="xp-panel bt-ai-setup">
      {!native && <label className="xp-field">Describe your template<textarea rows={4} value={direction} maxLength={4000} onChange={e=>setDirection(e.target.value)} placeholder="A cinematic luxury product template with refined typography and warm lighting."/></label>}
      <fieldset disabled={busy} className="bp-fieldset bt-setup-fields"><label className="xp-field">Format<select value={format} onChange={e=>{setFormat(e.target.value);setLayout("product-hero");}}>{AD_FORMATS.map(f=><option key={f.id} value={f.id}>{f.label}</option>)}</select></label><label className="xp-field">Starting composition<select value={layout} onChange={e=>setLayout(e.target.value)}>{layouts.map(t=><option key={t.templateId} value={t.templateId}>{t.name}</option>)}</select></label></fieldset>
      <button className="xp-primary" disabled={busy || (!native && !direction.trim()) || !layouts.some(t=>t.templateId===layout)} onClick={()=>void prepare()}><Plus size={16}/>{busy?"Preparing…":native?"Preview template":"Continue"}</button>

    </div>}
  </section>;
}
