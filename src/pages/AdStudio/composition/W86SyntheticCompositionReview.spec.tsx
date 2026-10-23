import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { W86SyntheticCompositionReview } from "./W86SyntheticCompositionReview";
import type { W86SyntheticCompositionResultV1 } from "./w86-synthetic-composition";

const result = {
  schemaVersion: "1.0.0",
  mode: "syntheticMockComposition",
  featureEnabled: false,
  executionAuthorized: false,
  liveAiGeneration: false,
  paidProviderCalls: 0,
  creativeApproval: "notApproved",
  orchestrator: "content-service/w86-synthetic-composition-v1",
  blueprintId: "template:product-hero",
  blueprintRevision: 1,
  brandKitId: "synthetic-brand",
  isolationRevisionKey: "a".repeat(64),
  isolationApproval: "pendingReview",
  productPreservation: {
    rgbDifferences: 0,
    protectedAlphaViolations: 0,
    originalHashVerified: true,
  },
  qualityEvidence: {
    isolationBlockers: [],
    haloAssessment: "humanReviewRequired",
    mockCompositionOnly: true,
  },
  provenance: {
    segmentationProviderId: "native-supplied-mask",
    imageGenerationProviderId: "w86-mock-image-gen",
    planningMethod: "deterministicVariationPlan",
    compositingMethod: "sourcePixelComposite",
  },
  effectiveBlueprint: {} as W86SyntheticCompositionResultV1["effectiveBlueprint"],
  variations: [
    {
      variationId: "w86-focal",
      intent: "focal",
      label: "Synthetic focal variation",
      productLayerId: "product-focal",
      backgroundSha256: "b".repeat(64),
      previewPngSha256: "c".repeat(64),
      exportPngSha256: "d".repeat(64),
      distinctivenessKey: "e".repeat(64),
      sceneGraph: {
        schemaVersion: "1.0",
        canvas: { width: 320, height: 400, backgroundColor: "#111" },
        layers: [
          {
            id: "product-focal",
            type: "image",
            name: "Source-preserved product",
            x: 10,
            y: 10,
            width: 100,
            height: 120,
            zIndex: 10,
            locked: true,
            assetId: "product",
          },
          {
            id: "headline-focal",
            type: "text",
            name: "Headline",
            text: "Hello",
            x: 10,
            y: 200,
            width: 200,
            height: 40,
            zIndex: 30,
          },
        ],
      },
    },
  ],
  assets: [],
} as unknown as W86SyntheticCompositionResultV1;

describe("W8.6 synthetic composition review (SSR; not browser UAT)", () => {
  it("renders nothing unless explicitly enabled", () => {
    const html = renderToStaticMarkup(
      <W86SyntheticCompositionReview result={result} assetUrls={{}} />,
    );
    assert.equal(html, "");
  });

  it("renders synthetic disclosure and preservation when enabled", () => {
    const html = renderToStaticMarkup(
      <W86SyntheticCompositionReview
        enabled
        result={result}
        assetUrls={{ product: "http://127.0.0.1:9/product.png" }}
      />,
    );
    assert.ok(/synthetic|mock/i.test(html));
    assert.ok(html.includes("source RGB protected"));
    assert.ok(html.includes("not beta") || html.includes("NOT LIVE"));
  });

  it("exposes Stage A editor handoff only when editorEnabled", () => {
    const off = renderToStaticMarkup(
      <W86SyntheticCompositionReview
        enabled
        result={result}
        assetUrls={{}}
      />,
    );
    assert.equal(off.includes("Open selected variation in editor"), false);
    const on = renderToStaticMarkup(
      <W86SyntheticCompositionReview
        enabled
        editorEnabled
        result={result}
        assetUrls={{}}
      />,
    );
    assert.ok(on.includes("Open selected variation in editor"));
  });
});
