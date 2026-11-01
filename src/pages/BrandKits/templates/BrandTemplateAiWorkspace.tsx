import {TemplateProductSettings} from './TemplateProductSetup';
import {suggestedProductCount,resizeProductSlots,type TemplateProductConfiguration} from './templateProductSettings';
import {templateResponseId} from './templateLibraryWorkflow';
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Sparkles, Plus } from "lucide-react";

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
export function BrandTemplateAiWorkspace({kit:initialKit,initialFormat,onBack: _onBack,entryKind="ai"}:{kit:BrandKitSummary;initialFormat:string;onBack:()=>void;entryKind?:"ai"|"native"}){
  const navigate=useNavigate(),[params,setParams]=useSearchParams(),pending=useRef(false),reviewAttempt=useRef(""),configurationTouched=useRef(false);
  const [kit,setKit]=useState(initialKit);useEffect(()=>setKit(initialKit),[initialKit]);
  const [configuration,setConfiguration]=useState<TemplateProductConfiguration>({schemaVersion:1,slots:[{label:'Product 1',color:'#9e2440',...(initialKit.assets?.find(a=>a.role==='product_image'&&a.status==='ready'&&initialKit.voice?.studio?.approvedAssetIds?.includes(a.id))?{assetId:initialKit.assets.find(a=>a.role==='product_image'&&a.status==='ready'&&initialKit.voice?.studio?.approvedAssetIds?.includes(a.id))!.id}:{})}]});
  const [generationRequested,setGenerationRequested]=useState(false);
  const [format,setFormat]=useState(initialFormat),[layout,setLayout]=useState(entryKind==="native"?"product-hero":"auto"),[direction,setDirection]=useState("");
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
  const layouts=TEMPLATE_CATALOG_V1.filter(t=>t.formats.some(f=>f===format));
  async function nativeFallback(){
    if(pending.current || !kit.version)return;
    pending.current=true;setBusy(true);setError('');
    try {const draft=await brandTemplateApi.createNativeSource(kit.id,{templateId:layout==='auto'?'product-hero':layout,format,expectedBrandVersion:kit.version,configuration});remember(draft);}
    catch(e){setError(e instanceof Error?e.message:'Native draft unavailable.');}
    finally{pending.current=false;setBusy(false);}
  }
  async function prepare(draftOnly=false){
    if(pending.current || !kit.version || (!native && !direction.trim()))return;
    pending.current=true;setBusy(true);setError("");
    try{const body={templateId:layout==="auto"?"product-hero":layout,format,expectedBrandVersion:kit.version,configuration,...(!native?{creativeDirection:direction.trim()}:{})};if(!native&&!draftOnly)setGenerationRequested(true);remember(await (native||draftOnly?brandTemplateApi.createNativeSource(kit.id,body):brandTemplateApi.createAiSource(kit.id,body)));}
    catch(e){setError(e instanceof Error?e.message:"Could not prepare your template draft.");}
    finally{setBusy(false);pending.current=false;}
  }
  async function publish(value:WorkspaceCreative|null=source){
    if(!value || pending.current || !kit.version || (value.templateContext?.draftKind!=="native" && !hasGeneratedBackground(value)))return;
    pending.current=true;setBusy(true);setError("");
    try{const body={creativeId:value.id,expectedCreativeVersion:value.currentVersion!,expectedBrandVersion:kit.version,name:value.name};
      const record=await (value.templateContext?.draftKind==="native"?brandTemplateApi.fromDraft(kit.id,body):brandTemplateApi.fromCreative(kit.id,body));
navigate("/brands/"+encodeURIComponent(kit.id)+"/templates/"+encodeURIComponent(templateResponseId(record,value.templateContext?.brandTemplateId || record?.id)));
    }catch(e){setError(e instanceof Error?e.message:"Could not submit the template for review. Your draft is retained.");}
    finally{setBusy(false);pending.current=false;}
  }
  useEffect(()=>{
    const key=source?.id+':'+source?.currentVersion;
    if(params.get('refine')!=='1' && source?.id===sourceId && (native || generated) && reviewAttempt.current!==key){reviewAttempt.current=key;void publish(source);}
  },[params,source,sourceId,native,generated,publish]);
  return <section className="bt-ai-workspace">

    <header><span className="xp-kicker">BRAND TEMPLATE STUDIO</span><h2><Sparkles size={22}/>{source?"Template preview":native?"Choose your layout":"Create an AI template"}</h2></header>
    {error && <p className="bt-blocker" role="alert">{error}</p>}
    {isTemplateSourceLoading(loading,sourceId,source?.id)?<section className="xp-panel" role="status"><h3>Opening your template draft…</h3><Skeleton className="h-40 w-full"/></section>:source && source.id===sourceId?<>

      {(native || generated && source.imageRenderMode==='template-proposal')&&params.get('refine')!=='1'?<section className="xp-panel" role="status">{error?<button className="xp-secondary" disabled={busy} onClick={()=>void publish(source)}>Retry opening review</button>:<><Skeleton className="h-40 w-full"/><p>Opening review…</p></>}</section>:generated && source.imageRenderMode!=="template-proposal"?<section className="xp-panel"><h3>Earlier background-only template draft</h3><BrandTemplateScenePreview graph={source.sceneGraph} assetUrls={urls} size="hero" maxHeight={560}/><button className="xp-primary" onClick={()=>{setSource(null);setLayout("product-hero");setParams({tab:"brand",mode:"ai"});}}>Start a finished template proposal</button></section>:<ProductionImageGeneration key={source.id} source={source} initialInstruction={source.proposalDirection || direction} initialOperation={params.get('refine')==='1'?'refine':'generate'} renderMode="template-proposal" compact executeRequested={generationRequested} autoPreflight={!generated && !generationRequested} onProviderUnavailable={nativeFallback} onReview={()=>void publish(source)} onCustomize={()=>navigate(creativeEditorPath(source.id))} brand={kit} assetUrls={urls} onSaved={async value=>{remember(value);await publish(value);}}/>}

      {busy && <p role="status">Opening template review…</p>}
    </>:<div className="xp-panel bt-ai-setup">
      {!native && <label className="xp-field">Describe your template<textarea rows={4} value={direction} maxLength={4000} onChange={e=>{setDirection(e.target.value);const count=suggestedProductCount(e.target.value);if(count&&!configurationTouched.current)setConfiguration(c=>resizeProductSlots(c,count));}} placeholder="A cinematic luxury product template with refined typography and warm lighting."/></label>}
      <fieldset disabled={busy} className="bp-fieldset bt-setup-fields"><label className="xp-field">Format<select value={format} onChange={e=>{setFormat(e.target.value);setLayout(native?"product-hero":"auto");}}>{AD_FORMATS.map(f=><option key={f.id} value={f.id}>{f.label}</option>)}</select></label><label className="xp-field">{native?"Layout":"Composition guidance"}<select value={layout} onChange={e=>setLayout(e.target.value)}>{!native&&<option value="auto">Let AI compose from my brief</option>}{layouts.map(t=><option key={t.templateId} value={t.templateId}>{t.name}</option>)}</select></label></fieldset>
      <TemplateProductSettings value={configuration} onChange={value=>{configurationTouched.current=true;setConfiguration(value);}} kit={kit} onKitUpdated={setKit} disabled={busy}/>
      {!native&&configuration.slots.some(s=>!s.assetId)&&<p className="tc-caption">Add a photograph to every slot for AI generation, or draft the layout with placeholders.</p>}
      <button className="xp-primary" disabled={busy || (!native && configuration.slots.some(s=>!s.assetId)) || (!native && !direction.trim()) || (layout!=="auto"&&!layouts.some(t=>t.templateId===layout))} onClick={()=>void prepare()}><Plus size={16}/>{busy?"Preparing…":native?"Preview template":"Generate template"}</button>
      {!native&&<button type="button" className="xp-secondary" disabled={busy} onClick={()=>void prepare(true)}>Draft editable layout</button>}
    </div>}
  </section>;
}
