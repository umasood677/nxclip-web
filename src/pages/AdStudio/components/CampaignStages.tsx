import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, CircleCheckBig, ImageIcon, LayoutTemplate, Lightbulb, MessageCircleMore, Palette, ShieldCheck, Trash2, Type, Users, Wand2 } from "lucide-react";
import { adImageApi, adStudioApi, quotedConceptApi } from "../../../services/apiClient";
import { applyCampaignStrategy, requireAiConceptResult, type PlanningInput, type QuotedConceptResult } from "../production/conceptExecutionModel";
import { Button } from "../../../components/ui/button";
import { EmptyState } from "../../../components/common/EmptyState";
import { BrandTemplateScenePreview } from "../../BrandKits/templates/BrandTemplateScenePreview";
import type { useAdProjectWorkspace } from "../production/useAdProjectWorkspace";
import { OriginalCampaignAd } from "./OriginalCampaignAd";
import { isAdStudioTemplateId, getTemplateDef } from "../canvas/templateCatalog";
import { exampleForPlanning } from "../lib/publishedExampleBriefs";
import { campaignProductionBrief } from "../lib/campaignProductionBrief";
import { creativeEditorPath, projectBriefForm, projectWorkspacePath, saveWorkspaceBrief } from "../lib/projectWorkspace";
import { generateOriginalCampaignAd, type CampaignDraftInput } from "../lib/originalCampaignAd";
import { readSelectedConceptIds, writeSelectedConceptIds } from "../lib/selectedConceptStorage";
import { AD_FORMATS } from "../types";
import "../../BrandKits/overview/brandOverview.css";

const stages = [
  ["workspace", "Workspace"],
  ["strategy", "Campaign Brief"],
  ["directions", "Creative Directions"],
  ["production-review", "Production Review"],
  ["compare", "Compare & Approve"],
] as const;

const workflowStages = stages.filter(([key]) => key !== "workspace");

export type CampaignStage = (typeof stages)[number][0];
export const isCampaignStage = (view: string | null): view is CampaignStage =>
  stages.some(([key]) => key === view);

type PlanningReceipt = { projectId: string; requestId: string; action: PlanningInput["planningAction"] };
const receiptKey = (projectId: string) => "nxclip.campaign-planning." + projectId;
function storedReceipt(projectId?: string): PlanningReceipt | undefined {
  if (!projectId) return;
  try {
    const value = JSON.parse(sessionStorage.getItem(receiptKey(projectId)) ?? "null");
    if (value?.projectId === projectId && typeof value.requestId === "string" &&
      (value.action === "brief" || value.action === "directions")) return value;
  } catch { /* Storage can be unavailable in private browsing. */ }
}
function storeReceipt(projectId: string, receipt?: PlanningReceipt) {
  try {
    if (receipt) sessionStorage.setItem(receiptKey(projectId), JSON.stringify(receipt));
    else sessionStorage.removeItem(receiptKey(projectId));
  } catch { /* Current-page recovery is still available. */ }
}

function apiErrorMessage(error: unknown, fallback: string) {
  return error && typeof error === "object" && "message" in error && typeof error.message === "string"
    ? error.message : fallback;
}

const fields = [
  ["productOrService", "Advertising subject"],
  ["targetAudience", "Audience"],
  ["coreMessage", "Core message"],
  ["desiredTone", "Tone"],
  ["creativeDirection", "Visual direction"],
  ["headline", "Headline"],
  ["supportingCopy", "Supporting copy"],
  ["cta", "Call to action"],
] as const;

export function CampaignStages({ controller, stage, query }: {
  controller: ReturnType<typeof useAdProjectWorkspace>;
  stage: CampaignStage;
  query: URLSearchParams;
}) {
  const { project, form, savedForm, setForm, setProject, setSavedForm, saveBrief, creatives, assetUrls, concepts, brand, navigate, setCreatives } = controller;
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  const [directionFeedback, setDirectionFeedback] = useState("");
  const [retained, setRetained] = useState<PlanningReceipt | undefined>(() => storedReceipt(project?.id));
  const [editing, setEditing] = useState<import("../types").AdConcept>();
  const [productionCopy, setProductionCopy] = useState<Record<string, Partial<typeof form>>>({});
  const [preparedProductionConceptId, setPreparedProductionConceptId] = useState<string>();
  const [previewConfirmationOpen, setPreviewConfirmationOpen] = useState(false);
  const [previewGenerating, setPreviewGenerating] = useState(false);
  const [artDirectionExpanded, setArtDirectionExpanded] = useState(false);
  const [approvingCreativeId, setApprovingCreativeId] = useState<string>();
  const operation = useRef(false);
  const pageStart = useRef<HTMLElement>(null);
  useEffect(() => {
    pageStart.current?.scrollIntoView({ block: "start" });
  }, [stage, project?.id]);
  if (!project) return null;
  const base = projectWorkspacePath(project.id);
  const querySelection = query.getAll("direction");
  const storedSelection = readSelectedConceptIds(project.id);
  const selected = querySelection.length ? querySelection : storedSelection;
  const example = exampleForPlanning(project.brief?.exampleBriefId ?? "");
  const defaultId = project.brief?.defaultTemplateId;
  const defaultTemplate = isAdStudioTemplateId(defaultId) ? getTemplateDef(defaultId) : undefined;
  const sourceCreative = creatives.find(item => item.id === project.brief?.startingCreativeId);
  const directions = concepts.filter((concept) => selected.includes(concept.conceptId));
  const campaignCreatives = creatives.filter((creative) => creative.documentPurpose !== "concept-preview");
  const directionForCreative = (creative: typeof campaignCreatives[number]) => {
    const conceptId = creative.conceptSnapshot?.conceptId;
    return typeof conceptId === "string" ? concepts.find((concept) => concept.conceptId === conceptId) : undefined;
  };
  const creativeHasArtwork = (creative: typeof campaignCreatives[number]) =>
    Boolean(creative.sceneGraph?.layers.some((layer) => {
      if (layer.type !== "image") return false;
      const image = layer as { assetId?: unknown };
      return typeof image.assetId === "string" && image.assetId.length > 0;
    }));
  const conceptPreviews = creatives.filter((creative) => creative.documentPurpose === "concept-preview" && !!creative.conceptPreview);
  const previewForConcept = (conceptId: string) =>
    conceptPreviews.find((creative) => creative.conceptPreview?.conceptId === conceptId);
  const previewUrlForConcept = (conceptId: string) => {
    const preview = previewForConcept(conceptId);
    const assetId = preview?.sceneGraph?.layers.find(
      (layer) => layer.id.startsWith("ai-background-") && "assetId" in layer,
    )?.assetId;
    return assetId ? assetUrls[assetId] : undefined;
  };
  const hasIncompleteConceptPreview = concepts.some((concept) => !previewForConcept(concept.conceptId)?.conceptPreview?.generated);
  const briefSaved = savedForm === JSON.stringify(form);
  const campaignFormat = AD_FORMATS.find((format) => format.id === (project.outputFormat ?? project.brief?.outputFormat));
  const href = (view: CampaignStage, ids = selected) => {
    const next = new URLSearchParams(query);
    next.set("view", view);
    next.delete("direction");
    ids.forEach((id) => next.append("direction", id));
    return base + "?" + next;
  };
  async function approveCreativeVersion(creative: typeof campaignCreatives[number]) {
    const version = creative.currentVersion ?? 1;
    if (!window.confirm(`Approve version ${version} of this creative? Any Canvas edit will create a new draft that requires separate approval.`)) return;
    setApprovingCreativeId(creative.id);
    setMessage("");
    try {
      const updated = await adStudioApi.updateCreative(creative.id, {
        expectedVersion: version,
        status: "ready",
        changeSummary: `Approved version ${version} for export`,
      });
      setCreatives(items => items.map(item => item.id === updated.id ? updated : item));
      setMessage(`Version ${version} is approved and ready for export.`);
    } catch (error) {
      setMessage(apiErrorMessage(error, "Could not approve this creative version."));
    } finally {
      setApprovingCreativeId(undefined);
    }
  }
  const persistSelection = (ids: string[]) => writeSelectedConceptIds(project.id, ids);
  const nextDirectionSelection = (conceptId: string) => {
    return selected.includes(conceptId)
      ? selected.filter((id) => id !== conceptId)
      : [...selected, conceptId];
  };
  async function save() {
    if (operation.current || !form.campaignIdea?.trim()) return false;
    operation.current = true;
    setSaving(true);
    setMessage("");
    try {
      await saveBrief({ allowCampaignIdeaEdit: true });
      setMessage("Campaign brief saved.");
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the brief.");
      return false;
    } finally {
      operation.current = false;
      setSaving(false);
    }
  }

  async function plan(action: PlanningInput["planningAction"]) {
    if (!project || operation.current || retained) return;
    operation.current = true;
    setSaving(true);
    setMessage("");
    try {
      if (action === "brief") await saveBrief({ allowCampaignIdeaEdit: true });
      const refinement = (action === "brief" ? feedback : directionFeedback).trim();
      const input: PlanningInput = { planningAction: action, conceptCount: 3,
        ...(refinement ? { planningFeedback: refinement } : {}) };
      const request = { projectId: project.id, requestId: crypto.randomUUID(), action };
      setRetained(request);
      storeReceipt(project.id, request);
      const result = await quotedConceptApi.planningExecute(project.id, { ...input, requestId: request.requestId });
      await applyPlan(action, result);
      storeReceipt(project.id);
      setRetained(undefined);
    } catch (error) {
      const detail = apiErrorMessage(error, "Planning could not complete.");
      setMessage(detail.includes("Concept generation could not complete") || detail.includes("temporarily unavailable")
        ? detail
        : `Planning could not complete: ${detail}`);
    } finally {
      operation.current = false;
      setSaving(false);
    }
  }

  async function applyPlan(action: PlanningInput["planningAction"], result: QuotedConceptResult) {
    if (action === "brief") {
      if (!result.campaignStrategy) throw Error("The saved request has no campaign brief.");
      const strategy = result.campaignStrategy;
      const nextForm = applyCampaignStrategy(form, strategy);
      setForm(nextForm);
      // Planning results are an editable draft, not an approved brief.  Save
      // them immediately so the owner can reopen this completed request
      // without buying or rerunning planning work.
      const updated = await saveWorkspaceBrief(adStudioApi, project, nextForm, {
        allowCampaignIdeaEdit: true,
        // A saved AI strategy is ready for direction generation. This is an
        // approval of the persisted brief, not an authorization for images.
        approvePlanning: true,
      });
      const persistedForm = projectBriefForm(updated);
      setProject(updated);
      setForm(persistedForm);
      setSavedForm(JSON.stringify(persistedForm));
      setFeedback("");
      setMessage("Campaign brief is ready to review and edit.");
    } else {
      controller.setConcepts(requireAiConceptResult(result).concepts);
      setDirectionFeedback("");
      setMessage("Three directions are ready to review.");
    }
  }

  async function checkPlanning() {
    if (!retained || retained.projectId !== project?.id || operation.current) return;
    operation.current = true;
    setSaving(true);
    try {
      const status = await quotedConceptApi.status(retained.projectId, retained.requestId);
      if (status.status === "completed" && status.result && retained.action === "brief") {
        await applyPlan(retained.action, status.result);
        storeReceipt(retained.projectId);
        setRetained(undefined);
      } else if (status.status === "completed") {
        const saved = await adStudioApi.listConcepts(retained.projectId);
        if (saved.jobId !== status.jobId) {
          setMessage("The request completed, but its directions were not saved to this project. No paid request was repeated.");
          return;
        }
        controller.setConcepts(saved.concepts);
        setMessage("Reopened saved project directions.");
        storeReceipt(retained.projectId);
        setRetained(undefined);
      } else if (status.status === "failed") {
        setMessage("Planning failed. Review the campaign brief, then start a new planning request when ready.");
        storeReceipt(retained.projectId);
        setRetained(undefined);
      } else setMessage("The saved request is still processing.");
    } catch (error) {
      const detail = apiErrorMessage(error, "");
      setMessage(
        detail.includes("Concept request not found")
          ? "No saved planning request was found. You can start a new request when ready."
          : "Could not verify the saved request. No paid request was repeated.",
      );
    } finally {
      operation.current = false;
      setSaving(false);
    }
  }

  async function generateConceptPreviews() {
    if (previewGenerating || !concepts.length) return;
    setPreviewGenerating(true);
    setMessage("");
    try {
      const approvedIds = new Set(brand?.voice?.studio?.approvedAssetIds ?? []);
      const selectedProfile = (brand?.voice?.studio?.characters ?? []).find((profile) =>
        profile.id === form.preferredModelProfile &&
        profile.status === "approved" &&
        profile.permissions.scopes.includes("ad-studio"),
      );
      for (const concept of concepts) {
        const existing = previewForConcept(concept.conceptId);
        if (existing?.conceptPreview?.generated) continue;
        const production = campaignProductionBrief(project, concept, brand);
        const modelReferences: CampaignDraftInput["references"] = selectedProfile
          ? selectedProfile.referenceAssetIds
              .filter((assetId) => approvedIds.has(assetId))
              .map((assetId) => ({
                assetId,
                purpose: "MODEL_IDENTITY" as const,
                profileId: selectedProfile.id,
              }))
          : [];
        const references: CampaignDraftInput["references"] = [
          ...production.verifiedAssets
            .filter((asset) => asset.role === "product_image")
            .map((asset) => ({ assetId: asset.id, purpose: "PRODUCT_IDENTITY" as const })),
          ...modelReferences,
          ...production.verifiedAssets
            .filter((asset) => asset.role === "campaign_reference" || asset.role === "other")
            .map((asset) => ({ assetId: asset.id, purpose: "STYLE_REFERENCE" as const })),
        ];
        const requestId = existing?.conceptPreview?.requestId ?? crypto.randomUUID();
        const input: CampaignDraftInput = {
          requestId,
          conceptId: concept.conceptId,
          conceptPreview: true,
          instruction: [
            concept.visualPrompt,
            `Composition: ${concept.composition}`,
            `Layout family: ${concept.layoutFamily ?? "direction-led"}`,
            `Colour direction: ${(concept.colorRecommendations ?? []).join(", ") || "follow campaign direction"}`,
            "Generate cohesive photographic artwork only. Do not render headlines, supporting copy, CTA text, logos, placeholder boxes, or promotional lettering into the image.",
          ].filter(Boolean).join("\n"),
          headline: production.headline,
          supportingCopy: production.supportingCopy,
          cta: production.cta,
          references,
        };
        const completed = await generateOriginalCampaignAd(adImageApi, project.id, input, (draft) => {
          controller.setCreatives((items) => [draft, ...items.filter((item) => item.id !== draft.id)]);
        }, { authorizeQuote: async () => true });
        if (completed) controller.setCreatives((items) => [completed, ...items.filter((item) => item.id !== completed.id)]);
      }
      await controller.load();
      setMessage("AI concept previews are ready to review. Final campaign ads are generated separately in Production Review.");
    } catch (error) {
      setMessage(apiErrorMessage(error, "A concept preview could not complete. Its saved request was retained and was not submitted again."));
    } finally {
      setPreviewGenerating(false);
      setPreviewConfirmationOpen(false);
    }
  }

  const planningStatus = <div className="campaign-planning-status" aria-live="polite">
    {retained && !saving && <Button variant="outline" type="button" onClick={() => void checkPlanning()}>Check saved request</Button>}
    {(saving || message) && <p role="status" className="text-sm text-muted-foreground">{saving ? "Creative Director is working…" : message}</p>}
  </div>;

  return (
    <main ref={pageStart} className="ad-project-workspace ad-studio-w0a campaign-planning-stages space-y-4">
      <nav aria-label="Breadcrumb" className="bo-breadcrumb flex-wrap">
        <Link to="/create/ad"><ArrowLeft size={15} aria-hidden="true" /> Ad Studio</Link>
        <span aria-hidden="true">/</span>
        <Link to={base}>{project.name}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{stages.find(([key]) => key === stage)?.[1]}</span>
      </nav>
      <header className="campaign-stage-header">
        <h1 className="text-2xl font-semibold break-words">{stages.find(([key]) => key === stage)?.[1]}</h1>
      </header>
      <nav aria-label="Campaign workflow" className="campaign-stage-tabs">
        {workflowStages.map(([key, label]) => (
          <Button key={key} asChild variant={key === stage ? "secondary" : "ghost"} className={`campaign-stage-tab${key === stage ? " is-active" : ""}`}>
            <Link to={href(key)} aria-current={key === stage ? "step" : undefined}>{label}</Link>
          </Button>
        ))}
      </nav>
      {stage !== "compare" && (example || defaultTemplate || sourceCreative) && (
        <section className="ad-project-workspace__panel campaign-stage-source flex items-start gap-3">
          {example?.previewImage && <img className="h-24 w-20 shrink-0 rounded-md object-contain" src={example.previewImage} alt={example.title + " reference"} />}
          <div className="min-w-0 space-y-1">
            <h2 className="font-semibold break-words">{example?.title ?? sourceCreative?.name ?? defaultTemplate?.name}</h2>
            {example && <>
              <p className="text-sm">{project.brief?.exampleVisualDirection || example.creativeDirection}</p>
              <p className="text-sm text-muted-foreground">Example inspiration. Your campaign supplies its own subject, claims and copy.</p>
            </>}
            {sourceCreative && <p className="text-sm text-muted-foreground">Brand Template · Revision {String(sourceCreative.conceptSnapshot?.brandTemplateRevision ?? "")}</p>}
            {defaultTemplate && <p className="text-sm text-muted-foreground">Default Template</p>}
          </div>
        </section>
      )}
      {stage === "workspace" && (
        <>
          <section className="campaign-workspace-overview">
            <article className="ad-project-workspace__panel campaign-workspace-idea">
              <div className="campaign-workspace-idea__heading">
                <div>
                  <span className="campaign-director__eyebrow">Campaign</span>
                  <h2>{project.name}</h2>
                </div>
                <span className="campaign-workspace-status">{project.status ?? "Draft"}</span>
              </div>
              <p>{form.campaignIdea?.trim() || "Add a campaign idea to begin shaping the creative direction."}</p>
              <div className="campaign-workspace-meta">
                {brand?.name && <span>{brand.name}</span>}
                {project.brief?.outputFormat && <span>{project.brief.outputFormat.replace(/_/g, " ")}</span>}
                <span>{campaignCreatives.length} saved {campaignCreatives.length === 1 ? "creative" : "creatives"}</span>
              </div>
            </article>
            <article className="ad-project-workspace__panel campaign-workspace-director">
              <div>
                <span className="campaign-director__eyebrow">Creative Director</span>
                <h2>Shape the campaign direction</h2>
                <p>Review the brief, then select the strongest creative approach.</p>
              </div>
              <div className="campaign-workspace-director__actions">
                <Link className="w0a-create-project" to={href("strategy")}>Review campaign brief <ArrowRight size={16} /></Link>
                <Button asChild variant="outline"><Link to={href("directions")}>Creative directions</Link></Button>
              </div>
            </article>
          </section>
          <section className="campaign-workspace-creatives" aria-labelledby="campaign-workspace-creatives-title">
            <div className="campaign-workspace-creatives__heading">
              <div>
                <span className="campaign-director__eyebrow">Campaign output</span>
                <h2 id="campaign-workspace-creatives-title">Project creatives</h2>
              </div>
              {campaignCreatives.length > 0 && <Button asChild variant="ghost"><Link to={href("compare")}>Compare creatives</Link></Button>}
            </div>
            {campaignCreatives.length ? (
              <div className="campaign-workspace-creative-grid">
                {campaignCreatives.slice(0, 3).map((creative) => (
                  <article key={creative.id} className="ad-project-workspace__panel campaign-workspace-creative">
                    {creative.sceneGraph && <BrandTemplateScenePreview graph={creative.sceneGraph} assetUrls={assetUrls} label={creative.name} fillCard readablePlaceholder />}
                    <div className="campaign-workspace-creative__body">
                      <h3>{creative.name}</h3>
                      <p>{creative.sceneGraph?.canvas ? `${creative.sceneGraph.canvas.width} × ${creative.sceneGraph.canvas.height}` : "Campaign creative"}</p>
                      <Button asChild variant="outline"><Link to={creativeEditorPath(creative.id)}>Open Canvas</Link></Button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <article className="ad-project-workspace__panel campaign-workspace-empty">
                <h3>No creatives yet</h3>
                <p>Start with the campaign brief to prepare a direction before creating artwork.</p>
                <Link className="w0a-create-project" to={href("strategy")}>Start with the brief <ArrowRight size={16} /></Link>
              </article>
            )}
          </section>
        </>
      )}
      {stage === "strategy" && (
        <form className="campaign-brief-layout" onSubmit={(event) => { event.preventDefault(); void (async () => {
          if (await save()) navigate(href("directions"));
        })(); }}>
          <div className="ad-project-workspace__panel campaign-brief campaign-brief__main space-y-4">
            <label className="grid gap-1.5 text-sm">
              <span className="campaign-brief__label"><Lightbulb size={18} aria-hidden="true" />Campaign idea</span>
              <textarea className="min-w-0 rounded-md border border-input bg-background px-3 py-2" placeholder="Describe the campaign you want to create."
                rows={4} maxLength={4000} value={form.campaignIdea ?? ""} disabled={saving}
                onChange={(event) => setForm((current) => ({ ...current, campaignIdea: event.target.value }))} />
            </label>
            {campaignFormat && <p className="text-xs text-muted-foreground">Ad format · {campaignFormat.label} · {campaignFormat.width} × {campaignFormat.height}</p>}
            <section className="campaign-stage-section">
              <div className="campaign-stage-section__title"><span className="campaign-stage-section__icon"><Users size={18} aria-hidden="true" /></span><h2>Audience and message</h2></div>
              <div className="grid gap-3 sm:grid-cols-2">
              {fields.slice(0, 4).map(([key, label]) => (
                <label key={key} className="grid gap-1 text-sm">
                  {label}
                  <input className="min-w-0 rounded-md border border-input bg-background px-3 py-2"
                    value={form[key] ?? ""} disabled={saving}
                    onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} />
                </label>
              ))}
              </div>
            </section>
            <section className="campaign-stage-section campaign-stage-section--art">
              <button className="campaign-brief__section-toggle" type="button" aria-expanded={artDirectionExpanded} onClick={() => setArtDirectionExpanded((current) => !current)}>
                <span className="campaign-stage-section__title"><span className="campaign-stage-section__icon"><Palette size={18} aria-hidden="true" /></span><span><b>Art direction & copy</b><small>Visual direction, headline, supporting copy and CTA</small></span></span>
                {artDirectionExpanded ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
              </button>
              <dl className="campaign-brief__art-summary">
                {fields.slice(4).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{form[key]?.trim() || "Not set"}</dd></div>)}
              </dl>
              {artDirectionExpanded && <div className="grid gap-3 sm:grid-cols-2">
                {fields.slice(4).map(([key, label]) => (
                  <label key={key} className="grid gap-1 text-sm">
                    {label}
                    <input className="min-w-0 rounded-md border border-input bg-background px-3 py-2"
                      value={form[key] ?? ""} disabled={saving}
                      onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} />
                  </label>
                ))}
              </div>}
            </section>
            {!!form.planningAssumptions?.length && <section className="campaign-brief__notes">
              <h2>Planning notes</h2><ul>{form.planningAssumptions.map((item, index) => <li key={index}>{item}</li>)}</ul>
            </section>}
          </div>
          <aside className="campaign-brief-sidebar">
            <section className="campaign-director" aria-label="Creative Director">
              <div className="campaign-director__heading"><span className="campaign-director__icon"><Wand2 size={19} aria-hidden="true" /></span><div><span className="campaign-director__eyebrow">Creative Director</span><h2>Refine the brief</h2></div></div>
              <label className="grid gap-1 text-sm"><span className="sr-only">Feedback for the Creative Director</span>
                <input className="min-w-0 rounded-md border border-input bg-background px-3 py-2" maxLength={1000}
                  placeholder="Optional: add a goal, audience, or visual constraint" value={feedback} disabled={saving}
                  onChange={event => setFeedback(event.target.value)} />
              </label>
              <Button type="button" variant="outline" disabled={saving || !!retained || !form.campaignIdea?.trim()} onClick={() => void plan("brief")}>{feedback.trim() ? "Refine brief" : "Develop campaign brief"}</Button>
              <div className="campaign-director__planning">{planningStatus}</div>
            </section>
            <section className="campaign-intelligence" aria-label="Campaign Intelligence">
              <div className="campaign-intelligence__heading"><span><ShieldCheck size={18} aria-hidden="true" /></span><h2>Campaign intelligence</h2></div>
              <div className="campaign-intelligence__identity"><span className="campaign-intelligence__avatar"><LayoutTemplate size={18} aria-hidden="true" /></span><div><strong>{project.name}</strong><small>{example ? "Example Brief" : sourceCreative ? "Brand Template" : defaultTemplate ? "Default Template" : "Original Idea"}{brand?.name ? ` · ${brand.name}` : ""}</small></div></div>
              <div className="campaign-intelligence__section"><h3>Creative guardrails</h3><p>{form.negativeInstructions?.trim() || form.creativeDirection?.trim() || "No additional restrictions saved."}</p></div>
              <div className="campaign-intelligence__section"><h3>Brief readiness</h3><ul>
                <li className={form.coreMessage?.trim() && form.targetAudience?.trim() ? "is-ready" : ""}><CircleCheckBig size={15} /> Strategy {form.coreMessage?.trim() && form.targetAudience?.trim() ? "ready" : "needs audience or message"}</li>
                <li className={form.headline?.trim() && form.cta?.trim() ? "is-ready" : ""}><CircleCheckBig size={15} /> Copy {form.headline?.trim() && form.cta?.trim() ? "ready" : "needs headline or CTA"}</li>
                <li className={!brand || !!brand.assets?.length ? "is-ready" : ""}><CircleCheckBig size={15} /> References {!brand ? "not required" : brand.assets?.length ? "available" : "needs review"}</li>
              </ul></div>
            </section>
          </aside>
          <footer className="campaign-brief__footer campaign-brief__footer--sticky">
            <span>{briefSaved ? <><Check size={15} aria-hidden="true" /> Brief saved</> : "Save your changes before continuing"}</span>
            <button type="submit" className="w0a-create-project" disabled={saving || !form.campaignIdea?.trim()}>Continue to Creative Directions <ArrowRight size={16} aria-hidden="true" /></button>
          </footer>
          {message && !saving && <p className="campaign-brief__message" role="status">{message}</p>}
        </form>
      )}
      {stage === "directions" && <>
        <div className="campaign-directions-toolbar">
          {concepts.length > 0 && <label className="grid gap-1 text-sm">Refine directions
            <input className="rounded-md border border-input bg-background px-3 py-2"
              maxLength={1000} value={directionFeedback} disabled={saving}
              onChange={event => setDirectionFeedback(event.target.value)}
              placeholder="What should change?" />
          </label>}
          <Button variant="outline" disabled={saving || !!retained || !form.campaignIdea?.trim()} onClick={() => void plan("directions")}>{directionFeedback.trim() ? "Regenerate directions" : "Generate three creative directions"}</Button>
        </div>
        {planningStatus}
        {concepts.length ? <>
          {previewConfirmationOpen && <section className="campaign-concept-preview-consent" aria-live="polite">
            <div><strong>Generate {concepts.length} AI concept previews?</strong><p>One distinct preview is generated for every saved direction. Provider usage may incur charges. These are concept previews—not final advertisements.</p></div>
            <div><Button variant="outline" type="button" disabled={previewGenerating} onClick={() => setPreviewConfirmationOpen(false)}>Cancel</Button><Button type="button" disabled={previewGenerating} onClick={() => void generateConceptPreviews()}>{previewGenerating ? "Generating previews…" : "Confirm and generate previews"}</Button></div>
          </section>}
          <div className="campaign-directions-layout">
            <div className="campaign-direction-grid">
              {concepts.map((concept) => {
                const preview = previewForConcept(concept.conceptId);
                const previewUrl = previewUrlForConcept(concept.conceptId);
                const production = campaignProductionBrief(project, concept, brand);
                const isSelected = selected.includes(concept.conceptId);
                const previewStatus = previewUrl ? "Generated" : previewGenerating ? "Generating" : preview ? "Recovery available" : "Preview not generated";
                return <article key={concept.conceptId} className={`ad-project-workspace__panel campaign-direction-card flex min-w-0 flex-col gap-3 ${isSelected ? "is-selected" : ""}`}>
                  <div className="campaign-direction-card__visual" aria-label={previewUrl ? `AI concept preview: ${concept.title}` : `AI concept preview not generated for ${concept.title}`}>
                    {previewUrl ? <img src={previewUrl} alt={`AI concept preview for ${concept.title}`} /> : <div className="campaign-direction-card__preview-empty"><ImageIcon size={28} aria-hidden="true" /><span>{previewStatus}</span><small>Generate previews to evaluate this direction visually.</small></div>}
                    <span className={`campaign-direction-card__preview-label${previewUrl ? " is-generated" : ""}`}>AI Concept Preview · {previewStatus}</span>
                  </div>
                  <div className="campaign-direction-card__topline"><span>{isSelected ? "Selected" : "Not selected"}</span><span>{campaignFormat?.label || "Format pending"}</span></div>
                  <h2 className="font-semibold">{concept.title}</h2>
                  {editing?.conceptId === concept.conceptId ? <div className="grid gap-2">
                  {(["title", "creativeDirection", "composition", "explanation"] as const).map(key => <label className="grid gap-1 text-sm" key={key}>
                    {{ title: "Title", creativeDirection: "Visual direction", composition: "Composition", explanation: "Campaign alignment" }[key]}
                    <textarea className="rounded-md border border-input bg-background px-3 py-2" rows={2} maxLength={{title:120,creativeDirection:800,composition:400,explanation:400}[key]} value={editing[key] ?? ""} onChange={event => setEditing({ ...editing, [key]: event.target.value })} />
                  </label>)}
                  <div className="flex gap-2">
                    <Button variant="outline" disabled={saving} onClick={async () => {
                      if (operation.current) return;
                      operation.current = true;
                      setSaving(true);
                      try {
                        const { title, creativeDirection, composition, explanation = "" } = editing;
                        const saved = await quotedConceptApi.saveDirection(project.id, concept.conceptId, { title, creativeDirection, composition, explanation });
                        controller.setConcepts(items => items.map(item => item.conceptId === saved.conceptId ? saved : item));
                        setEditing(undefined);
                        setMessage("Direction saved.");
                      } catch (error) {
                        setMessage(error instanceof Error ? error.message : "Could not save direction.");
                      } finally {
                        operation.current = false;
                        setSaving(false);
                      }
                    }}>Save direction</Button>
                    <Button variant="ghost" disabled={saving} onClick={() => setEditing(undefined)}>Cancel</Button>
                  </div>
                  </div> : <>
                  <p className="text-sm text-muted-foreground">{concept.creativeDirection}</p>
                  <dl className="campaign-direction-card__details">
                    <div><dt><LayoutTemplate size={14} aria-hidden="true" />Composition</dt><dd>{concept.composition}</dd></div>
                    <div><dt><Palette size={14} aria-hidden="true" />Layout</dt><dd>{concept.layoutFamily?.replace(/-/g, " ") || "Direction-led"}</dd></div>
                    <div><dt><Type size={14} aria-hidden="true" />Headline</dt><dd>{concept.primaryHeadline}</dd></div>
                    <div><dt><MessageCircleMore size={14} aria-hidden="true" />Supporting copy</dt><dd>{concept.supportingCopy || "Optional"}</dd></div>
                    <div><dt><ArrowRight size={14} aria-hidden="true" />CTA</dt><dd>{concept.cta || "Not set"}</dd></div>
                  </dl>
                  {concept.explanation && <p className="campaign-direction-card__alignment text-sm">{concept.explanation}</p>}
                  {production.verifiedAssets.length > 0 && <div className="campaign-direction-card__assets" aria-label="Authorized campaign references">{production.verifiedAssets.slice(0, 3).map((asset) => assetUrls[asset.id] ? <img key={asset.id} src={assetUrls[asset.id]} alt={asset.label || asset.role} /> : <span key={asset.id}>{asset.label || asset.role}</span>)}</div>}
                </>}
                  <div className="campaign-direction-card__actions mt-auto">
                    <Button variant="ghost" disabled={saving} onClick={() => setEditing(concept)}>Edit details</Button>
                    <Button asChild variant={isSelected ? "secondary" : "outline"}>
                      <Link to={href("directions", nextDirectionSelection(concept.conceptId))} onClick={() => persistSelection(nextDirectionSelection(concept.conceptId))} aria-label={(isSelected ? "Deselect " : "Select ") + concept.title}>
                        {isSelected ? <><Check size={16} /> Deselect</> : "Select direction"}
                      </Link>
                    </Button>
                  </div>
                </article>;
              })}
            </div>
            <aside className="campaign-selection-panel">
              <div className="campaign-intelligence__heading"><span><Wand2 size={18} aria-hidden="true" /></span><h2>Creative selection</h2></div>
              <strong className="campaign-selection-panel__count"><Check size={16} /> {directions.length} selected</strong>
              <ul className="campaign-selection-panel__names">{directions.length ? directions.map((concept) => <li key={concept.conceptId}>{concept.title}</li>) : <li>Select one or more directions.</li>}</ul>
              <div className="campaign-intelligence__section"><h3>Approved copy</h3><p><b>{form.headline || "Headline pending"}</b><br />{form.cta || "CTA pending"}</p></div>
              <div className="campaign-intelligence__section"><h3>Sources</h3><p>{example?.title ?? sourceCreative?.name ?? defaultTemplate?.name ?? brand?.name ?? "Original campaign idea"}</p></div>
              <div className="campaign-intelligence__section"><h3>Candidate readiness</h3><p>{directions.length ? hasIncompleteConceptPreview ? "Directions selected. Generate previews when you are ready to compare visuals." : "Selected directions are ready for Production Review." : "Choose a direction to continue."}</p></div>
              {hasIncompleteConceptPreview && <Button variant="outline" type="button" disabled={previewGenerating || saving} onClick={() => setPreviewConfirmationOpen(true)}>{conceptPreviews.length ? "Resume AI previews" : "Generate AI previews"}</Button>}
            </aside>
          </div>
          <footer className="campaign-direction-footer"><span><Check size={16} /> {directions.length} of {concepts.length} directions selected</span>{directions.length ? <Link className="w0a-create-project" to={href("production-review")}>Continue to Production Review <ArrowRight size={16} /></Link> : <Button disabled>Select a direction to continue</Button>}</footer>
        </> : <EmptyState title="No saved creative directions" description="Generate three directions when the campaign idea is ready." />}
      </>}
      {stage === "production-review" && (
        directions.length ? (() => {
          const preparedConcept = directions.find((concept) => concept.conceptId === preparedProductionConceptId);
          const preparedProduction = preparedConcept
            ? campaignProductionBrief(project, preparedConcept, brand)
            : undefined;
          return <>
          <div className="campaign-production-grid">
            {(sourceCreative || defaultTemplate) && <div className="campaign-production-actions flex flex-wrap gap-2">
              {sourceCreative && <Button asChild variant="outline"><Link to={creativeEditorPath(sourceCreative.id)}>Open faithful adaptation in Canvas</Link></Button>}
              {defaultTemplate && project.brief?.outputFormat && defaultTemplate.formats.some(format => format === project.brief?.outputFormat) &&
                <Button variant="outline" onClick={() => controller.openTemplate(defaultTemplate.templateId, project.brief!.outputFormat as typeof defaultTemplate.formats[number])}>Open editable Default Template</Button>}
            </div>}
            {directions.map((concept) => {
              const production = campaignProductionBrief(project, concept, brand);
              const previewUrl = previewUrlForConcept(concept.conceptId);
              const preview = previewForConcept(concept.conceptId);
              const previewStatus = previewUrl ? "Generated" : preview?.conceptPreview?.generated ? "Loading preview" : "Not generated";
              return <article key={production.conceptId} className="ad-project-workspace__panel campaign-production-card min-w-0 break-words">
                <div className="campaign-production-card__topline"><span>Production candidate</span><span>{campaignFormat?.label ?? production.format}</span></div>
                <div className="campaign-production-card__visual" aria-label={previewUrl ? `AI concept preview: ${production.title}` : `AI concept preview not generated for ${production.title}`}>
                  {previewUrl ? <img src={previewUrl} alt={`AI concept preview for ${production.title}`} /> : <div className="campaign-production-card__preview-empty"><ImageIcon size={28} aria-hidden="true" /><span>{previewStatus}</span><small>Return to Creative Directions to generate a preview.</small></div>}
                </div>
                <p className={`campaign-production-card__preview-status${previewUrl ? " is-generated" : ""}`}>AI Concept Preview · {previewStatus}</p>
                <h2 className="font-semibold">{production.title}</h2>
                <p className="campaign-production-card__summary">{production.direction}</p>
                <div className="campaign-production-card__meta"><span>{production.format}</span><span>{production.platform}</span></div>
                <p className="campaign-production-card__assets"><strong>Asset verification</strong>{" "}
                  {production.verifiedAssets.length
                    ? production.verifiedAssets.map(asset => asset.label || asset.role).join(", ")
                    : "No verified assets selected."}
                  {production.unverifiedAssetCount > 0 && (
                    <span className="block text-muted-foreground">
                      {production.unverifiedAssetCount === 1 ? "1 selection needs review." : `${production.unverifiedAssetCount} selections need review.`}
                    </span>
                  )}
                </p>
                {production.claimWarnings.length > 0 && <p className="campaign-production-card__warning">{production.claimWarnings[0]}</p>}
                <Button type="button" variant={preparedProductionConceptId === concept.conceptId ? "secondary" : "outline"} onClick={() => setPreparedProductionConceptId(concept.conceptId)}>
                  {preparedProductionConceptId === concept.conceptId ? "Artwork preparation open" : "Prepare artwork"}
                </Button>
              </article>;
            })}
          </div>
          {preparedConcept && preparedProduction && <section className="ad-project-workspace__panel campaign-production-preparation">
            <div><span className="campaign-production-card__topline">Prepare final artwork</span><h2>{preparedProduction.title}</h2><p>Review copy and creative direction for this selected candidate before requesting final artwork.</p></div>
            <OriginalCampaignAd project={project} brand={brand} production={preparedProduction}
              form={{ ...form, headline: preparedProduction.headline, supportingCopy: preparedProduction.supportingCopy, cta: preparedProduction.cta, ...productionCopy[preparedConcept.conceptId] }}
              onChange={patch => setProductionCopy(current => ({
                ...current, [preparedConcept.conceptId]: { ...current[preparedConcept.conceptId], ...patch },
              }))}
              onSaveBrief={saveBrief}
              onSaved={creative => {
                controller.setCreatives(items => [creative, ...items.filter(item => item.id !== creative.id)]);
                controller.navigate(href("compare"));
              }} />
          </section>}
          </>;
        })() : <EmptyState title="Select a creative direction" description="Selected directions will appear here for production review." actionLabel="View directions" onAction={() => controller.navigate(href("directions"))} />
      )}
      {stage === "compare" && (
        campaignCreatives.length ? (
          <>
            <div className="campaign-compare-heading">
              <div>
                <span className="campaign-compare-heading__eyebrow">Campaign candidates</span>
                <p>Review each version, approve the one you want to finalize, then export it.</p>
                {message && <p className="campaign-compare-heading__message" role="status">{message}</p>}
              </div>
              <span className="campaign-compare-heading__count">{campaignCreatives.length} saved</span>
            </div>
            <div className="campaign-compare-grid">
              {campaignCreatives.map((creative) => {
                const hasArtwork = creativeHasArtwork(creative);
                const direction = directionForCreative(creative);
                return <article key={creative.id} className="ad-project-workspace__panel campaign-compare-card">
                  <div className={`campaign-compare-card__visual${hasArtwork ? " is-complete" : " is-empty"}`}>
                    {hasArtwork && creative.sceneGraph
                      ? <BrandTemplateScenePreview graph={creative.sceneGraph} assetUrls={assetUrls} label={creative.name} fillCard readablePlaceholder />
                      : <div className="campaign-compare-card__empty-state"><ImageIcon size={25} aria-hidden="true" /><strong>Draft without artwork</strong><span>Open Canvas to add an image, or discard this unused draft.</span></div>}
                  </div>
                  <div className="campaign-compare-card__body">
                    <span className={`campaign-compare-card__status${creative.status === "ready" ? " is-approved" : hasArtwork ? " is-review" : ""}`}>{creative.status === "ready" ? `Approved · v${creative.currentVersion ?? 1}` : hasArtwork ? `Review needed · v${creative.currentVersion ?? 1}` : "No artwork"}</span>
                    <h2 className="font-semibold">{creative.name}</h2>
                    <p>{creative.sceneGraph?.canvas ? `${creative.sceneGraph.canvas.width} × ${creative.sceneGraph.canvas.height} · ${direction?.title ?? "Campaign creative"}` : direction?.title ?? "Campaign creative"}</p>
                  </div>
                  <div className="campaign-compare-card__actions">
                    <Button asChild variant="outline"><Link to={creativeEditorPath(creative.id)}>Review / edit</Link></Button>
                    {hasArtwork && creative.status !== "ready" ? <Button type="button" disabled={approvingCreativeId === creative.id} onClick={() => void approveCreativeVersion(creative)}><Check size={15} aria-hidden="true" />{approvingCreativeId === creative.id ? "Approving…" : `Approve v${creative.currentVersion ?? 1}`}</Button> : null}
                    {hasArtwork && creative.status === "ready" ? <Button asChild><Link to={base + "?" + new URLSearchParams({ review: creative.id, reviewTab: "export" })}>Export approved version</Link></Button> : null}
                    {!hasArtwork ? <Button type="button" variant="outline" className="campaign-compare-card__discard" onClick={() => {
                      if (window.confirm("Discard this empty campaign draft? This cannot be undone.")) void controller.discardCreative(creative);
                    }}><Trash2 size={15} aria-hidden="true" />Discard draft</Button> : null}
                  </div>
                </article>;
              })}
            </div>
          </>
        ) : <EmptyState title="No creatives to compare" description="Saved campaign creatives will appear here." />
      )}
    </main>
  );
}
