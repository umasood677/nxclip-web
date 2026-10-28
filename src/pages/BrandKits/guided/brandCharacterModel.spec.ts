import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newBrandCharacter,
  characterReviewIssues,
  characterProfilesForDuplicate,
} from "./brandCharacterModel";
test("new characters are never silently approved", () => {
  const c = newBrandCharacter("test");
  assert.equal(c.status, "draft");
  assert.equal(c.permissions.commercialUse, false);
  assert.equal(c.permissions.likenessConsent, false);
  assert.deepEqual(c.referenceAssetIds, []);
});
test("human approval requires reference and consent", () => {
  const c = newBrandCharacter("test");
  c.name = "Reference";
  c.kind = "human-model";
  c.status = "approved";
  assert.ok(characterReviewIssues(c, []).length);
  c.referenceAssetIds = ["owned"];
  c.permissions = {
    commercialUse: true,
    likenessConsent: true,
    origin: "consented",
    scopes: ["ad-studio"],
    evidence: "Consent record",
  };
  assert.deepEqual(
    characterReviewIssues(c, [
      { id: "owned", status: "ready", mimeType: "image/png" },
    ]),
    [],
  );
});
test("copies retain creative guidance but never references or rights approvals", () => {
  const c = newBrandCharacter("test");
  c.name = "Mascot";
  c.appearance = "Original shape";
  c.status = "approved";
  c.referenceAssetIds = ["private"];
  c.permissions = {
    commercialUse: true,
    likenessConsent: true,
    origin: "licensed",
    scopes: ["ad-studio"],
    evidence: "Private agreement",
  };
  const copy = characterProfilesForDuplicate([c])[0];
  assert.notEqual(copy.id, c.id);
  assert.equal(copy.appearance, c.appearance);
  assert.equal(copy.status, "draft");
  assert.deepEqual(copy.referenceAssetIds, []);
  assert.equal(copy.permissions.commercialUse, false);
  assert.equal(copy.permissions.evidence, "");
  assert.equal(c.status, "approved");
});
