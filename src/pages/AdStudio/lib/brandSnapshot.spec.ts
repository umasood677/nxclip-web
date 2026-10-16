import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyBrandColorToSelection,
  applyBrandFontToSelection,
  normalizeBrandSnapshot,
} from "./brandSnapshot";
import type { AdSceneGraph } from "../types";

const zoeSnap = {
  brandKitId: "zoe-1",
  name: "ZoeArtisan",
  colors: [
    { role: "primary", hex: "#A6192E" },
    { role: "background", hex: "#1A0A0C" },
  ],
  typography: [{ role: "heading", family: "Playfair Display" }],
  voice: { preferredCta: "Discover Signature Red.", tone: "luxurious" },
  assets: [{ role: "logo_primary", label: "Zoe mark", status: "ready" }],
};

const graph = (): AdSceneGraph => ({
  schemaVersion: "1",
  canvas: { width: 1080, height: 1350, backgroundColor: "#111" },
  layers: [
    {
      id: "headline",
      type: "text",
      x: 40,
      y: 40,
      width: 800,
      height: 100,
      zIndex: 2,
      text: "A RED THAT SPEAKS.",
      color: "#ffffff",
      fontFamily: "Montserrat",
    },
  ],
});

describe("brandSnapshot", () => {
  it("normalizes ZoeArtisan snapshot fields", () => {
    const snap = normalizeBrandSnapshot(zoeSnap);
    assert.ok(snap);
    assert.equal(snap!.name, "ZoeArtisan");
    assert.equal(snap!.colors[0]!.hex, "#A6192E");
    assert.equal(snap!.typography[0]!.family, "Playfair Display");
  });

  it("applies brand color and font only when invoked", () => {
    const snap = normalizeBrandSnapshot(zoeSnap)!;
    const colored = applyBrandColorToSelection(
      graph(),
      "headline",
      snap.colors[0]!.hex,
      "text",
    );
    assert.equal((colored.layers[0] as { color?: string }).color, "#A6192E");
    const fonted = applyBrandFontToSelection(
      colored,
      "headline",
      snap.typography[0]!.family,
    );
    assert.equal(
      (fonted.layers[0] as { fontFamily?: string }).fontFamily,
      "Playfair Display",
    );
  });

  it("returns null for empty snapshot", () => {
    assert.equal(normalizeBrandSnapshot(null), null);
    assert.equal(normalizeBrandSnapshot({}), null);
  });
});
