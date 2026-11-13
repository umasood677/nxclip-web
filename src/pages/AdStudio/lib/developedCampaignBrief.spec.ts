import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_AD_BRIEF } from "./adStudioLabels";
import { projectBriefForm, workspaceBrief } from "./projectWorkspace";
import { applyCampaignStrategy } from "../production/conceptExecutionModel";

test("development and refinement preserve source and explicit copy through persistence", () => {
  const original = { ...DEFAULT_AD_BRIEF, campaignIdea: 'Launch a refillable serum. Headline: "Refill Your Ritual"', negativeInstructions: "No medical claims" };
  const concept = { title: "The ritual returns", narrative: "Open on an empty bottle, then reveal how it refills.", proposition: "Keep the bottle", angle: "Familiarity", storytelling: "Use a before and after sequence." };
  const strategy = { developedConcept: concept, advertisingObjective: "brand_awareness", creativeGuardrails: "Use the original packaging.", productOrService: "Refillable serum", targetAudience: "Skincare shoppers", coreMessage: "A refillable evening ritual", desiredTone: "Warm", creativeDirection: "Quiet evening light", headline: "Suggested copy", assumptions: [] };
  const developed = applyCampaignStrategy(original, strategy);
  const refined = applyCampaignStrategy(developed, { ...strategy, developedConcept: { ...concept, angle: "Anticipation" } });
  const project = { id: "project", name: "Launch", brief: original };
  const saved = workspaceBrief(project, refined, { approvePlanning: true });
  const reopened = projectBriefForm({ ...project, brief: saved });
  assert.equal(reopened.campaignIdea, original.campaignIdea);
  assert.equal(reopened.headline, "Refill Your Ritual");
  assert.equal(reopened.negativeInstructions, original.negativeInstructions);
  assert.equal(reopened.developedConcept?.angle, "Anticipation");
  assert.equal(developed.developedConcept?.angle, "Familiarity");
  assert.equal(saved.planningApproved, true);
});
