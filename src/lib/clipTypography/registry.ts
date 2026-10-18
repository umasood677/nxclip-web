/** Isolated catalog/package. No UI, API, worker, or existing ID is changed here. */
import sourceLock from "./font-source-lock.json";
import type { BrowserFontAsset, FontInspection, FontPackageLock } from "./packageTypes";
import { PROPOSED_TYPOGRAPHY } from "./proposedMetadata";
export type FontStyle = "normal" | "italic";
export type FontId =
  | "bebas-neue" | "anton" | "archivo-black" | "montserrat" | "poppins"
  | "inter" | "playfair-display" | "plus-jakarta-sans" | "caveat" | "jetbrains-mono";

export interface FontFace {
  id: string;
  weight: number;
  style: FontStyle;
  /** Null means not packaged, never an implied system-font fallback. */
  assetVersion: string | null;
  browserAssetPath: string | null;
  rendererAssetPath: string | null;
  browserSha256: string | null;
  rendererSha256: string | null;
  licenseNoticePath: string | null;
  coverage: { status: "pending" | "verified"; unicodeRanges: string[]; testedLanguages: string[] };
  exportSupport: "blocked" | "ready";
  exportEvidence: string | null;
  blockers: string[];
  browser?: { availability: "packaged"; format: "woff2" | "truetype"; assets: BrowserFontAsset[]; runtimeVerified: boolean; requirements: string[] };
  renderer?: { availability: "retained-candidate"; repository: "frontend"; selectionVerified: boolean; inspection: FontInspection; coordinates: Record<string, number> };
}

export interface FontEntry {
  id: FontId;
  family: string;
  faces: FontFace[];
  source: { metadataUrl: string; licenseUrl: string; revision: string | null; checkedOn: string; upstreamSubsets: string[]; officialRepository?: string; officialRevision?: string | null };
  category?: { values: string[]; provenance: "upstream-metadata" };
  license: {
    spdx: "OFL-1.1";
    status: "upstream-reviewed";
    copyrightNotice: string;
    reservedFontNames: string[];
    requiredNotices: string[];
    packagingApproved: boolean;
  };
  /** Preserve the original specification verbatim here when supplied. Do not infer values. */
  editorial: {
    status: "awaiting-original-spec" | "specified" | "proposed";
    recommendedCapitalization?: "none" | "uppercase";
    provenance?: "codex-proposal-not-user-approved";
    originalMetadata: Record<string, unknown> | null;
    aiTags: string[] | null;
    useCases: string[] | null;
    defaultTextStyling: {
      weight: number; style: FontStyle; textTransform: "none" | "uppercase";
      letterSpacingEm: number; lineHeight: number;
    } | null;
  };
}

/** Independent acceptance matrix, also used to detect accidentally dropped faces. */
export const REQUIRED_FACES: Readonly<Record<FontId, readonly string[]>> = {
  "bebas-neue": ["400-normal"], anton: ["400-normal"], "archivo-black": ["400-normal"],
  montserrat: ["800-normal", "900-normal"], poppins: ["700-normal", "900-normal"],
  inter: ["700-normal", "900-normal"], "playfair-display": ["700-normal", "400-italic"],
  "plus-jakarta-sans": ["700-normal", "800-normal"], caveat: ["700-normal"],
  "jetbrains-mono": ["700-normal"],
};

function entry(
  id: FontId, family: string, slug: string, upstreamSubsets: string[],
  copyrightNotice: string, reservedFontNames: string[] = [],
): FontEntry {
  const base = `https://raw.githubusercontent.com/google/fonts/main/ofl/${slug}`;
  return {
    id, family,
    faces: REQUIRED_FACES[id].map((key) => {
      const [weight, style] = key.split("-");
      return {
        id: `${id}-${key}`, weight: Number(weight), style: style as FontStyle,
        assetVersion: null, browserAssetPath: null, rendererAssetPath: null,
        browserSha256: null, rendererSha256: null, licenseNoticePath: null,
        coverage: { status: "pending", unicodeRanges: [], testedLanguages: [] },
        exportSupport: "blocked", exportEvidence: null,
        blockers: ["Source packaging approval pending", "No canonical asset pair packaged", "Renderer selection and parity unverified"],
      };
    }),
    source: { metadataUrl: `${base}/METADATA.pb`, licenseUrl: `${base}/OFL.txt`, revision: null, checkedOn: "2026-10-17", upstreamSubsets },
    license: {
      spdx: "OFL-1.1", status: "upstream-reviewed", copyrightNotice, reservedFontNames,
      requiredNotices: ["Exact source copyright notice", "Complete SIL OFL 1.1 text", "Preserve applicable Reserved Font Names"],
      packagingApproved: false,
    },
    editorial: { status: "awaiting-original-spec", originalMetadata: null, aiTags: null, useCases: null, defaultTextStyling: null },
  };
}

export const STAGED_FONT_MANIFEST: { schemaVersion: "1.0.0"; registryVersion: string; fonts: FontEntry[] } = {
  schemaVersion: "1.0.0", registryVersion: "0.1.0",
  fonts: [
    entry("bebas-neue", "Bebas Neue", "bebasneue", ["latin", "latin-ext"], "Copyright © 2010 by Dharma Type."),
    entry("anton", "Anton", "anton", ["latin", "latin-ext", "vietnamese"], "Copyright 2020 The Anton Project Authors (https://github.com/googlefonts/AntonFont.git)"),
    entry("archivo-black", "Archivo Black", "archivoblack", ["latin", "latin-ext"], "Copyright 2017 The Archivo Black Project Authors (https://github.com/Omnibus-Type/ArchivoBlack)"),
    entry("montserrat", "Montserrat", "montserrat", ["latin", "latin-ext", "cyrillic", "cyrillic-ext", "vietnamese"], "Copyright 2024 The Montserrat.Git Project Authors (https://github.com/JulietaUla/Montserrat.git)"),
    entry("poppins", "Poppins", "poppins", ["latin", "latin-ext", "devanagari"], "Copyright 2020 The Poppins Project Authors (https://github.com/itfoundry/Poppins)"),
    entry("inter", "Inter", "inter", ["latin", "latin-ext", "cyrillic", "cyrillic-ext", "greek", "greek-ext", "vietnamese"], "Copyright 2020 The Inter Project Authors (https://github.com/rsms/inter)"),
    entry("playfair-display", "Playfair Display", "playfairdisplay", ["latin", "latin-ext", "cyrillic", "vietnamese"], "Copyright 2017 The Playfair Display Project Authors (https://github.com/clauseggers/Playfair-Display), with Reserved Font Name \"Playfair Display\"", ["Playfair Display"]),
    entry("plus-jakarta-sans", "Plus Jakarta Sans", "plusjakartasans", ["latin", "latin-ext", "cyrillic-ext", "vietnamese"], "Copyright 2020 The Plus Jakarta Sans Project Authors (https://github.com/tokotype/PlusJakartaSans)"),
    entry("caveat", "Caveat", "caveat", ["latin", "latin-ext", "cyrillic", "cyrillic-ext"], "Copyright 2014 The Caveat Project Authors (https://github.com/googlefonts/caveat)"),
    entry("jetbrains-mono", "JetBrains Mono", "jetbrainsmono", ["latin", "latin-ext", "cyrillic", "cyrillic-ext", "greek", "vietnamese"], "Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono)"),
  ],
};

export const FONT_PACKAGE = sourceLock as FontPackageLock;

/** Package paths are frontend repo-relative, including retained renderer candidates. */
export const FONT_MANIFEST: { schemaVersion: "1.1.0"; registryVersion: string; fonts: FontEntry[] } = {
  schemaVersion: "1.1.0", registryVersion: "0.2.0",
  fonts: STAGED_FONT_MANIFEST.fonts.map((staged) => {
    const packaged = FONT_PACKAGE.families.find((family) => family.id === staged.id);
    if (!packaged) throw new Error(`Missing font package: ${staged.id}`);
    const proposal = PROPOSED_TYPOGRAPHY[staged.id];
    return {
      ...staged,
      category: { values: packaged.upstreamCategories, provenance: "upstream-metadata" },
      source: {
        ...staged.source, metadataUrl: packaged.metadataUrl, licenseUrl: packaged.licenseUrl,
        revision: packaged.sourceRevision, upstreamSubsets: packaged.upstreamSubsets,
        officialRepository: packaged.officialRepository, officialRevision: packaged.officialRevision,
      },
      license: { ...staged.license, copyrightNotice: packaged.copyrightNotice, reservedFontNames: packaged.reservedFontNames, packagingApproved: true },
      editorial: {
        status: "proposed", originalMetadata: null, provenance: "codex-proposal-not-user-approved",
        aiTags: proposal.aiTags, useCases: proposal.useCases, recommendedCapitalization: proposal.capitalization,
        defaultTextStyling: { weight: proposal.weight, style: proposal.style, textTransform: proposal.capitalization, letterSpacingEm: proposal.letterSpacingEm, lineHeight: proposal.lineHeight },
      },
      faces: staged.faces.map((face) => {
        const asset = packaged.faces.find((item) => item.id === face.id);
        if (!asset) throw new Error(`Missing face package: ${face.id}`);
        const primary = asset.browserAssets.find((item) => item.subset === "latin") ?? asset.browserAssets[0];
        return {
          ...face, assetVersion: packaged.assetVersion,
          browserAssetPath: primary.path, browserSha256: primary.sha256,
          rendererAssetPath: asset.original.path, rendererSha256: asset.original.sha256,
          licenseNoticePath: packaged.licensePath,
          coverage: { status: "verified", unicodeRanges: asset.original.inspection.unicodeRanges, testedLanguages: [] },
          browser: { availability: "packaged", format: "woff2", assets: asset.browserAssets, runtimeVerified: false, requirements: ["WOFF2 support", ...(asset.browserAssets.some((item) => item.inspection.kind === "variable") ? ["CSS variable-font support"] : [])] },
          renderer: {
            availability: "retained-candidate", repository: "frontend", selectionVerified: false,
            inspection: asset.original.inspection,
            coordinates: Object.fromEntries(Object.entries(asset.original.inspection.axes).map(([tag, axis]) => [tag, tag === "wght" ? face.weight : axis.default])),
          },
          blockers: ["Media-worker not integrated", "FFmpeg/libass selection unverified", "Browser/export shaping and parity unverified"],
        };
      }),
    } as FontEntry;
  }),
};

/** Context is mandatory: `inter` means 700 in Clip's Arial alias but is family-only elsewhere. */
export const LEGACY_FONT_ALIASES = {
  clip: {
    montserrat_black: { canonicalId: "montserrat", weight: 900, style: "normal" },
    anton: { canonicalId: "anton", weight: 400, style: "normal" },
    bebas_neue: { canonicalId: "bebas-neue", weight: 400, style: "normal" },
    inter_bold: { canonicalId: "inter", weight: 700, style: "normal" },
    impact: { canonicalId: "anton", weight: 400, style: "normal" },
    arial_black: { canonicalId: "montserrat", weight: 900, style: "normal" },
    arial: { canonicalId: "inter", weight: 700, style: "normal" },
  },
  ad: {
    montserrat: { canonicalId: "montserrat" }, inter: { canonicalId: "inter" },
    anton: { canonicalId: "anton" }, bebas_neue: { canonicalId: "bebas-neue" },
    impact: { unsupported: "System Impact is not canonical Anton; current Ad export substitutes Anton" },
  },
  brand: {
    montserrat: { canonicalId: "montserrat" }, inter: { canonicalId: "inter" },
    anton: { canonicalId: "anton" }, bebas_neue: { canonicalId: "bebas-neue" },
    playfair: { canonicalId: "playfair-display" },
    impact: { unsupported: "System Impact is outside the required catalog" },
    raleway: { unsupported: "Outside the required catalog" }, roboto: { unsupported: "Outside the required catalog" },
    oswald: { unsupported: "Outside the required catalog" }, lato: { unsupported: "Outside the required catalog" },
  },
} as const;

export function resolveLegacyFont(context: keyof typeof LEGACY_FONT_ALIASES, id: string) {
  const aliases = LEGACY_FONT_ALIASES[context];
  return Object.hasOwn(aliases, id) ? aliases[id as keyof typeof aliases] : undefined;
}

/** Exact canonical face lookup. Unknown IDs/weights/styles never substitute. */
export function findFontFace(id: string, weight: number, style: FontStyle = "normal"): FontFace | undefined {
  return FONT_MANIFEST.fonts.find((font) => font.id === id)?.faces.find((face) => face.weight === weight && face.style === style);
}
