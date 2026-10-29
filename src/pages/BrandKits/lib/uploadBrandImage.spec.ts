import { test } from "node:test";
import assert from "node:assert/strict";
import { uploadBrandImage } from "./uploadBrandImage";
import type { BrandKitSummary } from "./brandKitTypes";
const image = new File([new Uint8Array([1, 2, 3])], "synthetic-reference.png", {
  type: "image/png",
});
const kit: BrandKitSummary = {
  id: "owned",
  name: "Synthetic",
  version: 2,
  assets: [
    {
      id: "asset",
      role: "brand_model",
      status: "ready",
      mimeType: "image/png",
    },
  ],
};
test("the shared image protocol uploads original bytes once and confirms the same owned asset", async () => {
  const calls: string[] = [];
  const result = await uploadBrandImage(
    {
      requestAssetUploadUrl: async (id, body) => {
        assert.equal(id, "owned");
        assert.equal(body.role, "brand_model");
        assert.equal(body.fileSize, 3);
        calls.push("request");
        return {
          assetId: "asset",
          uploadUrl: "https://upload.example.test/synthetic",
        };
      },
      confirmAsset: async (id, asset) => {
        assert.equal(id, "owned");
        assert.equal(asset, "asset");
        calls.push("confirm");
        return kit;
      },
    },
    async (url, file, mime) => {
      assert.equal(file, image);
      assert.equal(mime, "image/png");
      calls.push("put");
    },
    "owned",
    "brand_model",
    image,
  );
  assert.deepEqual(calls, ["request", "put", "confirm"]);
  assert.equal(result.assetId, "asset");
  assert.equal(result.kit, kit);
  assert.equal(result.kit.voice?.studio?.approvedAssetIds, undefined);
});
test("failed binary upload is not retried and never confirms or links an image", async () => {
  let puts = 0,
    confirmed = 0;
  await assert.rejects(
    () =>
      uploadBrandImage(
        {
          requestAssetUploadUrl: async () => ({
            assetId: "asset",
            uploadUrl: "https://upload.example.test/synthetic",
          }),
          confirmAsset: async () => {
            confirmed++;
            return kit;
          },
        },
        async () => {
          puts++;
          throw Error("fixture upload failure");
        },
        "owned",
        "brand_model",
        image,
      ),
    /fixture upload failure/,
  );
  assert.equal(puts, 1);
  assert.equal(confirmed, 0);
});
test("non-image and empty files fail before an API write", async () => {
  let writes = 0;
  const api = {
    requestAssetUploadUrl: async () => {
      writes++;
      return { assetId: "asset", uploadUrl: "unused" };
    },
    confirmAsset: async () => kit,
  };
  for (const file of [
    new File(["text"], "file.txt", { type: "text/plain" }),
    new File([], "empty.png", { type: "image/png" }),
  ])
    await assert.rejects(
      () => uploadBrandImage(api, async () => {}, "owned", "brand_model", file),
      /non-empty image/,
    );
  assert.equal(writes, 0);
});
test("a response for a different kit is never adopted as this profile's source", async () => {
  await assert.rejects(
    () =>
      uploadBrandImage(
        {
          requestAssetUploadUrl: async () => ({
            assetId: "asset",
            uploadUrl: "https://upload.example.test/synthetic",
          }),
          confirmAsset: async () => ({ ...kit, id: "other-account-kit" }),
        },
        async () => {},
        "owned",
        "other",
        image,
      ),
    /association could not be verified/,
  );
});
