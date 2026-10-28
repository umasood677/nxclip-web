import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateImageQuote,
  type ImageQuote,
} from "../pages/AdStudio/production/imageExecutionModel";
import {
  validateConceptQuote,
  type ConceptQuote,
} from "../pages/AdStudio/production/conceptExecutionModel";
import {
  requireExecutableAnalysisQuote,
  type BrandAnalysisQuote,
} from "../pages/BrandKits/analysis/brandAnalysisModel";
const common = {
  schemaVersion: "1.0" as const,
  sourceHash: "a".repeat(64),
  quoteHash: "b".repeat(64),
  catalogId: "fixture",
  provider: "gemini" as const,
  modelId: "fixture-model",
  estimatedCostUsd: null,
  pricingVersion: "beta-usage-only",
  costBasis: "usage-only" as const,
};
test("beta image preflight binds one model/image without a dollar quote", () => {
  const p: ImageQuote = {
    ...common,
    imageCount: 1,
    inputScope: "editable-ad-background",
    referenceCount: 0,
  };
  assert.equal(validateImageQuote(p), p);
  assert.throws(() => validateImageQuote({ ...p, estimatedCostUsd: 0 }));
  assert.throws(() => validateImageQuote({ ...p, sourceHash: "" }));
});
test("beta concept preflight retains bounded output and rejects heuristic substitution", () => {
  const p: ConceptQuote = {
    ...common,
    conceptCount: 4,
    maxOutputTokens: 6000,
    inputScope: "saved-campaign-text-only",
  };
  assert.equal(validateConceptQuote(p), p);
  assert.throws(() => validateConceptQuote({ ...p, maxOutputTokens: 100000 }));
  assert.throws(() =>
    validateConceptQuote({
      ...p,
      provider: "heuristic",
    } as unknown as ConceptQuote),
  );
});
test("beta brand analysis preflight must match the saved source", () => {
  const p: BrandAnalysisQuote = {
    ...common,
    sourceVersion: 3,
    maxOutputTokens: 2048,
    inputScope: "saved-brand-text-only",
  };
  assert.equal(requireExecutableAnalysisQuote(p, 3), p);
  assert.throws(() => requireExecutableAnalysisQuote(p, 4));
  assert.throws(() =>
    requireExecutableAnalysisQuote({ ...p, quoteHash: "" }, 3),
  );
});
