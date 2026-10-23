import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CLIP_CAPTION_FONTS,
  CLIP_CAPTION_FONT_DEFAULT,
  clipCaptionFontCss,
} from "./clipCaptionFonts";
import { CANONICAL_FACE_OPTIONS } from "./clipTypography/canonicalFaces";

/** Acceptance baseline: W7 d577aa6 legacy catalog (7) + T3 catalog (15). */
const BASELINE_LEGACY_IDS = [
  "montserrat_black",
  "anton",
  "bebas_neue",
  "inter_bold",
  "impact",
  "arial_black",
  "arial",
] as const;

describe("Clip Studio font catalog (P0 regression)", () => {
  it("preserves the W7 legacy caption font allowlist", () => {
    assert.equal(CLIP_CAPTION_FONTS.length, 7);
    assert.deepEqual(
      CLIP_CAPTION_FONTS.map((f) => f.id),
      [...BASELINE_LEGACY_IDS],
    );
    assert.equal(CLIP_CAPTION_FONT_DEFAULT, "montserrat_black");
    for (const font of CLIP_CAPTION_FONTS) {
      assert.ok(font.label.length > 0);
      assert.ok(clipCaptionFontCss(font.id).length > 0);
    }
  });

  it("preserves the Smart Typography 15-face catalog", () => {
    assert.equal(CANONICAL_FACE_OPTIONS.length, 15);
    const ids = new Set(CANONICAL_FACE_OPTIONS.map((f) => f.id));
    assert.ok(ids.has("bebas-neue-400-normal"));
    assert.ok(ids.has("anton-400-normal"));
    assert.ok(ids.has("montserrat-900-normal"));
  });
});
