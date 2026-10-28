import React, { useMemo } from "react";
import { cn } from "../../../lib/utils";
import {
  resolveLayerAssetUrl,
  type BrandAssetUrlMap,
} from "../canvas/brandAssetUrls";
import { resolveAdFontFamily } from "../lib/adFonts";
import { sortLayers } from "../lib/sceneGraph";
import type { AdSceneGraph } from "../types";

type Props = {
  graph: AdSceneGraph | null | undefined;
  className?: string;
  maxWidth?: number;
  maxHeight?: number;
  label?: string;
  /** When provided, image/logo layers use Brand Kit readUrls instead of slate tiles. */
  assetUrls?: BrandAssetUrlMap;
  storageKeyUrls?: BrandAssetUrlMap;
};

/** Lightweight CSS thumbnail of a scene graph for variation galleries. Not export-parity. */
export function SceneThumb({
  graph,
  className,
  maxWidth = 120,
  maxHeight = 150,
  label,
  assetUrls,
  storageKeyUrls,
}: Props) {
  const dims = graph?.canvas;
  const scale = useMemo(() => {
    if (!dims?.width || !dims?.height) return 0.1;
    return Math.min(maxWidth / dims.width, maxHeight / dims.height);
  }, [dims?.height, dims?.width, maxHeight, maxWidth]);

  if (!graph || !dims) {
    return (
      <div
        className={cn(
          "rounded-md border border-dashed border-border bg-muted/40 flex items-center justify-center text-[10px] text-muted-foreground",
          className,
        )}
        style={{ width: maxWidth, height: maxHeight }}
      >
        No preview
      </div>
    );
  }

  const w = Math.round(dims.width * scale);
  const h = Math.round(dims.height * scale);
  const layers = sortLayers(graph.layers).filter((l) => l.visible !== false);

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div
        className="relative overflow-hidden rounded-md border border-border shadow-soft"
        style={{ width: w, height: h }}
        aria-label={label ?? "Scene thumbnail"}
      >
        <div
          className="absolute origin-top-left"
          style={{
            width: dims.width,
            height: dims.height,
            transform: `scale(${scale})`,
            backgroundColor: dims.backgroundColor || "#111827",
          }}
        >
          {layers.slice(0, 12).map((layer) => {
            if (layer.type === "text") {
              const t = layer as Extract<typeof layer, { type: "text" }>;
              return (
                <div
                  key={layer.id}
                  className="absolute overflow-hidden"
                  style={{
                    left: layer.x,
                    top: layer.y,
                    width: layer.width,
                    height: layer.height,
                    fontFamily: resolveAdFontFamily(t.fontId || t.fontFamily),
                    fontSize: t.fontSize ?? 48,
                    fontWeight: t.fontWeight ?? 700,
                    color: t.color ?? "#fff",
                    textAlign: t.align ?? "left",
                    opacity: layer.opacity ?? 1,
                    lineHeight: 1.1,
                  }}
                >
                  {t.text}
                </div>
              );
            }
            if (layer.type === "shape") {
              const s = layer as Extract<typeof layer, { type: "shape" }>;
              return (
                <div
                  key={layer.id}
                  className="absolute flex items-center justify-center text-white font-semibold"
                  style={{
                    left: layer.x,
                    top: layer.y,
                    width: layer.width,
                    height: layer.height,
                    background: s.fill ?? "#2563EB",
                    borderRadius:
                      s.shape === "ellipse"
                        ? "50%"
                        : s.shape === "roundedRectangle"
                          ? s.cornerRadius ?? 16
                          : 0,
                    fontSize: s.fontSize ?? 28,
                    opacity: layer.opacity ?? 1,
                  }}
                >
                  {s.text}
                </div>
              );
            }
            if (layer.type === "image" || layer.type === "logo") {
              const url = resolveLayerAssetUrl(
                assetUrls,
                storageKeyUrls,
                layer as { assetId?: string; storageKey?: string },
              );
              if (url) {
                return (
                  <img
                    key={layer.id}
                    src={url}
                    alt=""
                    className="absolute object-cover"
                    style={{
                      left: layer.x,
                      top: layer.y,
                      width: layer.width,
                      height: layer.height,
                      opacity: layer.opacity ?? 1,
                      objectFit:
                        (layer as { objectFit?: string }).objectFit === "contain"
                          ? "contain"
                          : "cover",
                    }}
                    draggable={false}
                  />
                );
              }
            }
            return (
              <div
                key={layer.id}
                className="absolute bg-slate-700/80"
                style={{
                  left: layer.x,
                  top: layer.y,
                  width: layer.width,
                  height: layer.height,
                  opacity: layer.opacity ?? 1,
                }}
              />
            );
          })}
        </div>
      </div>
      {label ? (
        <span className="text-[10px] text-muted-foreground truncate">{label}</span>
      ) : null}
    </div>
  );
}
