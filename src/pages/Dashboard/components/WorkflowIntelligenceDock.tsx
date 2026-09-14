import { ArrowUpRight, BrainCircuit, ChevronDown, Loader2, Minus, RefreshCw, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { AuthenticatedImage } from "../../../components/AuthenticatedImage";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";
import { beginWeekPlanRenewal } from "../../../lib/weekPlan";

import type { PlanWorkflowSuggestion } from "../../../lib/weekPlanWorkflow";

export type WorkflowDockSuggestion = PlanWorkflowSuggestion & {
  memeIdea?: string;
};

interface WorkflowIntelligenceDockProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: WorkflowDockSuggestion[];
  loading: boolean;
  provider: string | null;
  evaluatedCount: number;
  cacheHits: number;
  onRefresh: () => void;
}

export function WorkflowIntelligenceDock({
  open,
  onOpenChange,
  suggestions,
  loading,
  provider,
  evaluatedCount,
  cacheHits,
  onRefresh,
}: WorkflowIntelligenceDockProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isAr = i18n.language === "ar";
  const count = suggestions.length;

  return (
    <div
      className={cn(
        "fixed z-[60] pointer-events-none",
        "inset-x-3 bottom-[5.25rem] lg:inset-x-auto lg:bottom-5",
        isAr ? "lg:left-5 lg:right-auto" : "lg:right-5 lg:left-auto",
      )}
    >
      {!open ? (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className={cn(
            "pointer-events-auto flex items-center gap-2.5 rounded-2xl border border-sky-500/40",
            "bg-card/95 backdrop-blur-xl shadow-2xl shadow-sky-500/15",
            "px-3.5 py-2.5 w-full lg:w-[380px] text-start",
            "hover:border-sky-500/70 transition-colors",
          )}
        >
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white">
            <BrainCircuit size={18} />
            {count > 0 ? (
              <span className="absolute -top-1 -end-1 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-[9px] font-bold leading-4 text-center">
                {count}
              </span>
            ) : null}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-foreground leading-tight truncate">
              {t("dashboard.workflows.title")}
            </span>
            <span className="block text-[11px] text-muted-foreground truncate">
              {loading
                ? t("dashboard.workflows.loading")
                : count > 0
                  ? t("dashboard.workflows.dock_ready", {
                      count,
                      defaultValue: "{{count}} suggestions waiting",
                    })
                  : t("dashboard.workflows.subtitle")}
            </span>
          </span>
          <ChevronDown size={16} className="rotate-180 text-muted-foreground shrink-0" />
        </button>
      ) : (
        <div
          className={cn(
            "pointer-events-auto flex flex-col overflow-hidden rounded-2xl border border-sky-500/35",
            "bg-card/97 backdrop-blur-xl shadow-2xl shadow-black/25",
            "w-full lg:w-[400px] max-h-[min(70vh,560px)]",
            "animate-in slide-in-from-bottom-4 fade-in duration-300",
          )}
          role="dialog"
          aria-label={t("dashboard.workflows.title")}
        >
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-sky-500/10 shrink-0">
            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500 text-white">
              <BrainCircuit size={16} />
              <span className="absolute -bottom-0.5 -end-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-card" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground leading-tight truncate">
                {t("dashboard.workflows.title")}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {t("dashboard.workflows.dock_online", {
                  defaultValue: "Live suggestions · tap a move to run it",
                })}
              </p>
            </div>
            <button
              type="button"
              aria-label={t("dashboard.workflows.refresh")}
              disabled={loading}
              onClick={onRefresh}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted/70 disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            </button>
            <button
              type="button"
              aria-label={t("dashboard.workflows.minimize", { defaultValue: "Minimize" })}
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted/70"
            >
              <Minus size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0">
            {loading && suggestions.length === 0 ? (
              <div className="rounded-xl bg-muted/40 border border-border px-3 py-2.5">
                <p className="text-sm text-muted-foreground">{t("dashboard.workflows.loading")}</p>
              </div>
            ) : null}
            {!loading && suggestions.length === 0 ? (
              <div className="rounded-xl bg-muted/40 border border-border px-3 py-2.5">
                <p className="text-sm text-muted-foreground">{t("dashboard.workflows.empty")}</p>
              </div>
            ) : null}
            {suggestions.map((item) => (
              <div
                key={item.id}
                className="rounded-xl bg-sky-500/8 border border-sky-500/20 p-2.5 space-y-2"
              >
                <div className="flex items-start gap-2.5">
                  {item.thumbnailUrl ? (
                    <div className="h-11 w-11 rounded-md overflow-hidden border border-border shrink-0 bg-muted">
                      <AuthenticatedImage
                        src={item.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        loadingCompact
                      />
                    </div>
                  ) : (
                    <div className="h-11 w-11 rounded-md border border-border shrink-0 bg-muted flex items-center justify-center text-muted-foreground">
                      <Zap size={14} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h5 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
                        {item.headline}
                      </h5>
                      <Badge className="text-[10px] h-5 px-1.5 border-none font-semibold bg-sky-500/15 text-sky-700 dark:text-sky-300">
                        {item.source === "week_plan" || item.action === "week_plan" || item.action === "renew_plan"
                          ? "Week plan"
                          : item.action.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground line-clamp-2">
                      {item.reason}
                    </p>
                    {item.memeIdea ? (
                      <p className="text-[11px] font-semibold text-foreground/90 line-clamp-2">
                        {t("dashboard.workflows.meme_idea")}: {item.memeIdea}
                      </p>
                    ) : null}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs font-semibold text-primary"
                  onClick={() => {
                    if (item.action === "renew_plan") {
                      beginWeekPlanRenewal();
                      navigate("/onboarding", { state: { renewWeekPlan: true } });
                      return;
                    }
                    navigate(item.href);
                  }}
                >
                  {item.ctaLabel} <ArrowUpRight size={12} className="ms-1" />
                </Button>
              </div>
            ))}
          </div>

          {provider && !loading ? (
            <p className="text-[10px] font-medium text-muted-foreground truncate px-3 py-2 border-t border-border shrink-0">
              {t("dashboard.workflows.powered_by", {
                provider: provider.replace(/^(anthropic|gemini|openai|mock|content)-/, ""),
              })}
              {evaluatedCount > 0
                ? ` · ${t("dashboard.workflows.evaluated", { count: evaluatedCount })}`
                : null}
              {cacheHits > 0
                ? ` · ${t("dashboard.workflows.cached", { count: cacheHits, defaultValue: `${cacheHits} cached` })}`
                : null}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
