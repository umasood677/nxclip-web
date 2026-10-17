import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyEasing,
  evaluateMotionGraph,
  interpolateKeyframes,
} from "./motionEvaluate";
import type { AdMotionSceneGraph } from "./motionTypes";

function graphWithLayer(
  overrides: Partial<AdMotionSceneGraph["layers"][0]> & { id?: string } = {},
): AdMotionSceneGraph {
  return {
    schemaVersion: "2.0",
    kind: "animated",
    canvas: {
      width: 100,
      height: 100,
      fps: 30,
      durationMs: 10_000,
      backgroundColor: "#000",
    },
    layers: [
      {
        id: "L1",
        type: "shape",
        name: "Box",
        x: 10,
        y: 20,
        width: 50,
        height: 50,
        zIndex: 1,
        opacity: 1,
        rotation: 0,
        startMs: 1000,
        endMs: 5000,
        shape: "rectangle",
        animations: [],
        ...overrides,
      },
    ],
    audioTracks: [],
    transitions: [],
    presetId: null,
  };
}

describe("motionEvaluate (4B-C)", () => {
  it("interpolates linearly between keyframes", () => {
    const v = interpolateKeyframes(
      [
        { timeMs: 0, value: 0 },
        { timeMs: 1000, value: 100 },
      ],
      500,
      "linear",
    );
    assert.equal(v, 50);
  });

  it("holds before first and after last keyframe", () => {
    const kfs = [
      { timeMs: 100, value: 2 },
      { timeMs: 300, value: 8 },
    ];
    assert.equal(interpolateKeyframes(kfs, 0, "linear"), 2);
    assert.equal(interpolateKeyframes(kfs, 500, "linear"), 8);
  });

  it("applies all easing modes deterministically", () => {
    assert.equal(applyEasing(0.5, "linear"), 0.5);
    assert.ok(applyEasing(0.5, "easeIn") < 0.5);
    assert.ok(applyEasing(0.5, "easeOut") > 0.5);
    assert.equal(applyEasing(0.5, "easeInOut"), 0.5);
  });

  it("respects layer start offset for relative keyframes", () => {
    const g = graphWithLayer({
      startMs: 2000,
      endMs: 6000,
      animations: [
        {
          property: "x",
          easing: "linear",
          keyframes: [
            { timeMs: 0, value: 0 },
            { timeMs: 1000, value: 100 },
          ],
        },
      ],
    });
    // absolute 2500 → relative 500 → x=50
    const at = evaluateMotionGraph(g, 2500).get("L1")!;
    assert.equal(at.x, 50);
    assert.equal(at.active, true);
  });

  it("hides layers outside active time range", () => {
    const g = graphWithLayer();
    const before = evaluateMotionGraph(g, 500).get("L1")!;
    assert.equal(before.active, false);
    assert.equal(before.opacity, 0);
    const mid = evaluateMotionGraph(g, 3000).get("L1")!;
    assert.equal(mid.active, true);
    const after = evaluateMotionGraph(g, 8000).get("L1")!;
    assert.equal(after.active, false);
  });

  it("uses layer defaults when animation tracks are empty", () => {
    const g = graphWithLayer({ x: 42, y: 7, opacity: 0.8 });
    const s = evaluateMotionGraph(g, 2000).get("L1")!;
    assert.equal(s.x, 42);
    assert.equal(s.y, 7);
    assert.equal(s.opacity, 0.8);
    assert.equal(s.scaleX, 1);
  });

  it("does not mutate the source graph during evaluation", () => {
    const g = graphWithLayer({
      animations: [
        {
          property: "opacity",
          easing: "easeIn",
          keyframes: [
            { timeMs: 0, value: 0 },
            { timeMs: 1000, value: 1 },
          ],
        },
      ],
    });
    const before = JSON.stringify(g);
    evaluateMotionGraph(g, 1500);
    assert.equal(JSON.stringify(g), before);
  });
});
