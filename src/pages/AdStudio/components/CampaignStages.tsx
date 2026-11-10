import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { adStudioApi, quotedConceptApi } from "../../../services/apiClient";
import { applyCampaignStrategy, requireAiConceptResult, validateConceptQuote, type ConceptQuote, type PlanningInput, type QuotedConceptResult } from "../production/conceptExecutionModel";
import { Button } from "../../../components/ui/button";
import { EmptyState } from "../../../components/common/EmptyState";
import { BrandTemplateScenePreview } from "../../BrandKits/templates/BrandTemplateScenePreview";
import type { useAdProjectWorkspace } from "../production/useAdProjectWorkspace";
import { OriginalCampaignAd } from "./OriginalCampaignAd";
import { isAdStudioTemplateId, getTemplateDef } from "../canvas/templateCatalog";
import { exampleForPlanning } from "../lib/publishedExampleBriefs";
import { campaignProductionBrief } from "../lib/campaignProductionBrief";
import { creativeEditorPath, projectWorkspacePath } from "../lib/projectWorkspace";
import "../../BrandKits/overview/brandOverview.css";

const stages = [
  ["strategy", "Campaign Brief"],
  ["directions", "Creative Directions"],
  ["production-review", "Production Review"],
  ["compare", "Compare & Approve"],
] as const;

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

type PlanningSession = { id: string; budgetUsd: number; expiresAt: number };
const sessionKey = (projectId: string) => "nxclip.planning-session." + projectId;
function loadSession(projectId?: string): PlanningSession | undefined {
  if (!projectId) return;
  try {
    const value = JSON.parse(sessionStorage.getItem(sessionKey(projectId)) ?? "null");
    if (value && typeof value.id === "string" && typeof value.budgetUsd === "number" &&
      value.expiresAt > Date.now()) return value;
  } catch { /* Storage can be unavailable in private browsing. */ }
}
function storeSession(projectId: string, session?: PlanningSession) {
  try {
    if (session) sessionStorage.setItem(sessionKey(projectId), JSON.stringify(session));
    else sessionStorage.removeItem(sessionKey(projectId));
  } catch { /* Current-page authorization still works. */ }
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
  const { project, form, setForm, saveBrief, creatives, assetUrls, concepts, brand } = controller;
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [session, setSession] = useState(() => loadSession(project?.id));
  const [budget, setBudget] = useState("");
  const [feedback, setFeedback] = useState("");
  const [directionFeedback, setDirectionFeedback] = useState("");
  const [pending, setPending] = useState<{ projectId: string; input: PlanningInput; quote: ConceptQuote; form: typeof form }>();
  const [retained, setRetained] = useState<PlanningReceipt | undefined>(() => storedReceipt(project?.id));
  const [confirmAssumptions, setConfirmAssumptions] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [editing, setEditing] = useState<import("../types").AdConcept>();
  const [productionCopy, setProductionCopy] = useState<Record<string, Partial<typeof form>>>({});
  const operation = useRef(false);
  const pageStart = useRef<HTMLElement>(null);
  useEffect(() => {
    pageStart.current?.scrollIntoView({ block: "start" });
  }, [stage, project?.id]);
  if (!project) return null;
  const base = projectWorkspacePath(project.id);
  const selected = query.getAll("direction");
  const example = exampleForPlanning(project.brief?.exampleBriefId ?? "");
  const defaultId = project.brief?.defaultTemplateId;
  const defaultTemplate = isAdStudioTemplateId(defaultId) ? getTemplateDef(defaultId) : undefined;
  const sourceCreative = creatives.find(item => item.id === project.brief?.startingCreativeId);
  const directions = concepts.filter((concept) => selected.includes(concept.conceptId));
  const href = (view: CampaignStage, ids = selected) => {
    const next = new URLSearchParams(query);
    next.set("view", view);
    next.delete("direction");
    ids.forEach((id) => next.append("direction", id));
    return base + "?" + next;
  };
  const assumptionsReviewed = confirmAssumptions || (project.brief?.planningApproved === true && !needsApproval);
  async function save() {
    if (operation.current || !form.campaignIdea?.trim() || (form.planningAssumptions?.length && !assumptionsReviewed)) return;
    operation.current = true;
    setPending(undefined);
    setSaving(true);
    setMessage("");
    try {
      await saveBrief({ allowCampaignIdeaEdit: true, approvePlanning: true });
      setNeedsApproval(false);
      setMessage("Campaign brief approved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the brief.");
    } finally {
      operation.current = false;
      setSaving(false);
    }
  }

  async function estimate(action: PlanningInput["planningAction"]) {
    if (!project || operation.current || retained) return;
    operation.current = true;
    setSaving(true);
    setMessage("");
    setPending(undefined);
    try {
      if (action === "brief") await saveBrief({ allowCampaignIdeaEdit: true });
      const refinement = (action === "brief" ? feedback : directionFeedback).trim();
      const input: PlanningInput = { planningAction: action, conceptCount: 3, maxEstimatedCostUsd: 1,
        ...(refinement ? { planningFeedback: refinement } : {}) };
      const quote = validateConceptQuote(await quotedConceptApi.planningQuote(project.id, input), input.maxEstimatedCostUsd);
      if (quote.conceptCount !== 3 || quote.estimatedCostUsd === null) throw Error("Planning estimate is unavailable.");
      const minimumBudget = Math.max(1, Math.ceil(quote.estimatedCostUsd * 1_000_000));
      setBudget((Math.min(1_000_000, minimumBudget * 3) / 1_000_000).toFixed(6));
      setPending({ projectId: project.id, input, quote, form });
    } catch (error) {
      setMessage(apiErrorMessage(error, "Could not estimate planning."));
    } finally {
      operation.current = false;
      setSaving(false);
    }
  }

  function applyPlan(action: PlanningInput["planningAction"], result: QuotedConceptResult) {
    if (action === "brief") {
      if (!result.campaignStrategy) throw Error("The saved request has no campaign brief.");
      const strategy = result.campaignStrategy;
      setForm((current: typeof form) => applyCampaignStrategy(current, strategy));
      setConfirmAssumptions(false);
      setNeedsApproval(true);
      setFeedback("");
      setMessage("Review and approve the suggested brief.");
    } else {
      controller.setConcepts(requireAiConceptResult(result).concepts);
      setDirectionFeedback("");
      setMessage("Three directions are ready to review.");
    }
  }

  async function authorize() {
    if (!pending || operation.current || pending.projectId !== project?.id || pending.form !== form) return;
    if (!activeSession && !validBudget) return;
    operation.current = true;
    setSaving(true);
    const request = { projectId: pending.projectId, requestId: crypto.randomUUID(), action: pending.input.planningAction };
    const authorization = activeSession ?? { id: request.requestId, budgetUsd: Number(budget), expiresAt: Date.now() + 3_600_000 };
    if (!activeSession) {
      setSession(authorization);
      storeSession(request.projectId, authorization);
    }
    setRetained(request);
    storeReceipt(request.projectId, request);
    setPending(undefined);
    try {
      const result = await quotedConceptApi.planningExecute(request.projectId, {
        ...pending.input, requestId: request.requestId, approvedQuoteHash: pending.quote.quoteHash,
        planningSessionId: authorization.id, allowPaidProvider: !activeSession,
        ...(!activeSession ? { planningBudgetUsd: authorization.budgetUsd } : {}),
      });
      applyPlan(request.action, result);
      storeReceipt(request.projectId);
      setRetained(undefined);
    } catch (error) {
      const detail = apiErrorMessage(error, "");
      if (detail.startsWith("Planning authorization is missing or expired") ||
        detail.startsWith("Planning estimate exceeds the remaining session budget") ||
        detail.startsWith("Campaign context or routing changed")) {
        if (!detail.startsWith("Campaign context or routing changed") || !activeSession) {
          setSession(undefined);
          storeSession(request.projectId);
        }
        setRetained(undefined);
        storeReceipt(request.projectId);
        setMessage(detail);
      } else {
        setMessage("Planning outcome could not be confirmed. Check the saved request before trying again.");
      }
    } finally {
      operation.current = false;
      setSaving(false);
    }
  }

  async function checkPlanning() {
    if (!retained || retained.projectId !== project?.id || operation.current) return;
    operation.current = true;
    setSaving(true);
    try {
      const status = await quotedConceptApi.status(retained.projectId, retained.requestId);
      if (status.status === "completed" && status.result && retained.action === "brief") {
        applyPlan(retained.action, status.result);
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
        setMessage("Planning failed. A new request requires a fresh estimate and approval.");
        storeReceipt(retained.projectId);
        setRetained(undefined);
      } else setMessage("The saved request is still processing.");
    } catch {
      setMessage("Could not verify the saved request. No paid request was repeated.");
    } finally {
      operation.current = false;
      setSaving(false);
    }
  }

  const activeQuote = pending?.projectId === project.id && pending.form === form &&
    pending.input.planningAction === (stage === "strategy" ? "brief" : "directions") ? pending : undefined;
  const activeSession = session && session.expiresAt > Date.now() ? session : undefined;
  const validBudget = /^\d+(\.\d{1,6})?$/.test(budget) && Number(budget) <= 1 && Number(budget) > 0 &&
    Number(budget) >= (activeQuote?.quote.estimatedCostUsd ?? Infinity);
  const planningStatus = <div className="campaign-planning-status" aria-live="polite">
    {activeQuote && <div className="campaign-planning-status__quote">
      <div><strong>Planning estimate</strong><span>${activeQuote.quote.estimatedCostUsd} USD for this request</span></div>
      {!activeSession && <label>Session allowance (USD)
        <input className="rounded-md border border-input bg-background px-3 py-2" inputMode="decimal"
          value={budget} onChange={event => setBudget(event.target.value)} />
      </label>}
      <div className="campaign-planning-status__actions"><button className="w0a-create-project" disabled={saving || (!activeSession && !validBudget)} type="button" onClick={() => void authorize()}>
        {activeSession ? "Continue planning" : "Authorize and continue"}
      </button><Button variant="ghost" type="button" onClick={() => setPending(undefined)}>Cancel</Button></div>
    </div>}
    {activeQuote && !activeSession && <p>Estimates guide this planning session; provider charges may differ.</p>}
    {activeSession && <p>Session allowance: ${activeSession.budgetUsd} USD. Image and video generation are authorized separately.</p>}
    {retained && !saving && <Button variant="outline" type="button" onClick={() => void checkPlanning()}>Check saved request</Button>}
    {(saving || message) && <p role="status" className="text-sm text-muted-foreground">{saving ? "Working…" : message}</p>}
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
      <nav aria-label="Creative Director stages" className="campaign-stage-tabs">
        {stages.map(([key, label]) => (
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
      {stage === "strategy" && (
        <form className="ad-project-workspace__panel campaign-brief space-y-4" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <div className="campaign-brief__top">
            <label className="grid gap-1.5 text-sm">
              <span className="campaign-brief__label">Campaign idea</span>
              <textarea className="min-w-0 rounded-md border border-input bg-background px-3 py-2" placeholder="Describe the campaign you want to create."
                rows={4} maxLength={4000} value={form.campaignIdea ?? ""} disabled={saving}
                onChange={(event) => { setNeedsApproval(true); setForm((current) => ({ ...current, campaignIdea: event.target.value })); }} />
            </label>
            <section className="campaign-director" aria-label="Creative Director">
              <div><span className="campaign-director__eyebrow">Creative Director</span><h2>Refine the direction</h2></div>
              <label className="grid gap-1.5 text-sm"><span className="sr-only">Feedback for the Creative Director</span>
                <input className="min-w-0 rounded-md border border-input bg-background px-3 py-2" maxLength={1000}
                  placeholder="Add a goal, audience, or visual constraint" value={feedback} disabled={saving}
                  onChange={event => { setFeedback(event.target.value); setPending(undefined); }} />
              </label>
              <Button type="button" variant="outline" disabled={saving || !!retained || !form.campaignIdea?.trim()} onClick={() => void estimate("brief")}>{feedback.trim() ? "Estimate refinement" : "Estimate AI brief"}</Button>
            </section>
          </div>
          <section className="campaign-stage-section">
            <h2>Audience and message</h2>
            <div className="grid gap-4 sm:grid-cols-2">
            {fields.slice(0, 4).map(([key, label]) => (
              <label key={key} className="grid gap-1.5 text-sm">
                {label}
                <input className="min-w-0 rounded-md border border-input bg-background px-3 py-2"
                  value={form[key] ?? ""} disabled={saving}
                  onChange={(event) => { setNeedsApproval(true); setForm((current) => ({ ...current, [key]: event.target.value })); }} />
              </label>
            ))}
            </div>
          </section>
          <section className="campaign-stage-section campaign-stage-section--art">
            <div className="campaign-stage-section__heading"><h2>Art direction and ad copy</h2><span>Editable campaign details</span></div>
            <div className="grid gap-4 sm:grid-cols-2">
            {fields.slice(4).map(([key, label]) => (
              <label key={key} className="grid gap-1.5 text-sm">
                {label}
                <input className="min-w-0 rounded-md border border-input bg-background px-3 py-2"
                  value={form[key] ?? ""} disabled={saving}
                  onChange={(event) => { setNeedsApproval(true); setForm((current) => ({ ...current, [key]: event.target.value })); }} />
              </label>
            ))}
            </div>
          </section>
          {!!form.planningAssumptions?.length && <section className="space-y-2">
            <h2 className="font-semibold">Assumptions to confirm</h2>
            <ul className="list-disc pl-5 text-sm">{form.planningAssumptions.map((item, index) => <li key={index}>{item}</li>)}</ul>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={assumptionsReviewed} onChange={event => { setConfirmAssumptions(event.target.checked); setNeedsApproval(true); }} />I reviewed these assumptions</label>
          </section>}
          <div className="campaign-brief__footer"><button type="submit" className="w0a-create-project" disabled={saving || !form.campaignIdea?.trim() || (!!form.planningAssumptions?.length && !assumptionsReviewed)}>Approve and save brief</button>
          {project.brief?.planningApproved === true && !needsApproval &&
            <Button asChild variant="outline"><Link to={href("directions")}>Explore directions <ArrowRight size={16} aria-hidden="true" /></Link></Button>}</div>
          {planningStatus}
        </form>
      )}
      {stage === "directions" && <>
        <div className="campaign-directions-toolbar">
          {concepts.length > 0 && <label className="grid gap-1 text-sm">Refine the set
            <input className="rounded-md border border-input bg-background px-3 py-2"
              maxLength={1000} value={directionFeedback} disabled={saving}
              onChange={event => { setDirectionFeedback(event.target.value); setPending(undefined); }}
              placeholder="What should change?" />
          </label>}
          <Button variant="outline" disabled={saving || !!retained || project.brief?.planningApproved !== true || needsApproval} onClick={() => void estimate("directions")}>{directionFeedback.trim() ? "Estimate refinement" : "Estimate three AI directions"}</Button>
          {(project.brief?.planningApproved !== true || needsApproval) && <Link to={href("strategy")} className="underline text-sm">Approve the campaign brief first</Link>}
        </div>
        {planningStatus}
        {concepts.length ? (
          <>
          <div className="campaign-directions-toolbar campaign-directions-toolbar--summary">
            <span className="text-sm text-muted-foreground">{directions.length} selected</span>
            {directions.length > 0 && <Link className="w0a-create-project" to={href("production-review")}>Continue <ArrowRight size={16} aria-hidden="true" /></Link>}
          </div>
          <div className="campaign-direction-grid">
            {concepts.map((concept) => (
              <article key={concept.conceptId} className={`ad-project-workspace__panel campaign-direction-card flex min-w-0 flex-col gap-3 ${selected.includes(concept.conceptId) ? "is-selected" : ""}`}>
                <div className="campaign-direction-card__topline"><span>{selected.includes(concept.conceptId) ? "Selected direction" : "Creative direction"}</span><span>{form.outputFormat || "Format pending"}</span></div>
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
                  <p className="text-sm"><strong>Composition</strong><br />{concept.composition}</p>
                  {concept.explanation && <p className="text-sm">{concept.explanation}</p>}
                  <Button variant="ghost" disabled={saving} className="self-start" onClick={() => setEditing(concept)}>Edit or replace direction</Button>
                </>}
                {concept.primaryHeadline && <p className="campaign-direction-card__headline">{concept.primaryHeadline}</p>}
                <Button asChild variant="outline" className="mt-auto self-start">
                  <Link to={href("directions", selected.includes(concept.conceptId)
                    ? selected.filter((id) => id !== concept.conceptId)
                    : [...selected, concept.conceptId])}
                    aria-label={(selected.includes(concept.conceptId) ? "Remove " : "Select ") + concept.title}>
                    {selected.includes(concept.conceptId) ? <><Check size={16} /> Selected · Remove</> : "Select direction"}
                  </Link>
                </Button>
              </article>
            ))}
          </div>
          </>
        ) : <EmptyState title="No saved creative directions" description="Approve your brief to plan three directions." />}
      </>}
      {stage === "production-review" && (
        directions.length ? (
          <div className="campaign-production-grid">
            {(sourceCreative || defaultTemplate) && <div className="flex flex-wrap gap-2 md:col-span-3">
              {sourceCreative && <Button asChild variant="outline"><Link to={creativeEditorPath(sourceCreative.id)}>Open faithful adaptation in Canvas</Link></Button>}
              {defaultTemplate && project.brief?.outputFormat && defaultTemplate.formats.some(format => format === project.brief?.outputFormat) &&
                <Button variant="outline" onClick={() => controller.openTemplate(defaultTemplate.templateId, project.brief!.outputFormat as typeof defaultTemplate.formats[number])}>Open editable Default Template</Button>}
            </div>}
            {directions.map((concept) => {
              const production = campaignProductionBrief(project, concept, brand);
              return <article key={production.conceptId} className="ad-project-workspace__panel campaign-production-card min-w-0 space-y-2 break-words">
                <div className="campaign-production-card__topline"><span>Production candidate</span><span>{production.format}</span></div>
                <h2 className="font-semibold">{production.title}</h2>

                <p className="text-sm"><strong>Composition:</strong> {production.composition}</p>
                <p className="text-sm text-muted-foreground">{production.direction}</p>
                <p className="text-sm">{[production.format, production.platform, brand?.name].filter(Boolean).join(" · ")}</p>
                <p className="text-sm campaign-production-card__assets"><strong>Asset verification</strong>{" "}
                  {production.verifiedAssets.length
                    ? production.verifiedAssets.map(asset => asset.label || asset.role).join(", ")
                    : "No verified assets selected."}
                  {production.unverifiedAssetCount > 0 && (
                    <span className="block text-muted-foreground">
                      {production.unverifiedAssetCount === 1 ? "1 selection needs review." : `${production.unverifiedAssetCount} selections need review.`}
                    </span>
                  )}
                </p>
                {typeof production.restrictions === "string" && <p className="text-sm"><strong>Restrictions:</strong> {production.restrictions}</p>}
                {project.brief?.planningApproved === true && !needsApproval &&
                  <OriginalCampaignAd project={project} brand={brand} production={production}
                    form={{ ...form, headline: production.headline, supportingCopy: production.supportingCopy, cta: production.cta, ...productionCopy[concept.conceptId] }}
                    onChange={patch => setProductionCopy(current => ({
                      ...current, [concept.conceptId]: { ...current[concept.conceptId], ...patch },
                    }))}
                    onSaveBrief={saveBrief}
                    onSaved={creative => {
                      controller.setCreatives(items => [creative, ...items.filter(item => item.id !== creative.id)]);
                      controller.navigate(href("compare"));
                    }} />}
                {production.claimWarnings.length > 0 && <ul className="list-disc pl-5 text-sm">{production.claimWarnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
              </article>;
            })}

          </div>
        ) : <EmptyState title="Select a creative direction" description="Selected directions will appear here for production review." actionLabel="View directions" onAction={() => controller.navigate(href("directions"))} />
      )}
      {stage === "compare" && (
        creatives.length ? (
          <>
            <div className="campaign-compare-heading"><p className="text-sm text-muted-foreground">Compare saved campaign creatives.</p><span>{creatives.length} saved</span></div>
            <div className="campaign-compare-grid">
              {creatives.map((creative) => (
                <article key={creative.id} className="ad-project-workspace__panel campaign-compare-card space-y-3">
                  {creative.sceneGraph && <BrandTemplateScenePreview graph={creative.sceneGraph} assetUrls={assetUrls} label={creative.name} fillCard readablePlaceholder />}
                  <h2 className="font-semibold">{creative.name}</h2>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline"><Link to={creativeEditorPath(creative.id)}>Open Canvas</Link></Button>
                    <Button asChild variant="outline"><Link to={base + "?" + new URLSearchParams({ review: creative.id, reviewTab: "export" })}>Export options</Link></Button>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : <EmptyState title="No creatives to compare" description="Saved campaign creatives will appear here." />
      )}
    </main>
  );
}
