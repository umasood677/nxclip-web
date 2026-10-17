import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isAdStudioAnimatedEnabled,
  parseAdStudioAnimatedFlag,
} from "./adStudioAnimatedFlag";

describe("adStudioAnimatedFlag (4B-R1.5)", () => {
  it("missing flag = disabled", () => {
    assert.equal(parseAdStudioAnimatedFlag(undefined), false);
    assert.equal(parseAdStudioAnimatedFlag(null), false);
    assert.equal(isAdStudioAnimatedEnabled({}), false);
    assert.equal(isAdStudioAnimatedEnabled({ VITE_AD_STUDIO_ANIMATED: undefined }), false);
  });

  it("explicit false-like values = disabled", () => {
    for (const v of ["false", "0", "no", "off", "", "  ", "FALSE"]) {
      assert.equal(parseAdStudioAnimatedFlag(v), false, v);
    }
  });

  it("arbitrary non-empty strings are not true", () => {
    for (const v of ["enabled", "y", "TRUEISH", "definitely", "ok"]) {
      assert.equal(parseAdStudioAnimatedFlag(v), false, v);
    }
  });

  it("explicit true tokens = enabled", () => {
    for (const v of ["true", "TRUE", "True", "1", "yes", "YES", "on", "On"]) {
      assert.equal(parseAdStudioAnimatedFlag(v), true, v);
    }
    assert.equal(isAdStudioAnimatedEnabled({ VITE_AD_STUDIO_ANIMATED: "true" }), true);
    assert.equal(isAdStudioAnimatedEnabled({ VITE_AD_STUDIO_ANIMATED: true }), true);
    assert.equal(isAdStudioAnimatedEnabled({ VITE_AD_STUDIO_ANIMATED: false }), false);
  });
});
