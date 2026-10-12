import { useEffect, useRef, useState } from "react";
import {
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  Play,
  Sparkles,
  Type,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { contentApi } from "../../services/apiClient";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import { cn } from "../../lib/utils";
import {
  CLIP_CAPTION_FONTS,
  type ClipCaptionFontId,
} from "../../lib/clipCaptionFonts";
import { waitForClipTranscript } from "./clipPolishPrep";
import {
  coachBgmTitle,
  resolveCoachImpactPack,
  sanitizeCreatorContext,
} from "./coachImpactPlan";

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
  /** Checked moments in order — player stitches these when you play the whole clip. */
  textCuts?: Array<{ start: number; end: number; show: boolean }>;
  /** Join after each cut (length = textCuts.length - 1). */
  joins?: Array<"cut" | "crossfade" | "flash" | "none">;
};

export type CoachModeImpact = {
  mode: CoachMode;
  bgmTrackId: string;
  label: string;
  captionStyle?: "clean_subtitle" | "kinetic_hormozi";
  segments?: Array<{ start: number; end: number; purpose: string }>;
};

type CutJoin = "cut" | "crossfade" | "flash" | "none";

const MODE_EFFECT: Record<CoachMode, string> = {
  auto: "Auto picks music from the footage type (event clips often share Future Bass). Pick another mode to force a different track.",
  viral_short: "Viral Short → Future Bass + flash joins. Play the clip to hear it. Re-analyze to rebuild moments.",
  professional: "Clean Professional → Lo-Fi Gaming + soft fades. Play the clip to hear it. Re-analyze to rebuild moments.",
  event_highlight: "Event Highlight → Epic Victory + hard cuts. Play the clip to hear it. Re-analyze to rebuild moments.",
  documentary: "Story → Dark Souls + crossfades. Play the clip to hear it. Re-analyze to rebuild moments.",
  high_energy: "High Energy → Aggressive Phonk + flashes. Play the clip to hear it. Re-analyze to rebuild moments.",
};

const modes: Array<[CoachMode, string]> = [
  ["auto", "Auto"],
  ["viral_short", "Viral Short"],
  ["professional", "Clean Professional"],
  ["event_highlight", "Event Highlight"],
  ["documentary", "Story / Documentary"],
  ["high_energy", "High Energy"],
];

function formatKeepLabel(purpose: string | undefined, index: number): string {
  const cleaned = (purpose || `Moment ${index + 1}`)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return `Moment ${index + 1}`;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

const ANALYZE_STEPS = [
  "Saving your draft…",
  "Listening for speech…",
  "Picking keep-ranges + audio pack…",
  "Building cut / BGM / transition plan…",
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
  onModeImpact,
  onApplied,
  seek,
  previewSegment,
  previewStitch,
  previewBgm,
  layout = "stack",
  captionFontId,
  onCaptionFontId,
  captionStyle,
  onCaptionStyle,
}: {
  id: string;
  context: string;
  onContext: (v: string) => void;
  duration: number;
  save: (opts?: { creatorContext?: string }) => Promise<unknown>;
  onBeats: (m: Array<{ time: number; label: string }>) => void;
  onUnderstanding: (result: ClipCoachResult) => void;
  /** Push hook/context onto the video preview using Clip Studio caption theme. */
  onPreview?: (payload: CoachPreviewPayload | null) => void;
  /** Dropdown change: switch music and caption style immediately. Cuts still need Re-analyze. */
  onModeImpact?: (impact: CoachModeImpact) => void;
  /** After Apply — parent should sync trim + overlays on the player. */
  onApplied?: (plan: ClipCoachResult["editPlan"]) => void;
  seek: (time: number) => void;
  /** Play only this keep-range on the player so the user can hear/see that cut. */
  previewSegment?: (startSec: number, endSec: number) => void;
  /** Play all checked moments in order (skips gaps) before Download. */
  previewStitch?: () => void;
  /** Audition the Coach-selected BGM under the current clip. */
  previewBgm?: () => void;
  /** sidebar = sits beside the clip player (sticky pane). */
  layout?: "stack" | "sidebar";
  captionFontId?: ClipCaptionFontId;
  onCaptionFontId?: (id: ClipCaptionFontId) => void;
  captionStyle?: "clean_subtitle" | "kinetic_hormozi";
  onCaptionStyle?: (style: "clean_subtitle" | "kinetic_hormozi") => void;
}) {
  const sidebar = layout === "sidebar";
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
  const [cutTransitions, setCutTransitions] = useState<CutJoin[]>([]);
  const [textOnCut, setTextOnCut] = useState<boolean[]>([]);
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
          const storedText = Array.isArray(extras?.coachCutText)
            ? (extras.coachCutText as boolean[])
            : undefined;
          const flags = stored.editPlan.segments.map((_, i) => storedText?.[i] !== false);
          setTextOnCut(flags);
          const storedJoins = Array.isArray(extras?.coachCutTransitions)
            ? (extras.coachCutTransitions as Array<{ type?: string }>)
            : [];
          if (storedJoins.length) {
            setCutTransitions(
              storedJoins.map((t) =>
                t.type === "none" || t.type === "flash" || t.type === "crossfade" || t.type === "cut"
                  ? t.type
                  : "cut",
              ),
            );
          }
          onUnderstanding(stored);
          if (extras?.viralEditApplied === true) {
            pushPreview(stored.editPlan, flags);
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
      sanitizeCreatorContext(result.creativeBrief.creatorContext) ===
        sanitizeCreatorContext(context) &&
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
    next.duck = p.duckBgm !== false;
    return next;
  }

  function textFlagsFor(p: ClipCoachResult["editPlan"], flags?: boolean[]) {
    const source = flags ?? textOnCut;
    return p.segments.map((_, i) => source[i] !== false);
  }

  function pushPreview(
    p: ClipCoachResult["editPlan"],
    flags?: boolean[],
    checks?: Record<string, boolean>,
    joinsOverride?: CutJoin[],
  ) {
    const show = textFlagsFor(p, flags);
    const checkMap = checks ?? checked;
    const joinsSrc = joinsOverride ?? cutTransitions;
    const keptIdx = p.segments
      .map((_, i) => i)
      .filter((i) => checkMap[`seg-${i}`] !== false);
    const pack = result
      ? resolveCoachImpactPack(mode, result.creativeBrief.contentType)
      : resolveCoachImpactPack(mode);
    const hookOn = (checkMap.hook ?? checked.hook) !== false;
    const contextOn = (checkMap.context ?? checked.context) !== false;
    onPreview?.({
      hookText: hookOn ? p.hookOverlay || "" : "",
      contextText: contextOn ? p.contextOverlay || undefined : undefined,
      captionStyle: p.captionStyle || "clean_subtitle",
      segments: keptIdx.map((i) => p.segments[i]!),
      textCuts: keptIdx.map((i) => ({
        start: p.segments[i]!.start,
        end: p.segments[i]!.end,
        show: show[i] !== false,
      })),
      joins: keptIdx.slice(0, -1).map(
        (i) => joinsSrc[i] || pack.junctionType,
      ),
    });
  }

  function applyMode(nextMode: CoachMode) {
    setMode(nextMode);
    const pack = resolveCoachImpactPack(nextMode, result?.creativeBrief.contentType);
    if (plan) {
      setCutTransitions(
        Array.from({ length: Math.max(0, plan.segments.length - 1) }, () => pack.junctionType),
      );
    }
    const captionStyle =
      nextMode === "viral_short" || nextMode === "high_energy"
        ? "kinetic_hormozi"
        : nextMode === "auto"
          ? undefined
          : "clean_subtitle";
    if (captionStyle) onCaptionStyle?.(captionStyle);
    onModeImpact?.({
      mode: nextMode,
      bgmTrackId: pack.bgmTrackId,
      label: pack.label,
      captionStyle,
      segments: plan?.segments,
    });
  }

  function updateDraftPlan(next: ClipCoachResult["editPlan"]) {
    setDraftPlan(next);
    setChecked(defaultChecks(next));
    pushPreview(next);
  }

  function moveSegment(index: number, dir: -1 | 1) {
    if (!plan) return;
    const target = index + dir;
    if (target < 0 || target >= plan.segments.length) return;
    const segments = [...plan.segments];
    const tmp = segments[index]!;
    segments[index] = segments[target]!;
    segments[target] = tmp;
    const flags = textFlagsFor(plan);
    const flag = flags[index]!;
    flags[index] = flags[target]!;
    flags[target] = flag;
    setTextOnCut(flags);
    const next = { ...plan, segments };
    setDraftPlan(next);
    setChecked(defaultChecks(next));
    pushPreview(next, flags);
  }

  function updateSegmentTime(
    index: number,
    field: "start" | "end",
    raw: string,
  ) {
    if (!plan) return;
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    const segments = plan.segments.map((s, i) => {
      if (i !== index) return s;
      const next = { ...s, [field]: Math.max(0, Math.min(duration, value)) };
      if (next.end - next.start < 0.5) {
        if (field === "start") next.start = Math.max(0, next.end - 0.5);
        else next.end = Math.min(duration, next.start + 0.5);
      }
      return next;
    });
    updateDraftPlan({ ...plan, segments });
  }

  const toggleCheck = (key: string) => {
    if (!plan) {
      setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
      return;
    }
    setChecked((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      pushPreview(plan, undefined, next);
      return next;
    });
  };

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
      const contextForAnalyze = sanitizeCreatorContext(context);
      if (contextForAnalyze !== context) onContext(contextForAnalyze);
      const next = await contentApi.analyzeClipCoach(id, {
        creatorContext: contextForAnalyze,
        mode,
        durationSec: duration,
      });
      setAnalyzeStep(3);
      if (
        latest.current.id !== id ||
        latest.current.mode !== mode ||
        sanitizeCreatorContext(latest.current.context) !== contextForAnalyze
      ) {
        toast.message("Context changed. Analyze again.");
        return;
      }
      setResult(next);
      setDraftPlan(next.editPlan);
      setChecked(defaultChecks(next.editPlan));
      const flags = next.editPlan.segments.map(() => true);
      setTextOnCut(flags);
      setCutTransitions(
        Array.from({ length: Math.max(0, next.editPlan.segments.length - 1) }, () => {
          const pack = resolveCoachImpactPack(next.creativeBrief.mode, next.creativeBrief.contentType);
          return pack.junctionType;
        }),
      );
      setApplied(false);
      onBeats(next.creativeBrief.moments);
      onUnderstanding(next);
      pushPreview(next.editPlan, flags);
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
      // Persist the exact analyzed context so save cannot drift from the Coach brief.
      const analyzedContext = result.creativeBrief.creatorContext || context;
      if (analyzedContext !== context) onContext(analyzedContext);
      await save({ creatorContext: analyzedContext });
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
        duckBgm: checked.duck !== false,
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
              cutTransitions: plan.segments
                .map((_, i) => i)
                .filter((i) => checked[`seg-${i}`] !== false)
                .slice(0, -1)
                .map((i) => ({
                  type:
                    cutTransitions[i] ||
                    resolveCoachImpactPack(
                      result.creativeBrief.mode,
                      result.creativeBrief.contentType,
                    ).junctionType,
                })),
              cutText: plan.segments
                .map((_, i) => i)
                .filter((i) => checked[`seg-${i}`] !== false)
                .map((i) => textOnCut[i] !== false),
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
        const keptFlags = plan.segments
          .map((_, i) => i)
          .filter((i) => checked[`seg-${i}`] !== false)
          .map((i) => textOnCut[i] !== false);
        pushPreview(customizedPlan, keptFlags);
        const first = customizedPlan.segments[0];
        if (first) seek(first.start);
        onApplied?.(customizedPlan);
      } else {
        onPreview?.(null);
        toast.success("Back to your original trim");
      }
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
    <section
      className={cn(
        "rounded-xl border border-border bg-card/60 shadow-sm",
        sidebar ? "p-3 space-y-2.5" : "p-4 space-y-3",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="ui-icon-chip-primary w-8 h-8 shrink-0">
            <BrainCircuit size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold leading-tight">AI Coach</h2>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                      aria-label="How AI Coach works"
                    >
                      <Info size={13} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[260px] text-[11px] leading-relaxed py-2.5">
                    Analyze picks keep-ranges (the story), background music (BGM),
                    cut sound effects (SFX), caption style, and Hook/Context text.
                    Preview shows text + plays BGM with the clip. Apply locks the
                    plan; Render stitches cuts with transitions/SFX into the MP4.
                    Your original file stays untouched until Render.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Cuts, music, transitions, captions
            </p>
          </div>
        </div>
        <select
          aria-label="AI Coach editing mode"
          className="rounded-md border border-border bg-background px-2 py-1.5 text-[11px] shrink-0 max-w-[9.5rem]"
          value={mode}
          disabled={busy}
          onChange={(e) => applyMode(e.target.value as CoachMode)}
        >
          {modes.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <p className="text-[10px] leading-snug text-muted-foreground">{MODE_EFFECT[mode]}</p>

      <div className="space-y-1.5">
        <label htmlFor="creator-context" className="text-[11px] font-medium text-muted-foreground">
          Creator Context{" "}
          <span className="font-mono">{context.length}/500</span>
        </label>
        <Textarea
          id="creator-context"
          value={context}
          maxLength={500}
          disabled={busy}
          onChange={(e) => onContext(e.target.value.slice(0, 500))}
          onBlur={() => onContext(sanitizeCreatorContext(context))}
          className={cn("text-sm", sidebar ? "min-h-[3.25rem]" : "min-h-[4.5rem]")}
          placeholder="e.g. Product launch booth demo — focus on the crowd reaction"
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
            Your original file is untouched until you Apply + Render.
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
              {duration.toFixed(0)}s source → ~{proposedSec.toFixed(0)}s after Render
              {applied ? " · plan locked" : " · preview on the player"}
            </p>
            {(() => {
              const impact = resolveCoachImpactPack(
                mode,
                result.creativeBrief.contentType,
              );
              const bgmName = coachBgmTitle(impact.bgmTrackId);
              return (
                <div className="pt-1.5 space-y-1.5">
                  <p className="text-[11px] font-semibold text-foreground">
                    {impact.label}
                  </p>
                  <ul className="text-[10px] text-muted-foreground space-y-0.5">
                    <li>
                      <span className="font-medium text-foreground/80">BGM</span>
                      {" — "}
                      <span className="font-semibold text-foreground">{bgmName}</span>
                      {" from the mode above. Play the clip or tap Preview BGM to hear it. Change mode to switch tracks."}
                    </li>
                    <li>
                      <span className="font-medium text-foreground/80">SFX</span>
                      {" — "}
                      short cut sound ({impact.junctionSfx}) between keep-ranges on{" "}
                      <span className="font-medium text-foreground/80">Render</span>
                      {" — not in live preview"}
                    </li>
                    <li>
                      <span className="font-medium text-foreground/80">Transition</span>
                      {" — "}
                      {impact.junctionType} between cuts on Render
                      {impact.duckBgm
                        ? " · Music ducking is the green row below (music drops while people speak)"
                        : ""}
                    </li>
                  </ul>
                  {previewBgm ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] gap-1 mt-1"
                      onClick={() => previewBgm()}
                    >
                      <Volume2 size={12} />
                      Preview BGM ({bgmName})
                    </Button>
                  ) : null}
                </div>
              );
            })()}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-[10px]">
              <span className="text-muted-foreground font-medium">Caption style</span>
              <select
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[11px]"
                value={captionStyle || plan.captionStyle || "clean_subtitle"}
                disabled={busy}
                onChange={(e) => {
                  const style = e.target.value as "clean_subtitle" | "kinetic_hormozi";
                  onCaptionStyle?.(style);
                  const next = { ...plan, captionStyle: style };
                  setDraftPlan(next);
                  pushPreview(next);
                }}
              >
                <option value="clean_subtitle">Clean subtitles</option>
                <option value="kinetic_hormozi">Kinetic captions</option>
              </select>
            </label>
            <label className="space-y-1 text-[10px]">
              <span className="text-muted-foreground font-medium">Font</span>
              <select
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[11px]"
                value={captionFontId || CLIP_CAPTION_FONTS[0].id}
                disabled={busy || !onCaptionFontId}
                onChange={(e) =>
                  onCaptionFontId?.(e.target.value as ClipCaptionFontId)
                }
              >
                {CLIP_CAPTION_FONTS.map((font) => (
                  <option key={font.id} value={font.id}>
                    {font.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {(result.creativeBrief.storyOptions?.length ?? 0) > 1 ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold">Pick a story focus</p>
              <p className="text-[10px] text-muted-foreground leading-snug">
                This steers the next Analyze toward a different truthful angle
                (which moments to keep).
              </p>
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
                          const base = sanitizeCreatorContext(context).replace(
                            /\.\s*Focus:\s*[^.]*$/i,
                            "",
                          );
                          onContext(
                            sanitizeCreatorContext(
                              `${base}${base ? ". " : ""}Focus: ${opt.title}`,
                            ),
                          );
                          toast.message("Focus updated — tap Re-analyze", {
                            description:
                              "Coach will rebuild keep moments for this angle. BGM still follows the mode dropdown.",
                          });
                        } else {
                          onContext(
                            sanitizeCreatorContext(context).replace(
                              /\.\s*Focus:\s*[^.]*$/i,
                              "",
                            ),
                          );
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
                      {opt.rationale ? (
                        <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground leading-snug">
                          {opt.rationale}
                        </span>
                      ) : null}
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
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] font-semibold">Moments in the final clip</p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                      aria-label="What the keep list does"
                    >
                      <Info size={13} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[260px] text-[11px] leading-relaxed py-2.5">
                    Not a fixed count of 3. Coach adds one row per moment it wants to keep, up to 12.
                    Uncheck a row to leave that moment out of the download. Checked rows play in
                    this order after Apply to clip, then Download.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {(() => {
                const tips = [
                  ...result.creativeBrief.recommendations,
                  ...result.editPlan.recommendations,
                ].filter(Boolean);
                if (!tips.length) return null;
                return (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                          aria-label="Coach tips"
                        >
                          <Sparkles size={13} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[280px] text-[11px] leading-relaxed py-2.5">
                        <p className="font-semibold mb-1">Tips only — not applied automatically</p>
                        <ul className="list-disc pl-3.5 space-y-1">
                          {tips.slice(0, 4).map((tip, i) => (
                            <li key={`tip-${i}`}>{tip}</li>
                          ))}
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })()}
            </div>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] text-muted-foreground">
                The T icon hides hook and context on that cut only. Off / Flash / Fade / Cut
                is the join into the next moment.
              </p>
              {previewStitch && plan.segments.length > 0 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 shrink-0 gap-1 text-[10px]"
                  disabled={busy}
                  onClick={() => {
                    pushPreview(plan);
                    previewStitch();
                  }}
                >
                  <Play size={12} />
                  Preview final edit
                </Button>
              ) : null}
            </div>
            <ul className="space-y-1.5">
              {plan.segments.map((s, i) => (
                <li
                  key={`seg-${i}-${s.start}-${s.end}`}
                  className="flex flex-col gap-1.5 rounded-md border border-border bg-background/70 px-2 py-1.5"
                >
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      aria-pressed={checked[`seg-${i}`] !== false}
                      onClick={() => toggleCheck(`seg-${i}`)}
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
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
                      <p className="text-xs font-medium leading-snug break-words">
                        {formatKeepLabel(s.purpose, i)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Part {i + 1}
                        {i === 0 ? " · opens the clip" : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        aria-pressed={textOnCut[i] !== false}
                        aria-label={
                          textOnCut[i] !== false
                            ? "Hide hook and context text on this cut"
                            : "Show hook and context text on this cut"
                        }
                        title={
                          textOnCut[i] !== false
                            ? "Text is on for this cut"
                            : "Text is hidden on this cut"
                        }
                        disabled={busy}
                        onClick={() => {
                          const flags = textFlagsFor(plan);
                          flags[i] = flags[i] === false;
                          setTextOnCut(flags);
                          pushPreview(plan, flags);
                        }}
                        className={cn(
                          "inline-flex h-7 w-7 items-center justify-center rounded-md border",
                          textOnCut[i] !== false
                            ? "border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                            : "border-border text-muted-foreground opacity-50",
                        )}
                      >
                        <Type size={13} />
                      </button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        disabled={i === 0 || busy}
                        aria-label="Move segment up"
                        onClick={() => moveSegment(i, -1)}
                      >
                        <ChevronUp size={14} />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        disabled={i >= plan.segments.length - 1 || busy}
                        aria-label="Move segment down"
                        onClick={() => moveSegment(i, 1)}
                      >
                        <ChevronDown size={14} />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[10px] gap-1"
                        title="Play only this keep-range on the player"
                        onClick={() => {
                          pushPreview(plan);
                          if (previewSegment) {
                            previewSegment(s.start, s.end);
                          } else {
                            seek(s.start);
                          }
                        }}
                      >
                        <Play size={12} />
                        Preview cut
                      </Button>
                    </div>
                  </div>
                  {i < plan.segments.length - 1 ? (
                    <div className="flex flex-wrap items-center gap-1 pl-7">
                      <span className="mr-0.5 text-[10px] text-muted-foreground">
                        Into next cut
                      </span>
                      {(
                        [
                          ["none", "Off"],
                          ["flash", "Flash"],
                          ["crossfade", "Fade"],
                          ["cut", "Cut"],
                        ] as const
                      ).map(([type, label]) => {
                        const selected =
                          (cutTransitions[i] ||
                            resolveCoachImpactPack(mode, result.creativeBrief.contentType)
                              .junctionType) === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            disabled={busy}
                            aria-pressed={selected}
                            onClick={() => {
                              const next = [...cutTransitions];
                              next[i] = type;
                              setCutTransitions(next);
                              pushPreview(plan, undefined, undefined, next);
                            }}
                            className={cn(
                              "h-6 rounded-full border px-2 text-[10px] font-medium",
                              selected
                                ? "border-primary bg-primary/15 text-foreground"
                                : "border-border text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2 pl-7">
                    <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      Start
                      <input
                        type="number"
                        step="0.1"
                        min={0}
                        max={duration}
                        value={Number(s.start.toFixed(1))}
                        disabled={busy}
                        onChange={(e) => updateSegmentTime(i, "start", e.target.value)}
                        className="h-7 w-16 rounded border border-border bg-background px-1.5 text-[11px] tabular-nums"
                      />
                    </label>
                    <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      End
                      <input
                        type="number"
                        step="0.1"
                        min={0}
                        max={duration}
                        value={Number(s.end.toFixed(1))}
                        disabled={busy}
                        onChange={(e) => updateSegmentTime(i, "end", e.target.value)}
                        className="h-7 w-16 rounded border border-border bg-background px-1.5 text-[11px] tabular-nums"
                      />
                    </label>
                  </div>
                </li>
              ))}

              {plan.hookOverlay?.trim() ? (
                <li className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5">
                  <button
                    type="button"
                    aria-pressed={checked.hook !== false}
                    onClick={() => {
                      const enabling = checked.hook === false;
                      toggleCheck("hook");
                      pushPreview({
                        ...plan,
                        hookOverlay: enabling ? plan.hookOverlay : "",
                      });
                    }}
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
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                      Hook text — top of the clip
                    </p>
                    <input
                      className="w-full rounded border border-border bg-background px-2 py-1 text-xs font-medium"
                      maxLength={120}
                      value={plan.hookOverlay}
                      disabled={busy || checked.hook === false}
                      onChange={(e) => {
                        const next = { ...plan, hookOverlay: e.target.value };
                        setDraftPlan(next);
                        pushPreview(next);
                      }}
                    />
                  </div>
                </li>
              ) : null}

              {plan.contextOverlay?.trim() ? (
                <li className="flex items-start gap-2 rounded-md border border-sky-500/40 bg-sky-500/10 px-2 py-1.5">
                  <button
                    type="button"
                    aria-pressed={checked.context !== false}
                    onClick={() => {
                      const enabling = checked.context === false;
                      toggleCheck("context");
                      pushPreview({
                        ...plan,
                        contextOverlay: enabling ? plan.contextOverlay : "",
                      });
                    }}
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
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-[10px] font-semibold text-sky-700 dark:text-sky-300 uppercase tracking-wide">
                      Context text — bottom of the clip
                    </p>
                    <input
                      className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
                      maxLength={120}
                      value={plan.contextOverlay || ""}
                      disabled={busy || checked.context === false}
                      onChange={(e) => {
                        const next = { ...plan, contextOverlay: e.target.value };
                        setDraftPlan(next);
                        pushPreview(next);
                      }}
                    />
                  </div>
                </li>
              ) : null}

              <li className="flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1.5">
                <button
                  type="button"
                  aria-pressed={checked.duck !== false}
                  onClick={() => toggleCheck("duck")}
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                    checked.duck !== false
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-emerald-600/40",
                  )}
                >
                  {checked.duck !== false ? (
                    <Check size={12} strokeWidth={3} />
                  ) : null}
                </button>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                    Music ducking
                  </p>
                  <p className="text-xs leading-snug">
                    Lower background music while people speak. Uncheck to keep the music at full volume.
                  </p>
                </div>
              </li>
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

          <div className={cn("flex gap-2", sidebar ? "flex-col" : "flex-col sm:flex-row")}>
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
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Drag Hook/Context on the player to reposition. More caption tools: Polish → Captions.
                Enhance is color/noise only.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
