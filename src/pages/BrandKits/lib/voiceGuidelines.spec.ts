import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  creativeFromDraft,
  guidelinesDraftFromKit,
} from "../components/CreativeGuidelinesSection";
import {
  voiceDraftFromKit,
  voicePatchFromDraft,
} from "../components/BrandVoiceSection";
import { PREVIEW_MODES } from "./brandKitTypes";
import { ASSET_SLOTS, findReadyAsset } from "./assetSlots";

describe("Brand voice draft round-trip", () => {
  it("parses vocabulary lines and preferred CTA", () => {
    const draft = voiceDraftFromKit({
      tone: "editorial",
      doSay: ["couture", "signature red"],
      preferredCta: "Shop the shade",
    });
    draft.dontSay = "cheap\nmiracle";
    const patch = voicePatchFromDraft(draft);
    assert.equal(patch.tone, "editorial");
    assert.deepEqual(patch.doSay, ["couture", "signature red"]);
    assert.deepEqual(patch.dontSay, ["cheap", "miracle"]);
    assert.equal(patch.preferredCta, "Shop the shade");
  });
});

describe("Creative guidelines draft", () => {
  it("round-trips structured creative fields", () => {
    const draft = guidelinesDraftFromKit(
      { lighting: "soft key", prohibitedClaims: "No medical claims" },
      "Freeform note",
    );
    assert.equal(draft.lighting, "soft key");
    assert.equal(draft.freeformGuidelines, "Freeform note");
    const creative = creativeFromDraft(draft);
    assert.equal(creative.lighting, "soft key");
    assert.equal(creative.prohibitedClaims, "No medical claims");
  });
});

describe("Asset slots and preview modes", () => {
  it("includes ZoeArtisan acceptance roles", () => {
    const roles = ASSET_SLOTS.map((s) => s.role);
    assert.ok(roles.includes("logo_primary"));
    assert.ok(roles.includes("product_image"));
    assert.ok(roles.includes("brand_model"));
  });

  it("finds ready assets by role", () => {
    const hit = findReadyAsset(
      [
        { role: "brand_model", status: "pending" },
        { role: "brand_model", status: "ready", readUrl: "https://x" },
      ],
      "brand_model",
    );
    assert.equal(hit?.readUrl, "https://x");
  });

  it("exposes all BK-B preview modes", () => {
    const ids = PREVIEW_MODES.map((m) => m.id);
    for (const id of [
      "identity",
      "typography",
      "palette",
      "ig_portrait",
      "ig_story",
      "product",
      "logo_light",
      "logo_dark",
    ]) {
      assert.ok(ids.includes(id as (typeof ids)[number]));
    }
  });
});
