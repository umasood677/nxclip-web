import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { reconcileSaveResponse } from "./motionAutosave";
import {
  canApplyPreset,
  canRestoreVersion,
  displaySaveLabel,
  reopenIsClean,
  shouldIgnoreSaveAfterRestore,
  shouldWarnBeforeLeave,
  statusAfterAutosaveNetworkFailure,
  statusAfterConflict,
  statusAfterPresetApiFailure,
} from "./motionRaceGates";
import type { AdMotionSceneGraph } from "./motionTypes";

const g = (): AdMotionSceneGraph => ({
  schemaVersion: "2.0",
  kind: "animated",
  canvas: { width: 1, height: 1, fps: 30, durationMs: 6000 },
  layers: [],
  audioTracks: [],
  transitions: [],
  presetId: null,
});

describe("motionRaceGates (4B-D)", () => {
  it("A/B: edit during save keeps dirty after stale reconcile", () => {
    const r = reconcileSaveResponse({
      epochAtStart: 1,
      currentEpoch: 2,
      serverGraph: g(),
      serverVersion: 4,
    });
    assert.equal(r.applyServerGraph, false);
    assert.equal(r.status, "dirty");
    assert.equal(r.version, 4);
  });

  it("C: network failure yields error status", () => {
    assert.equal(statusAfterAutosaveNetworkFailure(), "error");
  });

  it("D: 409 preserves local", () => {
    const r = statusAfterConflict();
    assert.equal(r.discardLocal, false);
    assert.equal(r.status, "error");
  });

  it("E: blocks restore during pending save", () => {
    assert.equal(canRestoreVersion({ saving: true }).ok, false);
    assert.equal(canRestoreVersion({ saving: false }).ok, true);
  });

  it("F: dirty preset requires flush", () => {
    const need = canApplyPreset({ saveStatus: "dirty", flushSucceeded: null });
    assert.equal(need.needsFlush, true);
    assert.equal(need.ok, false);
  });

  it("G: failed flush blocks preset", () => {
    const r = canApplyPreset({ saveStatus: "dirty", flushSucceeded: false });
    assert.equal(r.ok, false);
    assert.match(r.reason ?? "", /Save failed/);
  });

  it("H: preset API failure after flush leaves saved", () => {
    assert.equal(statusAfterPresetApiFailure({ flushSucceeded: true }), "saved");
  });

  it("I: warn before leave when unsaved", () => {
    assert.equal(shouldWarnBeforeLeave("dirty"), true);
    assert.equal(shouldWarnBeforeLeave("saved"), false);
  });

  it("J: reopen clean only when fingerprints match", () => {
    assert.equal(
      reopenIsClean({ currentFingerprint: "a", lastSavedFingerprint: "a" }),
      true,
    );
    assert.equal(
      reopenIsClean({ currentFingerprint: "a", lastSavedFingerprint: "b" }),
      false,
    );
  });

  it("ignores stale save after restore abort token bump", () => {
    assert.equal(
      shouldIgnoreSaveAfterRestore({ abortTokenAtSaveStart: 1, abortTokenNow: 2 }),
      true,
    );
  });

  it("does not label Saved without server confirmation", () => {
    assert.equal(
      displaySaveLabel({ status: "saved", serverConfirmed: false }),
      "Unsaved",
    );
    assert.equal(
      displaySaveLabel({ status: "saved", serverConfirmed: true }),
      "Saved",
    );
  });

  it("successful flush allows preset", () => {
    const r = canApplyPreset({ saveStatus: "dirty", flushSucceeded: true });
    assert.equal(r.ok, true);
  });
});
