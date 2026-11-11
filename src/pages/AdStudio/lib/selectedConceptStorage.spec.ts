import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { readSelectedConceptId, readSelectedConceptIds, writeSelectedConceptId, writeSelectedConceptIds } from "./selectedConceptStorage";

const values = new Map<string, string>();

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  },
});

afterEach(() => values.clear());

test("persists a deduplicated multi-direction selection and supports legacy single selection", () => {
  writeSelectedConceptIds("campaign", ["serene", "ritual", "serene"]);
  assert.deepEqual(readSelectedConceptIds("campaign"), ["serene", "ritual"]);
  assert.equal(readSelectedConceptId("campaign"), "serene");

  writeSelectedConceptId("campaign", "legacy");
  assert.deepEqual(readSelectedConceptIds("campaign"), ["legacy"]);
});

test("removes selection when no directions remain", () => {
  writeSelectedConceptIds("campaign", ["serene"]);
  writeSelectedConceptIds("campaign", []);
  assert.deepEqual(readSelectedConceptIds("campaign"), []);
  assert.equal(readSelectedConceptId("campaign"), null);
});
