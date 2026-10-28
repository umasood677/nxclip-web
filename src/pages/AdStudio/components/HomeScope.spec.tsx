import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { AdStudioHome } from "./AdStudioHome";
import { SavedBrandTemplates } from "./SavedBrandTemplates";
const actions = {
  onSelectBrand: () => undefined,
  onSelectFormat: () => undefined,
  onStartIdea: () => undefined,
  onUseExample: () => undefined,
  onContinueProject: () => undefined,
  onDeleteProject: () => undefined,
  onCreateBrand: () => undefined,
  onEditBrand: () => undefined,
};
test("Default Home has no global recent creatives and no projects from another Brand Kit", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <AdStudioHome
        {...actions}
        projects={[
          { id: "default", name: "Plain campaign", brandKitId: null },
          { id: "branded", name: "PRIVATE BRAND CAMPAIGN", brandKitId: "kit" },
        ]}
        brands={[]}
        brandsLoading={false}
        selectedBrandId=""
        selectedFormat="square_1080"
      />
    </MemoryRouter>,
  );
  assert.match(html, /Plain campaign/);
  assert.doesNotMatch(html, /PRIVATE BRAND CAMPAIGN|Recent creatives/);
});
test("saved-template empty state does not masquerade generic catalog cards as generated brand layouts", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <SavedBrandTemplates
        brandId="kit"
        data={{
          enabled: false,
          items: [],
          error: "",
          loading: false,
          retry: () => undefined,
        }}
        assetUrls={{}}
      />
    </MemoryRouter>,
  );
  assert.match(html, /No reusable Brand Templates/);
  assert.match(html, /activation/);
  assert.doesNotMatch(html, /Model editorial draft|Use in this project/);
});

test("approved saved recipes render their actual scene and authorized asset IDs, not sample layout thumbnails", () => {
  const recipe: import("../../BrandKits/templates/brandTemplateModel").BrandTemplate =
    {
      schemaVersion: 1,
      id: "recipe",
      brandKitId: "kit",
      ownerUserId: "owner",
      name: "Actual saved recipe",
      sourceTemplateId: "product-hero",
      sourceIdentityHash: "hash",
      sourceBrandVersion: 1,
      format: "square_1080",
      revision: 1,
      state: "approved",
      saved: true,
      sceneGraph: {
        schemaVersion: "1.0",
        canvas: { width: 1080, height: 1080 },
        layers: [
          {
            id: "source",
            type: "image",
            assetId: "source-product",
            x: 10,
            y: 10,
            width: 100,
            height: 100,
            zIndex: 1,
          },
        ],
      },
      sourceAssetIds: ["source-product"],
      blockers: [],
      warnings: [],
      provenance: { method: "native-template-engine", catalogVersion: "1" },
    };
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <SavedBrandTemplates
        brandId="kit"
        data={{
          enabled: true,
          items: [
            recipe,
            {
              ...recipe,
              id: "unapproved",
              name: "Unapproved recipe",
              state: "suggested",
            },
          ],
          error: "",
          loading: false,
          retry: () => undefined,
        }}
        assetUrls={{ "source-product": "blob:authorized-product" }}
      />
    </MemoryRouter>,
  );
  assert.match(html, /Actual saved recipe/);
  assert.match(html, /blob:authorized-product/);
  assert.doesNotMatch(html, /Unapproved recipe|sample-assets/);
});
