import { useAdProjectWorkspace } from "./production/useAdProjectWorkspace";
import { isM2BProductionEnabled } from "./production/experienceRoutes";
import ProductionProjectWorkspace from "./production/ProductionProjectWorkspace";
import React from "react";
import { useSearchParams } from "react-router-dom";
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
  projectBriefForm,
  exampleBriefForm,
  selectProjectExample,
  creativeEditorPath,
} from "./lib/projectWorkspace";
import { ProjectCreativeGallery } from "./components/ProjectCreativeGallery";
import { TemplateGallery } from "./components/TemplateGallery";
import { GuidedBriefComposer } from "./components/GuidedBriefComposer";
import { ExportPanel } from "./components/ExportPanel";
import "./styles/ad-studio-w0a.css";
import "./styles/project-workspace.css";

export default function AdProjectWorkspace() {
  const controller = useAdProjectWorkspace();
  const [query] = useSearchParams();
  const {
    navigate,
    project,
    setProject,
    creatives,
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
    saveIdea,
    saveBrief,
    generateConcepts,
    catalog,
    back,
  } = controller;
  if (isM2BProductionEnabled() && query.get("view") !== "legacy")
    return <ProductionProjectWorkspace controller={controller} />;
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
  return (
    <main className="ad-project-workspace space-y-6">
      <nav aria-label="Project navigation">
        <Button
          variant="ghost"
          onClick={() => {
            if (confirmLeave()) navigate("/create/ad");
          }}
        >
          <ArrowLeft size={16} className="mr-2" />
          My Projects
        </Button>
      </nav>
      <header className="ad-project-workspace__header">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Ad Studio · Project workspace
          </p>
          <h1 className="text-2xl font-semibold break-words mt-2">
            {project.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-muted-foreground">
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
        <Button
          onClick={() => {
            if (confirmLeave()) {
              setCompose(false);
              setStart("choose");
            }
          }}
          disabled={busy}
        >
          <Plus size={16} className="mr-2" />
          Create Ad
        </Button>
      </header>
      <section
        className="ad-project-workspace__panel"
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
              <Pencil size={14} className="mr-2" />
              Edit Campaign Idea
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
              <Button onClick={() => void saveIdea()} disabled={busy}>
                {busy ? "Saving…" : "Save Campaign Idea"}
              </Button>
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
          <p className="mt-3 text-sm leading-7 whitespace-pre-wrap break-words text-muted-foreground">
            {project.brief?.campaignIdea ??
              project.brief?.coreMessage ??
              "Add a Campaign Idea to guide your advertisements."}
          </p>
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
      {!compose && project.brief?.exampleBriefId ? (
        <section className="ad-project-workspace__panel">
          <h2 className="font-semibold">
            Working brief · {project.brief.exampleBriefTitle || "Example Brief"}
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {project.brief.exampleObjective}
          </p>
          <Button
            className="mt-3"
            variant="outline"
            onClick={() => {
              if (confirmLeave()) {
                const restored = projectBriefForm(project);
                setForm(restored);
                setSavedForm(JSON.stringify(restored));
                setCompose(true);
              }
            }}
          >
            Review or edit brief
          </Button>
        </section>
      ) : null}
      {compose ? (
        <section className="ad-project-workspace__panel">
          <Button variant="ghost" onClick={back}>
            <ArrowLeft size={16} className="mr-2" />
            Back to Project
          </Button>
          <GuidedBriefComposer
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
            onGenerateConcepts={generateConcepts}
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
          onExport={setExportCreative}
          onCreate={() => setStart("choose")}
        />
      )}
      <Dialog
        open={start !== null}
        onOpenChange={(open) => {
          if (!busy && !open) setStart(null);
        }}
      >
        <DialogContent className="sm:max-w-4xl max-h-[88dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create an ad</DialogTitle>
            <DialogDescription>
              Start something new in {project.name}. Your existing creatives
              stay unchanged.
            </DialogDescription>
          </DialogHeader>
          {start !== "choose" ? (
            <Button
              variant="ghost"
              className="justify-self-start"
              disabled={busy}
              onClick={() => setStart("choose")}
            >
              <ArrowLeft size={14} className="mr-2" />
              Starting points
            </Button>
          ) : null}
          {start === "choose" ? (
            <div className="grid gap-3 sm:grid-cols-2">
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
                onClick={() => setStart("examples")}
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
            <TemplateGallery
              selectedFormat={
                project.outputFormat ?? DEFAULT_AD_BRIEF.outputFormat
              }
              busy={busy}
              brandContext={normalizeBrandContext(brand)}
              brandTemplates={catalog.templates}
              catalogLabel={catalog.label}
              onUseTemplate={openTemplate}
            />
          ) : null}
          {start === "examples" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {catalog.examples.map((example) => (
                <button
                  key={example.id}
                  className="ad-project-workspace__choice"
                  onClick={() =>
                    void run(async () => {
                      setForm(exampleBriefForm(project, example));
                      setCompose(true);
                      setStart(null);
                      const selected = await selectProjectExample(
                        adStudioApi,
                        project,
                        example,
                      );
                      setProject(selected.project);
                      setForm(selected.form);
                      setSavedForm(JSON.stringify(selected.form));
                    })
                  }
                >
                  <strong>{example.title}</strong>
                  <span>{example.headline}</span>
                </button>
              ))}
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
      <Dialog
        open={exportCreative !== null}
        onOpenChange={(open) => {
          if (!open) setExportCreative(null);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[88dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Export {exportCreative?.name}</DialogTitle>
            <DialogDescription>
              Download the saved creative as PNG or JPEG.
            </DialogDescription>
          </DialogHeader>
          {exportCreative ? (
            <ExportPanel
              creativeId={exportCreative.id}
              graph={exportCreative.sceneGraph ?? null}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  );
}
