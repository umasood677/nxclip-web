import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertCharacterQuote,
  savedCharacterSelection,
  toggleAdCharacter,
  realImagesEnabled,
  validateImageQuote,
  hasGeneratedBackground,
  verifyGeneratedCreative,
  type ImageQuote,
} from "./imageExecutionModel";
import type { WorkspaceCreative } from "../lib/projectWorkspace";
const quote = (): ImageQuote => ({
  schemaVersion: "1.0",
  sourceHash: "a".repeat(64),
  quoteHash: "b".repeat(64),
  catalogId: "fixture",
  provider: "gemini",
  modelId: "fixture-model",
  estimatedCostUsd: 0.04,
  pricingVersion: "fixture",
  imageCount: 1,
  inputScope: "editable-ad-background",
  referenceCount: 0,
  costBasis: "configured-estimate",
});
const creative = (id: string, projectId = "owned", generated = false) =>
  ({
    id,
    projectId,
    sceneGraph: {
      schemaVersion: "1.0",
      canvas: { width: 1080, height: 1350 },
      layers: generated
        ? [
            {
              id: "ai-background-owned",
              type: "image",
              x: 0,
              y: 0,
              width: 1080,
              height: 1350,
              zIndex: 0,
            },
          ]
        : [],
    },
  }) as unknown as WorkspaceCreative;
test("real image execution requires exact explicit flag", () => {
  for (const value of [undefined, true, false, "TRUE", "false"])
    assert.equal(
      realImagesEnabled({ VITE_AD_STUDIO_REAL_IMAGES_ENABLED: value }),
      false,
    );
  assert.equal(
    realImagesEnabled({ VITE_AD_STUDIO_REAL_IMAGES_ENABLED: "true" }),
    true,
  );
});
test("image quote binds one image and bounded price to provenance", () => {
  assert.equal(validateImageQuote(quote(), 0.1).estimatedCostUsd, 0.04);
  for (const patch of [
    { estimatedCostUsd: NaN },
    { estimatedCostUsd: Infinity },
    { estimatedCostUsd: -1 },
    { estimatedCostUsd: 0.2 },
    { imageCount: 2 },
    { sourceHash: "" },
    { quoteHash: "bad" },
    { inputScope: "whole-product" },
    { provider: "unknown" },
    { pricingVersion: "" },
  ])
    assert.throws(() =>
      validateImageQuote({ ...quote(), ...patch } as ImageQuote, 0.1),
    );
  for (const budget of [NaN, Infinity, 0, -1, 2])
    assert.throws(() => validateImageQuote(quote(), budget));
});
test("requires owned project child persistence and a generated layer", () => {
  const source = creative("source");
  assert.equal(hasGeneratedBackground(source), false);
  const child = creative("child", "owned", true);
  assert.equal(verifyGeneratedCreative(child, source), child);
  for (const invalid of [
    creative("source", "owned", true),
    creative("child", "another", true),
    creative("child"),
  ])
    assert.throws(() => verifyGeneratedCreative(invalid, source));
});


test("ad profile choice is explicit and never inferred from a Brand Kit",()=>{
  assert.deepEqual(savedCharacterSelection(creative("new")),[]);
  const source={...creative("saved"),selectedCharacterIds:["first"]};
  assert.deepEqual(savedCharacterSelection(source),["first"]);
  assert.deepEqual(toggleAdCharacter(["first"],"second"),["first","second"]);
  assert.deepEqual(toggleAdCharacter(["first","second"],"first"),["second"]);
  assert.throws(()=>toggleAdCharacter(["a","b","c","d"],"e"),/four/);
  assert.deepEqual(source.selectedCharacterIds,["first"]);
});

test("older runtimes cannot silently ignore an explicit profile choice",()=>{
 assert.throws(()=>assertCharacterQuote(quote(),[]),/runtime/);
 assert.throws(()=>assertCharacterQuote({...quote(),characterSelectionSupported:true,selectedCharacterIds:["other"]},["chosen"]),/runtime/);
 assert.doesNotThrow(()=>assertCharacterQuote({...quote(),characterSelectionSupported:true,selectedCharacterIds:["chosen"]},["chosen"]));
});
