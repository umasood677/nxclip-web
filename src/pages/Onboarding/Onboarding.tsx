import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  ArrowRight,
  BrainCircuit,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { cn } from "../../lib/utils";
import {
  coachApi,
  identityApi,
  type CoachQuestionResponse,
  type CoachPlanResponse,
} from "../../services/apiClient";
import { socketService } from "../../services/socketService";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectAuthUser, selectAuthProfile, setAuthProfile } from "../../store/slices/authSlice";

/**
 * Creator Coach onboarding — driven by gateway `/coach/onboarding/*`
 * (frontend-integration-guide). Socket.IO connected before coach calls.
 */
export default function Onboarding() {
  const navigate = useNavigate();
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
  const [coachStream, setCoachStream] = useState("");

  const syncProfileFromMe = useCallback(async () => {
    try {
      const me = await identityApi.getMe();
      const user = me?.user ?? me;
      if (!user) return;
      dispatch(
        setAuthProfile({
          uid: user.id || user.uid || reduxUser?.uid || "",
          displayName: user.displayName || reduxProfile?.displayName || "Creator",
          email: user.email || reduxProfile?.email || "",
          photoURL: user.photoURL || user.avatarUrl || null,
          plan: (user.plan || reduxProfile?.plan || "free") as "free" | "pro" | "studio",
          role: user.role || reduxProfile?.role || "user",
          onboardingCompleted: Boolean(user.onboardingCompleted),
          onboardingPlan: user.onboardingPlan ?? null,
          contentPlan: user.onboardingPlan?.days ?? reduxProfile?.contentPlan,
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
        socketService.init();
        let status: CoachQuestionResponse;
        try {
          status = await coachApi.getStatus();
        } catch {
          status = await coachApi.start(undefined, false);
        }

        if (cancelled) return;

        if (status.status === "completed") {
          await syncProfileFromMe();
          navigate("/dashboard", { replace: true });
          return;
        }

        if (status.status === "ready_for_plan") {
          setCoach(status);
        } else {
          setCoach(status);
        }
        setSelected([]);
        setCustomAnswer("");
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Could not start Creator Coach onboarding.";
        setError(message);
        toast.error("Onboarding unavailable", { description: message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void boot();

    const unsubToken = socketService.subscribe("coach:token", (_e, payload) => {
      const data = (payload as { data?: { token?: string }; token?: string })?.data
        ?? payload;
      const token = (data as { token?: string })?.token;
      if (token) setCoachStream((prev) => prev + token);
    });
    const unsubProgress = socketService.subscribe("coach:progress", (_e, payload) => {
      const data = (payload as { data?: { message?: string }; message?: string })?.data
        ?? payload;
      const msg = (data as { message?: string })?.message;
      if (msg) toast.message("Coach", { description: msg });
    });
    const unsubComplete = socketService.subscribe("onboarding:complete", () => {
      void (async () => {
        await syncProfileFromMe();
        toast.success("Onboarding complete");
        navigate("/dashboard", { replace: true });
      })();
    });

    return () => {
      cancelled = true;
      unsubToken();
      unsubProgress();
      unsubComplete();
    };
  }, [navigate, syncProfileFromMe]);

  const progressPct = useMemo(() => {
    if (!coach) return 0;
    if (coach.status === "ready_for_plan" || plan) return 95;
    const total = Math.max(coach.totalQuestions || 5, 1);
    return Math.min(90, Math.round(((coach.answeredCount || 0) / total) * 90));
  }, [coach, plan]);

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
    setCoachStream("");
    try {
      const next = await coachApi.answer(coach.question, answer);
      setCoach(next);
      setSelected([]);
      setCustomAnswer("");
      if (next.status === "ready_for_plan") {
        toast.success("Ready for your plan", {
          description: "Generate your personalized week plan next.",
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save answer";
      setError(message);
      toast.error("Answer failed", { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  const generatePlan = async () => {
    setSubmitting(true);
    setError("");
    setCoachStream("");
    try {
      const result = await coachApi.generatePlan();
      setPlan(result.plan);
      await syncProfileFromMe();
      toast.success("Your content plan is ready");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Plan generation failed";
      setError(message);
      toast.error("Plan failed", { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  const finish = async (toStudio: boolean) => {
    setSubmitting(true);
    try {
      await syncProfileFromMe();
      toast.success("Welcome to nxClip");
      if (toStudio) {
        const theme = plan?.days?.[0]?.theme || "";
        navigate("/create/image", {
          replace: true,
          state: { fromOnboarding: true, initialPrompt: theme },
        });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const restart = async () => {
    setSubmitting(true);
    setPlan(null);
    setError("");
    try {
      const status = await coachApi.start(undefined, true);
      setCoach(status);
      setSelected([]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not restart";
      setError(message);
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
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12 md:py-16">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-11 w-11 rounded-2xl bg-primary/15 flex items-center justify-center">
            <BrainCircuit className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Creator Coach</h1>
            <p className="text-sm text-muted-foreground">
              Personalized onboarding powered by nxClip AI
            </p>
          </div>
        </div>

        <div className="h-1.5 rounded-full bg-muted mb-8 overflow-hidden">
          <motion.div
            className="h-full bg-primary"
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

        <AnimatePresence mode="wait">
          {plan ? (
            <motion.div
              key="plan"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <Card className="p-6 md:p-8 border-border/60 bg-card/80 backdrop-blur space-y-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-xl font-semibold">Your week plan</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {plan.introMessage || "Here is your personalized creator plan."}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {(plan.days || []).map((day) => (
                    <div
                      key={`${day.day}-${day.theme}`}
                      className="rounded-xl border border-border/50 p-4 bg-muted/30"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Badge variant="outline">{day.day}</Badge>
                        <span className="text-xs text-muted-foreground">{day.contentType}</span>
                      </div>
                      <p className="text-sm font-medium">{day.theme}</p>
                    </div>
                  ))}
                </div>

                {plan.recommendedHashtags?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {plan.recommendedHashtags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="font-normal">
                        {tag.startsWith("#") ? tag : `#${tag}`}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    className="flex-1"
                    disabled={submitting}
                    onClick={() => void finish(true)}
                  >
                    Start creating
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={submitting}
                    onClick={() => void finish(false)}
                  >
                    Go to dashboard
                  </Button>
                </div>
              </Card>
            </motion.div>
          ) : coach?.status === "ready_for_plan" ? (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-6 md:p-8 space-y-6">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">Ready to generate your plan</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  {coach.message ||
                    "We have everything we need. Generate your personalized content plan."}
                </p>
                {coachStream && (
                  <p className="text-sm whitespace-pre-wrap text-foreground/90 border-l-2 border-primary/40 pl-3">
                    {coachStream}
                  </p>
                )}
                <div className="flex gap-3">
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
                </div>
              </Card>
            </motion.div>
          ) : coach ? (
            <motion.div
              key={`q-${coach.question}-${coach.status}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Card className="p-6 md:p-8 space-y-6">
                <div className="space-y-2">
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                    {coach.question === 0
                      ? "Category"
                      : `Question ${coach.question} / ${coach.totalQuestions || 5}`}
                  </Badge>
                  <h2 className="text-xl font-semibold leading-snug">{coach.message}</h2>
                  {coach.category && (
                    <p className="text-xs text-muted-foreground">Category: {coach.category}</p>
                  )}
                </div>

                {coachStream && (
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground border-l-2 border-primary/30 pl-3">
                    {coachStream}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {(coach.chips || []).map((chip, i) => {
                    const label = coach.chipLabels?.[i] || chip;
                    const active = selected.includes(chip);
                    return (
                      <button
                        key={chip}
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

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Or type your own answer
                  </label>
                  <textarea
                    value={customAnswer}
                    onChange={(e) => setCustomAnswer(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Write freely…"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    className="flex-1"
                    disabled={submitting}
                    onClick={() => void submitAnswer()}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button variant="ghost" disabled={submitting} onClick={() => void restart()}>
                    Restart
                  </Button>
                </div>
              </Card>
            </motion.div>
          ) : (
            <Card className="p-8 text-center space-y-4">
              <p className="text-muted-foreground">No coach session available.</p>
              <Button onClick={() => void restart()}>Start onboarding</Button>
            </Card>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
