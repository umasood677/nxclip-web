import assert from "node:assert/strict";
import { test } from "node:test";
import type { AdSceneGraph } from "../types";
import { reorderLayer, sortLayers } from "./sceneGraph";

test("layer ordering handles tied z-indices and preserves other layers' order", () => {
  const graph: AdSceneGraph = {
    schemaVersion: "1.0",
    canvas: { width: 1080, height: 1350 },
    layers: ["background", "product", "headline", "cta"].map((id) => ({
      id, type: "text", text: id, x: 0, y: 0, width: 100, height: 50, zIndex: 0,
    })),
  };
  const order = (scene: AdSceneGraph) => sortLayers(scene.layers).map(({ id }) => id);
  const forward = reorderLayer(graph, "product", "up");
  assert.deepEqual(order(forward), ["background", "headline", "product", "cta"]);
  const front = reorderLayer(forward, "background", "front");
  assert.deepEqual(order(front), ["headline", "product", "cta", "background"]);
  assert.equal(reorderLayer(front, "background", "front"), front);
  assert.deepEqual(order(reorderLayer(front, "background", "back")),
    ["background", "headline", "product", "cta"]);
  assert.deepEqual(order(graph), ["background", "product", "headline", "cta"]);
});
