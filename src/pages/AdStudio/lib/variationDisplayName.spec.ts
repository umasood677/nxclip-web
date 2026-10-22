import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildVariationDisplayName,
  variationRootDisplayName,
} from "./variationDisplayName";

describe("variationDisplayName", () => {
  it("strips stacked suffixes", () => {
    assert.equal(
      variationRootDisplayName("Model editorial draft · CTA · CTA · Color"),
      "Model editorial draft",
    );
  });

  it("builds single-level names from child sources", () => {
    assert.equal(
      buildVariationDisplayName("Model editorial draft · CTA", "Headline"),
      "Model editorial draft · Headline",
    );
  });
});
