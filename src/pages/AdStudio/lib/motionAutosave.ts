/**
 * Autosave helpers for Animated Ad Studio (Phase 4B-C). Pure / testable.
 */

import type { AdMotionSceneGraph } from "./motionTypes";

export type SaveStatus = "saved" | "dirty" | "saving" | "error";

export function motionGraphFingerprint(graph: AdMotionSceneGraph): string {
  return JSON.stringify({
    schemaVersion: graph.schemaVersion,
    kind: graph.kind,
    canvas: graph.canvas,
    layers: graph.layers,
    audioTracks: graph.audioTracks,
    transitions: graph.transitions,
    presetId: graph.presetId ?? null,
  });
}

export function graphsEqual(a: AdMotionSceneGraph, b: AdMotionSceneGraph): boolean {
  return motionGraphFingerprint(a) === motionGraphFingerprint(b);
}

export function isConflictError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const status =
    (e as { statusCode?: number }).statusCode ??
    (e as { response?: { status?: number } }).response?.status ??
    (e as { status?: number }).status;
  return status === 409;
}

export function shouldSkipSave(opts: {
  status: SaveStatus;
  fingerprint: string;
  lastSavedFingerprint: string | null;
  saving: boolean;
}): boolean {
  if (opts.saving) return true;
  if (opts.status !== "dirty") return true;
  if (opts.lastSavedFingerprint && opts.fingerprint === opts.lastSavedFingerprint) {
    return true;
  }
  return false;
}

/** Bounded backoff delays (ms) for recoverable failures. */
export function autosaveBackoffMs(attempt: number): number {
  const delays = [800, 1600, 3200];
  return delays[Math.min(Math.max(0, attempt), delays.length - 1)]!;
}

export type SaveGateDecision =
  | { action: "proceed"; epoch: number; expectedVersion: number; snapshot: AdMotionSceneGraph }
  | { action: "skip" }
  | { action: "wait" };

/**
 * After a save response: apply server graph only if local epoch is unchanged.
 * Newer local edits keep dirty and only bump version from server.
 */
export function reconcileSaveResponse(opts: {
  epochAtStart: number;
  currentEpoch: number;
  serverGraph: AdMotionSceneGraph;
  serverVersion: number;
}): { applyServerGraph: boolean; version: number; status: SaveStatus } {
  if (opts.epochAtStart === opts.currentEpoch) {
    return {
      applyServerGraph: true,
      version: opts.serverVersion,
      status: "saved",
    };
  }
  return {
    applyServerGraph: false,
    version: opts.serverVersion,
    status: "dirty",
  };
}
