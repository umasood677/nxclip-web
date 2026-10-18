import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { FONT_MANIFEST, FONT_PACKAGE, LEGACY_FONT_ALIASES, findFontFace } from "./registry";
import { validateFontManifest, type AssetProbe } from "./validateManifest";
import { verifyFontPackage } from "./packageFonts.mjs";

const root=fileURLToPath(new URL("../../../",import.meta.url));
const read=(path:string)=>readFileSync(resolve(root,path));
const sha=(path:string)=>createHash("sha256").update(read(path)).digest("hex");
const probe:AssetProbe={
  exists:(_target,path)=>{try{read(path);return true;}catch{return false;}},
  sha256:(_target,path)=>sha(path),noticeText:(path)=>read(path).toString("utf8"),
};

describe("T2-B1 packaged fonts",()=>{
  it("validates actual bytes, identities, coverage, immutable sources and notices",()=>{
    assert.deepEqual(verifyFontPackage(FONT_PACKAGE),[]);
    assert.deepEqual(validateFontManifest(FONT_MANIFEST,{requireAssets:true,probe}),[]);
  });
  it("has 15 faces, real italic, and separate browser/renderer availability",()=>{
    assert.equal(FONT_MANIFEST.fonts.flatMap((font)=>font.faces).length,15);
    for(const font of FONT_MANIFEST.fonts) for(const face of font.faces){
      assert.equal(face.browser?.availability,"packaged");
      assert.equal(face.browser?.runtimeVerified,false);
      assert.equal(face.renderer?.availability,"retained-candidate");
      assert.equal(face.renderer?.selectionVerified,false);
      assert.equal(face.exportSupport,"blocked");
      assert.deepEqual(face.coverage.testedLanguages,[]);
    }
    assert.equal(findFontFace("playfair-display",400,"italic")?.renderer?.inspection.style,"italic");
    assert.equal(findFontFace("inter",900)?.renderer?.coordinates.wght,900);
    assert.equal(findFontFace("inter",700)?.renderer?.coordinates.opsz,14);
    const unverified=structuredClone(FONT_MANIFEST);
    const face=unverified.fonts[0].faces[0];
    face.exportSupport="ready";face.exportEvidence="claimed";face.blockers=[];
    assert.ok(validateFontManifest(unverified,{probe}).some((error)=>error.includes("Browser/FFmpeg selection evidence missing")));
  });
  it("detects missing and corrupt files without changing disk assets",()=>{
    const path=FONT_PACKAGE.families[0].faces[0].original.path;
    assert.ok(verifyFontPackage(FONT_PACKAGE,(file:string)=>{if(file===path)throw new Error("missing fixture");return read(file);}).some((error:string)=>error.includes("Missing/corrupt")));
    assert.ok(verifyFontPackage(FONT_PACKAGE,(file:string)=>file===path?Buffer.from("corrupt"):read(file)).some((error:string)=>error.includes("Checksum/length mismatch")));
  });
  it("detects invented identity, weight, style and coverage metadata",()=>{
    for(const mutate of [
      (copy:typeof FONT_PACKAGE)=>{copy.families[0].family="Wrong family";},
      (copy:typeof FONT_PACKAGE)=>{copy.families[0].faces[0].weight=900;},
      (copy:typeof FONT_PACKAGE)=>{copy.families[0].faces[0].style="italic";},
      (copy:typeof FONT_PACKAGE)=>{copy.families[0].faces[0].original.inspection.unicodeRanges=["U+0000-FFFF"];},
    ]){
      const copy=structuredClone(FONT_PACKAGE);mutate(copy);
      assert.ok(verifyFontPackage(copy).length>0);
    }
  });
  it("rejects mismatched versions, duplicate IDs, missing faces and notices",()=>{
    const copy=structuredClone(FONT_PACKAGE);
    copy.families[0].assetVersion="2.0.0";
    copy.families.push(structuredClone(copy.families[0]));
    copy.families[1].faces=[];
    copy.families[2].licensePath="missing-license";
    const errors=verifyFontPackage(copy);
    for(const expected of ["version mismatch","Duplicate family ID","Duplicate face ID","Required face inventory mismatch","License/notice missing"]) assert.ok(errors.some((error:string)=>error.includes(expected)));
  });
  it("preserves legacy mappings and labels editorial metadata as proposals",()=>{
    assert.equal(LEGACY_FONT_ALIASES.clip.impact.canonicalId,"anton");
    assert.equal(LEGACY_FONT_ALIASES.clip.arial.canonicalId,"inter");
    assert.equal(LEGACY_FONT_ALIASES.clip.arial_black.canonicalId,"montserrat");
    for(const font of FONT_MANIFEST.fonts){
      assert.equal(font.category?.provenance,"upstream-metadata");
      assert.ok(font.category.values.length);
      assert.equal(font.editorial.status,"proposed");
      assert.equal(font.editorial.provenance,"codex-proposal-not-user-approved");
      assert.equal(font.editorial.originalMetadata,null);
      const defaults=font.editorial.defaultTextStyling!;
      assert.ok(findFontFace(font.id,defaults.weight,defaults.style));
    }
  });
  it("ships only self-hosted URLs in the opt-in stylesheet",()=>{
    const css=read(FONT_PACKAGE.cssPath).toString("utf8");
    assert.ok(css.includes('@font-face'));
    assert.ok(!css.includes("https:"));
    assert.ok(css.includes('NxClip T2 Playfair Display'));
    assert.ok(css.includes("font-style: italic"));
  });
});
