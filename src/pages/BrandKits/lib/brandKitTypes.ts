export type BrandCharacterScope = "ad-studio" | "image-studio" | "ad-animation";
export type BrandCharacterProfile = {
 id:string; name:string; kind:"human-model"|"mascot"|"fictional-character"; status:"draft"|"approved"|"archived";
 referenceAssetIds:string[]; appearance:string; style:string; wardrobe:string; expressions:string; consistencyRules:string;
 permissions:{commercialUse:boolean;likenessConsent:boolean;origin:"unverified"|"owner-created"|"licensed"|"consented";scopes:BrandCharacterScope[];evidence:string;expiresAt?:string};
};
export type BrandStudioProfile = { approvedAssetIds?: string[]; characters?: BrandCharacterProfile[]; schemaVersion: 1; categoryId: string; nicheId: string; businessType?: string; businessGoals: string[]; identityApproved: boolean; guidelinesApproved: boolean };

export type BrandCreativeGuidelines = {
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

export type BrandVoiceFields = {
  studio?: BrandStudioProfile;
  tone?: string;
  personality?: string;
  doSay?: string[];
  dontSay?: string[];
  tagline?: string;
  industry?: string;
  website?: string;
  targetAudience?: string;
  signatureProduct?: string;
  writingStyle?: string;
  preferredCta?: string;
  exampleHeadlines?: string[];
  copyGuidance?: string;
  creative?: BrandCreativeGuidelines;
  [key: string]: unknown;
};

export type BrandColorEntry = {
  role?: string;
  hex: string;
  name?: string;
  sortOrder?: number;
};

export type BrandTypographyEntry = {
  fallbackStack?: string | null;
  assetId?: string | null;
  role?: string;
  family: string;
  weight?: string;
  style?: string;
  sortOrder?: number;
};

export type BrandAssetEntry = {
  mimeType?: string;
  id: string;
  role?: string;
  status?: string;
  label?: string | null;
  description?: string | null;
  usageGuidance?: string | null;
  fileName?: string;
  readUrl?: string | null;
};

/** Shared kit shape used by Brand Kit Studio and Ad Studio picker. */
export type BrandKitSummary = {
  id: string;
  name: string;
  description?: string | null;
  status?: string;
  version?: number;
  guidelines?: string | null;
  voice?: BrandVoiceFields | null;
  colors?: BrandColorEntry[];
  typography?: BrandTypographyEntry[];
  assets?: BrandAssetEntry[];
};

export type EditorSection =
  | "identity"
  | "colors"
  | "typography"
  | "characters"
  | "assets"
  | "voice"
  | "guidelines"
  | "review";

export const EDITOR_SECTIONS: Array<{ id: EditorSection; label: string }> = [
  { id: "identity", label: "Identity" },
  { id: "colors", label: "Colors" },
  { id: "typography", label: "Typography" },
  { id: "assets", label: "Logos & Assets" },
  { id: "characters", label: "Models & Mascots" },
  { id: "voice", label: "Brand Voice" },
  { id: "guidelines", label: "Creative Guidelines" },
  { id: "review", label: "Review" },
];

export const COLOR_ROLES = [
  { role: "primary", label: "Primary", required: true },
  { role: "secondary", label: "Secondary", required: false },
  { role: "accent", label: "Accent", required: false },
  { role: "background", label: "Background", required: false },
  { role: "text", label: "Text", required: false },
] as const;

export const TYPOGRAPHY_ROLES = [
  { role: "heading", label: "Headline", weight: "700" },
  { role: "body", label: "Body", weight: "400" },
  { role: "accent", label: "Accent", weight: "500" },
  { role: "cta", label: "CTA", weight: "700" },
] as const;

export const DEFAULT_COLORS: Record<string, string> = {
  primary: "#0F172A",
  secondary: "#38BDF8",
  accent: "#F59E0B",
  background: "#FFFFFF",
  text: "#0F172A",
};

export type PreviewMode =
  | "identity"
  | "typography"
  | "palette"
  | "ig_portrait"
  | "ig_story"
  | "product"
  | "logo_light"
  | "logo_dark";

export const PREVIEW_MODES: Array<{ id: PreviewMode; label: string }> = [
  { id: "identity", label: "Identity" },
  { id: "typography", label: "Type" },
  { id: "palette", label: "Palette" },
  { id: "ig_portrait", label: "IG Feed" },
  { id: "ig_story", label: "IG Story" },
  { id: "product", label: "Product" },
  { id: "logo_light", label: "Logo · light" },
  { id: "logo_dark", label: "Logo · dark" },
];
