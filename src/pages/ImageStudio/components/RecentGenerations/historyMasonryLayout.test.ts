import assert from "node:assert/strict";
import { test } from "node:test";
import { buildHistoryMasonry } from "./historyMasonryLayout";

test("responsive mixed media fill the full width without overlap or internal column holes", () => {
  const ratios = [9 / 16, 16 / 9, 1, 4 / 5, 16 / 9, 9 / 16, 1, 16 / 9];
  for (const width of [280, 420, 421, 640, 960, 1440, 2560]) {
    const { tiles, height } = buildHistoryMasonry(ratios, width);
    assert.equal(tiles.length, ratios.length);
    const columns = new Map<number, typeof tiles>();
    tiles.forEach((tile, index) => {
      assert.ok(tile.width <= 420 && tile.width > 0);
      assert.ok(Math.abs(tile.width / tile.height - ratios[index]) < 0.001);
      assert.ok(tile.left + tile.width <= width + 0.001);
      assert.ok(tile.top + tile.height <= height + 0.001);
      columns.set(tile.left, [...(columns.get(tile.left) ?? []), tile]);
    });
    assert.ok(Math.abs(Math.max(...tiles.map(tile => tile.left + tile.width)) - width) < 0.001);
    for (const column of columns.values()) {
      assert.equal(column[0].top, 0);
      for (let i = 1; i < column.length; i += 1) {
        assert.ok(Math.abs(column[i].top - column[i - 1].top - column[i - 1].height - 16) < 0.001);
      }
    }
  }
});

test("following landscape tiles occupy space below a short tile beside a portrait", () => {
  const { tiles } = buildHistoryMasonry([9 / 16, 16 / 9, 16 / 9], 640);
  assert.equal(tiles[2].left, tiles[1].left);
  assert.ok(tiles[2].top < tiles[0].height);
});

test("empty, sparse and unknown-ratio history remains safe and compact", () => {
  assert.deepEqual(buildHistoryMasonry([], 960), { tiles: [], height: 0 });
  assert.deepEqual(buildHistoryMasonry([1], 0), { tiles: [], height: 0 });
  assert.ok(buildHistoryMasonry([16 / 9], 1440).tiles[0].width <= 420);
  for (const ratio of [NaN, 0, -1, Infinity]) {
    const tile = buildHistoryMasonry([ratio], 320).tiles[0];
    assert.equal(tile.height, tile.width);
  }
});
