/**
 * Deterministic motion evaluator (Phase 4B-C).
 * Mirrors content-service interpolateKeyframes / applyEasing — does not mutate the graph.
 */

import type {
  AdAnimatableProperty,
  AdLayerAnimation,
  AdMotionEasing,
  AdMotionKeyframe,
  AdMotionLayer,
  AdMotionSceneGraph,
} from "./motionTypes";

export type EvaluatedLayerState = {
  id: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
  /** False when composition time is outside [startMs, endMs). */
  active: boolean;
};

export function applyEasing(t: number, easing: AdMotionEasing = "linear"): number {
  const x = Math.min(1, Math.max(0, t));
  switch (easing) {
    case "easeIn":
      return x * x;
    case "easeOut":
      return 1 - (1 - x) * (1 - x);
    case "easeInOut":
      return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
    case "linear":
    default:
      return x;
  }
}

/** Relative-time keyframe interpolation (same rules as backend). */
export function interpolateKeyframes(
  keyframes: AdMotionKeyframe[],
  timeMs: number,
  easing: AdMotionEasing = "linear",
): number {
  if (!keyframes.length) return 0;
  if (timeMs <= keyframes[0]!.timeMs) return keyframes[0]!.value;
  const last = keyframes[keyframes.length - 1]!;
  if (timeMs >= last.timeMs) return last.value;
  let i = 1;
  while (i < keyframes.length && keyframes[i]!.timeMs < timeMs) i += 1;
  const a = keyframes[i - 1]!;
  const b = keyframes[i]!;
  const span = b.timeMs - a.timeMs || 1;
  const t = applyEasing((timeMs - a.timeMs) / span, easing);
  return a.value + (b.value - a.value) * t;
}

function defaultFor(layer: AdMotionLayer, property: AdAnimatableProperty): number {
  switch (property) {
    case "x":
      return Number.isFinite(layer.x) ? layer.x : 0;
    case "y":
      return Number.isFinite(layer.y) ? layer.y : 0;
    case "opacity":
      return Number.isFinite(layer.opacity ?? 1) ? (layer.opacity ?? 1) : 1;
    case "rotation":
      return Number.isFinite(layer.rotation ?? 0) ? (layer.rotation ?? 0) : 0;
    case "scaleX":
    case "scaleY":
      return 1;
    case "visibility":
      return layer.visible === false ? 0 : 1;
    default:
      return 0;
  }
}

function sampleProperty(
  layer: AdMotionLayer,
  property: AdAnimatableProperty,
  relativeMs: number,
): number {
  const anim = (layer.animations ?? []).find((a) => a.property === property) as
    | AdLayerAnimation
    | undefined;
  if (!anim?.keyframes?.length) return defaultFor(layer, property);
  const easing = anim.easing ?? "easeOut";
  const value = interpolateKeyframes(anim.keyframes, relativeMs, easing);
  if (!Number.isFinite(value)) return defaultFor(layer, property);
  if (property === "opacity") return Math.min(1, Math.max(0, value));
  if (property === "scaleX" || property === "scaleY") {
    return value <= 0 ? 0.01 : value;
  }
  return value;
}

/**
 * Evaluate every layer at absolute composition time `timeMs`.
 * Outside layer bounds → active=false, opacity forced to 0 for preview.
 */
export function evaluateMotionGraph(
  graph: AdMotionSceneGraph,
  timeMs: number,
): Map<string, EvaluatedLayerState> {
  const t = Number.isFinite(timeMs) ? Math.max(0, timeMs) : 0;
  const duration = graph.canvas?.durationMs ?? 0;
  const clamped = duration > 0 ? Math.min(t, duration) : t;
  const out = new Map<string, EvaluatedLayerState>();

  for (const layer of graph.layers ?? []) {
    const active = clamped >= layer.startMs && clamped < layer.endMs;
    const relative = clamped - layer.startMs;
    const state: EvaluatedLayerState = {
      id: layer.id,
      x: sampleProperty(layer, "x", relative),
      y: sampleProperty(layer, "y", relative),
      scaleX: sampleProperty(layer, "scaleX", relative),
      scaleY: sampleProperty(layer, "scaleY", relative),
      rotation: sampleProperty(layer, "rotation", relative),
      opacity: sampleProperty(layer, "opacity", relative),
      active,
    };
    if (!active) {
      state.opacity = 0;
    }
    if (layer.visible === false) {
      state.opacity = 0;
      state.active = false;
    }
    out.set(layer.id, state);
  }
  return out;
}

export type MotionPreviewStyle = {
  x: number;
  y: number;
  opacity: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  hidden: boolean;
};

export function evaluatedToPreviewStyles(
  evaluated: Map<string, EvaluatedLayerState>,
): Record<string, MotionPreviewStyle> {
  const styles: Record<string, MotionPreviewStyle> = {};
  for (const [id, s] of evaluated) {
    styles[id] = {
      x: s.x,
      y: s.y,
      opacity: s.opacity,
      rotation: s.rotation,
      scaleX: s.scaleX,
      scaleY: s.scaleY,
      hidden: !s.active || s.opacity <= 0,
    };
  }
  return styles;
}
