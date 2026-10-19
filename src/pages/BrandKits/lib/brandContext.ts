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

/** Cached signed URLs / palette from the active Brand Kit (cleared on kit change). */
export type BriefBrandPreviewCache = {
  logoUrl: string | null;
  productImageUrls: string[];
  paletteHex: string[];
};

export function brandPreviewFromKit(
  kit: BrandKitSummary | null | undefined,
): BriefBrandPreviewCache | null {
  const ctx = normalizeBrandContext(kit);
  if (!ctx) return null;
  const productImageUrls = [ctx.assets.productUrl, ctx.assets.modelUrl]
    .filter((u): u is string => Boolean(u && /^https?:/i.test(u)));
  const paletteHex = ctx.colors.all.map((c) => c.hex).filter(Boolean);
  return {
    logoUrl:
      ctx.assets.logoUrl && /^https?:/i.test(ctx.assets.logoUrl)
        ? ctx.assets.logoUrl
        : null,
    productImageUrls,
    paletteHex,
  };
}

const DEFAULT_BRIEF_NAME = "New ad project";
const DEFAULT_CTA = "Learn more";
const DEFAULT_TONE = "confident";

function fieldMatchesBrandSeed(
  field: keyof BriefBrandSeed,
  value: string | undefined,
  kit: BrandKitSummary,
): boolean {
  const ctx = normalizeBrandContext(kit);
  if (!ctx) return false;
  const v = (value ?? "").trim();
  switch (field) {
    case "productOrService":
      return Boolean(ctx.signatureProduct) && v === ctx.signatureProduct;
    case "targetAudience":
      return Boolean(ctx.targetAudience) && v === ctx.targetAudience;
    case "desiredTone":
      return (
        Boolean(ctx.tone) &&
        (v === ctx.tone || (!v && DEFAULT_TONE === ctx.tone))
      );
    case "cta":
      return (
        Boolean(ctx.preferredCta) &&
        (v === ctx.preferredCta ||
          (v === DEFAULT_CTA && ctx.preferredCta === DEFAULT_CTA))
      );
    case "coreMessage":
      return Boolean(ctx.tagline) && v === ctx.tagline;
    case "name":
      return (
        Boolean(ctx.name) &&
        (v === `${ctx.name} campaign` ||
          (v === DEFAULT_BRIEF_NAME && `${ctx.name} campaign` === DEFAULT_BRIEF_NAME))
      );
    default:
      return false;
  }
}

/** Drop brief + preview fields that still reflect a previous Brand Kit seed. */
export function clearStaleBriefBrandSeed(
  previousKit: BrandKitSummary | null | undefined,
  current: BriefBrandSeed & { brandPreview?: BriefBrandPreviewCache | null },
): Partial<
  BriefBrandSeed & { brandPreview?: BriefBrandPreviewCache | null }
> {
  const cleared: Partial<
    BriefBrandSeed & { brandPreview?: BriefBrandPreviewCache | null }
  > = { brandPreview: null };
  if (!previousKit?.id) return cleared;
  const fields: (keyof BriefBrandSeed)[] = [
    "productOrService",
    "targetAudience",
    "desiredTone",
    "cta",
    "coreMessage",
    "name",
  ];
  for (const field of fields) {
    const cur = current[field];
    if (typeof cur === "string" && fieldMatchesBrandSeed(field, cur, previousKit)) {
      if (field === "name") cleared.name = DEFAULT_BRIEF_NAME;
      else if (field === "cta") cleared.cta = DEFAULT_CTA;
      else if (field === "desiredTone") cleared.desiredTone = DEFAULT_TONE;
      else cleared[field] = "";
    }
  }
  return cleared;
}

/** Switch Brand Kit: clear stale seeds, then prefill empties from the new kit. */
export function applyBrandKitToBriefForm(
  previousKitId: string,
  nextKitId: string,
  brands: BrandKitSummary[],
  current: BriefBrandSeed & { brandPreview?: BriefBrandPreviewCache | null },
): Partial<
  BriefBrandSeed & {
    brandKitId: string;
    brandPreview?: BriefBrandPreviewCache | null;
  }
> {
  const previousKit =
    previousKitId && previousKitId !== nextKitId
      ? (brands.find((b) => b.id === previousKitId) ?? null)
      : null;
  const nextKit = nextKitId ? (brands.find((b) => b.id === nextKitId) ?? null) : null;
  const afterClear = {
    ...current,
    ...clearStaleBriefBrandSeed(previousKit, current),
    brandKitId: nextKitId,
    brandPreview: null,
  };
  const seed = seedBriefFromBrand(nextKit, afterClear);
  const preview = brandPreviewFromKit(nextKit);
  return {
    brandKitId: nextKitId,
    brandPreview: preview,
    ...seed,
  };
}

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
