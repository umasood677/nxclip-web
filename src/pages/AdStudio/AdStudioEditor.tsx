import { useCreativeAssetUrls } from './canvas/useCreativeAssetUrls';
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Clapperboard,
  Download,
  History,
  Layers,
  Loader2,
  Palette,
  Save,
  Sparkles,
  Type,
  Wand2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { SEO } from "../../components/SEO";
import { adStudioApi, brandApi } from "../../services/apiClient";
import type { BrandKitSummary } from "../BrandKits/lib/brandKitTypes";
import { useAuthenticatedBrandAssetUrls } from "./canvas/useAuthenticatedBrandAssetUrls";
import { sanitizeSceneGraphForClient } from "./canvas/sanitizeSceneGraph";
import { isAdStudioAnimatedEnabled } from "./lib/adStudioAnimatedFlag";
import { AdCanvas } from "./components/AdCanvas";
import { AdStudioTypographyPanel } from "./components/AdStudioTypographyPanel";
import { BrandPanel } from "./components/BrandPanel";
import { CollapsiblePanel } from "./components/CollapsiblePanel";
import { ExportPanel } from "./components/ExportPanel";
import { LayerList } from "./components/LayerList";
import { VariationsPanel } from "./components/VariationsPanel";
import { VersionHistoryPanel } from "./components/VersionHistoryPanel";
import {
  applyBrandColorToSelection,
  applyBrandFontToSelection,
  normalizeBrandSnapshot,
  type BrandSnapshotView,
} from "./lib/brandSnapshot";
import {
  adaptCanvasFormat,
  alignLayer,
  deleteLayer,
  duplicateLayer,
  reorderLayer,
  setCanvasBackground,
  updateLayer,
  type AlignMode,
} from "./lib/sceneGraph";
import { AD_FORMATS, type AdSceneGraph, type AdSceneLayer } from "./types";
import "../ImageStudio/components/image-edit-fonts.css";
import "./styles/ad-studio-w0a.css";
import { W87_SYNTHETIC_EDITOR_ENABLED_DEFAULT } from "./composition/w87-synthetic-editor";
import { W87SyntheticCompositionEditor } from "./composition/W87SyntheticCompositionEditor";
import { IntelligentAdStudioHost } from "./intelligent/IntelligentAdStudioHost";
import { getPersistedUser } from "../../services/auth/authService";
import { AdStudioTopNav } from "./components/AdStudioTopNav";
import { AdStudioLoader } from "./components/AdStudioLoader";

type SideTab = "typography" | "brand" | "variations" | "export" | "history";

/** Stage A synthetic editor mount point — flag defaults false; never shown to beta. */
const W87_STAGE_A_EDITOR_MOUNT = W87_SYNTHETIC_EDITOR_ENABLED_DEFAULT;

function isConflictError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const status =
    (e as { statusCode?: number }).statusCode ??
    (e as { response?: { status?: number } }).response?.status ??
    (e as { status?: number }).status;
  return status === 409;
}

export default function AdStudioEditor() {
  const { creativeId } = useParams<{ creativeId: string }>();
  const navigate = useNavigate();
  const ownerUserId = useMemo(() => {
    // Login/App persist `uid` (SerializedUser); JWT-shaped blobs may use sub/id.
    const u = getPersistedUser() as {
      uid?: string;
      id?: string;
      sub?: string;
      userId?: string;
    } | null;
    return u?.uid ?? u?.id ?? u?.sub ?? u?.userId ?? "";
  }, []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "dirty" | "saving">("saved");
  const [name, setName] = useState("Creative");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [brandSnapshot, setBrandSnapshot] = useState<BrandSnapshotView | null>(null);
  const [brandKit, setBrandKit] = useState<BrandKitSummary | null>(null);
  const [graph, setGraph] = useState<AdSceneGraph | null>(null);
  const [originalGraph, setOriginalGraph] = useState<AdSceneGraph | null>(null);
  const [currentVersion, setCurrentVersion] = useState(1);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.45);
  const [fitZoom, setFitZoom] = useState(true);
  const [history, setHistory] = useState<AdSceneGraph[]>([]);
  const [future, setFuture] = useState<AdSceneGraph[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [mobileTab, setMobileTab] = useState<"canvas" | SideTab | "layers">("canvas");
  const [animating, setAnimating] = useState(false);
  const [leftIntelMount, setLeftIntelMount] = useState<HTMLElement | null>(null);
  const [rightIntelMount, setRightIntelMount] = useState<HTMLElement | null>(null);
  const [isDesktopCanvas, setIsDesktopCanvas] = useState(false);
  /** Monotonic token so in-flight saves never clobber newer local edits. */
  const editEpochRef = useRef(0);
  const graphRef = useRef<AdSceneGraph | null>(null);
  const versionRef = useRef(1);
  const saveStateRef = useRef(saveState);
  const dragBaselineRef = useRef<AdSceneGraph | null>(null);
  const saveInFlightRef = useRef<Promise<boolean> | null>(null);
  /** Skip silent autosave when scene payload is unchanged (pairs with server hash no-op). */
  const lastPersistedHashRef = useRef<string | null>(null);
  const persistConflictRef = useRef(false);
  const brandRefreshEpochRef = useRef(0);
  const stageWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    graphRef.current = graph;
  }, [graph]);
  useEffect(() => {
    versionRef.current = currentVersion;
  }, [currentVersion]);
  useEffect(() => {
    saveStateRef.current = saveState;
  }, [saveState]);

  const refreshBrandKit = useCallback(
    async (opts?: {
      projectIdHint?: string | null;
      snapshotKitId?: string | null;
    }) => {
      const epoch = ++brandRefreshEpochRef.current;
      const pid = opts?.projectIdHint ?? projectId;
      let kitId = (opts?.snapshotKitId || "").trim() || "";

      // Prefer creative snapshot kit id; project fetch is best-effort only.
      if (!kitId && pid) {
        try {
          const project = await adStudioApi.getProject(pid);
          if (epoch !== brandRefreshEpochRef.current) return;
          kitId = (project?.brandKitId as string | undefined)?.trim() || "";
        } catch {
          // Soft-fail: Editor still works from creative + snapshot; avoid noisy toasts.
        }
      }

      if (!kitId) {
        if (epoch === brandRefreshEpochRef.current) setBrandKit(null);
        return;
      }
      try {
        const kit = (await brandApi.getKit(kitId)) as BrandKitSummary;
        if (epoch !== brandRefreshEpochRef.current) return;
        setBrandKit(kit);
      } catch (e) {
        if (epoch !== brandRefreshEpochRef.current) return;
        toast.error(
          e instanceof Error ? e.message : "Could not refresh Brand Kit assets",
        );
      }
    },
    [projectId],
  );

  const originalGraphRef = useRef<AdSceneGraph | null>(null);

  const reloadCreative = useCallback(async () => {
    if (!creativeId) return;
    const creative = await adStudioApi.getCreative(creativeId);
    setName(creative.name);
    setProjectId(creative.projectId ?? null);
    const loaded = creative.sceneGraph as AdSceneGraph;
    setGraph(loaded);
    setFitZoom(true);
    if (!originalGraphRef.current) {
      originalGraphRef.current = structuredClone(loaded);
      setOriginalGraph(originalGraphRef.current);
    }
    const snap = normalizeBrandSnapshot(creative.brandSnapshot);
    setBrandSnapshot(snap);
    setCurrentVersion(creative.currentVersion ?? 1);
    setSaveState("saved");
    setHistory([]);
    setFuture([]);
    editEpochRef.current = 0;
    dragBaselineRef.current = null;
    lastPersistedHashRef.current = JSON.stringify(
      sanitizeSceneGraphForClient(loaded) ?? loaded,
    );
    await refreshBrandKit({
      projectIdHint: creative.projectId ?? null,
      snapshotKitId: snap?.brandKitId ?? null,
    });
  }, [creativeId, refreshBrandKit]);

  useEffect(() => {
    if (!creativeId) return;
    void (async () => {
      try {
        await reloadCreative();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load creative");
      } finally {
        setLoading(false);
      }
    })();
  }, [creativeId, reloadCreative]);

  const markDirty = useCallback(() => {
    editEpochRef.current += 1;
    setSaveState("dirty");
  }, []);

  const applyGraph = useCallback(
    (mutator: (g: AdSceneGraph) => AdSceneGraph) => {
      setGraph((current) => {
        if (!current) return current;
        const next = mutator(current);
        setHistory((h) => [...h.slice(-29), current]);
        setFuture([]);
        editEpochRef.current += 1;
        setSaveState("dirty");
        return next;
      });
    },
    [],
  );

  const selected = useMemo(
    () => graph?.layers.find((l) => l.id === selectedLayerId) ?? null,
    [graph, selectedLayerId],
  );

  const brandAssetUrls = useAuthenticatedBrandAssetUrls(brandKit);
  const generatedUrls = useCreativeAssetUrls(creativeId && graph?.layers.some(l=>l.id.startsWith('ai-background-'))?[creativeId]:[]);
  const assetUrls = useMemo(()=>({...brandAssetUrls,...generatedUrls}),[brandAssetUrls,generatedUrls]);
  // Do not pass auth-gated gateway media via storageKey map into <img src>.
  // assetId → blob hydration in useAuthenticatedBrandAssetUrls is the preview path.
  const storageKeyUrls = useMemo(() => ({}), [brandKit]);

  const restoreOriginalComposition = () => {
    const original = originalGraphRef.current ?? originalGraph;
    if (!original || !graph) return;
    setHistory((h) => [...h.slice(-29), graph]);
    setFuture([]);
    setGraph(structuredClone(original));
    markDirty();
    toast.success("Restored original generated composition (unsaved)");
  };

  const undo = () => {
    if (!graph || !history.length) return;
    const prev = history[history.length - 1]!;
    setHistory((h) => h.slice(0, -1));
    setFuture((f) => [graph, ...f]);
    setGraph(prev);
    markDirty();
  };

  const redo = () => {
    if (!graph || !future.length) return;
    const next = future[0]!;
    setFuture((f) => f.slice(1));
    setHistory((h) => [...h, graph]);
    setGraph(next);
    markDirty();
  };

  const persist = useCallback(
    async (opts?: { silent?: boolean }): Promise<boolean> => {
      if (!creativeId || !graphRef.current) return false;
      if (saveInFlightRef.current) {
        return saveInFlightRef.current;
      }

      const run = async (): Promise<boolean> => {
        persistConflictRef.current = false;
        const epochAtStart = editEpochRef.current;
        const snapshot = graphRef.current!;
        const expectedVersion = versionRef.current;
        const sceneGraph = sanitizeSceneGraphForClient(snapshot) ?? snapshot;
        const payloadHash = JSON.stringify(sceneGraph);
        if (opts?.silent && lastPersistedHashRef.current === payloadHash) {
          setSaveState("saved");
          return true;
        }
        setSaving(true);
        setSaveState("saving");
        try {
          const updated = await adStudioApi.updateCreative(creativeId, {
            // Strip private keys from client payload; server rehydrates storageKeys.
            sceneGraph,
            changeSummary: opts?.silent ? "Autosave" : "Editor save",
            expectedVersion,
          });
          const nextVersion = updated.currentVersion ?? expectedVersion + 1;
          lastPersistedHashRef.current = payloadHash;
          if (editEpochRef.current === epochAtStart) {
            setGraph(updated.sceneGraph as AdSceneGraph);
            setCurrentVersion(nextVersion);
            setSaveState("saved");
            if (!opts?.silent) toast.success("Creative saved");
            return true;
          }
          setCurrentVersion(nextVersion);
          setSaveState("dirty");
          return false;
        } catch (e) {
          setSaveState("dirty");
          if (isConflictError(e)) {
            persistConflictRef.current = true;
            toast.error("Version conflict — another save updated this creative.", {
              action: {
                label: "Reload",
                onClick: () => {
                  void reloadCreative().catch(() =>
                    toast.error("Could not reload creative"),
                  );
                },
              },
              duration: 8000,
            });
          } else if (!opts?.silent) {
            toast.error(e instanceof Error ? e.message : "Save failed");
          }
          return false;
        } finally {
          setSaving(false);
        }
      };

      const flight = run();
      saveInFlightRef.current = flight;
      try {
        return await flight;
      } finally {
        if (saveInFlightRef.current === flight) {
          saveInFlightRef.current = null;
        }
      }
    },
    [creativeId, reloadCreative],
  );

  const ensureSaved = useCallback(async (): Promise<boolean> => {
    if (saveStateRef.current === "saved") return true;
    const ok = await persist({ silent: true });
    if (!ok && !persistConflictRef.current) {
      toast.error("Could not save — export cancelled");
    }
    return ok;
  }, [persist]);

  // Debounced autosave
  useEffect(() => {
    if (saveState !== "dirty" || !creativeId || !graph) return;
    const timer = window.setTimeout(() => {
      if (saveStateRef.current === "dirty") {
        void persist({ silent: true });
      }
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [saveState, graph, creativeId, persist]);

  // Tab/window close warning (BrowserRouter — no useBlocker)
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStateRef.current === "dirty" || saveStateRef.current === "saving") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        void persist();
      } else if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        e.key.toLowerCase() === "y" ||
        (e.key.toLowerCase() === "z" && e.shiftKey)
      ) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const confirmLeave = useCallback(() => {
    if (saveState === "dirty" || saveState === "saving") {
      return window.confirm(
        "You have unsaved changes. Leave without saving? (Autosave may still be in progress.)",
      );
    }
    return true;
  }, [saveState]);

  const goProjects = () => {
    if (!confirmLeave()) return;
    navigate(projectId ? "/create/ad/projects/" + encodeURIComponent(projectId) : "/create/ad");
  };

  const animateThisAd = async () => {
    if (!creativeId) return;
    if (!isAdStudioAnimatedEnabled()) {
      toast.message("Animated Ad Studio is not enabled in this environment");
      return;
    }
    if (saveState === "dirty" || saveState === "saving") {
      const ok = window.confirm(
        "Save the static creative before animating? Unsaved edits will not be in the animated copy unless you save first.\n\nOK = save then animate · Cancel = abort",
      );
      if (!ok) return;
      await persist();
    }
    setAnimating(true);
    try {
      const animated = await adStudioApi.animateCreative(creativeId, {
        durationMs: 15_000,
      });
      toast.success("Animated derivative created — static original unchanged");
      navigate(`/create/ad/animated/${animated.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create animated ad");
    } finally {
      setAnimating(false);
    }
  };

  const liveMove = (id: string, x: number, y: number) => {
    if (previewMode) return;
    setGraph((g) => {
      if (!g) return g;
      const layer = g.layers.find((l) => l.id === id);
      if (!layer || layer.locked) return g;
      if (!dragBaselineRef.current) dragBaselineRef.current = g;
      return updateLayer(g, id, { x, y });
    });
    markDirty();
  };

  const liveResize = (id: string, width: number, height: number) => {
    if (previewMode) return;
    setGraph((g) => {
      if (!g) return g;
      const layer = g.layers.find((l) => l.id === id);
      if (!layer || layer.locked) return g;
      if (!dragBaselineRef.current) dragBaselineRef.current = g;
      return updateLayer(g, id, { width, height });
    });
    markDirty();
  };

  const commitTransform = () => {
    const baseline = dragBaselineRef.current;
    if (baseline) {
      setHistory((h) => [...h.slice(-29), baseline]);
      setFuture([]);
      dragBaselineRef.current = null;
    }
  };

  const onAlign = (mode: AlignMode) => {
    if (!selectedLayerId) return;
    applyGraph((g) => alignLayer(g, selectedLayerId, mode));
  };

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktopCanvas(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  /**
   * Default zoom mode is Fit: keep the full ad (aspect + rounded frame) in view.
   * Retries until the stage has measurable size (post-layout / panel open).
   */
  useEffect(() => {
    if (!fitZoom || !graph) return;
    const INSET = 0.9;
    let cancelled = false;
    let tries = 0;
    let raf = 0;

    const applyFit = () => {
      if (cancelled) return;
      const el = stageWrapRef.current;
      if (!el) {
        if (tries++ < 24) raf = requestAnimationFrame(applyFit);
        return;
      }
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const padX =
        (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
      const padY =
        (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
      const visibleW = Math.max(
        0,
        Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0),
      );
      const visibleH = Math.max(
        0,
        Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0),
      );
      const cw = Math.min(el.clientWidth, visibleW || el.clientWidth) - padX - 8;
      const ch = Math.min(el.clientHeight, visibleH || el.clientHeight) - padY - 8;
      if (cw <= 0 || ch <= 0) {
        if (tries++ < 24) raf = requestAnimationFrame(applyFit);
        return;
      }
      tries = 0;
      const fitted =
        Math.min(cw / graph.canvas.width, ch / graph.canvas.height) * INSET;
      setZoom(Math.max(0.06, Math.min(1.2, fitted)));
    };

    raf = requestAnimationFrame(applyFit);
    const el = stageWrapRef.current;
    const ro = el ? new ResizeObserver(() => applyFit()) : null;
    if (el) ro!.observe(el);
    window.addEventListener("resize", applyFit);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", applyFit);
    };
  }, [fitZoom, graph?.canvas.width, graph?.canvas.height, isDesktopCanvas]);

  if (loading || !graph) {
    return <AdStudioLoader label="Opening Editor Canvas…" />;
  }

  const brandName = brandSnapshot?.name;
  const sideTabs: { id: SideTab; label: string; icon: React.ReactNode }[] = [
    { id: "typography", label: "Typography", icon: <Type size={14} aria-hidden /> },
    { id: "brand", label: "Brand", icon: <Palette size={14} aria-hidden /> },
    { id: "variations", label: "Vars", icon: <Sparkles size={14} aria-hidden /> },
    { id: "export", label: "Export", icon: <Download size={14} aria-hidden /> },
    { id: "history", label: "History", icon: <History size={14} aria-hidden /> },
  ];

  const typographyPanel = (
    <AdStudioTypographyPanel
      layer={selected}
      previewMode={previewMode}
      onChange={(patch) => {
        if (!selectedLayerId) return;
        applyGraph((g) =>
          updateLayer(g, selectedLayerId, patch as Partial<AdSceneLayer>),
        );
      }}
      onAlign={onAlign}
      canvasBackground={graph.canvas.backgroundColor}
      onCanvasBackground={(hex) =>
        applyGraph((g) => setCanvasBackground(g, hex))
      }
    />
  );

  const brandPanel = (
    <BrandPanel
      snapshot={brandSnapshot}
      hasSelection={Boolean(selectedLayerId)}
      onApplyColor={(hex, target) =>
        applyGraph((g) =>
          applyBrandColorToSelection(g, selectedLayerId, hex, target),
        )
      }
      onApplyFont={(family) =>
        applyGraph((g) =>
          applyBrandFontToSelection(g, selectedLayerId, family),
        )
      }
    />
  );

  const variationsPanel =
    creativeId ? (
      <VariationsPanel
        creativeId={creativeId}
        projectId={projectId}
        currentGraph={graph}
      />
    ) : (
      <p className="text-xs text-muted-foreground">Save the creative to manage variations.</p>
    );

  const exportPanel =
    creativeId ? (
      <ExportPanel
        creativeId={creativeId}
        graph={graph}
        dirty={saveState === "dirty" || saveState === "saving"}
        saving={saving}
        ensureSaved={ensureSaved}
      />
    ) : (
      <p className="text-xs text-muted-foreground">Save the creative to export.</p>
    );

  const historyPanel =
    creativeId ? (
      <VersionHistoryPanel
        creativeId={creativeId}
        currentVersion={currentVersion}
        dirty={saveState === "dirty" || saveState === "saving"}
        onRestored={reloadCreative}
      />
    ) : (
      <p className="text-xs text-muted-foreground">Save the creative to view history.</p>
    );

  const renderSideContent = (tab: SideTab) => {
    if (tab === "history") return historyPanel;
    if (tab === "brand") return brandPanel;
    if (tab === "variations") return variationsPanel;
    if (tab === "export") return exportPanel;
    return (
      <>
        {typographyPanel}
        <div className="mt-4 text-xs text-muted-foreground">
          Size {graph.canvas.width}×{graph.canvas.height}
          <br />
          Shortcuts: Ctrl/Cmd+S save · Z undo · Y redo
        </div>
      </>
    );
  };

  const layerListProps = {
    layers: graph.layers,
    selectedLayerId,
    onSelect: setSelectedLayerId,
    onToggleVisible: (id: string) =>
      applyGraph((g) => {
        const layer = g.layers.find((l) => l.id === id);
        return updateLayer(g, id, {
          visible: !(layer?.visible !== false),
        });
      }),
    onToggleLock: (id: string) =>
      applyGraph((g) => {
        const layer = g.layers.find((l) => l.id === id);
        return updateLayer(g, id, { locked: !layer?.locked });
      }),
    onDuplicate: (id: string) => applyGraph((g) => duplicateLayer(g, id)),
    onDelete: (id: string) => {
      applyGraph((g) => deleteLayer(g, id));
      if (selectedLayerId === id) setSelectedLayerId(null);
    },
    onReorder: (id: string, dir: "up" | "down") =>
      applyGraph((g) => reorderLayer(g, id, dir)),
  };

  return (
    <div
      className="ad-studio-w0a ad-studio-w0a--editor flex flex-col gap-2 max-w-[100vw] overflow-hidden px-2 md:px-3 pb-2 h-[calc(100dvh-5.75rem)] md:h-[calc(100dvh-6.25rem)]"
      id="ad-studio-canvas"
    >
      <SEO title={`${name} | Ad Studio · Editor Canvas`} />
      <AdStudioTopNav
        hideBrand
        active="canvas"
        recentCreativeId={creativeId}
        className="shrink-0 mb-0"
        onSectionNav={(id) => {
          if (id === "home" || id === "templates" || id === "briefs" || id === "library" || id === "catalog") {
            navigate("/create/ad");
          }
          if (id === "concepts") navigate("/create/ad");
        }}
      />
      <div className="w0a-editor-toolbar shrink-0">
        <div className="w0a-editor-toolbar__meta min-w-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={goProjects}
            aria-label="Back to Ad Studio projects"
          >
            <ArrowLeft size={14} className="mr-1" aria-hidden /> {projectId ? "Back to Project" : "Projects"}
          </Button>
          <h2 className="text-sm font-semibold truncate max-w-[12rem] sm:max-w-[18rem]">{name}</h2>
          {brandName ? (
            <Badge variant="secondary" className="max-w-[10rem] truncate" title={brandName}>
              {brandName}
            </Badge>
          ) : (
            <Badge variant="outline">Neutral</Badge>
          )}
          <Badge variant="outline">
            {saveState === "saved"
              ? "Saved"
              : saveState === "saving"
                ? "Saving…"
                : "Unsaved"}
          </Badge>
          <span className="text-xs text-muted-foreground">v{currentVersion}</span>
        </div>
        <div className="w0a-editor-toolbar__actions">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7"
            onClick={undo}
            disabled={!history.length}
          >
            Undo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7"
            onClick={redo}
            disabled={!future.length}
          >
            Redo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7"
            onClick={restoreOriginalComposition}
            disabled={!originalGraph && !originalGraphRef.current}
            title="Restore the composition loaded when this editor session opened"
          >
            Restore original
          </Button>
          <select
            className="h-7 rounded-md border border-input bg-background px-2 text-xs"
            aria-label="Canvas format"
            value={
              AD_FORMATS.find(
                (f) =>
                  f.width === graph.canvas.width &&
                  f.height === graph.canvas.height,
              )?.id ?? "custom"
            }
            onChange={(e) => {
              const fmt = AD_FORMATS.find((f) => f.id === e.target.value);
              if (!fmt) return;
              applyGraph((g) => adaptCanvasFormat(g, fmt.width, fmt.height));
            }}
          >
            {AD_FORMATS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
            {!AD_FORMATS.some(
              (f) =>
                f.width === graph.canvas.width &&
                f.height === graph.canvas.height,
            ) && (
              <option value="custom">
                Custom {graph.canvas.width}×{graph.canvas.height}
              </option>
            )}
          </select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            title="Zoom out"
            onClick={() => {
              setFitZoom(false);
              setZoom((z) => Math.max(0.12, z - 0.05));
            }}
          >
            <ZoomOut size={14} />
          </Button>
          <Button
            type="button"
            variant={fitZoom ? "default" : "outline"}
            size="sm"
            className="h-8 text-[11px] px-2"
            title="Fit ad preview in stage (no scroll)"
            onClick={() => setFitZoom(true)}
          >
            Fit
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            title="Zoom in"
            onClick={() => {
              setFitZoom(false);
              setZoom((z) => Math.min(1.2, z + 0.05));
            }}
          >
            <ZoomIn size={14} />
          </Button>
          <Button
            type="button"
            size="sm"
            variant={previewMode ? "default" : "outline"}
            onClick={() => setPreviewMode((p) => !p)}
          >
            {previewMode ? "Exit preview" : "Preview"}
          </Button>
          {isAdStudioAnimatedEnabled() ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={animating || !creativeId}
              onClick={() => void animateThisAd()}
              title="Create an animated derivative (keeps this static creative)"
            >
              {animating ? (
                <Loader2 size={14} className="mr-1 animate-spin" />
              ) : (
                <Clapperboard size={14} className="mr-1" />
              )}
              Animate This Ad
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            onClick={() => void persist()}
            disabled={saving || saveState === "saved"}
          >
            <Save size={14} className="mr-1" /> Save
          </Button>
        </div>
      </div>

      {/* Desktop / laptop workspace — L layers+composition / C stage / R tools */}
      <div className="hidden lg:grid w0a-canvas-layout flex-1 min-h-0 overflow-hidden">
        <aside className="w0a-pane h-full min-w-0">
          <div className="w0a-pane-scroll space-y-2">
            <CollapsiblePanel
              title="Layers"
              icon={<Layers size={12} />}
              defaultOpen
              badge={graph.layers.length}
            >
              <LayerList {...layerListProps} />
            </CollapsiblePanel>
            <CollapsiblePanel
              title="Creative composition"
              icon={<Wand2 size={12} />}
              defaultOpen
            >
              <div
                ref={setLeftIntelMount}
                className="min-h-[8px]"
                data-testid="intel-left-dock"
              />
            </CollapsiblePanel>
          </div>
        </aside>

        <div
          ref={isDesktopCanvas ? stageWrapRef : undefined}
          className="w0a-stage-wrap h-full min-h-0"
        >
          <AdCanvas
            graph={graph}
            selectedLayerId={previewMode ? null : selectedLayerId}
            onSelectLayer={previewMode ? () => undefined : setSelectedLayerId}
            zoom={zoom}
            className="!border-0 !bg-transparent !p-0 !rounded-none h-full w-full"
            onMoveLayer={liveMove}
            onResizeLayer={previewMode ? undefined : liveResize}
            onTransformEnd={commitTransform}
            assetUrls={assetUrls}
            storageKeyUrls={storageKeyUrls}
            onAssetLoadError={() => {
              void refreshBrandKit();
            }}
            showSafeArea
          />
        </div>

        <aside className="w0a-pane h-full min-w-0">
          <div className="w0a-pane-scroll space-y-2">
            <CollapsiblePanel
              title="Typography"
              icon={<Type size={12} />}
              defaultOpen
              badge={selected ? selected.name || selected.type : undefined}
            >
              {typographyPanel}
            </CollapsiblePanel>
            <CollapsiblePanel
              title="Brand"
              icon={<Palette size={12} />}
              defaultOpen={false}
            >
              {brandPanel}
            </CollapsiblePanel>
            <CollapsiblePanel
              title="Vars"
              icon={<Sparkles size={12} />}
              defaultOpen={false}
            >
              {variationsPanel}
            </CollapsiblePanel>
            <CollapsiblePanel
              title="Export"
              icon={<Download size={12} />}
              defaultOpen={false}
            >
              {exportPanel}
            </CollapsiblePanel>
            <CollapsiblePanel
              title="History"
              icon={<History size={12} />}
              defaultOpen={false}
            >
              {historyPanel}
            </CollapsiblePanel>
            <CollapsiblePanel
              title="Composition tools"
              icon={<Wand2 size={12} />}
              defaultOpen
            >
              <div
                ref={setRightIntelMount}
                className="min-h-[8px]"
                data-testid="intel-right-dock"
              />
            </CollapsiblePanel>
          </div>
        </aside>
      </div>

      {/* Tablet / mobile workspace (<1024px) */}
      <div className="lg:hidden flex flex-col flex-1 min-h-0 gap-3 overflow-hidden">
        <div
          className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 snap-x shrink-0"
          role="tablist"
          aria-label="Mobile editor sections"
        >
          {(
            [
              { id: "canvas" as const, label: "Canvas" },
              { id: "layers" as const, label: "Layers" },
              ...sideTabs.map((t) => ({
                id: t.id as SideTab | "layers" | "canvas",
                label: t.label,
              })),
            ] as { id: typeof mobileTab; label: string }[]
          ).map((t) => (
            <Button
              key={t.id}
              type="button"
              size="sm"
              role="tab"
              aria-selected={mobileTab === t.id}
              variant={mobileTab === t.id ? "default" : "outline"}
              className="h-8 shrink-0 snap-start focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => setMobileTab(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>

        {mobileTab === "canvas" && (
          <div
            ref={!isDesktopCanvas ? stageWrapRef : undefined}
            className="w0a-stage-wrap flex-1 min-h-[240px]"
          >
            <AdCanvas
              graph={graph}
              selectedLayerId={selectedLayerId}
              onSelectLayer={setSelectedLayerId}
              zoom={zoom}
              className="!border-0 !bg-transparent !p-0 !rounded-none h-full w-full"
              onMoveLayer={liveMove}
              onResizeLayer={liveResize}
              onTransformEnd={commitTransform}
              assetUrls={assetUrls}
              storageKeyUrls={storageKeyUrls}
              onAssetLoadError={() => {
                void refreshBrandKit();
              }}
              showSafeArea
            />
          </div>
        )}
        {mobileTab === "layers" && (
          <Card className="glass border-border">
            <CardContent className="pt-4">
              <LayerList {...layerListProps} />
            </CardContent>
          </Card>
        )}
        {(mobileTab === "typography" ||
          mobileTab === "brand" ||
          mobileTab === "variations" ||
          mobileTab === "export" ||
          mobileTab === "history") && (
          <Card className="glass border-border">
            <CardContent className="pt-4">{renderSideContent(mobileTab)}</CardContent>
          </Card>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground lg:hidden">
        Brand snapshot stays frozen unless you apply palette/fonts explicitly.{" "}
        <Link to="/brands" className="underline">
          Brand Kits
        </Link>
      </p>

      {W87_STAGE_A_EDITOR_MOUNT ? (
        <W87SyntheticCompositionEditor
          enabled={false}
          model={{
            selectedVariationId: "",
            isolationApproval: "pendingReview",
            productPreservationOk: true,
            providerGatesReady: false,
            mockOnly: true,
            featureEnabled: false,
            executionAuthorized: false,
            variations: [],
          }}
          assetUrls={{}}
        />
      ) : null}

      {graph && creativeId ? (
        <IntelligentAdStudioHost
          ownerUserId={ownerUserId}
          projectId={projectId}
          creativeId={creativeId}
          graph={graph}
          brandKit={brandKit}
          assetUrls={assetUrls}
          leftMount={isDesktopCanvas ? leftIntelMount : undefined}
          rightMount={isDesktopCanvas ? rightIntelMount : undefined}
          onCommitGraph={(next) => {
            setHistory((h) => [...h.slice(-29), graph]);
            setFuture([]);
            setGraph(next);
            markDirty();
          }}
        />
      ) : null}
    </div>
  );
}
