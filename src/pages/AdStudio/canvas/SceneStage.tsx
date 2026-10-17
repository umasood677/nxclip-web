import React, { useMemo, useState } from "react";
import { cn } from "../../../lib/utils";
import { resolveAdFontFamily } from "../lib/adFonts";
import { sortLayers } from "../lib/sceneGraph";
import type { AdSceneGraph, AdSceneLayer } from "../types";
import {
  resolveAssetUrl,
  type BrandAssetUrlMap,
} from "./brandAssetUrls";
import {
  sanitizeSceneGraphForClient,
  sceneGraphLeaksStorageKey,
} from "./sanitizeSceneGraph";

export type SceneStageSize = "compact" | "card" | "hero";

const SIZE_BUDGET: Record<SceneStageSize, { maxW: number; maxH: number }> = {
  compact: { maxW: 160, maxH: 200 },
  card: { maxW: 220, maxH: 280 },
  hero: { maxW: 340, maxH: 460 },
};

type Props = {
  graph: AdSceneGraph | null | undefined;
  /** assetId → temporary authenticated read URL (never storageKey). */
  assetUrls?: BrandAssetUrlMap;
  size?: SceneStageSize;
  /** Override responsive budget (px). */
  maxWidth?: number;
  maxHeight?: number;
  className?: string;
  label?: string;
  /** Show dashed safe-area guide (hero preview). */
  showSafeArea?: boolean;
  /** Called when an image fails (expired URL) — parent may refresh Brand Kit. */
  onAssetLoadError?: (assetId: string) => void;
  /** Blocked / incomplete overlay message. */
  blockedMessage?: string | null;
};

/**
 * Reusable read-only AdSceneGraph 1.0 renderer (UX-2A.2 M3).
 * Shared by gallery cards and live preview. No editor interactions.
 */
export function SceneStage({
  graph: rawGraph,
  assetUrls,
  size = "card",
  maxWidth,
  maxHeight,
  className,
  label,
  showSafeArea = false,
  onAssetLoadError,
  blockedMessage,
}: Props) {
  const graph = useMemo(
    () => sanitizeSceneGraphForClient(rawGraph ?? null),
    [rawGraph],
  );

  const budget = SIZE_BUDGET[size];
  const maxW = maxWidth ?? budget.maxW;
  const maxH = maxHeight ?? budget.maxH;

  const scale = useMemo(() => {
    if (!graph?.canvas?.width || !graph.canvas.height) return 0.1;
    return Math.min(maxW / graph.canvas.width, maxH / graph.canvas.height);
  }, [graph, maxW, maxH]);

  if (blockedMessage) {
    return (
      <BlockedFrame
        className={className}
        width={maxW}
        height={Math.round(maxH * 0.85)}
        message={blockedMessage}
        label={label}
      />
    );
  }

  if (!graph) {
    return (
      <BlockedFrame
        className={className}
        width={maxW}
        height={Math.round(maxH * 0.85)}
        message="Composition unavailable"
        label={label}
      />
    );
  }

  if (import.meta.env?.DEV && sceneGraphLeaksStorageKey(graph)) {
    // eslint-disable-next-line no-console
    console.warn("[SceneStage] storageKey leaked into client graph — stripped");
  }

  const { width, height, backgroundColor } = graph.canvas;
  const displayW = Math.round(width * scale);
  const displayH = Math.round(height * scale);
  const layers = sortLayers(graph.layers).filter((l) => l.visible !== false);

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div
        className="relative overflow-hidden rounded-xl border border-border shadow-soft bg-muted"
        style={{ width: displayW, height: displayH }}
        role="img"
        aria-label={label ?? "Ad scene preview"}
        data-scene-stage
        data-canvas-w={width}
        data-canvas-h={height}
      >
        <div
          className="absolute origin-top-left"
          style={{
            width,
            height,
            transform: `scale(${scale})`,
            backgroundColor: backgroundColor || "#111827",
          }}
        >
          {showSafeArea ? (
            <div
              className="pointer-events-none absolute inset-[5%] border border-dashed border-white/25 z-[100]"
              aria-hidden
            />
          ) : null}
          {layers.map((layer) => (
            <div
              key={layer.id}
              className="absolute overflow-hidden"
              style={{
                left: layer.x,
                top: layer.y,
                width: layer.width,
                height: layer.height,
                zIndex: layer.zIndex,
                opacity: layer.opacity ?? 1,
                transform: layer.rotation
                  ? `rotate(${layer.rotation}deg)`
                  : undefined,
                transformOrigin: "top left",
              }}
              data-layer-id={layer.id}
              data-layer-type={layer.type}
            >
              <StageLayerVisual
                layer={layer}
                assetUrls={assetUrls}
                onAssetLoadError={onAssetLoadError}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BlockedFrame({
  width,
  height,
  message,
  label,
  className,
}: {
  width: number;
  height: number;
  message: string;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-dashed border-amber-500/60 bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950/40 flex flex-col items-center justify-center gap-2 px-4 text-center",
        className,
      )}
      style={{ width, height }}
      role="img"
      aria-label={label ? `${label}: ${message}` : message}
      data-scene-stage="blocked"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-300/90">
        Incomplete template
      </span>
      <span className="text-xs text-slate-100/90 leading-snug max-w-[16rem]">
        {message}
      </span>
      <span className="text-[9px] text-slate-400">
        Add Brand Kit assets — no stock substitutes
      </span>
    </div>
  );
}

function StageLayerVisual({
  layer,
  assetUrls,
  onAssetLoadError,
}: {
  layer: AdSceneLayer;
  assetUrls?: BrandAssetUrlMap;
  onAssetLoadError?: (assetId: string) => void;
}) {
  const [failed, setFailed] = useState(false);

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
        className="w-full h-full flex items-center justify-center overflow-hidden px-1"
        style={{
          background: s.fill ?? "#2563EB",
          borderRadius:
            s.shape === "roundedRectangle"
              ? s.cornerRadius ?? 16
              : s.shape === "ellipse"
                ? "50%"
                : 0,
          border:
            s.strokeWidth && s.strokeColor
              ? `${s.strokeWidth}px solid ${s.strokeColor}`
              : undefined,
          color: s.textColor ?? "#fff",
          fontFamily: resolveAdFontFamily(s.fontFamily),
          fontSize: s.fontSize ?? 28,
          fontWeight: 700,
          textAlign: "center",
          lineHeight: 1.15,
        }}
      >
        {s.text}
      </div>
    );
  }

  if (layer.type === "image" || layer.type === "logo") {
    const img = layer as Extract<AdSceneLayer, { type: "image" | "logo" }>;
    // Never read storageKey — only assetId → authorized URL map.
    const url = resolveAssetUrl(assetUrls, img.assetId);

    if (!img.assetId || !url || failed) {
      return (
        <div
          className="w-full h-full bg-muted/90 border border-dashed border-amber-500/60 flex flex-col items-center justify-center gap-1 px-2 text-center"
          role="img"
          aria-label={
            img.assetId
              ? `${img.name ?? layer.type} failed to load`
              : `Missing ${layer.type} asset`
          }
        >
          <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">
            {img.assetId ? "Image unavailable" : `Missing ${layer.type}`}
          </span>
          <span className="text-[9px] text-muted-foreground leading-tight">
            {img.assetId
              ? "Refresh Brand Kit link"
              : "Link from Brand Kit — no substitute"}
          </span>
        </div>
      );
    }

    return (
      <img
        src={url}
        alt=""
        className="w-full h-full"
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
