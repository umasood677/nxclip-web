import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isAdStudioTemplatesV1Enabled,
  parseAdStudioTemplatesV1Flag,
} from "./adStudioTemplatesFlag";

describe("adStudioTemplatesFlag (UX-2A.2 M3)", () => {
  it("defaults OFF", () => {
    assert.equal(parseAdStudioTemplatesV1Flag(undefined), false);
    assert.equal(parseAdStudioTemplatesV1Flag(null), false);
    assert.equal(isAdStudioTemplatesV1Enabled({}), false);
    assert.equal(
      isAdStudioTemplatesV1Enabled({ VITE_AD_STUDIO_TEMPLATES_V1: undefined }),
      false,
    );
  });

  it("rejects non-explicit truthy strings", () => {
    for (const v of ["false", "0", "enabled", "y", "ok"]) {
      assert.equal(parseAdStudioTemplatesV1Flag(v), false, v);
    }
  });

  it("accepts explicit true tokens", () => {
    for (const v of ["true", "TRUE", "1", "yes", "on"]) {
      assert.equal(parseAdStudioTemplatesV1Flag(v), true, v);
    }
    assert.equal(
      isAdStudioTemplatesV1Enabled({ VITE_AD_STUDIO_TEMPLATES_V1: true }),
      true,
    );
  });
});
