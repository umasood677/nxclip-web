import { useCreativeAssetUrls } from "../../AdStudio/canvas/useCreativeAssetUrls";
import { BrandTemplateScenePreview } from "./BrandTemplateScenePreview";
import { toast } from "sonner";
import { AdProjectCreateForm } from "../../AdStudio/components/CreateAdProjectDialog";
import { BrandTemplateAiWorkspace } from "./BrandTemplateAiWorkspace";
import "../../AdStudio/styles/ad-studio-w0a.css";

import { useBrandTemplateDraftPreview } from "./useBrandTemplateDraftPreview";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { ArrowLeft, Check, Copy, Archive, Palette, X, Plus } from "lucide-react";
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
import { useAuthenticatedBrandAssetUrls } from "../../AdStudio/canvas/useAuthenticatedBrandAssetUrls";
import { AD_FORMATS } from "../../AdStudio/types";
import {
  creativeEditorPath,
  type WorkspaceProject,
  type WorkspaceCreative,
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
  const enabled = isBrandTemplatesEnabled(),
    tab = params.get("tab") === "default" ? "default" : "brand";
  const [kit, setKit] = useState<BrandKitSummary | null>(null),
    [items, setItems] = useState<BrandTemplate[]>([]),
    [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [templateDrafts,setTemplateDrafts]=useState<WorkspaceCreative[]>([]),[creatingCampaign,setCreatingCampaign]=useState(false);
  const running=useRef(false);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const setMessage = (message: string) => { if (message) toast.success(message); };
  const [depictionReviewed,setDepictionReviewed]=useState(false);
  const [search, setSearch] = useState(""),
    [archived, setArchived] = useState(false),
    [format, setFormat] = useState("portrait_1080x1350"),
    [projectId, setProjectId] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const requestVersion = useRef(0),
    activeBrand = useRef(brandId);
  activeBrand.current = brandId;
  const selected = items.find((t) => t.id === templateId),
    dirty =
      !!selected &&
      !!draft &&
      JSON.stringify(draft) !== JSON.stringify(draftFor(selected));
  const assetKit = useMemo(() => {
    if (!kit || kit.id !== brandId) return null;
    return kit;
  }, [kit, brandId]);
  const brandUrls = useAuthenticatedBrandAssetUrls(assetKit);
  const generatedUrls = useCreativeAssetUrls(items.flatMap(t=>t.provenance.sourceCreativeId?[t.provenance.sourceCreativeId]:[]));
  const urls = {...brandUrls,...generatedUrls};
  const {graph:draftPreview,loading:previewLoading,error:previewError,retry:retryPreview}=useBrandTemplateDraftPreview(brandId,selected,draft);
  const load = useCallback(async () => {
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
        brandTemplateApi.list(brandId),
        brandTemplateApi.listDrafts(brandId).catch(()=>({items:[]})),
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
      setError(
        "The owned Brand Kit and template library could not be loaded. Check feature readiness and retry.",
      );
    } finally {
      setLoading(false);
    }
  }, [brandId, enabled, templateId]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(()=>{
    if(!selected?.saved || !canReuseTemplate(selected))return;let active=true;
    void adStudioApi.listProjects().then(result=>{if(active)setProjects(result.items as WorkspaceProject[]);}).catch(()=>{if(active)setError('Campaigns could not be loaded. Your saved template is unchanged.');});
    return()=>{active=false;};
  },[selected?.id,selected?.saved,selected?.revision]);
  useEffect(() => {
    setDraft(selected ? draftFor(selected) : null);
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
    if (
      !dirty ||
      window.confirm("Leave without saving template customization?")
    )
      navigate(to);
  };
  const patch = (value: Partial<Draft>) =>
    setDraft((previous) => (previous ? { ...previous, ...value } : previous));
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
    } catch {
      setError(
        "The request could not be completed. Reload to verify the saved state before retrying; review source permissions and blockers. Your current customization is retained.",
      );
    } finally {
      setBusy(false);running.current=false;
    }
  };
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
        value === "approve" && depictionReviewed,
      );
      const fresh = await brandTemplateApi.get(brandId, result.id);
      upsert(fresh);
      if (activeBrand.current !== brandId) return;
      if (value === "duplicate")
        navigate(base + "/" + encodeURIComponent(fresh.id));
      setMessage(
        value === "approve"
          ? "Approved. Save this reviewed recipe before reuse."
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
      upsert(await brandTemplateApi.get(brandId, result.id));
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
      (archived || t.state !== "archived") &&
      `${t.name} ${t.sourceTemplateId}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const reviewProject = (
    <section className="xp-panel" id="template-project-selection">
      <h3>Choose a campaign</h3>
      <p>
        Choose a campaign or create one to make an advertisement from this saved template.
      </p>
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
        <EmptyState
          title="No matching projects"
          description="Create a project using this Brand Kit and the selected output format, then return to reuse the template."
        />
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
        Create ad from saved template →
      </button>
      <Link
        className="xp-text-button"
        to="/create/ad"
        onClick={(e) => {
          if (
            dirty &&
            !window.confirm("Leave without saving template customization?")
          )
            e.preventDefault();
        }}
      >
        Open existing projects / Create Project →
      </Link>
    </section>
  );
  return (
    <div className="xp-root nxclip-production bp-guided-root bt-root ad-studio-w0a">
      <main className="xp-main">
        <nav className="xp-breadcrumb" aria-label="Breadcrumb">
          <Link
            to={"/brands/" + brandId + "/guided?step=ready"}
            onClick={(e) => {
              if (
                dirty &&
                !window.confirm("Leave without saving template customization?")
              )
                e.preventDefault();
            }}
          >
            <ArrowLeft size={14} /> {kit.name}
          </Link>
          <span>Brand Templates</span>
        </nav>
        {!["ai","native"].includes(params.get("mode") || "") && <header className="xp-page-head">
          <div>
            <span className="xp-kicker">
              BRAND TEMPLATE STUDIO
            </span>
            <h1><Palette size={26} aria-hidden="true" />
              {selected
                ? "Review template"
                : "Your brand. Every composition."}
            </h1>
            <p>Design a collection. Make it unmistakably yours.</p>
          </div>
          <button className="xp-primary" onClick={() => go(base + "?tab=brand&mode=ai")}><Plus size={16} /> Create with AI</button>
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
            <div className="xp-split bt-review">
              <section className="xp-panel">
                {previewLoading ? <Skeleton className="h-96 w-full"/> : <BrandTemplateScenePreview
                  maxHeight={560}
                  graph={draftPreview}
                  assetUrls={urls}
                  size="hero"
                  showSafeArea
                />}
                {previewError&&<p role="alert" className="bt-blocker">{previewError} <button className="xp-text-button" onClick={retryPreview}>Retry preview</button></p>}
                <span className="xp-status">
                  {selected.saved ? "Saved" : selected.state === "approved" ? "Ready to save" : "Review needed"}
                </span>

                {[
                  ...new Set([
                    ...selected.blockers,
                    ...(selected.reuseIssues || []),

                  ]),
                ].map((text) => (
                  <p className="bt-blocker" key={text}>
                    {text}
                  </p>
                ))}
              </section>
              <section className="xp-panel">
                <h2>Template details</h2>

                <fieldset
                  disabled={busy || selected.state === "archived"}
                  className="bp-fieldset"
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
                      disabled={selected.provenance.method === "provider-ai-creative"}
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
                      disabled={selected.provenance.method === "provider-ai-creative"}
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
                  <small>Changes require a new approval before reuse.</small>
                  <button
                    className="xp-secondary"
                    disabled={!dirty || !draft.name.trim() || previewLoading || !!previewError}
                    onClick={saveCustomization}
                  >
                    Save customization
                  </button>
                </fieldset>
                {selected.provenance.renderMode==="template-proposal" && !selected.provenance.productDepictionReviewed && <label className="xp-check"><input type="checkbox" checked={depictionReviewed} onChange={e=>setDepictionReviewed(e.target.checked)}/>I reviewed the product, packaging and brand copy.</label>}
                <div className="xp-actions">
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
                        : a !== "restore",
                    )
                    .map((a) => (
                      <button
                        className={
                          a === "approve" ? "xp-primary" : "xp-secondary"
                        }
                        disabled={
                          busy ||
                          dirty ||
                          (a === "save" && selected.state !== "approved") ||
                          (a === "approve" && (selected.blockers.length > 0 || (selected.provenance.renderMode === "template-proposal" && !selected.provenance.productDepictionReviewed && !depictionReviewed)))
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
                        {a[0].toUpperCase() + a.slice(1)}
                      </button>
                    ))}
                </div>
                {selected.provenance.method==='native-template-engine' ? <button className="xp-secondary" disabled={busy || dirty} onClick={editNativeInCanvas}>Customize in Canvas →</button> : selected.provenance.sourceCreativeId && <button className="xp-secondary" onClick={()=>go(creativeEditorPath(selected.provenance.sourceCreativeId!))}>Customize in Canvas →</button>}
                <button className="xp-primary" disabled={busy || dirty || !canReuseTemplate(selected)} onClick={()=>document.getElementById('template-project-selection')?.scrollIntoView({behavior:'smooth',block:'center'})}>Use Template in Ad Studio →</button>
                <button className="xp-text-button" onClick={() => go(base)}>
                  Back to brand library →
                </button>
              </section>
            </div>
            {canReuseTemplate(selected) && reviewProject}
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
                My Brand Templates ({items.length})
              </button>
            </div>
            {templateDrafts.length>0 && <details className="xp-panel bt-template-drafts"><summary>Template drafts &amp; proposals ({templateDrafts.length})</summary><div className="bt-draft-list">{templateDrafts.map(d=><div key={d.id} className="xp-actions"><strong>{d.name}</strong><button className="xp-secondary" onClick={()=>go(base+'?tab=brand&mode='+(d.templateContext?.draftKind || 'ai')+'&source='+encodeURIComponent(d.id))}>Resume template</button></div>)}</div></details>}
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
            ) : !visible.length ? (
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
              <div className="bt-gallery">
                {visible.map((t) => (
                  <article className="bt-card" key={t.id}>
                    <div className="bt-card-art">
                    <BrandTemplateScenePreview
                      graph={t.sceneGraph}
                      assetUrls={urls}
                      size="card"
                      maxHeight={256}
                    />
                    </div>
                    <div className="xp-card-copy">
                      <span className="xp-status">
                        {t.state} · {t.saved ? "Saved" : "Review required"}
                      </span>
                      <h3>{t.name}</h3>
                      <p>
                        {AD_FORMATS.find((f) => f.id === t.format)?.label ||
                          t.format}{" "}
                        · {t.provenance.method === "provider-ai-creative" ? "AI artwork" : "Editable layout"}
                      </p>
                      <p>
                        {t.blockers.length
                          ? `${t.blockers.length} unresolved source requirements`
                          : "Editable text, product & logo"}
                      </p>
                      <button
                        className="xp-primary"
                        onClick={() =>
                          go(base + "/" + encodeURIComponent(t.id))
                        }
                      >
                        Preview template →
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
