/**
 * Asset reference helpers for animated / static Ad Canvas (Phase 4B-D).
 * Never invent replacement imagery for missing product/logo assets.
 */

import type { AdSceneLayer } from "../types";
import type { AdMotionLayer } from "./motionTypes";

export type AssetPresence = {
  kind: "text" | "shape" | "group" | "image" | "logo";
  hasStorageKey: boolean;
  hasAssetId: boolean;
  /** True when an image/logo layer has neither storageKey nor assetId. */
  missing: boolean;
  label: string;
};

export function inspectLayerAsset(
  layer: AdSceneLayer | AdMotionLayer,
): AssetPresence {
  const kind = layer.type as AssetPresence["kind"];
  if (kind !== "image" && kind !== "logo") {
    return {
      kind,
      hasStorageKey: false,
      hasAssetId: false,
      missing: false,
      label: layer.name || kind,
    };
  }
  const storageKey =
    "storageKey" in layer && typeof layer.storageKey === "string"
      ? layer.storageKey.trim()
      : "";
  const assetId =
    "assetId" in layer && typeof layer.assetId === "string"
      ? layer.assetId.trim()
      : "";
  const missing = !storageKey && !assetId;
  return {
    kind,
    hasStorageKey: Boolean(storageKey),
    hasAssetId: Boolean(assetId),
    missing,
    label: layer.name || (kind === "logo" ? "Logo" : "Image"),
  };
}

export function countMissingAssets(
  layers: Array<AdSceneLayer | AdMotionLayer>,
): number {
  return layers.reduce((n, layer) => n + (inspectLayerAsset(layer).missing ? 1 : 0), 0);
}

/** Placeholder copy — never a substitute product photo. */
export function missingAssetMessage(layer: AdSceneLayer | AdMotionLayer): string {
  const info = inspectLayerAsset(layer);
  if (!info.missing) return "";
  if (info.kind === "logo") return "Logo missing — re-upload in Brand Kit";
  return "Image missing — re-link Brand Kit asset";
}
