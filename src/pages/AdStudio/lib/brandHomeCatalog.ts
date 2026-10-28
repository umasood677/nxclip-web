import type { BrandKitSummary } from "../../BrandKits/lib/brandKitTypes";
import { normalizeBrandContext } from "../../BrandKits/lib/brandContext";
import type { AdStudioTemplateId } from "../canvas/templateCatalog";
import { FEATURED_EXAMPLES, type FeaturedExample } from "./exampleCreatives";

/** Per-template presentation when a Brand Kit home catalog is active. */
export type BrandTemplatePresentation = {
  templateId: AdStudioTemplateId;
  displayName: string;
  tagline: string;
  headline: string;
  supporting: string;
  cta: string;
};

export type BrandHomeCatalog = {
  /** Stable key — matched by brand name / kit id slug. */
  catalogKey: string;
  label: string;
  source: "neutral" | "brand-ai" | "brand-seed";
  examples: FeaturedExample[];
  templates: BrandTemplatePresentation[];
};

const NEUTRAL_EXAMPLE_IDS = new Set([
  "ex-athletic",
  "ex-saas",
  "ex-event",
  "ex-luxury",
]);

/** Neutral Home — default templates (catalog names) + non–brand-kit example briefs. */
export const NEUTRAL_HOME_CATALOG: BrandHomeCatalog = {
  catalogKey: "neutral",
  label: "Neutral",
  source: "neutral",
  examples: FEATURED_EXAMPLES.filter((e) => NEUTRAL_EXAMPLE_IDS.has(e.id)),
  templates: [],
};

/**
 * ZoeArtisan Brand Kit home catalog — AI Creative Director copy for all 10
 * template layouts + example briefs (paid-AI / brand-context authored for UAT).
 */
export const ZOE_ARTISAN_HOME_CATALOG: BrandHomeCatalog = {
  catalogKey: "zoe-artisan",
  label: "ZoeArtisan",
  source: "brand-ai",
  examples: [
    {
      id: "multiple-shades", title: "Multiple Shades", category: "Collection",
      exampleObjective: "Showcase the available lipstick shade collection",
      productCategory: "Lipstick", productFocus: "shade-collection",
      creativeDirection: "Cinematic, luxury collection composition. Use only available verified product variants.",
      headline: "Find your signature shade", supporting: "A collection direction using your available products.", cta: "Explore the collection",
      theme: { bgFrom: "#0D0B0C", bgTo: "#580D1C", accent: "#D6B48A", text: "#F7F0E8" },
      previewImage: "/ad-studio/sample-assets/w0a-multi-shade.jpg",
      briefDefaults: { productOrService: "Lipstick collection", coreMessage: "Find your signature shade", advertisingObjective: "product_promotion", targetAudience: "Luxury beauty consumers", desiredTone: "cinematic, luxury", platform: "instagram_story", outputFormat: "vertical_1080x1920", cta: "Explore the collection" },
    },
    {
      id: "zoe-ex-signature-red",
      title: "Signature Red launch",
      category: "Product",
      headline: "Signature Red, Perfectly Matte",
      supporting:
        "Couture color with all-day comfort — ZoeArtisan Signature Red Matte Lipstick.",
      cta: "Shop the shade",
      theme: {
        bgFrom: "#0D0B0C",
        bgTo: "#580D1C",
        accent: "#D6B48A",
        text: "#F7F0E8",
      },
      previewImage: "/ad-studio/sample-assets/w0a-product-hero.jpg",
      briefDefaults: {
        name: "ZoeArtisan · Signature Red",
        productOrService: "ZoeArtisan Signature Red Matte Lipstick",
        coreMessage: "Signature red, perfectly matte",
        advertisingObjective: "product_promotion",
        targetAudience: "Luxury beauty consumers 25–45",
        desiredTone: "elegant, refined, sensual",
        platform: "instagram_feed",
        outputFormat: "portrait_1080x1350",
        cta: "Shop the shade",
      },
    },
    {
      id: "zoe-ex-editorial-model",
      title: "Editorial beauty still",
      category: "Editorial",
      headline: "Wear Your Power",
      supporting:
        "Soft beauty light. Shallow depth. A look that belongs on the couture page.",
      cta: "Discover ZoeArtisan",
      theme: {
        bgFrom: "#1C1917",
        bgTo: "#A6192E",
        accent: "#D6B48A",
        text: "#FAFAF9",
      },
      previewImage: "/ad-studio/sample-assets/w0a-model-editorial.jpg",
      briefDefaults: {
        name: "ZoeArtisan · Editorial",
        productOrService: "ZoeArtisan Signature Red Matte Lipstick",
        coreMessage: "Wear your power",
        advertisingObjective: "brand_awareness",
        targetAudience: "Luxury beauty consumers seeking elegant, long-wear color",
        desiredTone: "editorial, intimate, precise",
        platform: "instagram_feed",
        outputFormat: "portrait_1080x1350",
        cta: "Discover ZoeArtisan",
      },
    },
    {
      id: "zoe-ex-shade-story",
      title: "Shade story (9:16)",
      category: "Social",
      headline: "One swipe. All evening.",
      supporting: "Matte that holds — couture red for nights that linger.",
      cta: "Shop the shade",
      theme: {
        bgFrom: "#0D0B0C",
        bgTo: "#7F1D1D",
        accent: "#F7F0E8",
        text: "#FAFAF9",
      },
      previewImage: "/ad-studio/sample-assets/w0a-social-story.jpg",
      briefDefaults: {
        name: "ZoeArtisan · Story",
        productOrService: "ZoeArtisan Signature Red Matte Lipstick",
        coreMessage: "One swipe. All evening.",
        advertisingObjective: "product_promotion",
        targetAudience: "Luxury beauty consumers 25–45",
        desiredTone: "confident, sensual",
        platform: "instagram_story",
        outputFormat: "vertical_1080x1920",
        cta: "Shop the shade",
      },
    },
    {
      id: "zoe-ex-texture",
      title: "Texture close-up",
      category: "Craft",
      headline: "Matte. Never flat.",
      supporting:
        "See the finish — soft, precise, couture. No cheap shine. No medical claims.",
      cta: "Explore the finish",
      theme: {
        bgFrom: "#0D0B0C",
        bgTo: "#2A1218",
        accent: "#D6B48A",
        text: "#F7F0E8",
      },
      previewImage: "/ad-studio/sample-assets/w0a-texture.jpg",
      briefDefaults: {
        name: "ZoeArtisan · Texture",
        productOrService: "ZoeArtisan Signature Red Matte Lipstick",
        coreMessage: "Matte. Never flat.",
        advertisingObjective: "product_promotion",
        targetAudience: "Beauty enthusiasts who care about finish and feel",
        desiredTone: "precise, intimate",
        platform: "instagram_feed",
        outputFormat: "square_1080",
        cta: "Explore the finish",
      },
    },
    {
      id: "zoe-ex-seasonal",
      title: "Seasonal couture drop",
      category: "Campaign",
      headline: "Winter’s signature.",
      supporting:
        "A burgundy atmosphere for the season — Signature Red as the only accent you need.",
      cta: "Shop the shade",
      theme: {
        bgFrom: "#0D0B0C",
        bgTo: "#3B0D16",
        accent: "#D6B48A",
        text: "#F7F0E8",
      },
      previewImage: "/ad-studio/sample-assets/w0a-seasonal.jpg",
      briefDefaults: {
        name: "ZoeArtisan · Seasonal",
        productOrService: "ZoeArtisan Signature Red Matte Lipstick",
        coreMessage: "Winter’s signature",
        advertisingObjective: "brand_awareness",
        targetAudience: "Luxury beauty consumers 25–45",
        desiredTone: "warm, couture, editorial",
        platform: "instagram_feed",
        outputFormat: "portrait_1080x1350",
        cta: "Shop the shade",
      },
    },
    {
      id: "zoe-ex-landscape",
      title: "Display landscape",
      category: "Display",
      headline: "Signature Red, wide open",
      supporting: "Couture color for 16:9 placements — site, presentation, paid display.",
      cta: "Shop the shade",
      theme: {
        bgFrom: "#0D0B0C",
        bgTo: "#580D1C",
        accent: "#D6B48A",
        text: "#F7F0E8",
      },
      previewImage: "/ad-studio/sample-assets/w0a-lifestyle.jpg",
      briefDefaults: {
        name: "ZoeArtisan · Landscape",
        productOrService: "ZoeArtisan Signature Red Matte Lipstick",
        coreMessage: "Signature Red, wide open",
        advertisingObjective: "brand_awareness",
        targetAudience: "Luxury beauty consumers 25–45",
        desiredTone: "editorial, precise",
        platform: "linkedin",
        outputFormat: "landscape_1920x1080",
        cta: "Shop the shade",
      },
    },
  ],
  templates: [
    {
      templateId: "product-hero",
      displayName: "Signature product hero",
      tagline: "Centered couture still — product truth first",
      headline: "Signature Red, Perfectly Matte",
      supporting: "Couture color. All-day comfort. ZoeArtisan.",
      cta: "Shop the shade",
    },
    {
      templateId: "model-editorial",
      displayName: "Model editorial",
      tagline: "Beauty light · shallow depth · Wear Your Power",
      headline: "Wear Your Power",
      supporting: "Editorial framing with Signature Red as the quiet statement.",
      cta: "Discover ZoeArtisan",
    },
    {
      templateId: "product-launch",
      displayName: "Launch banner",
      tagline: "Top-weighted announcement for the shade drop",
      headline: "The red you’ve been waiting for",
      supporting: "ZoeArtisan Signature Red Matte — now in your kit.",
      cta: "Shop the shade",
    },
    {
      templateId: "multi-shade-collection",
      displayName: "Shade family",
      tagline: "Collection rhythm — keep packaging honest",
      headline: "One house. Many moods.",
      supporting: "Start with Signature Red — explore the matte atelier.",
      cta: "Explore shades",
    },
    {
      templateId: "texture-showcase",
      displayName: "Finish close-up",
      tagline: "Macro matte — never invent claims",
      headline: "Matte. Never flat.",
      supporting: "See the finish. Feel the couture.",
      cta: "Explore the finish",
    },
    {
      templateId: "lifestyle-placement",
      displayName: "Lifestyle placement",
      tagline: "Product in a lived-in burgundy world",
      headline: "Evenings, elevated",
      supporting: "Signature Red for moments that deserve attention.",
      cta: "Shop the shade",
    },
    {
      templateId: "seasonal-campaign",
      displayName: "Seasonal campaign",
      tagline: "Burgundy atmosphere · seasonal hero",
      headline: "Winter’s signature",
      supporting: "A couture red for the colder months.",
      cta: "Shop the shade",
    },
    {
      templateId: "promotional-offer",
      displayName: "Invite offer",
      tagline: "Elegant promo — no invented discounts",
      headline: "Your invitation to Signature Red",
      supporting: "Discover the matte that holds — ZoeArtisan.",
      cta: "Shop the shade",
    },
    {
      templateId: "minimal-editorial",
      displayName: "Minimal editorial",
      tagline: "Quiet luxury · Playfair + Montserrat",
      headline: "Less noise. More red.",
      supporting: "Precision color. Intimate tone.",
      cta: "Discover ZoeArtisan",
    },
    {
      templateId: "social-story",
      displayName: "Story frame",
      tagline: "9:16 vertical · one swipe narrative",
      headline: "One swipe. All evening.",
      supporting: "Matte that holds — ZoeArtisan Signature Red.",
      cta: "Shop the shade",
    },
  ],
};

const CATALOGS_BY_KEY: Record<string, BrandHomeCatalog> = {
  neutral: NEUTRAL_HOME_CATALOG,
  "zoe-artisan": ZOE_ARTISAN_HOME_CATALOG,
  zoeartisan: ZOE_ARTISAN_HOME_CATALOG,
};

export function brandCatalogKey(kit: BrandKitSummary | null | undefined): string {
  if (!kit?.id) return "neutral";
  const raw = (kit.name || "").toLowerCase();
  const compact = raw.replace(/[\s_-]+/g, "");
  if (
    (raw.includes("zoe") && raw.includes("artisan")) ||
    compact.includes("zoeartisan")
  ) {
    return "zoe-artisan";
  }
  const ctx = normalizeBrandContext(kit);
  const sig = (ctx?.signatureProduct || "").toLowerCase();
  if (sig.includes("signature red") && sig.includes("lipstick")) {
    return "zoe-artisan";
  }
  return `kit:${kit.id}`;
}

/** Heuristic Home catalog from any Brand Kit so dropdown changes are visible in UAT. */
export function buildSeedCatalogFromKit(kit: BrandKitSummary): BrandHomeCatalog {
  const ctx = normalizeBrandContext(kit);
  const brand = ctx?.name || kit.name || "Brand";
  const product =
    ctx?.signatureProduct || kit.description || `${brand} product`;
  const tagline = ctx?.tagline || `Made for ${brand}`;
  const cta = ctx?.preferredCta || "Learn more";
  const tone = ctx?.tone || "confident";
  const audience = ctx?.targetAudience || "Your audience";
  const primary = ctx?.colors.primary || "#1f2937";
  const secondary = ctx?.colors.secondary || "#111827";
  const accent = ctx?.colors.accent || "#c4a574";
  const text = ctx?.colors.text || "#f8fafc";

  const templates: BrandTemplatePresentation[] = [
    "product-hero",
    "model-editorial",
    "product-launch",
    "multi-shade-collection",
    "texture-showcase",
    "lifestyle-placement",
    "seasonal-campaign",
    "promotional-offer",
    "minimal-editorial",
    "social-story",
  ].map((templateId, i) => ({
    templateId: templateId as AdStudioTemplateId,
    displayName: `${brand} · ${templateId.replace(/-/g, " ")}`,
    tagline: `${tagline} · layout ${i + 1}`,
    headline: ctx?.exampleHeadlines?.[i % (ctx.exampleHeadlines?.length || 1)] || tagline,
    supporting: product,
    cta,
  }));

  const examples: FeaturedExample[] = [
    {
      id: `seed-${kit.id}-hero`,
      title: `${brand} hero`,
      category: ctx?.industry || "Brand",
      headline: tagline,
      supporting: product,
      cta,
      theme: { bgFrom: secondary, bgTo: primary, accent, text },
      previewImage: "/ad-studio/sample-assets/w0a-product-hero.jpg",
      briefDefaults: {
        name: `${brand} campaign`,
        productOrService: product,
        coreMessage: tagline,
        advertisingObjective: "product_promotion",
        targetAudience: audience,
        desiredTone: tone,
        platform: "instagram_feed",
        outputFormat: "portrait_1080x1350",
        cta,
      },
    },
    {
      id: `seed-${kit.id}-story`,
      title: `${brand} story`,
      category: "Social",
      headline: tagline,
      supporting: product,
      cta,
      theme: { bgFrom: primary, bgTo: secondary, accent, text },
      previewImage: "/ad-studio/sample-assets/w0a-social-story.jpg",
      briefDefaults: {
        name: `${brand} story`,
        productOrService: product,
        coreMessage: tagline,
        advertisingObjective: "brand_awareness",
        targetAudience: audience,
        desiredTone: tone,
        platform: "instagram_story",
        outputFormat: "vertical_1080x1920",
        cta,
      },
    },
    {
      id: `seed-${kit.id}-wide`,
      title: `${brand} landscape`,
      category: "Display",
      headline: tagline,
      supporting: product,
      cta,
      theme: { bgFrom: secondary, bgTo: primary, accent, text },
      previewImage: "/ad-studio/sample-assets/w0a-lifestyle.jpg",
      briefDefaults: {
        name: `${brand} landscape`,
        productOrService: product,
        coreMessage: tagline,
        advertisingObjective: "brand_awareness",
        targetAudience: audience,
        desiredTone: tone,
        platform: "linkedin",
        outputFormat: "landscape_1920x1080",
        cta,
      },
    },
  ];

  return {
    catalogKey: `kit:${kit.id}`,
    label: brand,
    source: "brand-seed",
    examples,
    templates,
  };
}

export function resolveBrandHomeCatalog(
  kit: BrandKitSummary | null | undefined,
): BrandHomeCatalog {
  if (!kit?.id) return NEUTRAL_HOME_CATALOG;
  const key = brandCatalogKey(kit);
  const curated = CATALOGS_BY_KEY[key];
  if (curated) {
    return { ...curated, label: kit.name || curated.label };
  }
  return buildSeedCatalogFromKit(kit);
}

export function templatePresentationFor(
  catalog: BrandHomeCatalog,
  templateId: AdStudioTemplateId,
): BrandTemplatePresentation | undefined {
  return catalog.templates.find((t) => t.templateId === templateId);
}

export const AD_STUDIO_BRAND_KIT_STORAGE_KEY =
  "nxclip.adStudio.selectedBrandKitId";

export function readStoredBrandKitId(): string {
  try {
    return localStorage.getItem(AD_STUDIO_BRAND_KIT_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeStoredBrandKitId(id: string) {
  try {
    if (!id) localStorage.removeItem(AD_STUDIO_BRAND_KIT_STORAGE_KEY);
    else localStorage.setItem(AD_STUDIO_BRAND_KIT_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}
