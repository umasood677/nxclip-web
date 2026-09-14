import { CalendarDays, Sparkles, ArrowRightLeft } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import type { WeekPlanDay } from "../lib/weekPlan";
import { cn } from "../lib/utils";
import { CreatorNicheTags } from "./CreatorNicheTags";

interface StudioPlanBannerProps {
  toolLabel: string;
  categoryLabel?: string | null;
  niches?: string[];
  /** True when a week plan exists even if niche metadata is missing (legacy users). */
  hasWeekPlan?: boolean;
  dueToday?: WeekPlanDay | null;
  onApplyDue?: () => void;
  onRequestNicheChange: () => void;
  nicheDialogOpen: boolean;
  onNicheDialogOpenChange: (open: boolean) => void;
  onConfirmNicheChange: () => void;
  className?: string;
}

export function StudioPlanBanner({
  toolLabel,
  categoryLabel,
  niches = [],
  hasWeekPlan = false,
  dueToday,
  onApplyDue,
  onRequestNicheChange,
  nicheDialogOpen,
  onNicheDialogOpenChange,
  onConfirmNicheChange,
  className,
}: StudioPlanBannerProps) {
  return (
    <>
      <section
        className={cn(
          "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2",
          className,
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-1.5">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <p className="truncate text-xs font-semibold text-foreground">
              {toolLabel}
              <span className="font-normal text-muted-foreground"> · Coach</span>
            </p>
            <CreatorNicheTags
              categoryLabel={categoryLabel}
              niches={niches}
              tone="studio"
              emptyLabel={hasWeekPlan ? "Niche not set — tap Niche to revise" : "Niche not set"}
            />
            {hasWeekPlan && !categoryLabel && niches.length === 0 ? (
              <span className="rounded-md border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-100">
                Legacy plan
              </span>
            ) : null}
          </div>
          {dueToday && (
            <p
              className="inline-flex min-w-0 max-w-full items-start gap-1.5 rounded-md border border-amber-400/25 bg-amber-500/10 px-2 py-1 text-[11px] font-medium leading-snug text-amber-50 sm:max-w-[min(100%,36rem)] sm:items-center sm:text-xs"
              title={`Today · ${dueToday.contentType}: ${dueToday.title || dueToday.theme}`}
            >
              <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-200 sm:mt-0" />
              <span className="min-w-0 sm:truncate">
                <span className="font-semibold text-amber-100">Today</span>
                <span className="text-amber-100/70"> · </span>
                <span className="text-amber-50/95">
                  {dueToday.contentType}: {dueToday.title || dueToday.theme}
                </span>
              </span>
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {dueToday && onApplyDue && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2 text-[10px] text-amber-100 hover:bg-amber-500/15 hover:text-amber-50"
              onClick={onApplyDue}
            >
              <Sparkles className="h-3 w-3" />
              Use brief
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 gap-1 px-2 text-[10px] text-muted-foreground hover:text-foreground"
            onClick={onRequestNicheChange}
          >
            <ArrowRightLeft className="h-3 w-3" />
            Niche
          </Button>
        </div>
      </section>

      <Dialog open={nicheDialogOpen} onOpenChange={onNicheDialogOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Revise niche & answers?</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              You’ll re-enter Creator Coach to update your <strong>category</strong>,{" "}
              <strong>niches</strong>, and <strong>onboarding answers</strong>. Your{" "}
              <strong>entire weekly plan will be regenerated</strong> — current day themes and
              hooks will be replaced. Published content is not deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onNicheDialogOpenChange(false)}
            >
              Keep current niche
            </Button>
            <Button type="button" onClick={onConfirmNicheChange}>
              Continue to Coach
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default StudioPlanBanner;
