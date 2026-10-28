import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { BrandAssetsSection } from "./BrandAssetsSection";
test("multiple uploaded logo candidates remain accessible with upload and library actions", () => {
  const html = renderToStaticMarkup(
    <BrandAssetsSection
      brandId="kit"
      onKitUpdated={() => undefined}
      assets={[
        {
          id: "logo-a",
          role: "logo_primary",
          status: "ready",
          label: "Primary lockup",
        },
        {
          id: "logo-b",
          role: "logo_primary",
          status: "ready",
          label: "Alternate lockup",
        },
        {
          id: "other",
          role: "custom_reference",
          status: "ready",
          label: "Existing reference",
        },
      ]}
    />,
  );
  assert.match(html, /Primary lockup/);
  assert.match(html, /Alternate lockup/);
  assert.match(html, /Primary logo candidate/);
  assert.match(html, /Content Library/);
  assert.match(html, /Other attached assets/);
  assert.match(html, /Existing reference/);
  assert.match(html, /3 attached assets/);
});
