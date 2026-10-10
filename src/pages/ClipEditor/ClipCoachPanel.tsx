import { useEffect, useRef, useState } from "react";
import { BrainCircuit, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { contentApi } from "../../services/apiClient";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { Skeleton } from "../../components/ui/skeleton";
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
const modes: Array<[CoachMode, string]> = [
  ["auto", "Auto"],
  ["viral_short", "Viral Short"],
  ["professional", "Clean Professional"],
  ["event_highlight", "Event Highlight"],
  ["documentary", "Story / Documentary"],
  ["high_energy", "High Energy"],
];

export function ClipCoachPanel({
  id,
  context,
  onContext,
  duration,
  save,
  onBeats,
  onUnderstanding,
  seek,
}: {
  id: string;
  context: string;
  onContext: (v: string) => void;
  duration: number;
  save: () => Promise<unknown>;
  onBeats: (m: Array<{ time: number; label: string }>) => void;
  onUnderstanding: (result: ClipCoachResult) => void;
  seek: (time: number) => void;
}) {
  const [mode, setMode] = useState<CoachMode>("auto");
  const [result, setResult] = useState<ClipCoachResult | null>(null);
  const [draftPlan, setDraftPlan] = useState<
    ClipCoachResult["editPlan"] | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [emphasisText, setEmphasisText] = useState("");
  const latest = useRef({ id, context, mode });
  latest.current = { id, context, mode };
  useEffect(() => {
    let alive = true;
    setResult(null);
    setDraftPlan(null);
    setEmphasisText("");
    setApplied(false);
    void contentApi
      .getContentById(id)
      .then((item) => {
        if (!alive) return;
        const extras = item.clipEditSpec?.extras as
          Record<string, unknown> | undefined;
        setTranscript(item.clipEditSpec?.transcript || "");
        setReviewed(extras?.clipCoachCaptionsReviewed === true);
        const stored = extras?.clipCoach as ClipCoachResult | undefined;
        if (stored?.creativeBrief && stored?.editPlan) {
          setResult(stored);
          setDraftPlan(stored.editPlan);
          setEmphasisText((stored.editPlan.captionEmphasis || []).join("\n"));
          setMode(stored.creativeBrief.mode || "auto");
          setApplied(extras?.viralEditApplied === true);
          onUnderstanding(stored);
        }
      })
      .catch(() => {
        /* Existing editor handles load errors. */
      });
    return () => {
      alive = false;
    };
  }, [id]);
  const current = Boolean(
    result &&
    result.creativeBrief.creatorContext === context &&
    result.creativeBrief.mode === mode,
  );
  const plan = draftPlan || result?.editPlan;
  const validCaptionOptions =
    !plan?.captionEmphasis ||
    (plan.captionEmphasis.length <= 8 &&
      plan.captionEmphasis.every((v) => v.length <= 60));
  const changed = Boolean(
    result && plan && JSON.stringify(plan) !== JSON.stringify(result.editPlan),
  );
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
  const updateSegment = (
    index: number,
    patch: Partial<ClipCoachResult["editPlan"]["segments"][number]>,
  ) => {
    if (plan)
      setDraftPlan({
        ...plan,
        segments: plan.segments.map((s, i) =>
          i === index ? { ...s, ...patch } : s,
        ),
      });
  };
  const moveSegment = (index: number, offset: number) => {
    if (!plan) return;
    const segments = [...plan.segments];
    [segments[index], segments[index + offset]] = [
      segments[index + offset],
      segments[index],
    ];
    setDraftPlan({ ...plan, segments });
  };
  const analyze = async () => {
    const snapshot = { id, context, mode };
    setBusy(true);
    try {
      await save();
      const item = await contentApi.getContentById(id);
      if (typeof item.clipEditSpec?.transcript !== "string") {
        await contentApi.transcribeClip(id);
        await waitForClipTranscript(() => contentApi.getContentById(id), {
          isCancelled: () => latest.current.id !== id,
        });
      }
      setTranscript(
        (await contentApi.getContentById(id)).clipEditSpec?.transcript || "",
      );
      setReviewed(false);
      const next = await contentApi.analyzeClipCoach(id, {
        creatorContext: context,
        mode,
        durationSec: duration,
      });
      if (JSON.stringify(snapshot) !== JSON.stringify(latest.current)) {
        toast.message(
          "Context changed. Analyze again for the latest direction.",
        );
        return;
      }
      setResult(next);
      setDraftPlan(next.editPlan);
      setEmphasisText((next.editPlan.captionEmphasis || []).join("\n"));
      setApplied(false);
      onBeats(next.creativeBrief.moments);
      onUnderstanding(next);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "AI Coach could not analyze this clip. Your original is unchanged.",
      );
    } finally {
      setBusy(false);
    }
  };
  const apply = async (value: boolean) => {
    setBusy(true);
    try {
      await save();
      const item = await contentApi.applyClipCoach(
        id,
        value,
        reviewed,
        value && plan && result
          ? {
              plan,
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
        setEmphasisText((stored.editPlan.captionEmphasis || []).join("\n"));
        onUnderstanding(stored);
      }
      setApplied(value);
      toast.success(
        value
          ? "Viral Edit selected for your next render"
          : "Original edit restored",
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
    <section className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <BrainCircuit size={18} className="text-primary" />
        <h2 className="text-sm font-semibold">AI Coach</h2>
        <span className="text-xs text-muted-foreground">
          Find the story in your footage
        </span>
      </div>
      <label htmlFor="creator-context" className="text-xs font-medium">
        Creator Context{" "}
        <span className="text-muted-foreground">
          · optional · {context.length}/500
        </span>
      </label>
      <Textarea
        id="creator-context"
        value={context}
        maxLength={500}
        disabled={busy}
        onChange={(e) => onContext(e.target.value)}
        className="min-h-20 text-sm"
        placeholder="What is happening, and what should viewers notice? Add event/product names, participant roles, or your editing goal."
      />
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="AI Coach editing mode"
          className="rounded-md border border-border bg-background px-3 py-2 text-xs"
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
        <Button
          size="sm"
          onClick={() => void analyze()}
          disabled={busy || duration <= 0 || duration > 900}
        >
          <Sparkles size={14} className="mr-2" />
          {result ? "Re-analyze & Create Viral Edit" : "Create Viral Edit"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        AI Coach selects a story and proposes source segments. Your original
        stays intact. Enhance remains available for polishing.
      </p>
      {busy ? (
        <div className="space-y-2" aria-live="polite">
          <p className="text-xs">
            Understanding your clip and preparing the edit…
          </p>
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : result ? (
        <div className="space-y-3 border-t border-border pt-3">
          <div className="text-xs text-primary font-semibold">
            {result.creativeBrief.contentType.replaceAll("-", " ")} ·{" "}
            {result.creativeBrief.evidence === "video-audio"
              ? "Video + audio evidence"
              : "Transcript only — visuals not analyzed"}
          </div>
          <p className="text-sm">{result.creativeBrief.summary}</p>
          {!current && (
            <p className="text-xs text-amber-500">
              Direction changed. Re-analyze before applying or rendering this
              plan.
            </p>
          )}
          <div className="text-xs text-muted-foreground">
            Original {duration.toFixed(1)}s → proposed{" "}
            {plan!.segments.reduce((n, s) => n + s.end - s.start, 0).toFixed(1)}
            s · source ranges below
          </div>
          <p className="text-xs">{result.editPlan.narrative}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {plan!.segments.map((s, i) => (
              <div
                key={i}
                className="text-left rounded-md border border-border bg-background/50 p-2 text-xs"
              >
                <span className="text-muted-foreground">
                  {i + 1}. {s.start.toFixed(1)}–{s.end.toFixed(1)}s
                </span>
                <p>{s.purpose}</p>
                <button
                  type="button"
                  onClick={() => seek(s.start)}
                  disabled={
                    !Number.isFinite(s.start) ||
                    s.start < 0 ||
                    s.start > duration
                  }
                  className="text-primary mt-1"
                >
                  Preview source moment
                </button>
              </div>
            ))}
          </div>
          <details className="text-xs rounded-md border border-border p-3">
            <summary className="cursor-pointer font-medium">
              Customize edit plan
            </summary>
            <div className="space-y-3 mt-3">
              <p className="text-muted-foreground">
                Times refer to the original clip. Segments play in the order
                below, including repeated moments if you add them.
              </p>
              {plan!.segments.map((s, i) => (
                <div key={i} className="space-y-2 border-b border-border pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>Segment {i + 1}</span>
                    <label>
                      Start (s){" "}
                      <input
                        aria-label={`Segment ${i + 1} start`}
                        className="w-20 rounded border border-border bg-background p-1"
                        type="number"
                        min="0"
                        max={duration}
                        step="0.1"
                        value={Number.isFinite(s.start) ? s.start : ""}
                        onChange={(e) =>
                          updateSegment(i, {
                            start:
                              e.target.value === ""
                                ? NaN
                                : Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      End (s){" "}
                      <input
                        aria-label={`Segment ${i + 1} end`}
                        className="w-20 rounded border border-border bg-background p-1"
                        type="number"
                        min="0.5"
                        max={duration}
                        step="0.1"
                        value={Number.isFinite(s.end) ? s.end : ""}
                        onChange={(e) =>
                          updateSegment(i, {
                            end:
                              e.target.value === ""
                                ? NaN
                                : Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="text-primary disabled:opacity-40"
                      disabled={i === 0}
                      onClick={() => moveSegment(i, -1)}
                    >
                      Move up
                    </button>
                    <button
                      type="button"
                      className="text-primary disabled:opacity-40"
                      disabled={i === plan!.segments.length - 1}
                      onClick={() => moveSegment(i, 1)}
                    >
                      Move down
                    </button>
                    <button
                      type="button"
                      className="text-muted-foreground disabled:opacity-40"
                      disabled={plan!.segments.length === 1}
                      onClick={() =>
                        setDraftPlan({
                          ...plan!,
                          segments: plan!.segments.filter(
                            (_, index) => index !== i,
                          ),
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    aria-label={`Segment ${i + 1} purpose`}
                    className="w-full rounded border border-border bg-background p-2"
                    maxLength={120}
                    value={s.purpose}
                    onChange={(e) =>
                      updateSegment(i, { purpose: e.target.value })
                    }
                  />
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                disabled={plan!.segments.length >= 12}
                onClick={() =>
                  setDraftPlan({
                    ...plan!,
                    segments: [
                      ...plan!.segments,
                      {
                        start: 0,
                        end: Math.min(duration, 5),
                        purpose: "Custom moment",
                      },
                    ],
                  })
                }
              >
                Add segment
              </Button>
              <label className="block space-y-1">
                <span>Hook overlay · editorial text, not speech</span>
                <input
                  className="w-full rounded border border-border bg-background p-2"
                  maxLength={120}
                  value={plan!.hookOverlay}
                  onChange={(e) =>
                    setDraftPlan({ ...plan!, hookOverlay: e.target.value })
                  }
                />
              </label>
              <label className="block space-y-1">
                <span>
                  Editorial context · displayed after the hook, not speech
                </span>
                <input
                  className="w-full rounded border border-border bg-background p-2"
                  maxLength={120}
                  value={plan!.contextOverlay || ""}
                  onChange={(e) =>
                    setDraftPlan({ ...plan!, contextOverlay: e.target.value })
                  }
                />
              </label>
              <p className="text-muted-foreground">
                Context displays for up to 4 seconds after the hook when at
                least 0.4 seconds remain. Speech formatting needs timed
                transcription.
              </p>
              <label className="block space-y-1">
                <span>Caption emphasis · one exact speech phrase per line</span>
                <Textarea
                  className="min-h-16 text-xs"
                  maxLength={487}
                  value={emphasisText}
                  onChange={(e) => {
                    setEmphasisText(e.target.value);
                    setDraftPlan({
                      ...plan!,
                      captionEmphasis: e.target.value
                        .split("\n")
                        .map((v) => v.trim())
                        .filter(Boolean),
                    });
                  }}
                />
              </label>
              <p className="text-muted-foreground">
                Up to 8 phrases, 60 characters each. Only matching transcript
                words are highlighted; missing phrases never become subtitles.
                Speech uses short timed phrases without rewriting or removing
                dialogue.
              </p>
              {!validCaptionOptions && (
                <p role="alert" className="text-amber-500">
                  Use up to 8 emphasis phrases of no more than 60 characters
                  each.
                </p>
              )}
              <label className="flex items-center gap-2">
                Caption style{" "}
                <select
                  className="rounded border border-border bg-background p-2"
                  value={plan!.captionStyle}
                  onChange={(e) =>
                    setDraftPlan({ ...plan!, captionStyle: e.target.value })
                  }
                >
                  <option value="clean_subtitle">Clean subtitles</option>
                  <option value="kinetic_hormozi">Kinetic captions</option>
                </select>
              </label>
              <label className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  checked={plan!.duckBgm === true}
                  onChange={(e) =>
                    setDraftPlan({ ...plan!, duckBgm: e.target.checked })
                  }
                />
                Lower selected BGM during transcribed speech
              </label>
              <p className="text-muted-foreground">
                Ducking needs a selected music track and timed speech captions.
                It lowers music to 30% of its selected volume during speech; it
                does not isolate voices or remove noise.
              </p>
              <Button
                size="sm"
                variant="ghost"
                disabled={!changed}
                onClick={() => {
                  setDraftPlan(result.editPlan);
                  setEmphasisText(
                    (result.editPlan.captionEmphasis || []).join("\n"),
                  );
                }}
              >
                Reset to saved plan
              </Button>
              {!validPlan && (
                <p role="alert" className="text-amber-500">
                  Use 1–12 segments, each at least 0.5 seconds and within the
                  original clip.
                </p>
              )}
            </div>
          </details>
          {changed && (
            <p className="text-xs text-amber-500">
              Unsaved plan changes. Apply them before rendering; the last
              applied plan is still selected.
            </p>
          )}
          {plan!.hookOverlay && (
            <p className="text-sm">Hook overlay: “{plan!.hookOverlay}”</p>
          )}
          {plan!.contextOverlay && (
            <p className="text-xs text-muted-foreground">
              Editorial context: {plan!.contextOverlay}
            </p>
          )}
          {result.creativeBrief.captionReviewRequired && (
            <div className="space-y-2 text-xs">
              <p className="text-amber-500">
                Review speech captions before rendering. AI Coach has not
                rewritten the dialogue.
              </p>
              <p className="rounded-md bg-background p-2">
                {transcript ||
                  "No speech transcript available. Only editorial overlays will be added."}
              </p>
              <label className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(e) => setReviewed(e.target.checked)}
                />
                I reviewed the available transcript against the original audio.
              </label>
            </div>
          )}
          <details className="text-xs">
            <summary className="cursor-pointer">
              Coach recommendations — not automatically applied
            </summary>
            <ul className="mt-2 space-y-1">
              {[
                ...result.creativeBrief.recommendations,
                ...result.editPlan.recommendations,
              ].map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </details>
          <p className="text-xs text-muted-foreground">
            Apply renders the selected segments in this order, with clean cuts,
            faithful speech phrases, selected-word emphasis, the hook and
            optional editorial context. Optional BGM ducking follows timed
            speech. Tracking, audio cleanup and advanced effects remain
            recommendations.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={
                !current ||
                (applied && !changed) ||
                !validPlan ||
                !validCaptionOptions ||
                (result.creativeBrief.captionReviewRequired && !reviewed)
              }
              onClick={() => void apply(true)}
            >
              {applied && !changed
                ? "Viral Edit selected"
                : changed
                  ? "Apply customized edit"
                  : "Apply Viral Edit"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void apply(false)}
            >
              Keep Original / Manual Edit
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
