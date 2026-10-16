import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  alignLayer,
  setCanvasBackground,
  updateLayer,
} from "./sceneGraph";
import type { AdSceneGraph } from "../types";

const base = (): AdSceneGraph => ({
  schemaVersion: "1",
  canvas: { width: 1080, height: 1350, backgroundColor: "#000" },
  layers: [
    {
      id: "t1",
      type: "text",
      name: "Headline",
      x: 100,
      y: 200,
      width: 400,
      height: 80,
      zIndex: 1,
      text: "A RED THAT SPEAKS.",
      color: "#fff",
    },
  ],
});

describe("sceneGraph align / background", () => {
  it("aligns layer to canvas center and edges", () => {
    const g = base();
    const centered = alignLayer(g, "t1", "center");
    const layer = centered.layers[0]!;
    assert.equal(layer.x, Math.round((1080 - 400) / 2));
    const bottom = alignLayer(g, "t1", "bottom");
    assert.equal(bottom.layers[0]!.y, 1350 - 80);
  });

  it("does not move locked layers", () => {
    const g = updateLayer(base(), "t1", { locked: true });
    const next = alignLayer(g, "t1", "left");
    assert.equal(next.layers[0]!.x, 100);
  });

  it("sets canvas background", () => {
    const next = setCanvasBackground(base(), "#A6192E");
    assert.equal(next.canvas.backgroundColor, "#A6192E");
  });
});
