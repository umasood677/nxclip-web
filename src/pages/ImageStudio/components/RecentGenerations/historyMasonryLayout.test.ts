import assert from "node:assert/strict";
import { test } from "node:test";
import { buildHistoryMasonry } from "./historyMasonryLayout";

test("responsive mixed media preserve ratios and fit the container without overlap", () => {
  const ratios = [9 / 16, 16 / 9, 1, 4 / 5, 16 / 9, 9 / 16, 1, 16 / 9];
  for (const width of [280, 420, 421, 640, 960, 1440, 2560]) {
    const { tiles, height } = buildHistoryMasonry(ratios, width);
    assert.equal(tiles.length, ratios.length);
    tiles.forEach((tile, index) => {
      assert.ok(tile.width <= 560 + 0.001 && tile.width > 0);
      assert.ok(Math.abs(tile.width / tile.height - ratios[index]) < 0.001);
      assert.ok(tile.left + tile.width <= width + 0.001);
      assert.ok(tile.top + tile.height <= height + 0.001);
    });
    for (let i = 0; i < tiles.length; i += 1) {
      for (let j = i + 1; j < tiles.length; j += 1) {
        const a = tiles[i], b = tiles[j];
        const separated = a.left + a.width + 16 <= b.left + 0.001 || b.left + b.width + 16 <= a.left + 0.001
          || a.top + a.height + 16 <= b.top + 0.001 || b.top + b.height + 16 <= a.top + 0.001;
        assert.ok(separated, "tiles must have a gutter and never overlap");
      }
    }
  }
});

test("following portrait tiles fill space below shorter wide tiles", () => {
  const { tiles } = buildHistoryMasonry([9 / 16, 16 / 9, 9 / 16], 640);
  assert.equal(tiles[2].left, tiles[1].left);
  assert.ok(tiles[2].top < tiles[0].height);
});

test("empty, sparse and unknown-ratio history remains safe and compact", () => {
  assert.deepEqual(buildHistoryMasonry([], 960), { tiles: [], height: 0 });
  assert.deepEqual(buildHistoryMasonry([1], 0), { tiles: [], height: 0 });
  assert.ok(buildHistoryMasonry([16 / 9], 1440).tiles[0].width <= 560);
  for (const ratio of [NaN, 0, -1, Infinity]) {
    const tile = buildHistoryMasonry([ratio], 320).tiles[0];
    assert.equal(tile.height, tile.width);
  }
});

test("landscape cards have comparable visual area to portrait cards on multi-column screens", () => {
  for (const width of [520, 640, 960, 1440, 2560]) {
    const { tiles: [portrait, landscape] } = buildHistoryMasonry([9 / 16, 16 / 9], width);
    const areaRatio = landscape.width * landscape.height / (portrait.width * portrait.height);
    assert.ok(landscape.width > portrait.width * 1.7);
    assert.ok(areaRatio >= 0.9 && areaRatio <= 1.5);
  }
});
