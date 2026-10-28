import type { BrandStudioProfile } from "../lib/brandKitTypes";
import type { PortableBrandStudio } from "../lib/brandKitPortable";
import { BRAND_TAXONOMY } from "./guidedBrandModel";
import { newBrandCharacter } from "./brandCharacterModel";
export function exportBrandStudio(
  studio: BrandStudioProfile | undefined,
): PortableBrandStudio | undefined {
  if (!studio || studio.schemaVersion !== 1) return undefined;
  return {
    schemaVersion: 1,
    categoryId: studio.categoryId,
    nicheId: studio.nicheId,
    businessType: studio.businessType,
    businessGoals: [...(studio.businessGoals || [])],
    characters: (studio.characters || []).map((c) => ({
      name: c.name,
      kind: c.kind,
      appearance: c.appearance,
      style: c.style,
      wardrobe: c.wardrobe,
      expressions: c.expressions,
      consistencyRules: c.consistencyRules,
    })),
  };
}
export function importBrandStudio(
  raw: unknown,
): BrandStudioProfile | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const input = raw as Record<string, unknown>;
  const text = (value: unknown, max: number) =>
    typeof value === "string" ? value.trim().slice(0, max) : "";
  const categoryId = text(input.categoryId, 120),
    nicheId = text(input.nicheId, 160),
    category = BRAND_TAXONOMY.find((c) => c.id === categoryId);
  if (
    input.schemaVersion !== 1 ||
    !category?.niches.some((n) => n.id === nicheId)
  )
    return undefined;
  const characters = (Array.isArray(input.characters) ? input.characters : [])
    .slice(0, 24)
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const c = item as Record<string, unknown>,
        name = text(c.name, 120);
      if (
        !name ||
        !["human-model", "mascot", "fictional-character"].includes(
          String(c.kind),
        )
      )
        return [];
      const profile = newBrandCharacter();
      return [
        {
          ...profile,
          name,
          kind: c.kind as typeof profile.kind,
          appearance: text(c.appearance, 1500),
          style: text(c.style, 1000),
          wardrobe: text(c.wardrobe, 1000),
          expressions: text(c.expressions, 1000),
          consistencyRules: text(c.consistencyRules, 2000),
        },
      ];
    });
  return {
    schemaVersion: 1,
    categoryId,
    nicheId,
    businessType: text(input.businessType, 120),
    businessGoals: (Array.isArray(input.businessGoals)
      ? input.businessGoals
      : []
    )
      .filter((v): v is string => typeof v === "string")
      .slice(0, 8)
      .map((v) => v.slice(0, 120)),
    identityApproved: false,
    guidelinesApproved: false,
    characters,
  };
}
