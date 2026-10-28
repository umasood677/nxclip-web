import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyBrandAnalysisProposal,
  isBrandAnalysisEnabled,
  requireExecutableAnalysisQuote,
  type BrandAnalysisProposal,
  type BrandAnalysisQuote,
} from "./brandAnalysisModel";
import { newGuidedDraft } from "../guided/guidedBrandModel";
const proposal: BrandAnalysisProposal = {
  description: "Proposed direction",
  audience: "Adults",
  tone: "Confident",
  personality: "Premium",
  palette: [
    { role: "primary", hex: "#112233" },
    { role: "accent", hex: "#ffffff" },
  ],
  visualStyle: "Minimal",
  lighting: "Soft",
  typographyDirection: "Refined contrast",
  rationale: ["Owner brief"],
  warnings: ["Unverified creative direction"],
};
test("real analysis is disabled unless its exact gate is enabled", () => {
  assert.equal(isBrandAnalysisEnabled({}), false);
  assert.equal(
    isBrandAnalysisEnabled({ VITE_AD_STUDIO_BRAND_ANALYSIS_ENABLED: "true" }),
    true,
  );
  assert.equal(
    isBrandAnalysisEnabled({ VITE_AD_STUDIO_BRAND_ANALYSIS_ENABLED: true }),
    false,
  );
});
test("only explicitly selected proposal fields change and approval resets", () => {
  const original = {
    ...newGuidedDraft(),
    description: "Original",
    tone: "Warm",
    identityApproved: true,
    guidelinesApproved: true,
  };
  const next = applyBrandAnalysisProposal(original, proposal, ["description"]);
  assert.equal(next.description, proposal.description);
  assert.equal(next.tone, "Warm");
  assert.equal(original.description, "Original");
  assert.equal(next.identityApproved, false);
  assert.equal(next.guidelinesApproved, false);
});
test("no selection performs no hidden update or approval change", () => {
  const original = {
    ...newGuidedDraft(),
    identityApproved: true,
    guidelinesApproved: true,
  };
  assert.equal(applyBrandAnalysisProposal(original, proposal, []), original);
});
test("palette application preserves other roles, optional metadata, fonts and existing asset-use selections", () => {
  const original = {
    ...newGuidedDraft(),
    approvedAssetIds: ["owner-approved"],
    colors: [
      {
        id: "primary-row",
        role: "primary",
        hex: "#000000",
        name: "Custom primary",
        sortOrder: 3,
      },
      { role: "text", hex: "#eeeeee", name: "Text" },
    ],
    typography: [
      {
        role: "heading",
        family: "Owner font",
        assetId: "owned-font",
        fallbackStack: "serif",
      },
    ],
  };
  const next = applyBrandAnalysisProposal(original, proposal, ["palette"]);
  assert.deepEqual(next.colors[0], {
    id: "primary-row",
    role: "primary",
    hex: "#112233",
    name: "Custom primary",
    sortOrder: 3,
  });
  assert.equal(next.colors.find((c) => c.role === "text")?.hex, "#eeeeee");
  assert.deepEqual(next.typography, original.typography);
  assert.deepEqual(next.approvedAssetIds, ["owner-approved"]);
});
test("AI guidance appends to existing guidelines instead of erasing them", () => {
  const original = {
    ...newGuidedDraft(),
    guidelines: "Keep the original printed branding.",
  };
  const next = applyBrandAnalysisProposal(original, proposal, ["guidelines"]);
  assert.ok(next.guidelines.startsWith(original.guidelines));
  assert.match(next.guidelines, /Proposed typography direction/);
  assert.equal(next.categoryId, original.categoryId);
});
test("over-limit suggestions are rejected without losing the original draft", () => {
  const original = { ...newGuidedDraft(), description: "Original" };
  assert.throws(
    () =>
      applyBrandAnalysisProposal(
        original,
        { ...proposal, description: "x".repeat(2001) },
        ["description"],
      ),
    /field limits/,
  );
  assert.equal(original.description, "Original");
});
test("a quote must match saved source, real provider, known estimate and budget before authorization", () => {
  const quote: BrandAnalysisQuote = {
    schemaVersion: "1.0",
    sourceVersion: 3,
    sourceHash: "a".repeat(64),
    quoteHash: "b".repeat(64),
    catalogId: "configured-model",
    provider: "gemini",
    modelId: "configured-model",
    estimatedCostUsd: 0.003,
    pricingVersion: "config_estimate_v1",
    maxOutputTokens: 2048,
    costBasis: "configured-estimate",
    inputScope: "saved-brand-text-only",
  };
  assert.equal(requireExecutableAnalysisQuote(quote, 3, 0.05), quote);
  assert.throws(() => requireExecutableAnalysisQuote(quote, 4, 0.05));
  assert.throws(() =>
    requireExecutableAnalysisQuote(
      { ...quote, estimatedCostUsd: 0.2 },
      3,
      0.05,
    ),
  );
  assert.throws(() =>
    requireExecutableAnalysisQuote(
      { ...quote, provider: "heuristic" },
      3,
      0.05,
    ),
  );
  assert.throws(() =>
    requireExecutableAnalysisQuote(
      { ...quote, inputScope: "private-images" },
      3,
      0.05,
    ),
  );
});
