import { test } from "node:test";
import assert from "node:assert/strict";
import {
  homeEntryPath,
  scopedHomeProjects,
  reusableHomeTemplates,
  entryProjectBody,
  saveEntryProject,
  selectedBrandAssetReadiness,
} from "./homeEntryFlow";
import type { BrandTemplate } from "../../BrandKits/templates/brandTemplateModel";
import type { FeaturedExample } from "./exampleCreatives";
const recipe: BrandTemplate = {
  schemaVersion: 1,
  id: "recipe",
  brandKitId: "owned-kit",
  ownerUserId: "owner",
  name: "Owned recipe",
  sourceTemplateId: "product-hero",
  sourceIdentityHash: "hash",
  sourceBrandVersion: 1,
  format: "square_1080",
  revision: 1,
  state: "approved",
  saved: true,
  sceneGraph: {
    schemaVersion: "1.0",
    canvas: { width: 1080, height: 1080 },
    layers: [],
  },
  sourceAssetIds: [],
  blockers: [],
  warnings: [],
  provenance: { method: "native-template-engine", catalogVersion: "1" },
};
const example: FeaturedExample = {
  id: "brief-example",
  title: "Campaign direction",
  category: "Beauty",
  headline: "Actual headline",
  supporting: "Actual copy",
  cta: "Explore",
  theme: {
    bgFrom: "#000000",
    bgTo: "#111111",
    accent: "#222222",
    text: "#ffffff",
  },
  exampleObjective: "Launch",
  creativeDirection: "Cinematic minimalism",
  briefDefaults: {
    name: "Initial name",
    brandKitId: "must-not-transfer",
    productOrService: "Actual product",
    targetAudience: "Actual audience",
    coreMessage: "Actual message",
    desiredTone: "Refined",
    platform: "instagram_story",
    outputFormat: "vertical_1080x1920",
    cta: "Explore the collection",
  },
};
test("Home links are drafts, preserve only explicit brand selection and never auto-bind another kit", () => {
  assert.equal(homeEntryPath({}), "/create/ad/new");
  const url = new URL(
    homeEntryPath({ brandId: "owned-kit", exampleId: "brief-example" }),
    "http://local",
  );
  assert.equal(url.searchParams.get("brandId"), "owned-kit");
  assert.equal(url.pathname, "/create/ad/new");
});
test("project lists never leak branded projects into Default Brand or another kit", () => {
  const projects = [
    { id: "default", brandKitId: null },
    { id: "a", brandKitId: "kit-a" },
    { id: "b", brandKitId: "kit-b" },
  ];
  assert.deepEqual(
    scopedHomeProjects(projects, "").map((p) => p.id),
    ["default"],
  );
  assert.deepEqual(
    scopedHomeProjects(projects, "kit-a").map((p) => p.id),
    ["a"],
  );
});
test("saved-template listing excludes unapproved, unsaved and blocked recipes and rejects cross-brand responses", () => {
  assert.deepEqual(
    reusableHomeTemplates(
      [
        recipe,
        { ...recipe, id: "suggested", state: "suggested" },
        { ...recipe, id: "unsaved", saved: false },
        { ...recipe, id: "blocked", blockers: ["Missing source"] },
      ],
      "owned-kit",
    ).map((item) => item.id),
    ["recipe"],
  );
  assert.throws(
    () =>
      reusableHomeTemplates(
        [{ ...recipe, brandKitId: "another-kit" }],
        "owned-kit",
      ),
    /context/,
  );
});
test("Example Brief context survives explicit project creation without copying form-only IDs", () => {
  const body = entryProjectBody({
    name: "Reviewed name",
    idea: "Owner campaign idea",
    brandId: "",
    example,
  });
  assert.equal(body.name, "Reviewed name");
  assert.equal("brandKitId" in body, false);
  assert.equal(body.brief.campaignIdea, "Owner campaign idea");
  assert.equal(body.brief.exampleBriefId, example.id);
  assert.equal(body.brief.creativeDirection, "Cinematic minimalism");
  assert.equal(body.brief.productOrService, "Actual product");
  assert.equal(body.brief.targetAudience, "Actual audience");
  assert.equal(body.brief.cta, "Explore the collection");
  assert.equal(body.brief.outputFormat, "vertical_1080x1920");
  assert.equal("brandKitId" in body.brief, false);
  assert.equal("name" in body.brief, false);
});
test("blockers and invalid inputs prevent all project writes", async () => {
  let calls = 0;
  const api = {
    createProject: async () => {
      calls++;
      return { id: "project", name: "Name" };
    },
  };
  const input = { name: "Project", idea: "Campaign", brandId: "" };
  await assert.rejects(
    () => saveEntryProject(api, input, ["Model reference required"]),
    /Model/,
  );
  await assert.rejects(
    () => saveEntryProject(api, { ...input, name: "" }),
    /name/,
  );
  await assert.rejects(
    () => saveEntryProject(api, { ...input, format: "invalid" }),
    /format/,
  );
  assert.equal(calls, 0);
});
test("explicit project save performs one write, never creates a creative and never retries a failed write", async () => {
  let writes = 0,
    creatives = 0;
  const api = {
    createProject: async () => {
      writes++;
      return { id: "project", name: "Name" };
    },
    createFromTemplate: async () => {
      creatives++;
    },
  };
  await saveEntryProject(api, {
    name: "Project",
    idea: "Campaign",
    brandId: "owned-kit",
  });
  assert.equal(writes, 1);
  assert.equal(creatives, 0);
  await assert.rejects(
    () =>
      saveEntryProject(
        {
          createProject: async () => {
            writes++;
            throw Error("Save failed");
          },
        },
        { name: "Project", idea: "Campaign", brandId: "" },
      ),
    /Save failed/,
  );
  assert.equal(writes, 2);
});
test("an uploaded model is not assumed authorized for template generation", () => {
  assert.equal(selectedBrandAssetReadiness(null, ["brand_model"]).length, 1);
  assert.equal(
    selectedBrandAssetReadiness(
      {
        id: "kit",
        name: "Kit",
        assets: [
          {
            id: "model",
            role: "brand_model",
            status: "ready",
            mimeType: "image/png",
          },
        ],
      },
      ["brand_model"],
    ).length,
    1,
  );
});

test("required product/model sources block an unbranded template before project creation", () => {
  assert.equal(
    selectedBrandAssetReadiness(null, ["product_image", "brand_model"]).length,
    2,
  );
  assert.deepEqual(selectedBrandAssetReadiness(null, []), []);
});

test("ready uploads require explicit source approval before template project creation", () => {
  const kit = {
    id: "kit",
    name: "Kit",
    assets: [{ id: "product", role: "product_image", status: "ready" }],
  };
  assert.equal(selectedBrandAssetReadiness(kit, ["product_image"]).length, 1);
  const reviewed = {
    ...kit,
    voice: {
      studio: {
        schemaVersion: 1 as const,
        categoryId: "general",
        nicheId: "test",
        businessGoals: [],
        identityApproved: true,
        guidelinesApproved: true,
        approvedAssetIds: ["product"],
      },
    },
  };
  assert.deepEqual(
    selectedBrandAssetReadiness(reviewed, ["product_image"]),
    [],
  );
});
