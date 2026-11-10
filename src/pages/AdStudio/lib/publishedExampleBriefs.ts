import { ZOE_ARTISAN_HOME_CATALOG } from "./brandHomeCatalog";
import type { FeaturedExample } from "./exampleCreatives";

// Only publish reviewed artwork/description pairs. Keep the curated source
// records intact and use these descriptions solely as visual inspiration.
const reviewed = [
  ["zoe-ex-texture", "Texture close-up", "Feel the Finish", "Discover", "Macro texture fills the upper frame. Deep matte burgundy powder, raking light and low-key shadows reveal ridges. Leave the lower-left area calm for restrained editorial copy."],
  ["zoe-ex-signature-red", "Product spotlight", "Wear Your Power", "Shop now", "A single upright object centered low in a soft champagne-to-burgundy spotlight. Leave a broad, quiet upper region for editable type."],
  ["zoe-ex-editorial-model", "Editorial beauty still", "Wear Your Power", "Shop now", "Asymmetric two-column portrait. A softly side-lit subject fills the dark left panel. An ivory right panel reserves separate space for copy and a secondary object."],
  ["multiple-shades", "Multiple shades", "Shade Family", "Explore shades", "An evenly spaced two-by-two product study on warm ivory. Soft consistent light and shallow shadows make variants easy to compare. Keep the upper title region open."],
  ["zoe-ex-shade-story", "Shade story", "One Swipe. Iconic.", "Shop", "Tall burgundy composition with a softly spotlighted object centered below a quiet upper region. Keep a clear footer for a single action."],
] as const;

export const publishedExampleBriefs = reviewed.map(([id, title, headline, cta, creativeDirection]) => {
  const source = ZOE_ARTISAN_HOME_CATALOG.examples.find(example => example.id === id);
  if (!source?.previewImage) throw Error("Missing reviewed Example Brief artwork: " + id);
  return { ...source, title, headline, cta, supporting: "", creativeDirection, catalogVersion: "visual-review-v1" };
}) satisfies FeaturedExample[];

export function exampleForPlanning(id: string) {
  return publishedExampleBriefs.find(example => example.id === id);
}
