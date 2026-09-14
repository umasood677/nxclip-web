import type { UserProfile } from "../types";
import { weekPlanFromProfile, type NormalizedWeekPlan } from "./weekPlan";

export type OnboardingAnswerRow = {
  key: string;
  label: string;
  value: string;
};

export type OnboardingSnapshot = {
  category?: string;
  categoryLabel?: string;
  niches: string[];
  audience?: string;
  goal?: string;
  frequency?: string;
  startPoint?: string;
  rows: OnboardingAnswerRow[];
  /** True when a week plan exists but category/niches/Q2–Q5 are incomplete. */
  isLegacy: boolean;
  /** True when a coach week plan (days) is present. */
  hasWeekPlan: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function stringifyAnswer(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean).join(", ");
  }
  if (value == null) return "";
  return String(value).trim();
}

function planRoot(plan: unknown): Record<string, unknown> | null {
  const root = asRecord(plan);
  if (!root) return null;
  const nested = asRecord(root.plan);
  return nested ?? root;
}

const KNOWN_CATEGORY_SLUGS: Record<string, string> = {
  gaming: "Gaming",
  general: "General",
  travel: "Travel",
  food: "Food",
  cooking: "Cooking",
  "quiet-luxury-minimalism": "Quiet Luxury",
  "gourmet-culinary-aesthetics": "Gourmet Culinary",
  "fashion-personal-styling": "Fashion & Styling",
  "interior-spatial-design": "Interior Design",
  "futuristic-digital-lifestyle": "Digital Lifestyle",
  "digital-ai-futurism": "Digital Lifestyle",
  "digital-creator": "Digital Creator",
  "ai-content": "AI Content",
  "tech-saas": "Tech & SaaS",
  "fitness-wellness": "Fitness",
  "beauty-skincare": "Beauty",
  "finance-business": "Finance",
  "education-how-to": "Education",
  "entertainment-culture": "Entertainment",
};

/** Best-effort category from older plans that only stored days + hashtags/intro. */
function inferCategoryLabel(
  week: NormalizedWeekPlan | null,
  plan: Record<string, unknown> | null,
): string | undefined {
  const direct =
    week?.categoryLabel ||
    week?.category ||
    stringifyAnswer(plan?.categoryLabel) ||
    stringifyAnswer(plan?.category);
  if (direct) {
    const slug = direct.toLowerCase();
    return KNOWN_CATEGORY_SLUGS[slug] || direct;
  }

  const intro = week?.introMessage || stringifyAnswer(plan?.introMessage);
  const introMatch = intro.match(/your first\s+(.+?)\s+week/i);
  if (introMatch?.[1]) return introMatch[1].trim();

  const tags = (
    Array.isArray(week?.recommendedHashtags)
      ? week!.recommendedHashtags!
      : Array.isArray(plan?.recommendedHashtags)
        ? (plan!.recommendedHashtags as unknown[])
        : []
  )
    .map((t) => String(t).replace(/^#/, "").trim().toLowerCase())
    .filter(Boolean);

  for (const tag of tags) {
    if (KNOWN_CATEGORY_SLUGS[tag]) return KNOWN_CATEGORY_SLUGS[tag];
  }

  return undefined;
}

function collectNiches(
  week: NormalizedWeekPlan | null,
  plan: Record<string, unknown> | null,
  profile: UserProfile,
): string[] {
  const fromWeek = week?.niches?.length ? week.niches : [];
  if (fromWeek.length) return fromWeek.filter(Boolean);

  const fromProfile = profile.creatorNiches?.length
    ? profile.creatorNiches
    : profile.gameNiches?.length
      ? profile.gameNiches
      : profile.games || [];
  if (fromProfile.length) return fromProfile.filter(Boolean);

  const alt =
    plan?.niches ??
    plan?.games ??
    plan?.gameNiches ??
    plan?.subNiches ??
    plan?.sub_niches;
  if (Array.isArray(alt)) {
    return alt.map(String).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof alt === "string" && alt.trim()) {
    return alt.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/** Pull category, sub-niches, and Q2–Q5 answers from the saved coach plan + profile. */
export function onboardingSnapshotFromProfile(
  profile: UserProfile | null | undefined,
): OnboardingSnapshot | null {
  if (!profile) return null;
  const week = weekPlanFromProfile(profile);
  const plan = planRoot(profile.onboardingPlan);
  const answersRaw = asRecord(plan?.onboardingAnswers) ?? asRecord(plan?.answers);

  const niches = collectNiches(week, plan, profile);
  const categoryLabel =
    inferCategoryLabel(week, plan) ||
    profile.creatorCategoryLabel ||
    profile.creatorCategory ||
    undefined;

  const audience =
    stringifyAnswer(plan?.audience) ||
    stringifyAnswer(answersRaw?.[2] ?? answersRaw?.["2"]) ||
    profile.audience ||
    "";
  const goal =
    stringifyAnswer(plan?.goal) ||
    stringifyAnswer(answersRaw?.[3] ?? answersRaw?.["3"]) ||
    profile.goal ||
    "";
  const frequency =
    stringifyAnswer(plan?.frequency) ||
    stringifyAnswer(answersRaw?.[4] ?? answersRaw?.["4"]) ||
    profile.frequency ||
    "";
  const startPoint =
    stringifyAnswer(plan?.startPoint) ||
    stringifyAnswer(answersRaw?.[5] ?? answersRaw?.["5"]) ||
    profile.startPoint ||
    "";

  const hasWeekPlan = Boolean(week?.days?.length);
  const hasFullAnswers = Boolean(audience || goal || frequency || startPoint);
  const hasNicheMeta = Boolean(categoryLabel || niches.length);
  const hasAnything = Boolean(hasWeekPlan || hasNicheMeta || hasFullAnswers);
  if (!hasAnything) return null;

  const isLegacy = hasWeekPlan && (!hasNicheMeta || !hasFullAnswers);

  const rows: OnboardingAnswerRow[] = [];
  if (categoryLabel) {
    rows.push({ key: "category", label: "Category", value: categoryLabel });
  }
  if (niches.length) {
    rows.push({ key: "niches", label: "Niches", value: niches.join(", ") });
  }
  if (audience) rows.push({ key: "audience", label: "Audience", value: audience });
  if (goal) rows.push({ key: "goal", label: "Goal", value: goal });
  if (frequency) rows.push({ key: "frequency", label: "Posting rhythm", value: frequency });
  if (startPoint) rows.push({ key: "start", label: "Starting point", value: startPoint });

  return {
    category: week?.category || profile.creatorCategory || undefined,
    categoryLabel,
    niches,
    audience: audience || undefined,
    goal: goal || undefined,
    frequency: frequency || undefined,
    startPoint: startPoint || undefined,
    rows,
    isLegacy,
    hasWeekPlan,
  };
}

/** Creator fields from GET /auth/me (handles PascalCase from .NET). */
export function creatorFieldsFromIdentityMe(me: Record<string, unknown> | null | undefined): {
  creatorCategory: string | null;
  creatorCategoryLabel: string | null;
  creatorNiches: string[];
  onboardingPlan: Record<string, unknown> | null;
} {
  if (!me) {
    return {
      creatorCategory: null,
      creatorCategoryLabel: null,
      creatorNiches: [],
      onboardingPlan: null,
    };
  }
  const niches = me.creatorNiches ?? me.CreatorNiches;
  let onboardingPlan = (me.onboardingPlan ?? me.OnboardingPlan ?? null) as
    | Record<string, unknown>
    | string
    | null;

  // Some gateways double-encode JSONB as a string.
  if (typeof onboardingPlan === "string") {
    try {
      onboardingPlan = JSON.parse(onboardingPlan) as Record<string, unknown>;
    } catch {
      onboardingPlan = null;
    }
  }

  return {
    creatorCategory: (me.creatorCategory ?? me.CreatorCategory ?? null) as string | null,
    creatorCategoryLabel: (me.creatorCategoryLabel ?? me.CreatorCategoryLabel ?? null) as
      | string
      | null,
    creatorNiches: Array.isArray(niches) ? niches.map(String).filter(Boolean) : [],
    onboardingPlan: asRecord(onboardingPlan),
  };
}
