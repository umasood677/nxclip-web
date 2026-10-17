import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addKeyframeAtPlayhead,
  clearAllAnimations,
  coalesceKeyframes,
  deleteKeyframe,
  duplicateKeyframe,
  moveKeyframe,
  setAnimationEasing,
  updateKeyframeValue,
  validateKeyframeValue,
} from "./motionKeyframeOps";
import { createMotionHistory, pushMotionHistory, redoMotionHistory, undoMotionHistory } from "./motionHistory";
import type { AdMotionSceneGraph } from "./motionTypes";

function sampleGraph(): AdMotionSceneGraph {
  return {
    schemaVersion: "2.0",
    kind: "animated",
    canvas: {
      width: 1080,
      height: 1080,
      backgroundColor: "#fff",
      fps: 30,
      durationMs: 10_000,
    },
    layers: [
      {
        id: "layer-1",
        type: "text",
        name: "Headline",
        x: 100,
        y: 200,
        width: 400,
        height: 80,
        zIndex: 1,
        opacity: 1,
        startMs: 0,
        endMs: 10_000,
        text: "Hello",
        animations: [],
      },
    ],
    audioTracks: [],
    transitions: [],
    presetId: null,
  };
}

describe("motionKeyframeOps (4B-B)", () => {
  it("adds keyframes at playhead", () => {
    const g = sampleGraph();
    const r = addKeyframeAtPlayhead(g, "layer-1", "opacity", 1000, 0.5);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const anim = r.graph.layers[0]!.animations!.find((a) => a.property === "opacity");
    assert.ok(anim);
    assert.equal(anim!.keyframes.length, 1);
    assert.equal(anim!.keyframes[0]!.timeMs, 1000);
    assert.equal(anim!.keyframes[0]!.value, 0.5);
  });

  it("adds linked scaleX+scaleY for Scale", () => {
    const r = addKeyframeAtPlayhead(sampleGraph(), "layer-1", "scale", 500, 1.2);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const props = r.graph.layers[0]!.animations!.map((a) => a.property).sort();
    assert.deepEqual(props, ["scaleX", "scaleY"]);
  });

  it("moves keyframes and coalesces duplicate times", () => {
    let g = sampleGraph();
    let r = addKeyframeAtPlayhead(g, "layer-1", "x", 0, 10);
    assert.ok(r.ok);
    if (!r.ok) return;
    g = r.graph;
    r = addKeyframeAtPlayhead(g, "layer-1", "x", 1000, 50);
    assert.ok(r.ok);
    if (!r.ok) return;
    g = r.graph;
    const sel = { layerId: "layer-1", property: "x" as const, index: 1 };
    r = moveKeyframe(g, sel, 0);
    assert.ok(r.ok);
    if (!r.ok) return;
    const kfs = r.graph.layers[0]!.animations!.find((a) => a.property === "x")!.keyframes;
    assert.equal(kfs.length, 1);
    assert.equal(kfs[0]!.timeMs, 0);
    assert.equal(kfs[0]!.value, 50);
  });

  it("deletes keyframes", () => {
    let r = addKeyframeAtPlayhead(sampleGraph(), "layer-1", "opacity", 200, 0.2);
    assert.ok(r.ok);
    if (!r.ok) return;
    r = deleteKeyframe(r.graph, r.selection!);
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.equal((r.graph.layers[0]!.animations ?? []).length, 0);
  });

  it("coalesceKeyframes keeps last value for duplicate times", () => {
    const out = coalesceKeyframes([
      { timeMs: 100, value: 1 },
      { timeMs: 100, value: 2 },
      { timeMs: 50, value: 0 },
    ]);
    assert.deepEqual(out, [
      { timeMs: 50, value: 0 },
      { timeMs: 100, value: 2 },
    ]);
  });

  it("validates opacity and scale bounds", () => {
    assert.ok(validateKeyframeValue("opacity", 1.5));
    assert.equal(validateKeyframeValue("opacity", 0.5), null);
    assert.ok(validateKeyframeValue("scaleX", 0));
    assert.equal(validateKeyframeValue("scaleX", 1), null);
    assert.ok(validateKeyframeValue("x", Number.NaN));
  });

  it("serializes easing onto animations", () => {
    let r = addKeyframeAtPlayhead(sampleGraph(), "layer-1", "y", 0, 10);
    assert.ok(r.ok);
    if (!r.ok) return;
    r = setAnimationEasing(r.graph, "layer-1", "y", "easeInOut");
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.equal(
      r.graph.layers[0]!.animations!.find((a) => a.property === "y")!.easing,
      "easeInOut",
    );
  });

  it("updates keyframe values", () => {
    let r = addKeyframeAtPlayhead(sampleGraph(), "layer-1", "rotation", 100, 0);
    assert.ok(r.ok);
    if (!r.ok) return;
    r = updateKeyframeValue(r.graph, r.selection!, 45);
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.equal(
      r.graph.layers[0]!.animations!.find((a) => a.property === "rotation")!.keyframes[0]!
        .value,
      45,
    );
  });

  it("duplicates keyframes to next frame", () => {
    let r = addKeyframeAtPlayhead(sampleGraph(), "layer-1", "opacity", 0, 1);
    assert.ok(r.ok);
    if (!r.ok) return;
    r = duplicateKeyframe(r.graph, r.selection!, 30);
    assert.ok(r.ok);
    if (!r.ok) return;
    const kfs = r.graph.layers[0]!.animations!.find((a) => a.property === "opacity")!
      .keyframes;
    assert.equal(kfs.length, 2);
  });

  it("clearAllAnimations removes preset stamp", () => {
    const g = { ...sampleGraph(), presetId: "cinematic-reveal" as const };
    g.layers[0]!.animations = [
      { property: "opacity", easing: "linear", keyframes: [{ timeMs: 0, value: 1 }] },
    ];
    const cleared = clearAllAnimations(g);
    assert.equal(cleared.presetId, null);
    assert.equal((cleared.layers[0]!.animations ?? []).length, 0);
  });

  it("supports undo/redo for graph edits", () => {
    const base = sampleGraph();
    let hist = createMotionHistory(base);
    const r = addKeyframeAtPlayhead(base, "layer-1", "x", 100, 12);
    assert.ok(r.ok);
    if (!r.ok) return;
    hist = pushMotionHistory(hist, r.graph);
    assert.ok(hist.past.length === 1);
    hist = undoMotionHistory(hist);
    assert.equal((hist.present.layers[0]!.animations ?? []).length, 0);
    hist = redoMotionHistory(hist);
    assert.ok((hist.present.layers[0]!.animations ?? []).length > 0);
  });

  it("keeps motion graph 2.0 kind/schema after edits", () => {
    const r = addKeyframeAtPlayhead(sampleGraph(), "layer-1", "opacity", 0, 1);
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.equal(r.graph.schemaVersion, "2.0");
    assert.equal(r.graph.kind, "animated");
  });

  it("documents all eight Phase 4A preset ids for gallery compatibility", () => {
    const ids = [
      "cinematic-reveal",
      "gaming-energy",
      "product-spotlight",
      "luxury-minimal",
      "fashion-editorial",
      "flash-sale",
      "event-countdown",
      "saas-product-launch",
    ];
    assert.equal(ids.length, 8);
    for (const id of ids) {
      const stamped = { ...sampleGraph(), presetId: id };
      const cleared = clearAllAnimations(stamped);
      assert.equal(cleared.presetId, null);
    }
  });

  it("rejects invalid opacity without mutating", () => {
    const g = sampleGraph();
    const r = addKeyframeAtPlayhead(g, "layer-1", "opacity", 0, 2);
    assert.equal(r.ok, false);
    assert.equal((g.layers[0]!.animations ?? []).length, 0);
  });
});
