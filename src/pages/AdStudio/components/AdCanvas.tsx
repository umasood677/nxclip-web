import React, { useMemo, useRef, useState } from "react";
import { cn } from "../../../lib/utils";
import { resolveAdFontFamily } from "../lib/adFonts";
import { sortLayers } from "../lib/sceneGraph";
import type { AdSceneGraph, AdSceneLayer } from "../types";

interface AdCanvasProps {
  graph: AdSceneGraph;
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onMoveLayer: (id: string, x: number, y: number) => void;
  onResizeLayer?: (id: string, width: number, height: number) => void;
  /** Fired once when a drag/resize gesture ends — use to commit undo history. */
  onTransformEnd?: () => void;
  zoom: number;
  className?: string;
}

export function AdCanvas({
  graph,
  selectedLayerId,
  onSelectLayer,
  onMoveLayer,
  onResizeLayer,
  onTransformEnd,
  zoom,
  className,
}: AdCanvasProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const [resize, setResize] = useState<{
    id: string;
    startX: number;
    startY: number;
    origW: number;
    origH: number;
  } | null>(null);

  const layers = useMemo(() => sortLayers(graph.layers), [graph.layers]);
  const { width, height, backgroundColor } = graph.canvas;

  const onPointerDown = (e: React.PointerEvent, layer: AdSceneLayer) => {
    if (layer.locked || layer.visible === false) return;
    e.stopPropagation();
    onSelectLayer(layer.id);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDrag({
      id: layer.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: layer.x,
      origY: layer.y,
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const scale = zoom || 1;
    if (resize && onResizeLayer) {
      const dx = (e.clientX - resize.startX) / scale;
      const dy = (e.clientY - resize.startY) / scale;
      onResizeLayer(
        resize.id,
        Math.max(24, Math.round(resize.origW + dx)),
        Math.max(24, Math.round(resize.origH + dy)),
      );
      return;
    }
    if (!drag) return;
    const dx = (e.clientX - drag.startX) / scale;
    const dy = (e.clientY - drag.startY) / scale;
    onMoveLayer(
      drag.id,
      Math.round(drag.origX + dx),
      Math.round(drag.origY + dy),
    );
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (drag || resize) {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      setDrag(null);
      setResize(null);
      onTransformEnd?.();
    }
  };

  return (
    <div
      className={cn(
        "flex-1 flex items-center justify-center overflow-auto bg-muted/30 rounded-xl border border-border p-6",
        className,
      )}
      onClick={() => onSelectLayer(null)}
    >
      <div
        ref={stageRef}
        className="relative shadow-soft-xl bg-background"
        style={{
          width: width * zoom,
          height: height * zoom,
        }}
      >
        <div
          className="absolute origin-top-left"
          style={{
            width,
            height,
            transform: `scale(${zoom})`,
            backgroundColor: backgroundColor || "#111827",
          }}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {/* Safe-area guide */}
          <div
            className="pointer-events-none absolute inset-[5%] border border-dashed border-white/25 z-[100]"
            aria-hidden
          />
          {layers.map((layer) => {
            if (layer.visible === false) return null;
            const selected = layer.id === selectedLayerId;
            return (
              <div
                key={layer.id}
                className={cn(
                  "absolute select-none",
                  layer.locked ? "cursor-default" : "cursor-move",
                  selected && "ring-2 ring-primary ring-offset-1 ring-offset-transparent",
                )}
                style={{
                  left: layer.x,
                  top: layer.y,
                  width: layer.width,
                  height: layer.height,
                  zIndex: layer.zIndex,
                  opacity: layer.opacity ?? 1,
                  transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
                }}
                onPointerDown={(e) => onPointerDown(e, layer)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectLayer(layer.id);
                }}
              >
                <LayerVisual layer={layer} />
                {selected && !layer.locked && onResizeLayer && (
                  <div
                    className="absolute -right-1.5 -bottom-1.5 h-3.5 w-3.5 rounded-sm bg-primary border border-background cursor-se-resize z-[1]"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                      setResize({
                        id: layer.id,
                        startX: e.clientX,
                        startY: e.clientY,
                        origW: layer.width,
                        origH: layer.height,
                      });
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LayerVisual({ layer }: { layer: AdSceneLayer }) {
  if (layer.type === "text") {
    const t = layer as Extract<AdSceneLayer, { type: "text" }>;
    return (
      <div
        className="w-full h-full overflow-hidden"
        style={{
          fontFamily: resolveAdFontFamily(t.fontId || t.fontFamily),
          fontSize: t.fontSize ?? 48,
          fontWeight: t.fontWeight ?? 700,
          color: t.color ?? "#fff",
          textAlign: t.align ?? "left",
          lineHeight: t.lineHeight ?? 1.15,
          letterSpacing: t.letterSpacing,
          textTransform: t.uppercase ? "uppercase" : undefined,
          WebkitTextStroke: t.strokeWidth
            ? `${t.strokeWidth}px ${t.strokeColor ?? "#000"}`
            : undefined,
          textShadow: t.shadow
            ? `${t.shadow.offsetX}px ${t.shadow.offsetY}px ${t.shadow.blur}px ${t.shadow.color}`
            : undefined,
        }}
      >
        {t.text}
      </div>
    );
  }
  if (layer.type === "shape") {
    const s = layer as Extract<AdSceneLayer, { type: "shape" }>;
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{
          background: s.fill ?? "#2563EB",
          borderRadius:
            s.shape === "roundedRectangle"
              ? s.cornerRadius ?? 16
              : s.shape === "ellipse"
                ? "50%"
                : 0,
          color: s.textColor ?? "#fff",
          fontFamily: resolveAdFontFamily(s.fontFamily),
          fontSize: s.fontSize ?? 28,
          fontWeight: 700,
        }}
      >
        {s.text}
      </div>
    );
  }
  if (layer.type === "image" || layer.type === "logo") {
    const img = layer as Extract<AdSceneLayer, { type: "image" | "logo" }>;
    if (img.storageKey) {
      return (
        <div
          className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground"
          title={img.storageKey}
        >
          Asset
        </div>
      );
    }
    return <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-950" />;
  }
  return <div className="w-full h-full border border-dashed border-white/20" />;
}
