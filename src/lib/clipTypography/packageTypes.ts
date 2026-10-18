export interface FontInspection {
  family: string;
  preferredFamily: string | null;
  subfamily: string;
  reportedWeight: number;
  style: string;
  kind: "static" | "variable";
  axes: Record<string, { name: string; min: number; default: number; max: number }>;
  version: string | null;
  copyright: string;
  embeddedLicense: string;
  unicodeRanges: string[];
  codepointCount: number;
}
export interface BrowserFontAsset {
  path: string; sha256: string; url: string; deliveryRelease: string; subset: string;
  cssUnicodeRange: string; inspection: FontInspection;
}
export interface PackagedFace {
  id: string; weight: number; style: string; sourceRevision: string;
  original: { path: string; sha256: string; url: string; inspection: FontInspection };
  browserAssets: BrowserFontAsset[];
  cssSourcePath: string;
}
export interface PackagedFamily {
  id: string; family: string; assetVersion: string; sourceRevision: string;
  officialRepository: string; officialRevision: string | null;
  metadataUrl: string; licenseUrl: string; licensePath: string; noticePath: string;
  copyrightNotice: string; reservedFontNames: string[]; upstreamCategories: string[];
  upstreamSubsets: string[]; faces: PackagedFace[];
}
export interface FontPackageLock {
  schemaVersion: string; assetVersion: string; googleFontsRevision: string; cssPath: string; userAgent: string;
  files: Array<{ path: string; url: string | null; sha256: string; bytes: number; contentBase64?: string }>;
  families: PackagedFamily[];
}
