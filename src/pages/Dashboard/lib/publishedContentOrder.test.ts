import assert from "node:assert/strict";
import { test } from "node:test";
import { newestPublishedFirst } from "./publishedContentOrder";

test("publication date wins over engagement and original creation date", () => {
  const content = [
    { id: "yesterday", publishedAt: "2026-10-07T20:00:00Z", createdAt: "2026-10-07T10:00:00Z", views: 10000 },
    { id: "today", publishedAt: "2026-10-08T10:00:00Z", createdAt: "2026-10-01T10:00:00Z", views: 0 },
    { id: "earlier-today", publishedAt: "2026-10-08T08:00:00Z", views: 500 },
  ];
  assert.deepEqual([...content].sort(newestPublishedFirst).map(item => item.id), ["today", "earlier-today", "yesterday"]);
  assert.equal(content[0].id, "yesterday");
});

test("missing or invalid publication dates fall back to creation; unknown dates sort last", () => {
  const content = [
    { id: "unknown", publishedAt: "invalid", createdAt: "invalid" },
    { id: "missing", createdAt: "2026-10-07T08:00:00Z" },
    { id: "invalid", publishedAt: "invalid", createdAt: "2026-10-08T08:00:00Z" },
  ];
  assert.deepEqual(content.sort(newestPublishedFirst).map(item => item.id), ["invalid", "missing", "unknown"]);
});

test("equal publication dates preserve stable order and timezone offsets compare correctly", () => {
  const a = { publishedAt: "2026-10-08T12:00:00+05:00" };
  const b = { publishedAt: "2026-10-08T07:00:00Z" };
  assert.equal(newestPublishedFirst(a, b), 0);
  assert.ok(newestPublishedFirst({ publishedAt: "2026-10-08T08:00:00Z" }, a) < 0);
});
