import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { SEO } from "../../components/SEO";
import { CreateAdProjectDialog } from "./components/CreateAdProjectDialog";
import { exampleBriefContext, projectWorkspacePath, saveWorkspaceBrief, generateProjectConcepts } from "./lib/projectWorkspace";
import { AdStudioLoader } from "./components/AdStudioLoader";
import { adStudioApi, brandApi } from "../../services/apiClient";
import type { BrandKitSummary } from "../BrandKits/CreateBrandKitDialog";
import { GuidedBrandKitWorkspace } from "../BrandKits/guided/GuidedBrandKit";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { BrandKitImportDialog } from "../BrandKits/components/BrandKitImportDialog";
import {
  applyBrandKitToBriefForm,
  seedBriefFromBrand,
} from "../BrandKits/lib/brandContext";
import { AdStudioHome, type RecentCreative } from "./components/AdStudioHome";
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
  resolveBrandHomeCatalog,
  templatePresentationFor,
  writeStoredBrandKitId,
} from "./lib/brandHomeCatalog";
import type { AdConcept } from "./types";
import { getTemplateDef } from "./canvas/templateCatalog";
import type { AdSceneOutputFormatId, AdStudioTemplateId } from "./canvas/templateCatalog";
import { isAdStudioTemplatesV1Enabled } from "./lib/adStudioTemplatesFlag";
import "../ImageStudio/components/image-edit-fonts.css";
import "./styles/ad-studio-w0a.css";

type StudioView = "home" | "compose";

export default function AdStudio() {
  const navigate = useNavigate();
  const [newProjectOpen, setNewProjectOpen] = useState(false);
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
  const ensureProjectForTemplate = useCallback(
    async (
      format: string,
      seed?: {
        name?: string;
        headline?: string;
        supporting?: string;
        cta?: string;
      },
    ): Promise<string> => {
      const kit = brands.find((b) => b.id === form.brandKitId) ?? null;
      const catalog = resolveBrandHomeCatalog(kit);
      const seeded = kit
        ? seedBriefFromBrand(kit, {
            name: form.name,
            productOrService: form.productOrService,
            coreMessage: form.coreMessage,
            targetAudience: form.targetAudience,
            desiredTone: form.desiredTone,
            cta: form.cta,
          })
        : {};
      const briefState: AdBriefFormState = {
        ...form,
        outputFormat: format,
        name:
          seed?.name?.trim() ||
          form.name.trim() ||
          (catalog.catalogKey === "neutral"
            ? "Template draft"
            : `${catalog.label} template`),
        productOrService:
          form.productOrService.trim() ||
          seeded.productOrService ||
          "Your product or service",
        coreMessage:
          seed?.headline?.trim() ||
          form.coreMessage.trim() ||
          seeded.coreMessage ||
          "Your core message",
        targetAudience:
          form.targetAudience.trim() ||
          seeded.targetAudience ||
          "Your target audience",
        desiredTone:
          form.desiredTone.trim() ||
          seeded.desiredTone ||
          "Confident and clear",
        cta:
          seed?.cta?.trim() ||
          form.cta.trim() ||
          seeded.cta ||
          "Learn more",
      };
      patchForm(briefState);

      if (projectId) {
        await syncProjectBrief(projectId, briefState);
        return projectId;
      }

      const project = await adStudioApi.createProject({
        name: briefState.name.trim(),
        brandKitId: form.brandKitId || undefined,
        brief: {
          productOrService: briefState.productOrService.trim(),
          advertisingObjective: briefState.advertisingObjective,
          targetAudience: briefState.targetAudience.trim(),
          coreMessage: briefState.coreMessage.trim(),
          desiredTone: briefState.desiredTone.trim(),
          platform: briefState.platform,
          outputFormat: briefState.outputFormat,
          cta: briefState.cta.trim() || "Learn more",
        },
        routingProfile: "BALANCED",
      });
      setProjectId(project.id);
      setProjects((prev) => [project, ...prev.filter((x) => x.id !== project.id)]);
      await syncProjectBrief(project.id, briefState);
      return project.id;
    },
    [brands, form, patchForm, projectId, syncProjectBrief],
  );

  const openFromTemplate = useCallback(
    async (templateId: AdStudioTemplateId, format: AdSceneOutputFormatId) => {
      if (!templatesV1Enabled) {
        toast.error("Templates V1 is not enabled in this environment");
        return;
      }
      setBusy(true);
      try {
        const kit = brands.find((b) => b.id === form.brandKitId) ?? null;
        const catalog = resolveBrandHomeCatalog(kit);
        const overlay = templatePresentationFor(catalog, templateId);
        const tpl = getTemplateDef(templateId);
        const pid = await ensureProjectForTemplate(format, {
          name: overlay?.displayName
            ? `${overlay.displayName} draft`
            : `${tpl.name} draft`,
          headline: overlay?.headline,
          supporting: overlay?.supporting,
          cta: overlay?.cta,
        });
        const creative = await adStudioApi.createFromTemplate(pid, {
          templateId,
          format,
          name: overlay?.displayName
            ? `${overlay.displayName} draft`
            : `${tpl.name} draft`,
          primaryHeadline:
            overlay?.headline || form.coreMessage.trim() || undefined,
          supportingCopy:
            overlay?.supporting || form.productOrService.trim() || undefined,
          cta: overlay?.cta || form.cta.trim() || undefined,
        });
        navigate(`/create/ad/${creative.id}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not create template draft");
      } finally {
        setBusy(false);
      }
    },
    [
      brands,
      ensureProjectForTemplate,
      form.brandKitId,
      form.coreMessage,
      form.cta,
      form.productOrService,
      navigate,
      templatesV1Enabled,
    ],
  );

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

  const useExample = (example: FeaturedExample) => {
    setProjectId(null);
    setConcepts([]);
    setCreatives([]);
    setGenerationSource(null);
    // Zoe example briefs bind the ZoeArtisan kit when present.
    let brandKitId = form.brandKitId;
    if (
      example.id.startsWith("zoe-") ||
      example.id === "ex-zoe-artisan"
    ) {
      const zoe = brands.find(
        (b) => resolveBrandHomeCatalog(b).catalogKey === "zoe-artisan",
      );
      if (zoe) {
        brandKitId = zoe.id;
        writeStoredBrandKitId(zoe.id);
      }
    }
    setForm({
      ...DEFAULT_AD_BRIEF,
      ...example.briefDefaults,
      ...exampleBriefContext(example),
      brandKitId,
    });
    setView("compose");
  };

  if (loading) {
    return <AdStudioLoader label="Composing your studio…" />;
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
          onStartIdea={() => setNewProjectOpen(true)}
          onUseExample={useExample}
          onContinueProject={(id) => navigate(projectWorkspacePath(id))}
          onDeleteProject={(p) => void deleteProject(p)}
          onOpenCreative={(id) => navigate(`/create/ad/${id}`)}
          onCreateBrand={openCreateBrand}
          onEditBrand={openEditBrand}
          onImportBrand={openImportBrand}
          onRetryBrands={() => void refreshBrands()}
          templatesV1Enabled={templatesV1Enabled}
          templateBusy={busy}
          onUseTemplate={(tid, fmt) => void openFromTemplate(tid, fmt)}
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
          onUseTemplate={(tid, fmt) => void openFromTemplate(tid, fmt)}
        />
      )}

      <CreateAdProjectDialog open={newProjectOpen} onOpenChange={setNewProjectOpen} brands={brands} brandsLoading={brandsLoading} brandsError={brandsError} onRetryBrands={() => void refreshBrands()} />
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
