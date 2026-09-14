import { BrainCircuit, Check, Film, Loader2, Sparkles, WandSparkles } from "lucide-react";
import type {
  MemeTemplateDto,
  RecommendMemeResponseDto,
} from "../../../services/apiClient";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { MediaTileSelectCheckbox, mediaTileSelectionRing } from "../../../components/MediaTileSelectCheckbox";
import { cn } from "../../../lib/utils";
import { MemeTemplatePreview } from "./MemeTemplatePreview";

interface MemeDirectorPanelProps {
  templates: MemeTemplateDto[];
  response: RecommendMemeResponseDto | null;
  aspectRatio: string;
  selectedTemplateId: string | null;
  withBaseImage: boolean;
  isLoading: boolean;
  canAnalyze: boolean;
  onAnalyze: () => void;
  onChoose: (templateId: string, slots: Record<string, string>) => void;
  hasActiveWeekPlan?: boolean;
  onOpenWeekPlan?: () => void;
}

function stars(value: number): string {
  const count = Math.max(0, Math.min(5, Math.round(value)));
  return `${"★".repeat(count)}${"☆".repeat(5 - count)}`;
}

function label(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-300";
  if (score >= 60) return "text-amber-300";
  return "text-sky-300";
}

export function MemeDirectorPanel({
  templates,
  response,
  aspectRatio,
  selectedTemplateId,
  withBaseImage,
  isLoading,
  canAnalyze,
  onAnalyze,
  onChoose,
  hasActiveWeekPlan = false,
  onOpenWeekPlan,
}: MemeDirectorPanelProps) {
  const top = response?.rankings.slice(0, 5) || [];
  const canReviewPlan =
    Boolean(onOpenWeekPlan) &&
    (hasActiveWeekPlan || (response?.calendarPlan?.length || 0) > 0);

  return (
    <section className="overflow-hidden rounded-2xl border border-violet-500/25 bg-gradient-to-b from-violet-500/[0.12] via-background/70 to-cyan-500/[0.06] shadow-[0_18px_55px_-35px_rgba(139,92,246,0.8)]">
      <div className="border-b border-white/8 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <BrainCircuit className="h-4 w-4 text-violet-300" />
              <p className="text-xs font-bold">AI Creative Director</p>
              <Badge className="h-5 border-violet-400/20 bg-violet-400/10 px-1.5 text-[9px] text-violet-200">
                BETA
              </Badge>
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              Ranks layouts, protects visual focus, and rewrites your idea for each format.
              {response?.fanOutConsidered
                ? ` Fan-out scored ${response.fanOutConsidered} layouts.`
                : ""}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={onAnalyze}
            disabled={!canAnalyze || isLoading}
            className="h-8 shrink-0 gap-1.5 bg-gradient-to-r from-violet-600 to-cyan-600 px-2.5 text-[10px] text-white"
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <WandSparkles className="h-3 w-3" />
            )}
            {response ? "Re-analyze" : "Direct my post"}
          </Button>
        </div>

        {!canAnalyze && (
          <p className="mt-2 text-[10px] text-amber-300/90">
            Add an idea or prompt first so the director has a scene to analyze.
          </p>
        )}

        {response?.creativeBrief && (
          <div className="mt-3 rounded-xl border border-violet-400/15 bg-violet-500/[0.07] p-2.5">
            <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.16em] text-violet-200">
              Creative brief
            </p>
            <p className="text-[10px] leading-relaxed text-foreground/85">
              {response.creativeBrief}
            </p>
          </div>
        )}

        {response && (response.detections?.length || 0) > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Detected from your{" "}
              {response.visionSource === "vision" ? "image" : "brief"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {response.detections.slice(0, 6).map((item) => (
                <span
                  key={item.tag}
                  className="inline-flex items-center gap-1 rounded-full border border-cyan-400/15 bg-cyan-400/[0.08] px-2 py-1 text-[9px] text-cyan-100"
                  title={
                    item.source === "vision"
                      ? "Detected by image vision"
                      : item.source === "text_heuristic"
                      ? "Estimated from prompt text"
                      : "Provided scene signal"
                  }
                >
                  {label(item.tag)}
                  <strong className="tabular-nums text-cyan-300">{item.confidence}%</strong>
                </span>
              ))}
            </div>
            <p className="mt-1.5 text-[8px] text-muted-foreground/75">
              {response.visionSource === "vision"
                ? "Live vision tags are driving scene fit."
                : "Prompt-based estimate. Attach or generate an image, then re-analyze for vision."}
            </p>
          </div>
        )}
      </div>

      {top.length > 0 && (
        <div className="space-y-2 p-2">
          {top.map((rank, index) => {
            const template = templates.find((item) => item.id === rank.templateId);
            if (!template) return null;
            const rewrite = response?.rewrites.find(
              (item) => item.templateId === rank.templateId,
            );
            const contentScore = rank.contentScore || {
              overall: rank.score,
              readability: rank.score,
              virality: rank.score,
              moodMatch: rank.score,
              sceneFit: rank.score,
            };
            const slots =
              rewrite?.slots ||
              Object.fromEntries(
                template.slots.map((slot) => [slot.id, slot.placeholder || slot.label]),
              );
            const selected = selectedTemplateId === rank.templateId;

            return (
              <article
                key={rank.templateId}
                className={cn(
                  "overflow-hidden rounded-xl border bg-background/75 transition-all",
                  mediaTileSelectionRing(selected),
                  !selected && "border-white/10 hover:border-white/20",
                )}
              >
                <button
                  type="button"
                  onClick={() => onChoose(rank.templateId, slots)}
                  className="block w-full text-left"
                >
                  <div className="relative overflow-hidden bg-black/30">
                    <MemeTemplatePreview
                      template={template}
                      slotTexts={slots}
                      aspectRatio={aspectRatio}
                      withBaseImage={withBaseImage}
                      subjectFocus={response?.subjectFocus}
                      showMotion
                      className={cn(
                        "mx-auto max-h-52 bg-black/20",
                        aspectRatio === "9:16"
                          ? "aspect-[9/16] w-[54%]"
                          : aspectRatio === "4:5"
                            ? "aspect-[4/5] w-[72%]"
                            : aspectRatio === "16:9"
                              ? "aspect-video w-full"
                              : "aspect-square w-[78%]",
                      )}
                    />
                    <span className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-1 text-[9px] font-bold text-white backdrop-blur">
                      #{index + 1} · {rank.confidenceLabel} confidence
                    </span>
                    <MediaTileSelectCheckbox
                      checked={selected}
                      visible={selected}
                      className="absolute right-2 top-2 z-10 pointer-events-none"
                      compact
                      ariaLabel={selected ? "Selected direction" : undefined}
                    />
                  </div>

                  <div className="space-y-2 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-bold">{template.name}</p>
                        <p className="text-[10px] tracking-wide text-amber-300">
                          {stars(rank.stars)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={cn("text-lg font-black tabular-nums", scoreColor(contentScore.overall))}>
                          {contentScore.overall}
                        </p>
                        <p className="text-[8px] uppercase tracking-wider text-muted-foreground">
                          Content score
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1">
                      {[
                        ["Read", contentScore.readability],
                        ["Viral", contentScore.virality],
                        ["Mood", contentScore.moodMatch],
                        ["Scene", contentScore.sceneFit],
                      ].map(([name, score]) => (
                        <div key={String(name)} className="rounded-md bg-white/[0.04] px-1 py-1 text-center">
                          <p className="text-[9px] font-bold tabular-nums">{score}</p>
                          <p className="text-[7px] uppercase text-muted-foreground">{name}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1">
                      {rank.reasons.slice(0, 2).map((reason) => (
                        <p key={reason} className="flex gap-1.5 text-[9px] leading-snug text-foreground/80">
                          <Check className="mt-0.5 h-2.5 w-2.5 shrink-0 text-emerald-400" />
                          {reason}
                        </p>
                      ))}
                      <p className="flex gap-1.5 text-[9px] leading-snug text-foreground/80">
                        <Film className="mt-0.5 h-2.5 w-2.5 shrink-0 text-violet-300" />
                        Motion preview: {rank.animationLabel}
                      </p>
                    </div>

                    {rewrite?.textFit && (
                      <div
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-[9px]",
                          rewrite.textFit.status === "ideal"
                            ? "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-200"
                            : "border-amber-500/20 bg-amber-500/[0.07] text-amber-100",
                        )}
                      >
                        <span>{rewrite.textFit.message}</span>
                        <span className="shrink-0 font-bold">
                          {rewrite.textFit.idealMin}–{rewrite.textFit.idealMax} ideal
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-center gap-1 rounded-lg bg-violet-500/10 py-1.5 text-[9px] font-bold text-violet-200">
                      <Sparkles className="h-2.5 w-2.5" />
                      {selected ? "Selected" : "Use this direction"}
                    </div>
                  </div>
                </button>
              </article>
            );
          })}

          {canReviewPlan && top.length > 0 && (
            <button
              type="button"
              onClick={onOpenWeekPlan}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/[0.08] px-3 py-2.5 text-left transition-colors hover:border-cyan-400/40"
            >
              <div>
                <p className="text-[10px] font-bold text-cyan-100">Review 7-day plan</p>
                <p className="text-[9px] text-muted-foreground">
                  {hasActiveWeekPlan
                    ? "Open canvas to check progress or cancel"
                    : "Full day previews + activate in the preview area"}
                </p>
              </div>
              <Film className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
            </button>
          )}
        </div>
      )}

      {canReviewPlan && top.length === 0 && (
        <div className="p-2">
          <button
            type="button"
            onClick={onOpenWeekPlan}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/[0.08] px-3 py-2.5 text-left transition-colors hover:border-cyan-400/40"
          >
            <div>
              <p className="text-[10px] font-bold text-cyan-100">Review 7-day plan</p>
              <p className="text-[9px] text-muted-foreground">
                Open canvas to check progress or cancel
              </p>
            </div>
            <Film className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
          </button>
        </div>
      )}
    </section>
  );
}
