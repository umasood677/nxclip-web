import type { AdSceneGraph, AdSceneLayer } from "../types";
import { updateLayer, setCanvasBackground } from "./sceneGraph";

/** Immutable creative brand snapshot (metadata only — no signed URLs). */
export type BrandSnapshotView = {
  brandKitId?: string;
  version?: number;
  name?: string;
  description?: string | null;
  guidelines?: string | null;
  voice?: Record<string, unknown> | null;
  colors: Array<{ role?: string; hex: string; name?: string }>;
  typography: Array<{ role?: string; family: string; weight?: string }>;
  assets: Array<{
    role: string;
    label?: string | null;
    description?: string | null;
    usageGuidance?: string | null;
    status?: string;
    fileName?: string | null;
  }>;
  capturedAt?: string;
};

export function normalizeBrandSnapshot(
  raw: unknown,
): BrandSnapshotView | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  const name = typeof s.name === "string" ? s.name : undefined;
  if (!name && !s.brandKitId) return null;
  const colors = Array.isArray(s.colors)
    ? (s.colors as Array<Record<string, unknown>>)
        .filter((c) => typeof c.hex === "string")
        .map((c) => ({
          role: typeof c.role === "string" ? c.role : undefined,
          hex: String(c.hex),
          name: typeof c.name === "string" ? c.name : undefined,
        }))
    : [];
  const typography = Array.isArray(s.typography)
    ? (s.typography as Array<Record<string, unknown>>)
        .filter((t) => typeof t.family === "string")
        .map((t) => ({
          role: typeof t.role === "string" ? t.role : undefined,
          family: String(t.family),
          weight: typeof t.weight === "string" ? t.weight : undefined,
        }))
    : [];
  const assets = Array.isArray(s.assets)
    ? (s.assets as Array<Record<string, unknown>>)
        .filter((a) => typeof a.role === "string")
        .map((a) => ({
          role: String(a.role),
          label: typeof a.label === "string" ? a.label : null,
          description: typeof a.description === "string" ? a.description : null,
          usageGuidance:
            typeof a.usageGuidance === "string" ? a.usageGuidance : null,
          status: typeof a.status === "string" ? a.status : undefined,
          fileName: typeof a.fileName === "string" ? a.fileName : null,
        }))
    : [];
  return {
    brandKitId: typeof s.brandKitId === "string" ? s.brandKitId : undefined,
    version: typeof s.version === "number" ? s.version : undefined,
    name: name ?? "Brand Kit",
    description: typeof s.description === "string" ? s.description : null,
    guidelines: typeof s.guidelines === "string" ? s.guidelines : null,
    voice:
      s.voice && typeof s.voice === "object"
        ? (s.voice as Record<string, unknown>)
        : null,
    colors,
    typography,
    assets,
    capturedAt: typeof s.capturedAt === "string" ? s.capturedAt : undefined,
  };
}

export function colorByRole(
  snap: BrandSnapshotView | null,
  role: string,
): string | undefined {
  return snap?.colors.find((c) => c.role === role)?.hex;
}

export function fontByRole(
  snap: BrandSnapshotView | null,
  role: string,
): string | undefined {
  return snap?.typography.find((t) => t.role === role)?.family;
}

/** Apply a hex color to the selected layer (text color, shape fill, or canvas bg). Explicit user action only. */
export function applyBrandColorToSelection(
  graph: AdSceneGraph,
  layerId: string | null,
  hex: string,
  target: "fill" | "text" | "canvas" = "fill",
): AdSceneGraph {
  if (target === "canvas" || !layerId) {
    return setCanvasBackground(graph, hex);
  }
  const layer = graph.layers.find((l) => l.id === layerId);
  if (!layer || layer.locked) return graph;
  if (layer.type === "text") {
    return updateLayer(graph, layerId, { color: hex } as Partial<AdSceneLayer>);
  }
  if (layer.type === "shape") {
    return updateLayer(graph, layerId, { fill: hex } as Partial<AdSceneLayer>);
  }
  return graph;
}

/** Apply a brand font family to a selected text layer. Explicit user action only. */
export function applyBrandFontToSelection(
  graph: AdSceneGraph,
  layerId: string | null,
  family: string,
): AdSceneGraph {
  if (!layerId) return graph;
  const layer = graph.layers.find((l) => l.id === layerId);
  if (!layer || layer.locked || layer.type !== "text") return graph;
  return updateLayer(graph, layerId, {
    fontFamily: family,
    fontId: family.toLowerCase().includes("inter") ? "inter" : "montserrat",
  } as Partial<AdSceneLayer>);
}

export function assetsByRolePrefix(
  snap: BrandSnapshotView | null,
  prefix: string,
) {
  return (snap?.assets ?? []).filter((a) =>
    a.role.toLowerCase().startsWith(prefix.toLowerCase()),
  );
}
