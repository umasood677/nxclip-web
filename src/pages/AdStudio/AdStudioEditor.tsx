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
  Settings2,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Badge } from "../../components/ui/badge";
import { SEO } from "../../components/SEO";
import { adStudioApi, brandApi } from "../../services/apiClient";
import type { BrandKitSummary } from "../BrandKits/lib/brandKitTypes";
import {
  buildBrandAssetUrlMap,
  buildBrandAssetUrlMapByStorageKey,
} from "./canvas/brandAssetUrls";
import { sanitizeSceneGraphForClient } from "./canvas/sanitizeSceneGraph";
import { isAdStudioAnimatedEnabled } from "./lib/adStudioAnimatedFlag";
import { AdCanvas } from "./components/AdCanvas";
import { BrandPanel } from "./components/BrandPanel";
import { ExportPanel } from "./components/ExportPanel";
import { InspectorPanel } from "./components/InspectorPanel";
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
import { W87_SYNTHETIC_EDITOR_ENABLED_DEFAULT } from "./composition/w87-synthetic-editor";
import { W87SyntheticCompositionEditor } from "./composition/W87SyntheticCompositionEditor";

type SideTab = "properties" | "brand" | "variations" | "export" | "history";

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
  const [history, setHistory] = useState<AdSceneGraph[]>([]);
  const [future, setFuture] = useState<AdSceneGraph[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [sideTab, setSideTab] = useState<SideTab>("properties");
  const [mobileTab, setMobileTab] = useState<"canvas" | SideTab | "layers">("canvas");
  const [animating, setAnimating] = useState(false);
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

  useEffect(() => {
    graphRef.current = graph;
  }, [graph]);
  useEffect(() => {
    versionRef.current = currentVersion;
  }, [currentVersion]);
  useEffect(() => {
    saveStateRef.current = saveState;
  }, [saveState]);

  const refreshBrandKit = useCallback(async (projectIdHint?: string | null) => {
    const pid = projectIdHint ?? projectId;
    const epoch = ++brandRefreshEpochRef.current;
    if (!pid) {
      setBrandKit(null);
      return;
    }
    try {
      const project = await adStudioApi.getProject(pid);
      if (epoch !== brandRefreshEpochRef.current) return;
      const kitId = project?.brandKitId as string | undefined;
      if (!kitId) {
        setBrandKit(null);
        return;
      }
      const kit = (await brandApi.getKit(kitId)) as BrandKitSummary;
      if (epoch !== brandRefreshEpochRef.current) return;
      setBrandKit(kit);
    } catch (e) {
      if (epoch !== brandRefreshEpochRef.current) return;
      toast.error(
        e instanceof Error ? e.message : "Could not refresh Brand Kit assets",
      );
    }
  }, [projectId]);

  const originalGraphRef = useRef<AdSceneGraph | null>(null);

  const reloadCreative = useCallback(async () => {
    if (!creativeId) return;
    const creative = await adStudioApi.getCreative(creativeId);
    setName(creative.name);
    setProjectId(creative.projectId ?? null);
    const loaded = creative.sceneGraph as AdSceneGraph;
    setGraph(loaded);
    if (!originalGraphRef.current) {
      originalGraphRef.current = structuredClone(loaded);
      setOriginalGraph(originalGraphRef.current);
    }
    setBrandSnapshot(normalizeBrandSnapshot(creative.brandSnapshot));
    setCurrentVersion(creative.currentVersion ?? 1);
    setSaveState("saved");
    setHistory([]);
    setFuture([]);
    editEpochRef.current = 0;
    dragBaselineRef.current = null;
    lastPersistedHashRef.current = JSON.stringify(
      sanitizeSceneGraphForClient(loaded) ?? loaded,
    );
    await refreshBrandKit(creative.projectId ?? null);
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

  const assetUrls = useMemo(() => buildBrandAssetUrlMap(brandKit), [brandKit]);
  const storageKeyUrls = useMemo(
    () => buildBrandAssetUrlMapByStorageKey(brandKit),
    [brandKit],
  );

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
    navigate("/create/ad");
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

  if (loading || !graph) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-muted-foreground gap-2">
        <Loader2 className="animate-spin" size={18} /> Loading creative…
      </div>
    );
  }

  const brandName = brandSnapshot?.name;
  const sideTabs: { id: SideTab; label: string; icon: React.ReactNode }[] = [
    { id: "properties", label: "Props", icon: <Settings2 size={14} aria-hidden /> },
    { id: "brand", label: "Brand", icon: <Palette size={14} aria-hidden /> },
    { id: "variations", label: "Vars", icon: <Sparkles size={14} aria-hidden /> },
    { id: "export", label: "Export", icon: <Download size={14} aria-hidden /> },
    { id: "history", label: "History", icon: <History size={14} aria-hidden /> },
  ];

  const renderSideContent = (tab: SideTab) => {
    if (tab === "history" && creativeId) {
      return (
        <VersionHistoryPanel
          creativeId={creativeId}
          currentVersion={currentVersion}
          dirty={saveState === "dirty" || saveState === "saving"}
          onRestored={reloadCreative}
        />
      );
    }
    if (tab === "brand") {
      return (
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
    }
    if (tab === "variations" && creativeId) {
      return (
        <VariationsPanel
          creativeId={creativeId}
          projectId={projectId}
          currentGraph={graph}
        />
      );
    }
    if (tab === "export" && creativeId) {
      return (
        <ExportPanel
          creativeId={creativeId}
          graph={graph}
          dirty={saveState === "dirty" || saveState === "saving"}
          saving={saving}
          ensureSaved={ensureSaved}
        />
      );
    }
    return (
      <>
        {!previewMode && (
          <InspectorPanel
            layer={selected}
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
        )}
        {previewMode && (
          <p className="text-xs text-muted-foreground p-1">
            Preview mode — selection handles hidden. Exit preview to edit.
          </p>
        )}
        <div className="mt-4 text-xs text-muted-foreground">
          Canvas {graph.canvas.width}×{graph.canvas.height} · schema{" "}
          {graph.schemaVersion}
          <br />
          Shortcuts: Ctrl/Cmd+S save · Z undo · Y redo
        </div>
      </>
    );
  };

  return (
    <div className="space-y-3 max-w-[100vw] overflow-x-hidden">
      <SEO title={`${name} | Ad Studio`} />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={goProjects}
            aria-label="Back to Ad Studio projects"
          >
            <ArrowLeft size={16} className="mr-1" aria-hidden /> Projects
          </Button>
          <h1 className="text-lg font-semibold truncate">{name}</h1>
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
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={undo}
            disabled={!history.length}
          >
            Undo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={redo}
            disabled={!future.length}
          >
            Redo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={restoreOriginalComposition}
            disabled={!originalGraph && !originalGraphRef.current}
            title="Restore the composition loaded when this editor session opened"
          >
            Restore original
          </Button>
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
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
            onClick={() => setZoom((z) => Math.max(0.2, z - 0.05))}
          >
            <ZoomOut size={14} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setZoom((z) => Math.min(1.2, z + 0.05))}
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

      {/* Desktop / laptop workspace (≥1024px); tablet uses mobile tabs */}
      <div className="hidden lg:flex flex-row h-[calc(100vh-160px)] min-h-[480px] gap-3 xl:gap-4 overflow-hidden">
        <Card className="w-56 xl:w-64 shrink-0 h-full glass border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Layers size={14} /> Layers
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(100%-3rem)]">
            <ScrollArea className="h-full pr-2">
              <LayerList
                layers={graph.layers}
                selectedLayerId={selectedLayerId}
                onSelect={setSelectedLayerId}
                onToggleVisible={(id) =>
                  applyGraph((g) => {
                    const layer = g.layers.find((l) => l.id === id);
                    return updateLayer(g, id, {
                      visible: !(layer?.visible !== false),
                    });
                  })
                }
                onToggleLock={(id) =>
                  applyGraph((g) => {
                    const layer = g.layers.find((l) => l.id === id);
                    return updateLayer(g, id, { locked: !layer?.locked });
                  })
                }
                onDuplicate={(id) => applyGraph((g) => duplicateLayer(g, id))}
                onDelete={(id) => {
                  applyGraph((g) => deleteLayer(g, id));
                  if (selectedLayerId === id) setSelectedLayerId(null);
                }}
                onReorder={(id, dir) =>
                  applyGraph((g) => reorderLayer(g, id, dir))
                }
              />
            </ScrollArea>
          </CardContent>
        </Card>

        <AdCanvas
          graph={graph}
          selectedLayerId={previewMode ? null : selectedLayerId}
          onSelectLayer={previewMode ? () => undefined : setSelectedLayerId}
          zoom={zoom}
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

        <Card className="w-72 xl:w-80 shrink-0 h-full glass border-border flex flex-col min-w-0">
          <CardHeader className="pb-2 space-y-2">
            <div
              className="flex gap-1 flex-wrap"
              role="tablist"
              aria-label="Editor side panels"
            >
              {sideTabs.map((t) => (
                <Button
                  key={t.id}
                  type="button"
                  size="sm"
                  role="tab"
                  aria-selected={sideTab === t.id}
                  variant={sideTab === t.id ? "default" : "ghost"}
                  className="h-7 text-[11px] px-2 focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => setSideTab(t.id)}
                >
                  {t.icon}
                  <span className="ml-1">{t.label}</span>
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 pb-4">
            <ScrollArea className="h-full pr-2">
              {renderSideContent(sideTab)}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Tablet / mobile workspace (<1024px) */}
      <div className="lg:hidden space-y-3">
        <div
          className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 snap-x"
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
          <AdCanvas
            graph={graph}
            selectedLayerId={selectedLayerId}
            onSelectLayer={setSelectedLayerId}
            zoom={0.28}
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
        )}
        {mobileTab === "layers" && (
          <Card className="glass border-border">
            <CardContent className="pt-4">
              <LayerList
                layers={graph.layers}
                selectedLayerId={selectedLayerId}
                onSelect={setSelectedLayerId}
                onToggleVisible={(id) =>
                  applyGraph((g) => {
                    const layer = g.layers.find((l) => l.id === id);
                    return updateLayer(g, id, {
                      visible: !(layer?.visible !== false),
                    });
                  })
                }
                onToggleLock={(id) =>
                  applyGraph((g) => {
                    const layer = g.layers.find((l) => l.id === id);
                    return updateLayer(g, id, { locked: !layer?.locked });
                  })
                }
                onDuplicate={(id) => applyGraph((g) => duplicateLayer(g, id))}
                onDelete={(id) => {
                  applyGraph((g) => deleteLayer(g, id));
                  if (selectedLayerId === id) setSelectedLayerId(null);
                }}
                onReorder={(id, dir) =>
                  applyGraph((g) => reorderLayer(g, id, dir))
                }
              />
            </CardContent>
          </Card>
        )}
        {(mobileTab === "properties" ||
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
    </div>
  );
}
