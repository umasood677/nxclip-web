import {
  CreativeGuidelinesSection,
  guidelinesDraftFromKit,
  fillMissingGuidelines,
} from "./CreativeGuidelinesSection";
import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BrandVoiceSection,
  voiceDraftFromKit,
  voicePatchFromDraft,
} from "./BrandVoiceSection";
import { draftFromKit, guidedPayload } from "../guided/guidedBrandModel";
import type { BrandKitSummary } from "../lib/brandKitTypes";

test("voice editor exposes three aligned groups and ten uniquely labeled fields without technical persistence copy", () => {
  const html = renderToStaticMarkup(
    <BrandVoiceSection
      value={voiceDraftFromKit({
        tone: "Warm",
        writingStyle: "Short and clear",
        preferredCta: "Discover",
      })}
      onChange={() => undefined}
    />,
  );
  assert.equal((html.match(/<fieldset/g) || []).length, 3);
  assert.equal((html.match(/<label /g) || []).length, 10);
  for (const label of [
    "Voice &amp; audience",
    "Vocabulary &amp; boundaries",
    "Messaging &amp; calls to action",
  ])
    assert.ok(html.includes(label));
  const labels = [...html.matchAll(/<label for="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(labels).size, 10);
  for (const id of labels) assert.ok(html.includes(`id="${id}"`));
  assert.doesNotMatch(html, /Brand Voice JSON|<details|<summary/);
  assert.match(html, /Save Brand Kit/);
  assert.match(html, /value="Warm"/);
});
test("voice changes round-trip into the existing guided identity without dropping sources or unrelated metadata", () => {
  const kit: BrandKitSummary = {
    id: "owned",
    name: "Saved brand",
    voice: {
      industry: "Synthetic industry",
      website: "https://example.test",
      tone: "Warm",
      personality: "Calm",
      targetAudience: "Creators",
      creative: { lighting: "Soft" },
      studio: {
        schemaVersion: 1,
        categoryId: "General",
        nicheId: "Fashion",
        businessGoals: ["Launch"],
        identityApproved: true,
        guidelinesApproved: true,
        approvedAssetIds: ["product"],
      },
    },
    assets: [{ id: "product", role: "product_image", status: "ready" }],
  };
  const draft = draftFromKit(kit),
    voice = voiceDraftFromKit(kit.voice);
  voice.tone = "Precise";
  voice.targetAudience = "Designers";
  voice.tagline = "Thoughtfully made";
  voice.doSay = "Craft\nCare";
  const edited = {
    ...draft,
    voiceExtras: { ...draft.voiceExtras, ...voicePatchFromDraft(voice) },
    personality: voice.personality,
    tone: voice.tone,
    audience: voice.targetAudience,
    identityApproved: false,
    guidelinesApproved: false,
  };
  const saved = guidedPayload(edited, kit);
  assert.equal(saved.voice.tone, "Precise");
  assert.equal(saved.voice.targetAudience, "Designers");
  assert.equal(saved.voice.industry, kit.voice?.industry);
  assert.deepEqual(saved.voice.creative, kit.voice?.creative);
  assert.deepEqual(saved.voice.studio?.approvedAssetIds, ["product"]);
  assert.equal(saved.voice.studio?.identityApproved, false);
  assert.equal(saved.voice.studio?.guidelinesApproved, false);
  assert.deepEqual(saved.voice.doSay, ["Craft", "Care"]);
  assert.equal(kit.voice?.tone, "Warm");
  assert.equal(draft.tone, "Warm");
});

test("campaign guidelines expose art direction, layout, product safeguards and delivery fields as one visible editor", () => {
  const html = renderToStaticMarkup(
    <CreativeGuidelinesSection
      value={guidelinesDraftFromKit(
        { lighting: "Approved light" },
        "Existing usage rules",
      )}
      onChange={() => undefined}
      categoryLabel="Beauty / Cosmetics"
    />,
  );
  assert.equal((html.match(/<fieldset/g) || []).length, 4);
  assert.equal((html.match(/<textarea/g) || []).length, 13);
  assert.doesNotMatch(html, /<details|<summary/);
  for (const term of [
    "Art direction",
    "Layout",
    "Product truth",
    "Delivery notes",
    "Approved light",
    "Existing usage rules",
  ])
    assert.ok(html.includes(term));
});
test("category starters preserve every authored campaign instruction and do not mutate the original", () => {
  const draft = guidelinesDraftFromKit(
    {
      lighting: "Owner-approved precise lighting",
      productRepresentation: "Preserve original packaging",
    },
    "Licensed assets only",
  );
  const updated = fillMissingGuidelines(draft, "Food / Artisan");
  assert.equal(updated.lighting, draft.lighting);
  assert.equal(updated.productRepresentation, draft.productRepresentation);
  assert.equal(updated.freeformGuidelines, draft.freeformGuidelines);
  assert.match(updated.visualStyle, /Food \/ Artisan/);
  assert.equal(draft.visualStyle, "");
});
