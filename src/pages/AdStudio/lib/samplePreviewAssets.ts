/**
 * Public demonstration previews for Template Gallery / Example Briefs.
 * NxClip-owned public sample comps — see public/ad-studio/sample-assets/PROVENANCE.md.
 * Never point these at private Brand Kit / user media.
 */
import type { AdStudioTemplateId } from "../canvas/templateCatalog";

const BASE = "/ad-studio/sample-assets";

export const TEMPLATE_SAMPLE_PREVIEW: Record<AdStudioTemplateId, string> = {
  "product-hero": `${BASE}/w0a-product-hero.jpg`,
  "model-editorial": `${BASE}/w0a-model-editorial.jpg`,
  "product-launch": `${BASE}/w0a-product-launch.jpg`,
  "multi-shade-collection": `${BASE}/w0a-multi-shade.jpg`,
  "texture-showcase": `${BASE}/w0a-texture-showcase.jpg`,
  "lifestyle-placement": `${BASE}/w0a-lifestyle.jpg`,
  "seasonal-campaign": `${BASE}/w0a-seasonal.jpg`,
  "promotional-offer": `${BASE}/w0a-promo.jpg`,
  "minimal-editorial": `${BASE}/w0a-minimal.jpg`,
  "social-story": `${BASE}/w0a-social-story.jpg`,
};

export function templateSamplePreview(templateId: AdStudioTemplateId): string {
  return TEMPLATE_SAMPLE_PREVIEW[templateId];
}
