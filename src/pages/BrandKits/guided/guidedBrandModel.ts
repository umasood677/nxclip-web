import { CREATOR_CATEGORY_NICHES } from "../../../lib/creatorNiches";
import snapshot from "./taxonomy.snapshot.json";
import type {
  BrandKitSummary,
  BrandColorEntry,
  BrandTypographyEntry,
  BrandVoiceFields,
} from "../lib/brandKitTypes";
export const BRAND_TAXONOMY = CREATOR_CATEGORY_NICHES.map((category) => {
  const seed =
    snapshot.categories.find((c) => c.category === category.category)?.niches ||
    [];
  return {
    id: category.category,
    label: category.label,
    niches: [
      ...seed,
      ...category.suggestions
        .filter((n) => !seed.some((s) => s.label === n))
        .map((n) => ({ id: n, label: n })),
    ],
  };
});
export const BRAND_GOALS = [
  "Increase awareness",
  "Launch a product",
  "Generate leads",
  "Increase sales",
  "Promote an event",
  "Build a community",
  "Introduce a service",
] as const;
export const BRAND_PERSONALITIES = [
  "Premium",
  "Professional",
  "Playful",
  "Bold",
  "Minimal",
  "Energetic",
] as const;
export const GUIDED_STEPS = [
  "brand",
  "category",
  "goals",
  "assets",
  "identity",
  "guidelines",
  "ready",
] as const;
export type GuidedStep = (typeof GUIDED_STEPS)[number];
export interface GuidedBrandDraft {
  voiceExtras?: BrandVoiceFields;
  name: string;
  description: string;
  website: string;
  businessType: string;
  categoryId: string;
  nicheId: string;
  approvedAssetIds: string[];
  goals: string[];
  personality: string;
  tone: string;
  audience: string;
  guidelines: string;
  colors: BrandColorEntry[];
  typography: BrandTypographyEntry[];
  taxonomyConfirmed: boolean;
  identityApproved: boolean;
  guidelinesApproved: boolean;
}
export function newGuidedDraft(): GuidedBrandDraft {
  return {
    name: "",
    description: "",
    website: "",
    businessType: "Retail brand",
    categoryId: "",
    nicheId: "",
    approvedAssetIds: [],
    goals: [],
    personality: "",
    tone: "",
    audience: "",
    guidelines: "",
    colors: [
      { role: "primary", hex: "#B89B72", name: "Primary" },
      { role: "secondary", hex: "#16151A", name: "Secondary" },
    ],
    typography: [
      { role: "heading", family: "Playfair Display", weight: "700" },
      { role: "body", family: "Inter", weight: "400" },
    ],
    taxonomyConfirmed: false,
    identityApproved: false,
    guidelinesApproved: false,
  };
}
export function draftFromKit(kit: BrandKitSummary): GuidedBrandDraft {
  const initial = newGuidedDraft(),
    v = kit.voice || {},
    profile = v.studio;
  return {
    ...initial,
    name: kit.name,
    description: kit.description || "",
    website: v.website || "",
    businessType: profile?.businessType || "Retail brand",
    categoryId: profile?.categoryId || "",
    nicheId: profile?.nicheId || "",
    approvedAssetIds: profile?.approvedAssetIds || [],
    goals: profile?.businessGoals || [],
    personality: v.personality || "",
    tone: v.tone || "",
    audience: v.targetAudience || "",
    guidelines: kit.guidelines || "",
    colors: kit.colors?.length
      ? kit.colors.map((c) => ({ ...c }))
      : initial.colors,
    typography: kit.typography?.length
      ? kit.typography.map((t) => ({ ...t }))
      : initial.typography,
    taxonomyConfirmed: !!profile?.categoryId,
    identityApproved: profile?.identityApproved === true,
    guidelinesApproved: profile?.guidelinesApproved === true,
  };
}
export function changeGuidedCategory(
  draft: GuidedBrandDraft,
  categoryId: string,
): GuidedBrandDraft {
  return {
    ...draft,
    categoryId,
    nicheId:
      BRAND_TAXONOMY.find((c) => c.id === categoryId)?.niches[0]?.id || "",
    taxonomyConfirmed: false,
    identityApproved: false,
    guidelinesApproved: false,
  };
}
export function guidedErrors(
  draft: GuidedBrandDraft,
  complete = false,
): string[] {
  const errors: string[] = [];
  if (!draft.name.trim()) errors.push("Enter a brand name.");
  if (draft.name.trim().length > 120)
    errors.push("Brand name must be at most 120 characters.");
  if (draft.colors.some((c) => !/^#[0-9a-f]{6}$/i.test(c.hex)))
    errors.push("Review the six-digit brand colors.");
  if (draft.typography.some((t) => !t.family.trim()))
    errors.push("Choose typography for each role.");
  if (complete) {
    const category = BRAND_TAXONOMY.find((c) => c.id === draft.categoryId);
    if (
      !category?.niches.some((n) => n.id === draft.nicheId) ||
      !draft.taxonomyConfirmed
    )
      errors.push("Confirm an existing category and niche.");
    if (!draft.goals.length) errors.push("Choose a business goal.");
    if (!draft.personality.trim() || !draft.tone.trim())
      errors.push("Review brand personality and voice.");
    if (!draft.identityApproved || !draft.guidelinesApproved)
      errors.push("Approve the identity and guidelines.");
  }
  return errors;
}
export function guidedPayload(
  draft: GuidedBrandDraft,
  existing?: BrandKitSummary | null,
) {
  const voice: BrandVoiceFields = {
    ...(existing?.voice || {}),
    ...(draft.voiceExtras || {}),
    website: draft.website,
    personality: draft.personality,
    tone: draft.tone,
    targetAudience: draft.audience,
    studio: {
      ...(existing?.voice?.studio || {}),
      schemaVersion: 1,
      categoryId: draft.categoryId,
      nicheId: draft.nicheId,
      businessType: draft.businessType,
      businessGoals: [...draft.goals],
      approvedAssetIds: [...draft.approvedAssetIds],
      identityApproved: draft.identityApproved,
      guidelinesApproved: draft.guidelinesApproved,
    },
  };
  // Draft creation before taxonomy review omits the profile until it is valid.
  if (!draft.categoryId || !draft.nicheId) {
    if (existing?.voice?.studio) voice.studio = existing.voice.studio;
    else delete voice.studio;
  }
  return {
    name: draft.name.trim(),
    description: draft.description.trim(),
    guidelines: draft.guidelines,
    voice,
    colors: draft.colors.map((c) => ({
      role: c.role || "primary",
      hex: c.hex,
      name: c.name,
      sortOrder: c.sortOrder,
    })),
    typography: draft.typography.map((t) => ({
      role: t.role || "body",
      family: t.family,
      weight: t.weight,
      style: t.style,
      sortOrder: t.sortOrder,
      fallbackStack: t.fallbackStack || undefined,
      assetId: t.assetId || undefined,
    })),
  };
}
export function isGuidedBrandEnabled(
  env: Record<string, unknown> | undefined = import.meta.env,
): boolean {
  return env?.VITE_AD_STUDIO_GUIDED_BRAND_ENABLED === "true";
}
