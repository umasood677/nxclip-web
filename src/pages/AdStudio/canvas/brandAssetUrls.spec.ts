import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BrandKitSummary } from "../../BrandKits/lib/brandKitTypes";
import {
  buildBrandAssetUrlMap,
  buildBrandAssetUrlMapByStorageKey,
  listBrandAssetsBySlotRole,
  resolveAssetUrl,
  resolveLayerAssetUrl,
} from "./brandAssetUrls";

const brand: BrandKitSummary = {
  id: "kit-1",
  name: "Zoe",
  assets: [
    {
      id: "a-logo",
      role: "logo_primary",
      status: "ready",
      readUrl: "https://signed.example/logo.png?token=abc",
      label: "Mark",
    },
    {
      id: "a-product",
      role: "product_image",
      status: "ready",
      readUrl: "https://signed.example/product.png?token=xyz",
    },
    {
      id: "a-pending",
      role: "product_image",
      status: "pending",
      readUrl: "https://signed.example/pending.png",
    },
    {
      id: "a-leak",
      role: "brand_model",
      status: "ready",
      // storage-key shaped — must not enter URL map
      readUrl: "brands/owner/kit/asset/model.jpg" as unknown as string,
    },
  ],
};

describe("brandAssetUrls", () => {
  it("maps ready https readUrls by asset id", () => {
    const map = buildBrandAssetUrlMap(brand);
    assert.equal(map["a-logo"], "https://signed.example/logo.png?token=abc");
    assert.equal(map["a-product"], "https://signed.example/product.png?token=xyz");
    assert.equal(map["a-pending"], undefined);
    assert.equal(map["a-leak"], undefined);
  });

  it("resolves slot roles without exposing storage keys", () => {
    const logos = listBrandAssetsBySlotRole(brand, "logo");
    assert.equal(logos.length, 1);
    assert.equal(logos[0]!.assetId, "a-logo");
    assert.ok(!("storageKey" in logos[0]!));
  });

  it("resolveAssetUrl rejects non-http (allows gateway-proxy and blob)", () => {
    assert.equal(resolveAssetUrl({ x: "brands/x" }, "x"), null);
    assert.equal(
      resolveAssetUrl({ x: "https://ok.example/a.png" }, "x"),
      "https://ok.example/a.png",
    );
    assert.equal(
      resolveAssetUrl(
        {
          x: "/api/gateway-proxy/brands/k/assets/a/media?token=t",
        },
        "x",
      ),
      "/api/gateway-proxy/brands/k/assets/a/media?token=t",
    );
    assert.equal(
      resolveAssetUrl({ x: "blob:http://127.0.0.1:3000/abc" }, "x"),
      "blob:http://127.0.0.1:3000/abc",
    );
  });

  it("resolveLayerAssetUrl never treats storageKey as a browser URL", () => {
    const byKey = buildBrandAssetUrlMapByStorageKey({
      id: "k",
      name: "K",
      assets: [
        {
          id: "a1",
          role: "logo_primary",
          status: "ready",
          readUrl: "https://cdn.example/logo.png",
          storageKey: "brands/o/k/a1/logo.png",
        } as never,
      ],
    });
    const url = resolveLayerAssetUrl(
      {},
      byKey,
      { storageKey: "brands/o/k/a1/logo.png" },
    );
    assert.equal(url, "https://cdn.example/logo.png");
    assert.equal(
      resolveLayerAssetUrl({}, {}, { storageKey: "https://evil.example/x" }),
      null,
    );
  });
});
