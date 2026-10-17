/**
 * Immutable motion-graph keyframe operations (Phase 4B-B).
 * Compatible with content-service AdMotionSceneGraph 2.0 validation.
 *
 * Duplicate timestamp rule: if two keyframes share the same timeMs after an
 * edit/move, keep a single keyframe at that time using the **incoming** value
 * (the moved or newly written value), then re-sort ascending by timeMs.
 */

import type {
  AdAnimatableProperty,
  AdLayerAnimation,
  AdMotionEasing,
  AdMotionKeyframe,
  AdMotionLayer,
  AdMotionSceneGraph,
} from "./motionTypes";

export const EDITOR_ANIMATABLE: readonly AdAnimatableProperty[] = [
  "x",
  "y",
  "scaleX",
  "scaleY",
  "rotation",
  "opacity",
] as const;

/** Creator-facing properties. Scale is linked scaleX+scaleY. */
export type EditorPropertyId =
  | "x"
  | "y"
  | "scale"
  | "rotation"
  | "opacity";

export const EDITOR_PROPERTIES: readonly EditorPropertyId[] = [
  "x",
  "y",
  "scale",
  "rotation",
  "opacity",
] as const;

export const PROPERTY_LABELS: Record<EditorPropertyId, string> = {
  x: "Position X",
  y: "Position Y",
  scale: "Scale",
  rotation: "Rotation",
  opacity: "Opacity",
};

export const EASING_OPTIONS: Array<{ id: AdMotionEasing; label: string }> = [
  { id: "linear", label: "Linear" },
  { id: "easeIn", label: "Ease In" },
  { id: "easeOut", label: "Ease Out" },
  { id: "easeInOut", label: "Ease In Out" },
];

export const MAX_KEYFRAMES_PER_ANIMATION = 40;
export const MAX_ANIMATIONS_PER_LAYER = 20;
export const SCALE_MIN = 0.01;
export const SCALE_MAX = 8;
export const OPACITY_MIN = 0;
export const OPACITY_MAX = 1;

/** Stable selection for a keyframe within a property track. */
export type KeyframeSelection = {
  layerId: string;
  /** Canonical graph property (scale uses scaleX as primary). */
  property: AdAnimatableProperty;
  /** Index within that property's keyframes array (sorted). */
  index: number;
};

export type MotionEditError = { ok: false; message: string };
export type MotionEditOk = { ok: true; graph: AdMotionSceneGraph; selection?: KeyframeSelection | null };
export type MotionEditResult = MotionEditOk | MotionEditError;

function cloneGraph(graph: AdMotionSceneGraph): AdMotionSceneGraph {
  return structuredClone(graph);
}

function layerSpanMs(layer: AdMotionLayer): number {
  return Math.max(0, layer.endMs - layer.startMs);
}

function sortKeyframes(keyframes: AdMotionKeyframe[]): AdMotionKeyframe[] {
  return [...keyframes].sort((a, b) => a.timeMs - b.timeMs || a.value - b.value);
}

/**
 * Coalesce duplicate times: keep the last occurrence's value (incoming wins
 * when we append the new keyframe after filtering others at that time).
 */
export function coalesceKeyframes(keyframes: AdMotionKeyframe[]): AdMotionKeyframe[] {
  const byTime = new Map<number, number>();
  for (const kf of keyframes) {
    byTime.set(kf.timeMs, kf.value);
  }
  return sortKeyframes(
    [...byTime.entries()].map(([timeMs, value]) => ({ timeMs, value })),
  );
}

export function validateKeyframeValue(
  property: AdAnimatableProperty,
  value: number,
): string | null {
  if (!Number.isFinite(value)) return "Value must be a finite number";
  if (property === "opacity") {
    if (value < OPACITY_MIN || value > OPACITY_MAX) {
      return "Opacity must be between 0 and 1";
    }
  }
  if (property === "scaleX" || property === "scaleY") {
    if (value < SCALE_MIN || value > SCALE_MAX) {
      return `Scale must be between ${SCALE_MIN} and ${SCALE_MAX}`;
    }
  }
  if (property === "visibility" && value !== 0 && value !== 1) {
    return "Visibility must be 0 or 1";
  }
  return null;
}

export function clampKeyframeTime(timeMs: number, layer: AdMotionLayer): number {
  const max = layerSpanMs(layer);
  if (!Number.isFinite(timeMs) || timeMs < 0) return 0;
  return Math.min(timeMs, max);
}

/** Absolute composition time → layer-relative keyframe time. */
export function absoluteToRelative(absoluteMs: number, layer: AdMotionLayer): number {
  return clampKeyframeTime(absoluteMs - layer.startMs, layer);
}

export function relativeToAbsolute(relativeMs: number, layer: AdMotionLayer): number {
  return layer.startMs + relativeMs;
}

export function editorToCanonical(
  prop: EditorPropertyId,
): AdAnimatableProperty[] {
  if (prop === "scale") return ["scaleX", "scaleY"];
  return [prop];
}

export function canonicalToEditor(
  property: AdAnimatableProperty,
): EditorPropertyId | null {
  if (property === "scaleX" || property === "scaleY") return "scale";
  if (property === "visibility") return null;
  return property;
}

function findLayer(
  graph: AdMotionSceneGraph,
  layerId: string,
): { index: number; layer: AdMotionLayer } | null {
  const index = graph.layers.findIndex((l) => l.id === layerId);
  if (index < 0) return null;
  return { index, layer: graph.layers[index]! };
}

function getAnimation(
  layer: AdMotionLayer,
  property: AdAnimatableProperty,
): AdLayerAnimation | undefined {
  return (layer.animations ?? []).find((a) => a.property === property);
}

function setLayerAnimations(
  graph: AdMotionSceneGraph,
  layerId: string,
  nextAnimations: AdLayerAnimation[],
): AdMotionSceneGraph {
  return {
    ...graph,
    layers: graph.layers.map((l) =>
      l.id === layerId
        ? {
            ...l,
            animations: nextAnimations.length ? nextAnimations : [],
          }
        : l,
    ),
    presetId: graph.presetId ?? null,
  };
}

function upsertAnimation(
  layer: AdMotionLayer,
  property: AdAnimatableProperty,
  keyframes: AdMotionKeyframe[],
  easing?: AdMotionEasing,
): AdLayerAnimation[] {
  const existing = layer.animations ?? [];
  const coalesced = coalesceKeyframes(keyframes);
  if (!coalesced.length) {
    return existing.filter((a) => a.property !== property);
  }
  const prev = existing.find((a) => a.property === property);
  const next: AdLayerAnimation = {
    property,
    keyframes: coalesced,
    easing: easing ?? prev?.easing ?? "easeOut",
  };
  const without = existing.filter((a) => a.property !== property);
  if (without.length + 1 > MAX_ANIMATIONS_PER_LAYER) {
    throw new Error(`Too many animations on layer (max ${MAX_ANIMATIONS_PER_LAYER})`);
  }
  return [...without, next];
}

function defaultValueForProperty(
  layer: AdMotionLayer,
  property: AdAnimatableProperty,
): number {
  switch (property) {
    case "x":
      return layer.x;
    case "y":
      return layer.y;
    case "opacity":
      return layer.opacity ?? 1;
    case "rotation":
      return layer.rotation ?? 0;
    case "scaleX":
    case "scaleY":
      return 1;
    case "visibility":
      return layer.visible === false ? 0 : 1;
    default:
      return 0;
  }
}

export function addKeyframeAtPlayhead(
  graph: AdMotionSceneGraph,
  layerId: string,
  editorProp: EditorPropertyId,
  absolutePlayheadMs: number,
  valueOverride?: number,
): MotionEditResult {
  const found = findLayer(graph, layerId);
  if (!found) return { ok: false, message: "Layer not found" };
  const { layer } = found;
  const relative = absoluteToRelative(absolutePlayheadMs, layer);
  const next = cloneGraph(graph);
  const nextLayer = next.layers.find((l) => l.id === layerId)!;
  let selection: KeyframeSelection | null = null;

  try {
    for (const property of editorToCanonical(editorProp)) {
      const err = validateKeyframeValue(
        property,
        valueOverride ?? defaultValueForProperty(nextLayer, property),
      );
      if (err) return { ok: false, message: err };
      const value = valueOverride ?? defaultValueForProperty(nextLayer, property);
      const anim = getAnimation(nextLayer, property);
      const keyframes = [...(anim?.keyframes ?? []), { timeMs: relative, value }];
      if (keyframes.length > MAX_KEYFRAMES_PER_ANIMATION) {
        return {
          ok: false,
          message: `Too many keyframes (max ${MAX_KEYFRAMES_PER_ANIMATION})`,
        };
      }
      nextLayer.animations = upsertAnimation(nextLayer, property, keyframes);
      const sorted = getAnimation(nextLayer, property)!.keyframes;
      const index = sorted.findIndex((k) => k.timeMs === relative);
      if (property === "scaleX" || editorProp !== "scale") {
        selection = { layerId, property, index: Math.max(0, index) };
      }
      if (editorProp !== "scale" || property === "scaleX") {
        selection = { layerId, property, index: Math.max(0, index) };
      }
    }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Add failed" };
  }

  // Clear preset stamp when manually editing (local only)
  next.presetId = next.presetId ?? null;
  return { ok: true, graph: next, selection };
}

export function deleteKeyframe(
  graph: AdMotionSceneGraph,
  selection: KeyframeSelection,
): MotionEditResult {
  const found = findLayer(graph, selection.layerId);
  if (!found) return { ok: false, message: "Layer not found" };
  const next = cloneGraph(graph);
  const layer = next.layers.find((l) => l.id === selection.layerId)!;
  const props =
    selection.property === "scaleX" || selection.property === "scaleY"
      ? (["scaleX", "scaleY"] as AdAnimatableProperty[])
      : [selection.property];

  for (const property of props) {
    const anim = getAnimation(layer, property);
    if (!anim) continue;
    const target =
      property === selection.property
        ? anim.keyframes[selection.index]
        : anim.keyframes.find(
            (k) => k.timeMs === anim.keyframes[selection.index]?.timeMs,
          ) ?? anim.keyframes[selection.index];
    if (!target && property === selection.property) {
      return { ok: false, message: "Keyframe not found" };
    }
    const timeMs =
      property === selection.property
        ? anim.keyframes[selection.index]?.timeMs
        : target?.timeMs;
    if (timeMs == null) continue;
    const keyframes = anim.keyframes.filter((k) => k.timeMs !== timeMs);
    layer.animations = upsertAnimation(layer, property, keyframes, anim.easing);
  }
  return { ok: true, graph: next, selection: null };
}

export function duplicateKeyframe(
  graph: AdMotionSceneGraph,
  selection: KeyframeSelection,
  fps = 30,
): MotionEditResult {
  const found = findLayer(graph, selection.layerId);
  if (!found) return { ok: false, message: "Layer not found" };
  const layer = found.layer;
  const anim = getAnimation(layer, selection.property);
  const src = anim?.keyframes[selection.index];
  if (!src) return { ok: false, message: "Keyframe not found" };
  const frame = 1000 / Math.max(1, fps);
  const newTime = clampKeyframeTime(src.timeMs + frame, layer);
  return updateOrInsertKeyframe(graph, selection.layerId, selection.property, newTime, src.value);
}

export function updateKeyframeValue(
  graph: AdMotionSceneGraph,
  selection: KeyframeSelection,
  value: number,
): MotionEditResult {
  const err = validateKeyframeValue(selection.property, value);
  if (err) return { ok: false, message: err };
  const found = findLayer(graph, selection.layerId);
  if (!found) return { ok: false, message: "Layer not found" };
  const next = cloneGraph(graph);
  const layer = next.layers.find((l) => l.id === selection.layerId)!;
  const props =
    selection.property === "scaleX" || selection.property === "scaleY"
      ? (["scaleX", "scaleY"] as AdAnimatableProperty[])
      : [selection.property];

  let nextSelection = selection;
  for (const property of props) {
    const anim = getAnimation(layer, property);
    if (!anim) continue;
    const idx =
      property === selection.property
        ? selection.index
        : anim.keyframes.findIndex(
            (k) =>
              k.timeMs ===
              getAnimation(found.layer, selection.property)?.keyframes[selection.index]
                ?.timeMs,
          );
    if (idx < 0 || !anim.keyframes[idx]) continue;
    const keyframes = anim.keyframes.map((k, i) =>
      i === idx ? { ...k, value } : k,
    );
    layer.animations = upsertAnimation(layer, property, keyframes, anim.easing);
    if (property === selection.property) {
      const sorted = getAnimation(layer, property)!.keyframes;
      const timeMs = keyframes[idx]!.timeMs;
      nextSelection = {
        layerId: selection.layerId,
        property,
        index: Math.max(0, sorted.findIndex((k) => k.timeMs === timeMs)),
      };
    }
  }
  return { ok: true, graph: next, selection: nextSelection };
}

export function moveKeyframe(
  graph: AdMotionSceneGraph,
  selection: KeyframeSelection,
  newRelativeTimeMs: number,
): MotionEditResult {
  const found = findLayer(graph, selection.layerId);
  if (!found) return { ok: false, message: "Layer not found" };
  const next = cloneGraph(graph);
  const layer = next.layers.find((l) => l.id === selection.layerId)!;
  const clamped = clampKeyframeTime(newRelativeTimeMs, layer);
  const primary = getAnimation(layer, selection.property);
  const src = primary?.keyframes[selection.index];
  if (!src || !primary) return { ok: false, message: "Keyframe not found" };

  const props =
    selection.property === "scaleX" || selection.property === "scaleY"
      ? (["scaleX", "scaleY"] as AdAnimatableProperty[])
      : [selection.property];

  let nextSelection = selection;
  for (const property of props) {
    const anim = getAnimation(layer, property);
    if (!anim) continue;
    const idx =
      property === selection.property
        ? selection.index
        : anim.keyframes.findIndex((k) => k.timeMs === src.timeMs);
    if (idx < 0 || !anim.keyframes[idx]) continue;
    const moving = anim.keyframes[idx]!;
    const others = anim.keyframes.filter((_, i) => i !== idx);
    const keyframes = coalesceKeyframes([
      ...others,
      { timeMs: clamped, value: moving.value },
    ]);
    layer.animations = upsertAnimation(layer, property, keyframes, anim.easing);
    if (property === selection.property) {
      const sorted = getAnimation(layer, property)!.keyframes;
      nextSelection = {
        layerId: selection.layerId,
        property,
        index: Math.max(0, sorted.findIndex((k) => k.timeMs === clamped)),
      };
    }
  }
  return { ok: true, graph: next, selection: nextSelection };
}

export function updateOrInsertKeyframe(
  graph: AdMotionSceneGraph,
  layerId: string,
  property: AdAnimatableProperty,
  relativeTimeMs: number,
  value: number,
): MotionEditResult {
  const err = validateKeyframeValue(property, value);
  if (err) return { ok: false, message: err };
  const found = findLayer(graph, layerId);
  if (!found) return { ok: false, message: "Layer not found" };
  const next = cloneGraph(graph);
  const layer = next.layers.find((l) => l.id === layerId)!;
  const timeMs = clampKeyframeTime(relativeTimeMs, layer);
  const props =
    property === "scaleX" || property === "scaleY"
      ? (["scaleX", "scaleY"] as AdAnimatableProperty[])
      : [property];

  let selection: KeyframeSelection | null = null;
  for (const prop of props) {
    const anim = getAnimation(layer, prop);
    const keyframes = coalesceKeyframes([
      ...(anim?.keyframes ?? []).filter((k) => k.timeMs !== timeMs),
      { timeMs, value },
    ]);
    if (keyframes.length > MAX_KEYFRAMES_PER_ANIMATION) {
      return { ok: false, message: `Too many keyframes (max ${MAX_KEYFRAMES_PER_ANIMATION})` };
    }
    layer.animations = upsertAnimation(layer, prop, keyframes, anim?.easing);
    if (prop === property || prop === "scaleX") {
      const sorted = getAnimation(layer, prop)!.keyframes;
      selection = {
        layerId,
        property: prop,
        index: Math.max(0, sorted.findIndex((k) => k.timeMs === timeMs)),
      };
    }
  }
  return { ok: true, graph: next, selection };
}

export function setAnimationEasing(
  graph: AdMotionSceneGraph,
  layerId: string,
  property: AdAnimatableProperty,
  easing: AdMotionEasing,
): MotionEditResult {
  if (!EASING_OPTIONS.some((e) => e.id === easing)) {
    return { ok: false, message: "Unsupported easing" };
  }
  const found = findLayer(graph, layerId);
  if (!found) return { ok: false, message: "Layer not found" };
  const next = cloneGraph(graph);
  const layer = next.layers.find((l) => l.id === layerId)!;
  const props =
    property === "scaleX" || property === "scaleY"
      ? (["scaleX", "scaleY"] as AdAnimatableProperty[])
      : [property];
  for (const prop of props) {
    const anim = getAnimation(layer, prop);
    if (!anim) continue;
    layer.animations = upsertAnimation(layer, prop, anim.keyframes, easing);
  }
  return { ok: true, graph: next };
}

export function clearLayerAnimations(
  graph: AdMotionSceneGraph,
  layerId: string,
): MotionEditResult {
  const found = findLayer(graph, layerId);
  if (!found) return { ok: false, message: "Layer not found" };
  const next = setLayerAnimations(cloneGraph(graph), layerId, []);
  return { ok: true, graph: next, selection: null };
}

export function clearAllAnimations(graph: AdMotionSceneGraph): AdMotionSceneGraph {
  return {
    ...cloneGraph(graph),
    layers: graph.layers.map((l) => ({ ...l, animations: [] })),
    transitions: [],
    presetId: null,
  };
}

export function resolveKeyframe(
  graph: AdMotionSceneGraph,
  selection: KeyframeSelection | null,
): { layer: AdMotionLayer; animation: AdLayerAnimation; keyframe: AdMotionKeyframe } | null {
  if (!selection) return null;
  const found = findLayer(graph, selection.layerId);
  if (!found) return null;
  const animation = getAnimation(found.layer, selection.property);
  const keyframe = animation?.keyframes[selection.index];
  if (!animation || !keyframe) return null;
  return { layer: found.layer, animation, keyframe };
}

export function selectionId(sel: KeyframeSelection): string {
  return `${sel.layerId}|${sel.property}|${sel.index}`;
}

export function propertyTrackRows(layer: AdMotionLayer): Array<{
  property: AdAnimatableProperty;
  editorProp: EditorPropertyId;
  label: string;
  easing: AdMotionEasing;
  keyframes: AdMotionKeyframe[];
}> {
  const anims = layer.animations ?? [];
  const rows: Array<{
    property: AdAnimatableProperty;
    editorProp: EditorPropertyId;
    label: string;
    easing: AdMotionEasing;
    keyframes: AdMotionKeyframe[];
  }> = [];
  const seenScale = { shown: false };

  for (const prop of EDITOR_ANIMATABLE) {
    const anim = anims.find((a) => a.property === prop);
    if (!anim?.keyframes.length) continue;
    if (prop === "scaleY") continue;
    if (prop === "scaleX") {
      if (seenScale.shown) continue;
      seenScale.shown = true;
      rows.push({
        property: "scaleX",
        editorProp: "scale",
        label: PROPERTY_LABELS.scale,
        easing: anim.easing ?? "easeOut",
        keyframes: anim.keyframes,
      });
      continue;
    }
    const editorProp = canonicalToEditor(prop);
    if (!editorProp) continue;
    rows.push({
      property: prop,
      editorProp,
      label: PROPERTY_LABELS[editorProp],
      easing: anim.easing ?? "easeOut",
      keyframes: anim.keyframes,
    });
  }
  return rows;
}

export function hasAnyAnimation(layer: AdMotionLayer): boolean {
  return (layer.animations ?? []).some((a) => a.keyframes.length > 0);
}
