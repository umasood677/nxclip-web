import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const snapshot = JSON.parse(readFileSync(new URL("./existing-font-audit.json", import.meta.url), "utf8").replace(/^\uFEFF/, ""));
describe("Existing font evidence (requires sibling backend and its installed fontkit)", () => {
  it("matches actual binary hashes, metadata, codepoint ranges and local notices", () => {
    const actual = JSON.parse(execFileSync(process.execPath, [fileURLToPath(new URL("./auditExistingFonts.mjs", import.meta.url))], { encoding: "utf8" }));
    assert.deepEqual(actual, snapshot);
    assert.equal(actual.files.length, 7);
  });
  it("records Inter as variable, not a static bold face", () => {
    const inter = snapshot.files.find((file) => file.path.endsWith("Inter-Bold.ttf"));
    assert.equal(inter.reportedWeight, 400);
    assert.equal(inter.variationAxes.wght.min, 100);
    assert.equal(inter.variationAxes.wght.max, 900);
    assert.equal(inter.namedVariations.Bold.wght, 700);
    assert.equal(inter.namedVariations.Black.wght, 900);
  });
  it("records both Montserrat legacy and preferred family names", () => {
    const montserrat = snapshot.files.find((file) => file.path.endsWith("Montserrat-Black.ttf"));
    assert.equal(montserrat.family, "Montserrat Black");
    assert.equal(montserrat.preferredFamily, "Montserrat");
    assert.equal(montserrat.preferredSubfamily, "Black");
    assert.equal(montserrat.reportedWeight, 900);
  });
  it("separates embedded license declarations from packaged full notices", () => {
    for (const file of snapshot.files) {
      assert.match(file.sha256, /^[a-f0-9]{64}$/);
      assert.ok(file.unicodeRanges.length > 0);
      assert.deepEqual(file.testedLanguages, []);
      assert.equal(file.exportSupport, "unverified");
      if (file.repository === "backend") {
        assert.match(file.embeddedLicense, /SIL Open Font License/);
        assert.equal(file.notice, null);
      } else {
        assert.equal(file.reportedWeight, 400);
        assert.equal(file.notice.containsOfl11, true);
      }
    }
  });
});
