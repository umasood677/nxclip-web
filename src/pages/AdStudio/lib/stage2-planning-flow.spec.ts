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
    assumptions: ["Confirm refill availability"],
  });
  const refined = applyCampaignStrategy(expanded, {
    productOrService: expanded.productOrService, targetAudience: expanded.targetAudience,
    coreMessage: expanded.coreMessage, desiredTone: "Quiet", creativeDirection: "Use softer lighting",
    assumptions: expanded.planningAssumptions!,
    ...{ campaignIdea: "Overwrite attempt", headline: "Overwrite attempt", cta: "Overwrite attempt" },
  });
  assert.equal(refined.campaignIdea, project.brief.campaignIdea);
  assert.equal(refined.productOrService, "Refillable serum");
  assert.equal(refined.desiredTone, "Quiet");
  assert.equal(refined.creativeDirection, "Use softer lighting");
  assert.equal(refined.headline, "Refill your ritual");
  assert.equal(refined.supportingCopy, "");
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
    assert.equal(brief.supportingCopy, "");
    assert.equal(brief.cta, "Explore");
    assert.equal(brief.unverifiedAssetCount, 2);
    assert.deepEqual(brief.verifiedAssets, []);
  }
});
