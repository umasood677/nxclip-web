import {
  attachCharacterReference,
  characterUnchangedAfterAssetUpdate,
} from "./brandCharacterModel";
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

test("binding an existing reference preserves IDs and declarations but resets approval without changing its source", () => {
  const profile = newBrandCharacter("profile");
  profile.name = "Model";
  profile.status = "approved";
  const assets = [
    { id: "owned-image", status: "ready", mimeType: "image/png" },
  ];
  const linked = attachCharacterReference(profile, { assets }, "owned-image");
  assert.equal(linked.status, "draft");
  assert.deepEqual(linked.referenceAssetIds, ["owned-image"]);
  assert.deepEqual(profile.referenceAssetIds, []);
  assert.deepEqual(linked.permissions, profile.permissions);
  assert.equal(
    attachCharacterReference(linked, { assets }, "owned-image"),
    linked,
  );
  assert.throws(
    () => attachCharacterReference(profile, { assets }, "other-account"),
    /this Brand Kit/,
  );
});
test("a profile cannot acquire more than eight distinct ready references", () => {
  const profile = {
    ...newBrandCharacter("profile"),
    referenceAssetIds: Array.from({ length: 8 }, (_, i) => String(i)),
  };
  assert.throws(
    () =>
      attachCharacterReference(
        profile,
        { assets: [{ id: "ninth", status: "ready", mimeType: "image/png" }] },
        "ninth",
      ),
    /at most eight/,
  );
  const bad = { ...profile, name: "Name", referenceAssetIds: ["same", "same"] };
  assert.ok(
    characterReviewIssues(bad, []).some((message) =>
      message.includes("distinct"),
    ),
  );
});
test("asset upload rebases only an unchanged saved target profile", () => {
  const profile = newBrandCharacter("profile"),
    before = { voice: { studio: { characters: [profile] } } };
  assert.equal(
    characterUnchangedAfterAssetUpdate(
      before,
      {
        voice: {
          studio: {
            characters: [
              structuredClone(profile),
              newBrandCharacter("another"),
            ],
          },
        },
      },
      profile.id,
    ),
    true,
  );
  assert.equal(
    characterUnchangedAfterAssetUpdate(
      before,
      {
        voice: {
          studio: {
            characters: [
              { ...profile, appearance: "Changed by another session" },
            ],
          },
        },
      },
      profile.id,
    ),
    false,
  );
  assert.equal(
    characterUnchangedAfterAssetUpdate(
      { voice: { studio: { characters: [] } } },
      { voice: { studio: { characters: [profile] } } },
      profile.id,
    ),
    false,
  );
});
