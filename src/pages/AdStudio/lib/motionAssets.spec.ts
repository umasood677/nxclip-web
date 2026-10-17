import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countMissingAssets,
  inspectLayerAsset,
  missingAssetMessage,
} from "./motionAssets";
import type { AdSceneLayer } from "../types";

describe("motionAssets (4B-D)", () => {
  it("flags image/logo without storageKey or assetId as missing", () => {
    const layer = {
      id: "1",
      type: "image",
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      zIndex: 1,
    } as AdSceneLayer;
    const info = inspectLayerAsset(layer);
    assert.equal(info.missing, true);
    assert.match(missingAssetMessage(layer), /Image missing/);
  });

  it("does not flag layers that retain storageKey references", () => {
    const layer = {
      id: "2",
      type: "logo",
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      zIndex: 1,
      storageKey: "brands/kit/logo.png",
    } as AdSceneLayer;
    assert.equal(inspectLayerAsset(layer).missing, false);
    assert.equal(missingAssetMessage(layer), "");
  });

  it("counts missing assets without inventing replacements", () => {
    const layers = [
      {
        id: "a",
        type: "text",
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        zIndex: 1,
        text: "Hi",
      },
      {
        id: "b",
        type: "image",
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        zIndex: 2,
      },
    ] as AdSceneLayer[];
    assert.equal(countMissingAssets(layers), 1);
  });
});
