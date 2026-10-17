/** Frontend motion scene graph types (Phase 4B) — mirrors content-service 2.0 contracts. */

import type { AdSceneLayer } from "../types";

export const AD_MOTION_SCHEMA_VERSION = "2.0" as const;
export const AD_MOTION_KIND = "animated" as const;

export type AdMotionEasing = "linear" | "easeIn" | "easeOut" | "easeInOut";

export type AdAnimatableProperty =
  | "opacity"
  | "x"
  | "y"
  | "scaleX"
  | "scaleY"
  | "rotation"
  | "visibility";

export interface AdMotionKeyframe {
  timeMs: number;
  value: number;
}

export interface AdLayerAnimation {
  property: AdAnimatableProperty;
  keyframes: AdMotionKeyframe[];
  easing?: AdMotionEasing;
}

export interface AdMotionCanvas {
  width: number;
  height: number;
  backgroundColor?: string;
  fps: number;
  durationMs: number;
}

export type AdMotionLayer = AdSceneLayer & {
  startMs: number;
  endMs: number;
  animations?: AdLayerAnimation[];
};

export interface AdMotionAudioTrack {
  id: string;
  role: "voiceover" | "music" | "sfx" | "transition";
  startMs: number;
  endMs: number;
  volume?: number;
  label?: string;
}

export interface AdMotionTransition {
  id: string;
  type: "fade" | "cut" | "slide";
  atMs: number;
  durationMs: number;
}

export interface AdMotionSceneGraph {
  schemaVersion: string;
  kind: string;
  canvas: AdMotionCanvas;
  layers: AdMotionLayer[];
  audioTracks: AdMotionAudioTrack[];
  transitions: AdMotionTransition[];
  presetId?: string | null;
}

export type AdMotionPresetId =
  | "cinematic-reveal"
  | "gaming-energy"
  | "product-spotlight"
  | "luxury-minimal"
  | "fashion-editorial"
  | "flash-sale"
  | "event-countdown"
  | "saas-product-launch";

export interface AdMotionPresetSummary {
  id: string;
  name: string;
  description: string;
  defaultDurationMs: number;
  fps: number;
  transitionStyle: string;
  soundCueSuggestions: string[];
}

export interface AdAnimatedCreative {
  id: string;
  projectId: string;
  name: string;
  status: string;
  motionGraph: AdMotionSceneGraph;
  currentVersion: number;
  parentStaticCreativeId?: string | null;
  parentStaticVersion?: number | null;
  brandSnapshot?: unknown;
  conceptSnapshot?: unknown;
  presetId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export const MOTION_DURATION_MIN_MS = 6_000;
export const MOTION_DURATION_MAX_MS = 30_000;
export const MOTION_ALLOWED_FPS = [24, 25, 30] as const;
