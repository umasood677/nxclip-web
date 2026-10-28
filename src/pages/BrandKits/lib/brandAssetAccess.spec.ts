import { test } from "node:test";
import assert from "node:assert/strict";
import {
  protectedBrandMediaPath,
  isUsableBrandImage,
} from "./secureBrandMedia";
import {
  selectableBrandImage,
  readLibraryImageFile,
} from "./contentLibraryAsset";
import { buildBrandAssetUrlMap } from "../../AdStudio/canvas/brandAssetUrls";
test("protected media is canonicalized to the owning kit without token query or arbitrary origin", () => {
  assert.equal(
    protectedBrandMediaPath(
      "https://untrusted.example/brands/kit/assets/a/media?token=secret",
      "kit",
    ),
    "/brands/kit/assets/a/media",
  );
  assert.equal(
    protectedBrandMediaPath(
      "/api/gateway-proxy/brands/kit/assets/a/media",
      "kit",
    ),
    "/brands/kit/assets/a/media",
  );
  assert.equal(
    protectedBrandMediaPath("/brands/other/assets/a/media", "kit"),
    null,
  );
  assert.equal(
    protectedBrandMediaPath("https://example.com/image.png", "kit"),
    null,
  );
});
test("bad media bodies do not become image previews", () => {
  assert.equal(
    isUsableBrandImage({ type: "application/json", size: 400 }),
    false,
  );
  assert.equal(isUsableBrandImage({ type: "image/png", size: 0 }), false);
  assert.equal(
    isUsableBrandImage({ type: "image/png", size: 30 * 1024 * 1024 }),
    false,
  );
  assert.equal(isUsableBrandImage({ type: "image/webp", size: 400 }), true);
});
test("relative authenticated image paths retain every uploaded candidate", () => {
  const urls = buildBrandAssetUrlMap({
    id: "kit",
    name: "Kit",
    assets: [
      {
        id: "a",
        status: "ready",
        role: "logo_primary",
        readUrl: "/brands/kit/assets/a/media",
      },
      {
        id: "b",
        status: "ready",
        role: "logo_primary",
        readUrl: "/brands/kit/assets/b/media",
      },
    ],
  });
  assert.deepEqual(Object.keys(urls), ["a", "b"]);
});
test("library picker excludes clips and failed assets", () => {
  assert.equal(
    selectableBrandImage({ contentType: "clip", status: "published" }),
    false,
  );
  assert.equal(
    selectableBrandImage({ contentType: "image", status: "generation_failed" }),
    false,
  );
  assert.equal(
    selectableBrandImage({ contentType: "image", status: "draft" }),
    true,
  );
});
test("library read uses only authenticated media API and preserves bytes", async () => {
  let called = "";
  const result = await readLibraryImageFile(
    "own-image",
    "test-token",
    "http://localhost:5100",
    (async (url, init) => {
      called = String(url);
      assert.equal(
        new Headers(init?.headers).get("X-Target-Gateway-Url"),
        "http://localhost:5100",
      );
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        "Bearer test-token",
      );
      assert.equal(init?.redirect, "error");
      return new Response(new Uint8Array([1, 2, 3, 4]), {
        headers: { "Content-Type": "image/png" },
      });
    }) as typeof fetch,
  );
  assert.equal(called, "/api/gateway-proxy/content/own-image/media");
  assert.deepEqual(
    [...new Uint8Array(await result.arrayBuffer())],
    [1, 2, 3, 4],
  );
});
test("library read fails without credentials or on unauthorized/non-image responses", async () => {
  await assert.rejects(
    () => readLibraryImageFile("id", "", "local"),
    /Sign in/,
  );
  await assert.rejects(
    () =>
      readLibraryImageFile(
        "id",
        "test",
        "local",
        (async () => new Response(null, { status: 403 })) as typeof fetch,
      ),
    /403/,
  );
  await assert.rejects(
    () =>
      readLibraryImageFile(
        "id",
        "test",
        "local",
        (async () =>
          new Response("{}", {
            headers: { "Content-Type": "application/json" },
          })) as typeof fetch,
      ),
    /PNG/,
  );
});
