import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { W87SyntheticCompositionEditor } from "./W87SyntheticCompositionEditor";
import {
  assertVariationGraphIsolation,
  toW87EditorViewModel,
  type W87SyntheticEditorViewModel,
} from "./w87-synthetic-editor";
import { updateLayer } from "../lib/sceneGraph";
import type { AdSceneGraph } from "../types";

function graph(seed: string): AdSceneGraph {
  return {
    schemaVersion: "1.0",
    canvas: { width: 320, height: 400, backgroundColor: "#111" },
    layers: [
      {
        id: `product-${seed}`,
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
        id: `headline-${seed}`,
        type: "text",
        name: "Headline",
        text: `Hello ${seed}`,
        x: 10,
        y: 200,
        width: 200,
        height: 40,
        zIndex: 30,
      },
    ],
  };
}

function model(): W87SyntheticEditorViewModel {
  return toW87EditorViewModel({
    isolationApproval: "pendingReview",
    productPreservationOk: true,
    providerGatesReady: true,
    variations: [
      {
        variationId: "w86-focal",
        intent: "focal",
        label: "Focal",
        productLayerId: "product-focal",
        sceneGraph: graph("focal"),
        backgroundSha256: "a".repeat(64),
        distinctivenessKey: "b".repeat(64),
      },
      {
        variationId: "w86-atmosphere",
        intent: "atmosphere",
        label: "Atmosphere",
        productLayerId: "product-atmosphere",
        sceneGraph: graph("atmosphere"),
        backgroundSha256: "c".repeat(64),
        distinctivenessKey: "d".repeat(64),
      },
      {
        variationId: "w86-typography",
        intent: "typography",
        label: "Typography",
        productLayerId: "product-typography",
        sceneGraph: graph("typography"),
        backgroundSha256: "e".repeat(64),
        distinctivenessKey: "f".repeat(64),
      },
    ],
  });
}

describe("W8.7 Stage A synthetic editor integration (SSR; not browser UAT)", () => {
  it("stays hidden when feature disabled", () => {
    const html = renderToStaticMarkup(
      <W87SyntheticCompositionEditor model={model()} assetUrls={{}} />,
    );
    assert.equal(html, "");
  });

  it("renders three variation controls and synthetic disclosure when enabled", () => {
    const html = renderToStaticMarkup(
      <W87SyntheticCompositionEditor
        enabled
        model={model()}
        assetUrls={{ product: "http://127.0.0.1:9/product.png" }}
      />,
    );
    assert.ok(/SYNTHETIC|MOCK/i.test(html));
    assert.ok(html.includes("focal"));
    assert.ok(html.includes("atmosphere"));
    assert.ok(html.includes("typography"));
    assert.ok(html.includes("not beta"));
    assert.ok(html.includes("source RGB protected"));
  });

  it("keeps variation graphs identity-isolated after sibling edits", () => {
    const m = model();
    assertVariationGraphIsolation(m);
    const focal = m.variations[0]!;
    const atmosphere = m.variations[1]!;
    const edited = updateLayer(focal.graph, "headline-focal", { text: "Changed" });
    assert.notEqual(edited.layers.find((l) => l.id === "headline-focal")?.type === "text"
      ? (edited.layers.find((l) => l.id === "headline-focal") as { text: string }).text
      : "", "Hello atmosphere");
    assert.equal(
      (atmosphere.graph.layers.find((l) => l.id === "headline-atmosphere") as { text: string })
        .text,
      "Hello atmosphere",
    );
  });
});
