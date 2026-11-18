import { characterReviewIssues } from "../../BrandKits/guided/brandCharacterModel";
import type { BrandKitSummary } from "../../BrandKits/lib/brandKitTypes";
import type { AdConcept } from "../types";

export function directionNeedsBrandModel(concept: AdConcept) {
  return /\b(?:models?|women|woman|men|man|female|male|person|people|wearers?|mascots?|characters?)\b/i.test(
    [concept.creativeDirection, concept.visualPrompt, concept.composition].join(" "),
  );
}

export function campaignModelProfiles(brand: BrandKitSummary | null) {
  const approved = new Set(brand?.voice?.studio?.approvedAssetIds ?? []);
  return (brand?.voice?.studio?.characters ?? []).filter(profile =>
    profile.status === "approved" &&
    profile.permissions.scopes.includes("ad-studio") &&
    profile.referenceAssetIds.length > 0 &&
    profile.referenceAssetIds.length <= 4 &&
    profile.referenceAssetIds.every(id => approved.has(id) && brand?.assets?.some(asset =>
      asset.id === id && ["brand_model", "other"].includes(asset.role ?? "") &&
      ["image/png", "image/jpeg", "image/webp"].includes(asset.mimeType ?? ""),
    )) &&
    !characterReviewIssues(profile, brand?.assets ?? []).length,
  );
}
