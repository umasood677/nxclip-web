import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const { renderToStaticMarkup } = createRequire(process.cwd()+"/package.json")("react-dom/server") as { renderToStaticMarkup: (node: React.ReactNode) => string };
import { ProjectCreativeGallery } from "./ProjectCreativeGallery";
import type { WorkspaceCreative } from "../lib/projectWorkspace";
const props = {assetUrls:{},onOpen:()=>undefined,onExport:()=>undefined,onCreate:()=>undefined};
test("empty project gallery has the requested usable creator empty state", () => {
  const html=renderToStaticMarkup(<ProjectCreativeGallery {...props} creatives={[]} />);
  assert.match(html,/Your campaign starts here/); assert.match(html,/Create Ad/);
  assert.match(html,/Example Brief/); assert.doesNotMatch(html,/storageKey/);
});
test("gallery renders every creative with accessible edit and additional actions", () => {
  const creatives:WorkspaceCreative[]=Array.from({length:13},(_,i)=>({id:"private-"+i,projectId:"private-project",name:"Creative "+i}));
  const html=renderToStaticMarkup(<ProjectCreativeGallery {...props} creatives={creatives} />);
  assert.equal((html.match(/Edit creative/g)||[]).length,13);
  assert.match(html,/Creative 12/);assert.match(html,/More actions for Creative 0/);
  assert.doesNotMatch(html,/private-project|private-0/); assert.match(html,/Static ad/);
  assert.match(html,/No preview/);
});
