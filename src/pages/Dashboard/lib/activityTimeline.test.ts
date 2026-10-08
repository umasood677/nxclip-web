import assert from "node:assert/strict";
import { test } from "node:test";
import { buildActivityTimeline } from "./activityTimeline";

test("selected ranges end today and exclude future, invalid, and older activity", () => {
  const now = new Date(2026, 9, 8, 12);
  const stamps = [
    new Date(2026, 9, 2, 0).toISOString(),
    new Date(2026, 9, 8, 10).toISOString(),
    new Date(2026, 9, 8, 13).toISOString(),
    new Date(2026, 9, 9).toISOString(),
    new Date(2026, 9, 1, 23, 59).toISOString(),
    "invalid", null,
  ];
  const week = buildActivityTimeline(stamps, 7, "en", now);
  assert.equal(week[0].date, "2026-10-02");
  assert.equal(week.at(-1)?.date, "2026-10-08");
  assert.equal(week.reduce((sum, day) => sum + day.posts, 0), 2);
  for (const days of [7, 30, 90]) {
    const timeline = buildActivityTimeline([], days, "ar", now);
    assert.equal(timeline.length, days);
    assert.equal(timeline.at(-1)?.date, "2026-10-08");
    assert.equal(new Set(timeline.map(day => day.date)).size, days);
  }
});

test("range crosses month and year boundaries in chronological order", () => {
  const timeline = buildActivityTimeline([], 7, "en", new Date(2026, 0, 3, 12));
  assert.deepEqual(timeline.map(day => day.date), [
    "2025-12-28", "2025-12-29", "2025-12-30", "2025-12-31", "2026-01-01", "2026-01-02", "2026-01-03",
  ]);
});

test("calendar days remain consecutive across daylight-saving transitions", () => {
  for (const now of [new Date(2026, 2, 10, 12), new Date(2026, 10, 3, 12)]) {
    const timeline = buildActivityTimeline([], 7, "en", now);
    assert.equal(timeline.length, 7);
    assert.equal(new Set(timeline.map(day => day.date)).size, 7);
    for (let index = 1; index < timeline.length; index++) {
      const previous = new Date(`${timeline[index - 1].date}T12:00:00`);
      previous.setDate(previous.getDate() + 1);
      const current = new Date(`${timeline[index].date}T12:00:00`);
      assert.equal(previous.getTime(), current.getTime());
    }
  }
});
