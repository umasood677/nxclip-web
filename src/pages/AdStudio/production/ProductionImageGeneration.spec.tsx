import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductionImageGeneration } from "./ProductionImageGeneration";
import type { WorkspaceCreative } from "../lib/projectWorkspace";
import { adImageApi } from "../../../services/apiClient";
const source: WorkspaceCreative = {
  id: "owned-source", projectId: "owned-project", name: "Starting layout", currentVersion: 1,
  sceneGraph: { schemaVersion: "1.0", canvas: { width: 1080, height: 1350 }, layers: [] },
};
const render = (value = source) => renderToStaticMarkup(<ProductionImageGeneration source={value} assetUrls={{}} onSaved={async () => {}} />);
test("AI action and direction remain visible before optional model controls", () => {
  const html = render();
  assert.match(html, /Starting layout · not AI-generated/);
  assert.ok(html.indexOf("Creative direction") < html.indexOf("Check AI generation readiness"));
  assert.ok(html.indexOf("Generate AI advertisement") < html.indexOf('<details class="ai-character-options"'));
  assert.match(html, /<details class="ai-character-options">/);
  assert.doesNotMatch(html, /<details[^>]*\bopen/);
  assert.match(html, /disabled=""[^>]*>Generate AI advertisement/);
  assert.match(html, /Enter creative direction to continue/);
});
test("rendering the workspace never quotes or executes generation", () => {
  const quote = adImageApi.quote, execute = adImageApi.execute;
  let calls = 0;
  adImageApi.quote = async () => { calls++; throw Error("Unexpected quote"); };
  adImageApi.execute = async () => { calls++; throw Error("Unexpected execution"); };
  try { render(); assert.equal(calls, 0); }
  finally { adImageApi.quote = quote; adImageApi.execute = execute; }
});
test("reopened generated creative is identified separately from a starting layout", () => {
  const generated: WorkspaceCreative = { ...source, sceneGraph: { ...source.sceneGraph!, layers: [{ id: "ai-background-owned", type: "image", x:0,y:0,width:1080,height:1350,zIndex:0,assetId:"owned-artwork" }] } };
  const html = render(generated);
  assert.match(html, /AI artwork · saved creative/);
  assert.doesNotMatch(html, /Starting layout · not AI-generated/);
});

test("saved campaign direction can prefill the editable instruction without authorizing generation", () => {
  const html = renderToStaticMarkup(<ProductionImageGeneration source={source} assetUrls={{}} initialInstruction="Soft side lighting with a warm neutral backdrop" onSaved={async () => {}} />);
  assert.match(html, /Soft side lighting with a warm neutral backdrop<\/textarea>/);
  assert.match(html, /disabled=""[^>]*>Generate AI advertisement/);
});
