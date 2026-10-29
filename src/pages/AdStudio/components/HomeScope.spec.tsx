import { brandMenuPosition } from "./BrandKitHeaderControl";
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

test("Home keeps creation in the hero, removes extra navigation and limits template cards", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <AdStudioHome
        {...actions}
        projects={[]}
        brands={[]}
        brandsLoading={false}
        selectedBrandId=""
        selectedFormat="square_1080"
        templatesV1Enabled
        onUseTemplate={() => undefined}
      />
    </MemoryRouter>,
  );
  assert.doesNotMatch(
    html,
    /Enter the gallery|Open a project to view, edit and export|<nav/,
  );
  assert.match(html, /w0a-hero-actions/);
  assert.ok(html.indexOf("w0a-ads-hero__brand") < html.indexOf("w0a-ads-hero__line"));
  assert.ok(html.indexOf("w0a-ads-hero__line") < html.indexOf("w0a-hero-actions"));
  assert.match(html, /All Templates/);
  assert.match(html, /All Example Briefs/);
  assert.equal((html.match(/Use template<\/button>/g) || []).length, 6);
});
test("full catalog opens all standard layouts with return navigation", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter initialEntries={["/create/ad?catalog=templates"]}>
      <AdStudioHome
        {...actions}
        projects={[]}
        brands={[]}
        brandsLoading={false}
        selectedBrandId=""
        selectedFormat="square_1080"
        templatesV1Enabled
        onUseTemplate={() => undefined}
      />
    </MemoryRouter>,
  );
  assert.match(html, /Back to Ad Studio/);
  assert.equal((html.match(/Use template<\/button>/g) || []).length, 10);
});

test("Brand Kit menu avoids the mobile bottom navigation and clamps horizontal placement", () => {
  const mobile = brandMenuPosition(
    { top: 459, bottom: 495, left: 32 },
    { width: 384, height: 668 },
    { width: 240, height: 150 },
  );
  assert.equal(mobile.top, "auto");
  assert.equal(mobile.bottom, "calc(100% + 8px)");
  assert.equal(mobile.left, 0);
  const right = brandMenuPosition(
    { top: 80, bottom: 116, left: 340 },
    { width: 390, height: 800 },
    { width: 240, height: 150 },
  );
  assert.ok(340 + Number(right.left) + 240 <= 374);
  assert.equal(right.top, "calc(100% + 8px)");
  const long = brandMenuPosition(
    { top: 100, bottom: 136, left: 20 },
    { width: 1440, height: 900 },
    { width: 240, height: 900 },
  );
  assert.ok(Number(long.maxHeight) <= 360);
});


test("Default Brand offers six brief cards with independently labelled aspect controls", () => {
  const html = renderToStaticMarkup(<MemoryRouter><AdStudioHome {...actions} projects={[]} brands={[]} brandsLoading={false} selectedBrandId="" selectedFormat="square_1080" /></MemoryRouter>);
  assert.equal((html.match(/Use as starting brief/g) || []).length, 6);
  assert.equal((html.match(/aria-label="Aspect ratio for /g) || []).length, 6);
  assert.equal((html.match(/aria-pressed="true"/g) || []).length, 6);
  assert.doesNotMatch(html, /ZoeArtisan Lipstick/);
});
