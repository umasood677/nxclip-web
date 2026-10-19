/** Human labels for Ad Studio backend enums. Never show raw identifiers in UI. */

export const AD_OBJECTIVES = [
  { value: "brand_awareness", label: "Brand Awareness", hint: "Build recognition" },
  { value: "product_promotion", label: "Product Promotion", hint: "Sell a product" },
  { value: "website_traffic", label: "Website Traffic", hint: "Drive visits" },
  { value: "lead_generation", label: "Lead Generation", hint: "Capture leads" },
  { value: "engagement", label: "Engagement", hint: "Start conversations" },
  { value: "event_promotion", label: "Event Promotion", hint: "Promote an event" },
  { value: "app_installation", label: "App Installation", hint: "Get installs" },
] as const;

export const AD_PLATFORMS = [
  { value: "instagram_feed", label: "Instagram Feed", hint: "4:5 friendly" },
  { value: "instagram_story", label: "Instagram Story", hint: "9:16 full-bleed" },
  { value: "facebook_feed", label: "Facebook Feed", hint: "Feed placement" },
  { value: "linkedin", label: "LinkedIn", hint: "Professional" },
  { value: "x_twitter", label: "X (Twitter)", hint: "Social posts" },
  { value: "generic", label: "Generic / Other", hint: "Flexible" },
] as const;

export const AD_CTA_SUGGESTIONS = [
  "Learn more",
  "Shop Now",
  "Sign Up",
  "Get Started",
  "Download",
  "Book Now",
] as const;

import type { BriefBrandPreviewCache } from "../../BrandKits/lib/brandContext";

export type AdBriefFormState = {
  name: string;
  brandKitId: string;
  /** Signed URL / palette cache from active kit — cleared when brandKitId changes. */
  brandPreview?: BriefBrandPreviewCache | null;
  productOrService: string;
  advertisingObjective: string;
  targetAudience: string;
  coreMessage: string;
  desiredTone: string;
  platform: string;
  outputFormat: string;
  cta: string;
};

export const DEFAULT_AD_BRIEF: AdBriefFormState = {
  name: "New ad project",
  brandKitId: "",
  productOrService: "",
  advertisingObjective: "product_promotion",
  targetAudience: "",
  coreMessage: "",
  desiredTone: "confident",
  platform: "instagram_feed",
  outputFormat: "portrait_1080x1350",
  cta: "Learn more",
};
