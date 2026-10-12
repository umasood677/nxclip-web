import { useMemo, useState } from "react";
import { Headphones, Loader2, Sparkles, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { contentApi } from "../../services/apiClient";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { ReimaginePresets } from "./ReimaginePresets";
import { AudioTimelineEditor, type TimelineEdlItem } from "./AudioTimelineEditor";

export type SoundDesignMode =
  | "auto"
  | "natural"
  | "broadcast"
  | "cinematic"
  | "energetic"
  | "comedy"
  | "custom";

export type SoundDesignComponents = {
  enhanceOriginalAudio: boolean;
  aiCommentary: boolean;
  aiFoley: boolean;
  ambience: boolean;
  backgroundMusic: boolean;
  autoDucking: boolean;
  preserveImportantOriginalAudio: boolean;
};

const MODES: Array<[SoundDesignMode, string]> = [
  ["auto", "Auto"],
  ["natural", "Natural"],
  ["broadcast", "Broadcast"],
  ["cinematic", "Cinematic"],
  ["energetic", "Energetic"],
  ["comedy", "Comedy"],
  ["custom", "Custom"],
];

const DEFAULT_COMPONENTS: SoundDesignComponents = {
  enhanceOriginalAudio: true,
  aiCommentary: false,
  aiFoley: true,
  ambience: true,
  backgroundMusic: false,
  autoDucking: true,
  preserveImportantOriginalAudio: true,
};

/** Production credit estimates (mirrors ai-service SOUND_DESIGN metering). */
function estimateCredits(opts: {
  analyze: boolean;
  plan: boolean;
  commentaryOn: boolean;
  durationSec: number;
  premiumVoice?: boolean;
}): { label: string; credits: number } {
  let credits = 0;
  if (opts.analyze) credits += 1;
  if (opts.plan) credits += 2;
  if (opts.commentaryOn) {
    const chars = Math.min(1200, Math.round(opts.durationSec * 12));
    credits += Math.max(1, Math.ceil(chars / 400)) * (opts.premiumVoice ? 3 : 1);
  }
  return {
    credits,
    label: opts.premiumVoice ? "Premium voice (ElevenLabs)" : "Standard voice (Google TTS)",
  };
}

function toTimelineItems(edl: unknown[]): TimelineEdlItem[] {
  return (edl || [])
    .map((raw) => {
      const it = raw as Partial<TimelineEdlItem>;
      if (!it?.id || !it.type || typeof it.startMs !== "number") return null;
      return {
        id: String(it.id),
        type: it.type as TimelineEdlItem["type"],
        startMs: it.startMs,
        endMs: typeof it.endMs === "number" ? it.endMs : undefined,
        gainDb: typeof it.gainDb === "number" ? it.gainDb : 0,
        enabled: it.enabled !== false,
        metadata: it.metadata,
      };
    })
    .filter(Boolean) as TimelineEdlItem[];
}

type Props = {
  contentId: string | null;
  durationSec: number;
  creatorContext: string;
  disabled?: boolean;
  /** Story Engine compose drafts share the same Sound Engine. */
  storyEngine?: boolean;
  onApplied?: () => void;
};

export function SoundDesignPanel({
  contentId,
  durationSec,
  creatorContext,
  disabled,
  storyEngine,
  onApplied,
}: Props) {
  const [mode, setMode] = useState<SoundDesignMode>("auto");
  const [components, setComponents] = useState<SoundDesignComponents>(DEFAULT_COMPONENTS);
  const [busy, setBusy] = useState<"analyze" | "plan" | "tts" | "reimagine" | "edl" | null>(null);
  const [ttsInfo, setTtsInfo] = useState<string | null>(null);
  const [premiumVoice, setPremiumVoice] = useState(false);
  const [recommendation, setRecommendation] = useState<{
    summary: string;
    bullets: string[];
    commentaryRecommended?: boolean;
    lightTouchOnly?: boolean;
  } | null>(null);
  const [planSummary, setPlanSummary] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEdlItem[]>([]);
  const [lastPreset, setLastPreset] = useState<string | null>(null);

  const layers = useMemo(() => {
    const rows: Array<{ id: string; label: string; on: boolean }> = [
      { id: "original", label: "ORIGINAL", on: components.preserveImportantOriginalAudio },
      { id: "voice", label: "VOICE", on: components.aiCommentary },
      { id: "foley", label: "FOLEY", on: components.aiFoley },
      { id: "ambience", label: "AMBIENCE", on: components.ambience },
      { id: "music", label: "MUSIC", on: components.backgroundMusic },
    ];
    return rows;
  }, [components]);

  const creditPreview = useMemo(
    () =>
      estimateCredits({
        analyze: true,
        plan: true,
        commentaryOn: components.aiCommentary,
        durationSec: Math.max(0.5, durationSec),
        premiumVoice,
      }),
    [components.aiCommentary, durationSec, premiumVoice],
  );

  const toggle = (key: keyof SoundDesignComponents) => {
    setComponents((c) => ({ ...c, [key]: !c[key] }));
  };

  const analyze = async () => {
    if (!contentId) return;
    setBusy("analyze");
    try {
      const res = await contentApi.analyzeSoundDesign(contentId, {
        creatorContext: creatorContext || undefined,
        mode,
        durationSec: Math.max(0.5, durationSec),
      });
      setRecommendation(res.recommendation || null);
      if (res.recommendation?.commentaryRecommended && !components.aiCommentary) {
        setComponents((c) => ({ ...c, aiCommentary: true }));
      }
      if (res.recommendation?.suggestedMode) {
        setMode(res.recommendation.suggestedMode as SoundDesignMode);
      }
      toast.success("Sound Design analysis ready");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sound Design analyze failed");
    } finally {
      setBusy(null);
    }
  };

  const applyEdlLocal = async (items: TimelineEdlItem[]) => {
    setTimeline(items);
    if (!contentId) return;
    setBusy("edl");
    try {
      await contentApi.patchSoundDesignEdl(contentId, {
        audioEdl: items,
        durationMs: Math.max(1000, Math.round(durationSec * 1000)),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save timeline edits");
    } finally {
      setBusy(null);
    }
  };

  const planAndApply = async () => {
    if (!contentId) return;
    setBusy("plan");
    try {
      const res = await contentApi.planSoundDesign(contentId, {
        creatorContext: creatorContext || undefined,
        mode,
        components,
        durationSec: Math.max(0.5, durationSec),
      });
      const foley = res.audioStoryPlan?.foleyEvents?.filter((f) => f.enabled).length ?? 0;
      const voice = res.audioStoryPlan?.commentary?.segments?.length ?? 0;
      let edl = (res.audioEdl as unknown[]) || [];
      const synth = (res as { synthesize?: { provider?: string; synthesized?: number; failed?: number } })
        .synthesize;
      if (synth) {
        setTtsInfo(
          `TTS ${synth.provider || "voice"}: ${synth.synthesized ?? 0} segments${
            synth.failed ? `, ${synth.failed} skipped` : ""
          }`,
        );
      } else if (components.aiCommentary && voice > 0) {
        setBusy("tts");
        try {
          const tts = await contentApi.synthesizeSoundDesign(contentId, {
            durationSec: Math.max(0.5, durationSec),
          });
          edl = (tts.audioEdl as unknown[]) || edl;
          setTtsInfo(
            `TTS ${tts.provider}: ${tts.synthesized} segments${
              tts.failed ? `, ${tts.failed} skipped` : ""
            }`,
          );
        } catch {
          setTtsInfo("TTS deferred — Foley/ambience still available");
        }
      } else {
        setTtsInfo(null);
      }
      setTimeline(toTimelineItems(edl));
      setPlanSummary(
        `${voice} commentary · ${foley} Foley · ${edl.length} EDL decisions`,
      );
      toast.success("Sound Design plan applied — ready to render");
      onApplied?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sound Design plan failed");
    } finally {
      setBusy(null);
    }
  };

  const reimagine = async (presetId: string) => {
    if (!contentId) return;
    setBusy("reimagine");
    setLastPreset(presetId);
    try {
      const res = await contentApi.reimagineSoundDesign(contentId, {
        presetId,
        durationSec: Math.max(0.5, durationSec),
        creatorContext: creatorContext || undefined,
      });
      const foley = res.audioStoryPlan?.foleyEvents?.filter((f) => f.enabled).length ?? 0;
      const voice = res.audioStoryPlan?.commentary?.segments?.length ?? 0;
      const edl = (res.audioEdl as unknown[]) || [];
      setTimeline(toTimelineItems(edl));
      setPlanSummary(
        `${res.preset?.name || presetId}: ${voice} commentary · ${foley} Foley · ${edl.length} EDL`,
      );
      if (res.synthesize) {
        setTtsInfo(
          `TTS ${res.synthesize.provider || "voice"}: ${res.synthesize.synthesized ?? 0} segments`,
        );
      }
      if (res.audioStoryPlan) {
        setComponents((c) => ({
          ...c,
          aiCommentary: voice > 0 || c.aiCommentary,
          aiFoley: foley > 0 || c.aiFoley,
        }));
      }
      toast.success(`Reimagined as ${res.preset?.name || presetId}`);
      onApplied?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reimagine failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center gap-2 text-sm font-medium text-white">
        <Headphones className="h-4 w-4 text-emerald-400" />
        AI Sound Design
        {storyEngine ? (
          <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-200">
            Story Engine
          </span>
        ) : null}
      </div>
      <p className="text-xs text-white/60">
        {storyEngine
          ? "Shared Sound Engine for your multi-clip story — commentary, Foley, ambience, and mix. Seeded from act audio notes after Analyse."
          : "Understand the clip first, then design commentary, Foley, ambience, and mix — non-destructive until you render."}
      </p>

      <ReimaginePresets disabled={disabled} busy={Boolean(busy)} onSelect={(id) => void reimagine(id)} />
      {lastPreset && (
        <p className="text-[11px] text-white/50">Last Reimagine: {lastPreset}</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {MODES.map(([id, label]) => (
          <button
            key={id}
            type="button"
            disabled={disabled || Boolean(busy)}
            onClick={() => setMode(id)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs",
              mode === id ? "bg-emerald-500/90 text-black" : "bg-white/10 text-white/80",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-1.5 text-xs text-white/80">
        {(
          [
            ["enhanceOriginalAudio", "Enhance Original Audio"],
            ["aiFoley", "AI Foley"],
            ["ambience", "Environment / Ambience"],
            ["aiCommentary", "AI Commentary / Narration"],
            ["autoDucking", "Auto Ducking"],
            ["preserveImportantOriginalAudio", "Preserve Important Original Audio"],
            ["backgroundMusic", "Background Music"],
          ] as Array<[keyof SoundDesignComponents, string]>
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={components[key]}
              disabled={disabled || Boolean(busy)}
              onChange={() => toggle(key)}
            />
            {label}
          </label>
        ))}
        <label className="flex items-center gap-2 text-white/55">
          <input
            type="checkbox"
            checked={premiumVoice}
            disabled={disabled || Boolean(busy)}
            onChange={() => setPremiumVoice((v) => !v)}
          />
          Estimate Premium TTS credits (ElevenLabs)
        </label>
      </div>

      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-2 py-1.5 text-[11px] text-amber-100/90">
        Est. ~{creditPreview.credits} sound credits · {creditPreview.label}
        <span className="block text-white/45">
          Metered server-side on analyze / plan / TTS (ai_jobs · sound_design).
        </span>
      </div>

      <div className="space-y-1 rounded-lg bg-black/30 p-2">
        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-white/50">
          <Volume2 className="h-3 w-3" /> Audio layers
        </div>
        {layers.map((l) => (
          <div key={l.id} className="flex items-center gap-2 text-[11px] text-white/70">
            <span className="w-16 shrink-0 font-mono text-white/40">{l.label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded bg-white/10">
              <div className={cn("h-full", l.on ? "w-full bg-emerald-500/50" : "w-0")} />
            </div>
          </div>
        ))}
      </div>

      {timeline.length > 0 && (
        <AudioTimelineEditor
          durationMs={Math.max(1000, Math.round(durationSec * 1000))}
          items={timeline}
          disabled={disabled || Boolean(busy)}
          onChange={(items) => void applyEdlLocal(items)}
        />
      )}

      {recommendation && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2 text-xs text-white/80">
          <div className="mb-1 font-medium text-emerald-300">AI Coach</div>
          <p>{recommendation.summary}</p>
          <ul className="mt-1 list-disc pl-4 text-white/70">
            {recommendation.bullets?.slice(0, 6).map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          {recommendation.lightTouchOnly && (
            <p className="mt-1 text-white/50">Light touch — original audio already works well.</p>
          )}
        </div>
      )}

      {planSummary && (
        <p className="text-xs text-emerald-300/90">
          Plan ready: {planSummary}
        </p>
      )}
      {ttsInfo && <p className="text-xs text-white/55">{ttsInfo}</p>}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!contentId || disabled || Boolean(busy)}
          onClick={() => void analyze()}
        >
          {busy === "analyze" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          Analyze
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!contentId || disabled || Boolean(busy)}
          onClick={() => void planAndApply()}
        >
          {busy === "plan" || busy === "tts" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Headphones className="h-3.5 w-3.5" />
          )}
          Preview & Apply
        </Button>
      </div>
    </div>
  );
}
