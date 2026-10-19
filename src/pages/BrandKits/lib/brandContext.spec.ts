import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyBrandKitToBriefForm,
  normalizeBrandContext,
  seedBriefFromBrand,
} from "./brandContext";
import type { BrandKitSummary } from "./brandKitTypes";

const zoe: BrandKitSummary = {
  id: "zoe-1",
  name: "ZoeArtisan",
  description: "Premium beauty",
  voice: {
    industry: "Luxury Beauty & Cosmetics",
    tagline: "Wear Your Power.",
    signatureProduct: "Signature Red Matte Lipstick",
    targetAudience: "Luxury beauty consumers 25–45",
    tone: "Editorial, intimate, precise",
    preferredCta: "Shop the shade",
  },
  colors: [
    { role: "primary", hex: "#A6192E" },
    { role: "background", hex: "#0D0B0C" },
  ],
  typography: [
    { role: "heading", family: "Playfair Display" },
    { role: "body", family: "Montserrat" },
  ],
};

describe("brandContext", () => {
  it("normalizes ZoeArtisan kit fields", () => {
    const ctx = normalizeBrandContext(zoe);
    assert.ok(ctx);
    assert.equal(ctx!.signatureProduct, "Signature Red Matte Lipstick");
    assert.equal(ctx!.colors.primary, "#A6192E");
    assert.equal(ctx!.typography.headline, "Playfair Display");
  });

  it("seeds empty brief fields without overwriting user copy", () => {
    const seeded = seedBriefFromBrand(zoe, {
      name: "New ad project",
      productOrService: "",
      cta: "Learn more",
      coreMessage: "Keep my message",
      targetAudience: "",
      desiredTone: "confident",
    });
    assert.equal(seeded.productOrService, "Signature Red Matte Lipstick");
    assert.equal(seeded.cta, "Shop the shade");
    assert.equal(seeded.targetAudience, "Luxury beauty consumers 25–45");
    assert.equal(seeded.coreMessage, undefined);
    assert.equal(seeded.name, "ZoeArtisan campaign");
  });

  it("clears stale brand seeds when switching kits", () => {
    const other: BrandKitSummary = {
      id: "other-1",
      name: "OtherCo",
      voice: {
        signatureProduct: "Other SKU",
        preferredCta: "Buy now",
        tagline: "Other tagline",
      },
    };
    const prior = {
      brandKitId: "zoe-1",
      name: "ZoeArtisan campaign",
      productOrService: "Signature Red Matte Lipstick",
      cta: "Shop the shade",
      coreMessage: "Keep my message",
      targetAudience: "Luxury beauty consumers 25–45",
      desiredTone: "Editorial, intimate, precise",
    };
    const switched = {
      ...prior,
      ...applyBrandKitToBriefForm("zoe-1", "other-1", [zoe, other], prior),
    };
    assert.equal(switched.productOrService, "Other SKU");
    assert.equal(switched.cta, "Buy now");
    assert.equal(switched.coreMessage, "Keep my message");
    assert.equal(switched.brandKitId, "other-1");
    assert.deepEqual(switched.brandPreview?.paletteHex ?? [], []);
  });
});
