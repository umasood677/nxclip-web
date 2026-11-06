import {TemplateSourceReferences} from './TemplateSourceReferences';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '../../../components/ui/dialog';
import {TemplateLeaveDialog} from './TemplateLeaveDialog';
import {templateLeaveDecision} from './templateLeaveDecision';
import type {ReviewMediaPhase} from './reviewMediaLoading';
import {templateReviewHandoff} from './templateReviewHandoff';
import {useTemplateAssetUrls,templateImageIds} from './useTemplateAssetUrls';
import {templateRecency} from './templateRecency';
import {templateCanvasPath} from './templateCanvasLink';
import {TemplateReviewMedia} from './TemplateReviewMedia';
import {TemplateRenderReview} from './TemplateRenderReview';
import {BrandTemplateGallery} from './BrandTemplateGallery';
import {BrandTemplateTile} from './BrandTemplateTile';
import './templateSources.css';
import {TemplateBulkActions,TemplateDeleteDialog} from './TemplateBulkDelete';
import {deletionEntries,deletionKey,deletionPayload,deletionFeedback,type TemplateDeleteEntry,type TemplateDeleteResult,type DeletableTemplateDraft} from './templateDeletion';
import {templateResponseId,unlistedDrafts,templateError} from './templateLibraryWorkflow';
import { useCreativeAssetUrls } from "../../AdStudio/canvas/useCreativeAssetUrls";
import { toast } from "sonner";
import { AdProjectCreateForm } from "../../AdStudio/components/CreateAdProjectDialog";
import { BrandTemplateAiWorkspace } from "./BrandTemplateAiWorkspace";
import "../../AdStudio/styles/ad-studio-w0a.css";

import { useBrandTemplateDraftPreview } from "./useBrandTemplateDraftPreview";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { ArrowLeft, Check, Copy, Archive, Palette, X, Plus, Sparkles } from "lucide-react";
import {
  brandApi,
  brandTemplateApi,
  adStudioApi,
} from "../../../services/apiClient";
import { EmptyState } from "../../../components/common/EmptyState";
import { Skeleton } from "../../../components/ui/skeleton";
import { TemplateGallery } from "../../AdStudio/components/TemplateGallery";
import {
  TEMPLATE_CATALOG_V1,
  type AdStudioTemplateId,
} from "../../AdStudio/canvas/templateCatalog";
import { AD_FORMATS } from "../../AdStudio/types";
import {
  creativeEditorPath,
  type WorkspaceProject,
} from "../../AdStudio/lib/projectWorkspace";
import type { BrandKitSummary } from "../lib/brandKitTypes";
import {
  canReuseTemplate,
  compatibleTemplateProjects,
  isBrandTemplatesEnabled,
  templateHeadline,
  type BrandTemplate,
  type BrandTemplateAction,
} from "./brandTemplateModel";
import "../../AdStudio/uxPreview/preview.css";
import "../../AdStudio/uxPreview/roadmap.css";
import "../../AdStudio/styles/production-theme.css";
import "../guided/guidedBrand.css";
import "../../AdStudio/production/imageGeneration.css";
import "./brandTemplates.css";

type Draft = {
  name: string;
  templateId: string;
  format: string;
  primaryHeadline: string;
  supportingCopy: string;
  cta: string;
};
function draftFor(record: BrandTemplate): Draft {
  const text = (name: string) => {
    const layer = record.sceneGraph.layers.find((l) => l.name === name);
    return layer && "text" in layer && typeof layer.text === "string"
      ? layer.text
      : "";
  };
  return {
    name: record.name,
    templateId: record.sourceTemplateId,
    format: record.format,
    primaryHeadline: templateHeadline(record.sceneGraph),
    supportingCopy: text("Supporting copy"),
    cta: text("CTA button"),
  };
}
export default function BrandTemplateLibrary() {
  const { brandId = "", templateId } = useParams(),
    navigate = useNavigate(),
    [params, setParams] = useSearchParams();
  const location=useLocation(),handoff=useMemo(()=>templateReviewHandoff(location.state,brandId,templateId),[location.state,brandId,templateId]),handoffPending=useRef<string|null>(handoff?location.key:null);
  const enabled = isBrandTemplatesEnabled(),
    tab = params.get("tab") === "default" ? "default" : "brand";
  const [kit, setKit] = useState<BrandKitSummary | null>(handoff?.kit||null),
    [items, setItems] = useState<BrandTemplate[]>(handoff?[handoff.record]:[]),
    [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [templateDrafts,setTemplateDrafts]=useState<DeletableTemplateDraft[]>([]),[creatingCampaign,setCreatingCampaign]=useState(false);
  const running=useRef(false);
  const [reuseOpen,setReuseOpen]=useState(false);
  const [leaveTarget,setLeaveTarget]=useState<string|null>(null);
  const [deleteSelection,setDeleteSelection]=useState<string[]>([]),[deleteRequest,setDeleteRequest]=useState<TemplateDeleteEntry[]|null>(null),[deleteResults,setDeleteResults]=useState<Array<TemplateDeleteResult&{name?:string}>>([]);
  useEffect(()=>{setDeleteSelection([]);setDeleteRequest(null);setDeleteResults([]);},[brandId]);
  const [loading, setLoading] = useState(!handoff),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const setMessage = (message: string) => { if (message) toast.success(message); };
  const [depictionReviewed,setDepictionReviewed]=useState(false);
  const [reviewMedia,setReviewMedia]=useState<{id:string;phase:ReviewMediaPhase}>({id:"",phase:"loading"});
  const [search, setSearch] = useState(""),
    [archived, setArchived] = useState(false),
    [format, setFormat] = useState("portrait_1080x1350"),
    [projectId, setProjectId] = useState("");
  const [draftValue, setDraft] = useState<Draft | null>(handoff?draftFor(handoff.record):null);
  const [draftIdentity,setDraftIdentity]=useState(handoff?.record.id||"");
  useLayoutEffect(()=>{if(!handoff)return;handoffPending.current=location.key;setKit(handoff.kit);setItems(previous=>[handoff.record,...previous.filter(t=>t.id!==handoff.record.id)]);setDraft(draftFor(handoff.record));setDraftIdentity(handoff.record.id);setLoading(false);},[handoff,location.key]);
  useEffect(()=>setDeleteSelection([]),[search,archived]);
  const requestVersion = useRef(0),
    activeBrand = useRef(brandId);
  activeBrand.current = brandId;
  const storedSelection=items.find((t)=>t.id===templateId);
  const selected = handoff&&handoff.record.revision>=(storedSelection?.revision||0)?handoff.record:storedSelection,
    draft=selected?(draftIdentity===selected.id&&draftValue?draftValue:draftFor(selected)):null,
    dirty =
      !!selected &&
      !!draft &&
      JSON.stringify(draft) !== JSON.stringify(draftFor(selected));
  const reviewKey=selected?selected.id+":"+selected.revision:"",reviewPhase=reviewMedia.id===reviewKey?reviewMedia.phase:"loading";
  const onReviewPhase=useCallback((phase:ReviewMediaPhase)=>setReviewMedia(previous=>previous.id===reviewKey&&previous.phase===phase?previous:{id:reviewKey,phase}),[reviewKey]);
  const assetKit = useMemo(() => {
    if (!kit || kit.id !== brandId) return null;
    return kit;
  }, [kit, brandId]);
  const currentLocation=useRef(location.key);currentLocation.current=location.key;
  const authoring=["ai","native"].includes(params.get("mode")||"")&&!templateId;
  const mediaGraphs=selected?[selected.sceneGraph]:authoring?[]:[...items.filter(t=>!t.deletion).map(t=>t.sceneGraph),...templateDrafts.filter(d=>!d.deletionPending).map(d=>d.sceneGraph)];
  const [mediaReload,setMediaReload]=useState(0);
  const imageIds=[...new Set([...templateImageIds(mediaGraphs),...(selected?.provenance.referenceManifest?.map(r=>r.assetId)||[])])],brandUrls=useTemplateAssetUrls(assetKit,imageIds,mediaReload);
  const mediaSources=selected?(selected.provenance.sourceCreativeId?[selected.provenance.sourceCreativeId]:[]):authoring?[]:[...items.filter(t=>!t.deletion).flatMap(t=>t.provenance.sourceCreativeId?[t.provenance.sourceCreativeId]:[]),...templateDrafts.filter(d=>!d.deletionPending).map(d=>d.id)];
  const generatedUrls = useCreativeAssetUrls(mediaSources,imageIds,mediaReload);
  const urls = {...brandUrls,...generatedUrls};
  const {graph:draftPreview,loading:previewLoading,error:previewError,retry:retryPreview}=useBrandTemplateDraftPreview(brandId,selected,draft);
  const load = useCallback(async () => {
    if(handoffPending.current===currentLocation.current){handoffPending.current=null;setLoading(false);return;}
    if (!enabled) {
      setLoading(false);
      return;
    }
    const request = ++requestVersion.current;
    setLoading(true);
    setKit(null);
    setItems([]);
    setProjects([]);
    setBusy(false);
    setError("");
    try {
      const [brand, result, drafts] = await Promise.all([
        brandApi.getKit(brandId),
        authoring?Promise.resolve({items:[]}):templateId?brandTemplateApi.get(brandId,templateId).then(record=>({items:[record]})):brandTemplateApi.list(brandId),
        templateId||authoring?Promise.resolve({items:[]}):brandTemplateApi.listDrafts(brandId).catch(()=>({items:[]})),
      ]);
      if(templateId && !result.items.some(t=>t.id===templateId)) result.items.push(await brandTemplateApi.get(brandId,templateId));
      if (request !== requestVersion.current) return;
      if (
        brand.id !== brandId ||
        result.items.some((t) => t.brandKitId !== brandId)
      )
        throw new Error("Brand context changed.");
      setKit(brand);
      setItems(result.items);
      setTemplateDrafts(drafts.items);
    } catch {
      if (request !== requestVersion.current) return;
      setError(
        "The owned Brand Kit and template library could not be loaded. Check feature readiness and retry.",
      );
    } finally {
      if (request === requestVersion.current) setLoading(false);
    }
  }, [brandId, enabled, templateId,authoring]);
  useEffect(() => {
    void load();
    return () => { requestVersion.current += 1; };
  }, [load]);
  useEffect(()=>{
    if(!reuseOpen || !selected?.saved || !canReuseTemplate(selected))return;let active=true;
    void adStudioApi.listProjects().then(result=>{if(active)setProjects(result.items as WorkspaceProject[]);}).catch(()=>{if(active)setError('Campaigns could not be loaded. Your saved template is unchanged.');});
    return()=>{active=false;};
  },[selected?.id,selected?.saved,selected?.revision,reuseOpen]);
  useEffect(() => {
    setDraft(selected ? draftFor(selected) : null);
    setDraftIdentity(selected?.id||"");
    setDepictionReviewed(false);
    setProjectId("");
    setMessage("");
  }, [selected]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const base = "/brands/" + encodeURIComponent(brandId) + "/templates";
  const go = (to: string) => {
    const decision=templateLeaveDecision(dirty,location.pathname+location.search+location.hash,to);
    if(decision==='confirm')setLeaveTarget(to);
    else if(decision==='navigate')navigate(to);
  };
  const follow=(e:React.MouseEvent<HTMLAnchorElement>,to:string)=>{
    if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    e.preventDefault();go(to);
  };
  const patch = (value: Partial<Draft>) =>
    setDraft((previous) => draft?{...(draftIdentity===selected?.id&&previous?previous:draft),...value}:previous);
  const upsert = (record: BrandTemplate) =>
    setItems((previous) => [
      record,
      ...previous.filter((t) => t.id !== record.id),
    ]);
  const run = async (work: () => Promise<void>) => {
    if(running.current)return;running.current=true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
    } catch (e) {
      if ((e as {statusCode?:number})?.statusCode === 409 && !dirty) {
        try { if(selected)upsert(await brandTemplateApi.get(brandId,selected.id));else setItems((await brandTemplateApi.list(brandId)).items); } catch { /* retain current edits */ }
      }
      setError(templateError(e));
    } finally {
      setBusy(false);running.current=false;
    }
  };
  const reviewCard=(record:BrandTemplate,value:'reject'|'archive')=>void run(async()=>{
    const result=await brandTemplateApi.action(brandId,record.id,record.revision,value);
    templateResponseId(result,record.id);upsert(result);toast.success(value==='reject'?'Template rejected.':'Template archived.');
  });
  const discardDraft=(id:string)=>{const source=templateDrafts.find(d=>d.id===id);if(source)setDeleteRequest(deletionEntries([], [source]));};
  const previewNative=(id:AdStudioTemplateId,chosen:string)=>void run(async()=>{
    if(!kit?.version)throw Error('Brand Kit required');
    const draft=await brandTemplateApi.createNativeSource(brandId,{templateId:id,format:chosen,expectedBrandVersion:kit.version});
    navigate(base+'?tab=brand&mode=native&source='+encodeURIComponent(draft.id));
  });
  const editNativeInCanvas=()=>void run(async()=>{
    if(!selected || dirty)throw Error('Save customization first');
    const draft=await brandTemplateApi.editorDraft(brandId,selected.id);navigate(creativeEditorPath(draft.id));
  });
  const prepare = () =>
    void run(async () => {
      if (!kit) throw new Error("Brand required");
      const result = await brandTemplateApi.generate(
        brandId,
        kit.version,
        format,
      );
      if (activeBrand.current !== brandId) return;
      setItems((previous) => [
        ...result.items,
        ...previous.filter((t) => !result.items.some((n) => n.id === t.id)),
      ]);
      setMessage(
        "Editable layouts prepared.",
      );
    });
  const action = (value: BrandTemplateAction) =>
    void run(async () => {
      if (!selected || dirty) throw new Error("Save customization first");
      const result = await brandTemplateApi.action(
        brandId,
        selected.id,
        selected.revision,
        value,
        value === "approve" && (selected.provenance.compositionMode==='reference-guided-template-v1' || depictionReviewed),
      );
      templateResponseId(result,selected.id,value === "duplicate");
      let fresh = result;
      upsert(fresh);
      if(value === "approve"){
        try{
          fresh=await brandTemplateApi.action(brandId,fresh.id,fresh.revision,"save");
          templateResponseId(fresh,selected.id);upsert(fresh);
        }catch{throw new Error("Template approved, but saving failed. Choose Save template to finish.");}
      }
      if (activeBrand.current !== brandId) return;
      if (value === "duplicate")
        navigate(base + "/" + encodeURIComponent(fresh.id));
      setMessage(
        value === "approve"
          ? "Template approved and saved to your Brand Library."
          : `Template ${value} completed.`,
      );
    });
  const saveCustomization = () =>
    void run(async () => {
      if (!selected || !draft) throw new Error("Choose a template");
      const result = await brandTemplateApi.customize(brandId, selected.id, {
        ...draft,
        expectedRevision: selected.revision,
      });
      templateResponseId(result,selected.id);upsert(result);
      setMessage(
        "Customization saved as a suggestion. Review and approval are required again.",
      );
    });
  const matching = compatibleTemplateProjects(
    projects,
    brandId,
    selected?.format || format,
  );
  const reuse = () =>
    void run(async () => {
      const project = matching.find((p) => p.id === projectId);
      if (!project) throw new Error("Choose a compatible project");
      if (selected) {
        if (dirty || !canReuseTemplate(selected))
          throw new Error("Review required");
        const creative = await brandTemplateApi.reuse(
          brandId,
          selected.id,
          project.id,
        );
        if (activeBrand.current === brandId)
          navigate(creativeEditorPath(creative.id));
      }
    });
  if (!enabled)
    return (
      <main className="xp-root nxclip-production bp-guided-root bt-root ad-studio-w0a">
        <div className="xp-main">
          <Link className="xp-breadcrumb" to="/create/ad">
            Ad Studio
          </Link>
          <section className="xp-panel">
            <span className="xp-kicker">BRAND TEMPLATE STUDIO</span>
            <h1>Your identity. A collection of editable layouts.</h1>
            <EmptyState
              title="Prepare your brand for its template collection"
              description="Review identity, product sources, logo and permissions in your existing Brand Kit. Native template preparation becomes available after local activation; it does not require paid image generation."
              actionLabel="Review Brand Kit"
              onAction={() =>
                navigate(
                  `/brands/${encodeURIComponent(brandId)}/guided?step=ready`,
                )
              }
            />
            <p className="xp-notice">
              Template preparation is currently disabled in this local frontend.
              Your saved Brand Kit and projects are unchanged.
            </p>
          </section>
        </div>
      </main>
    );
  if (loading && (templateId || params.get("source")))return <div className="xp-root nxclip-production bp-guided-root bt-root bt-review-page ad-studio-w0a"><main className="xp-main"><nav className="xp-breadcrumb" aria-label="Breadcrumb"><Link to={"/brands/"+brandId+"/guided?step=ready"}><ArrowLeft size={14}/>Brand Kit</Link><Link to={"/brands/"+brandId+"/templates"}>Brand Templates</Link></nav><header className="xp-page-head"><h1><Palette size={26}/>Review template</h1><button type="button" disabled className="xp-primary"><Sparkles size={16}/>Generate Template</button></header><TemplateRenderReview/></main></div>;
  if (loading)
    return (
      <div className="grid gap-6 p-6" aria-label="Loading template library">
        <Skeleton className="h-12 w-72" />
        <div className="grid gap-6 md:grid-cols-3">
          {[0, 1, 2].map((n) => (
            <Skeleton key={n} className="h-96 w-full" />
          ))}
        </div>
      </div>
    );
  if (!kit)
    return (
      <EmptyState
        title="Template library unavailable"
        description={error || "This Brand Kit is not accessible."}
        actionLabel="Retry"
        onAction={() => void load()}
      />
    );
  const visible = items.filter(
    (t) =>
      (archived || t.state !== "archived" || !!t.deletion) &&
      `${t.name} ${t.sourceTemplateId}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const visibleEntries=deletionEntries(visible,unlistedDrafts(items,templateDrafts,search));
  const toggleDelete=(entry:TemplateDeleteEntry)=>setDeleteSelection(previous=>previous.includes(deletionKey(entry))?previous.filter(k=>k!==deletionKey(entry)):previous.length<50?[...previous,deletionKey(entry)]:previous);
  const openBulkDelete=()=>{try{const keys=new Set(deletionPayload(visibleEntries,deleteSelection).map(deletionKey));setDeleteRequest(visibleEntries.filter(e=>keys.has(deletionKey(e))));}catch(e){toast.error(e instanceof Error?e.message:'Select templates again.');}};
  const deleteTemplates=()=>void run(async()=>{
    if(!deleteRequest)return;
    const request=deletionPayload(deleteRequest,deleteRequest.map(deletionKey)),requestBrand=brandId;
    const result=await brandTemplateApi.bulkDelete(requestBrand,request),feedback=deletionFeedback(result.items,request);
    if(activeBrand.current!==requestBrand)return;
    setDeleteResults(result.items.map(r=>({...r,name:deleteRequest.find(d=>deletionKey(d)===deletionKey(r))?.name})));setDeleteRequest(null);setDeleteSelection([]);
    toast[feedback.tone](feedback.message);
    await load();
  });
  const reviewProject = (
    <section className="xp-panel" id="template-project-selection">

      <button className="xp-secondary" onClick={()=>setCreatingCampaign(v=>!v)}><Plus size={14}/> Create campaign</button>
      {creatingCampaign && <AdProjectCreateForm brands={[kit]} brandLocked initialBrandId={brandId} format={selected?.format || format} onCancel={()=>setCreatingCampaign(false)} onCreated={p=>{setProjects(old=>[p,...old.filter(x=>x.id!==p.id)]);setProjectId(p.id);setCreatingCampaign(false);}}/>}
      {matching.length ? (
        <label className="xp-field">
          Project
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">Choose an owned project</option>
            {matching.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="bt-campaign-empty">No campaigns for this Brand Kit yet. Create one to continue.</p>
      )}
      <button
        className="xp-primary"
        disabled={
          busy ||
          !projectId ||
          (!!selected && (!canReuseTemplate(selected) || dirty)) ||
          !selected
        }
        onClick={reuse}
      >
        Create ad →
      </button>
      <Link
        className="xp-text-button"
        to="/create/ad"
        onClick={e=>follow(e,"/create/ad")}
      >
        Open existing projects / Create Project →
      </Link>
    </section>
  );
  return (
    <div className={"xp-root nxclip-production bp-guided-root bt-root ad-studio-w0a"+(selected||templateId||params.get("source")?" bt-review-page":!["ai","native"].includes(params.get("mode")||"")?" bt-library-page":" bt-creator-page")}>
      <main className="xp-main">
        <TemplateLeaveDialog open={leaveTarget!==null} onStay={()=>setLeaveTarget(null)} onDiscard={()=>{const target=leaveTarget;setLeaveTarget(null);if(target)navigate(target);}}/>
        <TemplateDeleteDialog entries={deleteRequest} busy={busy} onCancel={()=>setDeleteRequest(null)} onConfirm={deleteTemplates}/>
        {!!deleteResults.length&&<div className="bt-delete-results" role="status"><strong>Deletion results</strong><ul>{deleteResults.map(r=><li key={deletionKey(r)}>{(r.name||'Template')+': '}{r.status==='deleted'?'Deleted':r.message}{r.retainedObjects>0?' · Shared or protected files retained':''}</li>)}</ul><button type="button" className="xp-text-button" onClick={()=>setDeleteResults([])}>Dismiss</button></div>}
        <nav className="xp-breadcrumb" aria-label="Breadcrumb">
          <Link
            to={"/brands/" + brandId + "/guided?step=ready"}
            onClick={e=>follow(e,"/brands/"+brandId+"/guided?step=ready")}
          >
            <ArrowLeft size={14} /> {kit.name}
          </Link>
          <Link to={base} onClick={e=>follow(e,base)}>Brand Templates</Link>
        </nav>
        {(!["ai","native"].includes(params.get("mode") || "") || !!params.get("source")) && <header className="xp-page-head">
          <div>

            <h1><Palette size={26} aria-hidden="true" />
              {selected || params.get("source")
                ? "Review template"
                : "Your brand. Every composition."}
            </h1>

          </div>
          <button className="xp-primary" disabled={authoring&&!!params.get("source")} onClick={() => go(base + "?tab=brand&mode=ai")}><Sparkles size={16} aria-hidden="true" /> Generate Template</button>
        </header>}
        {error && (
          <div className="xp-notice" role="alert">
            {error}
            <button
              className="xp-text-button"
              disabled={busy}
              onClick={() => void load()}
            >
              Reload library
            </button>
          </div>
        )}
        {["ai","native"].includes(params.get("mode") || "") && !templateId ? (
          <BrandTemplateAiWorkspace key={brandId+":"+params.get("mode")} kit={kit} entryKind={params.get("mode")==="native"?"native":"ai"} initialFormat={format} onBack={() => setParams({tab:"brand"})} />
        ) : templateId && !selected ? (
          <EmptyState
            title="Template not found"
            description="This template is unavailable in the selected Brand Kit."
            actionLabel="Open library"
            onAction={() => go(base)}
          />
        ) : selected && draft ? (
          <>
            {reviewPhase!=="ready"&&<TemplateRenderReview active={reviewPhase!=="failed"} phase={reviewPhase==="failed"?"Preview could not load":"Preparing your preview…"}>{reviewPhase==="failed"&&<button type="button" className="xp-secondary" onClick={()=>{setMediaReload(n=>n+1);retryPreview();}}>Retry loading preview</button>}</TemplateRenderReview>}
            <div className="xp-split bt-review" style={{display:reviewPhase==="ready"?undefined:"none"}} aria-hidden={reviewPhase!=="ready"}>
              <section className="xp-panel bt-preview-panel">
                <TemplateReviewMedia graph={draftPreview} urls={urls} busy={previewLoading} onPhase={onReviewPhase} onRetry={()=>{setMediaReload(n=>n+1);retryPreview();void brandApi.getKit(brandId).then(brand=>{if(brand.id===brandId&&activeBrand.current===brandId)setKit(brand);}).catch(()=>{/* The preview retains its retry action. */});}}/>
                {previewError&&<p role="alert" className="bt-blocker">{previewError} <button className="xp-text-button" onClick={retryPreview}>Retry preview</button></p>}


                {[
                  ...new Set([
                    ...selected.blockers,
                    ...(selected.reuseIssues || []),

                  ]),
                ].filter(text=>text!=="Approve and save this template before reuse.").map((text) => (
                  <p className="bt-blocker" key={text}>
                    {text}
                  </p>
                ))}
                <footer className="bt-preview-footer">
                  <div className="bt-preview-meta"><span className="xp-status">
                  {selected.saved ? "Saved to Brand Library" : selected.state === "approved" ? "Approved · Save pending" : "Review needed"}
                </span>

                  </div>
                  <div className="bt-preview-actions">
                    {selected.provenance.compositionMode==='reference-guided-template-v1'&&<button className="xp-secondary" disabled={busy||dirty} onClick={()=>go(base+'?tab=brand&mode=ai&source='+encodeURIComponent(selected.provenance.sourceCreativeId!)+'&regenerate=1&template='+encodeURIComponent(selected.id)+'&revision='+selected.revision)}>Regenerate template</button>}
                    {selected.provenance.method==='native-template-engine'?<button className="xp-primary" disabled={busy||dirty} onClick={editNativeInCanvas}>Customize in Canvas →</button>:selected.provenance.sourceCreativeId&&<button className="xp-primary" onClick={()=>go(templateCanvasPath(selected.provenance.sourceCreativeId!,selected.id,selected.revision))}>Customize in Canvas →</button>}
                  </div>
                </footer>
              </section>
              <section className={"xp-panel bt-review-details"+(reviewPhase!=="ready"?" bt-details-loading":"")} aria-busy={reviewPhase!=="ready"}>
                <h2>Template details</h2>

                <fieldset
                  disabled={busy || reviewPhase!=="ready" || selected.state === "archived"}
                  className="bp-fieldset bt-details-fields"
                >
                  <label className="xp-field">
                    Template name
                    <input
                      value={draft.name}
                      maxLength={160}
                      onChange={(e) => patch({ name: e.target.value })}
                    />
                  </label>
                  <label className="xp-field">
                    Customize headline
                    <input
                      value={draft.primaryHeadline}
                      maxLength={500}
                      onChange={(e) =>
                        patch({ primaryHeadline: e.target.value })
                      }
                    />
                  </label>
                  <label className="xp-field">
                    Supporting copy
                    <textarea
                      value={draft.supportingCopy}
                      maxLength={1500}
                      onChange={(e) =>
                        patch({ supportingCopy: e.target.value })
                      }
                    />
                  </label>
                  <label className="xp-field">
                    CTA
                    <input
                      value={draft.cta}
                      maxLength={120}
                      onChange={(e) => patch({ cta: e.target.value })}
                    />
                  </label>
                  <label className="xp-field">
                    Composition
                    <select
                      value={draft.templateId}
                      onChange={(e) => {
                        const definition = TEMPLATE_CATALOG_V1.find(
                          (t) => t.templateId === e.target.value,
                        );
                        patch({
                          templateId: e.target.value,
                          format: definition?.formats.includes(
                            draft.format as (typeof definition.formats)[number],
                          )
                            ? draft.format
                            : definition?.formats[0] || draft.format,
                        });
                      }}
                      disabled={selected.provenance.method === "provider-ai-creative" || selected.sceneGraph.layers.some(l=>l.id.startsWith('template-product-slot-')||l.id.includes(':slotHint:'))}
                    >
                      {TEMPLATE_CATALOG_V1.map((t) => (
                        <option key={t.templateId} value={t.templateId}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="xp-field">
                    Format
                    <select
                      value={draft.format}
                      disabled={selected.provenance.method === "provider-ai-creative" || selected.sceneGraph.layers.some(l=>l.id.startsWith('template-product-slot-')||l.id.includes(':slotHint:'))}
                      onChange={(e) => patch({ format: e.target.value })}
                    >
                      {AD_FORMATS.filter((f) =>
                        TEMPLATE_CATALOG_V1.find(
                          (t) => t.templateId === draft.templateId,
                        )?.formats.includes(f.id),
                      ).map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <small>Edits require reapproval.</small>
                  <button
                    className="xp-secondary"
                    disabled={!dirty || !draft.name.trim() || previewLoading || !!previewError}
                    onClick={saveCustomization}
                  >
                    Save customization
                  </button>
                </fieldset>
                <TemplateSourceReferences references={selected.provenance.referenceManifest} sourceAssetIds={selected.sourceAssetIds} kit={kit} urls={urls}/>
                {selected.provenance.compositionMode!=='reference-guided-template-v1'&&selected.provenance.renderMode==="template-proposal" && !selected.provenance.productDepictionReviewed && <label className="xp-check"><input type="checkbox" disabled={reviewPhase!=="ready"} checked={depictionReviewed} onChange={e=>setDepictionReviewed(e.target.checked)}/>I reviewed the product, packaging and brand copy.</label>}
                <div className="xp-actions bt-review-actions">
                  {(
                    [
                      "approve",
                      "reject",
                      "save",
                      "duplicate",
                      "archive",
                      "restore",
                    ] as BrandTemplateAction[]
                  )
                    .filter((a) =>
                      selected.state === "archived"
                        ? a === "restore"
                        : a !== "restore" && (a !== "approve" || selected.state !== "approved") && (a !== "save" || selected.state === "approved" && !selected.saved),
                    )
                    .map((a) => (
                      <button
                        className={
                          a === "approve" || a === "save" ? "xp-primary" : "xp-secondary"
                        }
                        disabled={
                          busy || reviewPhase==="loading" ||
                          dirty ||
                          (a === "save" && selected.state !== "approved") ||
                          (a === "approve" && (reviewPhase!=="ready" || selected.blockers.length > 0 || (selected.provenance.compositionMode==='reference-guided-template-v1'?false:selected.provenance.renderMode === "template-proposal" && !selected.provenance.productDepictionReviewed && !depictionReviewed)))
                        }
                        key={a}
                        onClick={() => action(a)}
                      >
                        {a === "approve" ? (
                          <Check size={14} />
                        ) : a === "reject" ? (
                          <X size={14} />
                        ) : a === "duplicate" ? (
                          <Copy size={14} />
                        ) : a === "archive" ? (
                          <Archive size={14} />
                        ) : (
                          <Palette size={14} />
                        )}{" "}
                        {a === "approve" ? "Approve & Save Template" : a === "save" ? "Save template" : a[0].toUpperCase() + a.slice(1)}
                      </button>
                    ))}
                </div>
                <div className="bt-review-use"><button className="xp-primary" disabled={busy || reviewPhase!=="ready" || dirty || !canReuseTemplate(selected)} onClick={()=>setReuseOpen(true)}>Create ad from this template →</button></div>

              </section>
            </div>
            {canReuseTemplate(selected) && <Dialog open={reuseOpen} onOpenChange={setReuseOpen}><DialogContent className="bt-campaign-dialog bt-root nxclip-production"><DialogHeader><DialogTitle>Create ad from this template</DialogTitle><DialogDescription>Choose a campaign. Your saved Brand Template stays unchanged.</DialogDescription></DialogHeader>{reviewProject}</DialogContent></Dialog>}
          </>
        ) : (
          <>
            <div
              className="xp-actions"
              role="tablist"
              aria-label="Template library"
            >
              <button
                className={tab === "default" ? "xp-primary" : "xp-secondary"}
                role="tab"
                aria-selected={tab === "default"}
                onClick={() => {

                  setParams({ tab: "default" });
                }}
              >
                Default Templates
              </button>
              <button
                className={tab === "brand" ? "xp-primary" : "xp-secondary"}
                role="tab"
                aria-selected={tab === "brand"}
                onClick={() => {

                  setParams({ tab: "brand" });
                }}
              >
                My Brand Templates ({items.length + unlistedDrafts(items,templateDrafts).length})
              </button>
            </div>

            <div className="xp-panel bt-toolbar">
              <div className="xp-actions">
                <label className="xp-field">
                  Output format
                  <select
                    value={format}
                    onChange={(e) => {
                      setFormat(e.target.value);

                    }}
                  >
                    {AD_FORMATS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </label>
                {tab === "brand" && (
                  <>
                    <label className="xp-field">
                      Find a template
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search templates"
                      />
                    </label>
                    <label className="xp-check">
                      <input
                        type="checkbox"
                        checked={archived}
                        onChange={(e) => setArchived(e.target.checked)}
                      />{" "}
                      Show archived
                    </label>
                    <button
                      className="xp-primary"
                      disabled={
                        busy ||
                        !kit.voice?.studio?.identityApproved ||
                        !kit.voice?.studio?.guidelinesApproved
                      }
                      onClick={prepare}
                    >
                      <Plus size={16} /> {busy ? "Preparing…" : "Prepare editable layouts"}
                    </button>
                  </>
                )}
              </div>

            </div>
            {tab==="brand"&&<TemplateBulkActions entries={visibleEntries} selected={deleteSelection} busy={busy} onSelect={setDeleteSelection} onDelete={openBulkDelete}/>}
            {tab === "default" ? (
              <>
                <TemplateGallery
                  selectedFormat={format}
                  busy={busy}
                  hideHeader
                  hideNote
                  catalogLabel="Default Templates"
                  useLabel="Preview template"
                  onUseTemplate={previewNative}
                />

              </>
            ) : !visible.length && !unlistedDrafts(items,templateDrafts,search).length ? (
              <EmptyState
                title={
                  items.length
                    ? "No matching templates"
                    : "Your Brand Templates are ready to begin"
                }
                description={
                  items.length
                    ? "Change the search or include archived templates."
                    : "Complete your reviewed Brand Kit and approve source assets, then prepare native editable candidates."
                }
                actionLabel="Review Brand Kit"
                onAction={() => go("/brands/" + brandId + "/guided?step=ready")}
              />
            ) : (
              <BrandTemplateGallery label="My Brand Templates">
                {templateRecency(visible,unlistedDrafts(items,templateDrafts,search)).map(entry=>entry.kind==='draft'?((d)=><BrandTemplateTile key={'draft:'+d.id}
                  name={d.name} graph={d.sceneGraph} assetUrls={urls} status={d.deletionPending?'Cleanup pending':'Draft'}
                  kind={d.templateContext?.draftKind==='native'?'Editable layout':'AI proposal'}
                  selected={deleteSelection.includes('draft:'+d.id)} busy={busy} pending={d.deletionPending}
                  onToggle={()=>toggleDelete(deletionEntries([], [d])[0])}
                  onPreview={()=>go(base+'?tab=brand&mode='+(d.templateContext?.draftKind||'ai')+'&source='+encodeURIComponent(d.id))}
                  onDelete={()=>discardDraft(d.id)}/>)(entry.draft):((t)=>
                <BrandTemplateTile key={t.id} name={t.name} graph={t.sceneGraph} assetUrls={urls} format={t.format}
                  status={t.deletion?'Cleanup pending':t.saved?'Saved':t.state==='suggested'?'Review needed':t.state[0].toUpperCase()+t.state.slice(1)}
                  kind={t.provenance.method==='provider-ai-creative'?'AI artwork':'Editable layout'}
                  selected={deleteSelection.includes('template:'+t.id)} busy={busy} pending={!!t.deletion}
                  onToggle={()=>toggleDelete(deletionEntries([t],[])[0])}
                  onPreview={()=>go(base+'/'+encodeURIComponent(t.id))}
                  onReject={t.state==='suggested'?()=>reviewCard(t,'reject'):undefined}
                  onArchive={t.state!=='archived'?()=>reviewCard(t,'archive'):undefined}
                  onDelete={()=>setDeleteRequest(deletionEntries([t],[]))}/>)(entry.record))}
              </BrandTemplateGallery>
            )}
          </>
        )}
      </main>
    </div>
  );
}
