import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FEATURED_EXAMPLES } from "../lib/exampleCreatives";
import {
  AD_STUDIO_TEMPLATE_IDS,
  getTemplateDef,
} from "../canvas/templateCatalog";
import {
  resolveCreativeBlueprintPreview,
  preflightCreativeComposition,
  W8_COMPOSITION_ENABLED_DEFAULT,
} from "./blueprintPreview";
import { validateCreativeBlueprint } from "./creative-blueprint.validation";
import blueprints from "./creative-blueprints.v1.json";
describe("W8 frontend contract foundation (not wired into UI)", () => {
  it("covers all current templates and Example Briefs with no UI/catalog mutation", () => {
    assert.deepEqual(
      blueprints
        .filter((b) => b.entryPoint.kind === "template")
        .map((b) => b.entryPoint.id),
      [...AD_STUDIO_TEMPLATE_IDS],
    );
    assert.deepEqual(
      blueprints
        .filter((b) => b.entryPoint.kind === "exampleBrief")
        .map((b) => b.entryPoint.id),
      FEATURED_EXAMPLES.map((e) => e.id),
    );
    for (const id of AD_STUDIO_TEMPLATE_IDS) {
      const bp = resolveCreativeBlueprintPreview({ kind: "template", id });
      const tpl = getTemplateDef(id);
      assert.equal(bp.requirements.length, tpl.slots.length);
    }
  });
  it("preserves Example Brief objective, audience, copy and format", () => {
    for (const example of FEATURED_EXAMPLES) {
      const bp = resolveCreativeBlueprintPreview({
        kind: "exampleBrief",
        id: example.id,
      });
      assert.equal(
        bp.creative.objective,
        example.briefDefaults.advertisingObjective,
      );
      assert.equal(bp.creative.audience, example.briefDefaults.targetAudience);
      assert.equal(
        bp.creative.productOrService,
        example.briefDefaults.productOrService,
      );
      assert.equal(bp.typography.headline, example.headline);
      assert.equal(bp.typography.cta, example.cta);
      assert.equal(bp.output.formatId, example.briefDefaults.outputFormat);
      assert.equal(bp.references[0].approval, "pendingMapping");
    }
  });
  it("validates all generated wire fixtures", () => {
    for (const bp of blueprints)
      assert.equal(validateCreativeBlueprint(bp).valid, true, bp.blueprintId);
  });
  it("is disabled by default, non-billable and cannot authorize execution", () => {
    assert.equal(W8_COMPOSITION_ENABLED_DEFAULT, false);
    const result = preflightCreativeComposition({
      blueprint: resolveCreativeBlueprintPreview({
        kind: "template",
        id: "product-hero",
      }),
      assets: [],
      availableCapabilities: [],
    });
    assert.equal(result.executionAuthorized, false);
    assert.equal(result.readyForCompositionPlanning, false);
    assert.equal(result.credits.range, null);
    assert.ok(result.blockers.some((b) => b.code === "FEATURE_DISABLED"));
    assert.ok(result.blockers.some((b) => b.code === "REFERENCE_W7_ONLY"));
  });
  it("returns defensive copies and rejects unknown fixture ids", () => {
    const first = resolveCreativeBlueprintPreview({
      kind: "template",
      id: "product-hero",
    });
    first.requirements[0].minCount = 0;
    assert.equal(
      resolveCreativeBlueprintPreview({ kind: "template", id: "product-hero" })
        .requirements[0].minCount,
      1,
    );
    assert.throws(() =>
      resolveCreativeBlueprintPreview({ kind: "exampleBrief", id: "invented" }),
    );
  });
});
