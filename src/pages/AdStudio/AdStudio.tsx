import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { SEO } from "../../components/SEO";
import { adStudioApi, brandApi } from "../../services/apiClient";
import {
  CreateBrandKitDialog,
  type BrandKitSummary,
} from "../BrandKits/CreateBrandKitDialog";
import { BrandKitImportDialog } from "../BrandKits/components/BrandKitImportDialog";
import { seedBriefFromBrand } from "../BrandKits/lib/brandContext";
import { AdStudioHome, type RecentCreative } from "./components/AdStudioHome";
import { GuidedBriefComposer } from "./components/GuidedBriefComposer";
import {
  DEFAULT_AD_BRIEF,
  type AdBriefFormState,
} from "./lib/adStudioLabels";
import type { FeaturedExample } from "./lib/exampleCreatives";
import type { AdConcept } from "./types";
import "../ImageStudio/components/image-edit-fonts.css";

type StudioView = "home" | "compose";

export default function AdStudio() {
  const navigate = useNavigate();
  const [view, setView] = useState<StudioView>("home");
  const [projects, setProjects] = useState<any[]>([]);
  const [recentCreatives, setRecentCreatives] = useState<RecentCreative[]>([]);
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
  const [conceptImages, setConceptImages] = useState<Record<string, string>>({});
  const [creatives, setCreatives] = useState<any[]>([]);
  const [generationSource, setGenerationSource] = useState<string | null>(null);
  const [createBrandOpen, setCreateBrandOpen] = useState(false);
  const [importBrandOpen, setImportBrandOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandKitSummary | null>(null);
  const [form, setForm] = useState<AdBriefFormState>({ ...DEFAULT_AD_BRIEF });

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

  const selectBrand = useCallback(
    (id: string) => {
      setForm((prev) => {
        const kit = brands.find((b) => b.id === id) ?? null;
        const seed = seedBriefFromBrand(kit, prev);
        return { ...prev, brandKitId: id, ...seed };
      });
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

  const loadRecentCreatives = useCallback(async (projectList: any[]) => {
    const top = projectList.slice(0, 4);
    const batches = await Promise.all(
      top.map(async (p) => {
        try {
          const res = await adStudioApi.listCreatives(p.id);
          return (res.items ?? []).map((c: any) => ({
            ...c,
            projectId: p.id,
          }));
        } catch {
          return [];
        }
      }),
    );
    const flat = batches.flat().sort((a, b) => {
      const at = a.updatedAt ? Date.parse(a.updatedAt) : 0;
      const bt = b.updatedAt ? Date.parse(b.updatedAt) : 0;
      return bt - at;
    });
    setRecentCreatives(flat.slice(0, 8));
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const [p] = await Promise.all([adStudioApi.listProjects(), refreshBrands()]);
        const items = p.items ?? [];
        setProjects(items);
        await loadRecentCreatives(items);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load Ad Studio");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadRecentCreatives, refreshBrands]);

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
    try {
      const res = await adStudioApi.generateConcepts(projectId, { conceptCount: 4 });
      const next = (res.concepts ?? []) as AdConcept[];
      setConcepts(next);
      setSelectedConceptId(next[0]?.conceptId ?? null);
      setGenerationSource(res.generationSource ?? res.provider ?? null);
      if (res.generationSource === "heuristic" || /heuristic/i.test(res.provider ?? "")) {
        toast.message("Concepts ready (heuristic)", {
          description: res.warnings?.[0] ?? "AI provider unavailable — templates used.",
        });
      } else {
        toast.success("Concepts generated");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Concept generation failed");
    } finally {
      setConceptsLoading(false);
      setBusy(false);
    }
  };

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
      setRecentCreatives((prev) => prev.filter((c) => c.projectId !== project.id));
      void loadRecentCreatives(nextProjects);
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

  const selectProject = async (id: string) => {
    setProjectId(id);
    setView("compose");
    const project = projects.find((p) => p.id === id);
    if (project) {
      const brief = (project.brief ?? {}) as Partial<AdBriefFormState>;
      setForm((prev) => ({
        ...prev,
        name: project.name || prev.name,
        brandKitId: project.brandKitId || prev.brandKitId || "",
        outputFormat: project.outputFormat || brief.outputFormat || prev.outputFormat,
        productOrService: brief.productOrService ?? prev.productOrService,
        coreMessage: brief.coreMessage ?? prev.coreMessage,
        targetAudience: brief.targetAudience ?? prev.targetAudience,
        advertisingObjective:
          brief.advertisingObjective ?? prev.advertisingObjective,
        platform: brief.platform ?? prev.platform,
        cta: brief.cta ?? prev.cta,
        desiredTone: brief.desiredTone ?? prev.desiredTone,
      }));
    }
    try {
      const [listed, creativeList] = await Promise.all([
        adStudioApi.listConcepts(id),
        adStudioApi.listCreatives(id),
      ]);
      const next = (listed.concepts ?? []) as AdConcept[];
      setConcepts(next);
      setSelectedConceptId(next[0]?.conceptId ?? null);
      setGenerationSource(listed.generationSource ?? listed.provider ?? null);
      setCreatives(creativeList.items ?? []);
    } catch {
      setConcepts([]);
      setCreatives([]);
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
    const exists = items.some((b) => b.id === kit.id);
    if (!exists) {
      setBrands((prev) => [kit, ...prev.filter((b) => b.id !== kit.id)]);
    } else {
      setBrands((prev) => prev.map((b) => (b.id === kit.id ? { ...b, ...kit } : b)));
    }
    // Preserve unsaved brief fields; only seed empties + auto-select.
    setForm((prev) => {
      const seed = seedBriefFromBrand(kit, prev);
      return { ...prev, brandKitId: kit.id, ...seed };
    });
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

  const startIdea = () => {
    setProjectId(null);
    setConcepts([]);
    setCreatives([]);
    setGenerationSource(null);
    setForm((prev) => ({
      ...DEFAULT_AD_BRIEF,
      brandKitId: prev.brandKitId,
      outputFormat: prev.outputFormat,
    }));
    setView("compose");
  };

  const useExample = (example: FeaturedExample) => {
    setProjectId(null);
    setConcepts([]);
    setCreatives([]);
    setGenerationSource(null);
    setForm({
      ...DEFAULT_AD_BRIEF,
      ...example.briefDefaults,
      brandKitId: form.brandKitId,
    });
    setView("compose");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-muted-foreground gap-2">
        <Loader2 className="animate-spin" size={18} /> Loading Ad Studio…
      </div>
    );
  }

  return (
    <div className="pb-6">
      <SEO title="Static Ad Studio | NxClip" />

      {view === "home" ? (
        <AdStudioHome
          projects={projects}
          creatives={recentCreatives}
          brands={brands}
          brandsLoading={brandsLoading}
          brandsError={brandsError}
          selectedBrandId={form.brandKitId}
          selectedFormat={form.outputFormat}
          deletingProjectId={deletingProjectId}
          onSelectBrand={selectBrand}
          onSelectFormat={(formatId) => patchForm({ outputFormat: formatId })}
          onStartIdea={startIdea}
          onUseExample={useExample}
          onContinueProject={(id) => void selectProject(id)}
          onDeleteProject={(p) => void deleteProject(p)}
          onOpenCreative={(id) => navigate(`/create/ad/${id}`)}
          onCreateBrand={openCreateBrand}
          onEditBrand={openEditBrand}
          onImportBrand={openImportBrand}
          onRetryBrands={() => void refreshBrands()}
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
          projectId={projectId}
          canCreate={canCreateProject}
          onCreateProject={() => void createProject()}
          onGenerateConcepts={() => void generateConcepts()}
          concepts={concepts}
          selectedConceptId={selectedConceptId}
          onSelectConcept={setSelectedConceptId}
          generationSource={generationSource}
          conceptImages={conceptImages}
          creatives={creatives}
          onOpenConcept={(id) => void openFromConcept(id)}
          onGenerateBackground={(id) => void generateBackground(id)}
          onOpenCreative={(id) => navigate(`/create/ad/${id}`)}
        />
      )}

      <CreateBrandKitDialog
        open={createBrandOpen}
        onOpenChange={(open) => {
          setCreateBrandOpen(open);
          if (!open) setEditingBrand(null);
        }}
        initialKit={editingBrand}
        onCreated={(kit) => void handleBrandCreated(kit)}
      />
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
