import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  ArrowRight,
  BrainCircuit,
  AlertCircle,
  Gamepad2,
  Compass,
  Utensils,
  ChefHat,
  Sparkle,
  Smartphone,
  Cpu,
  Dumbbell,
  TrendingUp,
  GraduationCap,
  Clapperboard,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { cn } from "../../lib/utils";
import { safeSessionStorage } from "../../lib/safeStorage";
import {
  clearWeekPlanRenewal,
  contentPlanFromOnboarding,
  isRenewingWeekPlan,
  isRevisingOnboarding,
  beginWeekPlanRenewal,
  beginOnboardingRevision,
} from "../../lib/weekPlan";
import {
  coachApi,
  identityApi,
  type CoachQuestionResponse,
  type CoachPlanResponse,
  type CoachStatusResponse,
} from "../../services/apiClient";
import { socketService } from "../../services/socketService";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectAuthUser, selectAuthProfile, setAuthProfile } from "../../store/slices/authSlice";

function extractWeekPlan(result: CoachPlanResponse | Record<string, unknown>): CoachPlanResponse["plan"] | null {
  const r = result as CoachPlanResponse & { data?: CoachPlanResponse };
  const payload = r.plan ? r : r.data;
  const plan = payload?.plan;
  if (plan && Array.isArray(plan.days)) {
    return {
      introMessage: plan.introMessage || payload?.message || "Here is your personalized creator plan.",
      days: plan.days.map((d) => ({
        day: d.day,
        icon: d.icon || "✨",
        contentType: d.contentType || "Clip",
        theme: d.theme || d.title || "",
        title: d.title,
        hook: d.hook,
      })),
      recommendedHashtags: plan.recommendedHashtags || [],
      workspaceTheme: plan.workspaceTheme || {
        primaryColor: "#0D9488",
        motivationalQuote: "",
      },
    };
  }
  // Some gateways flatten days onto the root
  const days = (result as { days?: CoachPlanResponse["plan"]["days"] }).days;
  if (Array.isArray(days) && days.length > 0) {
    return {
      introMessage:
        (result as { introMessage?: string; message?: string }).introMessage ||
        (result as { message?: string }).message ||
        "Here is your personalized creator plan.",
      days: days.map((d) => ({
        day: d.day,
        icon: d.icon || "✨",
        contentType: d.contentType || "Clip",
        theme: d.theme || d.title || "",
        title: d.title,
        hook: d.hook,
      })),
      recommendedHashtags: (result as { recommendedHashtags?: string[] }).recommendedHashtags || [],
      workspaceTheme: (result as { workspaceTheme?: CoachPlanResponse["plan"]["workspaceTheme"] })
        .workspaceTheme || {
        primaryColor: "#0D9488",
        motivationalQuote: "",
      },
    };
  }
  return null;
}

function normalizeCoachQuestion(
  q: CoachQuestionResponse,
  statusHint?: CoachStatusResponse["status"],
): CoachQuestionResponse {
  return {
    ...q,
    chips: Array.isArray(q.chips) ? q.chips : [],
    chipLabels: Array.isArray(q.chipLabels) ? q.chipLabels : undefined,
    multiSelect: Boolean(q.multiSelect),
    status: q.status ?? (statusHint === "ready_for_plan" ? "ready_for_plan" : undefined),
  };
}

/** Step heading + short instruction — never echo the same paragraph twice. */
function stepCopy(coach: CoachQuestionResponse): { heading: string; instruction: string } {
  if (coach.question === 0 || coach.status === "category") {
    return {
      heading: "What kind of content do you create?",
      instruction:
        "Choose one category. Your Creator Coach will tailor questions and a week plan to that niche — about 90 seconds.",
    };
  }
  if (coach.status === "ready_for_plan") {
    return {
      heading: "You're ready for a week plan",
      instruction:
        coach.message?.trim() ||
        "We've saved your answers. Generate a personalized 7-day content plan to finish setup.",
    };
  }

  const raw = (coach.message || "").trim();
  const sentences = raw.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length >= 2 && sentences[0].length <= 100) {
    return {
      heading: sentences[0],
      instruction: sentences.slice(1).join(" "),
    };
  }
  return {
    heading: `Question ${coach.question}`,
    instruction: raw || "Select an option below, or type your own answer.",
  };
}

function categoryIcon(slug: string) {
  const key = slug.toLowerCase();
  if (key.includes("game")) return Gamepad2;
  if (key.includes("travel")) return Compass;
  if (key.includes("food") || key.includes("dining") || key.includes("gourmet") || key.includes("culinary")) return Utensils;
  if (key.includes("cook") || key.includes("recipe") || key.includes("bak")) return ChefHat;
  if (key === "ai-content" || key.startsWith("ai-")) return BrainCircuit;
  if (key.includes("futuristic") || key.includes("digital-lifestyle")) return BrainCircuit;
  if (key.includes("digital-creator")) return Smartphone;
  if (key.includes("tech") || key.includes("saas")) return Cpu;
  if (key.includes("fitness") || key.includes("wellness")) return Dumbbell;
  if (key.includes("beauty") || key.includes("skincare") || key.includes("fashion") || key.includes("luxury")) return Sparkle;
  if (key.includes("finance") || key.includes("business")) return TrendingUp;
  if (key.includes("education") || key.includes("how-to")) return GraduationCap;
  if (key.includes("entertainment") || key.includes("culture")) return Clapperboard;
  if (key.includes("interior") || key.includes("spatial")) return Sparkle;
  if (key === "general") return Sparkle;
  return Sparkle;
}

function formatApiError(err: unknown): string {
  const e = err as { message?: string | string[]; error?: string; statusCode?: number };
  if (Array.isArray(e?.message)) return e.message.join(", ");
  if (typeof e?.message === "string" && e.message) return e.message;
  if (typeof e?.error === "string") return e.error;
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

/**
 * Creator Coach onboarding — HTTP `/coach/onboarding/*`.
 * Socket events are progress-only (no duplicate narration in the UI).
 */
export default function Onboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const reduxUser = useAppSelector(selectAuthUser);
  const reduxProfile = useAppSelector(selectAuthProfile);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [coach, setCoach] = useState<CoachQuestionResponse | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [customAnswer, setCustomAnswer] = useState("");
  const [plan, setPlan] = useState<CoachPlanResponse["plan"] | null>(null);
  const [progressHint, setProgressHint] = useState("");

  const syncProfileFromMe = useCallback(async () => {
    try {
      const me = await identityApi.getMe();
      const user = me?.user ?? me;
      if (!user) return;
      const finishing = safeSessionStorage.getItem("finishing_onboarding") === "true";
      const completed =
        user.onboardingCompleted === true ||
        (finishing && reduxProfile?.onboardingCompleted === true);
      dispatch(
        setAuthProfile({
          uid: user.id || user.uid || reduxUser?.uid || "",
          displayName: user.displayName || reduxProfile?.displayName || "Creator",
          email: user.email || reduxProfile?.email || "",
          photoURL: user.photoURL || user.avatarUrl || null,
          plan: (user.plan || reduxProfile?.plan || "free") as "free" | "pro" | "studio",
          role: user.role || reduxProfile?.role || "user",
          onboardingCompleted: completed,
          onboardingPlan: user.onboardingPlan ?? reduxProfile?.onboardingPlan ?? null,
          creatorCategory: user.creatorCategory ?? user.CreatorCategory ?? reduxProfile?.creatorCategory ?? null,
          creatorCategoryLabel:
            user.creatorCategoryLabel ??
            user.CreatorCategoryLabel ??
            reduxProfile?.creatorCategoryLabel ??
            null,
          creatorNiches: user.creatorNiches ?? user.CreatorNiches ?? reduxProfile?.creatorNiches ?? [],
          contentPlan:
            contentPlanFromOnboarding(user.onboardingPlan) ??
            contentPlanFromOnboarding(reduxProfile?.onboardingPlan) ??
            reduxProfile?.contentPlan,
          createdAt: user.createdAt || reduxProfile?.createdAt || new Date().toISOString(),
        }),
      );
    } catch (err) {
      console.warn("Failed to refresh /auth/me after coach", err);
    }
  }, [dispatch, reduxProfile, reduxUser]);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      setLoading(true);
      setError("");
      try {
        try {
          socketService.init();
        } catch {
          /* optional */
        }

        let question: CoachQuestionResponse | null = null;
        const navState = (location.state || {}) as {
          renewWeekPlan?: boolean;
          fromReset?: boolean;
          reviseOnboarding?: boolean;
        };
        if (navState.renewWeekPlan || navState.fromReset || navState.reviseOnboarding) {
          if (navState.reviseOnboarding) {
            beginOnboardingRevision();
          } else {
            beginWeekPlanRenewal();
          }
        }
        const renewing = isRenewingWeekPlan();

        if (renewing) {
          // Completed users building a fresh week — skip "already completed" short-circuit.
          question = normalizeCoachQuestion(await coachApi.start(undefined, true));
        } else {
        try {
          const statusRes = await coachApi.getStatus();
          if (cancelled) return;

          if (statusRes.status === "completed") {
            await syncProfileFromMe();
            // Mark complete locally so AuthGuard will not bounce back to coach.
            if (reduxProfile) {
              dispatch(
                setAuthProfile({
                  ...reduxProfile,
                  onboardingCompleted: true,
                }),
              );
            }
            navigate("/feed", { replace: true });
            return;
          }

          if (statusRes.question) {
            question = normalizeCoachQuestion(statusRes.question, statusRes.status);
          } else if (statusRes.status === "ready_for_plan") {
            question = {
              message: "We've saved your answers. Generate your personalized week plan next.",
              question: 5,
              chips: [],
              multiSelect: false,
              category: statusRes.category,
              totalQuestions: statusRes.totalQuestions,
              answeredCount: statusRes.answeredCount,
              status: "ready_for_plan",
            };
          }
        } catch (statusErr) {
          console.warn("[Onboarding] getStatus failed, calling start:", statusErr);
        }

        if (!question) {
          question = normalizeCoachQuestion(await coachApi.start(undefined, false));
        }
        }

        if (cancelled) return;
        setCoach(question);
        setSelected([]);
        setCustomAnswer("");
      } catch (err: unknown) {
        const message = formatApiError(err);
        setError(message);
        toast.error("Onboarding unavailable", { description: message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void boot();

    const unsubProgress = socketService.subscribe("coach:progress", (_e, payload) => {
      const data =
        (payload as { data?: { message?: string }; message?: string })?.data ?? payload;
      const msg = (data as { message?: string })?.message;
      if (msg) setProgressHint(msg);
    });
    // Do not navigate away on socket complete — stay so the week plan can render.
    const unsubComplete = socketService.subscribe("onboarding:complete", () => {
      void syncProfileFromMe();
    });

    return () => {
      cancelled = true;
      unsubProgress();
      unsubComplete();
    };
  }, [dispatch, location.state, navigate, reduxProfile, syncProfileFromMe]);

  const progressPct = useMemo(() => {
    if (!coach) return 0;
    if (coach.status === "ready_for_plan" || plan) return 95;
    if (coach.question === 0) return 8;
    const total = Math.max(coach.totalQuestions || 5, 1);
    return Math.min(90, Math.round(((coach.answeredCount || coach.question || 0) / total) * 85) + 10);
  }, [coach, plan]);

  const copy = coach ? stepCopy(coach) : { heading: "", instruction: "" };
  const isCategoryStep = Boolean(coach && (coach.question === 0 || coach.status === "category"));

  const toggleChip = (chip: string) => {
    if (!coach) return;
    if (coach.multiSelect) {
      setSelected((prev) =>
        prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip],
      );
    } else {
      setSelected([chip]);
    }
  };

  const submitAnswer = async () => {
    if (!coach) return;
    const answer =
      selected.length > 0
        ? coach.multiSelect
          ? selected
          : selected[0]
        : customAnswer.trim();

    if (!answer || (Array.isArray(answer) && answer.length === 0)) {
      toast.error("Pick an option or enter an answer");
      return;
    }

    setSubmitting(true);
    setError("");
    setProgressHint("");
    try {
      const next = normalizeCoachQuestion(await coachApi.answer(coach.question, answer));
      setCoach(next);
      setSelected([]);
      setCustomAnswer("");
      if (next.status === "ready_for_plan") {
        toast.success("Answers saved", { description: "Generate your week plan next." });
      }
    } catch (err: unknown) {
      const message = formatApiError(err);
      setError(message);
      toast.error("Answer failed", { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  const markOnboardingCompleteLocally = (weekPlan: CoachPlanResponse["plan"] | null) => {
    const base = reduxProfile || {
      uid: reduxUser?.uid || "",
      displayName: reduxUser?.displayName || "Creator",
      email: reduxUser?.email || "",
      photoURL: reduxUser?.photoURL || null,
      plan: "free" as const,
      role: "creator" as const,
      createdAt: new Date().toISOString(),
    };
    const planRec = weekPlan as (CoachPlanResponse["plan"] & {
      category?: string;
      categoryLabel?: string;
      niches?: string[];
    }) | null;
    dispatch(
      setAuthProfile({
        ...base,
        onboardingCompleted: true,
        onboardingPlan: weekPlan,
        contentPlan: contentPlanFromOnboarding(weekPlan),
        creatorCategory: planRec?.category ?? base.creatorCategory ?? null,
        creatorCategoryLabel: planRec?.categoryLabel ?? planRec?.category ?? base.creatorCategoryLabel ?? null,
        creatorNiches: planRec?.niches?.length ? planRec.niches : base.creatorNiches || [],
      }),
    );
    safeSessionStorage.setItem("finishing_onboarding", "true");
  };

  const generatePlan = async () => {
    setSubmitting(true);
    setError("");
    setProgressHint("Creating your week plan…");
    try {
      const result = await coachApi.generatePlan();
      const weekPlan = extractWeekPlan(result);
      if (!weekPlan) {
        throw new Error("Plan was generated but could not be displayed. Please try again.");
      }
      setPlan(weekPlan);
      // Optimistic complete so Feed is reachable even if identity persist lags.
      markOnboardingCompleteLocally(weekPlan);
      clearWeekPlanRenewal();
      void syncProfileFromMe();
      toast.success("Your content plan is ready");
    } catch (err: unknown) {
      const message = formatApiError(err);
      setError(message);
      toast.error("Plan generation failed", { description: message });
    } finally {
      setProgressHint("");
      setSubmitting(false);
    }
  };

  const finish = async (toStudio: boolean) => {
    setSubmitting(true);
    try {
      markOnboardingCompleteLocally(plan);
      await syncProfileFromMe();
      toast.success("Welcome to nxClip");
      if (toStudio) {
        const theme = plan?.days?.[0]?.theme || "";
        navigate("/create/image", {
          replace: true,
          state: { fromOnboarding: true, initialPrompt: theme },
        });
      } else {
        navigate("/feed", { replace: true });
      }
    } finally {
      setSubmitting(false);
    }
  };

  /** Leave coach without completing — next login will prompt again. */
  const skipOnboarding = () => {
    safeSessionStorage.setItem("finishing_onboarding", "true");
    toast.message("You can finish onboarding anytime", {
      description: "We'll ask again next time you sign in.",
    });
    navigate("/feed", { replace: true });
  };

  const restart = async () => {
    setSubmitting(true);
    setPlan(null);
    setError("");
    setProgressHint("");
    try {
      const status = normalizeCoachQuestion(await coachApi.start(undefined, true));
      setCoach(status);
      setSelected([]);
      setCustomAnswer("");
    } catch (err: unknown) {
      setError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/[0.07] via-transparent to-amber-500/[0.05] pointer-events-none" />
      <div
        className={cn(
          "relative z-10 mx-auto px-4 py-12 md:py-16",
          plan ? "max-w-6xl" : "max-w-2xl",
        )}
      >
        <header className="flex items-center gap-3 mb-8">
          <div className="h-11 w-11 rounded-2xl bg-teal-500/15 flex items-center justify-center">
            <BrainCircuit className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Creator Coach</h1>
            <p className="text-sm text-muted-foreground">
              {isRevisingOnboarding() || isRenewingWeekPlan()
                ? "Update your niche and answers, then get a fresh week plan"
                : "Quick setup for your creator workspace"}
            </p>
          </div>
        </header>

        {(isRevisingOnboarding() || isRenewingWeekPlan()) && !plan ? (
          <Alert className="mb-6 border-teal-500/30 bg-teal-500/5">
            <Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <AlertTitle>Revising your onboarding</AlertTitle>
            <AlertDescription className="text-sm leading-relaxed">
              Pick your category and niches again, then re-answer audience, goal, posting rhythm,
              and starting point. When you finish, we regenerate your full week plan. Published
              content is not deleted.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="h-1.5 rounded-full bg-muted mb-8 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-teal-600 to-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {progressHint && (
          <p className="text-xs text-muted-foreground mb-4 flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            {progressHint}
          </p>
        )}

        <AnimatePresence mode="wait">
          {plan ? (
            <motion.div
              key="plan"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/25 bg-teal-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-teal-700 dark:text-teal-300 mb-3">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Week plan ready
                  </div>
                  <h2 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
                    Your week plan
                  </h2>
                  <p className="text-muted-foreground mt-3 leading-relaxed">
                    {plan.introMessage || "Here is your personalized creator plan."}
                  </p>
                  {plan.workspaceTheme?.motivationalQuote ? (
                    <p className="mt-3 text-sm italic text-foreground/70 border-l-2 border-teal-500/40 pl-3">
                      {plan.workspaceTheme.motivationalQuote}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                  <Button disabled={submitting} onClick={() => void finish(true)}>
                    Start creating
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    disabled={submitting}
                    onClick={() => void finish(false)}
                  >
                    Go to Feed
                  </Button>
                </div>
              </div>

              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.06 } },
                }}
              >
                {(plan.days || []).map((day, index) => {
                  const heading = day.title || day.theme;
                  const detail = day.hook || (day.title ? day.theme : "");
                  return (
                    <motion.article
                      key={`${day.day}-${index}`}
                      variants={{
                        hidden: { opacity: 0, y: 14 },
                        show: { opacity: 1, y: 0 },
                      }}
                      className={cn(
                        "group relative overflow-hidden rounded-2xl border border-border/60",
                        "bg-card/90 backdrop-blur-sm p-5 min-h-[200px] flex flex-col",
                        "shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]",
                        "hover:border-teal-500/35 hover:shadow-lg hover:shadow-teal-500/5 transition-all duration-300",
                        index === 6 && "sm:col-span-2 lg:col-span-1",
                      )}
                    >
                      <div
                        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-[0.12] blur-2xl bg-teal-500 group-hover:opacity-20 transition-opacity"
                        aria-hidden
                      />
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700/80 dark:text-teal-300/90">
                            {day.day}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1">{day.contentType}</p>
                        </div>
                        <span
                          className="text-2xl leading-none select-none"
                          aria-hidden
                        >
                          {day.icon || "✨"}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold tracking-tight leading-snug mb-2">
                        {heading}
                      </h3>
                      {detail ? (
                        <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                          {detail}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                          {day.theme}
                        </p>
                      )}
                      <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Day {index + 1} of 7
                        </span>
                        <span className="h-1.5 w-1.5 rounded-full bg-teal-500/70" />
                      </div>
                    </motion.article>
                  );
                })}
              </motion.div>

              {plan.recommendedHashtags?.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {plan.recommendedHashtags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="font-normal">
                      {tag.startsWith("#") ? tag : `#${tag}`}
                    </Badge>
                  ))}
                </div>
              )}
            </motion.div>
          ) : coach?.status === "ready_for_plan" ? (
            <motion.div key="ready" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-6 md:p-8 space-y-6">
                <div>
                  <Badge variant="outline" className="mb-3 text-[10px] uppercase tracking-wider">
                    Final step
                  </Badge>
                  <h2 className="text-xl font-semibold tracking-tight">{copy.heading}</h2>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    {copy.instruction}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button disabled={submitting} onClick={() => void generatePlan()}>
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Generate plan
                  </Button>
                  <Button variant="ghost" disabled={submitting} onClick={() => void restart()}>
                    Restart
                  </Button>
                  <Button variant="ghost" disabled={submitting} onClick={skipOnboarding}>
                    Skip for now
                  </Button>
                </div>
              </Card>
            </motion.div>
          ) : coach ? (
            <motion.div
              key={`q-${coach.question}-${coach.status}-${coach.category ?? "none"}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Card className="p-6 md:p-8 space-y-6">
                <div>
                  <Badge variant="outline" className="mb-3 text-[10px] uppercase tracking-wider">
                    {isCategoryStep
                      ? "Step 1 · Category"
                      : `Question ${coach.question} of ${coach.totalQuestions || 5}`}
                  </Badge>
                  <h2 className="text-xl font-semibold tracking-tight leading-snug">
                    {copy.heading}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    {copy.instruction}
                  </p>
                  {coach.category && !isCategoryStep && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Niche: <span className="text-foreground/80">{coach.category}</span>
                    </p>
                  )}
                </div>

                {isCategoryStep ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(coach.chips || []).map((chip, i) => {
                      const label = coach.chipLabels?.[i] || chip;
                      const active = selected.includes(chip);
                      const Icon = categoryIcon(chip);
                      return (
                        <button
                          key={`cat-${chip}-${i}`}
                          type="button"
                          onClick={() => toggleChip(chip)}
                          className={cn(
                            "text-left rounded-2xl border p-4 transition-colors",
                            active
                              ? "border-primary bg-primary/10 shadow-sm"
                              : "border-border/60 bg-muted/15 hover:bg-muted/35 hover:border-border",
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                                active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold leading-snug">{label}</p>
                              <p className="text-[11px] text-muted-foreground mt-1 truncate">
                                {chip}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(coach.chips || []).map((chip, i) => {
                      const label = coach.chipLabels?.[i] || chip;
                      const active = selected.includes(chip);
                      return (
                        <button
                          key={`chip-${coach.question}-${i}-${chip}`}
                          type="button"
                          onClick={() => toggleChip(chip)}
                          className={cn(
                            "rounded-full border px-4 py-2 text-sm transition-colors",
                            active
                              ? "border-primary bg-primary/15 text-foreground"
                              : "border-border/60 bg-muted/20 hover:bg-muted/40",
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    {isCategoryStep
                      ? "Or describe your niche"
                      : coach.multiSelect
                        ? "Add more detail (optional)"
                        : "Or type your own answer"}
                  </label>
                  <textarea
                    value={customAnswer}
                    onChange={(e) => setCustomAnswer(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder={
                      isCategoryStep ? "e.g. Indie game reviews…" : "Write freely…"
                    }
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    className="flex-1"
                    disabled={submitting}
                    onClick={() => void submitAnswer()}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button variant="ghost" disabled={submitting} onClick={() => void restart()}>
                    Restart
                  </Button>
                  <Button variant="ghost" disabled={submitting} onClick={skipOnboarding}>
                    Skip for now
                  </Button>
                </div>
              </Card>
            </motion.div>
          ) : (
            <Card className="p-8 text-center space-y-4">
              <p className="text-muted-foreground">No coach session available.</p>
              <Button onClick={() => void restart()}>Start onboarding</Button>
              <Button variant="ghost" onClick={skipOnboarding}>
                Skip for now
              </Button>
            </Card>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
