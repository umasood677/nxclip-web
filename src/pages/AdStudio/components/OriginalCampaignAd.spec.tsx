import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import {
  OriginalCampaignAd,
  campaignGenerationIsActive,
  campaignVariationCopy,
} from "./OriginalCampaignAd";
import {
  projectBriefForm,
  type WorkspaceProject,
} from "../lib/projectWorkspace";
const project: WorkspaceProject = {
  id: "campaign",
  name: "Campaign",
  brief: {
    headline: "Owner copy",
    supportingCopy: "Support",
    cta: "Explore",
    creativeDirection: "Studio photograph",
  },
};
test("opening a completed brief exposes original AI generation without requiring concepts or creating records", () => {
  const noCall = () => {
    throw Error("Rendering must not write or generate");
  };
  const html = renderToStaticMarkup(
    <OriginalCampaignAd
      project={project}
      brand={null}
      form={projectBriefForm(project)}
      onChange={noCall}
      onSaveBrief={noCall}
      onSaved={noCall}
    />,
  );
  assert.match(html, /Generate Original AI Ad/);
  assert.match(html, /Owner copy/);
  assert.match(html, /Supporting copy/);
  assert.match(html, /No Brand Kit selected/);
  assert.doesNotMatch(html, /Generate concepts|Create template/);
});
test("a saved campaign ad creates one campaign-aware AI variation rather than reopening template authoring", () => {
  const html = renderToStaticMarkup(
    <OriginalCampaignAd
      project={project}
      brand={null}
      form={projectBriefForm(project)}
      initialSource={{ id: "saved-ad", projectId: project.id, name: "Saved ad" }}
      onChange={() => undefined}
      onSaveBrief={async () => project}
      onSaved={() => undefined}
    />,
  );
  assert.match(html, /Create AI variation/);
  assert.match(html, /campaign brief and the same authorized Brand Kit references/);
  assert.match(html, /Generate photographic variation/);
  assert.match(html, /Variation direction/);
  assert.doesNotMatch(html, /Photographic direction/);
  assert.doesNotMatch(html, /Creative operation/);
});
test("a variation inherits editable copy from its saved ad when legacy project brief copy is blank", () => {
  const blankForm = projectBriefForm({
    id: "legacy-campaign",
    name: "Legacy campaign",
    brief: { headline: "", supportingCopy: "", cta: "" },
  });
  blankForm.headline = "";
  blankForm.supportingCopy = "";
  blankForm.cta = "";
  const copy = campaignVariationCopy(blankForm, {
    id: "saved-ad",
    projectId: "legacy-campaign",
    name: "Saved ad",
    sceneGraph: {
      schemaVersion: "1",
      canvas: { width: 1080, height: 1350 },
      layers: [
        { id: "headline", type: "text", name: "Headline", text: "THE RED EFFECT", x: 0, y: 0, width: 1, height: 1, zIndex: 1 },
        { id: "copy", type: "text", name: "Supporting copy", text: "Confidence has a color.", x: 0, y: 0, width: 1, height: 1, zIndex: 2 },
        { id: "cta", type: "text", name: "CTA button", text: "Discover red", x: 0, y: 0, width: 1, height: 1, zIndex: 3 },
      ],
    },
  });
  assert.deepEqual(copy, {
    headline: "THE RED EFFECT",
    supportingCopy: "Confidence has a color.",
    cta: "Discover red",
  });
});
test("a terminal retained generation exits the progress screen even when its browser phase is stale", () => {
  const retained = {
    phase: "executing" as const,
    requestId: "request-1",
    creativeId: "creative-1",
    input: {
      requestId: "request-1",
      instruction: "Campaign direction",
      headline: "Headline",
      supportingCopy: "Copy",
      cta: "Explore",
      references: [],
    },
  };
  assert.equal(
    campaignGenerationIsActive({ retained, status: "processing" }),
    true,
  );
  assert.equal(
    campaignGenerationIsActive({ retained, status: "failed" }),
    false,
  );
  assert.equal(
    campaignGenerationIsActive({ retained, status: "cancelled" }),
    false,
  );
  assert.equal(campaignGenerationIsActive({ retained: { ...retained, phase: "prepared" }, status: "" }), false);
  assert.equal(campaignGenerationIsActive({ retained, status: "" }), true);
});
