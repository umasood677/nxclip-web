import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isBrandTemplatesEnabled,
  compatibleTemplateProjects,
  editTemplateHeadline,
  templateHeadline,
  canReuseTemplate,
  applyBrandTemplateCopy,
  type BrandTemplate,
} from "./brandTemplateModel";
import type { AdSceneGraph } from "../../AdStudio/types";
const graph: AdSceneGraph = {
  schemaVersion: "1.0",
  canvas: { width: 1080, height: 1080 },
  layers: [
    {
      id: "headline",
      name: "Headline",
      type: "text",
      text: "Original message",
      x: 30,
      y: 30,
      width: 500,
      height: 100,
      zIndex: 1,
    },
    {
      id: "product",
      type: "image",
      assetId: "authorized",
      x: 200,
      y: 250,
      width: 400,
      height: 600,
      zIndex: 2,
    },
  ],
};
const recipe: BrandTemplate = {
  schemaVersion: 1,
  id: "template",
  brandKitId: "kit",
  ownerUserId: "owner",
  name: "Synthetic recipe",
  sourceTemplateId: "product-hero",
  sourceIdentityHash: "hash",
  sourceBrandVersion: 1,
  format: "square_1080",
  revision: 1,
  state: "suggested",
  saved: false,
  sceneGraph: graph,
  sourceAssetIds: ["authorized"],
  blockers: [],
  warnings: [],
  reuseIssues: [],
  provenance: { method: "native-template-engine", catalogVersion: "1.0.0" },
};
test("template integration is off by default and does not infer flags", () => {
  assert.equal(isBrandTemplatesEnabled({}), false);
  assert.equal(
    isBrandTemplatesEnabled({ VITE_AD_STUDIO_BRAND_TEMPLATES_ENABLED: "1" }),
    false,
  );
  assert.equal(
    isBrandTemplatesEnabled({ VITE_AD_STUDIO_BRAND_TEMPLATES_ENABLED: "true" }),
    true,
  );
});
test("project choices preserve locked Brand Kit and format boundaries", () => {
  const projects = [
    {
      id: "correct",
      name: "Owner project",
      brandKitId: "kit",
      outputFormat: "square_1080",
      brief: {},
    },
    {
      id: "wrong-kit",
      name: "Other brand",
      brandKitId: "other",
      outputFormat: "square_1080",
      brief: {},
    },
    {
      id: "wrong-format",
      name: "Portrait",
      brandKitId: "kit",
      outputFormat: "portrait_1080x1350",
      brief: {},
    },
    {
      id: "default",
      name: "No brand",
      brandKitId: null,
      outputFormat: "square_1080",
      brief: {},
    },
  ];
  assert.deepEqual(
    compatibleTemplateProjects(projects, "kit", "square_1080").map((p) => p.id),
    ["correct"],
  );
});
test("headline editing preserves independent original asset layers and graph input", () => {
  const changed = editTemplateHeadline(graph, "Updated message");
  assert.equal(templateHeadline(changed), "Updated message");
  assert.equal(templateHeadline(graph), "Original message");
  assert.deepEqual(changed.layers[1], graph.layers[1]);
  assert.notEqual(changed.layers[1], graph.layers[1]);
});
test("approved and saved are separate states; blockers and server freshness issues prevent reuse", () => {
  assert.equal(canReuseTemplate(recipe), false);
  assert.equal(canReuseTemplate({ ...recipe, state: "approved" }), false);
  const ready = { ...recipe, state: "approved" as const, saved: true };
  assert.equal(canReuseTemplate(ready), true);
  assert.equal(
    canReuseTemplate({ ...ready, blockers: ["Missing product"] }),
    false,
  );
  assert.equal(
    canReuseTemplate({ ...ready, reuseIssues: ["Permission revoked"] }),
    false,
  );
  assert.equal(canReuseTemplate({ ...ready, state: "archived" }), false);
});

test("explicit copy preview overrides native catalog defaults without changing asset pixels or identifiers", () => {
  const result = applyBrandTemplateCopy(graph, {
    primaryHeadline: "My headline",
    supportingCopy: "",
    cta: "Explore",
  });
  assert.equal(templateHeadline(result), "My headline");
  assert.equal(templateHeadline(graph), "Original message");
  assert.deepEqual(result.layers[1], graph.layers[1]);
});
