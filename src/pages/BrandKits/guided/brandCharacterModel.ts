import type {
  BrandAssetEntry,
  BrandCharacterProfile,
  BrandCharacterScope,
} from "../lib/brandKitTypes";
export const CHARACTER_SCOPES: BrandCharacterScope[] = [
  "ad-studio",
  "image-studio",
  "ad-animation",
];
export function newBrandCharacter(
  id: string = crypto.randomUUID(),
): BrandCharacterProfile {
  return {
    id,
    name: "",
    kind: "mascot",
    status: "draft",
    referenceAssetIds: [],
    appearance: "",
    style: "",
    wardrobe: "",
    expressions: "",
    consistencyRules: "",
    permissions: {
      commercialUse: false,
      likenessConsent: false,
      origin: "unverified",
      scopes: [],
      evidence: "",
    },
  };
}
export function characterReviewIssues(
  character: BrandCharacterProfile,
  assets: BrandAssetEntry[],
  now = new Date(),
): string[] {
  const issues: string[] = [];
  if (!character.name.trim()) issues.push("Enter a character name.");
  const owned = new Set(
    assets
      .filter((a) => a.status === "ready" && a.mimeType?.startsWith("image/"))
      .map((a) => a.id),
  );
  if (character.referenceAssetIds.some((id) => !owned.has(id)))
    issues.push("References must be ready images in this Brand Kit.");
  if (character.status === "approved") {
    const p = character.permissions;
    if (!p.commercialUse || p.origin === "unverified" || !p.evidence.trim())
      issues.push(
        "Record commercial authorization and its basis before approval.",
      );
    if (!p.scopes.length) issues.push("Choose an authorized usage scope.");
    if (
      character.kind === "human-model" &&
      (!p.likenessConsent ||
        !["licensed", "consented"].includes(p.origin) ||
        !character.referenceAssetIds.length)
    )
      issues.push(
        "Human references require explicit likeness consent and a consent/license basis.",
      );
    if (
      p.expiresAt &&
      (!Number.isFinite(Date.parse(p.expiresAt)) ||
        Date.parse(p.expiresAt) <= now.getTime())
    )
      issues.push("Authorization has expired or is invalid.");
  }
  return issues;
}

export function characterProfilesForDuplicate(
  profiles: BrandCharacterProfile[],
): BrandCharacterProfile[] {
  return profiles.map((profile) => ({
    ...structuredClone(profile),
    id: crypto.randomUUID(),
    status: "draft",
    referenceAssetIds: [],
    permissions: {
      commercialUse: false,
      likenessConsent: false,
      origin: "unverified",
      scopes: [],
      evidence: "",
    },
  }));
}
