import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  autosaveBackoffMs,
  graphsEqual,
  isConflictError,
  motionGraphFingerprint,
  reconcileSaveResponse,
  shouldSkipSave,
} from "./motionAutosave";
import type { AdMotionSceneGraph } from "./motionTypes";
import { createMotionHistory, pushMotionHistory, undoMotionHistory } from "./motionHistory";

const base = (): AdMotionSceneGraph => ({
  schemaVersion: "2.0",
  kind: "animated",
  canvas: { width: 10, height: 10, fps: 30, durationMs: 6000 },
  layers: [],
  audioTracks: [],
  transitions: [],
  presetId: null,
});

describe("motionAutosave (4B-C)", () => {
  it("fingerprints graphs for identical-save prevention", () => {
    const a = base();
    const b = structuredClone(a);
    assert.equal(motionGraphFingerprint(a), motionGraphFingerprint(b));
    assert.equal(graphsEqual(a, b), true);
    b.presetId = "flash-sale";
    assert.equal(graphsEqual(a, b), false);
  });

  it("skips save when already saving or not dirty", () => {
    assert.equal(
      shouldSkipSave({
        status: "dirty",
        fingerprint: "a",
        lastSavedFingerprint: "b",
        saving: true,
      }),
      true,
    );
    assert.equal(
      shouldSkipSave({
        status: "saved",
        fingerprint: "a",
        lastSavedFingerprint: null,
        saving: false,
      }),
      true,
    );
    assert.equal(
      shouldSkipSave({
        status: "dirty",
        fingerprint: "same",
        lastSavedFingerprint: "same",
        saving: false,
      }),
      true,
    );
    assert.equal(
      shouldSkipSave({
        status: "dirty",
        fingerprint: "new",
        lastSavedFingerprint: "old",
        saving: false,
      }),
      false,
    );
  });

  it("detects 409 conflicts", () => {
    assert.equal(isConflictError({ status: 409 }), true);
    assert.equal(isConflictError({ statusCode: 500 }), false);
  });

  it("reconciles save without overwriting newer local epoch", () => {
    const server = base();
    const same = reconcileSaveResponse({
      epochAtStart: 3,
      currentEpoch: 3,
      serverGraph: server,
      serverVersion: 5,
    });
    assert.equal(same.applyServerGraph, true);
    assert.equal(same.status, "saved");

    const newer = reconcileSaveResponse({
      epochAtStart: 3,
      currentEpoch: 4,
      serverGraph: server,
      serverVersion: 5,
    });
    assert.equal(newer.applyServerGraph, false);
    assert.equal(newer.status, "dirty");
    assert.equal(newer.version, 5);
  });

  it("bounds backoff attempts", () => {
    assert.equal(autosaveBackoffMs(0), 800);
    assert.equal(autosaveBackoffMs(99), 3200);
  });

  it("undo marks a distinct graph suitable for dirty persistence", () => {
    const h0 = createMotionHistory(base());
    const edited = { ...base(), presetId: "luxury-minimal" };
    const h1 = pushMotionHistory(h0, edited);
    const h2 = undoMotionHistory(h1);
    assert.equal(graphsEqual(h2.present, base()), true);
    assert.equal(graphsEqual(h1.present, edited), true);
  });

  it("documents preset reconcile: flush dirty before server applyPreset", () => {
    // Server applyPreset mutates persisted graph from expectedVersion.
    // Editor must save local dirty first, then apply, then rebase history.
    const dirty = shouldSkipSave({
      status: "dirty",
      fingerprint: "local",
      lastSavedFingerprint: "server",
      saving: false,
    });
    assert.equal(dirty, false);
  });
});
