import type { ContentPlanItem } from "../types";
import { safeSessionStorage } from "./safeStorage";

export const RENEW_WEEK_PLAN_KEY = "renewing_week_plan";
export const NICHE_CHANGE_FROM_STUDIO_KEY = "nxclip_niche_change_from_studio";
/** Profile / legacy revise — user will re-answer category + all coach questions. */
export const REVISE_ONBOARDING_KEY = "revising_onboarding";

export type WeekPlanDay = {
  day: string;
  icon: string;
  contentType: string;
  theme: string;
  title?: string;
  hook?: string;
};

export type NormalizedWeekPlan = {
  introMessage?: string;
  days: WeekPlanDay[];
  recommendedHashtags?: string[];
  motivationalQuote?: string;
  category?: string;
  categoryLabel?: string;
  niches?: string[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function normalizeDay(raw: unknown, index: number): WeekPlanDay | null {
  const d = asRecord(raw);
  if (!d) return null;
  const day = String(d.day ?? `Day ${index + 1}`);
  const theme = String(d.theme ?? d.title ?? "").trim();
  const title = d.title != null ? String(d.title) : undefined;
  const hook = d.hook != null ? String(d.hook) : d.tip != null ? String(d.tip) : undefined;
  const contentType = String(d.contentType ?? d.type ?? "Clip");
  const icon = String(d.icon ?? "✨");
  if (!theme && !title) return null;
  return {
    day,
    icon,
    contentType,
    theme: theme || title || "",
    title,
    hook,
  };
}

/** Parse persisted `onboardingPlan` JSON (or already-normalized plan) into a display model. */
export function normalizeWeekPlan(plan: unknown): NormalizedWeekPlan | null {
  const root = asRecord(plan);
  if (!root) return null;

  const nested = asRecord(root.plan);
  const daysRaw = Array.isArray(root.days)
    ? root.days
    : Array.isArray(nested?.days)
      ? nested!.days
      : null;

  if (!daysRaw || daysRaw.length === 0) return null;

  const days = daysRaw
    .map((item, i) => normalizeDay(item, i))
    .filter((d): d is WeekPlanDay => Boolean(d));

  if (days.length === 0) return null;

  const workspace = asRecord(root.workspaceTheme) ?? asRecord(nested?.workspaceTheme);
  const nichesRaw = Array.isArray(root.niches)
    ? root.niches
    : Array.isArray(nested?.niches)
      ? nested!.niches
      : [];

  return {
    introMessage:
      (typeof root.introMessage === "string" && root.introMessage) ||
      (typeof nested?.introMessage === "string" && (nested.introMessage as string)) ||
      undefined,
    days,
    recommendedHashtags: Array.isArray(root.recommendedHashtags)
      ? (root.recommendedHashtags as string[])
      : Array.isArray(nested?.recommendedHashtags)
        ? (nested!.recommendedHashtags as string[])
        : undefined,
    motivationalQuote:
      typeof workspace?.motivationalQuote === "string"
        ? workspace.motivationalQuote
        : undefined,
    category:
      (typeof root.category === "string" && root.category) ||
      (typeof nested?.category === "string" && (nested.category as string)) ||
      undefined,
    categoryLabel:
      (typeof root.categoryLabel === "string" && root.categoryLabel) ||
      (typeof nested?.categoryLabel === "string" && (nested.categoryLabel as string)) ||
      undefined,
    niches: nichesRaw.map((n) => String(n).trim()).filter(Boolean),
  };
}

/** Suggested studio route for a plan day content type. */
export function inferCreationType(contentType: string): "image" | "meme" | "clip" {
  const t = contentType.toLowerCase();
  if (t.includes("meme")) return "meme";
  if (t.includes("image") || t.includes("photo") || t.includes("still") || t.includes("carousel")) {
    return "image";
  }
  return "clip";
}

/**
 * Clips in nxClip are usually image → animate → Clip Studio.
 * Only explicit upload / recorded-footage briefs skip Image Studio.
 */
export function inferClipCreationPath(day: WeekPlanDay): "image_first" | "upload" {
  const blob = `${day.contentType} ${day.title || ""} ${day.theme} ${day.hook || ""}`.toLowerCase();
  if (
    blob.includes("upload") ||
    blob.includes("gameplay") ||
    blob.includes("raw footage") ||
    blob.includes("screen record") ||
    blob.includes("screen capture") ||
    blob.includes("your footage") ||
    blob.includes("your clip") ||
    blob.includes("recorded")
  ) {
    return "upload";
  }
  return "image_first";
}

/** Short niche focus for UI copy (category or top sub-niches). */
export function nicheFocusLabel(
  categoryLabel?: string | null,
  niches?: string[] | null,
): string {
  const cleaned = (niches || []).map((n) => String(n).trim()).filter(Boolean);
  if (cleaned.length) return cleaned.slice(0, 2).join(" / ");
  const label = categoryLabel?.trim();
  return label || "your niche";
}

function nicheBlob(categoryLabel?: string | null, niches?: string[] | null): string {
  return `${categoryLabel || ""} ${(niches || []).join(" ")}`.toLowerCase();
}

export function isGamingNiche(
  categoryLabel?: string | null,
  niches?: string[] | null,
): boolean {
  return /\bgaming\b|\bgameplay\b|\besports\b|\bgamer\b/.test(nicheBlob(categoryLabel, niches));
}

/**
 * Niche-aware phrase for “already have recorded video” messaging.
 * Gaming keeps “gameplay”; other niches use their category/sub-niches.
 */
export function recordedFootagePhrase(
  categoryLabel?: string | null,
  niches?: string[] | null,
): string {
  if (isGamingNiche(categoryLabel, niches)) return "raw gameplay footage";
  const blob = nicheBlob(categoryLabel, niches);
  if (/\btravel\b|\badventure\b/.test(blob)) return "recorded travel footage";
  if (/\bfood\b|\bcook\b|\bculinary\b|\bdining\b|\brecipe\b/.test(blob)) {
    return "recorded kitchen or food footage";
  }
  if (/\bfitness\b|\bwellness\b|\bworkout\b/.test(blob)) {
    return "recorded workout or training footage";
  }
  if (/\bbeauty\b|\bmakeup\b|\bskincare\b/.test(blob)) {
    return "recorded beauty or tutorial footage";
  }
  if (/\bfashion\b|\bstyle\b/.test(blob)) return "recorded fashion or styling footage";
  if (/\bfinance\b|\bmoney\b|\binvest\b/.test(blob)) {
    return "recorded explainer or screen footage";
  }
  if (/\beducation\b|\blearn\b|\btutor/.test(blob)) {
    return "recorded lesson or screen footage";
  }
  if (/\btech\b|\bsaas\b|\bgadget\b/.test(blob)) {
    return "recorded demo or review footage";
  }
  if (/\bai content\b|\bai art\b|\bdigital creator\b|\bentertainment\b/.test(blob)) {
    return "recorded creator footage";
  }
  return `recorded ${nicheFocusLabel(categoryLabel, niches)} footage`;
}

export function clipImageFirstBannerCopy(
  categoryLabel?: string | null,
  niches?: string[] | null,
): { title: string; body: string } {
  const focus = nicheFocusLabel(categoryLabel, niches);
  const footage = recordedFootagePhrase(categoryLabel, niches);
  return {
    title: `Week plan · Clip · ${focus}`,
    body: `Generate your 9:16 base image below, then open Animate → Clip Studio to turn it into the short. Uploading a video is only needed when you already have ${footage}.`,
  };
}

export function planDayCtaLabel(
  day: WeekPlanDay,
  context?: {
    hasStill?: boolean;
    hasClipNeedingPolish?: boolean;
    animateFailed?: boolean;
    userPlan?: "FREE" | "PRO" | "STUDIO" | string;
  },
): string {
  const kind = inferCreationType(day.contentType);
  if (kind === "clip") {
    if (context?.animateFailed) return "Retry animation";
    if (context?.hasClipNeedingPolish) return "Polish & render";
    if (context?.hasStill) {
      const plan = String(context.userPlan || "FREE").toUpperCase();
      return plan === "FREE" ? "Animate clip" : "Animate with AI";
    }
    return inferClipCreationPath(day) === "upload" ? "Upload clip" : "Create base image";
  }
  if (kind === "meme") return "Generate meme";
  return "Generate image";
}

export function planDayWorkflowHint(
  day: WeekPlanDay,
  categoryLabel?: string | null,
  niches?: string[] | null,
): string {
  const kind = inferCreationType(day.contentType);
  if (kind === "clip" && inferClipCreationPath(day) === "image_first") {
    return "Step 1: generate a 9:16 still here → Step 2: Animate → Clip Studio to polish & publish.";
  }
  if (kind === "clip") {
    return `Upload your ${recordedFootagePhrase(categoryLabel, niches)}, then trim and polish in Clip Studio.`;
  }
  if (kind === "meme") {
    return `Generate a ${nicheFocusLabel(categoryLabel, niches)} meme from the coach brief in Image Studio.`;
  }
  return `Generate a ${nicheFocusLabel(categoryLabel, niches)} still from the coach brief in Image Studio.`;
}

export function studioRouteForPlanDay(day: WeekPlanDay | null | undefined): string {
  if (!day) return "/create";
  const kind = inferCreationType(day.contentType);
  if (kind === "meme") return "/create/image?mode=meme";
  if (kind === "image") return "/create/image";
  if (inferClipCreationPath(day) === "upload") return "/create/clip";
  return "/create/image";
}

/** Coach brief for a specific plan day (Image / Clip / Meme Studio). */
export function buildPlanDayPrompt(
  day: WeekPlanDay,
  categoryLabel?: string | null,
  niches?: string[],
): string {
  const parts = [
    day.title || day.theme,
    day.hook,
    categoryLabel ? `Category: ${categoryLabel}` : "",
    niches?.length ? `Focus: ${niches.slice(0, 3).join(", ")}` : "",
  ].filter(Boolean);
  return parts.join(" — ");
}

/** Deep-link into the right studio with prompt + planDay tracking. */
export function buildStudioHrefForPlanDay(
  day: WeekPlanDay,
  categoryLabel?: string | null,
  niches?: string[],
): string {
  const kind = inferCreationType(day.contentType);
  const params = new URLSearchParams();
  params.set("prompt", buildPlanDayPrompt(day, categoryLabel, niches));
  params.set("planDay", day.day);
  if (kind === "meme") {
    params.set("type", "meme");
    return `/create/image?${params.toString()}`;
  }
  if (kind === "image") {
    return `/create/image?${params.toString()}`;
  }
  if (inferClipCreationPath(day) === "upload") {
    return `/create/clip?${params.toString()}`;
  }
  params.set("forClip", "1");
  params.set("ratio", "9:16");
  return `/create/image?${params.toString()}`;
}

export function normalizePlanDayKey(day: string): string {
  return day.trim().toLowerCase();
}

export function planDayIndex(dayName: string, days: WeekPlanDay[]): number {
  const key = normalizePlanDayKey(dayName);
  return days.findIndex((d) => {
    const name = normalizePlanDayKey(d.day);
    return name === key || name.startsWith(key.slice(0, 3)) || key.startsWith(name.slice(0, 3));
  });
}

/** Map coach plan days into Redux `contentPlan` (Profile / legacy consumers). */
export function contentPlanFromOnboarding(plan: unknown): ContentPlanItem[] | undefined {
  const normalized = normalizeWeekPlan(plan);
  if (!normalized) return undefined;
  return normalized.days.map((d) => ({
    day: d.day,
    type: inferCreationType(d.contentType),
    contentType: d.contentType,
    theme: d.theme,
    title: d.title || d.theme,
    tip: d.hook,
    hook: d.hook,
    icon: d.icon,
    description: d.hook || d.theme,
  }));
}

/** Resolve week plan from profile fields (`onboardingPlan` preferred). */
export function weekPlanFromProfile(profile: {
  onboardingPlan?: unknown;
  contentPlan?: ContentPlanItem[] | null;
  creatorCategory?: string | null;
  creatorCategoryLabel?: string | null;
  creatorNiches?: string[] | null;
} | null | undefined): NormalizedWeekPlan | null {
  if (!profile) return null;
  let rawPlan = profile.onboardingPlan;
  if (typeof rawPlan === "string") {
    try {
      rawPlan = JSON.parse(rawPlan);
    } catch {
      rawPlan = null;
    }
  }
  const fromOnboarding = normalizeWeekPlan(rawPlan);
  if (fromOnboarding) {
    return {
      ...fromOnboarding,
      category: fromOnboarding.category || profile.creatorCategory || undefined,
      categoryLabel:
        fromOnboarding.categoryLabel ||
        profile.creatorCategoryLabel ||
        profile.creatorCategory ||
        undefined,
      niches: fromOnboarding.niches?.length
        ? fromOnboarding.niches
        : profile.creatorNiches || undefined,
    };
  }
  if (profile.contentPlan?.length) {
    return normalizeWeekPlan({
      days: profile.contentPlan,
      category: profile.creatorCategory,
      categoryLabel: profile.creatorCategoryLabel,
      niches: profile.creatorNiches,
    });
  }
  return null;
}

/** Local weekday name matching coach plan days (Monday…Sunday). */
export function todayWeekdayLong(date = new Date()): string {
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

/** Find today's due plan item (weekday match). */
export function findDuePlanDay(
  plan: NormalizedWeekPlan | null | undefined,
  date = new Date(),
): WeekPlanDay | null {
  if (!plan?.days?.length) return null;
  const today = todayWeekdayLong(date).toLowerCase();
  const short = today.slice(0, 3);
  return (
    plan.days.find((d) => {
      const name = String(d.day).toLowerCase();
      return name === today || name.startsWith(short) || name.includes(today);
    }) || null
  );
}

/** Allow completed users to re-enter coach onboarding for a fresh week. */
export function beginWeekPlanRenewal(): void {
  safeSessionStorage.setItem(RENEW_WEEK_PLAN_KEY, "true");
  safeSessionStorage.removeItem("finishing_onboarding");
}

/** Re-run Creator Coach to revise category, niches, and Q2–Q5 answers (then regenerate plan). */
export function beginOnboardingRevision(): void {
  beginWeekPlanRenewal();
  safeSessionStorage.setItem(REVISE_ONBOARDING_KEY, "true");
}

export function clearWeekPlanRenewal(): void {
  safeSessionStorage.removeItem(RENEW_WEEK_PLAN_KEY);
  safeSessionStorage.removeItem(REVISE_ONBOARDING_KEY);
}

export function isRenewingWeekPlan(): boolean {
  return safeSessionStorage.getItem(RENEW_WEEK_PLAN_KEY) === "true";
}

export function isRevisingOnboarding(): boolean {
  return safeSessionStorage.getItem(REVISE_ONBOARDING_KEY) === "true";
}

export function beginNicheChangeFromStudio(source: "image" | "meme" | "clip"): void {
  beginOnboardingRevision();
  safeSessionStorage.setItem(NICHE_CHANGE_FROM_STUDIO_KEY, source);
}

export function clearNicheChangeFromStudio(): void {
  safeSessionStorage.removeItem(NICHE_CHANGE_FROM_STUDIO_KEY);
}

export function nicheChangeFromStudio(): string | null {
  return safeSessionStorage.getItem(NICHE_CHANGE_FROM_STUDIO_KEY);
}
