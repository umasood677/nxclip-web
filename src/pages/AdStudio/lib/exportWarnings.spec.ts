import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { collectExportWarnings } from "./exportWarnings";
import type { AdSceneGraph } from "../types";

describe("exportWarnings", () => {
  it("blocks GROUP layers", () => {
    const graph: AdSceneGraph = {
      schemaVersion: "1",
      canvas: { width: 100, height: 100 },
      layers: [
        {
          id: "g1",
          type: "group",
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          zIndex: 0,
        },
      ],
    };
    const w = collectExportWarnings(graph);
    assert.ok(w.some((x) => x.code === "group_layers" && x.blocking));
  });

  it("blocks missing logo/product images unless placeholders allowed", () => {
    const graph: AdSceneGraph = {
      schemaVersion: "1",
      canvas: { width: 100, height: 100 },
      layers: [
        {
          id: "bg",
          type: "image",
          name: "Background",
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          zIndex: 0,
        },
        {
          id: "logo",
          type: "logo",
          name: "Logo",
          x: 0,
          y: 0,
          width: 40,
          height: 40,
          zIndex: 2,
        },
        {
          id: "t",
          type: "text",
          x: 0,
          y: 0,
          width: 50,
          height: 20,
          zIndex: 1,
          text: "Hi",
          fontFamily: "Unknown Brand Serif",
        },
      ],
    };
    const blocked = collectExportWarnings(graph);
    assert.ok(blocked.some((x) => x.code === "missing_logo" && x.blocking));
    assert.ok(
      blocked.some((x) => x.code === "missing_background_asset" && !x.blocking),
    );
    assert.ok(blocked.some((x) => x.code === "unsupported_font" && !x.blocking));

    const allowed = collectExportWarnings(graph, { allowPlaceholders: true });
    assert.ok(allowed.some((x) => x.code === "missing_logo" && !x.blocking));
  });
});
