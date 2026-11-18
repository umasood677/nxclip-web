import { brandMenuPosition } from "./BrandKitHeaderControl";
import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { AdStudioHome } from "./AdStudioHome";
import { SavedBrandTemplates } from "./SavedBrandTemplates";
import { CampaignProductReference } from "./CampaignProductReference";
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
test("a selected kit has no demo cards or separate Brand Kit logo in its hero", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <AdStudioHome {...actions} projects={[]} brands={[]} brandsLoading={false}
        selectedBrandId="kit" selectedFormat="square_1080" />
    </MemoryRouter>,
  );
  const hero = html.match(/<header[^>]*w0a-ads-hero[^>]*>.*?<\/header>/)?.[0];
  assert.ok(hero);
  assert.doesNotMatch(hero, /sample-assets|w0a-ads-hero__kit-logo/);
});
test("recent projects has ten cards, full-name tooltips, and a dedicated all-projects view", () => {
  const projects = Array.from({ length: 12 }, (_, id) => ({ id: String(id), name: `Campaign ${id} with a long name` }));
  const render = (url: string) => renderToStaticMarkup(
    <MemoryRouter initialEntries={[url]}>
      <AdStudioHome {...actions} projects={projects} brands={[]} brandsLoading={false}
        selectedBrandId="" selectedFormat="square_1080" />
    </MemoryRouter>,
  );
  const home = render("/create/ad");
  assert.match(home, /title="Campaign 0 with a long name"/);
  assert.doesNotMatch(home, /Campaign 10 with a long name/);
  assert.match(home, /href="\/create\/ad\?catalog=projects"/);
  const all = render("/create/ad?catalog=projects");
  assert.match(all, /Campaign 11 with a long name/);
  assert.match(all, /class="w0a-project-grid"/);
});
test("the Default Templates catalog has a compact breadcrumb and shows default cards with a kit selected", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter initialEntries={["/create/ad?catalog=templates"]}>
      <AdStudioHome {...actions} projects={[]} brands={[]} brandsLoading={false}
        selectedBrandId="kit" selectedFormat="portrait_1080x1350"
        templatesV1Enabled onUseTemplate={() => undefined} />
    </MemoryRouter>,
  );
  assert.match(html, /w0a-home-body--catalog w0a-home-body--default-templates.*aria-label="Breadcrumb"/);
  assert.match(html, /href="\/create\/ad".*aria-current="page">Default Templates/);
  assert.match(html, /default-food-product-hero\.jpg/);
  assert.doesNotMatch(html, /Template library|Template studio|No reusable Brand Templates/);
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
test("approved saved recipes reserve their actual scene dimensions while artwork loads", () => {
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
  assert.match(html, /style="aspect-ratio:1080\/1080"/);
  assert.match(html, /Loading saved artwork/);
  assert.doesNotMatch(html, /Unapproved recipe|sample-assets/);
});

test("uploaded product photos awaiting approval are visible but cannot be selected", () => {
  const html = renderToStaticMarkup(<MemoryRouter><CampaignProductReference
    brand={{ id: "kit", name: "Brand", version: 1, assets: [
      { id: "heels", role: "product_image", status: "ready", label: "Matte black heels" },
    ] }}
    campaignText="Create an ad for matte black heels"
    assetUrls={{}}
    disabled={false}
    onChange={() => assert.fail("Rendering must not select an asset")}
  /></MemoryRouter>);
  assert.match(html, /<optgroup label="Needs Brand Kit approval">/);
  assert.match(html, /<option[^>]*disabled=""[^>]*>Matte black heels<\/option>/);
  assert.match(html, /href="\/brands\/kit\/guided\?step=assets"/);
});

test("home shows active review-only recipes when the kit has no reusable templates", () => {
  const reviewOnly = renderToStaticMarkup(
    <MemoryRouter>
      <SavedBrandTemplates
        brandId="kit"
        data={{
          enabled: true,
          items: [
            { ...recipe, reuseIssues: ["Review the product reference."] },
            { ...recipe, id: "draft", name: "Draft recipe", state: "suggested", saved: false },
            { ...recipe, id: "save-pending", name: "Approved recipe", saved: false },
            { ...recipe, id: "archive", name: "Archived recipe", state: "archived" },
          ],
          error: "",
          loading: false,
          retry: () => undefined,
        }}
        assetUrls={{}}
      />
    </MemoryRouter>,
  );
  assert.match(reviewOnly, /Review the product reference/);
  assert.match(reviewOnly, /Draft recipe/);
  assert.match(reviewOnly, /data-slot="badge"[^>]*>Needs approval<\/span>/);
  assert.match(reviewOnly, /data-slot="badge"[^>]*>Save pending<\/span>/);
  assert.match(reviewOnly, /data-slot="badge"[^>]*>Needs attention<\/span>/);
  assert.match(reviewOnly, /\/brands\/kit\/templates\/recipe/);
  assert.doesNotMatch(reviewOnly, /Start campaign|Archived recipe/);
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
  assert.match(html, /aria-label="Breadcrumb".*href="\/create\/ad".*aria-current="page">Default Templates/);
  assert.equal((html.match(/Use template<\/button>/g) || []).length, 11);
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
  assert.equal((html.match(/aria-pressed="true">Portrait 3:4<\/button>/g) || []).length, 6);
  assert.doesNotMatch(html, /w0a-brand-preview--story|w0a-brand-preview--landscape|w0a-brand-preview--square/);
  assert.doesNotMatch(html, /ZoeArtisan Lipstick/);
});
