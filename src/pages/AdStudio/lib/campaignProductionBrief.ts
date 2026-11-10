import type { BrandKitSummary } from "../../BrandKits/lib/brandKitTypes";
import type { AdConcept } from "../types";
import type { WorkspaceProject } from "./projectWorkspace";

export function campaignProductionBrief(project: WorkspaceProject, concept: AdConcept, brand?: BrandKitSummary | null) {
  const { brief } = project;
  const approvedIds = new Set(brand?.voice?.studio?.approvedAssetIds ?? []);
  const selectedIds = [...new Set([brief?.productImageAssetId, brief?.referenceImageAssetId])]
    .filter((id): id is string => typeof id === "string" && !!id);
  const verifiedAssets = brand?.id && brand.id === project.brandKitId
    ? (brand.assets ?? []).filter(asset => selectedIds.includes(asset.id) && approvedIds.has(asset.id) &&
      asset.status === "ready" && asset.role !== "brand_model")
    : [];
  return {
    verifiedAssets,
    unverifiedAssetCount: selectedIds.length - verifiedAssets.length,
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
