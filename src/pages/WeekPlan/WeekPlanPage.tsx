import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Calendar, Sparkles } from "lucide-react";
import { WeekPlanGrid } from "../../components/WeekPlanGrid";
import { CreatorNicheTags } from "../../components/CreatorNicheTags";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { beginWeekPlanRenewal, beginOnboardingRevision, weekPlanFromProfile } from "../../lib/weekPlan";
import { onboardingSnapshotFromProfile } from "../../lib/onboardingSnapshot";
import { useAppSelector } from "../../store/hooks";
import { selectAuthProfile } from "../../store/slices/authSlice";

/**
 * Dedicated week-plan surface used by Dashboard / Coach "View plan" CTAs.
 * Keeps plan viewing off OwnProfile so a Profile tab crash cannot block the plan.
 */
export default function WeekPlanPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const profile = useAppSelector(selectAuthProfile);
  const weekPlan = useMemo(() => weekPlanFromProfile(profile), [profile]);
  const onboarding = useMemo(() => onboardingSnapshotFromProfile(profile), [profile]);

  const handleRenew = () => {
    beginWeekPlanRenewal();
    navigate("/onboarding", { state: { renewWeekPlan: true } });
  };

  const handleRevise = () => {
    beginOnboardingRevision();
    navigate("/onboarding", {
      state: { renewWeekPlan: true, reviseOnboarding: true },
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Calendar className="text-teal-600 dark:text-teal-400" size={22} />
          <div>
            <h1 className="text-xl md:text-2xl font-display font-bold tracking-tight">
              {t("profile.strategy.title", { defaultValue: "Your week plan" })}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Saved from Creator Coach · stays until you create a new one
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="border-teal-500/30 text-teal-700 dark:text-teal-300 font-bold"
          >
            {onboarding?.goal === "viral"
              ? t("profile.strategy.growth_mode", { defaultValue: "Growth" })
              : t("profile.strategy.community_mode", { defaultValue: "Community" })}
          </Badge>
          <Button variant="outline" size="sm" className="font-bold" onClick={handleRevise}>
            {t("profile.strategy.revise_cta", { defaultValue: "Revise niche" })}
          </Button>
          <Button variant="outline" size="sm" className="font-bold" onClick={handleRenew}>
            Plan a new week
          </Button>
        </div>
      </div>

      {onboarding ? (
        <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
                {t("profile.strategy.onboarding_title", { defaultValue: "Your niche" })}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("profile.strategy.onboarding_subtitle", {
                  defaultValue: "Category and niches from Creator Coach",
                })}
              </p>
            </div>
            <CreatorNicheTags
              categoryLabel={onboarding.categoryLabel}
              niches={onboarding.niches}
            />
          </div>
        </div>
      ) : null}

      {weekPlan ? (
        <WeekPlanGrid plan={weekPlan} />
      ) : (
        <div className="ui-card p-12 text-center space-y-4">
          <Sparkles className="mx-auto text-muted-foreground/30" size={48} />
          <p className="text-muted-foreground font-medium">
            {t("profile.strategy.no_plan", {
              defaultValue: "No coach week plan yet. Create one to get daily themes.",
            })}
          </p>
          <Button variant="outline" size="sm" className="font-bold" onClick={handleRenew}>
            {t("profile.strategy.start_onboarding", { defaultValue: "Create week plan" })}
          </Button>
        </div>
      )}
    </div>
  );
}
