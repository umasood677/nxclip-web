import { useEffect, useRef, useState } from "react";
import {
  BrainCircuit,
  Check,
  ChevronDown,
  Loader2,
  Play,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { contentApi } from "../../services/apiClient";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { cn } from "../../lib/utils";
import { waitForClipTranscript } from "./clipPolishPrep";

export type CoachMode =
  | "auto"
  | "viral_short"
  | "professional"
  | "event_highlight"
  | "documentary"
  | "high_energy";

export interface ClipCoachResult {
  provider: string;
  creativeBrief: {
    source: string;
    creatorContext: string;
    mode: CoachMode;
    contentType: string;
    summary: string;
    evidence: string;
    confidence: number;
    captionReviewRequired: boolean;
    moments: Array<{ time: number; label: string; reason: string }>;
    recommendations: string[];
    storyOptions?: Array<{ id: string; title: string; rationale?: string }>;
    selectedStoryId?: string;
  };
  editPlan: {
    narrative: string;
    segments: Array<{ start: number; end: number; purpose: string }>;
    hookOverlay: string;
    captionStyle: string;
    duckBgm?: boolean;
    contextOverlay?: string;
    captionEmphasis?: string[];
    recommendations: string[];
  };
}

/** Live preview payload pushed onto the Clip Studio canvas. */
export type CoachPreviewPayload = {
  hookText: string;
  contextText?: string;
  captionStyle: string;
  segments: Array<{ start: number; end: number; purpose: string }>;
};

const modes: Array<[CoachMode, string]> = [
  ["auto", "Auto"],
  ["viral_short", "Viral Short"],
  ["professional", "Clean Professional"],
  ["event_highlight", "Event Highlight"],
  ["documentary", "Story / Documentary"],
  ["high_energy", "High Energy"],
];

const ANALYZE_STEPS = [
  "Saving your draft…",
  "Listening for speech…",
  "Finding the strongest story…",
  "Building your edit checklist…",
] as const;

export function ClipCoachPanel({
  id,
  context,
  onContext,
  duration,
  save,
  onBeats,
  onUnderstanding,
  onPreview,
  seek,
}: {
  id: string;
  context: string;
  onContext: (v: string) => void;
  duration: number;
  save: () => Promise<unknown>;
  onBeats: (m: Array<{ time: number; label: string }>) => void;
  onUnderstanding: (result: ClipCoachResult) => void;
  /** Push hook/context onto the video preview using Clip Studio caption theme. */
  onPreview?: (payload: CoachPreviewPayload | null) => void;
  seek: (time: number) => void;
}) {
  const [mode, setMode] = useState<CoachMode>("auto");
  const [result, setResult] = useState<ClipCoachResult | null>(null);
  const [draftPlan, setDraftPlan] = useState<
    ClipCoachResult["editPlan"] | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [analyzeStep, setAnalyzeStep] = useState(0);
  const [applied, setApplied] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const latest = useRef({ id, context, mode });
  latest.current = { id, context, mode };

  useEffect(() => {
    let alive = true;
    setResult(null);
    setDraftPlan(null);
    setApplied(false);
    setChecked({});
    onPreview?.(null);
    void contentApi
      .getOwnedContentById(id, { suppressErrorLog: true })
      .then((item) => {
        if (!alive) return;
        const extras = item.clipEditSpec?.extras as
          | Record<string, unknown>
          | undefined;
        setTranscript(item.clipEditSpec?.transcript || "");
        setReviewed(extras?.clipCoachCaptionsReviewed === true);
        const stored = extras?.clipCoach as ClipCoachResult | undefined;
        if (stored?.creativeBrief && stored?.editPlan) {
          setResult(stored);
          setDraftPlan(stored.editPlan);
          setMode(stored.creativeBrief.mode || "auto");
          setApplied(extras?.viralEditApplied === true);
          setChecked(defaultChecks(stored.editPlan));
          onUnderstanding(stored);
          if (extras?.viralEditApplied === true) {
            pushPreview(stored.editPlan);
          }
        }
      })
      .catch(() => {
        /* Existing editor handles load errors. */
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remount per clip id
  }, [id]);

  const current = Boolean(
    result &&
      result.creativeBrief.creatorContext === context &&
      result.creativeBrief.mode === mode,
  );
  const plan = draftPlan || result?.editPlan;
  const proposedSec = plan
    ? plan.segments.reduce((n, s) => n + Math.max(0, s.end - s.start), 0)
    : 0;
  const validPlan = Boolean(
    plan &&
      plan.segments.length > 0 &&
      plan.segments.length <= 12 &&
      plan.segments.every(
        (s) =>
          Number.isFinite(s.start) &&
          Number.isFinite(s.end) &&
          s.start >= 0 &&
          s.end <= duration + 0.05 &&
          s.end - s.start >= 0.5,
      ),
  );

  function defaultChecks(p: ClipCoachResult["editPlan"]): Record<string, boolean> {
    const next: Record<string, boolean> = {};
    p.segments.forEach((_, i) => {
      next[`seg-${i}`] = true;
    });
    if (p.hookOverlay?.trim()) next.hook = true;
    if (p.contextOverlay?.trim()) next.context = true;
    if (p.duckBgm) next.duck = true;
    return next;
  }

  function pushPreview(p: ClipCoachResult["editPlan"]) {
    onPreview?.({
      hookText: p.hookOverlay || "",
      contextText: p.contextOverlay || undefined,
      captionStyle: p.captionStyle || "clean_subtitle",
      segments: p.segments,
    });
  }

  const toggleCheck = (key: string) =>
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));

  const analyze = async () => {
    const snapshot = { id, context, mode };
    setBusy(true);
    setAnalyzeStep(0);
    try {
      setAnalyzeStep(0);
      await save();
      setAnalyzeStep(1);
      const item = await contentApi.getOwnedContentById(id, {
        suppressErrorLog: true,
      });
      if (typeof item.clipEditSpec?.transcript !== "string") {
        await contentApi.transcribeClip(id);
        await waitForClipTranscript(
          () => contentApi.getOwnedContentById(id, { suppressErrorLog: true }),
          { isCancelled: () => latest.current.id !== id },
        );
      }
      setTranscript(
        (
          await contentApi.getOwnedContentById(id, { suppressErrorLog: true })
        ).clipEditSpec?.transcript || "",
      );
      setReviewed(false);
      setAnalyzeStep(2);
      const next = await contentApi.analyzeClipCoach(id, {
        creatorContext: context,
        mode,
        durationSec: duration,
      });
      setAnalyzeStep(3);
      if (JSON.stringify(snapshot) !== JSON.stringify(latest.current)) {
        toast.message("Context changed. Analyze again.");
        return;
      }
      setResult(next);
      setDraftPlan(next.editPlan);
      setChecked(defaultChecks(next.editPlan));
      setApplied(false);
      onBeats(next.creativeBrief.moments);
      onUnderstanding(next);
      pushPreview(next.editPlan);
      const first = next.editPlan.segments[0];
      if (first && Number.isFinite(first.start)) seek(first.start);
      toast.success("Edit checklist ready — preview is on your clip");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "AI Coach could not analyze this clip. Your original is unchanged.",
      );
    } finally {
      setBusy(false);
      setAnalyzeStep(0);
    }
  };

  const apply = async (value: boolean) => {
    if (!plan || !result) return;
    setBusy(true);
    try {
      await save();
      // Only include checked segments / overlays.
      const filteredSegments = plan.segments.filter(
        (_, i) => checked[`seg-${i}`] !== false,
      );
      if (value && filteredSegments.length === 0) {
        toast.error("Select at least one moment in the checklist.");
        return;
      }
      const customizedPlan = {
        ...plan,
        segments: filteredSegments,
        hookOverlay: checked.hook === false ? "" : plan.hookOverlay,
        contextOverlay: checked.context === false ? undefined : plan.contextOverlay,
        duckBgm: checked.duck === false ? false : plan.duckBgm,
      };
      const item = await contentApi.applyClipCoach(
        id,
        value,
        reviewed,
        value
          ? {
              plan: customizedPlan,
              expectedContext: result.creativeBrief.creatorContext,
              expectedMode: result.creativeBrief.mode,
            }
          : undefined,
      );
      const stored = (
        item.clipEditSpec?.extras as Record<string, unknown> | undefined
      )?.clipCoach as ClipCoachResult | undefined;
      if (stored?.creativeBrief && stored?.editPlan) {
        setResult(stored);
        setDraftPlan(stored.editPlan);
        onUnderstanding(stored);
      }
      setApplied(value);
      if (value) {
        pushPreview(customizedPlan);
        const first = customizedPlan.segments[0];
        if (first) seek(first.start);
      } else {
        onPreview?.(null);
      }
      toast.success(
        value
          ? "Viral Edit applied — check the preview, then Render"
          : "Back to your original trim",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update the edit. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card/60 p-4 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="ui-icon-chip-primary w-8 h-8 shrink-0">
            <BrainCircuit size={16} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold leading-tight">AI Coach</h2>
            <p className="text-[11px] text-muted-foreground truncate">
              Optional — turn raw footage into a short story edit
            </p>
          </div>
        </div>
        <select
          aria-label="AI Coach editing mode"
          className="rounded-md border border-border bg-background px-2 py-1.5 text-[11px] shrink-0"
          value={mode}
          disabled={busy}
          onChange={(e) => setMode(e.target.value as CoachMode)}
        >
          {modes.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="creator-context" className="text-[11px] font-medium text-muted-foreground">
          What should viewers notice?{" "}
          <span className="font-mono">{context.length}/500</span>
        </label>
        <Textarea
          id="creator-context"
          value={context}
          maxLength={500}
          disabled={busy}
          onChange={(e) => onContext(e.target.value)}
          className="min-h-[4.5rem] text-sm"
          placeholder="e.g. AWS Summit cloud gaming demo — focus on her reaction"
        />
      </div>

      <Button
        className="w-full font-bold gap-2"
        onClick={() => void analyze()}
        disabled={busy || duration <= 0 || duration > 900}
      >
        {busy ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Sparkles size={16} />
        )}
        {busy
          ? ANALYZE_STEPS[analyzeStep] || "Working…"
          : result
            ? "Re-analyze"
            : "Create Viral Edit"}
      </Button>

      {busy ? (
        <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3" aria-live="polite">
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <Loader2 size={14} className="animate-spin shrink-0" />
            {ANALYZE_STEPS[analyzeStep]}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {ANALYZE_STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-colors",
                  i <= analyzeStep ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Your original clip stays unchanged until you Apply.
          </p>
        </div>
      ) : null}

      {!busy && result && plan ? (
        <div className="space-y-3 border-t border-border pt-3">
          <div className="rounded-lg bg-muted/40 px-3 py-2 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
              {result.creativeBrief.contentType.replaceAll("-", " ")}
            </p>
            <p className="text-sm font-medium leading-snug">
              {result.creativeBrief.summary}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {duration.toFixed(0)}s → ~{proposedSec.toFixed(0)}s edit · preview
              is on the player
            </p>
          </div>

          {(result.creativeBrief.storyOptions?.length ?? 0) > 1 ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold">Pick a story focus</p>
              <div className="flex flex-col gap-1.5">
                {result.creativeBrief.storyOptions!.slice(0, 3).map((opt, index) => {
                  const selected =
                    (result.creativeBrief.selectedStoryId ||
                      result.creativeBrief.storyOptions![0]?.id) === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setResult({
                          ...result,
                          creativeBrief: {
                            ...result.creativeBrief,
                            selectedStoryId: opt.id,
                          },
                        });
                        if (index > 0) {
                          onContext(
                            [context.trim(), `Focus: ${opt.title}`]
                              .filter(Boolean)
                              .join(". ")
                              .slice(0, 500),
                          );
                          toast.message("Focus updated — tap Re-analyze");
                        }
                      }}
                      className={cn(
                        "text-left rounded-md border px-3 py-2 text-xs transition-colors",
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/40",
                      )}
                    >
                      <span className="font-semibold">
                        {index === 0 ? "Best · " : ""}
                        {opt.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {!current ? (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              Context or mode changed — tap Re-analyze before Apply.
            </p>
          ) : null}

          <div className="space-y-1">
            <p className="text-[11px] font-semibold">Edit checklist</p>
            <p className="text-[10px] text-muted-foreground mb-1">
              Uncheck anything you do not want. Tap play to preview on the clip.
            </p>
            <ul className="space-y-1.5">
              {plan.segments.map((s, i) => (
                <li
                  key={`seg-${i}`}
                  className="flex items-center gap-2 rounded-md border border-border bg-background/70 px-2 py-1.5"
                >
                  <button
                    type="button"
                    aria-pressed={checked[`seg-${i}`] !== false}
                    onClick={() => toggleCheck(`seg-${i}`)}
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                      checked[`seg-${i}`] !== false
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border",
                    )}
                  >
                    {checked[`seg-${i}`] !== false ? (
                      <Check size={12} strokeWidth={3} />
                    ) : null}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate capitalize">
                      {s.purpose || `Moment ${i + 1}`}
                    </p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      {s.start.toFixed(1)}s – {s.end.toFixed(1)}s
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[10px] gap-1"
                    onClick={() => {
                      seek(s.start);
                      pushPreview(plan);
                    }}
                  >
                    <Play size={12} />
                    Preview
                  </Button>
                </li>
              ))}

              {plan.hookOverlay?.trim() ? (
                <li className="flex items-start gap-2 rounded-md border border-border bg-background/70 px-2 py-1.5">
                  <button
                    type="button"
                    aria-pressed={checked.hook !== false}
                    onClick={() => toggleCheck("hook")}
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                      checked.hook !== false
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border",
                    )}
                  >
                    {checked.hook !== false ? (
                      <Check size={12} strokeWidth={3} />
                    ) : null}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Hook on clip
                    </p>
                    <p className="text-xs font-medium leading-snug">
                      {plan.hookOverlay}
                    </p>
                  </div>
                </li>
              ) : null}

              {plan.contextOverlay?.trim() ? (
                <li className="flex items-start gap-2 rounded-md border border-border bg-background/70 px-2 py-1.5">
                  <button
                    type="button"
                    aria-pressed={checked.context !== false}
                    onClick={() => toggleCheck("context")}
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                      checked.context !== false
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border",
                    )}
                  >
                    {checked.context !== false ? (
                      <Check size={12} strokeWidth={3} />
                    ) : null}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Context line
                    </p>
                    <p className="text-xs leading-snug">{plan.contextOverlay}</p>
                  </div>
                </li>
              ) : null}

              {plan.duckBgm ? (
                <li className="flex items-center gap-2 rounded-md border border-border bg-background/70 px-2 py-1.5">
                  <button
                    type="button"
                    aria-pressed={checked.duck !== false}
                    onClick={() => toggleCheck("duck")}
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                      checked.duck !== false
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border",
                    )}
                  >
                    {checked.duck !== false ? (
                      <Check size={12} strokeWidth={3} />
                    ) : null}
                  </button>
                  <p className="text-xs">Lower music while people speak</p>
                </li>
              ) : null}
            </ul>
          </div>

          {result.creativeBrief.captionReviewRequired ? (
            <label className="flex gap-2 items-start text-[11px] rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-2">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={reviewed}
                onChange={(e) => setReviewed(e.target.checked)}
              />
              <span>
                I checked speech captions against the audio
                {transcript ? (
                  <span className="block mt-1 text-muted-foreground line-clamp-2">
                    {transcript}
                  </span>
                ) : null}
              </span>
            </label>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              className="flex-1 font-bold"
              disabled={
                busy ||
                !current ||
                !validPlan ||
                (result.creativeBrief.captionReviewRequired && !reviewed)
              }
              onClick={() => void apply(true)}
            >
              {applied ? "Update applied edit" : "Apply to clip"}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              disabled={busy}
              onClick={() => void apply(false)}
            >
              Keep original
            </Button>
          </div>

          <button
            type="button"
            className="flex w-full items-center justify-between text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            Advanced options
            <ChevronDown
              size={14}
              className={cn("transition-transform", showAdvanced && "rotate-180")}
            />
          </button>

          {showAdvanced ? (
            <div className="space-y-2 rounded-md border border-border p-3 text-xs">
              <label className="block space-y-1">
                <span className="text-muted-foreground">Hook text</span>
                <input
                  className="w-full rounded border border-border bg-background p-2"
                  maxLength={120}
                  value={plan.hookOverlay}
                  onChange={(e) => {
                    const next = { ...plan, hookOverlay: e.target.value };
                    setDraftPlan(next);
                    pushPreview(next);
                  }}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-muted-foreground">Context line</span>
                <input
                  className="w-full rounded border border-border bg-background p-2"
                  maxLength={120}
                  value={plan.contextOverlay || ""}
                  onChange={(e) => {
                    const next = { ...plan, contextOverlay: e.target.value };
                    setDraftPlan(next);
                    pushPreview(next);
                  }}
                />
              </label>
              <label className="flex items-center gap-2">
                Caption style
                <select
                  className="rounded border border-border bg-background p-1.5"
                  value={plan.captionStyle}
                  onChange={(e) => {
                    const next = { ...plan, captionStyle: e.target.value };
                    setDraftPlan(next);
                    pushPreview(next);
                  }}
                >
                  <option value="clean_subtitle">Clean subtitles</option>
                  <option value="kinetic_hormozi">Kinetic captions</option>
                </select>
              </label>
              {(result.editPlan.recommendations.length > 0 ||
                result.creativeBrief.recommendations.length > 0) && (
                <div className="pt-1">
                  <p className="text-muted-foreground mb-1">Suggestions only</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                    {[
                      ...result.creativeBrief.recommendations,
                      ...result.editPlan.recommendations,
                    ]
                      .slice(0, 4)
                      .map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
