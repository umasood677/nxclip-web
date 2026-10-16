import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contrastLabel, contrastRatio, isValidHex, normalizeHex } from "./colorContrast";

describe("colorContrast", () => {
  it("normalizes and validates hex", () => {
    assert.equal(normalizeHex("ab12cd"), "#AB12CD");
    assert.equal(isValidHex("#FFFFFF"), true);
    assert.equal(isValidHex("zzz"), false);
  });

  it("computes high contrast for black on white", () => {
    const ratio = contrastRatio("#000000", "#FFFFFF");
    assert.ok(ratio > 20);
    assert.equal(contrastLabel(ratio).ok, true);
  });

  it("flags low contrast pairs", () => {
    const ratio = contrastRatio("#777777", "#888888");
    assert.equal(contrastLabel(ratio).ok, false);
  });
});
