import { Crown, Sparkles, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";

export type PlanTier = "free" | "pro" | "studio" | string | null | undefined;

function normalizePlan(plan: PlanTier): "free" | "pro" | "studio" {
  const p = String(plan || "free").toLowerCase();
  if (p === "pro" || p === "studio") return p;
  return "free";
}

type PlanBadgeProps = {
  plan: PlanTier;
  /** compact = SideNav; default = profile/settings */
  size?: "sm" | "md" | "lg";
  /** When true and plan is free/pro, badge links to /upgrade */
  linkToUpgrade?: boolean;
  className?: string;
  showIcon?: boolean;
};

/**
 * Prominent Free / Pro / Studio identity chip — same visual language everywhere.
 */
export function PlanBadge({
  plan,
  size = "md",
  linkToUpgrade = false,
  className,
  showIcon = true,
}: PlanBadgeProps) {
  const { t } = useTranslation();
  const tier = normalizePlan(plan);

  const label =
    tier === "pro"
      ? t("profile.plans.pro")
      : tier === "studio"
        ? t("profile.plans.studio")
        : t("profile.plans.free");

  const Icon = tier === "studio" ? Crown : tier === "pro" ? Sparkles : Zap;

  const sizeCls =
    size === "lg"
      ? "h-7 px-3 text-[11px] gap-1.5"
      : size === "sm"
        ? "h-5 px-1.5 text-[9px] gap-1"
        : "h-6 px-2.5 text-[10px] gap-1.5";

  const tone =
    tier === "studio"
      ? "border-transparent text-primary-foreground bg-[linear-gradient(135deg,#0f766e_0%,#134e4a_45%,#042f2e_100%)] shadow-sm shadow-teal-900/20"
      : tier === "pro"
        ? "border-transparent text-primary-foreground bg-[linear-gradient(135deg,var(--color-brand-primary)_0%,var(--color-brand-tertiary)_100%)] shadow-sm shadow-primary/25"
        : "border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-200 dark:bg-amber-500/20";

  const inner = (
    <Badge
      variant="outline"
      className={cn(
        "font-black uppercase tracking-[0.14em] border-none",
        sizeCls,
        tone,
        linkToUpgrade && tier !== "studio" && "cursor-pointer hover:opacity-90 transition-opacity",
        className,
      )}
      title={
        tier === "free"
          ? t("profile.plan_hint.free")
          : tier === "pro"
            ? t("profile.plan_hint.pro")
            : t("profile.plan_hint.studio")
      }
    >
      {showIcon && <Icon className={size === "sm" ? "size-2.5!" : "size-3!"} aria-hidden />}
      {label}
    </Badge>
  );

  if (linkToUpgrade && tier !== "studio") {
    return (
      <Link to="/upgrade" aria-label={t(tier === "pro" ? "nav.upgrade_studio" : "nav.upgrade_pro")}>
        {inner}
      </Link>
    );
  }

  return inner;
}
