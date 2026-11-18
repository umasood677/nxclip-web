import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { exampleForPlanning, publishedExampleBriefs } from "./publishedExampleBriefs";
import { entryProjectBody } from "./homeEntryFlow";
import { projectBriefForm, selectProjectExample, selectTemplateSource, type WorkspaceProject } from "./projectWorkspace";

test("the published catalog has distinct reviewed public images and visual descriptions", () => {
  assert.equal(publishedExampleBriefs.length, 12);
  assert.deepEqual(publishedExampleBriefs.slice(0, 2).map(example => example.id), [
    "ex-after-dark-heels", "ex-signature-carry",
  ]);
  assert.equal(new Set(publishedExampleBriefs.map(example => example.previewImage)).size, publishedExampleBriefs.length);
  for (const example of publishedExampleBriefs) {
    assert.ok(existsSync("public" + example.previewImage));
    assert.ok(example.creativeDirection.length > 50);
    const { brief } = entryProjectBody({ name: "Software campaign", idea: "Advertise productivity software", brandId: "owned-kit", example });
    assert.equal(brief.exampleBriefId, example.id);
    assert.equal(brief.exampleVisualDirection, example.creativeDirection);
    assert.equal(brief.exampleImage, example.previewImage);
    assert.equal(brief.exampleVersion, example.catalogVersion);
    assert.equal(brief.productOrService, "Advertise productivity software");
  }
  assert.equal(exampleForPlanning("ex-saas"), undefined);
  assert.equal(exampleForPlanning("zoe-ex-texture")?.title, "Texture close-up");
  assert.deepEqual(publishedExampleBriefs.filter(example => example.includesPerson).map(example => example.id), [
    "ex-street-in-focus", "ex-creator-night-reset", "zoe-ex-seasonal", "zoe-ex-editorial-model",
  ]);
});

const idea = "Advertise an independent architecture practice.";
const save = { updateProject: async (id: string, body: Record<string, unknown>) =>
  structuredClone({ id, name: "Architecture", brandKitId: "owned-kit", brief: body.brief }) as WorkspaceProject };

test("new campaign entry keeps the user's offering and separates both kinds of visual sources", () => {
  const original = entryProjectBody({ name: "Architecture", idea, brandId: "" });
  assert.equal(original.brief.campaignIdea, idea);
  assert.equal(original.brief.exampleBriefId, undefined);
  const example = entryProjectBody({ name: "Architecture", idea, brandId: "owned-kit", example: exampleForPlanning("zoe-ex-texture"), format: "square_1080" });
  assert.equal(example.brief.productOrService, idea);
  assert.equal(example.brief.headline, undefined);
  assert.equal(example.brief.exampleImage, "/ad-studio/sample-assets/w0a-texture-showcase.jpg");
  assert.equal(example.brief.outputFormat, "square_1080");
  const native = entryProjectBody({ name: "Architecture", idea, brandId: "", defaultTemplateId: "minimal", format: "portrait_1080x1350" });
  assert.equal(native.brief.defaultTemplateId, "minimal");
  assert.equal(native.brief.startingCreativeId, undefined);
});

test("switching inspiration on an existing campaign preserves approved strategy and survives a reload", async () => {
  const project: WorkspaceProject = { id: "project", name: "Architecture", brandKitId: "owned-kit", brief: {
    ...entryProjectBody({ name: "Architecture", idea, brandId: "owned-kit" }).brief,
    headline: "Space for better work", cta: "Book a consultation", planningApproved: true,
    negativeInstructions: "No guarantees",
  } };
  const { project: adapted } = await selectProjectExample(save, project, exampleForPlanning("zoe-ex-editorial-model")!);
  const reopened = projectBriefForm(adapted);
  assert.equal(reopened.headline, "Space for better work");
  assert.equal(reopened.cta, "Book a consultation");
  assert.equal(adapted.brief?.negativeInstructions, "No guarantees");
  assert.equal(adapted.brief?.planningApproved, true);
  assert.equal(reopened.exampleBriefId, "zoe-ex-editorial-model");
  const branded = await selectTemplateSource(save, adapted, { startingCreativeId: "owned-draft", format: reopened.outputFormat });
  assert.equal(branded.brief?.startingCreativeId, "owned-draft");
  assert.equal(branded.brief?.exampleBriefId, "");
  const native = await selectTemplateSource(save, branded, { defaultTemplateId: "product-hero", format: reopened.outputFormat });
  assert.equal(native.brief?.startingCreativeId, null);
  assert.equal(native.brief?.defaultTemplateId, "product-hero");
});
