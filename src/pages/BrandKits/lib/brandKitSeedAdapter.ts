import {
  BRAND_KIT_SCHEMA_VERSION,
  BRAND_KIT_TYPE,
  type PortableBrandKit,
} from "./brandKitPortable";

/**
 * Legacy / acceptance seed shape (four-kit fixtures).
 * Explicit adapter — not the canonical export format.
 */
export type LegacySeedKit = {
  brandName?: string;
  name?: string;
  industry?: string;
  description?: string;
  tagline?: string;
  signatureProduct?: string;
  website?: string;
  targetAudience?: string;
  personality?: string;
  tone?: string;
  palette?: Record<string, string>;
  colors?: Record<string, string>;
  fonts?: {
    headline?: string;
    heading?: string;
    body?: string;
    accent?: string;
    cta?: string;
  };
  typography?: {
    headline?: string;
    heading?: string;
    body?: string;
    accent?: string;
    cta?: string;
  };
  voice?: Record<string, unknown>;
  creativeGuidelines?: Record<string, unknown>;
  guidelines?: string;
  advertisingPreferences?: Record<string, unknown>;
  assets?: Array<{
    role?: string;
    name?: string;
    label?: string;
    description?: string;
    usage?: string;
    usageGuidance?: string;
  }>;
};

export type LegacySeedEnvelope = {
  version?: string;
  format?: string;
  kits?: LegacySeedKit[];
  brands?: LegacySeedKit[];
};

export function isLegacySeedEnvelope(value: unknown): value is LegacySeedEnvelope {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  if (obj.type === "nxclip.brand-kit" || obj.type === "nxclip.brand-kit-bundle") {
    return false;
  }
  if (obj.format === "nxclip-brand-seed" || obj.version === "seed-1") return true;
  if (Array.isArray(obj.kits) || Array.isArray(obj.brands)) {
    // Heuristic: seed kits use brandName / palette rather than schemaVersion
    const list = (obj.kits ?? obj.brands) as unknown[];
    const sample = list[0];
    if (sample && typeof sample === "object") {
      const s = sample as Record<string, unknown>;
      return (
        typeof s.brandName === "string" ||
        typeof s.palette === "object" ||
        (typeof s.name === "string" && !s.schemaVersion)
      );
    }
  }
  return false;
}

export function adaptLegacySeedKit(seed: LegacySeedKit): PortableBrandKit {
  const name = (seed.brandName || seed.name || "Untitled Brand").trim();
  const palette = seed.palette || seed.colors || {};
  const fonts = seed.fonts || seed.typography || {};
  const voiceSeed = seed.voice || {};

  return {
    schemaVersion: BRAND_KIT_SCHEMA_VERSION,
    type: BRAND_KIT_TYPE,
    brand: {
      name,
      industry: seed.industry,
      description: seed.description,
      website: seed.website,
      tagline: seed.tagline ?? (voiceSeed.tagline as string | undefined),
      targetAudience:
        seed.targetAudience ?? (voiceSeed.targetAudience as string | undefined),
      signatureProduct: seed.signatureProduct,
      personality:
        seed.personality ?? (voiceSeed.personality as string | undefined),
    },
    colors: {
      primary: palette.primary,
      secondary: palette.secondary,
      accent: palette.accent,
      background: palette.background,
      text: palette.text,
    },
    typography: {
      headline: fonts.headline || fonts.heading,
      body: fonts.body,
      accent: fonts.accent,
      cta: fonts.cta,
    },
    voice: {
      tone: seed.tone ?? (voiceSeed.tone as string | undefined),
      personality:
        seed.personality ?? (voiceSeed.personality as string | undefined),
      writingStyle: voiceSeed.writingStyle as string | undefined,
      preferredCta: voiceSeed.preferredCta as string | undefined,
      preferredVocabulary: (voiceSeed.doSay ||
        voiceSeed.preferredVocabulary) as string[] | undefined,
      prohibitedVocabulary: (voiceSeed.dontSay ||
        voiceSeed.prohibitedVocabulary) as string[] | undefined,
      exampleHeadlines: voiceSeed.exampleHeadlines as string[] | undefined,
      copyGuidance: voiceSeed.copyGuidance as string | undefined,
    },
    creativeGuidelines: (seed.creativeGuidelines || undefined) as
      | PortableBrandKit["creativeGuidelines"]
      | undefined,
    advertisingPreferences: seed.advertisingPreferences,
    guidelines: seed.guidelines,
    assets: normalizeLegacyAssets(seed.assets),
  };
}

/** Accept array or role-keyed object; never throw on preview. */
function normalizeLegacyAssets(
  value: LegacySeedKit["assets"] | Record<string, unknown> | unknown,
): PortableBrandKit["assets"] {
  if (value == null) return [];
  const rows: Array<Record<string, unknown>> = Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
    : typeof value === "object"
      ? Object.entries(value as Record<string, unknown>)
          .filter(([, v]) => v && typeof v === "object" && !Array.isArray(v))
          .map(([role, v]) => ({
            ...(v as Record<string, unknown>),
            role:
              typeof (v as { role?: unknown }).role === "string"
                ? (v as { role: string }).role
                : role,
          }))
      : [];
  return rows.map((a) => ({
    role: (typeof a.role === "string" && a.role) || "other",
    label:
      (typeof a.label === "string" && a.label) ||
      (typeof a.name === "string" && a.name) ||
      undefined,
    description: typeof a.description === "string" ? a.description : undefined,
    usageGuidance:
      (typeof a.usageGuidance === "string" && a.usageGuidance) ||
      (typeof a.usage === "string" && a.usage) ||
      undefined,
    requiresReupload: true,
  }));
}

export function adaptLegacySeedEnvelope(
  envelope: LegacySeedEnvelope,
): PortableBrandKit[] {
  const list = envelope.kits ?? envelope.brands ?? [];
  return list.map(adaptLegacySeedKit);
}
