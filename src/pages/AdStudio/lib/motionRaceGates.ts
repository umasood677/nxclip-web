/**
 * Persistence race-condition gates (Phase 4B-D). Pure decision helpers for editor flows.
 */

import type { SaveStatus } from "./motionAutosave";

/** A/B: edits during/after save — bump epoch; reconcileSaveResponse handles stale apply. */
export function shouldBumpEpochOnEdit(): true {
  return true;
}

/** C: network failure — keep dirty/error; allow retry. */
export function statusAfterAutosaveNetworkFailure(): SaveStatus {
  return "error";
}

/** D: 409 — preserve local, do not apply server graph. */
export function statusAfterConflict(): { status: SaveStatus; discardLocal: false } {
  return { status: "error", discardLocal: false };
}

/** E: restore while save in flight — block. */
export function canRestoreVersion(opts: { saving: boolean }): {
  ok: boolean;
  reason?: string;
} {
  if (opts.saving) {
    return { ok: false, reason: "Cannot restore while a save is in flight" };
  }
  return { ok: true };
}

/**
 * F/G: preset requires a successful prerequisite save when dirty/error.
 * Never call server-mutating apply-preset if flush failed.
 */
export function canApplyPreset(opts: {
  saveStatus: SaveStatus;
  flushSucceeded: boolean | null;
}): { ok: boolean; reason?: string; needsFlush: boolean } {
  if (opts.saveStatus === "saving") {
    return {
      ok: false,
      needsFlush: false,
      reason: "Wait for the current save to finish before applying a preset",
    };
  }
  if (opts.saveStatus === "dirty" || opts.saveStatus === "error") {
    if (opts.flushSucceeded === null) {
      return { ok: false, needsFlush: true, reason: "Flush unsaved edits first" };
    }
    if (!opts.flushSucceeded) {
      return {
        ok: false,
        needsFlush: false,
        reason: "Save failed — preset was not applied (server would use stale graph)",
      };
    }
  }
  return { ok: true, needsFlush: false };
}

/** H: after successful flush, if preset API fails — local stays at flushed saved state. */
export function statusAfterPresetApiFailure(opts: {
  flushSucceeded: boolean;
}): SaveStatus {
  return opts.flushSucceeded ? "saved" : "error";
}

/** I: navigation warning when unsaved. BrowserRouter has no useBlocker — confirm + beforeunload. */
export function shouldWarnBeforeLeave(status: SaveStatus): boolean {
  return status === "dirty" || status === "saving" || status === "error";
}

/** J: reopen after save — only treat as saved when fingerprint matches last confirmed. */
export function reopenIsClean(opts: {
  currentFingerprint: string;
  lastSavedFingerprint: string | null;
}): boolean {
  return (
    opts.lastSavedFingerprint != null &&
    opts.currentFingerprint === opts.lastSavedFingerprint
  );
}

/**
 * After restore: bump abort token so in-flight saves cannot overwrite restored graph.
 */
export function shouldIgnoreSaveAfterRestore(opts: {
  abortTokenAtSaveStart: number;
  abortTokenNow: number;
}): boolean {
  return opts.abortTokenAtSaveStart !== opts.abortTokenNow;
}

/** Do not show Saved until server confirms and epoch matches. */
export function displaySaveLabel(opts: {
  status: SaveStatus;
  serverConfirmed: boolean;
}): string {
  if (opts.status === "saving") return "Saving…";
  if (opts.status === "error") return "Save error";
  if (opts.status === "dirty") return "Unsaved";
  if (opts.status === "saved" && opts.serverConfirmed) return "Saved";
  return "Unsaved";
}
