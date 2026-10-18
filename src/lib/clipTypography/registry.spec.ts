import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CLIP_CAPTION_FONTS } from "../clipCaptionFonts";
import { STAGED_FONT_MANIFEST as FONT_MANIFEST, LEGACY_FONT_ALIASES, findFontFace, resolveLegacyFont } from "./registry";
import { validateFontManifest, type AssetProbe } from "./validateManifest";

const copy = () => structuredClone(FONT_MANIFEST);
const hash = "a".repeat(64);
const probe: AssetProbe = {
  exists: () => true, sha256: () => hash,
  noticeText: () => `SIL OPEN FONT LICENSE Version 1.1\n${FONT_MANIFEST.fonts[0].license.copyrightNotice}`,
};
function packaged() {
  const manifest = copy();
  const font = manifest.fonts[0];
  const face = font.faces[0];
  font.source.revision = "c".repeat(40);
  font.license.packagingApproved = true;
  Object.assign(face, {
    assetVersion: "1.0.0", browserAssetPath: "public/fonts/bebas-neue/1.0.0/400.woff2",
    rendererAssetPath: "assets/fonts/bebas-neue/1.0.0/400.ttf",
    browserSha256: hash, rendererSha256: hash,
    licenseNoticePath: "public/fonts/bebas-neue/1.0.0/OFL.txt",
    coverage: { status: "verified", unicodeRanges: ["U+0020-007E"], testedLanguages: [] },
    exportSupport: "ready", exportEvidence: "test-fixture-only: renderer selection and parity", blockers: [],
  });
  return manifest;
}

describe("Clip typography registry T2-A", () => {
  it("contains all ten families and exactly the 15 required faces", () => {
    assert.equal(FONT_MANIFEST.fonts.length, 10);
    assert.equal(FONT_MANIFEST.fonts.flatMap((f) => f.faces).length, 15);
    assert.deepEqual(Object.fromEntries(FONT_MANIFEST.fonts.map((font) => [font.id, font.faces.map((face) => `${face.weight}-${face.style}`)])), {
      "bebas-neue": ["400-normal"], anton: ["400-normal"], "archivo-black": ["400-normal"],
      montserrat: ["800-normal", "900-normal"], poppins: ["700-normal", "900-normal"],
      inter: ["700-normal", "900-normal"], "playfair-display": ["700-normal", "400-italic"],
      "plus-jakarta-sans": ["700-normal", "800-normal"], caveat: ["700-normal"], "jetbrains-mono": ["700-normal"],
    });
    assert.deepEqual(validateFontManifest(FONT_MANIFEST), []);
    assert.ok(findFontFace("playfair-display", 400, "italic"));
    assert.ok(findFontFace("inter", 900));
    assert.ok(findFontFace("plus-jakarta-sans", 800));
  });
  it("rejects duplicate canonical and face IDs", () => {
    const manifest = copy();
    manifest.fonts.push(structuredClone(manifest.fonts[0]));
    const errors = validateFontManifest(manifest);
    assert.ok(errors.some((e) => e.includes("Duplicate canonical ID")));
    assert.ok(errors.some((e) => e.includes("Duplicate face ID")));
  });
  it("preserves every existing Clip ID without changing its catalog", () => {
    assert.deepEqual(Object.keys(LEGACY_FONT_ALIASES.clip).sort(), CLIP_CAPTION_FONTS.map((f) => f.id).sort());
    for (const id of Object.keys(LEGACY_FONT_ALIASES.clip)) {
      const target = LEGACY_FONT_ALIASES.clip[id as keyof typeof LEGACY_FONT_ALIASES.clip];
      assert.ok(findFontFace(target.canonicalId, target.weight, target.style));
    }
    assert.deepEqual(resolveLegacyFont("clip", "impact"), { canonicalId: "anton", weight: 400, style: "normal" });
    assert.deepEqual(resolveLegacyFont("clip", "arial_black"), { canonicalId: "montserrat", weight: 900, style: "normal" });
    assert.deepEqual(resolveLegacyFont("clip", "arial"), { canonicalId: "inter", weight: 700, style: "normal" });
  });
  it("keeps contextual aliases and unsupported Brand/Ad IDs explicit", () => {
    assert.deepEqual(resolveLegacyFont("brand", "playfair"), { canonicalId: "playfair-display" });
    assert.ok(resolveLegacyFont("ad", "impact"));
    assert.equal(findFontFace("impact", 400), undefined);
    assert.equal(resolveLegacyFont("clip", "unknown"), undefined);
    assert.equal(resolveLegacyFont("clip", "toString"), undefined);
    assert.equal(findFontFace("poppins", 400), undefined);
    assert.equal(findFontFace("inter", 700, "italic"), undefined);
  });
  it("rejects missing families and required weights/styles", () => {
    const manifest = copy();
    manifest.fonts.pop();
    manifest.fonts[4].faces.pop();
    assert.ok(validateFontManifest(manifest).some((e) => e.includes("Required family missing")));
    assert.ok(validateFontManifest(manifest).some((e) => e.includes("Required weights/styles differ")));
  });
  it("rejects invalid weights, face identity and family metadata", () => {
    const manifest = copy();
    manifest.fonts[0].faces[0].weight = 950;
    manifest.fonts[0].family = "";
    const errors = validateFontManifest(manifest);
    for (const message of ["Invalid weight", "Invalid face ID", "Invalid font metadata"]) assert.ok(errors.some((e) => e.includes(message)));
  });
  it("rejects invalid versions and SHA-256 structure", () => {
    const manifest = packaged();
    manifest.registryVersion = "latest";
    manifest.fonts[0].source.revision = "main";
    manifest.fonts[0].faces[0].assetVersion = "v1";
    manifest.fonts[0].faces[0].browserSha256 = "fake";
    const errors = validateFontManifest(manifest, { probe });
    for (const message of ["Invalid registryVersion", "Invalid source revision", "Invalid asset version", "invalid SHA-256"]) assert.ok(errors.some((e) => e.includes(message)));
  });
  it("accepts a staged manifest but rejects missing assets for release", () => {
    assert.deepEqual(validateFontManifest(FONT_MANIFEST), []);
    const errors = validateFontManifest(FONT_MANIFEST, { requireAssets: true, probe });
    assert.equal(errors.filter((e) => e.includes("asset missing")).length, 30);
  });
  it("detects missing files and mismatched actual checksums", () => {
    assert.ok(validateFontManifest(packaged(), { probe: { ...probe, exists: () => false } }).some((e) => e.includes("asset missing")));
    assert.ok(validateFontManifest(packaged(), { probe: { ...probe, sha256: () => "b".repeat(64) } }).some((e) => e.includes("checksum mismatch")));
  });
  it("rejects incomplete asset pairs and unsafe paths", () => {
    const manifest = packaged();
    manifest.fonts[0].faces[0].browserAssetPath = "../outside.woff2";
    manifest.fonts[0].faces[0].rendererSha256 = null;
    const errors = validateFontManifest(manifest, { probe });
    assert.ok(errors.some((e) => e.includes("invalid path/version")));
    assert.ok(errors.some((e) => e.includes("pair incomplete")));
  });
  it("validates licenses and required packaged notices", () => {
    const manifest = packaged();
    manifest.fonts[0].license.copyrightNotice = "";
    manifest.fonts[0].faces[0].licenseNoticePath = null;
    const errors = validateFontManifest(manifest, { probe });
    assert.ok(errors.some((e) => e.includes("Invalid license metadata")));
    assert.ok(errors.some((e) => e.includes("License notice missing")));
    assert.ok(validateFontManifest(packaged(), { probe: { ...probe, noticeText: () => "unrelated file" } }).some((e) => e.includes("License notice content mismatch")));
  });
  it("blocks unsupported export declarations even when files exist", () => {
    const manifest = packaged();
    manifest.fonts[0].license.packagingApproved = false;
    assert.ok(validateFontManifest(manifest, { probe }).some((e) => e.includes("Unsupported export-ready")));
    assert.ok(validateFontManifest(packaged()).some((e) => e.includes("Unsupported export-ready")));
    assert.deepEqual(validateFontManifest(packaged(), { probe }), []);
    assert.ok(FONT_MANIFEST.fonts.every((f) => f.faces.every((face) => face.exportSupport === "blocked")));
  });
  it("does not invent original styling, AI tags, use cases or language guarantees", () => {
    for (const font of FONT_MANIFEST.fonts) {
      assert.equal(font.editorial.status, "awaiting-original-spec");
      assert.equal(font.editorial.aiTags, null);
      assert.equal(font.editorial.useCases, null);
      assert.equal(font.editorial.defaultTextStyling, null);
      assert.ok(font.faces.every((face) => face.coverage.testedLanguages.length === 0));
    }
    const manifest = copy();
    manifest.fonts[0].editorial.status = "specified";
    assert.ok(validateFontManifest(manifest).some((e) => e.includes("Incomplete original styling")));
  });
});
