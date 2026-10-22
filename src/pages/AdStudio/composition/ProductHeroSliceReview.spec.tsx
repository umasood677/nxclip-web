import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ProductHeroSliceReview } from "./ProductHeroSliceReview";
import type { ProductHeroSliceResultV1 } from "./product-hero-slice";
const folder = process.env.W8_PRODUCT_HERO_EVIDENCE;
const integration = folder ? it : it.skip;
const load = (): ProductHeroSliceResultV1 =>
  JSON.parse(readFileSync(join(folder!, "template.result.json"), "utf8"));
describe("Local review component server-rendered compatibility (not browser parity)", () => {
  integration("renders nothing unless explicitly enabled", () => {
    const html = renderToStaticMarkup(
      <ProductHeroSliceReview result={load()} assetUrls={{}} />,
    );
    assert.equal(html, "");
  });
  integration(
    "reuses SceneStage and exposes independent layer/headline controls with honest labels",
    () => {
      const result = load();
      const urls = Object.fromEntries(
        result.assets.map((a) => [
          a.assetId,
          "http://127.0.0.1:9/" + a.assetId + ".png",
        ]),
      );
      const html = renderToStaticMarkup(
        <ProductHeroSliceReview enabled result={result} assetUrls={urls} />,
      );
      assert.ok(html.includes("data-scene-stage"));
      assert.equal((html.match(/data-layer-id=/g) ?? []).length, 9);
      assert.ok(html.includes("independent editable layer"));
      assert.ok(html.includes("no live AI"));
      assert.ok(html.includes("REFERENCE_W7_ONLY"));
      assert.ok(!html.includes("storageKey"));
    },
  );
});
