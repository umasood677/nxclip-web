import assert from "node:assert/strict";
import { test } from "node:test";
import { buildJustifiedRows } from "./justifiedLayout";

const studioOptions = {
  maxColumns: 5, minTileEdge: 220, minRowHeight: 380, maxRowHeight: 480, maxTileWidth: 560,
};

test("Studio tile widths stay bounded for sparse, landscape and mixed galleries", () => {
  const scenarios = [
    [16 / 9],
    [16 / 9, 16 / 9],
    Array.from({ length: 15 }, () => 16 / 9),
    [16 / 9, 9 / 16, 1, 4 / 5, 16 / 9, 9 / 16, 16 / 9],
  ];
  for (const width of [280, 640, 960, 1440, 2560]) {
    for (const ratios of scenarios) {
      const entries = ratios.map((ratio, item) => ({ ratio, item }));
      const rows = buildJustifiedRows(entries, width, 16, studioOptions);
      assert.deepEqual(rows.flatMap(row => row.entries), entries, "item order is unchanged");
      for (const row of rows) {
        let totalWidth = 16 * (row.entries.length - 1);
        for (const entry of row.entries) {
          const tileWidth = entry.ratio * row.height;
          assert.ok(tileWidth <= 560 + 0.001);
          assert.ok(tileWidth > 0 && row.height > 0);
          totalWidth += tileWidth;
        }
        assert.ok(totalWidth <= width + 0.001, "rows must fit narrow screens");
        if (totalWidth < width - 0.001) assert.equal(row.centered, true);
      }
    }
  }
});

test("width limits apply to non-trailing rows too", () => {
  const rows = buildJustifiedRows(
    Array.from({ length: 3 }, (_, item) => ({ item, ratio: 16 / 9 })),
    1440, 16, { ...studioOptions, maxColumns: 1 },
  );
  assert.equal(rows.length, 3);
  for (const row of rows) {
    assert.equal(row.centered, true);
    assert.ok(Math.abs(row.height - 315) < 0.001);
  }
});

test("other galleries retain their uncapped layout when the option is omitted", () => {
  const entries = [{ item: "landscape", ratio: 16 / 9 }, { item: "portrait", ratio: 9 / 16 }];
  assert.deepEqual(buildJustifiedRows(entries, 1440, 16),
    buildJustifiedRows(entries, 1440, 16, { maxTileWidth: Infinity }));
  assert.ok(buildJustifiedRows([{ item: 0, ratio: 16 / 9 }], 1440, 16)[0].height * 16 / 9 > 560);
});
