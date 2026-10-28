import type { AdBriefFormState } from "./adStudioLabels";

/** Deterministic featured examples — not user projects, not AI output. */
export type FeaturedExample = {
  exampleObjective?: string;
  productCategory?: string;
  creativeDirection?: string;
  productFocus?: string;
  id: string;
  title: string;
  category: string;
  headline: string;
  supporting: string;
  cta: string;
  /** Visual theme fallback when previewImage missing */
  theme: {
    bgFrom: string;
    bgTo: string;
    accent: string;
    text: string;
  };
  /** Public sample preview (see public/ad-studio/sample-assets/PROVENANCE.md) */
  previewImage?: string;
  briefDefaults: Partial<AdBriefFormState>;
};

export const FEATURED_EXAMPLES: FeaturedExample[] = [
  {
    id: "ex-athletic",
    title: "Athletic Drop",
    category: "Product",
    headline: "Move Without Limits",
    supporting: "Performance gear engineered for everyday athletes.",
    cta: "Shop Now",
    theme: {
      bgFrom: "#0F172A",
      bgTo: "#1E293B",
      accent: "#38BDF8",
      text: "#F8FAFC",
    },
    previewImage: "/ad-studio/sample-assets/w0a-product-launch.jpg",
    briefDefaults: {
      name: "Athletic Drop",
      productOrService: "Performance running shoes",
      coreMessage: "Move without limits",
      advertisingObjective: "product_promotion",
      targetAudience: "Active adults 22–40",
      desiredTone: "energetic",
      platform: "instagram_feed",
      outputFormat: "portrait_1080x1350",
      cta: "Shop Now",
    },
  },
  {
    id: "ex-saas",
    title: "SaaS Launch",
    category: "Software",
    headline: "Ship Faster Together",
    supporting: "The workspace your product team actually finishes work in.",
    cta: "Get Started",
    theme: {
      bgFrom: "#111827",
      bgTo: "#312E81",
      accent: "#A5B4FC",
      text: "#F9FAFB",
    },
    previewImage: "/ad-studio/sample-assets/w0a-minimal.jpg",
    briefDefaults: {
      name: "SaaS Launch",
      productOrService: "Team collaboration platform",
      coreMessage: "Ship faster together",
      advertisingObjective: "lead_generation",
      targetAudience: "Product and engineering leads",
      desiredTone: "confident",
      platform: "linkedin",
      outputFormat: "landscape_1920x1080",
      cta: "Get Started",
    },
  },
  {
    id: "ex-event",
    title: "Night Event",
    category: "Event",
    headline: "One Night Only",
    supporting: "An immersive evening of music, light, and community.",
    cta: "Book Now",
    theme: {
      bgFrom: "#18181B",
      bgTo: "#4C1D95",
      accent: "#F472B6",
      text: "#FAFAFA",
    },
    previewImage: "/ad-studio/sample-assets/w0a-social-story.jpg",
    briefDefaults: {
      name: "Night Event",
      productOrService: "Live music festival",
      coreMessage: "One night only",
      advertisingObjective: "event_promotion",
      targetAudience: "City culture seekers 18–35",
      desiredTone: "bold",
      platform: "instagram_story",
      outputFormat: "vertical_1080x1920",
      cta: "Book Now",
    },
  },
  {
    id: "ex-luxury",
    title: "Quiet Luxury",
    category: "Lifestyle",
    headline: "Crafted Stillness",
    supporting: "Minimal pieces for moments that deserve attention.",
    cta: "Learn more",
    theme: {
      bgFrom: "#FAF7F2",
      bgTo: "#E7E5E4",
      accent: "#78716C",
      text: "#1C1917",
    },
    previewImage: "/ad-studio/sample-assets/w0a-lifestyle.jpg",
    briefDefaults: {
      name: "Quiet Luxury",
      productOrService: "Premium home fragrance",
      coreMessage: "Crafted stillness",
      advertisingObjective: "brand_awareness",
      targetAudience: "Design-conscious homeowners",
      desiredTone: "calm, premium",
      platform: "instagram_feed",
      outputFormat: "portrait_1080x1350",
      cta: "Learn more",
    },
  },
  {
    id: "ex-zoe-artisan",
    title: "ZoeArtisan Lipstick",
    category: "Beauty",
    headline: "Signature Red, Perfectly Matte",
    supporting: "ZoeArtisan Signature Red Matte Lipstick — couture color with all-day comfort.",
    cta: "Shop Now",
    theme: {
      bgFrom: "#1C1917",
      bgTo: "#7F1D1D",
      accent: "#BE123C",
      text: "#FAFAF9",
    },
    previewImage: "/ad-studio/sample-assets/w0a-product-hero.jpg",
    briefDefaults: {
      name: "ZoeArtisan Signature Red",
      productOrService: "ZoeArtisan Signature Red Matte Lipstick",
      coreMessage: "Signature red, perfectly matte",
      advertisingObjective: "product_promotion",
      targetAudience: "Luxury beauty consumers seeking elegant, long-wear color",
      desiredTone: "elegant, refined, sensual",
      platform: "instagram_feed",
      outputFormat: "portrait_1080x1350",
      cta: "Shop Now",
    },
  },
];
