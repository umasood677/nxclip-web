import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save, ZoomIn, ZoomOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Badge } from "../../components/ui/badge";
import { SEO } from "../../components/SEO";
import { adStudioApi } from "../../services/apiClient";
import { AdCanvas } from "./components/AdCanvas";
import { ExportPanel } from "./components/ExportPanel";
import { InspectorPanel } from "./components/InspectorPanel";
import { LayerList } from "./components/LayerList";
import { VariationsPanel } from "./components/VariationsPanel";
import {
  adaptCanvasFormat,
  deleteLayer,
  duplicateLayer,
  reorderLayer,
  updateLayer,
} from "./lib/sceneGraph";
import { AD_FORMATS, type AdSceneGraph, type AdSceneLayer } from "./types";
import "../ImageStudio/components/image-edit-fonts.css";

export default function AdStudioEditor() {
  const { creativeId } = useParams<{ creativeId: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "dirty" | "saving">("saved");
  const [name, setName] = useState("Creative");
  const [graph, setGraph] = useState<AdSceneGraph | null>(null);
  const [currentVersion, setCurrentVersion] = useState(1);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.45);
  const [history, setHistory] = useState<AdSceneGraph[]>([]);
  const [future, setFuture] = useState<AdSceneGraph[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  /** Monotonic token so in-flight saves never clobber newer local edits. */
  const editEpochRef = useRef(0);
  const graphRef = useRef<AdSceneGraph | null>(null);
  const versionRef = useRef(1);
  const saveStateRef = useRef(saveState);

  useEffect(() => {
    graphRef.current = graph;
  }, [graph]);
  useEffect(() => {
    versionRef.current = currentVersion;
  }, [currentVersion]);
  useEffect(() => {
    saveStateRef.current = saveState;
  }, [saveState]);

  useEffect(() => {
    if (!creativeId) return;
    void (async () => {
      try {
        const creative = await adStudioApi.getCreative(creativeId);
        setName(creative.name);
        setGraph(creative.sceneGraph as AdSceneGraph);
        setCurrentVersion(creative.currentVersion ?? 1);
        setSaveState("saved");
        editEpochRef.current = 0;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load creative");
      } finally {
        setLoading(false);
      }
    })();
  }, [creativeId]);

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
    async (opts?: { silent?: boolean }) => {
      if (!creativeId || !graphRef.current) return;
      const epochAtStart = editEpochRef.current;
      const snapshot = graphRef.current;
      const expectedVersion = versionRef.current;
      setSaving(true);
      setSaveState("saving");
      try {
        const updated = await adStudioApi.updateCreative(creativeId, {
          sceneGraph: snapshot,
          changeSummary: opts?.silent ? "Autosave" : "Editor save",
          expectedVersion,
        });
        // Only apply server state if user did not edit while the request was in flight.
        if (editEpochRef.current === epochAtStart) {
          setGraph(updated.sceneGraph as AdSceneGraph);
          setCurrentVersion(updated.currentVersion ?? expectedVersion + 1);
          setSaveState("saved");
          if (!opts?.silent) toast.success("Creative saved");
        } else {
          // Keep newer local edits; bump version from server so next save is consistent.
          setCurrentVersion(updated.currentVersion ?? expectedVersion + 1);
          setSaveState("dirty");
        }
      } catch (e) {
        setSaveState("dirty");
        if (!opts?.silent) {
          toast.error(e instanceof Error ? e.message : "Save failed");
        }
      } finally {
        setSaving(false);
      }
    },
    [creativeId],
  );

  // Debounced autosave — never overwrites newer local edits (see persist epoch guard).
  useEffect(() => {
    if (saveState !== "dirty" || !creativeId || !graph) return;
    const timer = window.setTimeout(() => {
      if (saveStateRef.current === "dirty") {
        void persist({ silent: true });
      }
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [saveState, graph, creativeId, persist]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        void persist();
      } else if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (loading || !graph) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-muted-foreground gap-2">
        <Loader2 className="animate-spin" size={18} /> Loading creative…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SEO title={`${name} | Ad Studio`} />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Button asChild variant="ghost" size="sm">
            <Link to="/create/ad"><ArrowLeft size={16} className="mr-1" /> Projects</Link>
          </Button>
          <h1 className="text-lg font-semibold truncate">{name}</h1>
          <Badge variant="outline">
            {saveState === "saved" ? "Saved" : saveState === "saving" ? "Saving…" : "Unsaved"}
          </Badge>
          <span className="text-xs text-muted-foreground">v{currentVersion}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={undo} disabled={!history.length}>Undo</Button>
          <Button type="button" variant="outline" size="sm" onClick={redo} disabled={!future.length}>Redo</Button>
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            aria-label="Canvas format"
            value={
              AD_FORMATS.find(
                (f) => f.width === graph.canvas.width && f.height === graph.canvas.height,
              )?.id ?? "custom"
            }
            onChange={(e) => {
              const fmt = AD_FORMATS.find((f) => f.id === e.target.value);
              if (!fmt) return;
              applyGraph((g) => adaptCanvasFormat(g, fmt.width, fmt.height));
            }}
          >
            {AD_FORMATS.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
            {!AD_FORMATS.some(
              (f) => f.width === graph.canvas.width && f.height === graph.canvas.height,
            ) && (
              <option value="custom">
                Custom {graph.canvas.width}×{graph.canvas.height}
              </option>
            )}
          </select>
          <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.max(0.2, z - 0.05))}><ZoomOut size={14} /></Button>
          <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.min(1.2, z + 0.05))}><ZoomIn size={14} /></Button>
          <Button
            type="button"
            size="sm"
            variant={previewMode ? "default" : "outline"}
            onClick={() => setPreviewMode((p) => !p)}
          >
            {previewMode ? "Exit preview" : "Preview"}
          </Button>
          <Button type="button" size="sm" onClick={() => void persist()} disabled={saving || saveState === "saved"}>
            <Save size={14} className="mr-1" /> Save
          </Button>
        </div>
      </div>

      <div className="hidden lg:flex flex-row h-[calc(100vh-160px)] gap-4 overflow-hidden">
        <Card className="w-72 h-full glass border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Layers</CardTitle></CardHeader>
          <CardContent className="h-[calc(100%-3rem)]">
            <ScrollArea className="h-full pr-2">
              <LayerList
                layers={graph.layers}
                selectedLayerId={selectedLayerId}
                onSelect={setSelectedLayerId}
                onToggleVisible={(id) =>
                  applyGraph((g) => {
                    const layer = g.layers.find((l) => l.id === id);
                    return updateLayer(g, id, { visible: !(layer?.visible !== false) });
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
                onReorder={(id, dir) => applyGraph((g) => reorderLayer(g, id, dir))}
              />
            </ScrollArea>
          </CardContent>
        </Card>

        <AdCanvas
          graph={graph}
          selectedLayerId={previewMode ? null : selectedLayerId}
          onSelectLayer={previewMode ? () => undefined : setSelectedLayerId}
          zoom={zoom}
          onMoveLayer={(id, x, y) => {
            if (previewMode || !graph) return;
            const layer = graph.layers.find((l) => l.id === id);
            if (!layer || layer.locked) return;
            setGraph(updateLayer(graph, id, { x, y }));
            markDirty();
          }}
          onResizeLayer={
            previewMode
              ? undefined
              : (id, width, height) => {
                  if (!graph) return;
                  const layer = graph.layers.find((l) => l.id === id);
                  if (!layer || layer.locked) return;
                  setGraph(updateLayer(graph, id, { width, height }));
                  markDirty();
                }
          }
        />

        <Card className="w-72 h-full glass border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Properties</CardTitle></CardHeader>
          <CardContent className="h-[calc(100%-3rem)]">
            <ScrollArea className="h-full pr-2">
              {!previewMode && (
                <InspectorPanel
                  layer={selected}
                  onChange={(patch) => {
                    if (!selectedLayerId) return;
                    applyGraph((g) => updateLayer(g, selectedLayerId, patch as Partial<AdSceneLayer>));
                  }}
                />
              )}
              {previewMode && (
                <p className="text-xs text-muted-foreground p-1">
                  Preview mode — selection handles hidden. Exit preview to edit.
                </p>
              )}
              {creativeId && (
                <>
                  <VariationsPanel creativeId={creativeId} />
                  <ExportPanel creativeId={creativeId} graph={graph} />
                </>
              )}
              <div className="mt-4 text-xs text-muted-foreground">
                Canvas {graph.canvas.width}×{graph.canvas.height} · schema {graph.schemaVersion}
                <br />
                Shortcuts: Ctrl/Cmd+S save · Z undo · Y redo
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="lg:hidden space-y-3">
        <AdCanvas
          graph={graph}
          selectedLayerId={selectedLayerId}
          onSelectLayer={setSelectedLayerId}
          zoom={0.28}
          onMoveLayer={(id, x, y) => {
            setGraph((g) => (g ? updateLayer(g, id, { x, y }) : g));
            markDirty();
          }}
        />
        <InspectorPanel
          layer={selected}
          onChange={(patch) => {
            if (!selectedLayerId) return;
            applyGraph((g) => updateLayer(g, selectedLayerId, patch as Partial<AdSceneLayer>));
          }}
        />
      </div>
    </div>
  );
}
