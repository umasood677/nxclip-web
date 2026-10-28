import { test } from "node:test";
import assert from "node:assert/strict";
import { BRAND_KIT_JSON_SAMPLE } from "../lib/brandKitJsonSample";
import { mapImportDocument, isImportable } from "../lib/brandKitImportMap";
import { parseBrandKitJsonText } from "../lib/brandKitSafeJson";
import { mergeBrandJsonDraft } from "./guidedBrandImport";
import { draftFromKit, guidedPayload } from "./guidedBrandModel";
import type { BrandKitSummary } from "../lib/brandKitTypes";
const kit: BrandKitSummary = {
  id: "existing-kit",
  name: "Existing",
  version: 7,
  assets: [{ id: "owned-product", role: "product_image", status: "ready" }],
  typography: [{ role: "body", family: "Inter", assetId: "owned-font" }],
  voice: {
    signatureProduct: "Actual product",
    creative: { lighting: "Existing lighting" },
    studio: {
      schemaVersion: 1,
      categoryId: "beauty",
      nicheId: "lipstick",
      businessGoals: ["Launch"],
      approvedAssetIds: ["owned-product"],
      identityApproved: true,
      guidelinesApproved: true,
      characters: [],
    },
  },
};
test("downloadable sample passes existing safe parser and canonical mapper", () => {
  const parsed = parseBrandKitJsonText(JSON.stringify(BRAND_KIT_JSON_SAMPLE));
  assert.equal(parsed.ok, true);
  const mapped = mapImportDocument(BRAND_KIT_JSON_SAMPLE);
  assert.equal(mapped.length, 1);
  assert.equal(isImportable(mapped[0]), true);
  assert.ok(mapped[0].assetsRequiringReupload.length);
});
test("import merges unsaved draft without changing kit id, uploads or approvals", () => {
  const before = JSON.stringify(kit),
    mapped = mapImportDocument(BRAND_KIT_JSON_SAMPLE)[0];
  const next = mergeBrandJsonDraft(draftFromKit(kit), mapped);
  const payload = guidedPayload(next, kit);
  assert.equal(next.name, "Your Brand");
  assert.equal(next.identityApproved, false);
  assert.equal(next.guidelinesApproved, false);
  assert.deepEqual(payload.voice.studio?.approvedAssetIds, ["owned-product"]);
  assert.deepEqual(payload.voice.studio?.characters, []);
  assert.equal(
    payload.typography.find((t) => t.role === "body")?.assetId,
    "owned-font",
  );
  assert.equal(JSON.stringify(kit), before);
  assert.equal("id" in payload, false);
  assert.equal("assets" in payload, false);
});
test("minimal JSON preserves unrelated saved voice fields and palette", () => {
  const mapped = mapImportDocument({
    schemaVersion: "1.0",
    type: "nxclip.brand-kit",
    brand: { name: "Renamed" },
  })[0];
  const payload = guidedPayload(
    mergeBrandJsonDraft(draftFromKit(kit), mapped),
    kit,
  );
  assert.equal(payload.voice.signatureProduct, "Actual product");
  assert.deepEqual(payload.voice.creative, kit.voice?.creative);
  assert.ok(payload.typography.length);
});
test("invalid JSON cannot be applied and unsafe properties are rejected", () => {
  assert.throws(() =>
    mergeBrandJsonDraft(
      draftFromKit(kit),
      mapImportDocument({
        type: "nxclip.brand-kit",
        schemaVersion: "unsupported",
        brand: { name: "Bad" },
      })[0],
    ),
  );
  assert.equal(parseBrandKitJsonText('{"__proto__":{"admin":true}}').ok, false);
});
