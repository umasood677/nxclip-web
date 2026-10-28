/** M2B screen IDs are preserved; routing attaches them to existing owned records. */
export const AD_STUDIO_EXPERIENCE_SCREENS = [
  "home",
  "brief",
  "templates",
  "template",
  "assets",
  "progress",
  "concepts",
  "detail",
  "compare",
  "preview",
  "edit",
  "variations",
  "workspace",
  "formats",
  "export",
  "performance",
  "director",
  "brand-intelligence",
  "product-lab",
  "visual-lab",
  "composition",
  "advanced-canvas",
  "variation-lab",
  "adaptation",
  "campaign-manager",
  "motion-studio",
  "delivery",
  "dna-quality",
  "preflight",
  "brand-info",
  "brand-category",
  "brand-goals",
  "brand-assets",
  "brand-analysis",
  "brand-guidelines",
  "brand-overview",
  "brand-templates",
  "brand-template-detail",
  "category-studio",
  "brand-manager",
] as const;
export type AdStudioExperienceScreen =
  (typeof AD_STUDIO_EXPERIENCE_SCREENS)[number];
export function isM2BProductionEnabled(
  env: Record<string, unknown> | undefined = import.meta.env,
) {
  return env?.VITE_AD_STUDIO_M2B_PRODUCTION_ENABLED === "true";
}
export function projectExperiencePath(
  projectId: string,
  screen: AdStudioExperienceScreen,
  selection?: { conceptId?: string; creativeId?: string; templateId?: string },
) {
  const query = new URLSearchParams({ view: screen });
  if (selection?.conceptId) query.set("concept", selection.conceptId);
  if (selection?.creativeId) query.set("creative", selection.creativeId);
  if (selection?.templateId) query.set("template", selection.templateId);
  return "/create/ad/projects/" + encodeURIComponent(projectId) + "?" + query;
}
export function parseExperienceScreen(
  value: string | null,
): AdStudioExperienceScreen {
  return AD_STUDIO_EXPERIENCE_SCREENS.includes(
    value as AdStudioExperienceScreen,
  )
    ? (value as AdStudioExperienceScreen)
    : "workspace";
}
export const EXPERIENCE_TITLES: Partial<
  Record<AdStudioExperienceScreen, string>
> = {
  brief: "Give your idea a point of view.",
  templates: "Start with a visual direction.",
  template: "A considered starting point.",
  assets: "Make it unmistakably yours.",
  progress: "Making room for your idea.",
  concepts: "Four directions. One signature.",
  detail: "The thinking behind the image.",
  compare: "Find your campaign's point of view.",
  preview: "Meet your next campaign.",
  workspace: "Your campaign, coming together.",
  director: "A creative partner. A clear point of view.",
  "brand-intelligence": "The details that make a brand.",
  "product-lab": "Preserve the product. Prepare the possibility.",
  "visual-lab": "Build the world around your product.",
  composition: "An advertisement, considered layer by layer.",
  "campaign-manager": "A campaign with a memory.",
  preflight: "Know what's ready before you create.",
  export: "Ready for the next step.",
  formats: "One campaign. Every placement.",
  adaptation: "One campaign. Every placement.",
  variations: "One idea, new expressions.",
  "variation-lab": "One idea, new expressions.",
};
