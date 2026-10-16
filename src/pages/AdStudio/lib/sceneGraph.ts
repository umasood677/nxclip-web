import type { AdSceneGraph, AdSceneLayer } from "../types";

export function sortLayers(layers: AdSceneLayer[]): AdSceneLayer[] {
  return [...layers].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
}

export function updateLayer(
  graph: AdSceneGraph,
  layerId: string,
  patch: Partial<AdSceneLayer>,
): AdSceneGraph {
  return {
    ...graph,
    layers: graph.layers.map((l) =>
      l.id === layerId ? ({ ...l, ...patch, id: l.id, type: l.type } as AdSceneLayer) : l,
    ),
  };
}

export function reorderLayer(
  graph: AdSceneGraph,
  layerId: string,
  direction: "up" | "down",
): AdSceneGraph {
  const sorted = sortLayers(graph.layers);
  const idx = sorted.findIndex((l) => l.id === layerId);
  if (idx < 0) return graph;
  const swapWith = direction === "up" ? idx + 1 : idx - 1;
  if (swapWith < 0 || swapWith >= sorted.length) return graph;
  const a = sorted[idx]!;
  const b = sorted[swapWith]!;
  const zA = a.zIndex;
  const zB = b.zIndex;
  return {
    ...graph,
    layers: graph.layers.map((l) => {
      if (l.id === a.id) return { ...l, zIndex: zB };
      if (l.id === b.id) return { ...l, zIndex: zA };
      return l;
    }),
  };
}

export function duplicateLayer(graph: AdSceneGraph, layerId: string): AdSceneGraph {
  const layer = graph.layers.find((l) => l.id === layerId);
  if (!layer) return graph;
  const maxZ = Math.max(0, ...graph.layers.map((l) => l.zIndex ?? 0));
  const copy: AdSceneLayer = {
    ...layer,
    id: `${layer.id}-copy-${Math.random().toString(36).slice(2, 8)}`,
    name: `${layer.name ?? layer.type} copy`,
    x: layer.x + 24,
    y: layer.y + 24,
    zIndex: maxZ + 1,
  };
  return { ...graph, layers: [...graph.layers, copy] };
}

export function deleteLayer(graph: AdSceneGraph, layerId: string): AdSceneGraph {
  return { ...graph, layers: graph.layers.filter((l) => l.id !== layerId) };
}

export type AlignMode =
  | "left"
  | "center"
  | "right"
  | "top"
  | "middle"
  | "bottom";

/** Align a single layer to the canvas edges/center. Locked layers are unchanged. */
export function alignLayer(
  graph: AdSceneGraph,
  layerId: string,
  mode: AlignMode,
): AdSceneGraph {
  const layer = graph.layers.find((l) => l.id === layerId);
  if (!layer || layer.locked) return graph;
  const { width: cw, height: ch } = graph.canvas;
  let x = layer.x;
  let y = layer.y;
  switch (mode) {
    case "left":
      x = 0;
      break;
    case "center":
      x = Math.round((cw - layer.width) / 2);
      break;
    case "right":
      x = Math.round(cw - layer.width);
      break;
    case "top":
      y = 0;
      break;
    case "middle":
      y = Math.round((ch - layer.height) / 2);
      break;
    case "bottom":
      y = Math.round(ch - layer.height);
      break;
  }
  return updateLayer(graph, layerId, { x, y });
}

/** Set canvas background color (editable background). */
export function setCanvasBackground(
  graph: AdSceneGraph,
  backgroundColor: string,
): AdSceneGraph {
  return {
    ...graph,
    canvas: { ...graph.canvas, backgroundColor },
  };
}

/** Adapt canvas size by proportional layout (no stretch/crop of layer content boxes). */
export function adaptCanvasFormat(
  graph: AdSceneGraph,
  width: number,
  height: number,
): AdSceneGraph {
  const prevW = graph.canvas.width || 1;
  const prevH = graph.canvas.height || 1;
  if (prevW === width && prevH === height) return graph;
  const sx = width / prevW;
  const sy = height / prevH;
  return {
    ...graph,
    canvas: { ...graph.canvas, width, height },
    layers: graph.layers.map((l) => ({
      ...l,
      x: Math.round(l.x * sx),
      y: Math.round(l.y * sy),
      width: Math.round(l.width * sx),
      height: Math.round(l.height * sy),
      ...(l.type === "text"
        ? {
            fontSize: Math.max(
              8,
              Math.round(((l as { fontSize?: number }).fontSize ?? 48) * Math.min(sx, sy)),
            ),
          }
        : {}),
    })),
  };
}
