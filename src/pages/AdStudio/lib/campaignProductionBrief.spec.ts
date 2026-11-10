import { test } from "node:test";
import assert from "node:assert/strict";
import { campaignProductionBrief } from "./campaignProductionBrief";
import type { AdConcept } from "../types";

const direction: AdConcept = {
  conceptId: "concept", title: "Editorial", creativeDirection: "Soft studio light",
  primaryHeadline: "Proposed headline", supportingCopy: "Proposed copy", cta: "Proposed CTA",
  visualPrompt: "Portrait", composition: "Asymmetric", colorRecommendations: [],
  typographyRecommendations: [], platformSuitability: [],
};

test("production brief gives approved campaign copy precedence and keeps deliberate empty supporting copy", () => {
  const result = campaignProductionBrief({
    id: "project", name: "Test", brandKitId: "kit", outputFormat: "portrait_1080x1350",
    brief: { headline: "Approved headline", supportingCopy: "", cta: "Approved CTA", negativeInstructions: "No medical claims" },
  }, direction);
  assert.equal(result.headline, "Approved headline");
  assert.equal(result.supportingCopy, "");
  assert.equal(result.cta, "Approved CTA");
  assert.equal(result.restrictions, "No medical claims");
  assert.equal(result.brandKitId, "kit");
  assert.equal(direction.primaryHeadline, "Proposed headline");
});

test("unbranded production brief uses the selected concept copy", () => {
  const result = campaignProductionBrief({ id: "project", name: "Service campaign" }, direction);
  assert.equal(result.headline, direction.primaryHeadline);
  assert.equal(result.supportingCopy, direction.supportingCopy);
  assert.equal(result.cta, direction.cta);
  assert.equal(result.brandKitId, undefined);
});
import { projectBriefForm } from "./projectWorkspace";

test("reopening an approved brief preserves explicit copy over labels in the original idea", () => {
  const form = projectBriefForm({
    id: "project", name: "Test",
    brief: {
      planningApproved: true, campaignIdea: "Headline: Old\nSupporting copy: Old\nCTA: Old",
      headline: "Approved", supportingCopy: "", cta: "Explore",
    },
  });
  assert.equal(form.headline, "Approved");
  assert.equal(form.supportingCopy, "");
  assert.equal(form.cta, "Explore");
});

test("production review only verifies selected ready assets from the project kit allowlist", () => {
  const result = campaignProductionBrief({
    id: "project", name: "Test", brandKitId: "kit",
    brief: { productImageAssetId: "ready", referenceImageAssetId: "pending" },
  }, direction, {
    id: "kit", name: "Test Kit",
    voice: { studio: { approvedAssetIds: ["ready", "pending"], characters: [], schemaVersion: 1,
      categoryId: "beauty", nicheId: "care", businessGoals: [], identityApproved: true, guidelinesApproved: true } },
    assets: [
      { id: "ready", status: "ready", role: "product_image" },
      { id: "pending", status: "pending", role: "product_image" },
    ],
  });
  assert.deepEqual(result.verifiedAssets.map(asset => asset.id), ["ready"]);
  assert.equal(result.unverifiedAssetCount, 1);
});

test("production review includes a model only when its approved profile is selected", () => {
  const brand = {
    id: "kit", name: "Test Kit",
    voice: { studio: { approvedAssetIds: ["product", "model"], characters: [{
      id: "model-profile", name: "Approved model", kind: "human-model" as const,
      status: "approved" as const, referenceAssetIds: ["model"], appearance: "", style: "", wardrobe: "", expressions: "", consistencyRules: "",
      permissions: { commercialUse: true, likenessConsent: true, origin: "consented" as const, scopes: ["ad-studio" as const], evidence: "" },
    }], schemaVersion: 1 as const, categoryId: "beauty", nicheId: "care", businessGoals: [], identityApproved: true, guidelinesApproved: true } },
    assets: [
      { id: "product", status: "ready", role: "product_image" },
      { id: "model", status: "ready", role: "brand_model" },
    ],
  };
  const withoutModel = campaignProductionBrief({ id: "project", name: "Test", brandKitId: "kit", brief: { productImageAssetId: "product" } }, direction, brand);
  assert.deepEqual(withoutModel.verifiedAssets.map(asset => asset.id), ["product"]);
  assert.equal(withoutModel.selectedModelName, undefined);
  const withModel = campaignProductionBrief({ id: "project", name: "Test", brandKitId: "kit", brief: { productImageAssetId: "product", preferredModelProfile: "model-profile" } }, direction, brand);
  assert.deepEqual(withModel.verifiedAssets.map(asset => asset.id), ["product", "model"]);
  assert.equal(withModel.selectedModelName, "Approved model");
});
