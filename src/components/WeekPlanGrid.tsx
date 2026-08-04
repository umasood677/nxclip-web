import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { Badge } from "./ui/badge";
import type { NormalizedWeekPlan, WeekPlanDay } from "../lib/weekPlan";

type Props = {
  plan: NormalizedWeekPlan;
  className?: string;
  /** denser tiles for sidebars */
  compact?: boolean;
  maxDays?: number;
};

function DayTile({
  day,
  index,
  compact,
}: {
  day: WeekPlanDay;
  index: number;
  compact?: boolean;
}) {
  const heading = day.title || day.theme;
  const detail = day.hook || (day.title ? day.theme : "");

  return (
    <motion.article
      variants={{
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0 },
      }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/60",
        "bg-card/90 backdrop-blur-sm flex flex-col",
        "shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]",
        "hover:border-teal-500/35 hover:shadow-lg hover:shadow-teal-500/5 transition-all duration-300",
        compact ? "p-3.5 min-h-[140px]" : "p-5 min-h-[200px]",
      )}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-[0.12] blur-2xl bg-teal-500 group-hover:opacity-20 transition-opacity"
        aria-hidden
      />
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700/80 dark:text-teal-300/90">
            {day.day}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">{day.contentType}</p>
        </div>
        <span className={cn("leading-none select-none", compact ? "text-xl" : "text-2xl")} aria-hidden>
          {day.icon || "✨"}
        </span>
      </div>
      <h3
        className={cn(
          "font-semibold tracking-tight leading-snug mb-2",
          compact ? "text-sm" : "text-lg",
        )}
      >
        {heading}
      </h3>
      {detail ? (
        <p
          className={cn(
            "text-muted-foreground leading-relaxed flex-1",
            compact ? "text-xs line-clamp-3" : "text-sm",
          )}
        >
          {detail}
        </p>
      ) : (
        <p
          className={cn(
            "text-muted-foreground leading-relaxed flex-1",
            compact ? "text-xs line-clamp-3" : "text-sm",
          )}
        >
          {day.theme}
        </p>
      )}
      {!compact && (
        <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Day {index + 1} of 7
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-teal-500/70" />
        </div>
      )}
    </motion.article>
  );
}

export function WeekPlanGrid({ plan, className, compact, maxDays }: Props) {
  const days = maxDays ? plan.days.slice(0, maxDays) : plan.days;

  return (
    <div className={cn("space-y-4", className)}>
      {(plan.introMessage || plan.motivationalQuote) && !compact && (
        <div className="space-y-2">
          {plan.introMessage ? (
            <p className="text-sm text-muted-foreground leading-relaxed">{plan.introMessage}</p>
          ) : null}
          {plan.motivationalQuote ? (
            <p className="text-sm italic text-foreground/70 border-l-2 border-teal-500/40 pl-3">
              {plan.motivationalQuote}
            </p>
          ) : null}
        </div>
      )}

      <motion.div
        className={cn(
          "grid gap-4",
          compact
            ? "grid-cols-1 sm:grid-cols-2"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        )}
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.05 } },
        }}
      >
        {days.map((day, index) => (
          <DayTile key={`${day.day}-${index}`} day={day} index={index} compact={compact} />
        ))}
      </motion.div>

      {plan.recommendedHashtags && plan.recommendedHashtags.length > 0 && !compact && (
        <div className="flex flex-wrap gap-2 pt-1">
          {plan.recommendedHashtags.map((tag) => (
            <Badge key={tag} variant="secondary" className="font-normal">
              {tag.startsWith("#") ? tag : `#${tag}`}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
