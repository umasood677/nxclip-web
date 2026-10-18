import { REQUIRED_FACES, type FontEntry } from "./registry";

export interface AssetProbe {
  /** Paths are logical repo-relative paths; callers supply repository roots. */
  exists(target: "browser" | "renderer" | "notice", path: string): boolean;
  sha256(target: "browser" | "renderer", path: string): string;
  noticeText(path: string): string;
}

const version = /^\d+\.\d+\.\d+$/;
const checksum = /^[a-f0-9]{64}$/;
const localPath = (path: string) => !path.startsWith("/") && !path.includes("\\") && !path.includes(":") && !path.split("/").some((part) => part === ".." || !part);

/** Structural checks accept explicitly missing assets; release checks do not. */
export function validateFontManifest(
  manifest: { schemaVersion: string; registryVersion: string; fonts: FontEntry[] },
  options: { requireAssets?: boolean; probe?: AssetProbe } = {},
): string[] {
  const errors: string[] = [];
  if (!["1.0.0", "1.1.0"].includes(manifest.schemaVersion)) errors.push("Unsupported schemaVersion");
  if (!version.test(manifest.registryVersion)) errors.push("Invalid registryVersion");
  const ids = new Set<string>();
  const faceIds = new Set<string>();
  for (const font of manifest.fonts) {
    const fail = (message: string) => errors.push(`${font.id}: ${message}`);
    if (ids.has(font.id)) fail("Duplicate canonical ID");
    ids.add(font.id);
    if (!Object.hasOwn(REQUIRED_FACES, font.id) || !font.family.trim()) fail("Invalid font metadata");
    if (!/^https:\/\//.test(font.source.metadataUrl) || !/^https:\/\//.test(font.source.licenseUrl) || !/^\d{4}-\d{2}-\d{2}$/.test(font.source.checkedOn)) fail("Invalid source evidence");
    if (font.source.revision !== null && !/^[a-f0-9]{40}$/.test(font.source.revision)) fail("Invalid source revision");
    if (font.license.spdx !== "OFL-1.1" || !font.license.copyrightNotice.trim() || font.license.requiredNotices.length < 3) fail("Invalid license metadata");
    if (font.editorial.status === "specified") {
      const defaults = font.editorial.defaultTextStyling;
      if (!font.editorial.originalMetadata || !font.editorial.aiTags?.length || !font.editorial.useCases?.length || !defaults || !font.faces.some((face) => face.weight === defaults.weight && face.style === defaults.style) || !Number.isFinite(defaults.letterSpacingEm) || !(defaults.lineHeight > 0)) fail("Incomplete original styling metadata");
    }
    if (font.editorial.status === "proposed" && (font.editorial.provenance !== "codex-proposal-not-user-approved" || font.editorial.originalMetadata !== null || !font.editorial.aiTags?.length || !font.editorial.useCases?.length || !font.editorial.defaultTextStyling)) fail("Invalid proposed metadata");
    const required = REQUIRED_FACES[font.id] ?? [];
    const actual = font.faces.map((face) => `${face.weight}-${face.style}`);
    if (required.length !== actual.length || required.some((key) => !actual.includes(key))) fail("Required weights/styles differ");
    for (const face of font.faces) {
      const faceFail = (message: string) => fail(`${face.id}: ${message}`);
      if (faceIds.has(face.id)) faceFail("Duplicate face ID");
      faceIds.add(face.id);
      if (face.id !== `${font.id}-${face.weight}-${face.style}`) faceFail("Invalid face ID");
      if (!Number.isInteger(face.weight) || face.weight < 100 || face.weight > 900 || face.weight % 100 !== 0) faceFail("Invalid weight");
      if (face.style !== "normal" && face.style !== "italic") faceFail("Invalid style");
      if (face.assetVersion !== null && !version.test(face.assetVersion)) faceFail("Invalid asset version");
      const needsAssets = options.requireAssets || face.exportSupport === "ready";
      if ((needsAssets || face.browserAssetPath || face.rendererAssetPath) && !font.source.revision) faceFail("Pinned source revision missing");
      for (const [target, path, hash] of [
        ["browser", face.browserAssetPath, face.browserSha256],
        ["renderer", face.rendererAssetPath, face.rendererSha256],
      ] as const) {
        if ((path === null) !== (hash === null)) faceFail(`${target} path/checksum pair incomplete`);
        if (path !== null && (!localPath(path) || !face.assetVersion)) faceFail(`${target} invalid path/version`);
        if (hash !== null && !checksum.test(hash)) faceFail(`${target} invalid SHA-256`);
        if (needsAssets && !path) faceFail(`${target} asset missing`);
        if (path && options.probe) {
          if (!options.probe.exists(target, path)) faceFail(`${target} asset missing`);
          else if (options.probe.sha256(target, path) !== hash) faceFail(`${target} checksum mismatch`);
        }
      }
      if (face.licenseNoticePath !== null && !localPath(face.licenseNoticePath)) faceFail("Invalid notice path");
      if (needsAssets && (!face.licenseNoticePath || !options.probe?.exists("notice", face.licenseNoticePath))) faceFail("License notice missing/unverified");
      if (face.licenseNoticePath && options.probe?.exists("notice", face.licenseNoticePath)) {
        const notice = options.probe.noticeText(face.licenseNoticePath);
        if (!notice.includes("SIL OPEN FONT LICENSE Version 1.1") || !notice.includes(font.license.copyrightNotice) || font.license.reservedFontNames.some((name) => !notice.includes(name))) faceFail("License notice content mismatch");
      }
      if (face.coverage.status === "verified" && (!face.coverage.unicodeRanges.length || face.coverage.unicodeRanges.some((range) => !/^U\+[0-9A-F]{4,6}(?:-[0-9A-F]{4,6})?$/.test(range)))) faceFail("Invalid verified coverage");
      if (face.browser) {
        if (face.browser.availability !== "packaged" || face.browser.format !== "woff2" || !face.browser.assets.length) faceFail("Invalid browser availability");
        for (const asset of face.browser.assets) {
          if (!localPath(asset.path) || !checksum.test(asset.sha256) || !asset.url.startsWith("https://fonts.gstatic.com/") || !/^v\d+$/.test(asset.deliveryRelease)) faceFail("Invalid browser subset asset");
          if (options.probe && (!options.probe.exists("browser", asset.path) || options.probe.sha256("browser", asset.path) !== asset.sha256)) faceFail("Browser subset asset missing/checksum mismatch");
        }
      }
      if (face.renderer && (face.renderer.availability !== "retained-candidate" || face.renderer.repository !== "frontend" || face.renderer.selectionVerified && face.exportSupport !== "ready")) faceFail("Invalid renderer compatibility declaration");
      if (face.exportSupport !== "blocked" && face.exportSupport !== "ready") faceFail("Invalid export status");
      if (face.exportSupport === "blocked" && !face.blockers.length) faceFail("Blocked export requires reasons");
      if (face.exportSupport === "ready" && (!font.license.packagingApproved || face.coverage.status !== "verified" || !face.exportEvidence?.trim() || face.blockers.length || !options.probe)) faceFail("Unsupported export-ready declaration");
      if (manifest.schemaVersion === "1.1.0" && face.exportSupport === "ready" && (!face.renderer?.selectionVerified || !face.browser?.runtimeVerified)) faceFail("Browser/FFmpeg selection evidence missing");
    }
  }
  for (const id of Object.keys(REQUIRED_FACES)) if (!ids.has(id)) errors.push(`${id}: Required family missing`);
  return errors;
}
