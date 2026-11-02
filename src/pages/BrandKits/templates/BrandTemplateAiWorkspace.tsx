import {templateEditTarget,saveCanvasTemplate} from './templateCanvasLink';
import {TemplateRenderReview} from './TemplateRenderReview';
import {TemplateProductSettings} from './TemplateProductSetup';
import type {TemplateProductConfiguration} from './templateProductSettings';
import {automaticTemplateProducts,templateCreatorIssues,TEMPLATE_IDEA_SUGGESTIONS,type ProductSelectionMode} from './templateCreatorSetup';
import {templateResponseId} from './templateLibraryWorkflow';
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Sparkles } from "lucide-react";

import { brandTemplateApi } from "../../../services/apiClient";
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
  const navigate=useNavigate(),[params,setParams]=useSearchParams(),pending=useRef(false),reviewAttempt=useRef("");
  const [kit,setKit]=useState(initialKit);useEffect(()=>setKit(initialKit),[initialKit]);
  const [configuration,setConfiguration]=useState<TemplateProductConfiguration>(()=>automaticTemplateProducts(initialKit,'')),[selectionMode,setSelectionMode]=useState<ProductSelectionMode>('automatic');
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
  const effectiveConfiguration=selectionMode==='automatic'&&!source&&!sourceId?automaticTemplateProducts(kit,direction,configuration.modelProfileId):configuration;
  const layoutValid=layout==='auto'||layouts.some(t=>t.templateId===layout);
  const issues=templateCreatorIssues(kit,effectiveConfiguration,direction,native,layoutValid),draftIssues=templateCreatorIssues(kit,effectiveConfiguration,direction,native,layoutValid,true);
  async function nativeFallback(){
    if(pending.current || !kit.version)return;
    pending.current=true;setBusy(true);setError('');
    try {const draft=await brandTemplateApi.createNativeSource(kit.id,{templateId:layout==='auto'?'product-hero':layout,format,expectedBrandVersion:kit.version,configuration:effectiveConfiguration});remember(draft);}
    catch(e){setError(e instanceof Error?e.message:'Native draft unavailable.');}
    finally{pending.current=false;setBusy(false);}
  }
  async function prepare(draftOnly=false){
    if(pending.current)return;
    const validation=templateCreatorIssues(kit,effectiveConfiguration,direction,native,layoutValid,draftOnly);if(validation.length){setError(validation.join(' '));return;}
    setConfiguration(effectiveConfiguration);
    pending.current=true;setBusy(true);setError("");
    try{const body={templateId:layout==="auto"?"product-hero":layout,format,expectedBrandVersion:kit.version!,configuration:effectiveConfiguration,...(!native&&direction.trim()?{creativeDirection:direction.trim()}:{})};if(!native&&!draftOnly)setGenerationRequested(true);const prepared=await (native||draftOnly?brandTemplateApi.createNativeSource(kit.id,body):brandTemplateApi.createAiSource(kit.id,body));if(draftOnly)navigate(creativeEditorPath(verifyTemplateSource(prepared,kit.id).id));else remember(prepared);}
    catch(e){setError(e instanceof Error?e.message:"Could not prepare your template draft.");}
    finally{setBusy(false);pending.current=false;}
  }
  async function publish(value:WorkspaceCreative|null=source){
    if(!value || pending.current || !kit.version || (value.templateContext?.draftKind!=="native" && !hasGeneratedBackground(value)))return;
    pending.current=true;setBusy(true);setError("");
    try{const body={creativeId:value.id,expectedCreativeVersion:value.currentVersion!,expectedBrandVersion:kit.version,name:value.name};
      const target=templateEditTarget(params.toString());
      let record;
      if(target && value.templateContext?.draftKind!=='native'){
        record=await saveCanvasTemplate(brandTemplateApi,kit.id,value,target);
      }else record=await (value.templateContext?.draftKind==='native'?brandTemplateApi.fromDraft(kit.id,body):brandTemplateApi.fromCreative(kit.id,body));
navigate("/brands/"+encodeURIComponent(kit.id)+"/templates/"+encodeURIComponent(templateResponseId(record,value.templateContext?.brandTemplateId || record?.id)));
    }catch(e){setError(e instanceof Error?e.message:"Could not submit the template for review. Your draft is retained.");}
    finally{setBusy(false);pending.current=false;}
  }
  useEffect(()=>{
    const key=source?.id+':'+source?.currentVersion;
    if(!busy && !pending.current && params.get('refine')!=='1' && source?.id===sourceId && (native || generated) && reviewAttempt.current!==key){reviewAttempt.current=key;void publish(source);}
  },[params,source,sourceId,native,generated,publish,busy]);
  return <section className="bt-ai-workspace">

    <header><h2><Sparkles size={22}/>{source||sourceId?"Review template":native?"Choose your layout":"Create an AI template"}</h2></header>
    {error && <p className="bt-blocker" role="alert">{error}</p>}
    {busy&&!source&&!native?<TemplateRenderReview name={kit.name+' · Brand Template'} format={format} phase="Preparing your template…"/>:isTemplateSourceLoading(loading,sourceId,source?.id)?<TemplateRenderReview format={format} phase="Loading template review…"/>:source && source.id===sourceId?<>

      {(native || generated && source.imageRenderMode==='template-proposal')&&params.get('refine')!=='1'?<TemplateRenderReview source={source} format={format} active={!error} phase={error?"Review could not open":"Finishing your preview…"}>{error&&<button className="xp-secondary" disabled={busy} onClick={()=>void publish(source)}>Retry opening review</button>}</TemplateRenderReview>:generated && source.imageRenderMode!=="template-proposal"?<section className="xp-panel"><h3>Earlier background-only template draft</h3><BrandTemplateScenePreview graph={source.sceneGraph} assetUrls={urls} size="hero" maxHeight={560}/><button className="xp-primary" onClick={()=>{setSource(null);setLayout("product-hero");setParams({tab:"brand",mode:"ai"});}}>Start a finished template proposal</button></section>:<ProductionImageGeneration key={source.id} source={source} initialInstruction={source.proposalDirection || direction} initialOperation={params.get('refine')==='1'?'refine':'generate'} renderMode="template-proposal" compact executeRequested={generationRequested} autoPreflight={!generated && !generationRequested} onProviderUnavailable={nativeFallback} onReview={()=>void publish(source)} onCustomize={()=>navigate(creativeEditorPath(source.id))} brand={kit} assetUrls={urls} onSaved={async value=>{remember(value);await publish(value);}}/>}

      {busy && <p role="status">Opening template review…</p>}
    </>:<div className="xp-panel bt-ai-setup bt-quick-creator">
      {!native&&<div className="bt-idea-section"><label className="xp-field bt-description-field">Describe your creative idea<textarea rows={3} disabled={busy} value={direction} maxLength={4000} onChange={e=>setDirection(e.target.value)} placeholder="A cinematic product hero, an editorial story, or a collection launch…"/></label>
       <div className="bt-idea-suggestions" role="group" aria-label="Creative idea suggestions">{TEMPLATE_IDEA_SUGGESTIONS.map(s=><button type="button" key={s.name} disabled={busy} onClick={()=>setDirection(s.idea)}>{s.name}</button>)}</div></div>}
      <div className="bt-format-field"><span>Format</span><div className="bt-format-options" role="group" aria-label="Format">{AD_FORMATS.map(f=><button type="button" key={f.id} disabled={busy} aria-pressed={format===f.id} onClick={()=>{setFormat(f.id);if(layout!=='auto'&&!TEMPLATE_CATALOG_V1.find(t=>t.templateId===layout)?.formats.some(v=>v===f.id))setLayout(native?'product-hero':'auto');}}><span className="bt-format-shape" data-format={f.id} aria-hidden="true"/>{f.label}</button>)}</div></div>
      <TemplateProductSettings value={effectiveConfiguration} selectionMode={selectionMode} onSelectionModeChange={mode=>{setConfiguration(effectiveConfiguration);setSelectionMode(mode);}} onChange={value=>{if(JSON.stringify(value.slots)!==JSON.stringify(effectiveConfiguration.slots))setSelectionMode('specific');setConfiguration(value);}} kit={kit} onKitUpdated={setKit} disabled={busy}/>
      {!!issues.length&&<ul id="template-setup-validation" className="bt-setup-validation" aria-live="polite">{[...new Set(issues)].map(issue=><li key={issue}>{issue}</li>)}</ul>}
      <div className="bt-creator-footer"><details className="bt-advanced-options"><summary>Advanced Options</summary><fieldset disabled={busy} className="bp-fieldset"><label className="xp-field">{native?'Layout':'Composition guidance'}<select value={layout} onChange={e=>setLayout(e.target.value)}>{!native&&<option value="auto">Let AI compose from my brief</option>}{layouts.map(t=><option key={t.templateId} value={t.templateId}>{t.name}</option>)}</select></label></fieldset></details>
      <div className="bt-setup-actions">
       {!native&&<button type="button" className="xp-secondary" disabled={busy||draftIssues.length>0} onClick={()=>void prepare(true)}>Draft Editable Layout</button>}
       <button type="button" className="xp-primary" disabled={busy||issues.length>0} aria-describedby={issues.length?'template-setup-validation':undefined} onClick={()=>void prepare()}><Sparkles size={16} aria-hidden="true"/>{busy?'Preparing…':native?'Preview template':'Generate Template'}</button>
      </div>
      </div>
    </div>}
  </section>;
}
