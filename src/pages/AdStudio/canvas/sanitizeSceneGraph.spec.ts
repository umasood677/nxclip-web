import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AdSceneGraph } from "../types";
import {
  sanitizeSceneGraphForClient,
  sceneGraphLeaksStorageKey,
} from "./sanitizeSceneGraph";

describe("sanitizeSceneGraph", () => {
  it("strips storageKey from image/logo layers", () => {
    const dirty: AdSceneGraph = {
      schemaVersion: "1.0",
      canvas: { width: 100, height: 100 },
      layers: [
        {
          id: "img",
          type: "image",
          x: 0,
          y: 0,
          width: 50,
          height: 50,
          zIndex: 1,
          assetId: "a1",
          storageKey: "brands/owner/kit/a1/file.png",
        },
      ],
    };
    assert.equal(sceneGraphLeaksStorageKey(dirty), true);
    const clean = sanitizeSceneGraphForClient(dirty)!;
    assert.equal(sceneGraphLeaksStorageKey(clean), false);
    assert.equal(
      (clean.layers[0] as { storageKey?: string }).storageKey,
      undefined,
    );
    assert.equal((clean.layers[0] as { assetId?: string }).assetId, "a1");
  });
});
