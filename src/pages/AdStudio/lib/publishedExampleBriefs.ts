import { ZOE_ARTISAN_HOME_CATALOG } from "./brandHomeCatalog";
import type { FeaturedExample } from "./exampleCreatives";

// Only publish reviewed artwork/description pairs. Keep the curated source
// records intact and use these descriptions solely as visual inspiration.
const reviewed = [
  ["zoe-ex-seasonal", "Seasonal editorial", "Autumn Edit", "Explore", "Close portrait framed by autumn foliage in rust, copper and deep brown, with warm natural light. Reserve low-left space for warm ivory serif copy and a terracotta CTA, with a slim ivory footer.", true],
  ["zoe-ex-texture", "Texture close-up", "Feel the Finish", "Discover", "Macro texture fills the upper frame. Deep matte burgundy powder, raking light and low-key shadows reveal ridges. Leave the lower-left area calm for restrained editorial copy."],
  ["zoe-ex-signature-red", "Product spotlight", "Wear Your Power", "Shop now", "A single upright object centered low in a soft champagne-to-burgundy spotlight. Leave a broad, quiet upper region for editable type."],
  ["zoe-ex-editorial-model", "Editorial beauty still", "Wear Your Power", "Shop now", "Asymmetric two-column portrait. Use deep oxblood and burgundy (#321418, #591F29) across the softly side-lit left panel, warm ivory (#F1E4CF) in the right copy panel, and restrained antique gold (#B6945A) accents. The example uses dark maroon lettering on ivory. Reserve separate space for editable copy and the campaign subject.", true],
  ["multiple-shades", "Multiple shades", "Shade Family", "Explore shades", "An evenly spaced two-by-two product study on warm ivory. Soft consistent light and shallow shadows make variants easy to compare. Keep the upper title region open."],
  ["zoe-ex-shade-story", "Shade story", "One Swipe. Iconic.", "Shop", "Tall burgundy composition with a softly spotlighted object centered below a quiet upper region. Keep a clear footer for a single action."],
] as const;

const reviewedCatalog = reviewed.map(([id, title, headline, cta, creativeDirection, includesPerson = false]) => {
  const source = ZOE_ARTISAN_HOME_CATALOG.examples.find(example => example.id === id);
  if (!source?.previewImage) throw Error("Missing reviewed Example Brief artwork: " + id);
  return { ...source, title, headline, cta, supporting: "", creativeDirection, includesPerson, catalogVersion: "visual-review-v1" };
}) satisfies FeaturedExample[];

// Append new examples in publication order. The gallery shows the newest first.
const originalExamples = [
  {
    id: "ex-creator-night-reset",
    title: "Creator-led product demo",
    category: "Creator",
    headline: "My Night Reset",
    supporting: "",
    cta: "See the Routine",
    theme: { bgFrom: "#EBD6BD", bgTo: "#C9A17D", accent: "#145AA3", text: "#12395D" },
    previewImage: "/ad-studio/sample-assets/creator-night-reset.jpg",
    creativeDirection: "Shoot from table height with a wide lens. Bring the campaign subject close to the camera in a relatable creator-led demonstration. Use warm cream interiors with cobalt accents. Reserve room at the top for stacked blue type and a short lower-right CTA.",
    includesPerson: true,
    catalogVersion: "visual-review-v1",
    briefDefaults: { advertisingObjective: "product_promotion", platform: "instagram_feed", outputFormat: "portrait_1080x1440" },
  },
  {
    id: "ex-street-in-focus",
    title: "High-angle street style",
    category: "Fashion",
    headline: "Street in Focus",
    supporting: "",
    cta: "Find Your Frame",
    theme: { bgFrom: "#17252D", bgTo: "#565653", accent: "#F58D24", text: "#F0D74A" },
    previewImage: "/ad-studio/sample-assets/street-in-focus.jpg",
    creativeDirection: "Shoot from a steep overhead angle and use diagonal pavement shadows to frame the campaign subject. Contrast electric blue and warm amber against charcoal, leaving the darker upper-left and lower-left areas clear for orange headline type and a yellow italic CTA.",
    includesPerson: true,
    catalogVersion: "visual-review-v1",
    briefDefaults: { advertisingObjective: "product_promotion", platform: "instagram_feed", outputFormat: "portrait_1080x1440" },
  },
  {
    id: "ex-space-to-breathe",
    title: "Architectural editorial",
    category: "Services",
    headline: "Space to Breathe",
    supporting: "",
    cta: "Explore the Studio",
    theme: { bgFrom: "#DAC6AA", bgTo: "#8E8870", accent: "#6C704E", text: "#26271E" },
    previewImage: "/ad-studio/sample-assets/space-to-breathe.jpg",
    creativeDirection: "Use asymmetrical editorial framing, sculptural forms and warm directional light. Pair sand and muted olive with long, soft-edged shadows. Reserve a quiet upper-left area for an elegant serif headline and leave room for a small CTA near the bottom.",
    includesPerson: false,
    catalogVersion: "visual-review-v1",
    briefDefaults: { advertisingObjective: "brand_awareness", platform: "instagram_feed", outputFormat: "portrait_1080x1440" },
  },
  {
    id: "ex-built-for-the-pace",
    title: "Sports product launch",
    category: "Product",
    headline: "Built for the Pace",
    supporting: "",
    cta: "Explore the Drop",
    theme: { bgFrom: "#101E38", bgTo: "#0B101A", accent: "#BDE83F", text: "#F4F6FF" },
    previewImage: "/ad-studio/sample-assets/built-for-the-pace.jpg",
    creativeDirection: "Angle the campaign's hero product across a midnight-blue scene with track-inspired motion cues. Use a cool rim light and electric-lime accents. Keep the upper-left clear for condensed white type and reserve lower-right space for a compact CTA.",
    includesPerson: false,
    catalogVersion: "visual-review-v1",
    briefDefaults: { advertisingObjective: "product_promotion", platform: "instagram_feed", outputFormat: "portrait_1080x1440" },
  },
  {
    id: "ex-signature-carry",
    title: "Luxury handbag editorial",
    category: "Fashion",
    headline: "The Signature Carry",
    supporting: "",
    cta: "Explore the Collection",
    theme: { bgFrom: "#EADCC6", bgTo: "#634835", accent: "#B38B51", text: "#342018" },
    previewImage: "/ad-studio/sample-assets/signature-carry.jpg",
    creativeDirection: "Feature the campaign's handbag in three-quarter view, with its handle and hardware fully visible on a warm travertine plinth. Pair oxblood, warm ivory and antique gold with a sculptural afternoon shadow. Leave space above and beside the product for a refined headline and short CTA.",
    includesPerson: false,
    catalogVersion: "visual-review-v1",
    briefDefaults: { advertisingObjective: "product_promotion", platform: "instagram_feed", outputFormat: "portrait_1080x1440" },
  },
  {
    id: "ex-after-dark-heels",
    title: "High-heel evening editorial",
    category: "Fashion",
    headline: "After Dark",
    supporting: "",
    cta: "Discover the Edit",
    theme: { bgFrom: "#271D3C", bgTo: "#141216", accent: "#A992D4", text: "#F4EBDD" },
    previewImage: "/ad-studio/sample-assets/after-dark-heels.jpg",
    creativeDirection: "Arrange the heels along intersecting diagonals, with one shown in profile and the other angled so the toe and heel remain visible. Use a charcoal stage, a narrow violet spotlight and soft lavender reflections. Keep the upper and lower left clear for an ivory headline and compact CTA.",
    includesPerson: false,
    catalogVersion: "visual-review-v1",
    briefDefaults: { advertisingObjective: "product_promotion", platform: "instagram_feed", outputFormat: "portrait_1080x1440" },
  },
] satisfies (FeaturedExample & { includesPerson: boolean; creativeDirection: string; previewImage: string })[];

export const publishedExampleBriefs = [[...originalExamples].reverse(), reviewedCatalog].flat();

export function exampleForPlanning(id: string) {
  return publishedExampleBriefs.find(example => example.id === id);
}
