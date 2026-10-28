import { test } from "node:test";
import assert from "node:assert/strict";
import { placementPreview, savePlacement } from "./placementReview";
import type { WorkspaceCreative } from "../lib/projectWorkspace";
const source = (): WorkspaceCreative =>
  ({
    id: "source",
    projectId: "owned-project",
    name: "Campaign",
    sceneGraph: {
      schemaVersion: "1.0",
      canvas: { width: 1080, height: 1080, backgroundColor: "#000" },
      layers: [
        {
          id: "product",
          type: "image",
          name: "Product",
          assetId: "owned-asset",
          storageKey: "private/key",
          x: 100,
          y: 100,
          width: 300,
          height: 500,
          zIndex: 1,
        },
        {
          id: "headline",
          type: "text",
          name: "Headline",
          text: "Original copy",
          x: 100,
          y: 700,
          width: 600,
          height: 100,
          zIndex: 2,
        },
      ],
    },
  }) as WorkspaceCreative;
test("placement preview reuses existing adaptation without mutating original or its asset bindings", () => {
  const original = source(),
    before = structuredClone(original);
  const graph = placementPreview(
    original,
    "owned-project",
    "vertical_1080x1920",
  );
  assert.equal(graph.canvas.height, 1920);
  assert.equal(graph.layers[0].id, "product");
  assert.equal(
    (graph.layers[0] as { assetId?: string }).assetId,
    "owned-asset",
  );
  assert.equal("storageKey" in graph.layers[0], false);
  assert.deepEqual(original, before);
  assert.equal((graph.layers[1] as { text?: string }).text, "Original copy");
});
test("placement preview rejects another project, unsupported placement and missing graph", () => {
  assert.throws(
    () => placementPreview(source(), "other-project", "square_1080"),
    /this project/,
  );
  assert.throws(
    () => placementPreview(source(), "owned-project", "unsupported"),
    /supported placement/,
  );
  assert.throws(
    () =>
      placementPreview(
        { ...source(), sceneGraph: null },
        "owned-project",
        "square_1080",
      ),
    /usable scene/,
  );
});
test("unreviewed placement cannot write", async () => {
  let calls = 0;
  const api = {
    createCreative: async () => {
      calls++;
      return source();
    },
  };
  await assert.rejects(
    savePlacement(api, source(), "owned-project", "square_1080", false),
    /Review/,
  );
  assert.equal(calls, 0);
});
test("reviewed placement saves separate owned creative through existing API", async () => {
  const original = source();
  let calls = 0;
  const saved = await savePlacement(
    {
      createCreative: async (projectId, body) => {
        calls++;
        assert.equal(projectId, "owned-project");
        assert.equal(body.name, "Campaign / Portrait 4:5");
        return {
          ...original,
          id: "new-copy",
          sceneGraph: body.sceneGraph as unknown as NonNullable<
            WorkspaceCreative["sceneGraph"]
          >,
        };
      },
    },
    original,
    "owned-project",
    "portrait_1080x1350",
    true,
  );
  assert.equal(calls, 1);
  assert.equal(saved.id, "new-copy");
  assert.equal(original.sceneGraph!.canvas.height, 1080);
});
test("save failure propagates without claiming success or modifying source", async () => {
  const original = source(),
    before = structuredClone(original);
  await assert.rejects(
    savePlacement(
      {
        createCreative: async () => {
          throw Error("save failed");
        },
      },
      original,
      "owned-project",
      "square_1080",
      true,
    ),
    /save failed/,
  );
  assert.deepEqual(original, before);
});
test("unexpected returned project, original ID or dimensions cannot report verified save", async () => {
  for (const changed of [
    { id: "source" },
    { id: "new", projectId: "other" },
    { id: "new", sceneGraph: source().sceneGraph },
  ])
    await assert.rejects(
      savePlacement(
        { createCreative: async () => ({ ...source(), ...changed }) },
        source(),
        "owned-project",
        "vertical_1080x1920",
        true,
      ),
      /could not be verified/,
    );
});
