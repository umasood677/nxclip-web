/** Canonical portable Brand Kit schema (BK-C). Not an HTTP API contract. */

export const BRAND_KIT_SCHEMA_VERSION = "1.0" as const;
export const BRAND_KIT_TYPE = "nxclip.brand-kit" as const;
export const BRAND_KIT_BUNDLE_TYPE = "nxclip.brand-kit-bundle" as const;

export const PORTABLE_LIMITS = {
  maxBytes: 512 * 1024,
  maxDepth: 12,
  maxKits: 25,
  maxString: 4000,
  maxArrayItems: 32,
  maxName: 120,
} as const;

export type PortableBrandIdentity = {
  name: string;
  industry?: string;
  description?: string;
  website?: string;
  tagline?: string;
  targetAudience?: string;
  signatureProduct?: string;
  personality?: string;
};

export type PortableColors = {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  text?: string;
  /** Extra named colors */
  custom?: Array<{ name?: string; hex: string }>;
};

export type PortableTypography = {
  headline?: string;
  body?: string;
  accent?: string;
  cta?: string;
};

export type PortableVoice = {
  tone?: string;
  personality?: string;
  writingStyle?: string;
  preferredCta?: string;
  preferredVocabulary?: string[];
  prohibitedVocabulary?: string[];
  exampleHeadlines?: string[];
  copyGuidance?: string;
};

export type PortableCreativeGuidelines = {
  visualStyle?: string;
  photographyDirection?: string;
  lighting?: string;
  composition?: string;
  backgroundPreferences?: string;
  colorUsage?: string;
  typographyUsage?: string;
  logoPlacement?: string;
  productRepresentation?: string;
  restrictedTreatments?: string;
  prohibitedClaims?: string;
  notes?: string;
};

export type PortableAssetRef = {
  role: string;
  label?: string;
  description?: string;
  usageGuidance?: string;
  /** Never treated as an uploaded asset — UI marks re-upload required. */
  requiresReupload?: boolean;
  /** Ignored on import for security (no remote fetch). */
  externalHint?: string;
};

export type PortableBrandStudio = {
 schemaVersion:1;categoryId:string;nicheId:string;businessType?:string;businessGoals:string[];
 characters?:Array<{name:string;kind:"human-model"|"mascot"|"fictional-character";appearance:string;style:string;wardrobe:string;expressions:string;consistencyRules:string}>;
};
export type PortableBrandKit = {
  /** Character design only; asset bindings and usage permissions never transfer. */
  studio?: PortableBrandStudio;
  schemaVersion: typeof BRAND_KIT_SCHEMA_VERSION;
  type: typeof BRAND_KIT_TYPE;
  brand: PortableBrandIdentity;
  colors?: PortableColors;
  typography?: PortableTypography;
  voice?: PortableVoice;
  creativeGuidelines?: PortableCreativeGuidelines;
  advertisingPreferences?: Record<string, unknown>;
  assets?: PortableAssetRef[];
  /** Freeform guidelines text column */
  guidelines?: string;
};

export type PortableBrandKitBundle = {
  schemaVersion: typeof BRAND_KIT_SCHEMA_VERSION;
  type: typeof BRAND_KIT_BUNDLE_TYPE;
  kits: PortableBrandKit[];
};

export type ImportIssue = {
  level: "error" | "warning";
  path: string;
  message: string;
};

export type MappedImportKit = {
  /** Stable fingerprint for idempotent retries within a session */
  fingerprint: string;
  portable: PortableBrandKit;
  createPayload: {
    name: string;
    description?: string;
    guidelines?: string;
    voice: Record<string, unknown>;
  };
  colors: Array<{ role: string; hex: string; name?: string; sortOrder: number }>;
  typography: Array<{
    role: string;
    family: string;
    weight?: string;
    sortOrder: number;
  }>;
  assetsRequiringReupload: PortableAssetRef[];
  issues: ImportIssue[];
  unsupportedFields: string[];
};
