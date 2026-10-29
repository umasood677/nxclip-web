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
  if (
    character.referenceAssetIds.length > 8 ||
    new Set(character.referenceAssetIds).size !==
      character.referenceAssetIds.length
  )
    issues.push("Choose at most eight distinct reference images.");
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

/** Bind only a ready image already returned for this account-owned Brand Kit. */
export function attachCharacterReference(
  profile: BrandCharacterProfile,
  kit: { assets?: BrandAssetEntry[] },
  assetId: string,
): BrandCharacterProfile {
  const asset = kit.assets?.find(
    (a) =>
      a.id === assetId &&
      a.status === "ready" &&
      a.mimeType?.startsWith("image/"),
  );
  if (!asset) throw Error("Choose a ready image in this Brand Kit.");
  if (profile.referenceAssetIds.includes(assetId)) return profile;
  if (profile.referenceAssetIds.length >= 8)
    throw Error("A profile can contain at most eight reference images.");
  return {
    ...profile,
    status: "draft",
    referenceAssetIds: [...profile.referenceAssetIds, assetId],
  };
}
/** Upload is a separate asset write; rebase its version only if the saved target profile did not change. */
export function characterUnchangedAfterAssetUpdate(
  before: {
    voice?: { studio?: { characters?: BrandCharacterProfile[] } } | null;
  },
  after: {
    voice?: { studio?: { characters?: BrandCharacterProfile[] } } | null;
  },
  profileId: string,
) {
  const prior = before.voice?.studio?.characters?.find(
      (p) => p.id === profileId,
    ),
    current = after.voice?.studio?.characters?.find((p) => p.id === profileId);
  return JSON.stringify(prior) === JSON.stringify(current);
}
