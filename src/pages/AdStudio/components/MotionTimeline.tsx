import React, { useCallback, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";
import {
  buildRulerMarks,
  clampTimeMs,
  clampTimelineZoom,
  layerTrackSpans,
  msToPixels,
  pixelsToMs,
  snapTimeMs,
  TIMELINE_ZOOM_DEFAULT,
} from "../lib/motionTimeline";
import {
  propertyTrackRows,
  relativeToAbsolute,
  selectionId,
  type KeyframeSelection,
} from "../lib/motionKeyframeOps";
import type { AdMotionLayer } from "../lib/motionTypes";

const GUTTER_W = 140;
const TRACK_H = 36;
const PROP_H = 26;
const RULER_H = 28;

type Props = {
  layers: AdMotionLayer[];
  durationMs: number;
  fps: number;
  currentTimeMs: number;
  selectedLayerId: string | null;
  selectedKeyframe: KeyframeSelection | null;
  pxPerSecond?: number;
  snapEnabled?: boolean;
  onSnapEnabledChange?: (enabled: boolean) => void;
  onSeek: (timeMs: number) => void;
  onSelectLayer: (id: string | null) => void;
  onSelectKeyframe: (sel: KeyframeSelection | null) => void;
  onMoveKeyframe: (sel: KeyframeSelection, absoluteMs: number) => void;
  onKeyframeDragEnd?: () => void;
  onZoomChange?: (pxPerSecond: number) => void;
  className?: string;
};

export function MotionTimeline({
  layers,
  durationMs,
  fps,
  currentTimeMs,
  selectedLayerId,
  selectedKeyframe,
  pxPerSecond: pxPerSecondProp,
  snapEnabled = true,
  onSnapEnabledChange,
  onSeek,
  onSelectLayer,
  onSelectKeyframe,
  onMoveKeyframe,
  onKeyframeDragEnd,
  onZoomChange,
  className,
}: Props) {
  const [localZoom, setLocalZoom] = useState(TIMELINE_ZOOM_DEFAULT);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const pxPerSecond = clampTimelineZoom(pxPerSecondProp ?? localZoom);
  const setZoom = (next: number) => {
    const z = clampTimelineZoom(next);
    if (onZoomChange) onZoomChange(z);
    else setLocalZoom(z);
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const scrubbing = useRef(false);
  const kfDrag = useRef<{
    sel: KeyframeSelection;
    layer: AdMotionLayer;
  } | null>(null);

  const spans = useMemo(() => layerTrackSpans(layers), [layers]);
  const layerById = useMemo(() => {
    const m = new Map<string, AdMotionLayer>();
    for (const l of layers) m.set(l.id, l);
    return m;
  }, [layers]);

  const marks = useMemo(
    () => buildRulerMarks(durationMs, pxPerSecond),
    [durationMs, pxPerSecond],
  );
  const contentWidth = Math.max(msToPixels(durationMs, pxPerSecond) + 48, 320);
  const playheadX = msToPixels(clampTimeMs(currentTimeMs, durationMs), pxPerSecond);

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const el = scrollRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left + el.scrollLeft - GUTTER_W;
      const raw = pixelsToMs(Math.max(0, x), pxPerSecond);
      const snapped = snapTimeMs(raw, fps, { enabled: snapEnabled });
      onSeek(clampTimeMs(snapped, durationMs));
    },
    [durationMs, fps, onSeek, pxPerSecond, snapEnabled],
  );

  const absoluteFromClientX = useCallback(
    (clientX: number) => {
      const el = scrollRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left + el.scrollLeft - GUTTER_W;
      const raw = pixelsToMs(Math.max(0, x), pxPerSecond);
      return snapTimeMs(raw, fps, { enabled: snapEnabled });
    },
    [fps, pxPerSecond, snapEnabled],
  );

  const onPointerDownRuler = (e: React.PointerEvent) => {
    if (kfDrag.current) return;
    scrubbing.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    seekFromClientX(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (kfDrag.current) {
      const { sel } = kfDrag.current;
      const abs = absoluteFromClientX(e.clientX);
      onMoveKeyframe(sel, abs);
      return;
    }
    if (!scrubbing.current) return;
    seekFromClientX(e.clientX);
  };

  const onPointerUp = () => {
    if (kfDrag.current) {
      kfDrag.current = null;
      onKeyframeDragEnd?.();
    }
    scrubbing.current = false;
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Auto-expand selected layer
  React.useEffect(() => {
    if (selectedLayerId) {
      setExpanded((prev) => (prev[selectedLayerId] ? prev : { ...prev, [selectedLayerId]: true }));
    }
  }, [selectedLayerId]);

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-border bg-background/70 overflow-hidden",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
        <div className="text-xs font-medium text-muted-foreground">Timeline</div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            aria-label="Zoom out timeline"
            onClick={() => setZoom(pxPerSecond / 1.25)}
          >
            <ZoomOut size={14} />
          </Button>
          <span className="text-[10px] tabular-nums text-muted-foreground w-10 text-center">
            {Math.round(pxPerSecond)}
          </span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            aria-label="Zoom in timeline"
            onClick={() => setZoom(pxPerSecond * 1.25)}
          >
            <ZoomIn size={14} />
          </Button>
          <label className="ml-2 flex items-center gap-1 text-[10px] text-muted-foreground">
            <input
              type="checkbox"
              checked={snapEnabled}
              className="accent-primary"
              aria-label="Snap to frames"
              onChange={(e) => onSnapEnabledChange?.(e.target.checked)}
            />
            Snap
          </label>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="relative overflow-x-auto overflow-y-auto max-h-[220px] sm:max-h-[280px] lg:max-h-[360px] touch-pan-x overscroll-x-contain"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div style={{ width: GUTTER_W + contentWidth, minWidth: "100%" }}>
          <div
            className="sticky top-0 z-20 flex border-b border-border bg-muted/40"
            style={{ height: RULER_H }}
            onPointerDown={onPointerDownRuler}
            role="slider"
            aria-label="Timeline playhead"
            aria-valuemin={0}
            aria-valuemax={durationMs}
            aria-valuenow={Math.round(currentTimeMs)}
            tabIndex={0}
            onKeyDown={(e) => {
              const step = 1000 / Math.max(1, fps);
              if (e.key === "ArrowRight") {
                e.preventDefault();
                onSeek(clampTimeMs(currentTimeMs + step, durationMs));
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                onSeek(clampTimeMs(currentTimeMs - step, durationMs));
              } else if (e.key === "Home") {
                e.preventDefault();
                onSeek(0);
              } else if (e.key === "End") {
                e.preventDefault();
                onSeek(durationMs);
              }
            }}
          >
            <div
              className="shrink-0 border-r border-border bg-background/80 text-[10px] text-muted-foreground flex items-center px-2"
              style={{ width: GUTTER_W }}
            >
              Time
            </div>
            <div className="relative flex-1" style={{ width: contentWidth, height: RULER_H }}>
              {marks.map((m) => (
                <div
                  key={m.timeMs}
                  className="absolute top-0 bottom-0"
                  style={{ left: msToPixels(m.timeMs, pxPerSecond) }}
                >
                  <div
                    className={cn("w-px bg-border", m.major ? "h-full" : "h-2")}
                    style={m.major ? undefined : { height: 8, marginTop: RULER_H - 8 }}
                  />
                  {m.major && m.label ? (
                    <span className="absolute top-0.5 left-1 text-[9px] text-muted-foreground whitespace-nowrap">
                      {m.label}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {spans.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              No layers yet — animate a static ad to populate tracks.
            </div>
          ) : (
            spans.map((span) => {
              const layer = layerById.get(span.id);
              const selected = selectedLayerId === span.id;
              const isOpen = !!expanded[span.id];
              const left = msToPixels(span.startMs, pxPerSecond);
              const width = Math.max(4, msToPixels(span.endMs - span.startMs, pxPerSecond));
              const rows = layer ? propertyTrackRows(layer) : [];

              return (
                <div key={span.id}>
                  <div
                    className={cn(
                      "flex border-b border-border/60",
                      selected && "bg-primary/5",
                    )}
                    style={{ height: TRACK_H }}
                  >
                    <div
                      className="shrink-0 border-r border-border flex items-stretch"
                      style={{ width: GUTTER_W }}
                    >
                      <button
                        type="button"
                        className="w-7 shrink-0 flex items-center justify-center text-muted-foreground hover:bg-muted/40"
                        aria-label={isOpen ? "Collapse properties" : "Expand properties"}
                        onClick={() => toggleExpand(span.id)}
                      >
                        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                      <button
                        type="button"
                        className="min-w-0 flex-1 px-1 text-left text-[11px] truncate hover:bg-muted/40"
                        title={span.name}
                        onClick={() => {
                          onSelectLayer(span.id);
                          onSelectKeyframe(null);
                        }}
                      >
                        <span className="font-medium text-foreground block truncate">
                          {span.name}
                        </span>
                        <span className="text-[9px] text-muted-foreground uppercase">
                          {span.type}
                          {rows.length ? ` · ${rows.length} props` : ""}
                        </span>
                      </button>
                    </div>
                    <div
                      className="relative"
                      style={{ width: contentWidth, height: TRACK_H }}
                      onClick={() => {
                        onSelectLayer(span.id);
                        onSelectKeyframe(null);
                      }}
                      role="presentation"
                    >
                      <div
                        className={cn(
                          "absolute top-1.5 bottom-1.5 rounded-md border text-[9px] px-1.5 flex items-center truncate",
                          selected
                            ? "border-primary bg-primary/20 text-foreground"
                            : "border-border bg-muted/70 text-muted-foreground",
                        )}
                        style={{ left, width }}
                      >
                        {span.name}
                      </div>
                    </div>
                  </div>

                  {isOpen && layer
                    ? rows.map((row) => (
                        <div
                          key={`${span.id}-${row.property}`}
                          className="flex border-b border-border/40 bg-muted/10"
                          style={{ height: PROP_H }}
                        >
                          <div
                            className="shrink-0 border-r border-border px-2 pl-8 text-[10px] text-muted-foreground flex items-center gap-1 truncate"
                            style={{ width: GUTTER_W }}
                            title={`Easing: ${row.easing}`}
                          >
                            <span
                              className={cn(
                                "inline-block h-1.5 w-3 rounded-sm",
                                row.easing === "linear" && "bg-foreground/40",
                                row.easing === "easeIn" && "bg-sky-500/70",
                                row.easing === "easeOut" && "bg-emerald-500/70",
                                row.easing === "easeInOut" && "bg-violet-500/70",
                              )}
                              aria-hidden
                            />
                            {row.label}
                          </div>
                          <div
                            className="relative"
                            style={{ width: contentWidth, height: PROP_H }}
                          >
                            {row.keyframes.map((kf, index) => {
                              const sel: KeyframeSelection = {
                                layerId: span.id,
                                property: row.property,
                                index,
                              };
                              const abs = relativeToAbsolute(kf.timeMs, layer);
                              const isSel =
                                selectedKeyframe &&
                                selectionId(selectedKeyframe) === selectionId(sel);
                              return (
                                <button
                                  key={selectionId(sel)}
                                  type="button"
                                  className={cn(
                                    "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border z-10",
                                    isSel
                                      ? "bg-amber-400 border-foreground scale-110"
                                      : "bg-amber-500/80 border-background hover:scale-110",
                                  )}
                                  style={{ left: msToPixels(abs, pxPerSecond) }}
                                  title={`${row.label} @ ${Math.round(abs)}ms = ${kf.value}`}
                                  aria-label={`${row.label} keyframe at ${Math.round(abs)} milliseconds`}
                                  aria-pressed={!!isSel}
                                  onPointerDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                                    onSelectLayer(span.id);
                                    onSelectKeyframe(sel);
                                    kfDrag.current = { sel, layer };
                                    scrubbing.current = false;
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectLayer(span.id);
                                    onSelectKeyframe(sel);
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      ))
                    : null}
                  {isOpen && layer && !rows.length ? (
                    <div
                      className="flex border-b border-border/40 bg-muted/5 text-[10px] text-muted-foreground items-center px-3"
                      style={{ height: PROP_H }}
                    >
                      <span style={{ width: GUTTER_W }} className="pl-8">
                        No keyframes — add from inspector
                      </span>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}

          <div
            className="pointer-events-none absolute top-0 bottom-0 z-30"
            style={{ left: GUTTER_W + playheadX }}
            aria-hidden
          >
            <div className="w-px h-full bg-primary" />
            <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-sm bg-primary rotate-45" />
          </div>
        </div>
      </div>

      {selectedKeyframe ? (
        <div className="border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground font-mono">
          Selected keyframe · {selectedKeyframe.property}[{selectedKeyframe.index}]
        </div>
      ) : null}
    </div>
  );
}
