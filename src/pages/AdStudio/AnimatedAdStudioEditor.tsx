import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Clapperboard, Loader2, Save } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { SEO } from "../../components/SEO";
import { cn } from "../../lib/utils";
import { adStudioApi } from "../../services/apiClient";
import { AdCanvas } from "./components/AdCanvas";
import { MotionInspector } from "./components/MotionInspector";
import { MotionPlaybackControls } from "./components/MotionPlaybackControls";
import { MotionPresetGallery } from "./components/MotionPresetGallery";
import { MotionTimeline } from "./components/MotionTimeline";
import { MotionVersionHistoryPanel } from "./components/MotionVersionHistoryPanel";
import { normalizeBrandSnapshot } from "./lib/brandSnapshot";
import { isAdStudioAnimatedEnabled } from "./lib/adStudioAnimatedFlag";
import { countMissingAssets } from "./lib/motionAssets";
import AnimatedAdStudioUnavailable from "./AnimatedAdStudioUnavailable";
import {
  autosaveBackoffMs,
  graphsEqual,
  isConflictError,
  motionGraphFingerprint,
  reconcileSaveResponse,
  shouldSkipSave,
  type SaveStatus,
} from "./lib/motionAutosave";
import {
  canApplyPreset,
  canRestoreVersion,
  displaySaveLabel,
  shouldWarnBeforeLeave,
} from "./lib/motionRaceGates";
import {
  createMotionHistory,
  pushMotionHistory,
  redoMotionHistory,
  replacePresent,
  undoMotionHistory,
  type MotionHistoryState,
} from "./lib/motionHistory";
import {
  absoluteToRelative,
  addKeyframeAtPlayhead,
  clearAllAnimations,
  clearLayerAnimations,
  deleteKeyframe,
  duplicateKeyframe,
  moveKeyframe,
  setAnimationEasing,
  updateKeyframeValue,
  type EditorPropertyId,
  type KeyframeSelection,
} from "./lib/motionKeyframeOps";
import {
  evaluateMotionGraph,
  evaluatedToPreviewStyles,
} from "./lib/motionEvaluate";
import {
  clampTimeMs,
  clampTimelineZoom,
  TIMELINE_ZOOM_DEFAULT,
} from "./lib/motionTimeline";
import type { AdMotionEasing, AdMotionSceneGraph } from "./lib/motionTypes";
import {
  MOTION_DURATION_MAX_MS,
  MOTION_DURATION_MIN_MS,
} from "./lib/motionTypes";
import type { AdSceneGraph } from "./types";
import "../ImageStudio/components/image-edit-fonts.css";

function toBaseStaticGraph(motion: AdMotionSceneGraph): AdSceneGraph {
  return {
    schemaVersion: "1.0",
    canvas: {
      width: motion.canvas.width,
      height: motion.canvas.height,
      backgroundColor: motion.canvas.backgroundColor,
    },
    layers: motion.layers.map((layer) => {
      const { startMs: _s, endMs: _e, animations: _a, ...rest } = layer;
      void _s;
      void _e;
      void _a;
      return rest;
    }),
  };
}

/**
 * Animated Ad Studio — Phase 4B-C: live preview, autosave, version restore.
 */
export default function AnimatedAdStudioEditor() {
  const { animatedId } = useParams<{ animatedId: string }>();
  const navigate = useNavigate();
  const animatedEnabled = isAdStudioAnimatedEnabled();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("Animated ad");
  const [parentStaticId, setParentStaticId] = useState<string | null>(null);
  const [version, setVersion] = useState(1);
  const [brandName, setBrandName] = useState<string | null>(null);
  const [history, setHistory] = useState<MotionHistoryState | null>(null);
  const [saveState, setSaveState] = useState<SaveStatus>("saved");
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [selectedKeyframe, setSelectedKeyframe] = useState<KeyframeSelection | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [pxPerSecond, setPxPerSecond] = useState(TIMELINE_ZOOM_DEFAULT);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [canvasZoom, setCanvasZoom] = useState(0.35);
  const [inspectorTab, setInspectorTab] = useState<"props" | "presets" | "history">("props");
  const [presetBusy, setPresetBusy] = useState(false);
  const [mobilePane, setMobilePane] = useState<"canvas" | "inspector" | "timeline">("canvas");
  const [serverConfirmed, setServerConfirmed] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);

  const graph = history?.present ?? null;
  const graphRef = useRef<AdMotionSceneGraph | null>(null);
  const versionRef = useRef(1);
  const saveStateRef = useRef<SaveStatus>("saved");
  const editEpochRef = useRef(0);
  const lastSavedFpRef = useRef<string | null>(null);
  const savingRef = useRef(false);
  const retryAttemptRef = useRef(0);
  const retryTimerRef = useRef<number | null>(null);
  const abortSaveTokenRef = useRef(0);
  const dragBaselineRef = useRef<AdMotionSceneGraph | null>(null);

  const playingRef = useRef(false);
  const timeRef = useRef(0);
  const rateRef = useRef(1);
  const loopRef = useRef(true);
  const durationRef = useRef(15_000);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const displayThrottleRef = useRef(0);

  useEffect(() => {
    graphRef.current = graph;
  }, [graph]);
  useEffect(() => {
    versionRef.current = version;
  }, [version]);
  useEffect(() => {
    saveStateRef.current = saveState;
  }, [saveState]);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);
  useEffect(() => {
    timeRef.current = currentTimeMs;
  }, [currentTimeMs]);
  useEffect(() => {
    rateRef.current = playbackRate;
  }, [playbackRate]);
  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);
  useEffect(() => {
    durationRef.current = graph?.canvas.durationMs ?? 15_000;
  }, [graph?.canvas.durationMs]);

  const markDirty = useCallback(() => {
    editEpochRef.current += 1;
    setSaveState("dirty");
    setServerConfirmed(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  const commitGraph = useCallback(
    (next: AdMotionSceneGraph) => {
      setHistory((h) => (h ? pushMotionHistory(h, next) : createMotionHistory(next)));
      markDirty();
    },
    [markDirty],
  );

  const applyEdit = useCallback(
    (result: {
      ok: boolean;
      graph?: AdMotionSceneGraph;
      selection?: KeyframeSelection | null;
      message?: string;
    }) => {
      if (!result.ok || !result.graph) {
        toast.error(result.message ?? "Edit failed");
        return;
      }
      commitGraph(result.graph);
      if (result.selection !== undefined) setSelectedKeyframe(result.selection);
    },
    [commitGraph],
  );

  const reloadAnimated = useCallback(async () => {
    if (!animatedId) return;
    const creative = await adStudioApi.getAnimated(animatedId);
    setName(creative.name ?? "Animated ad");
    setParentStaticId(creative.parentStaticCreativeId ?? null);
    const motion = creative.motionGraph as AdMotionSceneGraph;
    setVersion(creative.currentVersion ?? 1);
    versionRef.current = creative.currentVersion ?? 1;
    setHistory(createMotionHistory(motion));
    lastSavedFpRef.current = motionGraphFingerprint(motion);
    setSaveState("saved");
    setServerConfirmed(true);
    editEpochRef.current += 1;
    abortSaveTokenRef.current += 1;
    setBrandName(normalizeBrandSnapshot(creative.brandSnapshot)?.name ?? null);
    setSelectedKeyframe(null);
    setSelectedLayerId(motion.layers[0]?.id ?? null);
    durationRef.current = motion.canvas.durationMs;
    timeRef.current = 0;
    setCurrentTimeMs(0);
  }, [animatedId]);

  const persist = useCallback(
    async (opts?: { silent?: boolean; force?: boolean }): Promise<boolean> => {
      if (!animatedId || !graphRef.current) return false;
      const snapshot = graphRef.current;
      const fp = motionGraphFingerprint(snapshot);
      if (
        !opts?.force &&
        shouldSkipSave({
          status: saveStateRef.current,
          fingerprint: fp,
          lastSavedFingerprint: lastSavedFpRef.current,
          saving: savingRef.current,
        })
      ) {
        return saveStateRef.current === "saved";
      }
      if (savingRef.current && !opts?.force) return false;

      const epochAtStart = editEpochRef.current;
      const expectedVersion = versionRef.current;
      const token = abortSaveTokenRef.current;
      savingRef.current = true;
      setSaveState("saving");

      try {
        const updated = await adStudioApi.updateAnimated(animatedId, {
          motionGraph: snapshot,
          changeSummary: opts?.silent ? "Autosave" : "Editor save",
          expectedVersion,
        });
        if (token !== abortSaveTokenRef.current) {
          return false;
        }
        const serverGraph = updated.motionGraph as AdMotionSceneGraph;
        const serverVersion = updated.currentVersion ?? expectedVersion + 1;
        const reconciled = reconcileSaveResponse({
          epochAtStart,
          currentEpoch: editEpochRef.current,
          serverGraph,
          serverVersion,
        });
        versionRef.current = reconciled.version;
        setVersion(reconciled.version);
        if (reconciled.applyServerGraph) {
          setHistory((h) =>
            h ? replacePresent(h, serverGraph) : createMotionHistory(serverGraph),
          );
          lastSavedFpRef.current = motionGraphFingerprint(serverGraph);
          setSaveState("saved");
          setServerConfirmed(true);
          retryAttemptRef.current = 0;
          if (!opts?.silent) toast.success("Animated creative saved");
          return true;
        }
        lastSavedFpRef.current = motionGraphFingerprint(serverGraph);
        setSaveState("dirty");
        setServerConfirmed(false);
        return false;
      } catch (e) {
        if (token !== abortSaveTokenRef.current) return false;
        setSaveState("error");
        if (isConflictError(e)) {
          toast.error("Version conflict — the server has a newer motion version.", {
            action: {
              label: "Reload",
              onClick: () => {
                void reloadAnimated().catch(() =>
                  toast.error("Could not reload animated creative"),
                );
              },
            },
            duration: 10_000,
          });
          return false;
        }
        if (!opts?.silent) {
          toast.error(e instanceof Error ? e.message : "Save failed");
        }
        // Bounded retry for recoverable network failures
        const attempt = retryAttemptRef.current;
        if (attempt < 3 && opts?.silent) {
          retryAttemptRef.current = attempt + 1;
          if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
          retryTimerRef.current = window.setTimeout(() => {
            setSaveState("dirty");
            void persist({ silent: true });
          }, autosaveBackoffMs(attempt));
        }
        return false;
      } finally {
        savingRef.current = false;
        if (saveStateRef.current === "saving") {
          // leave status as set above
        }
      }
    },
    [animatedId, reloadAnimated],
  );

  // Debounced autosave — not for playhead ticks
  useEffect(() => {
    if (saveState !== "dirty" || !animatedId || !graph) return;
    const timer = window.setTimeout(() => {
      if (saveStateRef.current === "dirty") {
        void persist({ silent: true });
      }
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [saveState, graph, animatedId, persist]);

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

  const stopRaf = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTsRef.current = null;
  }, []);

  const tick = useCallback(
    (ts: number) => {
      if (!playingRef.current) {
        stopRaf();
        return;
      }
      if (document.hidden) {
        lastTsRef.current = ts;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) * rateRef.current;
      lastTsRef.current = ts;
      let next = timeRef.current + dt;
      const duration = durationRef.current;
      if (next >= duration) {
        if (loopRef.current) next = 0;
        else {
          next = duration;
          playingRef.current = false;
          setPlaying(false);
          stopRaf();
        }
      }
      timeRef.current = next;
      if (ts - displayThrottleRef.current >= 33 || !playingRef.current) {
        displayThrottleRef.current = ts;
        setCurrentTimeMs(next);
      }
      if (playingRef.current) rafRef.current = requestAnimationFrame(tick);
    },
    [stopRaf],
  );

  const play = useCallback(() => {
    if (timeRef.current >= durationRef.current) {
      timeRef.current = 0;
      setCurrentTimeMs(0);
    }
    setPlaying(true);
    playingRef.current = true;
    lastTsRef.current = null;
    stopRaf();
    rafRef.current = requestAnimationFrame(tick);
  }, [stopRaf, tick]);

  const pause = useCallback(() => {
    setPlaying(false);
    playingRef.current = false;
    stopRaf();
    setCurrentTimeMs(timeRef.current);
  }, [stopRaf]);

  const restart = useCallback(() => {
    timeRef.current = 0;
    setCurrentTimeMs(0);
    if (playingRef.current) lastTsRef.current = null;
  }, []);

  const seek = useCallback((timeMs: number) => {
    const next = clampTimeMs(timeMs, durationRef.current);
    timeRef.current = next;
    setCurrentTimeMs(next);
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && playingRef.current) {
        // Keep clock but freeze dt via tick's hidden branch; optional hard pause:
        lastTsRef.current = null;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stopRaf();
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
    };
  }, [stopRaf]);

  useEffect(() => {
    if (!animatedEnabled) {
      setLoading(false);
      return;
    }
    if (!animatedId) return;
    void (async () => {
      try {
        await reloadAnimated();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load animated creative");
      } finally {
        setLoading(false);
      }
    })();
  }, [animatedId, reloadAnimated, animatedEnabled]);

  const undo = useCallback(() => {
    if (!history?.past.length) return;
    setHistory((h) => (h ? undoMotionHistory(h) : h));
    setSelectedKeyframe(null);
    markDirty();
  }, [history, markDirty]);

  const redo = useCallback(() => {
    if (!history?.future.length) return;
    setHistory((h) => (h ? redoMotionHistory(h) : h));
    setSelectedKeyframe(null);
    markDirty();
  }, [history, markDirty]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      const mod = e.metaKey || e.ctrlKey;

      if (!inField && (e.key === " " || e.code === "Space")) {
        e.preventDefault();
        if (playingRef.current) pause();
        else play();
        return;
      }
      if (!inField && (e.key === "Delete" || e.key === "Backspace") && selectedKeyframe) {
        e.preventDefault();
        if (!graphRef.current) return;
        applyEdit(deleteKeyframe(graphRef.current, selectedKeyframe));
        return;
      }
      if (!inField && e.key === "Escape") {
        setSelectedKeyframe(null);
        return;
      }
      if (!mod) return;
      if (inField) return;
      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        void persist({ force: true });
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
  }, [persist, undo, redo, selectedKeyframe, applyEdit, play, pause]);

  const staticBase = useMemo(
    () => (graph ? toBaseStaticGraph(graph) : null),
    [graph],
  );

  const motionPreview = useMemo(() => {
    if (!graph) return null;
    return evaluatedToPreviewStyles(evaluateMotionGraph(graph, currentTimeMs));
  }, [graph, currentTimeMs]);

  const selectedLayer =
    graph && selectedLayerId
      ? graph.layers.find((l) => l.id === selectedLayerId) ?? null
      : null;

  const onDurationChange = (raw: number) => {
    if (!graph) return;
    const durationMs = Math.min(
      MOTION_DURATION_MAX_MS,
      Math.max(MOTION_DURATION_MIN_MS, Math.round(raw)),
    );
    commitGraph({
      ...graph,
      canvas: { ...graph.canvas, durationMs },
      layers: graph.layers.map((layer) => ({
        ...layer,
        endMs:
          layer.endMs === graph.canvas.durationMs
            ? durationMs
            : Math.min(layer.endMs, durationMs),
      })),
    });
    seek(clampTimeMs(currentTimeMs, durationMs));
  };

  const onMoveKeyframeLive = (sel: KeyframeSelection, absoluteMs: number) => {
    if (!graph) return;
    const layer = graph.layers.find((l) => l.id === sel.layerId);
    if (!layer) return;
    if (!dragBaselineRef.current) dragBaselineRef.current = graph;
    const relative = absoluteToRelative(absoluteMs, layer);
    const result = moveKeyframe(dragBaselineRef.current, sel, relative);
    if (!result.ok) return;
    setHistory((h) => (h ? replacePresent(h, result.graph) : h));
    if (result.selection) setSelectedKeyframe(result.selection);
  };

  const onKeyframeDragEnd = () => {
    const baseline = dragBaselineRef.current;
    if (!baseline || !history) {
      dragBaselineRef.current = null;
      return;
    }
    if (!graphsEqual(history.present, baseline)) {
      setHistory((h) =>
        h
          ? { past: [...h.past.slice(-39), baseline], present: h.present, future: [] }
          : h,
      );
      markDirty();
    }
    dragBaselineRef.current = null;
  };

  const applyPresetSafe = async (presetId: string) => {
    if (!animatedId || !graphRef.current) return;
    setPresetBusy(true);
    try {
      let flushSucceeded: boolean | null = null;
      if (saveStateRef.current === "dirty" || saveStateRef.current === "error") {
        flushSucceeded = await persist({ silent: true, force: true });
      } else if (saveStateRef.current === "saved") {
        flushSucceeded = true;
      }
      const gate = canApplyPreset({
        saveStatus: saveStateRef.current,
        flushSucceeded,
      });
      if (!gate.ok) {
        throw new Error(gate.reason ?? "Cannot apply preset");
      }
      let spins = 0;
      while (savingRef.current && spins < 40) {
        await new Promise((r) => setTimeout(r, 50));
        spins += 1;
      }
      try {
        const updated = await adStudioApi.applyMotionPreset(animatedId, {
          presetId,
          expectedVersion: versionRef.current,
        });
        const motion = updated.motionGraph as AdMotionSceneGraph;
        abortSaveTokenRef.current += 1;
        editEpochRef.current += 1;
        setHistory(createMotionHistory(motion));
        setVersion(updated.currentVersion ?? versionRef.current + 1);
        versionRef.current = updated.currentVersion ?? versionRef.current + 1;
        lastSavedFpRef.current = motionGraphFingerprint(motion);
        setSaveState("saved");
        setServerConfirmed(true);
        setSelectedKeyframe(null);
        durationRef.current = motion.canvas.durationMs;
        seek(clampTimeMs(currentTimeMs, motion.canvas.durationMs));
        toast.success(`Applied “${presetId}”`);
      } catch (e) {
        // H: flush already succeeded — keep saved; do not claim preset applied
        if (flushSucceeded) {
          setSaveState("saved");
          setServerConfirmed(true);
        }
        throw e;
      }
    } finally {
      setPresetBusy(false);
    }
  };

  const restoreVersion = async (versionNumber: number) => {
    if (!animatedId) return;
    const gate = canRestoreVersion({ saving: savingRef.current });
    if (!gate.ok) {
      throw new Error(gate.reason ?? "Cannot restore");
    }
    abortSaveTokenRef.current += 1;
    const updated = await adStudioApi.restoreAnimatedVersion(animatedId, {
      version: versionNumber,
    });
    const motion = updated.motionGraph as AdMotionSceneGraph;
    editEpochRef.current += 1;
    setHistory(createMotionHistory(motion));
    setVersion(updated.currentVersion ?? versionRef.current + 1);
    versionRef.current = updated.currentVersion ?? versionRef.current + 1;
    lastSavedFpRef.current = motionGraphFingerprint(motion);
    setSaveState("saved");
    setServerConfirmed(true);
    setSelectedKeyframe(null);
    durationRef.current = motion.canvas.durationMs;
    seek(0);
  };

  const goProjects = () => {
    if (shouldWarnBeforeLeave(saveState)) {
      const ok = window.confirm(
        "You have unsaved motion changes. Leave without saving?",
      );
      if (!ok) return;
    }
    navigate("/create/ad");
  };

  if (!animatedEnabled) {
    return <AnimatedAdStudioUnavailable />;
  }

  if (loading || !graph || !staticBase || !history) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-muted-foreground gap-2">
        <Loader2 className="animate-spin" size={18} /> Loading animated editor…
      </div>
    );
  }

  const { durationMs, fps } = graph.canvas;
  const saveLabel = displaySaveLabel({
    status: saveState,
    serverConfirmed: serverConfirmed && saveState === "saved",
  });
  const missingAssets = countMissingAssets(graph.layers);

  const inspectorPanel = (
    <Card className="glass border-border h-full">
      <CardHeader className="pb-2 space-y-2">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Inspector panels">
          {(
            [
              ["props", "Properties"],
              ["presets", "Presets"],
              ["history", "History"],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              type="button"
              size="sm"
              role="tab"
              aria-selected={inspectorTab === id}
              variant={inspectorTab === id ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={() => setInspectorTab(id)}
            >
              {label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="max-h-[min(420px,50vh)] lg:max-h-[420px] overflow-y-auto">
        {inspectorTab === "props" ? (
          <MotionInspector
            graph={graph}
            layer={selectedLayer}
            selection={selectedKeyframe}
            playheadMs={currentTimeMs}
            onAddKeyframe={(prop: EditorPropertyId) => {
              if (!selectedLayerId) return;
              applyEdit(addKeyframeAtPlayhead(graph, selectedLayerId, prop, currentTimeMs));
            }}
            onDeleteKeyframe={() => {
              if (!selectedKeyframe) return;
              applyEdit(deleteKeyframe(graph, selectedKeyframe));
            }}
            onDuplicateKeyframe={() => {
              if (!selectedKeyframe) return;
              applyEdit(duplicateKeyframe(graph, selectedKeyframe, fps));
            }}
            onChangeValue={(value) => {
              if (!selectedKeyframe) return;
              applyEdit(updateKeyframeValue(graph, selectedKeyframe, value));
            }}
            onChangeTime={(relativeMs) => {
              if (!selectedKeyframe) return;
              applyEdit(moveKeyframe(graph, selectedKeyframe, relativeMs));
            }}
            onChangeEasing={(easing: AdMotionEasing) => {
              if (!selectedKeyframe) return;
              applyEdit(
                setAnimationEasing(
                  graph,
                  selectedKeyframe.layerId,
                  selectedKeyframe.property,
                  easing,
                ),
              );
            }}
            onClearLayerAnimation={() => {
              if (!selectedLayerId) return;
              applyEdit(clearLayerAnimations(graph, selectedLayerId));
            }}
          />
        ) : null}
        {inspectorTab === "presets" ? (
          <MotionPresetGallery
            graph={graph}
            busy={presetBusy}
            reduceMotion={reduceMotion}
            onApplyPreset={applyPresetSafe}
            onRemoveAllLocal={() => {
              const ok = window.confirm(
                "Remove all animation keyframes? Changes will autosave.",
              );
              if (!ok) return;
              commitGraph(clearAllAnimations(graph));
              setSelectedKeyframe(null);
            }}
          />
        ) : null}
        {inspectorTab === "history" && animatedId ? (
          <MotionVersionHistoryPanel
            animatedId={animatedId}
            currentVersion={version}
            dirty={saveState === "dirty" || saveState === "error"}
            saving={saveState === "saving" || savingRef.current}
            onRestore={restoreVersion}
          />
        ) : null}
      </CardContent>
    </Card>
  );

  const canvasPanel = (
    <Card className="glass border-border overflow-hidden h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Live motion preview</CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Deterministic evaluation at the playhead. Space = play/pause · Del = delete keyframe.
        </p>
      </CardHeader>
      <CardContent className="overflow-auto">
        <div className="flex justify-center min-h-[200px] sm:min-h-[240px]">
          <AdCanvas
            graph={staticBase}
            selectedLayerId={selectedLayerId}
            onSelectLayer={(id) => {
              setSelectedLayerId(id);
              setSelectedKeyframe(null);
            }}
            onMoveLayer={() => undefined}
            zoom={canvasZoom}
            motionPreview={motionPreview}
            interactionLocked={playing}
            className="pointer-events-auto max-w-full"
          />
        </div>
        <div className="flex justify-center gap-2 mt-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label="Zoom canvas out"
            onClick={() => setCanvasZoom((z) => Math.max(0.15, z - 0.05))}
          >
            Zoom −
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label="Zoom canvas in"
            onClick={() => setCanvasZoom((z) => Math.min(0.9, z + 0.05))}
          >
            Zoom +
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-3 max-w-[100vw] overflow-x-hidden pb-24 lg:pb-8">
      <SEO title={`${name} | Animated Ad Studio`} />
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {saveLabel}
        {saveState === "error" ? ". Save failed. Try Save again or reload." : ""}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap sticky top-0 z-40 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70 py-2 -mx-1 px-1 border-b border-border/60 lg:static lg:border-0 lg:bg-transparent lg:backdrop-blur-none lg:py-0">
        <div className="flex items-center gap-2 min-w-0">
          <Button type="button" variant="ghost" size="sm" onClick={goProjects} aria-label="Back to Ad Studio projects">
            <ArrowLeft size={16} className="mr-1" aria-hidden /> Projects
          </Button>
          <Clapperboard size={18} className="text-primary shrink-0" aria-hidden />
          <h1 className="text-lg font-semibold truncate">{name}</h1>
          {brandName ? (
            <Badge variant="secondary" className="max-w-[10rem] truncate hidden sm:inline-flex" title={brandName}>
              {brandName}
            </Badge>
          ) : (
            <Badge variant="outline" className="hidden sm:inline-flex">Neutral</Badge>
          )}
          <Badge variant="outline">Motion v{version}</Badge>
          <Badge
            variant={saveState === "error" ? "destructive" : "secondary"}
            className="text-[10px]"
            title={saveLabel}
          >
            {saveLabel}
          </Badge>
          <Badge variant="secondary" className="text-[10px] hidden md:inline-flex">
            4B-D
          </Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!history.past.length}
            onClick={undo}
            aria-label="Undo motion edit"
          >
            Undo
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!history.future.length}
            onClick={redo}
            aria-label="Redo motion edit"
          >
            Redo
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={saveState === "saved" || saveState === "saving"}
            onClick={() => void persist({ force: true })}
            aria-label="Save animated creative"
          >
            <Save size={14} className="mr-1" /> Save
          </Button>
          {parentStaticId ? (
            <Button type="button" size="sm" variant="outline" asChild>
              <Link to={`/create/ad/${parentStaticId}`}>Open static original</Link>
            </Button>
          ) : null}
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Duration
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
              aria-label="Animation duration"
              value={durationMs}
              onChange={(e) => onDurationChange(Number(e.target.value))}
            >
              {[6, 8, 10, 12, 15, 20, 25, 30].map((s) => (
                <option key={s} value={s * 1000}>
                  {s}s
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {missingAssets > 0 ? (
        <div
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200"
          role="status"
        >
          {missingAssets} layer{missingAssets === 1 ? "" : "s"} missing Brand Kit asset
          references. Placeholders do not invent substitute product imagery.
        </div>
      ) : null}

      {/* Mobile pane switcher — keeps canvas / inspector / timeline from stacking into overflow */}
      <div
        className="flex lg:hidden gap-1 rounded-lg border border-border p-1"
        role="tablist"
        aria-label="Editor workspace"
      >
        {(
          [
            ["canvas", "Canvas"],
            ["inspector", "Inspector"],
            ["timeline", "Timeline"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            size="sm"
            role="tab"
            aria-selected={mobilePane === id}
            variant={mobilePane === id ? "default" : "ghost"}
            className="flex-1 h-8 text-xs"
            onClick={() => setMobilePane(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="hidden lg:grid lg:grid-cols-12 gap-3">
        <div className="lg:col-span-7 min-w-0">{canvasPanel}</div>
        <div className="lg:col-span-5 min-w-0">{inspectorPanel}</div>
      </div>

      <div className="lg:hidden min-w-0">
        {mobilePane === "canvas" ? canvasPanel : null}
        {mobilePane === "inspector" ? inspectorPanel : null}
      </div>

      <div
        className={cn(
          "lg:static",
          "fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 p-2 lg:border-0 lg:bg-transparent lg:p-0",
        )}
      >
        <MotionPlaybackControls
          currentTimeMs={currentTimeMs}
          durationMs={durationMs}
          fps={fps}
          playing={playing}
          loop={loop}
          playbackRate={playbackRate}
          onPlay={play}
          onPause={pause}
          onRestart={restart}
          onToggleLoop={() => setLoop((v) => !v)}
          onPlaybackRateChange={setPlaybackRate}
        />
      </div>

      <div className={cn("min-w-0", mobilePane !== "timeline" && "hidden lg:block")}>
        <MotionTimeline
          layers={graph.layers}
          durationMs={durationMs}
          fps={fps}
          currentTimeMs={currentTimeMs}
          selectedLayerId={selectedLayerId}
          selectedKeyframe={selectedKeyframe}
          pxPerSecond={pxPerSecond}
          snapEnabled={snapEnabled}
          onSnapEnabledChange={setSnapEnabled}
          onSeek={(t) => {
            if (playing) pause();
            seek(t);
          }}
          onSelectLayer={setSelectedLayerId}
          onSelectKeyframe={setSelectedKeyframe}
          onMoveKeyframe={onMoveKeyframeLive}
          onKeyframeDragEnd={onKeyframeDragEnd}
          onZoomChange={(z) => setPxPerSecond(clampTimelineZoom(z))}
        />
      </div>

      <p className="text-[11px] text-muted-foreground px-1">
        Phase 4B-D hardened editor. Requires migration 016 for persistence. Static creative remains
        immutable. BrowserRouter has no route blocker — confirm + beforeunload warn on leave.
      </p>
    </div>
  );
}
