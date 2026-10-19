import React, { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../../lib/utils";
import {
  resolveLayerAssetUrl,
  type BrandAssetUrlMap,
} from "../canvas/brandAssetUrls";
import { resolveAdFontFamily } from "../lib/adFonts";
import { inspectLayerAsset, missingAssetMessage } from "../lib/motionAssets";
import { sortLayers } from "../lib/sceneGraph";
import type { AdSceneGraph, AdSceneLayer } from "../types";

export type AdCanvasMotionPreview = Record<
  string,
  {
    x: number;
    y: number;
    opacity: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
    hidden?: boolean;
  }
>;

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
  /**
   * Optional per-layer motion overrides (Phase 4B-C live preview).
   * When unset, static scene graph 1.0 rendering is unchanged.
   */
  motionPreview?: AdCanvasMotionPreview | null;
  /** Disable drag/resize while scrubbing/playing motion. */
  interactionLocked?: boolean;
  /** assetId → temporary Brand Kit readUrl (never storageKey). */
  assetUrls?: BrandAssetUrlMap;
  /** storageKey → readUrl for legacy layers (key never used as img src). */
  storageKeyUrls?: BrandAssetUrlMap;
  onAssetLoadError?: (assetId: string) => void;
  /** Show dashed safe-area guide (default true). */
  showSafeArea?: boolean;
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
  motionPreview = null,
  interactionLocked = false,
  assetUrls,
  storageKeyUrls,
  onAssetLoadError,
  showSafeArea = true,
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
    if (interactionLocked || layer.locked || layer.visible === false) return;
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
          {showSafeArea ? (
            <div
              className="pointer-events-none absolute inset-[5%] border border-dashed border-white/25 z-[100]"
              aria-hidden
            />
          ) : null}
          {layers.map((layer) => {
            const motion = motionPreview?.[layer.id];
            if (layer.visible === false && !motion) return null;
            if (motion?.hidden) return null;
            const selected = layer.id === selectedLayerId;
            const x = motion?.x ?? layer.x;
            const y = motion?.y ?? layer.y;
            const opacity = motion?.opacity ?? layer.opacity ?? 1;
            const rotation = motion?.rotation ?? layer.rotation ?? 0;
            const scaleX = motion?.scaleX ?? 1;
            const scaleY = motion?.scaleY ?? 1;
            const transformParts = [
              scaleX !== 1 || scaleY !== 1 ? `scale(${scaleX}, ${scaleY})` : null,
              rotation ? `rotate(${rotation}deg)` : null,
            ].filter(Boolean);
            return (
              <div
                key={layer.id}
                className={cn(
                  "absolute select-none",
                  interactionLocked || layer.locked ? "cursor-default" : "cursor-move",
                  selected && "ring-2 ring-primary ring-offset-1 ring-offset-transparent",
                )}
                style={{
                  left: x,
                  top: y,
                  width: layer.width,
                  height: layer.height,
                  zIndex: layer.zIndex,
                  opacity,
                  transform: transformParts.length ? transformParts.join(" ") : undefined,
                  transformOrigin: "top left",
                }}
                onPointerDown={(e) => onPointerDown(e, layer)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectLayer(layer.id);
                }}
              >
                <LayerVisual
                  layer={layer}
                  assetUrls={assetUrls}
                  storageKeyUrls={storageKeyUrls}
                  onAssetLoadError={onAssetLoadError}
                />
                {selected && !layer.locked && !interactionLocked && onResizeLayer && (
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

function LayerVisual({
  layer,
  assetUrls,
  storageKeyUrls,
  onAssetLoadError,
}: {
  layer: AdSceneLayer;
  assetUrls?: BrandAssetUrlMap;
  storageKeyUrls?: BrandAssetUrlMap;
  onAssetLoadError?: (assetId: string) => void;
}) {
  const [failed, setFailed] = useState(false);
  const imgLayer =
    layer.type === "image" || layer.type === "logo"
      ? (layer as Extract<AdSceneLayer, { type: "image" | "logo" }>)
      : null;
  const resolvedUrl = imgLayer
    ? resolveLayerAssetUrl(assetUrls, storageKeyUrls, imgLayer)
    : null;

  useEffect(() => {
    setFailed(false);
  }, [imgLayer?.assetId, imgLayer?.storageKey, resolvedUrl]);

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
    const img = imgLayer!;
    const presence = inspectLayerAsset(img);
    const url = resolvedUrl;

    if (presence.missing && !url) {
      return (
        <div
          className="w-full h-full bg-muted/80 border border-dashed border-amber-500/70 flex flex-col items-center justify-center gap-1 px-2 text-center"
          role="img"
          aria-label={missingAssetMessage(img)}
          title={missingAssetMessage(img)}
        >
          <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">
            Missing {presence.kind}
          </span>
          <span className="text-[9px] text-muted-foreground leading-tight">
            Re-link from Brand Kit — no substitute image
          </span>
        </div>
      );
    }

    if (!url || failed) {
      return (
        <div
          className="w-full h-full bg-muted/90 border border-dashed border-amber-500/50 flex flex-col items-center justify-center gap-1 px-2 text-center"
          role="img"
          aria-label={
            img.assetId
              ? `${presence.label} unavailable`
              : `${presence.label} (no browser URL)`
          }
        >
          <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">
            {img.assetId ? "Image unavailable" : presence.label}
          </span>
          <span className="text-[9px] text-muted-foreground leading-tight">
            {img.assetId
              ? "Refresh Brand Kit link"
              : "Authorized preview requires assetId"}
          </span>
        </div>
      );
    }

    return (
      <img
        src={url}
        alt=""
        className="w-full h-full pointer-events-none"
        style={{
          objectFit: img.objectFit ?? (layer.type === "logo" ? "contain" : "cover"),
        }}
        draggable={false}
        onError={() => {
          setFailed(true);
          if (img.assetId) onAssetLoadError?.(img.assetId);
        }}
      />
    );
  }
  return <div className="w-full h-full border border-dashed border-white/20" />;
}
