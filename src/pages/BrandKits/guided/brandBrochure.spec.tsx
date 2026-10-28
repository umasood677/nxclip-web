import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { BrandKitBrochure } from "./BrandKitBrochure";
import { brochureSections } from "./brandBrochureExport";
import { categoryGuidelineStarter } from "../components/CreativeGuidelinesSection";
import type { BrandKitSummary } from "../lib/brandKitTypes";
const kit: BrandKitSummary = {
  id: "synthetic-kit",
  name: "Synthetic test identity",
  version: 3,
  colors: [{ role: "primary", hex: "#123456" }],
  typography: [{ role: "heading", family: "Geist" }],
  voice: {
    tone: "Precise",
    doSay: ["Clear", "Useful"],
    studio: {
      schemaVersion: 1,
      categoryId: "technology",
      nicheId: "software",
      businessGoals: [],
      identityApproved: false,
      guidelinesApproved: false,
      approvedAssetIds: [],
    },
    creative: {
      lighting: "Soft key",
      productRepresentation: "Preserve packaging",
    },
  },
  guidelines: "No invented claims",
  assets: [
    {
      id: "synthetic-source",
      label: "Synthetic product",
      role: "product_image",
      status: "ready",
    },
  ],
};
test("brochure uses saved identity, full voice and guidelines without leaking unknown configuration", () => {
  const sections = brochureSections({
    ...kit,
    voice: { ...kit.voice, privateRuntimeConfiguration: "must-not-export" },
  });
  const text = JSON.stringify(sections);
  assert.match(text, /Precise|Clear; Useful/);
  assert.match(text, /Soft key/);
  assert.match(text, /No invented claims/);
  assert.doesNotMatch(text, /must-not-export|approvedAssetIds/);
});
test("one saved brochure replaces ad-preview tabs and keeps asset approval separate from upload", () => {
  const html = renderToStaticMarkup(
    <BrandKitBrochure kit={kit} dirty={false} />,
  );
  assert.match(html, /saved version|SAVED VERSION/);
  assert.match(html, /Synthetic product/);
  assert.match(html, /Usage review required/);
  assert.doesNotMatch(html, /role="tab|IG Feed|IG Story/);
  assert.equal((html.match(/disabled=""/g) || []).length, 0);
});
test("unsaved changes prevent every brochure export rather than exporting stale draft as saved", () => {
  const html = renderToStaticMarkup(<BrandKitBrochure kit={kit} dirty />);
  assert.equal((html.match(/disabled=""/g) || []).length, 3);
  assert.match(html, /last saved version/);
});
test("category starter reflects selected niche without importing a lipstick brand or claiming AI", () => {
  const starter = categoryGuidelineStarter("Technology / Software");
  assert.match(starter.visualStyle!, /Technology \/ Software/);
  assert.doesNotMatch(JSON.stringify(starter), /ZOE|burgundy|lipstick/i);
  assert.match(starter.productRepresentation!, /actual packaging/);
});
