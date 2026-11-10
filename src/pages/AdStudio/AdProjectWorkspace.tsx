import { useAdProjectWorkspace } from "./production/useAdProjectWorkspace";
import { isM2BProductionEnabled } from "./production/experienceRoutes";
import ProductionProjectWorkspace from "./production/ProductionProjectWorkspace";
import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { publishedExampleBriefs } from "./lib/publishedExampleBriefs";
import { CampaignStages, isCampaignStage } from "./components/CampaignStages";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Loader2,
  LayoutTemplate,
  FileText,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import { adStudioApi } from "../../services/apiClient";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { Skeleton } from "../../components/ui/skeleton";
import { EmptyState } from "../../components/common/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

import { normalizeBrandContext } from "../BrandKits/lib/brandContext";

import { DEFAULT_AD_BRIEF } from "./lib/adStudioLabels";

import {
  selectProjectExample,
  selectTemplateSource,
  projectBriefForm,
  projectWorkspacePath,
  creativeEditorPath,
} from "./lib/projectWorkspace";
import { ProjectCreativeGallery } from "./components/ProjectCreativeGallery";
import { TemplateGallery } from "./components/TemplateGallery";
import {SavedBrandTemplates,useSavedBrandTemplates} from './components/SavedBrandTemplates';
import {CampaignIdeaSummary} from './components/CampaignIdeaSummary';
import {OriginalCampaignAd} from './components/OriginalCampaignAd';
import {CampaignAdReview,type CampaignReviewTab} from './components/CampaignAdReview';
import { GuidedBriefComposer } from "./components/GuidedBriefComposer";
import { ExportPanel } from "./components/ExportPanel";
import "./styles/ad-studio-w0a.css";
import "./styles/project-workspace.css";

export default function AdProjectWorkspace() {
  const controller = useAdProjectWorkspace();
  const [query,setQuery] = useSearchParams();
  const [reviewTab,setReviewTab]=React.useState<CampaignReviewTab>('review');
  const [templateTab,setTemplateTab]=React.useState<'brand'|'default'>('brand');
  const savedTemplates=useSavedBrandTemplates(controller.project?.brandKitId||'');
  React.useEffect(()=>{const id=query.get('review');if(id&&!controller.loading){const item=controller.creatives.find(c=>c.id===id);if(item){const tab=query.get('reviewTab');setReviewTab(tab==='refine'||tab==='formats'||tab==='export'?tab:'review');controller.setExportCreative(item);}}},[query,controller.loading,controller.creatives]);
  const {
    navigate,
    project,
    setProject,
    creatives,
    setCreatives,
    brand,
    selectedConceptId,
    setSelectedConceptId,
    concepts,
    conceptError,
    source,
    loading,
    error,
    setError,
    busy,
    start,
    setStart,
    compose,
    setCompose,
    form,
    setForm,
    setSavedForm,
    editingIdea,
    setEditingIdea,
    idea,
    setIdea,
    ideaError,
    setIdeaError,
    exportCreative,
    setExportCreative,
    assetUrls,
    templatesEnabled,
    draftDirty,
    load,
    confirmLeave,
    run,
    openTemplate,
    openConcept,
    discardCreative,
    saveIdea,
    saveBrief,
    generateConcepts,
    catalog,
    back,
  } = controller;
  React.useEffect(()=>{if(query.get("view")==="brief"&&!loading&&project)setCompose(true);},[query,loading,project?.id,setCompose]);
  if (loading)
    return (
      <main
        className="ad-project-workspace space-y-6"
        aria-busy="true"
        aria-label="Loading project workspace"
      >
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-36 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      </main>
    );
  if (!project)
    return (
      <main className="ad-project-workspace">
        <EmptyState
          title="Project unavailable"
          description={error ?? "This project could not be opened."}
          actionLabel="Retry"
          onAction={() => void load()}
          secondaryActionLabel="My Projects"
          onSecondaryAction={() => navigate("/create/ad")}
        />
      </main>
    );
  const closeCampaignReview = () => {
    setExportCreative(null);
    if (query.has("review") || query.has("reviewTab")) {
      const next = new URLSearchParams(query);
      next.delete("review");
      next.delete("reviewTab");
      setQuery(next, { replace: true });
    }
  };
  const openCampaignReview = (creative: typeof creatives[number], tab: CampaignReviewTab = "review") => {
    setReviewTab(tab);
    setExportCreative(creative);
    const next = new URLSearchParams(query);
    next.set("review", creative.id);
    next.set("reviewTab", tab);
    setQuery(next, { replace: true });
  };
  if (exportCreative)
    return (
      <main className="ad-project-workspace ad-studio-w0a ad-project-review-screen space-y-4">
        <nav aria-label="Campaign ad navigation">
          <Button variant="ghost" onClick={closeCampaignReview}>
            <ArrowLeft size={16} className="mr-2" />
            Back to {project.name}
          </Button>
        </nav>
        <header className="ad-project-workspace__header">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Ad Studio · Campaign creative</p>
            <h1 className="text-2xl font-semibold mt-2">Review campaign ad</h1>
            <p className="text-sm text-muted-foreground mt-1">{project.name} · Customize, create a variation, adapt formats, then export.</p>
          </div>
        </header>
        <CampaignAdReview
          project={project}
          brand={brand}
          creative={exportCreative}
          assetUrls={assetUrls}
          initialTab={reviewTab}
          onEdit={(id)=>{if(confirmLeave())navigate(creativeEditorPath(id));}}
          onSaved={(saved)=>{
            setCreatives(current=>current.some(creative=>creative.id===saved.id)?current.map(creative=>creative.id===saved.id?saved:creative):[saved,...current]);
            openCampaignReview(saved);
          }}
        />
      </main>
    );
  function openPlanningSource(saved: import("./lib/projectWorkspace").WorkspaceProject) {
    setProject(saved);
    const next = projectBriefForm(saved);
    setForm(next);
    setSavedForm(JSON.stringify(next));
    if (["exampleBriefId", "exampleVersion", "defaultTemplateId", "startingCreativeId"].some(key =>
      project?.brief?.[key] !== saved.brief?.[key])) controller.setConcepts([]);
    setStart(null);
    controller.navigate(projectWorkspacePath(saved.id) + "?view=strategy");
  }
  const requestedStage = query.get("view");
  const stage = requestedStage ?? "workspace";
  if (isCampaignStage(stage)) {
    const stageProps = { controller, stage, query } satisfies Parameters<typeof CampaignStages>[0];
    return React.createElement(CampaignStages, { ...stageProps, key: project.id });
  }
  if (stage === "example-source") return (
    <main className="ad-project-workspace ad-studio-w0a space-y-4">
      <nav aria-label="Breadcrumb" className="bo-breadcrumb">
        <Link to={projectWorkspacePath(project.id)}><ArrowLeft size={15} aria-hidden="true" /> {project.name}</Link>
        <span aria-hidden="true">/</span><span aria-current="page">Example Briefs</span>
      </nav>
      <h1 className="text-2xl font-semibold">Choose an Example Brief</h1>
      {error && <p role="alert">{error}</p>}
      <div className="w0a-grid w0a-grid-3">
        {publishedExampleBriefs.map(example => <article key={example.id} className="w0a-card">
          <img className="aspect-[4/5] w-full object-contain" src={example.previewImage} alt={example.title + " reference"} />
          <div className="w0a-card-body">
            <h2>{example.title}</h2>
            <p className="w0a-meta">{example.creativeDirection}</p>
            <button className="w0a-btn" disabled={busy} onClick={() => void run(async () => {
              const selected = await selectProjectExample(adStudioApi, project, example);
              openPlanningSource(selected.project);
            })}>Use as inspiration</button>
          </div>
        </article>)}
      </div>
    </main>
  );
  if (isM2BProductionEnabled() && requestedStage !== "legacy" && !query.has("sourceUnavailable"))
    return <ProductionProjectWorkspace controller={controller} />;
  return (
    <main className="ad-project-workspace ad-studio-w0a space-y-3">
      {query.has("sourceUnavailable") && <p role="alert">Campaign saved. The template could not be attached. Choose it again from this campaign.</p>}
      <nav aria-label="Breadcrumb" className="bo-breadcrumb flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (confirmLeave()) navigate("/create/ad");
          }}
        >
          <ArrowLeft aria-hidden="true" />
          My Projects
        </Button>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Workspace</span>
      </nav>
      <header className="ad-project-workspace__header">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold break-words">
            {project.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border px-3 py-1">
              {project.brandKitId
                ? project.brandKitName || brand?.name || "Selected Brand Kit"
                : "Default Brand"}
            </span>
            {project.status ? (
              <span className="capitalize">
                {project.status.replace(/_/g, " ")}
              </span>
            ) : null}
            <span>
              {creatives.length} static{" "}
              {creatives.length === 1 ? "creative" : "creatives"}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="w0a-create-project"
          onClick={() => {
            if (confirmLeave()) {
              setCompose(false);
              setTemplateTab(project.brandKitId?'brand':'default');
              setStart("choose");
            }
          }}
          disabled={busy}
        >
          <Plus size={16} aria-hidden="true" />
          Create Ad
        </button>
      </header>
      <section
        className="ad-project-workspace__panel ad-project-workspace__panel--compact"
        aria-labelledby="workspace-idea-heading"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="workspace-idea-heading" className="font-semibold">
            Campaign Idea
          </h2>
          {!editingIdea ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIdeaError(null);
                setEditingIdea(true);
              }}
            >
              <Pencil aria-hidden="true" />
              Edit idea
            </Button>
          ) : null}
        </div>
        {editingIdea ? (
          <div className="mt-4 space-y-3">
            <Textarea
              aria-label="Campaign Idea"
              rows={5}
              maxLength={4000}
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              disabled={busy}
            />
            {ideaError ? (
              <p role="alert" className="text-sm text-destructive">
                {ideaError}
              </p>
            ) : null}
            <div className="flex gap-2">
              <button type="button" className="w0a-create-project" onClick={() => void saveIdea()} disabled={busy}>
                {busy ? "Saving…" : "Save Campaign Idea"}
              </button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  if (
                    !draftDirty ||
                    window.confirm("Discard changes to Campaign Idea?")
                  ) {
                    setIdea(
                      project.brief?.campaignIdea ??
                        project.brief?.coreMessage ??
                        "",
                    );
                    setEditingIdea(false);
                  }
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <CampaignIdeaSummary text={project.brief?.campaignIdea ??
              project.brief?.coreMessage ??
              "Add a Campaign Idea to guide your advertisements."}/>
        )}
      </section>
      {error ? (
        <div
          role="alert"
          className="ad-project-workspace__panel border-destructive text-sm"
        >
          <p>{error}</p>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      ) : null}
      {conceptError ? (
        <p role="status" className="text-sm text-muted-foreground">
          {conceptError}{" "}
          <button
            className="underline"
            onClick={() => {
              if (confirmLeave()) void load();
            }}
          >
            Retry loading
          </button>
        </p>
      ) : null}
      {busy ? (
        <p role="status" className="flex items-center gap-2 text-sm">
          <Loader2 className="animate-spin" size={16} />
          Saving your creative work…
        </p>
      ) : null}
      {!compose ? (
        <section className="ad-project-workspace__panel ad-project-workspace__panel--compact flex flex-wrap items-center gap-x-5 gap-y-2">
          <h2 className="font-semibold">Creative Director</h2>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link to="?view=strategy">Campaign Brief</Link></Button>
            <Button asChild variant="outline"><Link to="?view=directions">Creative Directions</Link></Button>
            <Button asChild variant="outline"><Link to="?view=compare">Compare Creatives</Link></Button>
          </div>
        </section>
      ) : null}
      {compose ? (
        <section className="ad-project-workspace__panel">
          <Button variant="ghost" onClick={back}>
            <ArrowLeft size={16} className="mr-2" />
            Back to Project
          </Button>
          <GuidedBriefComposer
            creationSlot={<><OriginalCampaignAd project={project} brand={brand} form={form} onChange={patch=>setForm(old=>({...old,...patch}))} onSaveBrief={saveBrief} onSaved={(item)=>{setCreatives(current=>current.some(creative=>creative.id===item.id)?current.map(creative=>creative.id===item.id?item:creative):[item,...current]);setCompose(false);setStart(null);openCampaignReview(item);}}/>{templatesEnabled&&<div className="ad-project-template-tabs mt-3"><button type="button" onClick={()=>{setTemplateTab('brand');setStart('templates');}}>Use a saved Brand Template</button><button type="button" onClick={()=>{setTemplateTab('default');setStart('templates');}}>Use a Default Template</button></div>}</>}
            form={form}
            onChange={(patch) =>
              setForm((p) => ({
                ...p,
                ...patch,
                brandKitId: project.brandKitId ?? "",
              }))
            }
            brands={brand ? [brand] : []}
            brandsLoading={false}
            brandsError={null}
            onRetryBrands={() => void load()}
            brandLocked
            onSelectBrand={() => undefined}
            onCreateBrand={() => navigate("/brands")}
            onEditBrand={() => navigate("/brands")}
            onBack={back}
            busy={busy}
            conceptsError={error}
            projectId={project.id}
            canCreate={false}
            onCreateProject={() => undefined}
            onGenerateConcepts={() => void generateConcepts()}
            onSaveBrief={() =>
              run(async () => {
                await saveBrief();
                toast.success("Brief saved");
              })
            }
            savingBrief={busy}
            concepts={concepts}
            selectedConceptId={
              selectedConceptId ?? concepts[0]?.conceptId ?? null
            }
            onSelectConcept={setSelectedConceptId}
            generationSource={source}
            creatives={creatives}
            onOpenConcept={openConcept}
            onOpenCreative={(id) => {
              if (confirmLeave()) navigate(creativeEditorPath(id));
            }}
            templatesV1Enabled={templatesEnabled}
            onUseTemplate={openTemplate}
          />
        </section>
      ) : (
        <ProjectCreativeGallery
          creatives={creatives}
          assetUrls={assetUrls}
          onOpen={(id) => {
            if (confirmLeave()) navigate(creativeEditorPath(id));
          }}
          onPreview={id=>{const creative=creatives.find(c=>c.id===id);if(creative)openCampaignReview(creative);}}
          onExport={item=>openCampaignReview(item,'export')}
          onDiscard={async (creative) => {
            await discardCreative(creative);
            if (query.get("review") === creative.id) {
              const next = new URLSearchParams(query);
              next.delete("review");
              setQuery(next, { replace: true });
            }
          }}
          onCreate={() => setStart("choose")}
        />
      )}
      <Dialog
        open={start !== null}
        onOpenChange={(open) => {
          if (!busy && !open) setStart(null);
        }}
      >
        <DialogContent className="ad-studio-w0a ad-project-create-dialog sm:max-w-5xl max-h-[88dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create an ad</DialogTitle>
            <DialogDescription>
              {project.name} · Choose a starting point, then customize and export in Canvas.
            </DialogDescription>
          </DialogHeader>
          {start !== "choose" ? <nav className="ad-project-create-breadcrumb" aria-label="Ad creation breadcrumb"><button type="button" disabled={busy} onClick={()=>setStart('choose')}><ArrowLeft size={14}/>Back to Create ad</button><span>/</span><span>{start==='templates'?'Templates':start==='examples'?'Example Briefs':'Campaign concepts'}</span></nav> : null}
          {start === "choose" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <button className="ad-project-workspace__choice" onClick={()=>{setCompose(true);setStart(null);}}><Lightbulb size={22}/><strong>Generate Original AI Ad</strong><span>Create campaign photography directly from your working brief.</span></button>
              {templatesEnabled ? (
                <button
                  className="ad-project-workspace__choice"
                  onClick={() => setStart("templates")}
                >
                  <LayoutTemplate size={22} />
                  <strong>Start from Template</strong>
                  <span>Choose an editable layout and format.</span>
                </button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Templates are not enabled in this environment. Example Briefs
                  remain available.
                </p>
              )}
              <button
                className="ad-project-workspace__choice"
                onClick={() => { setStart(null); controller.navigate(projectWorkspacePath(project.id) + "?view=example-source"); }}
              >
                <FileText size={22} />
                <strong>Start from Example Brief</strong>
                <span>Shape a brief using your project context.</span>
              </button>
              {concepts.length ? (
                <button
                  className="ad-project-workspace__choice"
                  onClick={() => setStart("concepts")}
                >
                  <Lightbulb size={22} />
                  <strong>Start from Existing Concept</strong>
                  <span>Use a concept already saved in this project.</span>
                </button>
              ) : null}
            </div>
          ) : null}
          {start === "templates" ? (
            <div className="ad-project-template-picker">
            {project.brandKitId&&<div role="group" aria-label="Template collection" className="ad-project-template-tabs">
              <button type="button" aria-pressed={templateTab==='brand'} onClick={()=>setTemplateTab('brand')}>Brand Templates</button>
              <button type="button" aria-pressed={templateTab==='default'} onClick={()=>setTemplateTab('default')}>Default Templates</button>
            </div>}
            {project.brandKitId&&templateTab==='brand'?<SavedBrandTemplates brandId={project.brandKitId} data={savedTemplates} assetUrls={assetUrls} project={project} creatives={creatives} onPlanningProject={(saved, draft) => {
              setCreatives(items => items.some(item => item.id === draft.id) ? items : [draft, ...items]);
              openPlanningSource(saved);
            }}/>:<TemplateGallery
              selectedFormat={
                project.outputFormat ?? DEFAULT_AD_BRIEF.outputFormat
              }
              busy={busy}
              brandContext={normalizeBrandContext(brand?{...brand,assets:brand.assets?.map(asset=>({...asset,readUrl:assetUrls[asset.id]||null}))}:null)}
              brandTemplates={catalog.templates}
              catalogLabel={catalog.label}
              hideNote
              onUseTemplate={(id, format) => void run(async () => {
                openPlanningSource(await selectTemplateSource(adStudioApi, project, { defaultTemplateId: id, format }));
              })}
            />}
            </div>
          ) : null}
          {start === "concepts" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {concepts.map((concept) => (
                <button
                  key={concept.conceptId}
                  className="ad-project-workspace__choice"
                  disabled={busy}
                  onClick={() => openConcept(concept.conceptId)}
                >
                  <strong>{concept.title}</strong>
                  <span>{concept.primaryHeadline}</span>
                </button>
              ))}
            </div>
          ) : null}
          {busy ? (
            <p role="status" className="text-sm">
              Creating your ad…
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error} You can retry your selection.
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  );
}
