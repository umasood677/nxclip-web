import { homeEntryPath } from "./lib/homeEntryFlow";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { SEO } from "../../components/SEO";
import { projectWorkspacePath, saveWorkspaceBrief, generateProjectConcepts } from "./lib/projectWorkspace";
import { AdStudioLoader } from "./components/AdStudioLoader";
import { adStudioApi, brandApi } from "../../services/apiClient";
import type { BrandKitSummary } from "../BrandKits/CreateBrandKitDialog";
import { GuidedBrandKitWorkspace } from "../BrandKits/guided/GuidedBrandKit";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { BrandKitImportDialog } from "../BrandKits/components/BrandKitImportDialog";
import {
  applyBrandKitToBriefForm,
} from "../BrandKits/lib/brandContext";
import { AdStudioHome } from "./components/AdStudioHome";
import { GuidedBriefComposer } from "./components/GuidedBriefComposer";
import {
  DEFAULT_AD_BRIEF,
  type AdBriefFormState,
} from "./lib/adStudioLabels";
import type { FeaturedExample } from "./lib/exampleCreatives";
import {
  writeSelectedConceptId,
} from "./lib/selectedConceptStorage";
import {
  readStoredBrandKitId,
  writeStoredBrandKitId,
} from "./lib/brandHomeCatalog";
import type { AdConcept } from "./types";
import { isAdStudioTemplatesV1Enabled } from "./lib/adStudioTemplatesFlag";
import "../ImageStudio/components/image-edit-fonts.css";
import "./styles/ad-studio-w0a.css";

type StudioView = "home" | "compose";

export default function AdStudio() {
  const navigate = useNavigate();
  const [view, setView] = useState<StudioView>("home");
  const [projects, setProjects] = useState<any[]>([]);
  const [brands, setBrands] = useState<BrandKitSummary[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [brandsError, setBrandsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const creatingRef = useRef(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [concepts, setConcepts] = useState<AdConcept[]>([]);
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [conceptsLoading, setConceptsLoading] = useState(false);
  const [conceptsError, setConceptsError] = useState<string | null>(null);
  const [conceptImages, setConceptImages] = useState<Record<string, string>>({});
  const [creatives, setCreatives] = useState<any[]>([]);
  const [generationSource, setGenerationSource] = useState<string | null>(null);
  const [savingBrief, setSavingBrief] = useState(false);
  const [createBrandOpen, setCreateBrandOpen] = useState(false);
  const [importBrandOpen, setImportBrandOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandKitSummary | null>(null);
  const [form, setForm] = useState<AdBriefFormState>({ ...DEFAULT_AD_BRIEF });
  const templatesV1Enabled = isAdStudioTemplatesV1Enabled();

  const patchForm = useCallback((patch: Partial<AdBriefFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const syncProjectBrand = useCallback(async (pid: string, brandKitId: string) => {
    try {
      const updated = await adStudioApi.updateProject(
        pid,
        brandKitId ? { brandKitId } : { clearBrandKit: true },
      );
      setProjects((prev) =>
        prev.map((p) => (p.id === pid ? { ...p, ...updated } : p)),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update project brand");
    }
  }, []);

  /** Both entry points use the same preserving, verified project save. */
  const syncProjectBrief = useCallback(async (pid: string, state: AdBriefFormState = form) => {
    const current = await adStudioApi.getProject(pid);
    if (current.id !== pid) throw Error("The project could not be verified. Reload before saving.");
    const updated = await saveWorkspaceBrief(adStudioApi, current, state, { allowBrandChange: true });
    setProjects(prev => prev.map(p => p.id === pid ? { ...p, ...updated } : p));
    return updated;
  }, [form]);

  const saveBrief = useCallback(async () => {
    if (!projectId) return;
    setSavingBrief(true);
    try {
      await syncProjectBrief(projectId);
      toast.success("Brief saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save brief");
    } finally {
      setSavingBrief(false);
    }
  }, [projectId, syncProjectBrief]);

  const selectConcept = useCallback(
    (conceptId: string) => {
      setSelectedConceptId(conceptId);
      if (projectId) writeSelectedConceptId(projectId, conceptId);
    },
    [projectId],
  );

  const selectBrand = useCallback(
    (id: string) => {
      writeStoredBrandKitId(id);
      setForm((prev) => ({
        ...prev,
        ...applyBrandKitToBriefForm(prev.brandKitId, id, brands, prev),
      }));
      setConceptImages({});
      if (projectId) {
        void syncProjectBrand(projectId, id);
      }
    },
    [brands, projectId, syncProjectBrand],
  );

  const refreshBrands = useCallback(async (): Promise<BrandKitSummary[]> => {
    setBrandsLoading(true);
    setBrandsError(null);
    try {
      const b = await brandApi.listKits();
      const items = (b.items ?? []) as BrandKitSummary[];
      setBrands(items);
      // Restore last Brand Kit (or stay Neutral) once kits are known.
      const stored = readStoredBrandKitId();
      const valid = stored && items.some((k) => k.id === stored) ? stored : "";
      setForm((prev) => {
        if (prev.brandKitId === valid) return prev;
        if (!valid) {
          writeStoredBrandKitId("");
          return { ...prev, brandKitId: "" };
        }
        return {
          ...prev,
          ...applyBrandKitToBriefForm(prev.brandKitId, valid, items, prev),
        };
      });
      return items;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load Brand Kits";
      setBrandsError(message);
      setBrands([]);
      return [];
    } finally {
      setBrandsLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const [p] = await Promise.all([adStudioApi.listProjects(), refreshBrands()]);
        const items = p.items ?? [];
        setProjects(items);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load Ad Studio");
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshBrands]);

  const canCreateProject =
    !!form.name.trim() &&
    !!form.productOrService.trim() &&
    !!form.coreMessage.trim() &&
    !!form.targetAudience.trim() &&
    !!form.desiredTone.trim();

  const createProject = async () => {
    if (!canCreateProject) {
      toast.error("Fill in product, core message, and audience");
      return;
    }
    if (creatingRef.current || busy) return;
    creatingRef.current = true;
    setBusy(true);
    try {
      const project = await adStudioApi.createProject({
        name: form.name.trim(),
        brandKitId: form.brandKitId || undefined,
        brief: {
          campaignIdea: form.campaignIdea ?? form.coreMessage,
          exampleBriefId: form.exampleBriefId,
          exampleBriefTitle: form.exampleBriefTitle,
          exampleObjective: form.exampleObjective,
          productCategory: form.productCategory,
          creativeDirection: form.creativeDirection,
          productFocus: form.productFocus,
          productOrService: form.productOrService.trim(),
          advertisingObjective: form.advertisingObjective,
          targetAudience: form.targetAudience.trim(),
          coreMessage: form.coreMessage.trim(),
          desiredTone: form.desiredTone.trim(),
          platform: form.platform,
          outputFormat: form.outputFormat,
          cta: form.cta.trim() || "Learn more",
        },
        routingProfile: "BALANCED",
      });
      setProjectId(project.id);
      setProjects((prev) => [project, ...prev.filter((x) => x.id !== project.id)]);
      setConcepts([]);
      setCreatives([]);
      setGenerationSource(null);
      setView("compose");
      toast.success("Project created");
      navigate(projectWorkspacePath(project.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      creatingRef.current = false;
      setBusy(false);
    }
  };

  const generateConcepts = async () => {
    if (!projectId) {
      toast.error("Create or select a project first");
      return;
    }
    setBusy(true);
    setConceptsLoading(true);
    setConceptsError(null);
    try {
      const current = await adStudioApi.getProject(projectId);
      if (current.id !== projectId) throw Error("The project could not be verified. Reload before generating.");
      const generated = await generateProjectConcepts(adStudioApi, current, form, { allowBrandChange: true });
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...generated.project } : p));
      const res = generated.result;
      const next = (res.concepts ?? []) as AdConcept[];
      setConcepts(next);
      const pick = next[0]?.conceptId ?? null;
      setSelectedConceptId(pick);
      writeSelectedConceptId(projectId, pick);
      setGenerationSource(res.generationSource ?? res.provider ?? null);
      if (res.generationSource === "heuristic" || /heuristic/i.test(res.provider ?? "")) {
        toast.message("Concepts ready (heuristic)", {
          description: res.warnings?.[0] ?? "AI provider unavailable — templates used.",
        });
      } else {
        toast.success("Concepts generated");
      }
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Concept generation failed";
      setConceptsError(message);
      toast.error(message);
    } finally {
      setConceptsLoading(false);
      setBusy(false);
    }
  };

  /**
   * Ensure a project exists for Home template use.
   * Auto-creates with the selected Brand Kit (or Neutral) so gallery CTAs work from Home.
   */
  const openFromConcept = async (conceptId: string) => {
    if (!projectId) return;
    setBusy(true);
    try {
      const creative = await adStudioApi.createFromConcept(projectId, { conceptId });
      navigate(`/create/ad/${creative.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create creative");
    } finally {
      setBusy(false);
    }
  };

  const deleteProject = async (project: { id: string; name: string }) => {
    if (
      !window.confirm(
        `Delete “${project.name}”? This soft-deletes the project and hides it from Ad Studio.`,
      )
    ) {
      return;
    }
    setDeletingProjectId(project.id);
    try {
      await adStudioApi.deleteProject(project.id);
      const nextProjects = projects.filter((p) => p.id !== project.id);
      setProjects(nextProjects);
      if (projectId === project.id) {
        setProjectId(null);
        setConcepts([]);
        setCreatives([]);
        setView("home");
      }
      toast.success("Project deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete project");
    } finally {
      setDeletingProjectId(null);
    }
  };

  const generateBackground = async (conceptId?: string) => {
    if (!projectId) {
      toast.error("Select a project first");
      return;
    }
    setBusy(true);
    try {
      const res = await adStudioApi.generateImage(projectId, { conceptId });
      if (conceptId && typeof res.imageBase64 === "string" && res.imageBase64) {
        const mime = res.mimeType || "image/png";
        setConceptImages((prev) => ({
          ...prev,
          [conceptId]: `data:${mime};base64,${res.imageBase64}`,
        }));
      }
      toast.success(
        res.jobId
          ? `Image job queued (${res.jobId.slice(0, 8)}…)`
          : "Image generation started",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Image generation failed");
    } finally {
      setBusy(false);
    }
  };

  const handleBrandCreated = async (kit: BrandKitSummary) => {
    const items = await refreshBrands();
    const merged = items.some((b) => b.id === kit.id)
      ? items.map((b) => (b.id === kit.id ? { ...b, ...kit } : b))
      : [kit, ...items.filter((b) => b.id !== kit.id)];
    setBrands(merged);
    // Preserve unsaved brief fields; only seed empties + auto-select.
    setForm((prev) => ({
      ...prev,
      ...applyBrandKitToBriefForm(prev.brandKitId, kit.id, merged, prev),
    }));
    setConceptImages({});
    if (projectId) {
      void syncProjectBrand(projectId, kit.id);
    }
    setEditingBrand(null);
  };

  const openCreateBrand = () => {
    setEditingBrand(null);
    setCreateBrandOpen(true);
  };

  const openImportBrand = () => {
    setImportBrandOpen(true);
  };

  const openEditBrand = (kit: BrandKitSummary) => {
    setEditingBrand(kit);
    setCreateBrandOpen(true);
  };

  const useExample = (example: FeaturedExample, format?: string) => navigate(homeEntryPath({brandId:form.brandKitId,exampleId:example.id,format}));

  if (loading) {
    return <AdStudioLoader label="Composing your studio…" />;
  }

  return (
    <div className="pb-6">
      <SEO title="Static Ad Studio | NxClip" />

      {view === "home" ? (
        <AdStudioHome
          projects={projects}
          brands={brands}
          brandsLoading={brandsLoading}
          brandsError={brandsError}
          selectedBrandId={form.brandKitId}
          selectedFormat={form.outputFormat}
          deletingProjectId={deletingProjectId}
          onSelectBrand={selectBrand}
          onSelectFormat={(formatId) => patchForm({ outputFormat: formatId })}
          onStartIdea={() => navigate(homeEntryPath({brandId:form.brandKitId}))}
          onUseExample={useExample}
          onContinueProject={(id) => navigate(projectWorkspacePath(id))}
          onDeleteProject={(p) => void deleteProject(p)}
          onCreateBrand={openCreateBrand}
          onEditBrand={openEditBrand}
          onImportBrand={openImportBrand}
          onRetryBrands={() => void refreshBrands()}
          templatesV1Enabled={templatesV1Enabled}
          templateBusy={busy}
          onUseTemplate={(tid, fmt) => navigate(homeEntryPath({brandId:form.brandKitId,templateId:tid,format:fmt}))}
        />
      ) : (
        <GuidedBriefComposer
          form={form}
          onChange={patchForm}
          brands={brands}
          brandsLoading={brandsLoading}
          brandsError={brandsError}
          onRetryBrands={() => void refreshBrands()}
          onSelectBrand={selectBrand}
          onCreateBrand={openCreateBrand}
          onEditBrand={openEditBrand}
          onImportBrand={openImportBrand}
          onBack={() => setView("home")}
          busy={busy}
          conceptsLoading={conceptsLoading}
          conceptsError={conceptsError}
          projectId={projectId}
          canCreate={canCreateProject}
          onCreateProject={() => void createProject()}
          onGenerateConcepts={() => void generateConcepts()}
          onSaveBrief={() => void saveBrief()}
          savingBrief={savingBrief}
          concepts={concepts}
          selectedConceptId={selectedConceptId}
          onSelectConcept={selectConcept}
          generationSource={generationSource}
          conceptImages={conceptImages}
          creatives={creatives}
          onOpenConcept={(id) => void openFromConcept(id)}
          onGenerateBackground={(id) => void generateBackground(id)}
          onOpenCreative={(id) => navigate(`/create/ad/${id}`)}
          templatesV1Enabled={templatesV1Enabled}
          onUseTemplate={(tid, fmt) => navigate(homeEntryPath({brandId:form.brandKitId,templateId:tid,format:fmt}))}
        />
      )}

      <Dialog open={createBrandOpen} onOpenChange={(open) => { setCreateBrandOpen(open); if (!open) setEditingBrand(null); }}>
        <DialogContent className="max-w-6xl max-h-[92dvh] overflow-y-auto p-3 sm:p-6"><DialogHeader><DialogTitle>{editingBrand ? "Edit Brand Kit" : "Create Brand Kit"}</DialogTitle><DialogDescription>Build your identity in the new Brand Kit workspace. Your current advertisement brief stays open.</DialogDescription></DialogHeader>
          {createBrandOpen && <GuidedBrandKitWorkspace key={editingBrand?.id || "new"} embedded initialBrandId={editingBrand?.id} onSaved={kit => { setCreateBrandOpen(false); void handleBrandCreated(kit); }} />}
        </DialogContent>
      </Dialog>
      <BrandKitImportDialog
        open={importBrandOpen}
        onOpenChange={setImportBrandOpen}
        existingKits={brands}
        onImported={(incoming) => {
          void (async () => {
            await refreshBrands();
            const first = incoming[0];
            if (first) {
              await handleBrandCreated(first);
            }
          })();
        }}
      />
    </div>
  );
}
