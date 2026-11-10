import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateOriginalCampaignAd,
  type CampaignDraftInput,
  type CampaignImageApi,
} from "./originalCampaignAd";
import type { WorkspaceCreative } from "./projectWorkspace";
import type { ImageQuote } from "../production/imageExecutionModel";
const input: CampaignDraftInput = {
  requestId: "request",
  instruction: "Campaign photography",
  headline: "Campaign headline",
  supportingCopy: "Copy",
  cta: "Explore",
  references: [],
};
const draft: WorkspaceCreative = {
  id: "draft",
  projectId: "campaign",
  name: "Ad",
  currentVersion: 1,
  conceptSnapshot: { purpose: "ORIGINAL_AI" },
  sceneGraph: {
    schemaVersion: "1.0",
    canvas: { width: 1080, height: 1350 },
    layers: [],
  },
};
const quote: ImageQuote = {
  schemaVersion: "1.0",
  sourceHash: "a".repeat(64),
  quoteHash: "b".repeat(64),
  catalogId: "fixture",
  provider: "vertex",
  modelId: "fixture",
  estimatedCostUsd: null,
  pricingVersion: "usage-only",
  imageCount: 1,
  inputScope: "editable-campaign-ad",
  referenceCount: 0,
  costBasis: "usage-only",
};
function fixture() {
  const calls: string[] = [],
    bodies: unknown[] = [];
  const api: CampaignImageApi = {
    draft: async (_id, body) => {
      calls.push("draft");
      bodies.push(body);
      return structuredClone(draft);
    },
    quote: async (_id, body) => {
      calls.push("quote");
      bodies.push(body);
      return quote;
    },
    execute: async (_id, body) => {
      calls.push("execute");
      bodies.push(body);
      return {
        ...draft,
        currentVersion: 2,
        sceneGraph: {
          ...draft.sceneGraph!,
          layers: [
            {
              id: "ai-background-result",
              type: "image",
              x: 0,
              y: 0,
              width: 1080,
              height: 1350,
              zIndex: 0,
            },
          ],
        },
      };
    },
  };
  return { api, calls, bodies };
}
test("explicit generation creates one campaign creative, quotes its own scope and executes one bound request", async () => {
  const f = fixture();
  const saved = await generateOriginalCampaignAd(
    f.api,
    "campaign",
    input,
    () => f.calls.push("prepared"),
    { onExecuting: () => f.calls.push("authorized") },
  );
  assert.ok(saved);
  assert.equal(saved.id, draft.id);
  assert.deepEqual(f.calls, [
    "draft",
    "prepared",
    "quote",
    "authorized",
    "execute",
  ]);
  assert.deepEqual(f.bodies[1], {
    executionScope: "campaign-photography",
    expectedVersion: 1,
    operation: "generate",
    instruction: input.instruction,
  });
  assert.equal(
    (f.bodies[2] as { requestId: string }).requestId,
    input.requestId,
  );
});
test("old AI scope and foreign project stop before execution", async () => {
  const f = fixture();
  f.api.quote = async () => ({
    ...quote,
    inputScope: "editable-ad-background",
  });
  await assert.rejects(
    generateOriginalCampaignAd(f.api, "campaign", input, () => {}),
    /running services/,
  );
  assert.ok(!f.calls.includes("execute"));
  f.api.draft = async () => ({ ...draft, projectId: "foreign" });
  await assert.rejects(
    generateOriginalCampaignAd(f.api, "campaign", input, () => {}),
    /verified/,
  );
});
test("provider uncertainty is not automatically retried", async () => {
  const f = fixture();
  let executes = 0;
  f.api.execute = async () => {
    executes++;
    throw Error("upstream unavailable");
  };
  await assert.rejects(
    generateOriginalCampaignAd(f.api, "campaign", input, () => {}),
    /upstream/,
  );
  assert.equal(executes, 1);
});
test("replayed initial draft with completed photography is reopened without quote or generation", async () => {
  const f = fixture();
  const completed = await f.api.execute("draft", {
    expectedVersion: 1,
    operation: "generate",
    instruction: "",
    requestId: "request",
    approvedQuoteHash: "hash",
    allowPaidProvider: true,
  });
  f.calls.length = 0;
  f.api.draft = async () => completed;
  assert.equal(
    (await generateOriginalCampaignAd(f.api, "campaign", input, () => {})).id,
    completed.id,
  );
  assert.deepEqual(f.calls, []);
});
test("a variation always creates a distinct request-bound campaign draft before execution", async () => {
  const f = fixture();
  await generateOriginalCampaignAd(f.api, "campaign", {
    ...input,
    requestId: "variation-request",
    sourceCreativeId: "saved-source",
  }, () => {});
  assert.deepEqual(f.calls, ["draft", "quote", "execute"]);
  assert.equal((f.bodies[0] as { sourceCreativeId?: string }).sourceCreativeId, "saved-source");
  assert.equal((f.bodies[1] as { operation: string }).operation, "generate");
});

test("production review can decline a quote without executing or allocating another draft", async () => {
  const f = fixture();
  const retained = { ...input, conceptId: "direction" };
  const result = await generateOriginalCampaignAd(f.api, "campaign", retained, () => {}, {
    authorizeQuote: async received => {
      assert.equal(received.quoteHash, quote.quoteHash);
      return false;
    },
  });
  assert.equal(result, null);
  assert.deepEqual(f.calls, ["draft", "quote"]);
  assert.equal(f.bodies[0], retained);
});
