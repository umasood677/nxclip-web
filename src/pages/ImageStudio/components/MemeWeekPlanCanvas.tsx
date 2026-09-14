import { CalendarDays, Loader2, X } from "lucide-react";
import type {
  MemeTemplateDto,
  RecommendMemeResponseDto,
  WeekPlanDto,
} from "../../../services/apiClient";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";
import { MemeTemplatePreview } from "./MemeTemplatePreview";

export interface WeekPlanDayView {
  day: string;
  templateId: string;
  templateName: string;
  theme?: string;
  hook?: string;
  bestTimeLocal: string;
  platformTip?: string;
  status?: string;
  publishAt?: string;
  slots: Record<string, string>;
}

interface MemeWeekPlanCanvasProps {
  templates: MemeTemplateDto[];
  days: WeekPlanDayView[];
  selectedIndex: number;
  onSelectDay: (index: number) => void;
  aspectRatio: string;
  activePlan: WeekPlanDto | null;
  isActivating: boolean;
  isCancelling: boolean;
  canActivate: boolean;
  onActivate: () => void;
  onCancel: () => void;
  onUseDay: () => void;
  onClose: () => void;
}

export function MemeWeekPlanCanvas({
  templates,
  days,
  selectedIndex,
  onSelectDay,
  aspectRatio,
  activePlan,
  isActivating,
  isCancelling,
  canActivate,
  onActivate,
  onCancel,
  onUseDay,
  onClose,
}: MemeWeekPlanCanvasProps) {
  const selected = days[selectedIndex] || days[0];
  const template = selected
    ? templates.find((item) => item.id === selected.templateId)
    : undefined;

  return (
    <div className="flex h-full min-h-[28rem] flex-col gap-3 rounded-2xl border border-cyan-400/20 bg-gradient-to-b from-cyan-500/[0.08] via-background/80 to-violet-500/[0.06] p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-cyan-300" />
            <p className="text-xs font-bold">7-day plan</p>
            {activePlan ? (
              <Badge className="h-5 border-emerald-400/20 bg-emerald-400/10 px-1.5 text-[9px] text-emerald-200">
                Active
              </Badge>
            ) : (
              <Badge className="h-5 border-white/10 bg-white/5 px-1.5 text-[9px] text-muted-foreground">
                Preview
              </Badge>
            )}
          </div>
          <p className="mt-1 max-w-md text-[10px] leading-relaxed text-muted-foreground">
            Creates 7 draft memes and auto-publishes them to nxClip on the suggested days.
            Does not post to social Live yet.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 w-8 rounded-full p-0"
          onClick={onClose}
          aria-label="Back to draft preview"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {days.map((day, index) => {
          const active = index === selectedIndex;
          return (
            <button
              key={`${day.day}-${day.templateId}-${index}`}
              type="button"
              onClick={() => onSelectDay(index)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors",
                active
                  ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-100"
                  : "border-white/10 bg-black/20 text-muted-foreground hover:border-cyan-400/30",
              )}
            >
              {day.day}
              {day.status ? (
                <span className="ml-1 font-normal opacity-70">· {day.status}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/30">
          {template && selected ? (
            <MemeTemplatePreview
              template={template}
              slotTexts={selected.slots}
              aspectRatio={aspectRatio}
              withBaseImage={false}
              showMotion
              className={cn(
                "mx-auto max-h-[22rem] w-full bg-black/20",
                aspectRatio === "9:16"
                  ? "aspect-[9/16] max-w-[14rem]"
                  : aspectRatio === "4:5"
                    ? "aspect-[4/5] max-w-[16rem]"
                    : aspectRatio === "16:9"
                      ? "aspect-video max-w-full"
                      : "aspect-square max-w-[18rem]",
              )}
            />
          ) : (
            <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
              No layout for this day
            </div>
          )}
        </div>

        <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-2.5">
          <p className="text-[11px] font-bold">{selected?.templateName || "Layout"}</p>
          {selected?.theme ? (
            <p className="text-[9px] text-muted-foreground">{selected.theme}</p>
          ) : null}
          <p className="text-[10px] leading-relaxed text-foreground/85">
            {selected?.hook || "No hook yet"}
          </p>
          <div className="rounded-lg bg-white/[0.04] px-2 py-1.5 text-[9px] text-cyan-100/90">
            {selected?.bestTimeLocal}
            {selected?.publishAt
              ? ` · ${new Date(selected.publishAt).toLocaleString()}`
              : " local"}
          </div>
          {selected?.platformTip ? (
            <p className="text-[9px] leading-snug text-muted-foreground">{selected.platformTip}</p>
          ) : null}

          <div className="space-y-1.5 pt-1">
            <Button
              type="button"
              size="sm"
              className="h-8 w-full text-[10px]"
              variant="secondary"
              onClick={onUseDay}
              disabled={!selected}
            >
              Use this day&apos;s direction
            </Button>
            {activePlan ? (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="h-8 w-full text-[10px]"
                onClick={onCancel}
                disabled={isCancelling}
              >
                {isCancelling ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Cancel plan
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                className="h-8 w-full bg-gradient-to-r from-cyan-600 to-violet-600 text-[10px] text-white"
                onClick={onActivate}
                disabled={!canActivate || isActivating}
              >
                {isActivating ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Activate plan
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 w-full text-[10px]"
              onClick={onClose}
            >
              Back to draft preview
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Build canvas day rows from recommend response and/or an active plan. */
export function buildWeekPlanDays(
  response: RecommendMemeResponseDto | null,
  activePlan: WeekPlanDto | null,
  templates: MemeTemplateDto[],
): WeekPlanDayView[] {
  if (activePlan?.slots?.length) {
    return activePlan.slots
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((slot) => {
        const template = templates.find((t) => t.id === slot.templateId);
        const slotsFromTexts = Object.fromEntries(
          (slot.texts || []).map((entry) => [entry.slot, entry.text]),
        );
        const rewrite = response?.rewrites.find((item) => item.templateId === slot.templateId);
        return {
          day: slot.day,
          templateId: slot.templateId,
          templateName: slot.templateName || template?.name || slot.templateId,
          theme: slot.theme,
          hook: slot.hook,
          bestTimeLocal: slot.bestTimeLocal,
          platformTip: slot.platformTip,
          status: slot.status,
          publishAt: slot.publishAt,
          slots: {
            ...(rewrite?.slots || {}),
            ...slotsFromTexts,
          },
        };
      });
  }

  return (response?.calendarPlan || []).map((slot) => {
    const rewrite = response?.rewrites.find((item) => item.templateId === slot.templateId);
    const template = templates.find((t) => t.id === slot.templateId);
    const fallbackSlots = Object.fromEntries(
      (template?.slots || []).map((s) => [s.id, s.placeholder || s.label]),
    );
    return {
      day: slot.day,
      templateId: slot.templateId,
      templateName: slot.templateName,
      theme: slot.theme,
      hook: slot.hook,
      bestTimeLocal: slot.bestTimeLocal,
      platformTip: slot.platformTip,
      slots: rewrite?.slots || fallbackSlots,
    };
  });
}
