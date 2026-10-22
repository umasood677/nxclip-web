import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BrandKitSummary } from "../../BrandKits/lib/brandKitTypes";
import type { AdConcept } from "../types";
import {
  composeTemplatePreview,
  resolveTemplateIdForConcept,
} from "./composeTemplateScene";
import { sceneGraphLeaksStorageKey } from "./sanitizeSceneGraph";
import {
  AD_STUDIO_TEMPLATE_IDS,
  TEMPLATE_CATALOG_V1,
} from "./templateCatalog";

function concept(partial: Partial<AdConcept> & Pick<AdConcept, "conceptId">): AdConcept {
  return {
    title: "Test",
    creativeDirection: "Clean studio",
    primaryHeadline: "Signature finish",
    supportingCopy: "Crafted for everyday elegance.",
    cta: "Shop now",
    visualPrompt: "product on marble",
    composition: "centered product hero",
    layoutFamily: "centered-hero",
    colorRecommendations: ["#7F1D1D"],
    typographyRecommendations: ["Montserrat"],
    platformSuitability: ["instagram"],
    ...partial,
  };
}

function fullBrand(): BrandKitSummary {
  return {
    id: "kit",
    name: "Zoe Artisan",
    colors: [
      { role: "primary", hex: "#7F1D1D" },
      { role: "secondary", hex: "#1C1917" },
      { role: "accent", hex: "#C4A484" },
      { role: "background", hex: "#1C1917" },
      { role: "text", hex: "#F8FAFC" },
    ],
    typography: [
      { role: "heading", family: "Montserrat" },
      { role: "body", family: "Inter" },
    ],
    assets: [
      {
        id: "logo-1",
        role: "logo_primary",
        status: "ready",
        readUrl: "https://cdn.example/logo.png",
        label: "Zoe",
      },
      {
        id: "prod-1",
        role: "product_image",
        status: "ready",
        readUrl: "https://cdn.example/p1.png",
        label: "Red",
      },
      {
        id: "prod-2",
        role: "product_image",
        status: "ready",
        readUrl: "https://cdn.example/p2.png",
        label: "Nude",
      },
      {
        id: "model-1",
        role: "brand_model",
        status: "ready",
        readUrl: "https://cdn.example/model.jpg",
      },
      {
        id: "camp-1",
        role: "campaign_reference",
        status: "ready",
        readUrl: "https://cdn.example/camp.jpg",
      },
    ],
  };
}

describe("composeTemplateScene (UX-2A.2 M3)", () => {
  it("covers all ten catalog templates", () => {
    assert.equal(TEMPLATE_CATALOG_V1.length, 10);
    assert.deepEqual(
      TEMPLATE_CATALOG_V1.map((t) => t.templateId).sort(),
      [...AD_STUDIO_TEMPLATE_IDS].sort(),
    );
  });

  it("builds distinct graphs for all ten templates with full kit", () => {
    const brand = fullBrand();
    const fingerprints = new Set<string>();
    for (const id of AD_STUDIO_TEMPLATE_IDS) {
      const result = composeTemplatePreview({
        concept: concept({
          conceptId: id,
          templateId: id,
          layoutFamily: undefined,
        }),
        brand,
        outputFormat: "portrait_1080x1350",
      });
      assert.notEqual(result.status, "blocked", id);
      assert.ok(result.sceneGraph, id);
      assert.equal(sceneGraphLeaksStorageKey(result.sceneGraph), false, id);
      const types = result.sceneGraph!.layers.map((l) => l.type);
      assert.ok(types.includes("text") || types.includes("shape"), id);
      const fp = result.sceneGraph!.layers.map((l) => l.id).join("|");
      fingerprints.add(fp);
      // z-order stable
      const zs = result.sceneGraph!.layers.map((l) => l.zIndex);
      assert.deepEqual(
        zs,
        [...zs].sort((a, b) => a - b),
        id,
      );
    }
    assert.equal(fingerprints.size, 10);
  });

  it("supports all layer types across catalog", () => {
    const brand = fullBrand();
    const seen = new Set<string>();
    for (const id of AD_STUDIO_TEMPLATE_IDS) {
      const g = composeTemplatePreview({
        concept: concept({ conceptId: id, templateId: id }),
        brand,
        outputFormat: "square_1080",
      }).sceneGraph;
      for (const l of g?.layers ?? []) seen.add(l.type);
    }
    for (const t of ["text", "shape", "image", "logo"] as const) {
      assert.ok(seen.has(t), t);
    }
  });

  it("blockPreview when required assets missing", () => {
    const empty: BrandKitSummary = { id: "k", name: "Empty", assets: [] };
    const result = composeTemplatePreview({
      concept: concept({ conceptId: "c1", templateId: "product-hero" }),
      brand: empty,
      outputFormat: "portrait_1080x1350",
    });
    assert.equal(result.status, "blocked");
    assert.equal(result.sceneGraph, null);
    assert.ok(result.missingRequiredSlotIds.includes("product"));
  });

  it("showSlotHint emits hint layers without inventing imagery", () => {
    const logoOnly: BrandKitSummary = {
      id: "k",
      name: "Logo only",
      assets: [
        {
          id: "logo-1",
          role: "logo_primary",
          status: "ready",
          readUrl: "https://cdn.example/logo.png",
        },
      ],
    };
    const result = composeTemplatePreview({
      concept: concept({ conceptId: "c2", templateId: "social-story" }),
      brand: logoOnly,
      outputFormat: "vertical_1080x1920",
    });
    assert.notEqual(result.status, "blocked");
    assert.ok(result.sceneGraph);
    const hints = result.sceneGraph!.layers.filter((l) =>
      l.id.includes("slotHint"),
    );
    assert.ok(hints.length >= 1);
    const images = result.sceneGraph!.layers.filter((l) => l.type === "image");
    assert.equal(images.length, 0);
  });

  it("allowLogoOnly renders reduced composition", () => {
    const logoOnly: BrandKitSummary = {
      id: "k",
      name: "Logo only",
      assets: [
        {
          id: "logo-1",
          role: "logo_primary",
          status: "ready",
          readUrl: "https://cdn.example/logo.png",
        },
      ],
    };
    const result = composeTemplatePreview({
      concept: concept({ conceptId: "c3", templateId: "minimal-editorial" }),
      brand: logoOnly,
      outputFormat: "portrait_1080x1350",
    });
    assert.ok(result.sceneGraph);
    assert.ok(result.sceneGraph!.layers.some((l) => l.type === "logo"));
  });

  it("maps layoutFamily to default template for legacy concepts", () => {
    assert.equal(
      resolveTemplateIdForConcept(
        concept({ conceptId: "x", layoutFamily: "diagonal-luxury" }),
      ),
      "texture-showcase",
    );
  });

  it("multi-shade reserves empty shade cells without fabricating duplicates", () => {
    const brand = fullBrand(); // 2 product images, maxCount 4
    const result = composeTemplatePreview({
      concept: concept({
        conceptId: "ms",
        templateId: "multi-shade-collection",
      }),
      brand,
      outputFormat: "portrait_1080x1350",
    });
    assert.equal(result.status, "ready");
    assert.ok(result.sceneGraph);
    const images = result.sceneGraph!.layers.filter((l) => l.type === "image");
    const empties = result.sceneGraph!.layers.filter((l) =>
      String(l.name).includes("empty"),
    );
    assert.equal(images.length, 2);
    assert.equal(empties.length, 2);
    assert.equal(new Set(images.map((l) => l.assetId)).size, 2);
    assert.ok(images[0]!.width < result.sceneGraph!.canvas.width * 0.5);
  });

  it("prefers server sceneGraph when present", () => {
    const serverGraph = {
      schemaVersion: "1.0",
      canvas: { width: 1080, height: 1080, backgroundColor: "#000" },
      layers: [
        {
          id: "server:text:h",
          type: "text" as const,
          text: "From server",
          x: 10,
          y: 10,
          width: 200,
          height: 40,
          zIndex: 1,
        },
      ],
    };
    const result = composeTemplatePreview({
      concept: concept({
        conceptId: "srv",
        templateId: "product-hero",
        sceneGraph: serverGraph,
      }),
      brand: fullBrand(),
      outputFormat: "square_1080",
    });
    assert.equal(result.sceneGraph?.layers[0]?.id, "server:text:h");
  });

  it("never puts storageKey on composed layers", () => {
    const brand = fullBrand();
    const result = composeTemplatePreview({
      concept: concept({ conceptId: "sk", templateId: "product-hero" }),
      brand,
      outputFormat: "landscape_1920x1080",
    });
    assert.equal(sceneGraphLeaksStorageKey(result.sceneGraph), false);
    for (const layer of result.sceneGraph?.layers ?? []) {
      assert.equal(
        "storageKey" in layer &&
          Boolean((layer as { storageKey?: string }).storageKey),
        false,
      );
    }
  });

  it("scales across aspect ratios", () => {
    const brand = fullBrand();
    for (const format of [
      "square_1080",
      "portrait_1080x1350",
      "vertical_1080x1920",
      "landscape_1920x1080",
    ]) {
      const g = composeTemplatePreview({
        concept: concept({ conceptId: format, templateId: "product-hero" }),
        brand,
        outputFormat: format,
      }).sceneGraph!;
      assert.ok(g.canvas.width >= 1080);
      assert.ok(g.canvas.height >= 1080);
    }
  });
});
