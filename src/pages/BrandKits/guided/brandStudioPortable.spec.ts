import { test } from "node:test";
import assert from "node:assert/strict";
import { exportBrandKit } from "../lib/brandKitExport";
import { mapImportDocument } from "../lib/brandKitImportMap";
import { newBrandCharacter } from "./brandCharacterModel";
import type { BrandKitSummary } from "../lib/brandKitTypes";
test("guided design survives portable round-trip without references, evidence or approval", () => {
  const c = newBrandCharacter("a");
  Object.assign(c, {
    name: "Original mascot",
    appearance: "Original silhouette",
    status: "approved",
    referenceAssetIds: ["private-asset"],
  });
  c.permissions = {
    commercialUse: true,
    likenessConsent: true,
    origin: "licensed",
    scopes: ["ad-studio"],
    evidence: "Private agreement",
  };
  const kit: BrandKitSummary = {
    id: "source",
    name: "Brand",
    voice: {
      studio: {
        schemaVersion: 1,
        categoryId: "Gaming",
        nicheId: "game-launches-trailers",
        businessGoals: ["Increase awareness"],
        identityApproved: true,
        guidelinesApproved: true,
        characters: [c],
      },
    },
  };
  const portable = exportBrandKit(kit);
  const json = JSON.stringify(portable);
  assert.ok(json.includes("Original silhouette"));
  assert.ok(!json.includes("private-asset"));
  assert.ok(!json.includes("Private agreement"));
  const mapped = mapImportDocument(portable)[0];
  const profile = mapped.createPayload.voice.studio as NonNullable<
    NonNullable<BrandKitSummary["voice"]>["studio"]
  >;
  assert.equal(profile.categoryId, "Gaming");
  assert.equal(profile.identityApproved, false);
  assert.equal(profile.characters?.[0].status, "draft");
  assert.equal(profile.characters?.[0].permissions.commercialUse, false);
  assert.deepEqual(profile.characters?.[0].referenceAssetIds, []);
  assert.ok(mapped.issues.some((i) => i.message.includes("fresh review")));
});
