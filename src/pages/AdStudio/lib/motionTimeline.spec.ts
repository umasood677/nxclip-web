import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRulerMarks,
  clampTimeMs,
  clampTimelineZoom,
  formatTimecode,
  layerTrackSpans,
  msToPixels,
  pixelsToMs,
  snapTimeMs,
  snapToFrame,
} from "./motionTimeline";

describe("motionTimeline (4B-A)", () => {
  it("clamps time within duration", () => {
    assert.equal(clampTimeMs(-10, 5000), 0);
    assert.equal(clampTimeMs(2500, 5000), 2500);
    assert.equal(clampTimeMs(9000, 5000), 5000);
  });

  it("snaps to frame boundaries at 30fps", () => {
    const frame = 1000 / 30;
    assert.equal(snapToFrame(0, 30), 0);
    assert.equal(snapToFrame(frame * 3, 30), frame * 3);
    assert.equal(snapToFrame(frame * 2.4, 30), frame * 2);
  });

  it("converts ms ↔ pixels with zoom", () => {
    assert.equal(msToPixels(2000, 50), 100);
    assert.equal(pixelsToMs(100, 50), 2000);
  });

  it("formats timecode mm:ss:ff", () => {
    assert.match(formatTimecode(0, 30), /^00:00:00$/);
    assert.match(formatTimecode(1500, 30), /^00:01:\d{2}$/);
  });

  it("builds ruler marks covering duration", () => {
    const marks = buildRulerMarks(10_000, 64);
    assert.ok(marks.length >= 2);
    assert.equal(marks[0]!.timeMs, 0);
    assert.equal(marks[marks.length - 1]!.timeMs, 10_000);
  });

  it("clamps timeline zoom", () => {
    assert.equal(clampTimelineZoom(10), 24);
    assert.equal(clampTimelineZoom(500), 240);
    assert.equal(clampTimelineZoom(64), 64);
  });

  it("builds layer track spans with absolute keyframe times", () => {
    const spans = layerTrackSpans([
      {
        id: "a",
        name: "Logo",
        type: "logo",
        startMs: 500,
        endMs: 4000,
        animations: [
          { keyframes: [{ timeMs: 0 }, { timeMs: 500 }] },
        ],
      },
    ]);
    assert.equal(spans.length, 1);
    assert.equal(spans[0]!.name, "Logo");
    assert.deepEqual(spans[0]!.keyframeTimesMs, [500, 1000]);
  });

  it("snapTimeMs respects disabled snapping", () => {
    assert.equal(snapTimeMs(123, 30, { enabled: false }), 123);
  });
});
