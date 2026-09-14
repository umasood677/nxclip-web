import type { ContentDto } from "../services/apiClient";
import { safeLocalStorage } from "./safeStorage";
import {
  buildPlanDayPrompt,
  buildStudioHrefForPlanDay,
  inferClipCreationPath,
  nicheFocusLabel,
  recordedFootagePhrase,
  inferCreationType,
  normalizePlanDayKey,
  planDayIndex,
  todayWeekdayLong,
  type NormalizedWeekPlan,
  type WeekPlanDay,
} from "./weekPlan";

const PLAN_DAY_MARKS_KEY = "nxclip_plan_day_marks";

export type PlanDayStatus = "pending" | "done";

export type PlanDayWorkflowItem = {
  day: WeekPlanDay;
  dayKey: string;
  status: PlanDayStatus;
  matchedContentId?: string;
  index: number;
};

export type PlanWorkflowSuggestion = {
  id: string;
  contentId: string;
  contentType: "image" | "meme" | "clip";
  title: string;
  thumbnailUrl?: string;
  action: string;
  headline: string;
  reason: string;
  priority: number;
  ctaLabel: string;
  href: string;
  planDay?: string;
  planDayStatus?: PlanDayStatus;
  source: "week_plan" | "asset";
};

export type WeekGoalPayload = {
  day?: string;
  contentType?: string;
  theme?: string;
  title?: string;
  hook?: string;
  path?: string;
  isToday?: boolean;
  status?: "pending" | "done";
};

function planDayMarksKey(userId: string): string {
  return `${PLAN_DAY_MARKS_KEY}:${userId}`;
}

export function getPlanDayMarks(userId: string): Record<string, string> {
  try {
    const raw = safeLocalStorage.getItem(planDayMarksKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function markPlanDayComplete(userId: string, planDay: string, contentId: string): void {
  const marks = getPlanDayMarks(userId);
  marks[normalizePlanDayKey(planDay)] = contentId;
  safeLocalStorage.setItem(planDayMarksKey(userId), JSON.stringify(marks));
}

function normalizeMatchText(value: string): string {
  return value.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

function contentHaystack(content: ContentDto): string {
  return normalizeMatchText(
    [content.prompt, content.basePrompt, content.title, content.description, content.caption]
      .filter(Boolean)
      .join(" "),
  );
}

/** Soft theme match (does not require content type). */
function contentThemeMatchesDay(content: ContentDto, day: WeekPlanDay): boolean {
  const hay = contentHaystack(content);
  if (!hay) return false;
  const needles = [day.title, day.theme, day.hook]
    .filter(Boolean)
    .map((v) => normalizeMatchText(String(v)))
    .filter((v) => v.length >= 4);
  for (const needle of needles) {
    if (hay.includes(needle)) return true;
    const words = needle.split(" ").filter((w) => w.length > 3);
    if (words.length >= 2) {
      const hits = words.filter((w) => hay.includes(w)).length;
      if (hits >= Math.ceil(words.length * 0.6)) return true;
    }
  }
  return false;
}

/** Heuristic: does existing content look like it fulfilled this plan day? */
export function contentMatchesPlanDay(content: ContentDto, day: WeekPlanDay): boolean {
  const expected = inferCreationType(day.contentType);
  const actual = (content.contentType || "").toLowerCase();
  const typeMatches =
    (expected === "meme" && actual === "meme") ||
    (expected === "image" && (actual === "image" || actual === "meme")) ||
    (expected === "clip" && actual === "clip");

  if (!typeMatches) return false;
  if (!contentThemeMatchesDay(content, day)) {
    const titleNeedle = normalizeMatchText(day.title || day.theme || "");
    const hay = contentHaystack(content);
    if (
      !(
        titleNeedle.length >= 5 &&
        hay.includes(titleNeedle.slice(0, Math.min(titleNeedle.length, 24)))
      )
    ) {
      return false;
    }
  }
  return true;
}

function findRelatedStillForClipDay(day: WeekPlanDay, content: ContentDto[]): ContentDto | undefined {
  const stills = content.filter((c) => {
    const t = (c.contentType || "").toLowerCase();
    const s = (c.status || "").toLowerCase();
    return (
      (t === "image" || t === "meme") &&
      !!c.storageKey &&
      s !== "deleted" &&
      s !== "archived" &&
      !s.includes("fail")
    );
  });
  return (
    stills.find((c) => contentThemeMatchesDay(c, day)) ||
    stills.find((c) => {
      const planDay = String((c as { planDay?: string }).planDay || "").toLowerCase();
      return planDay && planDay === normalizePlanDayKey(day.day);
    })
  );
}

function findRelatedClipForDay(day: WeekPlanDay, content: ContentDto[]): ContentDto | undefined {
  return content.find((c) => {
    const t = (c.contentType || "").toLowerCase();
    const s = (c.status || "").toLowerCase();
    return t === "clip" && s !== "deleted" && contentMatchesPlanDay(c, day);
  });
}

function clipNeedsPolish(clip: ContentDto): boolean {
  const render = String(clip.renderStatus || "").toLowerCase();
  if (render === "completed") return false;
  return !!clip.storageKey;
}

function clipAnimateFailed(clip: ContentDto): boolean {
  const animate = clip.clipEditSpec?.animate;
  return !!animate && !clip.storageKey;
}

function readClientPlan(): "FREE" | "PRO" | "STUDIO" {
  try {
    const token = safeLocalStorage.getItem("nx_access_token") || "";
    const payload = JSON.parse(atob(token.split(".")[1] || "")) as { plan?: string };
    const plan = String(payload.plan || "FREE").toUpperCase();
    if (plan === "PRO" || plan === "STUDIO") return plan;
  } catch {
    /* ignore */
  }
  return "FREE";
}

export function evaluatePlanDays(
  plan: NormalizedWeekPlan,
  content: ContentDto[],
  userId: string,
): PlanDayWorkflowItem[] {
  const marks = getPlanDayMarks(userId);
  const activeContent = content.filter((c) => {
    const s = (c.status || "").toLowerCase();
    return s !== "deleted" && s !== "archived";
  });

  return plan.days.map((day, index) => {
    const dayKey = normalizePlanDayKey(day.day);
    const markedId = marks[dayKey];
    const markedContent = markedId ? activeContent.find((c) => c.id === markedId) : undefined;
    const matched =
      markedContent ||
      activeContent.find((c) => contentMatchesPlanDay(c, day));

    return {
      day,
      dayKey,
      status: matched ? "done" : "pending",
      matchedContentId: matched?.id,
      index,
    };
  });
}

/** Compact week goals for Workflow Intelligence API. */
export function buildWeekGoalsPayload(
  plan: NormalizedWeekPlan,
  content: ContentDto[],
  userId: string,
  today?: Date,
): WeekGoalPayload[] {
  const evaluated = evaluatePlanDays(plan, content, userId);
  const todayName = todayWeekdayLong(today).toLowerCase();
  const todayIdx = planDayIndex(todayName, plan.days);
  return evaluated.map((item) => {
    const kind = inferCreationType(item.day.contentType);
    const path =
      kind === "clip"
        ? inferClipCreationPath(item.day)
        : kind === "meme"
          ? "meme"
          : "image";
    return {
      day: item.day.day,
      contentType: item.day.contentType,
      theme: item.day.theme,
      title: item.day.title,
      hook: item.day.hook,
      path,
      isToday: item.index === todayIdx,
      status: item.status,
    };
  });
}

export function buildPlanWorkflowSuggestions(
  plan: NormalizedWeekPlan,
  content: ContentDto[],
  userId: string,
  options: {
    categoryLabel?: string | null;
    niches?: string[];
    today?: Date;
    userPlan?: "FREE" | "PRO" | "STUDIO";
  } = {},
): PlanWorkflowSuggestion[] {
  const evaluated = evaluatePlanDays(plan, content, userId);
  const pending = evaluated.filter((e) => e.status === "pending");
  const today = todayWeekdayLong(options.today).toLowerCase();
  const todayIdx = planDayIndex(today, plan.days);
  const planTier = options.userPlan || readClientPlan();
  const activeContent = content.filter((c) => {
    const s = (c.status || "").toLowerCase();
    return s !== "deleted" && s !== "archived";
  });

  const suggestions: PlanWorkflowSuggestion[] = pending.map((item) => {
    const kind = inferCreationType(item.day.contentType);
    const clipPath = kind === "clip" ? inferClipCreationPath(item.day) : null;
    const isToday = item.index === todayIdx;
    const prompt = buildPlanDayPrompt(item.day, options.categoryLabel, options.niches);
    const baseHref = buildStudioHrefForPlanDay(item.day, options.categoryLabel, options.niches);
    const focus = nicheFocusLabel(options.categoryLabel, options.niches);

    // Adaptive clip pipeline: still → animate → polish (not always "Create base image")
    if (kind === "clip" && clipPath === "image_first") {
      const relatedClip = findRelatedClipForDay(item.day, activeContent);
      if (relatedClip && clipAnimateFailed(relatedClip)) {
        return {
          id: `plan-${item.dayKey}`,
          contentId: relatedClip.id,
          contentType: "clip",
          title: item.day.title || item.day.theme,
          thumbnailUrl: relatedClip.thumbnailUrl || relatedClip.cdnUrl,
          action: "open_studio",
          headline: `${item.day.day}: Retry animation`,
          reason: `Animation for “${item.day.title || item.day.theme}” failed — retry from Clip Studio, then polish.`,
          priority: isToday ? 100 : 88 - item.index,
          ctaLabel: "Retry animation",
          href: `/create/clip/${relatedClip.id}/edit?step=polish&retryAnimate=1`,
          planDay: item.day.day,
          planDayStatus: "pending",
          source: "week_plan",
        };
      }
      if (relatedClip && clipNeedsPolish(relatedClip)) {
        return {
          id: `plan-${item.dayKey}`,
          contentId: relatedClip.id,
          contentType: "clip",
          title: item.day.title || item.day.theme,
          thumbnailUrl: relatedClip.thumbnailUrl || relatedClip.cdnUrl,
          action: "polish_render",
          headline: `${item.day.day}: Polish your clip`,
          reason: `You already have motion for “${item.day.title || item.day.theme}”. Add hooks/captions and render the MP4.`,
          priority: isToday ? 100 : 90 - item.index,
          ctaLabel: "Polish & render",
          href: `/create/clip/${relatedClip.id}/edit?step=polish`,
          planDay: item.day.day,
          planDayStatus: "pending",
          source: "week_plan",
        };
      }

      const still = findRelatedStillForClipDay(item.day, activeContent);
      if (still) {
        const useI2v = planTier !== "FREE";
        return {
          id: `plan-${item.dayKey}`,
          contentId: still.id,
          contentType: (still.contentType as "image" | "meme") || "image",
          title: item.day.title || item.day.theme,
          thumbnailUrl: still.thumbnailUrl || still.cdnUrl || still.imageUrl,
          action: useI2v ? "animate_i2v" : "animate_ken_burns",
          headline: `${item.day.day}: Animate your base image`,
          reason: useI2v
            ? `Base still ready for “${item.day.title || item.day.theme}”. Run AI motion → Clip Studio to finish the short.`
            : `Base still ready for “${item.day.title || item.day.theme}”. Use Ken Burns → Clip Studio (AI motion needs Pro/Studio).`,
          priority: isToday ? 100 : 92 - item.index,
          ctaLabel: useI2v ? "Animate with AI" : "Animate clip",
          href: `/create/image?editId=${still.id}&suggest=${useI2v ? "animate_i2v" : "animate_ken_burns"}&forClip=1&planDay=${encodeURIComponent(item.day.day)}`,
          planDay: item.day.day,
          planDayStatus: "pending",
          source: "week_plan",
        };
      }

      return {
        id: `plan-${item.dayKey}`,
        contentId: "",
        contentType: "image",
        title: item.day.title || item.day.theme,
        action: "week_plan",
        headline: `${item.day.day}: Create base image`,
        reason: `${item.day.contentType} for ${focus} — generate a 9:16 still first, then Animate → Clip Studio. ${prompt}`,
        priority: isToday ? 100 : 80 - item.index,
        ctaLabel: "Create base image",
        href: baseHref,
        planDay: item.day.day,
        planDayStatus: "pending",
        source: "week_plan",
      };
    }

    if (kind === "clip" && clipPath === "upload") {
      return {
        id: `plan-${item.dayKey}`,
        contentId: "",
        contentType: "clip",
        title: item.day.title || item.day.theme,
        action: "week_plan",
        headline: `${item.day.day}: ${item.day.title || item.day.theme}`,
        reason: `${item.day.contentType} — upload ${recordedFootagePhrase(options.categoryLabel, options.niches)}, then polish in Clip Studio. ${prompt}`,
        priority: isToday ? 100 : 80 - item.index,
        ctaLabel: "Upload clip",
        href: baseHref,
        planDay: item.day.day,
        planDayStatus: "pending",
        source: "week_plan",
      };
    }

    return {
      id: `plan-${item.dayKey}`,
      contentId: "",
      contentType: kind,
      title: item.day.title || item.day.theme,
      action: "week_plan",
      headline: `${item.day.day}: ${item.day.title || item.day.theme}`,
      reason: `${item.day.contentType} — ${item.day.hook || item.day.theme}. ${prompt}`,
      priority: isToday ? 100 : 80 - item.index,
      ctaLabel: kind === "meme" ? "Generate meme" : "Generate in Image Studio",
      href: baseHref,
      planDay: item.day.day,
      planDayStatus: "pending",
      source: "week_plan",
    };
  });

  // Secondary nudge: done days whose clip still needs polish
  for (const item of evaluated.filter((e) => e.status === "done")) {
    if (inferCreationType(item.day.contentType) !== "clip") continue;
    const clip =
      (item.matchedContentId &&
        activeContent.find((c) => c.id === item.matchedContentId && (c.contentType || "").toLowerCase() === "clip")) ||
      findRelatedClipForDay(item.day, activeContent);
    if (!clip) continue;
    if (clipAnimateFailed(clip)) {
      suggestions.push({
        id: `plan-resume-${item.dayKey}`,
        contentId: clip.id,
        contentType: "clip",
        title: item.day.title || item.day.theme,
        thumbnailUrl: clip.thumbnailUrl || clip.cdnUrl,
        action: "open_studio",
        headline: `${item.day.day}: Finish failed clip`,
        reason: "Animation did not complete — retry so this plan day actually ships.",
        priority: item.index === todayIdx ? 97 : 70,
        ctaLabel: "Retry animation",
        href: `/create/clip/${clip.id}/edit?step=polish&retryAnimate=1`,
        planDay: item.day.day,
        planDayStatus: "done",
        source: "week_plan",
      });
    } else if (clipNeedsPolish(clip)) {
      suggestions.push({
        id: `plan-polish-${item.dayKey}`,
        contentId: clip.id,
        contentType: "clip",
        title: item.day.title || item.day.theme,
        thumbnailUrl: clip.thumbnailUrl || clip.cdnUrl,
        action: "polish_render",
        headline: `${item.day.day}: Finish polish`,
        reason: "Clip exists for this plan day — add hooks/captions and render before Go Live.",
        priority: item.index === todayIdx ? 96 : 68,
        ctaLabel: "Polish & render",
        href: `/create/clip/${clip.id}/edit?step=polish`,
        planDay: item.day.day,
        planDayStatus: "done",
        source: "week_plan",
      });
    }
  }

  if (pending.length === 0 && evaluated.length > 0) {
    const unfinished = suggestions.some((s) => s.action === "polish_render" || s.action === "open_studio");
    if (!unfinished) {
      suggestions.push({
        id: "plan-renew",
        contentId: "",
        contentType: "image",
        title: "New week plan",
        action: "renew_plan",
        headline: "Week plan complete",
        reason:
          "You already generated content for every day in this plan. Plan a new week for fresh themes and hooks.",
        priority: 95,
        ctaLabel: "Plan a new week",
        href: "/onboarding",
        source: "week_plan",
      });
    }
  }

  return suggestions.sort((a, b) => b.priority - a.priority);
}

export function mergeWorkflowSuggestions(
  planSuggestions: PlanWorkflowSuggestion[],
  assetSuggestions: PlanWorkflowSuggestion[],
  limit = 12,
): PlanWorkflowSuggestion[] {
  const planPending = planSuggestions.filter(
    (s) => s.action !== "renew_plan" && (s.planDayStatus !== "done" || s.action === "polish_render" || s.action === "open_studio"),
  );
  const planRenew = planSuggestions.filter((s) => s.action === "renew_plan");
  const merged = [
    ...planPending,
    ...planRenew,
    ...assetSuggestions.map((s) => ({ ...s, source: "asset" as const })),
  ];
  const seen = new Set<string>();
  const out: PlanWorkflowSuggestion[] = [];
  for (const item of merged) {
    const key = item.id || `${item.action}-${item.contentId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}
