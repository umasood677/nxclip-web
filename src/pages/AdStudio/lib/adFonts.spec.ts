import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveAdFontFamily } from "./adFonts";

describe("adFonts (ADS-08)", () => {
  it("maps playfair and playfair_display to the same CSS family stack", () => {
    const fromId = resolveAdFontFamily("playfair_display");
    const fromAlias = resolveAdFontFamily("playfair");
    const fromFamily = resolveAdFontFamily("Playfair Display");
    assert.equal(fromId, "Playfair Display, serif");
    assert.equal(fromAlias, fromId);
    assert.equal(fromFamily, fromId);
  });

  it("keeps sans-serif stacks for grotesk/display fonts", () => {
    assert.equal(resolveAdFontFamily("montserrat"), "Montserrat, sans-serif");
    assert.equal(resolveAdFontFamily("bebas_neue"), "Bebas Neue, sans-serif");
  });
});
