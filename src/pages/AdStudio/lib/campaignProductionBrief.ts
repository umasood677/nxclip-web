import type { BrandKitSummary } from "../../BrandKits/lib/brandKitTypes";
import type { AdConcept } from "../types";
import type { WorkspaceProject } from "./projectWorkspace";

export function campaignProductionBrief(project: WorkspaceProject, concept: AdConcept, brand?: BrandKitSummary | null) {
  const { brief } = project;
  const approvedIds = new Set(brand?.voice?.studio?.approvedAssetIds ?? []);
  // A model is relevant only when this campaign explicitly chose an approved
  // profile.  Production Review must not turn an optional Brand Kit model into
  // a blocker for product, service, or unbranded campaigns.
  const selectedProfile = (brand?.voice?.studio?.characters ?? []).find(
    (profile) =>
      profile.id === brief?.preferredModelProfile &&
      profile.status === "approved" &&
      profile.permissions.scopes.includes("ad-studio"),
  );
  const selectedIds = [...new Set([
    brief?.productImageAssetId,
    brief?.referenceImageAssetId,
    ...(selectedProfile?.referenceAssetIds ?? []),
  ])]
    .filter((id): id is string => typeof id === "string" && !!id);
  const verifiedAssets = brand?.id && brand.id === project.brandKitId
    ? (brand.assets ?? []).filter(asset => selectedIds.includes(asset.id) && approvedIds.has(asset.id) &&
      asset.status === "ready")
    : [];
  return {
    verifiedAssets,
    unverifiedAssetCount: selectedIds.length - verifiedAssets.length,
    selectedModelName: selectedProfile?.name,
    startingCreativeId: brief?.startingCreativeId,
    inspiration: brief?.exampleVisualDirection || undefined,
    conceptId: concept.conceptId,
    title: concept.title,
    headline: brief?.headline?.trim() || concept.primaryHeadline,
    supportingCopy: brief?.supportingCopy?.trim() ?? concept.supportingCopy,
    cta: brief?.cta?.trim() || concept.cta,
    composition: concept.composition,
    direction: concept.creativeDirection,
    alignment: concept.explanation,
    format: project.outputFormat || brief?.outputFormat,
    platform: brief?.platform,
    brandKitId: project.brandKitId,
    restrictions: brief?.negativeInstructions,
    claimWarnings: concept.claimWarnings ?? [],
  };
}
