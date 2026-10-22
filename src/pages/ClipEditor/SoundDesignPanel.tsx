import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Headphones, Loader2, Sparkles, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { contentApi } from "../../services/apiClient";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { ReimaginePresets, suggestReimaginePresets } from "./ReimaginePresets";
import { AudioTimelineEditor, type TimelineEdlItem } from "./AudioTimelineEditor";
import { isHttpAudioUrl, resolveSfxPreviewUrl } from "./sfxPreviewCatalog";

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

/** Persisted under clipEditSpec.extras.soundDesign (server). */
export type PersistedSoundDesign = {
  mode?: SoundDesignMode | string;
  components?: Partial<SoundDesignComponents>;
  recommendation?: {
    summary?: string;
    bullets?: string[];
    commentaryRecommended?: boolean;
    lightTouchOnly?: boolean;
    suggestedMode?: string;
    commentaryStyle?: string;
  };
  userOverrides?: {
    commentaryPersona?: string;
    commentaryStyle?: string;
    reimaginePresetId?: string;
  };
  audioStoryPlan?: {
    foleyEvents?: Array<{ enabled?: boolean }>;
    commentary?: { segments?: unknown[] };
  };
  audioEdl?: unknown[];
};

/** Map Advanced mode → TTS voice style when Analyze did not set one. */
function commentaryStyleFromMode(mode: SoundDesignMode): string | undefined {
  switch (mode) {
    case "broadcast":
      return "sports-broadcast";
    case "cinematic":
      return "cinematic";
    case "energetic":
      return "energetic";
    case "comedy":
      return "comedy";
    case "natural":
      return "natural";
    default:
      return undefined;
  }
}

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

/** Google Neural2 commentary voices — 1 man + 2 women. */
const COMMENTARY_VOICES = [
  { id: "en-US-Neural2-J", label: "Man — Broadcast" },
  { id: "en-US-Neural2-F", label: "Woman — Clear" },
  { id: "en-US-Neural2-C", label: "Woman — Warm" },
] as const;
type CommentaryVoiceId = (typeof COMMENTARY_VOICES)[number]["id"];

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
      const it = raw as Partial<TimelineEdlItem> & {
        assetId?: string;
        sourceUrl?: string;
        metadata?: { awaitingTts?: boolean };
      };
      if (!it?.id || !it.type || typeof it.startMs !== "number") return null;
      // Heal commentary parked enabled:false while awaiting TTS (mute is user-only).
      const parkedAwaitingTts =
        it.type === "voice" &&
        it.enabled === false &&
        (it.metadata?.awaitingTts === true ||
          (Boolean(it.assetId) && !it.sourceUrl));
      return {
        id: String(it.id),
        type: it.type as TimelineEdlItem["type"],
        startMs: it.startMs,
        endMs: typeof it.endMs === "number" ? it.endMs : undefined,
        gainDb: typeof it.gainDb === "number" ? it.gainDb : 0,
        enabled: parkedAwaitingTts ? true : it.enabled !== false,
        assetId: typeof it.assetId === "string" ? it.assetId : undefined,
        sourceUrl: typeof it.sourceUrl === "string" ? it.sourceUrl : undefined,
        metadata: it.metadata,
      };
    })
    .filter(Boolean) as TimelineEdlItem[];
}

function StepPill({
  n,
  label,
  active,
  done,
}: {
  n: number;
  label: string;
  active?: boolean;
  done?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-md px-1 py-1.5 text-center sm:flex-row sm:gap-1 sm:px-1.5",
        done && "bg-emerald-500/20 text-emerald-200",
        active && !done && "bg-white/15 text-white",
        !active && !done && "bg-white/5 text-white/35",
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold",
          done ? "bg-emerald-400 text-black" : active ? "bg-white text-black" : "bg-white/10",
        )}
      >
        {done ? <Check className="h-2.5 w-2.5" /> : n}
      </span>
      <span className="whitespace-nowrap text-[9px] font-semibold uppercase leading-none tracking-normal sm:text-[10px]">
        {label}
      </span>
    </div>
  );
}

type EdlLike = {
  type?: string;
  startMs?: number;
  endMs?: number;
  enabled?: boolean;
};

/** Gain beds always sit on the keep window; timed clips must intersect it. */
function edlItemInKeepWindow(item: EdlLike, durationMs: number): boolean {
  const t = item.type;
  if (t === "original" || t === "ambience" || t === "music") return true;
  if (typeof item.startMs !== "number" || !Number.isFinite(item.startMs)) return false;
  const start = item.startMs;
  const end =
    typeof item.endMs === "number" && Number.isFinite(item.endMs)
      ? item.endMs
      : start + (t === "foley" ? 450 : 2200);
  return end > 0 && start < durationMs;
}

/**
 * Counts only clips that actually appear on the Review ruler (keep / trim length).
 * Plan segment totals were higher when TTS failed or events sat past the trim end.
 */
function summaryFromEdl(edl: unknown[], durationMs?: number): string | null {
  if (!Array.isArray(edl) || !edl.length) return null;
  const win = Math.max(1, durationMs ?? Number.POSITIVE_INFINITY);
  let voice = 0;
  let foley = 0;
  let visible = 0;
  let outside = 0;
  for (const raw of edl) {
    const item = raw as EdlLike;
    const on = item.enabled !== false;
    if (!on) continue;
    if (!edlItemInKeepWindow(item, win)) {
      if (item.type === "voice" || item.type === "foley") outside += 1;
      continue;
    }
    visible += 1;
    if (item.type === "voice") voice += 1;
    if (item.type === "foley") foley += 1;
  }
  if (!visible && !outside) return null;
  const parts: string[] = [];
  if (voice) parts.push(`${voice} commentary`);
  if (foley) parts.push(`${foley} Foley`);
  parts.push(`${visible} on timeline`);
  if (outside > 0) parts.push(`${outside} outside keep`);
  return parts.join(" · ");
}

function planSummaryFromState(
  state: PersistedSoundDesign,
  durationMs?: number,
): string | null {
  const edl = Array.isArray(state.audioEdl) ? state.audioEdl : [];
  return summaryFromEdl(edl, durationMs);
}

type Props = {
  contentId: string | null;
  /** Trim / keep length in seconds — drives plan + timeline ruler (not full source). */
  durationSec: number;
  creatorContext: string;
  disabled?: boolean;
  storyEngine?: boolean;
  /** Fired after plan/TTS/reimagine so parent can refresh Final Render layer checklist. */
  onApplied?: (snapshot?: PersistedSoundDesign) => void;
  /** When set, step-3 Review + timeline render here (after trim timeline) for more width. */
  reviewHostEl?: HTMLElement | null;
  /** Hydrate from clipEditSpec.extras.soundDesign after refresh / Creator Hub. */
  initialSoundDesign?: PersistedSoundDesign | null;
  /** SRC gain ↔ Polish Original live sync. */
  onOriginalLevelChange?: (linear: number, muted: boolean) => void;
  /** BGM rail mute ↔ Polish Music mute (commentary+Foley-only mixes). */
  onMusicMuteChange?: (muted: boolean) => void;
  /** Parent registers a setter so Polish Original can drive SRC. */
  onRegisterOriginalSync?: (api: {
    setFromLinear: (linear: number, muted: boolean) => void;
  }) => void;
  /** Parent registers a setter so Polish Music mute drives the BGM rail. */
  onRegisterMusicSync?: (api: { setMuted: (muted: boolean) => void }) => void;
};

function gainDbToLinear(db: number): number {
  const clamped = Math.min(6, Math.max(-24, db));
  return Math.min(1, Math.pow(10, clamped / 20));
}

function linearToGainDb(linear: number): number {
  if (linear <= 0) return -24;
  const db = 20 * Math.log10(Math.min(1, Math.max(0.01, linear)));
  return Math.round(Math.min(6, Math.max(-24, db)) * 2) / 2;
}

/**
 * Flagship Sound Engine UI.
 * Principle: Understand the clip first. Design the sound second.
 * No Reimagine / Apply until Analyze completes.
 */
export function SoundDesignPanel({
  contentId,
  durationSec,
  creatorContext,
  disabled,
  storyEngine,
  onApplied,
  reviewHostEl,
  initialSoundDesign,
  onOriginalLevelChange,
  onMusicMuteChange,
  onRegisterOriginalSync,
  onRegisterMusicSync,
}: Props) {
  const [mode, setMode] = useState<SoundDesignMode>("auto");
  const [components, setComponents] = useState<SoundDesignComponents>(DEFAULT_COMPONENTS);
  const [busy, setBusy] = useState<"analyze" | "plan" | "tts" | "reimagine" | "edl" | null>(null);
  const [ttsInfo, setTtsInfo] = useState<string | null>(null);
  /** True when commentary was planned but TTS upload/EDL step failed (Foley still usable). */
  const [ttsDeferred, setTtsDeferred] = useState(false);
  const [premiumVoice, setPremiumVoice] = useState(false);
  const [commentaryVoiceId, setCommentaryVoiceId] =
    useState<CommentaryVoiceId>("en-US-Neural2-J");
  const [analyzed, setAnalyzed] = useState(false);
  const [recommendation, setRecommendation] = useState<{
    summary: string;
    bullets: string[];
    commentaryRecommended?: boolean;
    lightTouchOnly?: boolean;
    suggestedMode?: string;
    commentaryStyle?: string;
  } | null>(null);
  const [visualMoments, setVisualMoments] = useState<
    Array<{ id: string; startMs: number; description: string }>
  >([]);
  const [commentaryPersona, setCommentaryPersona] = useState("");
  const [planSummary, setPlanSummary] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEdlItem[]>([]);
  const [lastPreset, setLastPreset] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const hydratedRef = useRef(false);
  const clipPreviewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    hydratedRef.current = false;
  }, [contentId]);

  // Restore Analyze / Treat / Review after refresh or re-open from Creator Hub.
  useEffect(() => {
    if (hydratedRef.current || !initialSoundDesign) return;
    hydratedRef.current = true;

    const sd = initialSoundDesign;
    if (sd.mode && MODES.some(([m]) => m === sd.mode)) {
      setMode(sd.mode as SoundDesignMode);
    }
    if (sd.components && typeof sd.components === "object") {
      setComponents({ ...DEFAULT_COMPONENTS, ...sd.components });
    }
    const rec = sd.recommendation;
    if (rec?.summary) {
      setRecommendation({
        summary: String(rec.summary),
        bullets: Array.isArray(rec.bullets) ? rec.bullets.map(String) : [],
        commentaryRecommended: Boolean(rec.commentaryRecommended),
        lightTouchOnly: Boolean(rec.lightTouchOnly),
        suggestedMode: rec.suggestedMode ? String(rec.suggestedMode) : undefined,
        commentaryStyle: rec.commentaryStyle ? String(rec.commentaryStyle) : undefined,
      });
    }
    const persona = sd.userOverrides?.commentaryPersona;
    if (typeof persona === "string" && persona.trim()) {
      setCommentaryPersona(persona.trim().slice(0, 240));
    }
    if (sd.userOverrides?.reimaginePresetId) {
      setLastPreset(String(sd.userOverrides.reimaginePresetId));
    }
    const planVoice = (sd.audioStoryPlan as { commentary?: { voiceId?: string } } | undefined)
      ?.commentary?.voiceId;
    if (
      planVoice === "en-US-Neural2-J" ||
      planVoice === "en-US-Neural2-F" ||
      planVoice === "en-US-Neural2-C"
    ) {
      setCommentaryVoiceId(planVoice);
    }
    const edl = toTimelineItems(Array.isArray(sd.audioEdl) ? sd.audioEdl : []);
    if (edl.length) {
      setTimeline(edl);
      const orig = edl.find((it) => it.type === "original");
      if (orig && onOriginalLevelChange) {
        const muted = orig.enabled === false;
        onOriginalLevelChange(muted ? 0 : gainDbToLinear(orig.gainDb), muted);
      }
      const music = edl.find((it) => it.type === "music");
      if (music && onMusicMuteChange) {
        onMusicMuteChange(music.enabled === false);
      }
    }
    const keepMs = Math.max(1000, Math.round(Math.max(0.5, durationSec) * 1000));
    const summary = planSummaryFromState(sd, keepMs);
    if (summary) setPlanSummary(summary);
    // Analyze persisted recommendation or any generated plan/EDL → skip step 1.
    if (rec?.summary || sd.audioStoryPlan || edl.length) {
      setAnalyzed(true);
    }
  }, [contentId, initialSoundDesign, onOriginalLevelChange, onMusicMuteChange, durationSec]);

  const keepDurationMs = Math.max(1000, Math.round(Math.max(0.5, durationSec) * 1000));

  // Keep Review header in sync with what the ruler can actually show.
  useEffect(() => {
    if (!timeline.length) return;
    setPlanSummary(summaryFromEdl(timeline, keepDurationMs) || `${timeline.length} on timeline`);
  }, [timeline, keepDurationMs]);

  const visibleTimeline = useMemo(
    () =>
      timeline.filter((it) =>
        edlItemInKeepWindow(
          { type: it.type, startMs: it.startMs, endMs: it.endMs, enabled: it.enabled },
          keepDurationMs,
        ),
      ),
    [timeline, keepDurationMs],
  );

  const outsideKeepCount = useMemo(() => {
    return timeline.filter((it) => {
      if (it.type !== "voice" && it.type !== "foley") return false;
      if (it.enabled === false) return false;
      return !edlItemInKeepWindow(
        { type: it.type, startMs: it.startMs, endMs: it.endMs, enabled: it.enabled },
        keepDurationMs,
      );
    }).length;
  }, [timeline, keepDurationMs]);

  const hasPlan = Boolean(planSummary || timeline.length);
  const step = !analyzed ? 1 : !hasPlan ? 2 : 3;
  const voiceNeedsTts = useMemo(
    () =>
      timeline.some(
        (it) =>
          it.type === "voice" &&
          it.enabled !== false &&
          !isHttpAudioUrl(it.sourceUrl),
      ),
    [timeline],
  );

  const snapshotSoundDesign = (edlOverride?: TimelineEdlItem[]): PersistedSoundDesign => ({
    mode,
    components,
    recommendation: recommendation || undefined,
    audioEdl: (edlOverride || timeline).map((it) => ({
      id: it.id,
      type: it.type,
      startMs: it.startMs,
      endMs: it.endMs,
      gainDb: it.gainDb,
      enabled: it.enabled,
      assetId: it.assetId,
      sourceUrl: it.sourceUrl,
      metadata: it.metadata,
    })),
  });

  const notifyApplied = (edlOverride?: TimelineEdlItem[]) => {
    onApplied?.(snapshotSoundDesign(edlOverride));
  };

  const stopClipPreview = () => {
    const audio = clipPreviewAudioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      try {
        audio.load();
      } catch {
        /* ignore */
      }
    }
    setPreviewingId(null);
  };

  useEffect(() => () => stopClipPreview(), []);

  const playClipUrl = (itemId: string, url: string, kind: "voice" | "foley") => {
    const audio = clipPreviewAudioRef.current || new Audio();
    clipPreviewAudioRef.current = audio;
    audio.onended = () => setPreviewingId(null);
    audio.onerror = () => {
      setPreviewingId(null);
      toast.error(
        kind === "voice"
          ? "Could not play commentary — try Retry TTS"
          : "Could not play Foley preview",
      );
    };
    audio.src = url;
    void audio
      .play()
      .then(() => setPreviewingId(itemId))
      .catch(() => {
        setPreviewingId(null);
        toast.error("Preview blocked — tap again after interacting with the page");
      });
  };

  const voiceSegmentId = (item: TimelineEdlItem): string | null => {
    if (item.type !== "voice") return null;
    if (item.id.startsWith("ed-voice-")) return item.id.slice("ed-voice-".length);
    return item.id || null;
  };

  const previewTimelineClip = (item: TimelineEdlItem) => {
    if (item.type !== "voice" && item.type !== "foley") return;
    if (previewingId === item.id) {
      stopClipPreview();
      return;
    }
    stopClipPreview();

    const label =
      item.type === "voice"
        ? item.metadata?.text?.trim() || "Commentary"
        : String(item.metadata?.type || item.assetId || "Foley").replace(/[-_]/g, " ");

    if (item.type === "foley") {
      const url =
        resolveSfxPreviewUrl(item.assetId, item.metadata?.type, item.sourceUrl) ||
        (isHttpAudioUrl(item.sourceUrl) ? item.sourceUrl! : null);
      if (!url) {
        toast.message(label, {
          description:
            "No matching Foley sample in the preview pack for this id. Re-apply Treat, or it may still burn if the worker catalog has it.",
        });
        return;
      }
      playClipUrl(item.id, url, "foley");
      return;
    }

    // Commentary: play signed URL if present; otherwise synthesize / refresh then play.
    if (isHttpAudioUrl(item.sourceUrl)) {
      playClipUrl(item.id, item.sourceUrl!, "voice");
      return;
    }

    if (!contentId) {
      toast.message(label, {
        description: "Open this clip again, then tap ▶ to generate voice audio.",
      });
      return;
    }

    const segId = voiceSegmentId(item);
    void (async () => {
      setBusy("tts");
      toast.loading("Generating commentary voice…", { id: "voice-preview" });
      try {
        const tts = await contentApi.synthesizeSoundDesign(contentId, {
          durationSec: Math.max(0.5, durationSec),
          voiceId: commentaryVoiceId,
          voiceQuality: premiumVoice ? "premium" : "standard",
          ...(segId ? { segmentIds: [segId] } : {}),
        });
        const edl = (tts.audioEdl as unknown[]) || [];
        const items = toTimelineItems(edl);
        setTimeline(items);
        setPlanSummary(
          summaryFromEdl(edl, keepDurationMs) || `${items.length} on timeline`,
        );
        setTtsDeferred(tts.failed > 0 && tts.synthesized === 0);
        setTtsInfo(
          `TTS ${tts.provider}: ${tts.synthesized} segments${
            tts.failed ? `, ${tts.failed} skipped` : ""
          }`,
        );
        notifyApplied(items);
        const refreshed =
          items.find((it) => it.id === item.id) ||
          items.find(
            (it) =>
              it.type === "voice" &&
              (it.metadata?.text || "").trim() === (item.metadata?.text || "").trim(),
          );
        if (refreshed && isHttpAudioUrl(refreshed.sourceUrl)) {
          toast.success("Commentary voice ready", { id: "voice-preview" });
          playClipUrl(refreshed.id, refreshed.sourceUrl!, "voice");
          return;
        }
        setTtsDeferred(true);
        toast.error("Voice audio still missing", {
          id: "voice-preview",
          description:
            tts.failed > 0
              ? "TTS failed for this line — check AI voice config, then Retry TTS."
              : "Tap Retry TTS, then preview again.",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "TTS failed";
        setTtsDeferred(true);
        setTtsInfo(`Commentary TTS failed — ${message}`);
        toast.error("Could not generate commentary voice", {
          id: "voice-preview",
          description: message,
        });
      } finally {
        setBusy(null);
      }
    })();
  };

  const retrySynthesize = async (opts?: {
    segmentIds?: string[];
    segmentPatches?: Array<{ id: string; text?: string; startMs?: number }>;
  }) => {
    if (!contentId) return;
    setBusy("tts");
    try {
      const tts = await contentApi.synthesizeSoundDesign(contentId, {
        durationSec: Math.max(0.5, durationSec),
        voiceId: commentaryVoiceId,
        voiceQuality: premiumVoice ? "premium" : "standard",
        ...(opts?.segmentIds?.length ? { segmentIds: opts.segmentIds } : {}),
        ...(opts?.segmentPatches?.length
          ? { segmentPatches: opts.segmentPatches }
          : {}),
      });
      const edl = (tts.audioEdl as unknown[]) || [];
      const items = toTimelineItems(edl);
      setTimeline(items);
      setPlanSummary(
        summaryFromEdl(edl, keepDurationMs) || `${items.length} on timeline`,
      );
      setTtsDeferred(false);
      setTtsInfo(
        `TTS ${tts.provider}: ${tts.synthesized} segments${
          tts.failed ? `, ${tts.failed} skipped` : ""
        }`,
      );
      toast.success(
        opts?.segmentPatches?.length
          ? "Commentary text updated — voice regenerated"
          : "Commentary synthesized — voice layer ready",
      );
      notifyApplied(items);
    } catch (err) {
      const message = err instanceof Error ? err.message : "TTS failed";
      setTtsDeferred(true);
      setTtsInfo(`Commentary TTS failed — Foley/ambience still available. ${message}`);
      toast.error("Could not synthesize commentary", { description: message });
    } finally {
      setBusy(null);
    }
  };

  const commitVoiceText = (item: TimelineEdlItem, text: string) => {
    const segId = voiceSegmentId(item);
    if (!segId || !contentId) return;
    // Optimistic local text so the editor reflects the edit immediately.
    setTimeline((prev) =>
      prev.map((it) =>
        it.id === item.id
          ? {
              ...it,
              sourceUrl: undefined,
              assetId: undefined,
              metadata: { ...it.metadata, text },
            }
          : it,
      ),
    );
    void retrySynthesize({
      segmentIds: [segId],
      segmentPatches: [{ id: segId, text, startMs: item.startMs }],
    });
  };

  const suggestedPresets = useMemo(
    () =>
      suggestReimaginePresets({
        suggestedMode: recommendation?.suggestedMode || mode,
        creatorContext,
        summary: recommendation?.summary,
      }),
    [recommendation, mode, creatorContext],
  );

  const creditPreview = useMemo(
    () =>
      estimateCredits({
        analyze: !analyzed,
        plan: true,
        commentaryOn: components.aiCommentary,
        durationSec: Math.max(0.5, durationSec),
        premiumVoice,
      }),
    [analyzed, components.aiCommentary, durationSec, premiumVoice],
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
      const rec = res.recommendation
        ? {
            ...res.recommendation,
            suggestedMode: res.recommendation.suggestedMode,
            commentaryStyle: res.recommendation.commentaryStyle,
          }
        : null;
      setRecommendation(rec);
      const moments = (Array.isArray(res.visualEvents) ? res.visualEvents : [])
        .map((raw) => {
          const e = raw as {
            id?: string;
            startMs?: number;
            description?: string;
            type?: string;
          };
          const startMs = Number(e.startMs);
          if (!Number.isFinite(startMs)) return null;
          return {
            id: String(e.id || `ve-${startMs}`),
            startMs,
            description: String(e.description || e.type || "moment").slice(0, 160),
          };
        })
        .filter((e): e is { id: string; startMs: number; description: string } => Boolean(e))
        .sort((a, b) => a.startMs - b.startMs)
        .slice(0, 8);
      setVisualMoments(moments);
      setAnalyzed(true);
      setLastPreset(null);
      setPlanSummary(null);
      setTimeline([]);
      setTtsInfo(null);
      if (rec?.commentaryRecommended) {
        setComponents((c) => ({ ...c, aiCommentary: true }));
      }
      if (rec?.suggestedMode) {
        setMode(rec.suggestedMode as SoundDesignMode);
      }
      toast.success(
        moments.length
          ? `Clip understood — ${moments.length} action moment${moments.length === 1 ? "" : "s"} found`
          : "Clip understood — choose a treatment",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sound Design analyze failed");
    } finally {
      setBusy(null);
    }
  };

  const notifyOriginalLevel = (items: TimelineEdlItem[]) => {
    const orig = items.find((it) => it.type === "original");
    if (orig && onOriginalLevelChange) {
      const muted = orig.enabled === false;
      onOriginalLevelChange(muted ? 0 : gainDbToLinear(orig.gainDb), muted);
    }
    const music = items.find((it) => it.type === "music");
    if (music && onMusicMuteChange) {
      onMusicMuteChange(music.enabled === false);
    }
  };

  const applyEdlLocal = async (items: TimelineEdlItem[]) => {
    setTimeline(items);
    setPlanSummary(
      summaryFromEdl(items, keepDurationMs) || `${items.length} on timeline`,
    );
    notifyOriginalLevel(items);
    notifyApplied(items);
    if (!contentId) return;
    setBusy("edl");
    try {
      // Send timing/mute only — server merges assetId/sourceUrl so long signed URLs
      // are not re-validated on every drag (that was causing PATCH 500s).
      await contentApi.patchSoundDesignEdl(contentId, {
        audioEdl: items.map((it) => ({
          id: it.id,
          type: it.type,
          startMs: it.startMs,
          endMs: it.endMs,
          gainDb: it.gainDb,
          enabled: it.enabled,
          assetId: it.assetId,
          metadata: it.metadata,
        })),
        durationMs: Math.max(1000, Math.round(durationSec * 1000)),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save timeline edits");
    } finally {
      setBusy(null);
    }
  };

  // Polish Original → SRC bar
  useEffect(() => {
    if (!onRegisterOriginalSync) return;
    onRegisterOriginalSync({
      setFromLinear: (linear, muted) => {
        setTimeline((prev) => {
          const idx = prev.findIndex((it) => it.type === "original");
          if (idx < 0) return prev;
          const next = [...prev];
          const cur = next[idx]!;
          next[idx] = {
            ...cur,
            gainDb: muted || (linear <= 0) ? cur.gainDb : linearToGainDb(linear),
            enabled: !(muted || (linear <= 0)),
          };
          void (async () => {
            if (!contentId) return;
            try {
              await contentApi.patchSoundDesignEdl(contentId, {
                audioEdl: next.map((it) => ({
                  id: it.id,
                  type: it.type,
                  startMs: it.startMs,
                  endMs: it.endMs,
                  gainDb: it.gainDb,
                  enabled: it.enabled,
                  assetId: it.assetId,
                  metadata: it.metadata,
                })),
                durationMs: Math.max(1000, Math.round(durationSec * 1000)),
              });
            } catch {
              /* polish slider stays local; next timeline edit retries */
            }
          })();
          return next;
        });
      },
    });
  }, [onRegisterOriginalSync, contentId, durationSec]);

  // Polish Music mute → BGM rail
  useEffect(() => {
    if (!onRegisterMusicSync) return;
    onRegisterMusicSync({
      setMuted: (muted) => {
        setTimeline((prev) => {
          const idx = prev.findIndex((it) => it.type === "music");
          if (idx < 0) {
            onMusicMuteChange?.(muted);
            return prev;
          }
          const next = [...prev];
          const cur = next[idx]!;
          next[idx] = { ...cur, enabled: !muted };
          onMusicMuteChange?.(muted);
          void (async () => {
            if (!contentId) return;
            try {
              await contentApi.patchSoundDesignEdl(contentId, {
                audioEdl: next.map((it) => ({
                  id: it.id,
                  type: it.type,
                  startMs: it.startMs,
                  endMs: it.endMs,
                  gainDb: it.gainDb,
                  enabled: it.enabled,
                  assetId: it.assetId,
                  metadata: it.metadata,
                })),
                durationMs: Math.max(1000, Math.round(durationSec * 1000)),
              });
            } catch {
              /* polish mute stays local */
            }
          })();
          return next;
        });
      },
    });
  }, [onRegisterMusicSync, onMusicMuteChange, contentId, durationSec]);

  const planAndApply = async () => {
    if (!contentId) return;
    if (!analyzed) {
      toast.message("Analyze first", {
        description: "nxClip designs sound from what it understands about the clip.",
      });
      return;
    }
    setBusy("plan");
    try {
      const res = await contentApi.planSoundDesign(contentId, {
        creatorContext: creatorContext || undefined,
        mode,
        components,
        durationSec: Math.max(0.5, durationSec),
        voiceId: commentaryVoiceId,
        commentaryStyle:
          recommendation?.commentaryStyle || commentaryStyleFromMode(mode),
        commentaryPersona: commentaryPersona.trim() || undefined,
      });
      const foley = res.audioStoryPlan?.foleyEvents?.filter((f) => f.enabled).length ?? 0;
      const voice = res.audioStoryPlan?.commentary?.segments?.length ?? 0;
      let edl = (res.audioEdl as unknown[]) || [];
      const synth = (res as { synthesize?: { provider?: string; synthesized?: number; failed?: number } })
        .synthesize;
      if (synth) {
        setTtsDeferred(false);
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
            voiceId: commentaryVoiceId,
            voiceQuality: premiumVoice ? "premium" : "standard",
          });
          edl = (tts.audioEdl as unknown[]) || edl;
          setTtsDeferred(false);
          setTtsInfo(
            `TTS ${tts.provider}: ${tts.synthesized} segments${
              tts.failed ? `, ${tts.failed} skipped` : ""
            }`,
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : "TTS failed";
          setTtsDeferred(true);
          setTtsInfo(
            `Commentary TTS failed — Foley/ambience still available. ${message}`,
          );
          toast.message("Sound plan saved without voice", {
            description: "Retry commentary TTS when ready — Foley stays on the timeline.",
          });
        }
      } else {
        setTtsDeferred(false);
        setTtsInfo(null);
      }
      const items = toTimelineItems(edl);
      setTimeline(items);
      notifyOriginalLevel(items);
      setLastPreset(null);
      setPlanSummary(
        summaryFromEdl(edl, keepDurationMs) || `${items.length} on timeline`,
      );
      const plannedVoice = voice;
      const onTimelineVoice = items.filter(
        (i) =>
          i.type === "voice" &&
          edlItemInKeepWindow(
            { type: i.type, startMs: i.startMs, endMs: i.endMs, enabled: i.enabled },
            keepDurationMs,
          ),
      ).length;
      if (plannedVoice > onTimelineVoice) {
        toast.message("Sound plan applied", {
          description: `${onTimelineVoice} of ${plannedVoice} commentary lines are on the timeline${
            plannedVoice - onTimelineVoice > 0
              ? " — use Retry TTS if lines are missing"
              : ""
          }.`,
        });
      } else {
        toast.success("Sound plan applied — review timeline, then Render");
      }
      notifyApplied(items);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sound Design plan failed");
    } finally {
      setBusy(null);
    }
  };

  const reimagine = async (presetId: string) => {
    if (!contentId) return;
    if (!analyzed) {
      toast.message("Analyze first", {
        description: "Reimagine needs clip understanding for synced Foley and commentary.",
      });
      return;
    }
    setBusy("reimagine");
    setLastPreset(presetId);
    const loadingToast = toast.loading("Reimagining sound package…");
    try {
      const res = await contentApi.reimagineSoundDesign(contentId, {
        presetId,
        durationSec: Math.max(0.5, durationSec),
        creatorContext: creatorContext || undefined,
        voiceId: commentaryVoiceId,
        commentaryPersona: commentaryPersona.trim() || undefined,
      });
      const foley = res.audioStoryPlan?.foleyEvents?.filter((f) => f.enabled).length ?? 0;
      const voice = res.audioStoryPlan?.commentary?.segments?.length ?? 0;
      const edl = (res.audioEdl as unknown[]) || [];
      const items = toTimelineItems(edl);
      setTimeline(items);
      const edlSummary = summaryFromEdl(edl, keepDurationMs);
      setPlanSummary(
        edlSummary
          ? `${res.preset?.name || presetId}: ${edlSummary}`
          : `${res.preset?.name || presetId}: ${items.length} on timeline`,
      );
      if (res.synthesize) {
        setTtsDeferred(false);
        setTtsInfo(
          `TTS ${res.synthesize.provider || "voice"}: ${res.synthesize.synthesized ?? 0} segments`,
        );
      } else if (voice > 0) {
        setTtsDeferred(true);
        setTtsInfo("Commentary planned — synthesize voice to add the VOICE layer");
      }
      if (res.audioStoryPlan) {
        setComponents((c) => ({
          ...c,
          aiCommentary: voice > 0 || c.aiCommentary,
          aiFoley: foley > 0 || c.aiFoley,
        }));
      }
      toast.success(`Reimagined as ${res.preset?.name || presetId}`, { id: loadingToast });
      notifyApplied(items);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reimagine failed", { id: loadingToast });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-400/25 bg-gradient-to-b from-emerald-950/40 via-black/50 to-black/30 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 100% at 20% 0%, rgba(52,211,153,0.35), transparent 70%)",
        }}
      />

      <div className="relative space-y-4 p-4">
        <header className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300/90">
                nxClip Sound Engine
              </p>
              <h3 className="mt-0.5 flex items-center gap-2 text-base font-semibold text-white">
                <Headphones className="h-4 w-4 text-emerald-400" />
                AI Sound Design
                {storyEngine ? (
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-200">
                    Story Engine
                  </span>
                ) : null}
              </h3>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-white/60">
            Understand the clip first. Design the sound second. Non-destructive until you Render.
          </p>
          <div className="grid grid-cols-3 gap-1">
            <StepPill n={1} label="Understand" active={step === 1} done={analyzed} />
            <StepPill n={2} label="Treat" active={step === 2} done={hasPlan} />
            <StepPill n={3} label="Review" active={step === 3} done={hasPlan && step === 3} />
          </div>
        </header>

        {/* STEP 1 */}
        <section
          className={cn(
            "space-y-3 rounded-xl border p-3",
            step === 1
              ? "border-emerald-400/40 bg-emerald-500/10"
              : "border-white/10 bg-black/25",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                1 · Understand
              </p>
              <p className="mt-1 text-xs text-white/65">
                Required. Finds moments and recommends Foley, ambience, and whether commentary helps.
              </p>
            </div>
            {analyzed ? (
              <span className="shrink-0 rounded-full bg-emerald-500/25 px-2 py-0.5 text-[10px] text-emerald-100">
                Ready
              </span>
            ) : null}
          </div>
          <Button
            type="button"
            size="sm"
            disabled={!contentId || disabled || Boolean(busy)}
            onClick={() => void analyze()}
            className="w-full bg-emerald-500 text-black hover:bg-emerald-400 sm:w-auto"
          >
            {busy === "analyze" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {analyzed ? "Re-analyze clip" : "Analyze clip"}
          </Button>
          {recommendation && (
            <div className="rounded-lg border border-emerald-500/20 bg-black/30 p-2.5 text-xs text-white/85">
              <p className="font-medium text-emerald-300">What nxClip saw &amp; heard</p>
              <p className="mt-1">{recommendation.summary}</p>
              {visualMoments.length > 0 ? (
                <div className="mt-2 space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
                    Action moments
                  </p>
                  <ul className="space-y-1">
                    {visualMoments.map((m) => (
                      <li
                        key={m.id}
                        className="flex gap-2 rounded-md bg-black/35 px-2 py-1 text-[11px] text-white/75"
                      >
                        <span className="shrink-0 font-mono text-emerald-300/80">
                          {(m.startMs / 1000).toFixed(1)}s
                        </span>
                        <span className="min-w-0 leading-snug">{m.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-white/65">
                {recommendation.bullets?.slice(0, 5).map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              {recommendation.suggestedMode ? (
                <p className="mt-2 text-[11px] text-white/45">
                  Suggested mode:{" "}
                  <span className="font-medium text-white/80">{recommendation.suggestedMode}</span>
                </p>
              ) : null}
            </div>
          )}
        </section>

        {/* STEP 2 — locked until analyze */}
        <section
          className={cn(
            "space-y-3 rounded-xl border p-3 transition-opacity",
            analyzed
              ? step === 2
                ? "border-emerald-400/35 bg-emerald-500/5"
                : "border-white/10 bg-black/25"
              : "pointer-events-none border-white/5 bg-black/10 opacity-45",
          )}
          aria-disabled={!analyzed}
        >
          <div>
            <p
              className={cn(
                "text-[10px] font-bold uppercase tracking-wide",
                analyzed ? "text-emerald-300" : "text-white/50",
              )}
            >
              2 · Treat
            </p>
            <p className="mt-1 text-xs text-white/55">
              {analyzed
                ? "Apply the recommendation, or leap with a matching Reimagine preset."
                : "Locked until Analyze finishes — prevents mismatched Foley / commentary."}
            </p>
          </div>

          {analyzed && (
            <>
              <div className="space-y-2">
                <p className="text-[11px] font-medium text-white/80">Commentary voice</p>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                  {COMMENTARY_VOICES.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      disabled={disabled || Boolean(busy)}
                      onClick={() => setCommentaryVoiceId(v.id)}
                      className={cn(
                        "rounded-lg border px-2 py-1.5 text-left text-[11px] font-medium transition-colors",
                        commentaryVoiceId === v.id
                          ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-50"
                          : "border-white/10 bg-black/30 text-white/65 hover:border-white/25 hover:text-white/90",
                      )}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-white/35">
                  Talent voice (man/woman). Style &amp; thrill come from Reimagine presets +
                  persona notes below — not celebrity cloning.
                </p>
                <label className="block space-y-1">
                  <span className="text-[11px] font-medium text-white/80">
                    Commentary persona / style notes
                  </span>
                  <textarea
                    rows={2}
                    maxLength={240}
                    disabled={disabled || Boolean(busy)}
                    value={commentaryPersona}
                    onChange={(e) => setCommentaryPersona(e.target.value.slice(0, 240))}
                    placeholder="e.g. English cricket booth energy — witty, anticipatory, punchy calls; dry wit under pressure"
                    className="w-full resize-y rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 text-[11px] text-white/85 placeholder:text-white/30 focus:border-emerald-400/40 focus:outline-none"
                  />
                  <span className="block text-[10px] text-white/35">
                    Guides script tone &amp; delivery (accent flavor, wit, energy). Does not clone a
                    real person&apos;s voice — describe the style you want.
                  </span>
                </label>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-medium text-white/80">Recommended path</p>
                <Button
                  type="button"
                  size="sm"
                  disabled={!contentId || disabled || Boolean(busy)}
                  onClick={() => void planAndApply()}
                  className="w-full"
                >
                  {busy === "plan" || busy === "tts" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Headphones className="h-3.5 w-3.5" />
                  )}
                  Preview & Apply recommended
                </Button>
                <p className="text-[10px] text-white/40">
                  Uses suggested mode ({mode}) and layer toggles. Safest for quality.
                </p>
              </div>

              <div className="border-t border-white/10 pt-3">
                <ReimaginePresets
                  disabled={disabled}
                  busy={busy === "reimagine"}
                  lockedUntilAnalyze={false}
                  suggestedIds={suggestedPresets}
                  lastPresetId={lastPreset}
                  onSelect={(id) => void reimagine(id)}
                />
              </div>

              <details
                className="rounded-lg border border-white/10 bg-black/20"
                open={showAdvanced}
                onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}
              >
                <summary className="cursor-pointer px-3 py-2 text-[11px] text-white/55">
                  Advanced — manual mode & layers
                  <span className="ml-1 text-white/35">(not Reimagine presets)</span>
                </summary>
                <div className="space-y-2 border-t border-white/10 px-3 py-2">
                  <p className="text-[10px] text-white/40">
                    <strong className="text-white/60">Auto</strong> = follow Analyze suggestion. These
                    chips only affect Preview & Apply — not the Reimagine buttons above.
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
                          mode === id
                            ? "bg-emerald-500/90 text-black"
                            : "bg-white/10 text-white/80",
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
                    <label className="flex items-center gap-2 text-white/50">
                      <input
                        type="checkbox"
                        checked={premiumVoice}
                        disabled={disabled || Boolean(busy)}
                        onChange={() => setPremiumVoice((v) => !v)}
                      />
                      Premium TTS (ElevenLabs) — credit estimate only; no billing change
                    </label>
                  </div>
                </div>
              </details>
            </>
          )}
        </section>

        {hasPlan && reviewHostEl ? (
          <p className="rounded-lg border border-emerald-400/20 bg-emerald-500/5 px-2.5 py-2 text-[11px] text-emerald-100/80">
            Plan ready{planSummary ? `: ${planSummary}` : ""}. Timeline is below the clip preview —
            use ▶ on commentary notes or{" "}
            <span className="font-semibold text-emerald-200">Retry TTS</span> there before Save &amp;
            Render.
          </p>
        ) : null}

        {hasPlan && (ttsDeferred || voiceNeedsTts) ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-400/35 bg-amber-500/10 px-2.5 py-2">
            <p className="min-w-0 flex-1 text-[11px] text-amber-100/90">
              Commentary needs voice audio before Final Render.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 shrink-0 border-amber-400/50 bg-amber-500/15 px-3 text-[11px] font-semibold text-amber-50 hover:bg-amber-500/25"
              disabled={disabled || Boolean(busy)}
              onClick={() => void retrySynthesize()}
            >
              {busy === "tts" ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Volume2 className="mr-1.5 h-3.5 w-3.5" />
              )}
              Retry TTS
            </Button>
          </div>
        ) : null}

        <footer className="text-[10px] text-white/35">
          Est. ~{creditPreview.credits} sound credits · {creditPreview.label}
        </footer>
      </div>

      {hasPlan
        ? (() => {
            const review = (
              <section
                className={cn(
                  "space-y-2 rounded-xl border border-emerald-400/20 bg-black/50 p-2.5 sm:p-3",
                  reviewHostEl && "shadow-soft-lg",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-300/90">
                      Review
                    </p>
                    {planSummary ? (
                      <p className="truncate text-[10px] text-white/45" title={planSummary}>
                        {planSummary}
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-[10px] text-white/40">
                      Select a VO/SFX note to Mute or Remove · mute SRC + BGM rails for
                      commentary+Foley only · drag VO or set Start · ▶ to preview.
                    </p>
                    {ttsDeferred || voiceNeedsTts ? (
                      <p className="mt-0.5 text-[10px] text-amber-200/70">
                        Commentary text is planned — tap ▶ on a line (or Retry TTS) to generate
                        voice audio before Final Render.
                      </p>
                    ) : null}
                    {outsideKeepCount > 0 ? (
                      <p className="mt-0.5 text-[10px] text-amber-200/70">
                        {outsideKeepCount} commentary/Foley clip
                        {outsideKeepCount === 1 ? "" : "s"} sit outside this keep range — re-apply
                        Treat after trim, or drag them into the window.
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {timeline.some((it) => it.type === "voice") ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className={cn(
                          "h-8 shrink-0 px-3 text-[11px] font-semibold",
                          ttsDeferred || voiceNeedsTts
                            ? "border-amber-400/50 bg-amber-500/15 text-amber-50 hover:bg-amber-500/25"
                            : "border-white/20 bg-white/5 text-white/80 hover:bg-white/10",
                        )}
                        disabled={disabled || Boolean(busy)}
                        onClick={() => void retrySynthesize()}
                      >
                        {busy === "tts" ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Volume2 className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        {ttsDeferred || voiceNeedsTts ? "Retry TTS" : "Refresh voice"}
                      </Button>
                    ) : null}
                    {ttsInfo ? (
                      <p className="max-w-[14rem] truncate text-[10px] text-white/40" title={ttsInfo}>
                        {ttsInfo}
                      </p>
                    ) : null}
                  </div>
                </div>
                {timeline.length > 0 ? (
                  <AudioTimelineEditor
                    durationMs={keepDurationMs}
                    items={visibleTimeline}
                    disabled={disabled || Boolean(busy)}
                    previewingId={previewingId}
                    onPreviewClip={previewTimelineClip}
                    onCommitVoiceText={commitVoiceText}
                    onChange={(visibleNext) => {
                      // Preserve off-window EDL rows so a drag does not delete them.
                      const hidden = timeline.filter(
                        (it) =>
                          !edlItemInKeepWindow(
                            {
                              type: it.type,
                              startMs: it.startMs,
                              endMs: it.endMs,
                              enabled: it.enabled,
                            },
                            keepDurationMs,
                          ),
                      );
                      void applyEdlLocal([...visibleNext, ...hidden]);
                    }}
                    comfortable={Boolean(reviewHostEl)}
                  />
                ) : (
                  <p className="text-[11px] text-white/45">No EDL clips yet — Apply a treatment first.</p>
                )}
              </section>
            );
            return reviewHostEl ? createPortal(review, reviewHostEl) : review;
          })()
        : null}
    </div>
  );
}
