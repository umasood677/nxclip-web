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
  assert.doesNotMatch(html, /<select/);
  assert.match(html, /Variations and refinement become available/);
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
  assert.match(html, /<select/);
  assert.match(html, /AI visual variation/);
  assert.doesNotMatch(html, /Starting layout · not AI-generated/);
});

test("saved campaign direction can prefill the editable instruction without authorizing generation", () => {
  const html = renderToStaticMarkup(<ProductionImageGeneration source={source} assetUrls={{}} initialInstruction="Soft side lighting with a warm neutral backdrop" onSaved={async () => {}} />);
  assert.match(html, /Soft side lighting with a warm neutral backdrop<\/textarea>/);
  assert.match(html, /disabled=""[^>]*>Generate AI advertisement/);
});

test("a new template proposal hides the native starter and offers the preview action without generating",()=>{
 const html=renderToStaticMarkup(<ProductionImageGeneration source={source} renderMode="template-proposal" autoPreflight assetUrls={{}} initialInstruction="Cinematic product hero" onSaved={async()=>{}}/>);
 assert.match(html,/Your finished design will appear here/);
 assert.match(html,/Generate template preview/);
 assert.doesNotMatch(html,/Starting layout · not AI-generated/);
 assert.doesNotMatch(html,/ai-character-options/);
 assert.match(html,/disabled=""[^>]*>Generate template preview/);
});
test("a completed template proposal leads with the finished scene and existing Canvas action",()=>{
 const generated:WorkspaceCreative={...source,imageRenderMode:"template-proposal",sceneGraph:{...source.sceneGraph!,layers:[{id:"ai-background-result",type:"image",assetId:"artwork",x:0,y:0,width:1080,height:1350,zIndex:0},{id:"headline",type:"text",text:"Editable brand headline",x:100,y:100,width:700,height:100,zIndex:2}]}};
 const html=renderToStaticMarkup(<ProductionImageGeneration source={generated} assetUrls={{}} onCustomize={()=>{}} onSaved={async()=>{}}/>);
 assert.match(html,/Finished template proposal/);assert.match(html,/Customize in Canvas/);assert.match(html,/Editable brand headline/);assert.match(html,/one image layer/);assert.match(html,/not verified product inventory/);assert.doesNotMatch(html,/Check AI generation readiness/);
});
