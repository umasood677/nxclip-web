import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import {
  BrandTemplateAiWorkspace,
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
  assert.match(html, /Continue to AI generation/);
  assert.match(html, /separate provider authorization/);
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
