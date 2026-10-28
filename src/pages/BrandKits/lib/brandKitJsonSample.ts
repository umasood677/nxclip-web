import type { PortableBrandKit } from "./brandKitPortable";
/** Illustrative schema example, never a verified brand or product inventory. */
export const BRAND_KIT_JSON_SAMPLE: PortableBrandKit = {
  schemaVersion: "1.0",
  type: "nxclip.brand-kit",
  brand: {
    name: "Your Brand",
    description: "Describe your business and its actual products.",
    website: "https://example.com",
    targetAudience: "Your intended customers",
    tagline: "Your approved tagline",
    signatureProduct: "Your actual product",
  },
  colors: {
    primary: "#B89B72",
    secondary: "#16151A",
    background: "#FAF8F4",
    text: "#242128",
  },
  typography: { headline: "Playfair Display", body: "Inter" },
  voice: {
    tone: "Confident and warm",
    personality: "Refined",
    preferredCta: "Discover more",
    preferredVocabulary: ["craft"],
    prohibitedVocabulary: ["guaranteed results"],
    exampleHeadlines: ["A signature of your own"],
  },
  creativeGuidelines: {
    photographyDirection: "Use original product photography.",
    lighting: "Soft directional light",
    productRepresentation: "Preserve packaging and printed labels.",
    prohibitedClaims: "Do not invent product benefits or variants.",
  },
  guidelines: "Replace these examples with approved brand information.",
  assets: [
    {
      role: "logo_primary",
      label: "Primary logo",
      requiresReupload: true,
      usageGuidance: "Upload or select an authorized logo in the Assets step.",
    },
  ],
};
