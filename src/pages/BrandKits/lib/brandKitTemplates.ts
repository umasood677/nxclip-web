import type { PortableBrandKit } from "./brandKitPortable";
import { BRAND_KIT_SCHEMA_VERSION, BRAND_KIT_TYPE } from "./brandKitPortable";

export type BrandKitTemplate = {
  id: string;
  label: string;
  blurb: string;
  exampleBadge: string;
  portable: PortableBrandKit;
};

function template(
  id: string,
  label: string,
  blurb: string,
  portable: Omit<PortableBrandKit, "schemaVersion" | "type">,
): BrandKitTemplate {
  return {
    id,
    label,
    blurb,
    exampleBadge: "Example template",
    portable: {
      schemaVersion: BRAND_KIT_SCHEMA_VERSION,
      type: BRAND_KIT_TYPE,
      ...portable,
    },
  };
}

/** Static starter templates — editable copies owned by the user after creation. */
export const BRAND_KIT_TEMPLATES: BrandKitTemplate[] = [
  template(
    "luxury-cosmetics",
    "Luxury Cosmetics",
    "Dark burgundy editorial beauty palette with elegant serif headlines.",
    {
      brand: {
        name: "Luxury Cosmetics Template",
        industry: "Luxury Beauty & Cosmetics",
        description: "Example luxury beauty brand — replace with your identity.",
        tagline: "Wear Your Power.",
        signatureProduct: "Signature Red Matte Lipstick",
        personality: "Confident, couture, warm",
      },
      colors: {
        primary: "#A6192E",
        secondary: "#580D1C",
        background: "#0D0B0C",
        accent: "#D6B48A",
        text: "#F7F0E8",
      },
      typography: {
        headline: "Playfair Display",
        body: "Montserrat",
        accent: "Playfair Display",
        cta: "Montserrat",
      },
      voice: {
        tone: "Editorial, intimate, precise",
        preferredCta: "Shop the shade",
      },
      creativeGuidelines: {
        visualStyle: "Luxury beauty editorial",
        prohibitedClaims: "No medical claims",
      },
    },
  ),
  template(
    "gaming-esports",
    "Gaming / Esports",
    "Neon violet and cyan energy with bold display type.",
    {
      brand: {
        name: "Gaming Template",
        industry: "Gaming / Esports",
        description: "Example gaming brand — replace with your studio identity.",
        tagline: "Drop in. Own the arena.",
        personality: "Bold, electric, relentless",
      },
      colors: {
        primary: "#7C3AED",
        secondary: "#06B6D4",
        background: "#0B1020",
        accent: "#F472B6",
        text: "#E2E8F0",
      },
      typography: {
        headline: "Anton",
        body: "Inter",
        accent: "Bebas Neue",
        cta: "Montserrat",
      },
      voice: { preferredCta: "Play now", tone: "Hype without fluff" },
    },
  ),
  template(
    "skincare-wellness",
    "Skincare / Wellness",
    "Champagne, ivory, and sage with calm elegant typography.",
    {
      brand: {
        name: "Skincare Template",
        industry: "Skincare / Wellness",
        description: "Example wellness brand — replace with your product line.",
        tagline: "Glow, quietly.",
        personality: "Refined, serene, trustworthy",
      },
      colors: {
        primary: "#C4A574",
        secondary: "#E8E2D6",
        background: "#F7F4EF",
        accent: "#8FA68A",
        text: "#2F2A26",
      },
      typography: {
        headline: "Playfair Display",
        body: "Lato",
        accent: "Raleway",
        cta: "Lato",
      },
      voice: { preferredCta: "Discover the ritual" },
    },
  ),
  template(
    "fintech-saas",
    "Fintech / SaaS",
    "Emerald and navy clarity for modern business products.",
    {
      brand: {
        name: "Fintech Template",
        industry: "Fintech / SaaS",
        description: "Example fintech brand — replace with your product name.",
        tagline: "Money that moves with you.",
        personality: "Clear, confident, dependable",
      },
      colors: {
        primary: "#059669",
        secondary: "#0F172A",
        background: "#F8FAFC",
        accent: "#38BDF8",
        text: "#0F172A",
      },
      typography: {
        headline: "Montserrat",
        body: "Inter",
        accent: "Inter",
        cta: "Montserrat",
      },
      voice: { preferredCta: "Start free" },
    },
  ),
];
