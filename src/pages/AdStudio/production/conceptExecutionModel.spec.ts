import { test } from "node:test";
import assert from "node:assert/strict";
import {
  realConceptsEnabled,
  validateConceptQuote,
  requireAiConceptResult,
  type ConceptQuote,
} from "./conceptExecutionModel";
const quote = (): ConceptQuote => ({
  schemaVersion: "1.0",
  quoteHash: "a".repeat(64),
  sourceHash: "b".repeat(64),
  catalogId: "gemini:synthetic",
  provider: "gemini",
  modelId: "synthetic-model",
  conceptCount: 4,
  maxOutputTokens: 6000,
  estimatedCostUsd: 0.01,
  pricingVersion: "fixture",
  inputScope: "saved-campaign-text-only",
  costBasis: "configured-estimate",
});
test("real concept execution requires exact explicit frontend gate", () => {
  for (const flag of [undefined, false, true, "false", "TRUE"])
    assert.equal(
      realConceptsEnabled({ VITE_AD_STUDIO_REAL_CONCEPTS_ENABLED: flag }),
      false,
    );
  assert.equal(
    realConceptsEnabled({ VITE_AD_STUDIO_REAL_CONCEPTS_ENABLED: "true" }),
    true,
  );
});
test("quote verifies bounded configured price and source provenance", () => {
  assert.equal(validateConceptQuote(quote(), 0.1).modelId, "synthetic-model");
  for (const patch of [
    { estimatedCostUsd: NaN },
    { estimatedCostUsd: Infinity },
    { estimatedCostUsd: 0.5 },
    { quoteHash: "wrong" },
    { sourceHash: "" },
    { conceptCount: 6 },
    { maxOutputTokens: 0 },
    { maxOutputTokens: 10000 },
    { inputScope: "private-images" },
    { provider: "unsupported" },
  ])
    assert.throws(
      () => validateConceptQuote({ ...quote(), ...patch } as ConceptQuote, 0.1),
      /could not be verified/,
    );
  for (const budget of [0, NaN, Infinity, 2])
    assert.throws(
      () => validateConceptQuote(quote(), budget),
      /could not be verified/,
    );
});
test("heuristic, untracked, duplicate or empty concept output cannot be reported as real AI", () => {
  const base = {
    generationSource: "ai" as const,
    provider: "gemini",
    jobId: "job",
    concepts: Array.from({ length: 4 }, (_, i) => ({
      conceptId: "id" + i,
      primaryHeadline: "Real copy",
    })),
  };
  assert.equal(
    requireAiConceptResult(base as Parameters<typeof requireAiConceptResult>[0])
      .jobId,
    "job",
  );
  for (const patch of [
    { generationSource: "heuristic" },
    { jobId: "" },
    { concepts: [] },
    { concepts: base.concepts.map(() => base.concepts[0]) },
  ])
    assert.throws(
      () =>
        requireAiConceptResult({ ...base, ...patch } as Parameters<
          typeof requireAiConceptResult
        >[0]),
      /validated AI concept batch/,
    );
});
