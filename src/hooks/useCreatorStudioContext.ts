import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../store/hooks";
import { selectAuthProfile } from "../store/slices/authSlice";
import {
  beginNicheChangeFromStudio,
  findDuePlanDay,
  weekPlanFromProfile,
  type NormalizedWeekPlan,
  type WeekPlanDay,
} from "../lib/weekPlan";

export type StudioTool = "image" | "meme" | "clip";

export function useCreatorStudioContext(tool: StudioTool) {
  const profile = useAppSelector(selectAuthProfile);
  const navigate = useNavigate();
  const [nicheDialogOpen, setNicheDialogOpen] = useState(false);

  const weekPlan: NormalizedWeekPlan | null = useMemo(
    () => weekPlanFromProfile(profile),
    [profile],
  );

  const dueToday: WeekPlanDay | null = useMemo(
    () => findDuePlanDay(weekPlan),
    [weekPlan],
  );

  const categoryLabel =
    weekPlan?.categoryLabel ||
    profile?.creatorCategoryLabel ||
    profile?.creatorCategory ||
    null;

  const niches = weekPlan?.niches?.length
    ? weekPlan.niches
    : profile?.creatorNiches || [];

  const applyDuePrompt = useCallback(() => {
    if (!dueToday) return "";
    const parts = [
      dueToday.title || dueToday.theme,
      dueToday.hook,
      categoryLabel ? `Niche: ${categoryLabel}` : "",
      niches.length ? `Focus: ${niches.slice(0, 3).join(", ")}` : "",
    ].filter(Boolean);
    return parts.join(" — ");
  }, [dueToday, categoryLabel, niches]);

  const confirmNicheChange = useCallback(() => {
    beginNicheChangeFromStudio(tool);
    setNicheDialogOpen(false);
    // Pass state so App route cannot bounce completed users to /feed if sessionStorage lags.
    navigate("/onboarding", {
      state: { renewWeekPlan: true, fromStudio: tool },
    });
  }, [navigate, tool]);

  return {
    profile,
    weekPlan,
    dueToday,
    categoryLabel,
    niches,
    nicheDialogOpen,
    setNicheDialogOpen,
    confirmNicheChange,
    applyDuePrompt,
    hasWeekPlan: Boolean(weekPlan?.days?.length),
    hasOnboarding: Boolean(profile?.onboardingCompleted && weekPlan),
  };
}
