import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertServerGraphPreferred } from "./sceneGraphAuthority";
import { composeTemplatePreview } from "./composeTemplateScene";
import type { AdConcept } from "../types";

describe("sceneGraphAuthority (M4)", () => {
  it("prefers server graph over FE composition", () => {
    assert.equal(
      assertServerGraphPreferred({
        serverGraph: { schemaVersion: "1.0", canvas: {}, layers: [] },
        feComposedGraph: { schemaVersion: "1.0", canvas: {}, layers: [{ id: "x" }] },
      }),
      "server",
    );
  });

  it("composeTemplatePreview keeps server sceneGraph layers", () => {
    const concept: AdConcept = {
      conceptId: "c1",
      title: "T",
      creativeDirection: "d",
      primaryHeadline: "H",
      supportingCopy: "S",
      cta: "Go",
      visualPrompt: "v",
      composition: "c",
      layoutFamily: "centered-hero",
      colorRecommendations: [],
      typographyRecommendations: [],
      platformSuitability: [],
      sceneGraph: {
        schemaVersion: "1.0",
        canvas: { width: 100, height: 100, backgroundColor: "#000" },
        layers: [
          {
            id: "server-only",
            type: "text",
            text: "SERVER",
            x: 0,
            y: 0,
            width: 50,
            height: 20,
            zIndex: 1,
          },
        ],
      },
    };
    const result = composeTemplatePreview({
      concept,
      brand: null,
      outputFormat: "square_1080",
    });
    assert.equal(result.sceneGraph?.layers[0]?.id, "server-only");
  });
});
