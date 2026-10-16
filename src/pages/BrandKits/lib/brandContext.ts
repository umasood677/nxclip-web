import type { BrandKitSummary, BrandVoiceFields } from "./brandKitTypes";
import { findReadyAsset } from "./assetSlots";

/** Normalized brand context for Ad Studio / shared pickers (single mapping layer). */
export type NormalizedBrandContext = {
  brandKitId: string;
  name: string;
  description?: string;
  industry?: string;
  tagline?: string;
  signatureProduct?: string;
  targetAudience?: string;
  tone?: string;
  personality?: string;
  preferredCta?: string;
  writingStyle?: string;
  preferredVocabulary?: string[];
  prohibitedVocabulary?: string[];
  exampleHeadlines?: string[];
  copyGuidance?: string;
  guidelines?: string;
  creative?: BrandVoiceFields["creative"];
  colors: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
    all: Array<{ role?: string; hex: string; name?: string }>;
  };
  typography: {
    headline?: string;
    body?: string;
    accent?: string;
    cta?: string;
  };
  assets: {
    logoUrl?: string | null;
    productUrl?: string | null;
    modelUrl?: string | null;
    logoLabel?: string | null;
    productLabel?: string | null;
    modelLabel?: string | null;
    productUsage?: string | null;
    modelUsage?: string | null;
    logoUsage?: string | null;
  };
};

function colorRole(kit: BrandKitSummary, role: string): string | undefined {
  return kit.colors?.find((c) => c.role === role)?.hex;
}

function typeRole(kit: BrandKitSummary, role: string): string | undefined {
  return kit.typography?.find((t) => t.role === role)?.family;
}

export function normalizeBrandContext(
  kit: BrandKitSummary | null | undefined,
): NormalizedBrandContext | null {
  if (!kit?.id) return null;
  const voice = (kit.voice ?? {}) as BrandVoiceFields;
  const logo =
    findReadyAsset(kit.assets, "logo_primary") ||
    findReadyAsset(kit.assets, "logo_dark") ||
    findReadyAsset(kit.assets, "logo_light");
  const product = findReadyAsset(kit.assets, "product_image");
  const model = findReadyAsset(kit.assets, "brand_model");

  return {
    brandKitId: kit.id,
    name: kit.name,
    description: kit.description ?? undefined,
    industry: voice.industry,
    tagline: voice.tagline,
    signatureProduct: voice.signatureProduct,
    targetAudience: voice.targetAudience,
    tone: voice.tone,
    personality: voice.personality,
    preferredCta: voice.preferredCta,
    writingStyle: voice.writingStyle,
    preferredVocabulary: voice.doSay,
    prohibitedVocabulary: voice.dontSay,
    exampleHeadlines: voice.exampleHeadlines,
    copyGuidance: voice.copyGuidance,
    guidelines: kit.guidelines ?? undefined,
    creative: voice.creative,
    colors: {
      primary: colorRole(kit, "primary"),
      secondary: colorRole(kit, "secondary"),
      accent: colorRole(kit, "accent"),
      background: colorRole(kit, "background"),
      text: colorRole(kit, "text"),
      all: (kit.colors ?? []).map((c) => ({
        role: c.role,
        hex: c.hex,
        name: c.name,
      })),
    },
    typography: {
      headline: typeRole(kit, "heading"),
      body: typeRole(kit, "body"),
      accent: typeRole(kit, "accent"),
      cta: typeRole(kit, "cta"),
    },
    assets: {
      logoUrl: logo?.readUrl ?? null,
      productUrl: product?.readUrl ?? null,
      modelUrl: model?.readUrl ?? null,
      logoLabel: logo?.label ?? null,
      productLabel: product?.label ?? null,
      modelLabel: model?.label ?? null,
      logoUsage: logo?.usageGuidance ?? null,
      productUsage: product?.usageGuidance ?? null,
      modelUsage: model?.usageGuidance ?? null,
    },
  };
}

export type BriefBrandSeed = {
  productOrService?: string;
  targetAudience?: string;
  desiredTone?: string;
  cta?: string;
  coreMessage?: string;
  name?: string;
};

/**
 * Prefill empty brief fields from Brand Kit. Never overwrites non-empty user values.
 * Does not trigger AI.
 */
export function seedBriefFromBrand(
  kit: BrandKitSummary | null | undefined,
  current: BriefBrandSeed,
): BriefBrandSeed {
  const ctx = normalizeBrandContext(kit);
  if (!ctx) return {};
  const patch: BriefBrandSeed = {};
  if (!current.productOrService?.trim() && ctx.signatureProduct) {
    patch.productOrService = ctx.signatureProduct;
  }
  if (!current.targetAudience?.trim() && ctx.targetAudience) {
    patch.targetAudience = ctx.targetAudience;
  }
  if (
    (!current.desiredTone?.trim() || current.desiredTone === "confident") &&
    ctx.tone
  ) {
    patch.desiredTone = ctx.tone;
  }
  if (
    (!current.cta?.trim() || current.cta === "Learn more") &&
    ctx.preferredCta
  ) {
    patch.cta = ctx.preferredCta;
  }
  if (!current.coreMessage?.trim() && ctx.tagline) {
    patch.coreMessage = ctx.tagline;
  }
  if (
    (!current.name?.trim() || current.name === "New ad project") &&
    ctx.name
  ) {
    patch.name = `${ctx.name} campaign`;
  }
  return patch;
}
