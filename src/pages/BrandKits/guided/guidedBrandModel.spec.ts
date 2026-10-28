import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BRAND_TAXONOMY,
  changeGuidedCategory,
  draftFromKit,
  guidedErrors,
  guidedPayload,
  isGuidedBrandEnabled,
  newGuidedDraft,
} from "./guidedBrandModel";
import type { BrandKitSummary } from "../lib/brandKitTypes";
test("guided integration stays disabled unless explicitly enabled", () => {
  assert.equal(isGuidedBrandEnabled({}), false);
  assert.equal(
    isGuidedBrandEnabled({ VITE_AD_STUDIO_GUIDED_BRAND_ENABLED: "false" }),
    false,
  );
  assert.equal(
    isGuidedBrandEnabled({ VITE_AD_STUDIO_GUIDED_BRAND_ENABLED: "true" }),
    true,
  );
});
test("category changes reset dependent review and use existing canonical niches", () => {
  const draft = changeGuidedCategory(
    {
      ...newGuidedDraft(),
      identityApproved: true,
      guidelinesApproved: true,
      taxonomyConfirmed: true,
    },
    "Gaming",
  );
  assert.ok(
    BRAND_TAXONOMY.find((c) => c.id === "Gaming")?.niches.some(
      (n) => n.id === "game-launches-trailers",
    ),
  );
  assert.equal(draft.identityApproved, false);
  assert.equal(draft.taxonomyConfirmed, false);
  assert.ok(draft.nicheId);
});
test("legacy identity metadata, optional palette roles and uploaded fonts survive guided editing", () => {
  const kit: BrandKitSummary = {
    id: "owned-kit",
    name: "Existing",
    version: 7,
    voice: {
      tone: "Warm",
      creative: { lighting: "Soft" },
      futureMetadata: { retain: true },
    },
    colors: [
      { role: "primary", hex: "#123456" },
      { role: "accent", hex: "#abcdef" },
    ],
    typography: [
      {
        role: "heading",
        family: "Custom Font",
        assetId: "owned-font",
        fallbackStack: "sans-serif",
      },
    ],
  };
  const draft = draftFromKit(kit);
  draft.name = "Updated";
  const payload = guidedPayload(draft, kit);
  assert.equal(payload.voice.creative?.lighting, "Soft");
  assert.deepEqual(payload.voice.futureMetadata, { retain: true });
  assert.equal(payload.colors[1].role, "accent");
  assert.equal(payload.typography[0].assetId, "owned-font");
  assert.equal(payload.typography[0].fallbackStack, "sans-serif");
});
test("response-only fields never leak into identity input DTOs", () => {
  const kit: BrandKitSummary = {
    id: "owned-kit",
    name: "Brand",
    colors: [
      Object.assign(
        { role: "primary", hex: "#123456" },
        { id: "response-color-id" },
      ),
    ],
  };
  const payload = guidedPayload(draftFromKit(kit), kit);
  assert.equal("id" in payload.colors[0], false);
});
test("completion requires explicit reviewed identity, goals and canonical taxonomy", () => {
  const draft = newGuidedDraft();
  draft.name = "Brand";
  assert.ok(guidedErrors(draft, true).length);
  Object.assign(draft, changeGuidedCategory(draft, "Gaming"), {
    taxonomyConfirmed: true,
    goals: ["Increase awareness"],
    personality: "Energetic",
    tone: "Confident",
    identityApproved: true,
    guidelinesApproved: true,
  });
  assert.deepEqual(guidedErrors(draft, true), []);
  draft.nicheId = "invented";
  assert.ok(guidedErrors(draft, true).length);
});
test("saving a named draft does not fabricate identity approval or AI analysis", () => {
  const draft = newGuidedDraft();
  draft.name = "New Brand";
  assert.deepEqual(guidedErrors(draft), []);
  assert.equal(guidedPayload(draft).voice.studio, undefined);
  assert.equal(draft.identityApproved, false);
});
