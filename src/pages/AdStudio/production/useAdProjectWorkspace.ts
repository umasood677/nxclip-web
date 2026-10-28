import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { adStudioApi, brandApi } from "../../../services/apiClient";
import type { BrandKitSummary } from "../../BrandKits/CreateBrandKitDialog";
import { useAuthenticatedBrandAssetUrls } from "../canvas/useAuthenticatedBrandAssetUrls";
import type {
  AdSceneOutputFormatId,
  AdStudioTemplateId,
} from "../canvas/templateCatalog";
import { resolveBrandHomeCatalog } from "../lib/brandHomeCatalog";
import { isAdStudioTemplatesV1Enabled } from "../lib/adStudioTemplatesFlag";
import { DEFAULT_AD_BRIEF, type AdBriefFormState } from "../lib/adStudioLabels";
import type { AdConcept } from "../types";
import {
  loadWorkspace,
  projectBriefForm,
  saveWorkspaceBrief,
  generateProjectConcepts,
  createProjectTemplate,
  createProjectConcept,
  creativeEditorPath,
  type WorkspaceProject,
  type WorkspaceCreative,
} from "../lib/projectWorkspace";
export type StartMode = "choose" | "templates" | "examples" | "concepts" | null;
/** One existing project controller shared by legacy and approved-M2B presentation. */
export function useAdProjectWorkspace() {
  const { projectId = "" } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<WorkspaceProject | null>(null);
  const [creatives, setCreatives] = useState<WorkspaceCreative[]>([]);
  const [brand, setBrand] = useState<BrandKitSummary | null>(null);
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(
    null,
  );
  const [concepts, setConcepts] = useState<AdConcept[]>([]);
  const [conceptError, setConceptError] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const operationRef = useRef(false);
  const loadEpoch = useRef(0);
  const [start, setStart] = useState<StartMode>(null);
  const [compose, setCompose] = useState(false);
  const [form, setForm] = useState<AdBriefFormState>({ ...DEFAULT_AD_BRIEF });
  const [savedForm, setSavedForm] = useState("");
  const [editingIdea, setEditingIdea] = useState(false);
  const [idea, setIdea] = useState("");
  const [ideaError, setIdeaError] = useState<string | null>(null);
  const [exportCreative, setExportCreative] =
    useState<WorkspaceCreative | null>(null);
  const assetUrls = useAuthenticatedBrandAssetUrls(brand);
  const templatesEnabled = isAdStudioTemplatesV1Enabled();
  const draftDirty =
    (compose && JSON.stringify(form) !== savedForm) ||
    (editingIdea &&
      idea !==
        (project?.brief?.campaignIdea ?? project?.brief?.coreMessage ?? ""));

  const load = useCallback(async () => {
    const epoch = ++loadEpoch.current;
    setConceptError(null);
    setEditingIdea(false);
    setCompose(false);
    setStart(null);
    setLoading(true);
    setError(null);
    setBrand(null);
    setProject(null);
    setConcepts([]);
    try {
      const result = await loadWorkspace(adStudioApi, projectId);
      if (epoch !== loadEpoch.current) return;
      setProject(result.project);
      setCreatives(result.creatives);
      const nextForm = projectBriefForm(result.project);
      setForm(nextForm);
      setSavedForm(JSON.stringify(nextForm));
      setIdea(
        result.project.brief?.campaignIdea ??
          result.project.brief?.coreMessage ??
          "",
      );
      if (result.project.brandKitId) {
        try {
          const kit = await brandApi.getKit(result.project.brandKitId);
          if (epoch === loadEpoch.current) setBrand(kit);
        } catch {
          setConceptError(
            "Brand assets are unavailable. Reopen the project to retry; your saved creatives are retained.",
          );
        }
      }
      try {
        const list = await adStudioApi.listConcepts(projectId);
        if (epoch !== loadEpoch.current) return;
        setConcepts(list.concepts ?? []);
        setSource(list.generationSource ?? list.provider ?? null);
      } catch {
        setConceptError(
          "Saved concepts could not load. Templates and your creative gallery remain available.",
        );
      }
    } catch (e) {
      if (epoch === loadEpoch.current)
        setError(
          e instanceof Error ? e.message : "Could not load this project.",
        );
    } finally {
      if (epoch === loadEpoch.current) setLoading(false);
    }
  }, [projectId]);
  useEffect(() => {
    void load();
    return () => {
      loadEpoch.current++;
    };
  }, [load]);
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (draftDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [draftDirty]);
  // Keep BrowserRouter and its existing routes; guard sidebar links and history as well as our buttons.
  useEffect(() => {
    let index = window.history.state?.idx as number | undefined;
    let restoring = false;
    const projectPath = window.location.pathname;
    const mayLeave = () =>
      !busy && (!draftDirty || window.confirm("Discard unsaved changes?"));
    const onLink = (event: MouseEvent) => {
      if (
        (!draftDirty && !busy) ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const target =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (!(target instanceof HTMLAnchorElement) || target.target === "_blank")
        return;
      const url = new URL(target.href, window.location.href);
      if (url.pathname === window.location.pathname) return;
      if (url.href !== window.location.href && !mayLeave()) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const onPop = (event: PopStateEvent) => {
      if (restoring) {
        restoring = false;
        event.stopImmediatePropagation();
        return;
      }
      const next = event.state?.idx as number | undefined;
      if (window.location.pathname === projectPath) {
        index = next;
        return;
      }
      if (
        typeof index === "number" &&
        typeof next === "number" &&
        index !== next &&
        !mayLeave()
      ) {
        event.stopImmediatePropagation();
        restoring = true;
        window.history.go(index - next);
        return;
      }
      index = next;
    };
    document.addEventListener("click", onLink, true);
    window.addEventListener("popstate", onPop, true);
    return () => {
      document.removeEventListener("click", onLink, true);
      window.removeEventListener("popstate", onPop, true);
    };
  }, [draftDirty, busy]);
  const confirmLeave = () =>
    !busy && (!draftDirty || window.confirm("Discard unsaved changes?"));
  const run = async (task: () => Promise<void>) => {
    if (operationRef.current) return;
    operationRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "This action failed. Please retry.",
      );
    } finally {
      operationRef.current = false;
      setBusy(false);
    }
  };
  const openTemplate = (
    id: AdStudioTemplateId,
    format: AdSceneOutputFormatId,
  ) => {
    if (!project) return;
    void run(async () => {
      const currentProject = compose ? await saveBrief() : project;
      const creative = await createProjectTemplate(
        adStudioApi,
        currentProject,
        id,
        format,
      );
      navigate(creativeEditorPath(creative.id));
    });
  };
  const openConcept = (id: string) => {
    if (!project) return;
    void run(async () => {
      const creative = await createProjectConcept(
        adStudioApi,
        project,
        id,
        concepts,
      );
      navigate(creativeEditorPath(creative.id));
    });
  };
  const saveIdea = async () => {
    if (!project || busy) return;
    if (!idea.trim() || idea.length > 4000) {
      setIdeaError("Enter a Campaign Idea of up to 4,000 characters.");
      return;
    }
    setIdeaError(null);
    await run(async () => {
      const updated = await adStudioApi.updateProject(project.id, {
        brief: { ...project.brief, campaignIdea: idea },
      });
      if (updated.brief?.campaignIdea !== idea)
        throw Error(
          "The running project service does not yet support Campaign Idea. Your text is retained here; service activation is required.",
        );
      setProject(updated);
      setEditingIdea(false);
      toast.success("Campaign Idea saved");
    });
  };
  const saveBrief = async (
    options: import("../lib/projectWorkspace").BriefSaveOptions = {},
  ) => {
    if (!project) throw Error("Open a project before saving a brief.");
    const updated = await saveWorkspaceBrief(
      adStudioApi,
      project,
      form,
      options,
    );
    setProject(updated);
    setSavedForm(JSON.stringify(form));
    return updated as WorkspaceProject;
  };
  const generateConcepts = () =>
    void run(async () => {
      if (!project) throw Error("Open a project before generating.");
      const generated = await generateProjectConcepts(
        adStudioApi,
        project,
        form,
      );
      setProject(generated.project);
      setSavedForm(JSON.stringify(form));
      const result = generated.result;
      setConcepts(result.concepts ?? []);
      setSource(result.generationSource ?? result.provider ?? null);
      toast.success("Concepts ready");
    });

  const catalog = resolveBrandHomeCatalog(brand);
  const back = () => {
    if (project && confirmLeave()) {
      setCompose(false);
      setStart(null);
      const restored = projectBriefForm(project);
      setForm(restored);
      setSavedForm(JSON.stringify(restored));
    }
  };
  return {
    projectId,
    navigate,
    project,
    setProject,
    creatives,
    brand,
    selectedConceptId,
    setSelectedConceptId,
    concepts,
    setConcepts,
    conceptError,
    setConceptError,
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
    savedForm,
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
  };
}
export type AdProjectWorkspaceController = ReturnType<
  typeof useAdProjectWorkspace
>;
