import { test } from "node:test";
import assert from "node:assert/strict";
import { campaignProductionBrief } from "./campaignProductionBrief";
import { approvedCampaignProductPhotos, campaignProductSuggestion } from "./campaignProductReference";
import { directionNeedsBrandModel } from "./campaignModelReference";
import { projectBriefForm, saveWorkspaceBrief, type WorkspaceBrief } from "./projectWorkspace";
import type { AdConcept } from "../types";

const direction: AdConcept = {
  conceptId: "concept", title: "Editorial", creativeDirection: "Soft studio light",
  primaryHeadline: "Proposed headline", supportingCopy: "Proposed copy", cta: "Proposed CTA",
  visualPrompt: "Portrait", composition: "Asymmetric", colorRecommendations: [],
  typographyRecommendations: [], platformSuitability: [],
};

test("a wearer in a creative direction needs a model reference", () => {
  assert.equal(directionNeedsBrandModel({ ...direction, creativeDirection: "Showcase the wearer's elegance." }), true);
  assert.equal(directionNeedsBrandModel({ ...direction, visualPrompt: "A woman wearing the lipstick." }), true);
  assert.equal(directionNeedsBrandModel({ ...direction, visualPrompt: "Lipstick on a marble pedestal." }), false);
});

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

test("an approved additional image is a production style reference until approval is revoked", () => {
  const project = { id: "project", name: "Campaign", brandKitId: "kit", brief: { referenceImageAssetId: "style" } };
  const studio = {
    schemaVersion: 1 as const, categoryId: "beauty", nicheId: "care", businessGoals: [],
    identityApproved: true, guidelinesApproved: true, characters: [],
  };
  const brand = {
    id: "kit", name: "Test Kit",
    assets: [{ id: "style", role: "other", status: "ready", mimeType: "image/webp" }],
  };
  assert.equal(projectBriefForm(project).referenceImageAssetId, "style");
  const approved = campaignProductionBrief(project, direction, { ...brand, voice: { studio: { ...studio, approvedAssetIds: ["style"] } } });
  assert.deepEqual(approved.verifiedAssets.map(asset => asset.id), ["style"]);
  const revoked = campaignProductionBrief(project, direction, { ...brand, voice: { studio: { ...studio, approvedAssetIds: [] } } });
  assert.equal(revoked.verifiedAssets.length, 0);
  assert.equal(revoked.unverifiedAssetCount, 1);
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
test("a unique approved product suggestion is confirmed, persisted and passed to production", async () => {
  const brand = {
    id: "kit", name: "ZoeArtisan",
    products: [{ id: "maroon", name: "Matte Maroon", status: "active" }],
    assets: [
      { id: "maroon-photo", label: "Matte Maroon product shot", role: "product_image", status: "ready" },
      { id: "red-photo", label: "Matte Red", role: "product_image", status: "ready" },
      { id: "unapproved", label: "Matte Maroon", role: "product_image", status: "ready" },
    ],
    voice: { studio: {
      schemaVersion: 1 as const, categoryId: "beauty", nicheId: "lipstick", businessGoals: [],
      approvedAssetIds: ["maroon-photo", "red-photo"], identityApproved: true, guidelinesApproved: true,
    } },
  };
  const photos = approvedCampaignProductPhotos(brand);
  const suggestion = campaignProductSuggestion(brand, photos, "Show Matte Maroon in evening light.");
  assert.equal(suggestion?.id, "maroon-photo");
  assert.equal(campaignProductSuggestion(brand, photos, "Show Matte Maroon and Matte Red."), undefined);
  const project = { id: "project", name: "Campaign", brandKitId: brand.id,
    brief: { campaignIdea: "Show Matte Maroon in evening light.", headline: "Matte Maroon" } };
  const api = { updateProject: async (_id: string, body: Record<string, unknown>) => ({ ...project, brief: body.brief as WorkspaceBrief }) };
  const saved = await saveWorkspaceBrief(api, project, { ...projectBriefForm(project), productImageAssetId: suggestion?.id });
  assert.equal(projectBriefForm(saved).productImageAssetId, "maroon-photo");
  assert.deepEqual(campaignProductionBrief(saved, direction, brand).verifiedAssets.map(asset => asset.id), ["maroon-photo"]);
  const cleared = await saveWorkspaceBrief(api, saved, { ...projectBriefForm(saved), productImageAssetId: null });
  assert.equal(projectBriefForm(cleared).productImageAssetId, null);
  assert.deepEqual(campaignProductionBrief(cleared, direction, brand).verifiedAssets, []);
});
