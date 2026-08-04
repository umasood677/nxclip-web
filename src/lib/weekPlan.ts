import type { ContentPlanItem } from "../types";
import { safeSessionStorage } from "./safeStorage";

export const RENEW_WEEK_PLAN_KEY = "renewing_week_plan";

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
  };
}

/** Map coach plan days into Redux `contentPlan` (Profile / legacy consumers). */
export function contentPlanFromOnboarding(plan: unknown): ContentPlanItem[] | undefined {
  const normalized = normalizeWeekPlan(plan);
  if (!normalized) return undefined;
  return normalized.days.map((d) => ({
    day: d.day,
    type: "clip",
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
} | null | undefined): NormalizedWeekPlan | null {
  if (!profile) return null;
  const fromOnboarding = normalizeWeekPlan(profile.onboardingPlan);
  if (fromOnboarding) return fromOnboarding;
  if (profile.contentPlan?.length) {
    return normalizeWeekPlan({ days: profile.contentPlan });
  }
  return null;
}

/** Allow completed users to re-enter coach onboarding for a fresh week. */
export function beginWeekPlanRenewal(): void {
  safeSessionStorage.setItem(RENEW_WEEK_PLAN_KEY, "true");
  safeSessionStorage.removeItem("finishing_onboarding");
}

export function clearWeekPlanRenewal(): void {
  safeSessionStorage.removeItem(RENEW_WEEK_PLAN_KEY);
}

export function isRenewingWeekPlan(): boolean {
  return safeSessionStorage.getItem(RENEW_WEEK_PLAN_KEY) === "true";
}
