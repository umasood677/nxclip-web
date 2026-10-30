import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Sparkles, ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import { adStudioApi, brandTemplateApi } from "../../../services/apiClient";
import { Skeleton } from "../../../components/ui/skeleton";
import { BrandTemplateScenePreview } from "./BrandTemplateScenePreview";
import { ProductionImageGeneration } from "../../AdStudio/production/ProductionImageGeneration";
import { hasGeneratedBackground } from "../../AdStudio/production/imageExecutionModel";
import { AdProjectCreateForm } from "../../AdStudio/components/CreateAdProjectDialog";
import { compatibleTemplateProjects, isTemplateSourceLoading } from "./brandTemplateModel";
import {
  creativeEditorPath,
  type WorkspaceCreative,
  type WorkspaceProject,
} from "../../AdStudio/lib/projectWorkspace";
import { TEMPLATE_CATALOG_V1 } from "../../AdStudio/canvas/templateCatalog";
import { projectExperiencePath } from "../../AdStudio/production/experienceRoutes";
import { AD_FORMATS } from "../../AdStudio/types";
import { useAuthenticatedBrandAssetUrls } from "../../AdStudio/canvas/useAuthenticatedBrandAssetUrls";
import { useCreativeAssetUrls } from "../../AdStudio/canvas/useCreativeAssetUrls";
import type { BrandKitSummary } from "../lib/brandKitTypes";
export function verifyTemplateSource(
  value: WorkspaceCreative,
  projects: readonly WorkspaceProject[],
  brandId: string,
) {
  if (
    !value ||
    !value.id ||
    !value.sceneGraph ||
    !Number.isInteger(value.currentVersion) ||
    Number(value.currentVersion) < 1 ||
    !projects.some((p) => p.id === value.projectId && p.brandKitId === brandId)
  )
    throw Error("This creative is unavailable for the selected Brand Kit.");
  return value;
}
export function TemplateCampaignNavigation({source}: {source: Pick<WorkspaceCreative, "id" | "projectId">}) {
  return <nav className="xp-actions bt-ai-campaign-links" aria-label="Continue campaign">
    <Link className="xp-secondary" to={projectExperiencePath(source.projectId,"workspace",{creativeId:source.id})}>Campaign workspace</Link>
    <Link className="xp-secondary" to={projectExperiencePath(source.projectId,"brief",{creativeId:source.id})}>Working Brief</Link>
    <Link className="xp-secondary" to={projectExperiencePath(source.projectId,"templates",{creativeId:source.id})}>Visual Templates</Link>
    <Link className="xp-secondary" to={projectExperiencePath(source.projectId,"concepts",{creativeId:source.id})}>Concept Gallery</Link>
    <Link className="xp-secondary" to={projectExperiencePath(source.projectId,"director",{creativeId:source.id})}>Creative Director</Link>
    <Link className="xp-secondary" to={creativeEditorPath(source.id)}>Open in Canvas</Link>
  </nav>;
}
export function BrandTemplateAiWorkspace({
  kit,
  projects,
  initialFormat,
  onBack,
}: {
  kit: BrandKitSummary;
  projects: WorkspaceProject[];
  initialFormat: string;
  onBack: () => void;
}) {
  const navigate = useNavigate(),
    [params, setParams] = useSearchParams(),
    pending = useRef(false);
  const requestedCampaign = projects.find(p => p.id === params.get("campaign") && p.brandKitId === kit.id);
  const [format, setFormat] = useState(requestedCampaign?.outputFormat || initialFormat),
    [layout, setLayout] = useState("product-hero"),
    [direction,setDirection]=useState(requestedCampaign?.brief?.creativeDirection || requestedCampaign?.brief?.campaignIdea || ""),
    [proposalReviewed,setProposalReviewed]=useState(false),
    [projectId, setProjectId] = useState(requestedCampaign?.id || ""),
    [source, setSource] = useState<WorkspaceCreative | null>(null),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [generated, setGenerated] = useState(false),
    [name, setName] = useState(kit.name + " / AI template"),
    [creatingProject, setCreatingProject] = useState(false),
    [createdProjects, setCreatedProjects] = useState<WorkspaceProject[]>([]);
  const allProjects = [
      ...createdProjects,
      ...projects.filter((p) => !createdProjects.some((c) => c.id === p.id)),
    ],
    sourceId = params.get("source");
  const brandUrls = useAuthenticatedBrandAssetUrls(kit),
    generatedUrls = useCreativeAssetUrls(source ? [source.id] : []),
    urls = { ...brandUrls, ...generatedUrls };
  const remember = (creative: WorkspaceCreative) => {
    setSource(creative);
    setProposalReviewed(false);
    const next = new URLSearchParams(params);
    next.set("mode", "ai");
    next.set("source", creative.id);
    setParams(next, { replace: true });
  };
  useEffect(() => {
    if (!sourceId || source?.id === sourceId) return;
    let active = true;
    setLoading(true);
    setError("");
    void adStudioApi
      .getCreative(sourceId)
      .then((value) => {
        const c = verifyTemplateSource(
          value,
          [...createdProjects, ...projects],
          kit.id,
        );
        if (c.id !== sourceId) throw Error("Creative context changed.");
        if (active) {
          setLoading(false);
          setSource(c);
          setGenerated(hasGeneratedBackground(c));
          setProjectId(c.projectId);
        }
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error ? e.message : "Could not reopen this creative.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sourceId, source?.id, kit.id, projects, createdProjects]);
  const matching = compatibleTemplateProjects(allProjects, kit.id, format),
    layouts = TEMPLATE_CATALOG_V1.filter((t) =>
      ["product-hero","minimal-editorial","product-launch","social-story"].includes(t.templateId) && t.formats.some((f) => f === format),
    );
  async function prepare() {
    if (pending.current) return;
    const project = matching.find((p) => p.id === projectId);
    if (!project || !kit.version) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      remember(
        verifyTemplateSource(
          await brandTemplateApi.createAiSource(kit.id, {
            projectId: project.id,
            templateId: layout,
            expectedBrandVersion: kit.version,
            creativeDirection: direction.trim(),
          }),
          allProjects,
          kit.id,
        ),
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not prepare the campaign creative.",
      );
    } finally {
      setBusy(false);
      pending.current = false;
    }
  }
  async function publish() {
    if (!source || !generated || pending.current || !kit.version) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const record = await brandTemplateApi.fromCreative(kit.id, {
        creativeId: source.id,
        expectedCreativeVersion: source.currentVersion!,
        expectedBrandVersion: kit.version,
        name,
        ...(source.imageRenderMode === "template-proposal" && proposalReviewed ? {proposalReviewed:true as const} : {}),
      });
      toast.success("AI template ready for review.");
      navigate(
        "/brands/" +
          encodeURIComponent(kit.id) +
          "/templates/" +
          encodeURIComponent(record.id),
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not publish. Your campaign creative is retained.",
      );
    } finally {
      setBusy(false);
      pending.current = false;
    }
  }
  return (
    <section className="bt-ai-workspace">
      <button className="xp-text-button" onClick={onBack}>
        <ArrowLeft size={14} /> Back to templates
      </button>
      <header>
        <span className="xp-kicker">AI CREATIVE STUDIO</span>
        <h2>
          <Sparkles size={22} /> {generated ? "Review your AI result" : "Create your AI template"}
        </h2>
        <p>
          Describe the design. Preview the complete look. Customize in Canvas.
        </p>
      </header>
      {error && (
        <p role="alert" className="bt-blocker">
          {error}
        </p>
      )}
      {isTemplateSourceLoading(loading, sourceId, source?.id) ? (
        <section className="xp-panel" role="status" aria-live="polite"><h3>Opening your saved creative…</h3><Skeleton className="h-40 w-full" /></section>
      ) : source ? (
        <>
          {generated && source.imageRenderMode !== "template-proposal" && <section className="xp-panel"><h3>This is an earlier background-only draft</h3><p>Your saved draft is unchanged. Start a finished-template proposal to use the new flow.</p><button className="xp-primary" onClick={()=>{const campaign=allProjects.find(p=>p.id===source.projectId);setFormat(campaign?.outputFormat || format);setProjectId(source.projectId);setLayout("product-hero");setSource(null);setGenerated(false);const next=new URLSearchParams(params);next.delete("source");next.set("campaign",source.projectId);setParams(next);}}>Start a template proposal</button></section>}
          <TemplateCampaignNavigation source={source} />
          {generated && source.imageRenderMode !== "template-proposal" ? <section className="xp-panel ai-generation-preview"><BrandTemplateScenePreview graph={source.sceneGraph} assetUrls={urls} size="hero" maxHeight={560}/></section> : <ProductionImageGeneration
            key={source.id}
            source={source}
            initialInstruction={source.proposalDirection || direction || allProjects.find(p => p.id === source.projectId)?.brief?.creativeDirection || ""}
            renderMode={source.imageRenderMode || (generated ? "background" : "template-proposal")}
            autoPreflight={!generated}
            onCustomize={()=>navigate(creativeEditorPath(source.id))}
            brand={kit}
            assetUrls={urls}
            onSaved={async (creative) => {
              remember(verifyTemplateSource(creative, allProjects, kit.id));
              setGenerated(true);
            }}
          />}
          {generated && (
            <section className="xp-panel bt-ai-publish">
              <h3>Save to Brand Templates</h3>
              <label className="xp-field">
                Template name
                <input
                  value={name}
                  maxLength={160}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              {source.imageRenderMode === "template-proposal" && <label className="xp-check"><input type="checkbox" checked={proposalReviewed} onChange={e=>setProposalReviewed(e.target.checked)}/>I reviewed the product depiction, packaging and brand copy.</label>}
              <button
                className="xp-primary"
                disabled={busy || !name.trim() || (source.imageRenderMode === "template-proposal" && !proposalReviewed)}
                onClick={() => void publish()}
              >
                <Plus size={16} />
                {busy ? "Saving…" : "Add to template review"}
              </button>
              <small>
                Approve the design, then save it to your library for same-brand
                campaigns.
              </small>
            </section>
          )}
        </>
      ) : (
        <div className="xp-panel bt-ai-setup">
          {creatingProject ? (
            <AdProjectCreateForm
              key={format}
              brands={[kit]}
              initialBrandId={kit.id}
              brandLocked
              format={format}
              onCancel={() => setCreatingProject(false)}
              onCreated={(project) => {
                if (project.brandKitId !== kit.id) {
                  setError("The new project must use this Brand Kit.");
                  return;
                }
                setCreatedProjects((p) => [project, ...p]);
                setProjectId(project.id);
                setCreatingProject(false);
              }}
            />
          ) : (
            <>
              <label className="xp-field">Describe your template<textarea rows={4} value={direction} maxLength={4000} onChange={e=>setDirection(e.target.value)} placeholder="A cinematic luxury product campaign with warm directional lighting and refined typography."/></label>
              <fieldset disabled={busy} className="bp-fieldset bt-setup-fields">
                <label className="xp-field">
                  Format
                  <select
                    value={format}
                    onChange={(e) => {
                      setFormat(e.target.value);
                      setProjectId("");
                      setLayout("product-hero");
                    }}
                  >
                    {AD_FORMATS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="xp-field">
                  Starting composition
                  <select
                    value={layout}
                    onChange={(e) => setLayout(e.target.value)}
                  >
                    {layouts.map((t) => (
                      <option key={t.templateId} value={t.templateId}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="xp-field">
                  Campaign
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                  >
                    <option value="">Choose a campaign</option>
                    {matching.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              </fieldset>
              {!matching.length && (
                <p>No campaign uses this Brand Kit and format.</p>
              )}
              <div className="xp-actions">
                <button
                  className="xp-secondary"
                  onClick={() => setCreatingProject(true)}
                >
                  <Plus size={16} /> Create a campaign
                </button>
                <button
                  className="xp-primary"
                  disabled={
                    busy ||
                    !projectId || !direction.trim() ||
                    !layouts.some((t) => t.templateId === layout)
                  }
                  onClick={() => void prepare()}
                >
                  <Sparkles size={16} />
                  {busy ? "Preparing…" : "Continue to preview generation"}
                </button>
              </div>
              <small>
                First test: one approved product photograph. Review the Google request before generation.
              </small>
            </>
          )}
        </div>
      )}
    </section>
  );
}
