import type { AdSceneGraph, AdSceneLayer } from "../types";

/**
 * Strip private storageKey from every layer before client render / logging.
 * Server graphs may include storageKey; the browser must never display or fetch it.
 */
export function sanitizeSceneGraphForClient(
  graph: AdSceneGraph | null | undefined,
): AdSceneGraph | null {
  if (!graph?.canvas || !Array.isArray(graph.layers)) return null;
  return {
    schemaVersion: graph.schemaVersion || "1.0",
    canvas: { ...graph.canvas },
    layers: graph.layers.map(stripLayerSecrets),
    ...(typeof (graph as { templateId?: string }).templateId === "string"
      ? { templateId: (graph as { templateId?: string }).templateId }
      : {}),
    ...(typeof (graph as { layoutFamily?: string }).layoutFamily === "string"
      ? { layoutFamily: (graph as { layoutFamily?: string }).layoutFamily }
      : {}),
  } as AdSceneGraph;
}

function stripLayerSecrets(layer: AdSceneLayer): AdSceneLayer {
  if (layer.type !== "image" && layer.type !== "logo") {
    return { ...layer };
  }
  const { storageKey: _drop, ...rest } = layer as AdSceneLayer & {
    storageKey?: string;
  };
  return rest as AdSceneLayer;
}

/** True if any layer still carries a storageKey (should never reach DOM). */
export function sceneGraphLeaksStorageKey(
  graph: AdSceneGraph | null | undefined,
): boolean {
  if (!graph?.layers) return false;
  return graph.layers.some(
    (l) =>
      (l.type === "image" || l.type === "logo") &&
      typeof (l as { storageKey?: string }).storageKey === "string" &&
      Boolean((l as { storageKey?: string }).storageKey?.trim()),
  );
}
