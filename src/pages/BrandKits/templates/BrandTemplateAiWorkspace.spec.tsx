import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import {
  BrandTemplateAiWorkspace,
  TemplateCampaignNavigation,
  verifyTemplateSource,
} from "./BrandTemplateAiWorkspace";
test("AI entry renders the existing campaign path without automatically generating or writing", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <BrandTemplateAiWorkspace
        kit={{ id: "brand", name: "Synthetic brand" }}
        projects={[
          {
            id: "owned",
            name: "Owned campaign",
            brandKitId: "brand",
            outputFormat: "square_1080",
          },
          {
            id: "foreign",
            name: "Other brand campaign",
            brandKitId: "other",
            outputFormat: "square_1080",
          },
        ]}
        initialFormat="square_1080"
        onBack={() => {}}
      />
    </MemoryRouter>,
  );
  assert.match(html, /Owned campaign/);
  assert.doesNotMatch(html, /Other brand campaign/);
  assert.match(html, /Continue to preview generation/);
  assert.match(html, /Review the Google request/);
  assert.match(html, /disabled=""/);
  assert.doesNotMatch(html, /AI-to-library publishing is not available/);
});
test("no eligible campaign has a clear recovery path and does not choose another brand", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <BrandTemplateAiWorkspace
        kit={{ id: "brand", name: "Synthetic brand" }}
        projects={[]}
        initialFormat="portrait_1080x1350"
        onBack={() => {}}
      />
    </MemoryRouter>,
  );
  assert.match(html, /No campaign uses this Brand Kit and format/);
  assert.match(html, /Create a campaign/);
});

test("reopen rejects another Brand Kit and invalid versions", () => {
  const creative = {
    id: "source",
    projectId: "project",
    name: "Source",
    currentVersion: 1,
    sceneGraph: {
      schemaVersion: "1.0" as const,
      canvas: { width: 1080, height: 1080 },
      layers: [],
    },
  };
  assert.throws(
    () =>
      verifyTemplateSource(
        creative,
        [{ id: "project", name: "Other", brandKitId: "other" }],
        "brand",
      ),
    /unavailable/,
  );
  assert.throws(
    () =>
      verifyTemplateSource(
        { ...creative, currentVersion: 0 },
        [{ id: "project", name: "Owned", brandKitId: "brand" }],
        "brand",
      ),
    /unavailable/,
  );
  assert.equal(
    verifyTemplateSource(
      creative,
      [{ id: "project", name: "Owned", brandKitId: "brand" }],
      "brand",
    ).id,
    "source",
  );
});

 test("campaign AI entry preselects only the same-brand campaign and its aspect ratio", () => {
  const projects = [{id:"owned", name:"Owned landscape campaign", brandKitId:"brand", outputFormat:"landscape_1920x1080"},{id:"foreign",name:"Other brand campaign",brandKitId:"other",outputFormat:"landscape_1920x1080"}];
  const render = (campaign:string) => renderToStaticMarkup(<MemoryRouter initialEntries={["/?mode=ai&campaign="+campaign]}><BrandTemplateAiWorkspace kit={{id:"brand",name:"Synthetic brand"}} projects={projects} initialFormat="portrait_1080x1350" onBack={()=>{}} /></MemoryRouter>);
  const owned = render("owned");
  assert.match(owned, /value="owned" selected=""/);
  assert.match(owned, /value="landscape_1920x1080" selected=""/);
  const foreign = render("foreign");
  assert.doesNotMatch(foreign, /value="foreign"/);
  assert.match(foreign, /value="portrait_1080x1350" selected=""/);
 });

test("template draft links preserve the persisted campaign and creative through every workflow stage", () => {
 const html = renderToStaticMarkup(<MemoryRouter><TemplateCampaignNavigation source={{id:"creative/a",projectId:"campaign/b"}} /></MemoryRouter>);
 const links = [...html.matchAll(/href="([^"]+)"/g)].map(m=>new URL(m[1].replace(/&amp;/g,"&"),"http://localhost"));
 assert.equal(links.length,6);
 assert.deepEqual(links.slice(0,5).map(x=>x.searchParams.get("view")),["workspace","brief","templates","concepts","director"]);
 for(const link of links.slice(0,5)){assert.equal(link.pathname,"/create/ad/projects/campaign%2Fb");assert.equal(link.searchParams.get("creative"),"creative/a");}
 assert.equal(links[5].pathname,"/create/ad/creative%2Fa");
});
