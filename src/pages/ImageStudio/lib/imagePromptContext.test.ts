import assert from "node:assert/strict";
import { test } from "node:test";
import { parseImageBrief } from "./imagePromptContext";
test("parses short calendar briefs without replacing the visible idea", () => {
  const prompt =
    "Setup tour — Same setup. Cleaner clips. — Category: Gaming — Focus: Esports, Stream Highlights";
  assert.deepEqual(parseImageBrief(prompt, "content-calendar"), {
    source: "content-calendar",
    title: "Setup tour",
    hook: "Same setup. Cleaner clips.",
    category: "Gaming",
    focus: ["Esports", "Stream Highlights"],
  });
});
test("supports the existing Niche calendar label and ordinary manual ideas", () => {
  assert.equal(
    parseImageBrief("Setup tour — Cleaner clips — Niche: Gaming")?.category,
    "Gaming",
  );
  assert.deepEqual(parseImageBrief("A gaming desk"), { source: "manual" });
  assert.equal(
    parseImageBrief("Alternative setup", "suggestion")?.source,
    "suggestion",
  );
});
