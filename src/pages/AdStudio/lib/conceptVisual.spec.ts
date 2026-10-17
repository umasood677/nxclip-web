import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AdConcept } from "../types";
import {
  brandInitials,
  resolveConceptLayout,
  resolveConceptPalette,
  resolveConceptVisualStyle,
} from "./conceptVisual";

const zoeConcept: AdConcept = {
  conceptId: "zoe-signature-red-1",
  title: "Signature Matte Ritual",
  creativeDirection: "Luxury beauty editorial with dark burgundy atmosphere",
  primaryHeadline: "Signature Red, Perfectly Matte",
  supportingCopy: "ZoeArtisan Signature Red Matte Lipstick for couture color.",
  cta: "Shop Now",
  visualPrompt: "luxury lipstick product hero dark background",
  composition: "product-focused luxury diagonal with elegant typography",
  colorRecommendations: ["#BE123C", "#7F1D1D", "#1C1917"],
  typographyRecommendations: ["serif heading", "clean sans body"],
  platformSuitability: ["instagram_feed"],
};

const brand = {
  id: "brand-zoe",
  name: "ZoeArtisan",
  colors: [
    { role: "primary", hex: "#BE123C" },
    { role: "secondary", hex: "#1C1917" },
  ],
  typography: [{ role: "heading", family: "Montserrat" }],
};

describe("conceptVisual", () => {
  it("maps luxury composition to a distinct layout", () => {
    const layout = resolveConceptLayout(zoeConcept);
    assert.equal(layout, "diagonal-luxury");
  });

  it("prefers concept color recommendations for palette", () => {
    const palette = resolveConceptPalette(zoeConcept, brand);
    assert.equal(palette.primary, "#BE123C");
    assert.ok(palette.colors.includes("#7F1D1D"));
    assert.ok(palette.colors.includes("#1C1917"));
  });

  it("produces different layouts for different compositions", () => {
    const editorial: AdConcept = {
      ...zoeConcept,
      conceptId: "ed-1",
      title: "Split Story",
      composition: "asymmetric split layout with left-aligned copy",
      creativeDirection: "magazine editorial asymmetry",
      colorRecommendations: ["#0F172A", "#F8FAFC"],
    };
    const centered: AdConcept = {
      ...zoeConcept,
      conceptId: "ctr-1",
      title: "Hero Center",
      composition: "centered hero spotlight",
      creativeDirection: "clean hero center focus",
      colorRecommendations: ["#2563EB", "#EFF6FF"],
    };
    assert.equal(resolveConceptLayout(editorial), "left-editorial");
    assert.equal(resolveConceptLayout(centered), "centered-hero");
  });

  it("builds visual style with brand-aware mood for Zoe campaign", () => {
    const style = resolveConceptVisualStyle(zoeConcept, brand);
    assert.equal(style.layout, "diagonal-luxury");
    assert.equal(style.layoutLabel, "Luxury editorial");
    assert.match(style.background, /linear-gradient/);
    assert.ok(style.moodLabel.length > 0);
    assert.equal(brandInitials("ZoeArtisan"), "ZO");
  });

  it("prefers server layoutFamily over composition heuristics", () => {
    const forced: AdConcept = {
      ...zoeConcept,
      layoutFamily: "top-banner",
      composition: "luxury dark matte burgundy velvet",
    };
    assert.equal(resolveConceptLayout(forced), "top-banner");
    assert.equal(
      resolveConceptVisualStyle(forced, brand).layoutLabel,
      "Bold banner",
    );
  });

  it("ignores unsupported layoutFamily and falls back to legacy inference", () => {
    const legacy: AdConcept = {
      ...zoeConcept,
      layoutFamily: "not-real" as AdConcept["layoutFamily"],
      composition: "centered hero spotlight",
      creativeDirection: "clean hero center focus",
      title: "Hero Center",
    };
    assert.equal(resolveConceptLayout(legacy), "centered-hero");
  });
});
