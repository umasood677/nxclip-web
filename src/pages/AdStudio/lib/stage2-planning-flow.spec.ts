import { test } from "node:test";
import assert from "node:assert/strict";
import { applyCampaignStrategy } from "../production/conceptExecutionModel";
import { projectBriefForm } from "./projectWorkspace";
import { campaignProductionBrief } from "./campaignProductionBrief";
import type { AdConcept } from "../types";

test("mocked brief expansion and refinement preserve protected input through production review", () => {
  const project = {
    id: "campaign", name: "Refill", brandKitId: "kit",
    brief: { planningApproved: true, campaignIdea: "Introduce a refillable serum.", headline: "Refill your ritual",
      supportingCopy: "", cta: "Explore", productImageAssetId: "missing", referenceImageAssetId: "unauthorized" },
  };
  const initial = projectBriefForm(project);
  const expanded = applyCampaignStrategy(initial, {
    productOrService: "Refillable serum", targetAudience: "Evening skincare shoppers",
    coreMessage: "Simplify the ritual", desiredTone: "Confident", creativeDirection: "Product closeups",
    headline: "Suggested headline", supportingCopy: "Suggested copy", cta: "Suggested CTA",
    assumptions: ["Confirm refill availability"],
  });
  const refined = applyCampaignStrategy(expanded, {
    productOrService: expanded.productOrService, targetAudience: expanded.targetAudience,
    coreMessage: expanded.coreMessage, desiredTone: "Quiet", creativeDirection: "Use softer lighting",
    headline: "Overwrite attempt", supportingCopy: "Overwrite attempt", cta: "Overwrite attempt",
    assumptions: expanded.planningAssumptions!,
    ...{ campaignIdea: "Overwrite attempt", headline: "Overwrite attempt", cta: "Overwrite attempt" },
  });
  assert.equal(refined.campaignIdea, project.brief.campaignIdea);
  assert.equal(refined.productOrService, "Refillable serum");
  assert.equal(refined.desiredTone, "Quiet");
  assert.equal(refined.creativeDirection, "Use softer lighting");
  assert.equal(refined.headline, "Refill your ritual");
  assert.equal(refined.supportingCopy, "Suggested copy");
  assert.equal(refined.cta, "Explore");
  assert.deepEqual(refined.planningAssumptions, ["Confirm refill availability"]);

  const briefs = ["Refill demonstration", "Minimal product still life", "Lifestyle portrait"].map((composition, i) =>
    campaignProductionBrief({ ...project, brief: { ...project.brief, ...refined } }, {
      conceptId: String(i), title: composition, composition, creativeDirection: composition,
      claimWarnings: [],
    } as AdConcept, {
      id: "kit", name: "Kit", assets: [{ id: "unauthorized", role: "product_image", status: "ready" }],
    }));
  assert.equal(new Set(briefs.map(brief => brief.conceptId)).size, 3);
  assert.equal(new Set(briefs.map(brief => brief.composition)).size, 3);
  for (const brief of briefs) {
    assert.equal(brief.headline, "Refill your ritual");
    assert.equal(brief.supportingCopy, "Suggested copy");
    assert.equal(brief.cta, "Explore");
    assert.equal(brief.unverifiedAssetCount, 2);
    assert.deepEqual(brief.verifiedAssets, []);
  }
});

test("brief expansion recovers explicitly requested copy when an older retained response has no copy fields", () => {
  const initial = projectBriefForm({
    id: "campaign-copy", name: "Refill", brandKitId: null,
    brief: {
      campaignIdea: 'A quiet serum launch. Use the headline "Refill Your Ritual" and CTA "Explore the Serum".',
      headline: "", supportingCopy: "", cta: "Learn more",
    },
  });
  const expanded = applyCampaignStrategy(initial, {
    productOrService: "Refillable serum", targetAudience: "Evening skincare shoppers",
    coreMessage: "A calm ritual", desiredTone: "Confident", creativeDirection: "Soft evening still life",
    assumptions: [],
  });
  assert.equal(expanded.headline, "Refill Your Ritual");
  assert.equal(expanded.cta, "Explore the Serum");
});

test("brief expansion removes a test-only campaign prefix from the advertised subject", () => {
  const initial = projectBriefForm({
    id: "campaign-subject", name: "UAT 01 — Refillable Skincare Serum", brandKitId: null,
    brief: { campaignIdea: "Launch a refillable facial serum.", headline: "", supportingCopy: "", cta: "Learn more" },
  });
  const expanded = applyCampaignStrategy(initial, {
    productOrService: "UAT 01 — Refillable Skincare Serum", targetAudience: "Skincare shoppers",
    coreMessage: "A refined refill ritual", desiredTone: "Confident", creativeDirection: "Soft evening still life",
    headline: "Refill Your Ritual", supportingCopy: "", cta: "Explore the Serum", assumptions: [],
  });
  assert.equal(expanded.productOrService, "Refillable Skincare Serum");
});
