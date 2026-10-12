import { useMemo, useState } from "react";
import { Headphones, Loader2, Sparkles, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { contentApi } from "../../services/apiClient";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";

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

type Props = {
  contentId: string | null;
  durationSec: number;
  creatorContext: string;
  disabled?: boolean;
  onApplied?: () => void;
};

export function SoundDesignPanel({
  contentId,
  durationSec,
  creatorContext,
  disabled,
  onApplied,
}: Props) {
  const [mode, setMode] = useState<SoundDesignMode>("auto");
  const [components, setComponents] = useState<SoundDesignComponents>(DEFAULT_COMPONENTS);
  const [busy, setBusy] = useState<"analyze" | "plan" | null>(null);
  const [recommendation, setRecommendation] = useState<{
    summary: string;
    bullets: string[];
    commentaryRecommended?: boolean;
    lightTouchOnly?: boolean;
  } | null>(null);
  const [planSummary, setPlanSummary] = useState<string | null>(null);
  const [edlCount, setEdlCount] = useState(0);

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
      setEdlCount(res.audioEdl?.length ?? 0);
      setPlanSummary(
        `${voice} commentary · ${foley} Foley · ${res.audioEdl?.length ?? 0} EDL decisions`,
      );
      toast.success("Sound Design plan applied — ready to render");
      onApplied?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sound Design plan failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center gap-2 text-sm font-medium text-white">
        <Headphones className="h-4 w-4 text-emerald-400" />
        AI Sound Design
      </div>
      <p className="text-xs text-white/60">
        Understand the clip first, then design commentary, Foley, ambience, and mix — non-destructive until you render.
      </p>

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
      </div>

      <div className="space-y-1 rounded-lg bg-black/30 p-2">
        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-white/50">
          <Volume2 className="h-3 w-3" /> Audio layers
        </div>
        {layers.map((l) => (
          <div key={l.id} className="flex items-center gap-2 text-[11px] text-white/70">
            <span className="w-16 shrink-0 font-mono text-white/40">{l.label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded bg-white/10">
              <div
                className={cn("h-full", l.on ? "w-full bg-emerald-500/50" : "w-0")}
              />
            </div>
          </div>
        ))}
      </div>

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
          {edlCount > 0 ? ` (${edlCount} editable decisions)` : ""}
        </p>
      )}

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
          {busy === "plan" ? (
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
