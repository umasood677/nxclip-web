import assert from "node:assert/strict";
import { test } from "node:test";
import { describeImageEditError } from "./imageEditError";

test("shows the backend rejection and correlation reference", () => {
  assert.equal(describeImageEditError({ statusCode: 400, message: "Background removal did not isolate a subject.", correlationId: "trace_test" }),
    "Background removal did not isolate a subject.\nReference: trace_test");
});
test("shows all validation messages instead of the generic retry text", () => {
  assert.equal(describeImageEditError({ message: [" Invalid mode ", "Invalid color", null, {}] }), "Invalid mode · Invalid color");
});
test("supports nested Axios response payloads", () => {
  assert.equal(describeImageEditError({ message: "Request failed", response: { data: { message: "Upstream service unavailable", correlationId: "trace_502" } } }),
    "Upstream service unavailable\nReference: trace_502");
});
test("preserves standard Error messages", () => {
  assert.equal(describeImageEditError(new Error("Network connection failed")), "Network connection failed");
});
test("uses a safe fallback for empty or unstructured errors", () => {
  for (const value of [undefined, null, {}, { message: [] }, { message: { unexpected: true } }]) {
    assert.equal(describeImageEditError(value), "Please try again.");
  }
  assert.equal(describeImageEditError("Request failed"), "Request failed");
});
