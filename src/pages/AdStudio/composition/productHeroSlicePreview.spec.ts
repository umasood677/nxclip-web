import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  productHeroSlicePreview,
  editProductHeroHeadline,
} from "./productHeroSlicePreview";
import {
  PRODUCT_HERO_SLICE_ENABLED_DEFAULT,
  type ProductHeroSliceResultV1,
} from "./product-hero-slice";

const folder = process.env.W8_PRODUCT_HERO_EVIDENCE;
const integration = folder ? it : it.skip;
const load = (name: string): ProductHeroSliceResultV1 =>
  JSON.parse(readFileSync(join(folder!, name + ".result.json"), "utf8"));
describe("W8.2 frontend result consumer", () => {
  it("defaults disabled independently of existing Ad Studio flags", () => {
    assert.equal(PRODUCT_HERO_SLICE_ENABLED_DEFAULT, false);
  });
  integration(
    "consumes both actual local outputs with independent asset/layer manifests",
    () => {
      for (const name of ["template", "example-brief"]) {
        const result = load(name);
        const preview = productHeroSlicePreview(result);
        assert.equal(preview.graph.layers.length, 9);
        assert.equal(preview.assetIds.length, 4);
        assert.ok(preview.label.includes("no live AI"));
        assert.ok(!JSON.stringify(preview.graph).includes("storageKey"));
        assert.equal(result.productionPreflight.executionAuthorized, false);
      }
    },
  );
  integration(
    "edits headline through existing graph update helper and preserves all other layers",
    () => {
      const preview = productHeroSlicePreview(load("template"));
      const before = JSON.stringify(preview.graph);
      const headline = preview.graph.layers.find((l) => l.name === "Headline")!;
      const updated = editProductHeroHeadline(
        preview.graph,
        "EDITABLE. BY DESIGN.",
      );
      assert.equal(
        (updated.layers.find((l) => l.id === headline.id) as { text: string })
          .text,
        "EDITABLE. BY DESIGN.",
      );
      assert.deepEqual(
        updated.layers.filter((l) => l.id !== headline.id),
        preview.graph.layers.filter((l) => l.id !== headline.id),
      );
      assert.equal(JSON.stringify(preview.graph), before);
      assert.throws(() => editProductHeroHeadline(preview.graph, ""));
    },
  );
  integration("rejects live-generation claims and out-of-scope results", () => {
    const result = load("template");
    assert.throws(() =>
      productHeroSlicePreview({ ...result, liveAiGeneration: true as false }),
    );
    assert.throws(() =>
      productHeroSlicePreview({
        ...result,
        entryPoint: { ...result.entryPoint, id: "seasonal-campaign" },
      }),
    );
    assert.throws(() => productHeroSlicePreview({ ...result, assets: [] }));
  });
});
