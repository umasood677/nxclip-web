import { motion, AnimatePresence } from "motion/react";
import { 
  Scissors, 
  Sparkles, 
  CheckCircle2, 
  Volume2, 
  Maximize, 
  BrainCircuit,
  ChevronRight,
  Clock,
  Music,
  Type,
  Zap,
  GripVertical,
  VolumeX,
  RotateCcw,
  Loader2,
  Wand2,
  ZoomIn,
  ZoomOut,
  Search,
  ChevronLeft,
  Play,
  Pause,
  Settings,
  Layout,
  Download,
  Film,
  Save,
} from "lucide-react";
import { SocialPlatformIcon } from "../../components/social/SocialPlatformIcon";
import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import {
  contentApi,
  resolveBaseGatewayUrl,
  type SocialPlatform,
} from "../../services/apiClient";
import { SocialPublishTargets } from "../../components/social/SocialPublishTargets";
import { getAccessToken } from "../../services/auth/authService";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { cn, safeStringify } from "../../lib/utils";
import { MixGraphTap, MixMeterBars } from "./MixMeterBars";
import { setMixPreviewGains } from "./useMixAnalyser";
import { composeSocialCaption } from "./composeSocialCaption";
import { ComposeTimelinePanel } from "./ComposeTimelinePanel";
import { ClipCoachPanel, type CoachPreviewPayload } from './ClipCoachPanel';
import { SoundDesignPanel } from './SoundDesignPanel';
import { TransitionPreviewOverlay } from "./TransitionPreviewOverlay";
import { ClipPublishPreview } from "./ClipPublishPreview";
import {
  pickCoachTransition,
  polishWindow,
  toClipRelativeTime,
  transitionsFromCoachBeats,
} from "./clipEnhanceCoach";
import {
  resolveCoachImpactPack,
  sanitizeCreatorContext,
  transitionsFromCoachSegments,
} from "./coachImpactPlan";
import { enhanceDefaultsFromBrief } from "./coachBriefEnhance";
import {
  beatPurpose,
  heuristicHighlightMarkers,
  markersInDuration,
  trimWindowFromBeats,
} from "./clipHighlightScan";
import { waitAtLeast, waitForClipTranscript } from "./clipPolishPrep";
import {
  DEFAULT_BOTTOM_CAPTION_PCT,
  DEFAULT_TOP_CAPTION_PCT,
  DraggableCaptionOverlay,
  overlayPctOrDefault,
} from "./DraggableCaptionOverlay";
import { safeLocalStorage } from "../../lib/safeStorage";
import { triggerHaptic } from "../../lib/vibration";
import { Slider } from "../../components/ui/slider";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../../components/ui/select";
import { Separator } from "../../components/ui/separator";
import { SEO } from "../../components/SEO";
import { StudioPlanBanner } from "../../components/StudioPlanBanner";
import { useCreatorStudioContext } from "../../hooks/useCreatorStudioContext";
import { nicheFocusLabel } from "../../lib/weekPlan";
import { markPlanDayComplete } from "../../lib/weekPlanWorkflow";
import {
  CLIP_CAPTION_FONTS,
  CLIP_CAPTION_FONT_DEFAULT,
  clipCaptionFontCss,
  type ClipCaptionFontId,
} from "../../lib/clipCaptionFonts";

function firstSliderValue(v: number | readonly number[]): number {
  const n = Array.isArray(v) ? v[0] : v;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

const TRACKS = [
  { id: "1", title: "Cyberpunk Pulse", genre: "Synthwave", artist: "Ghost Sector", cover: "https://picsum.photos/seed/cyber/400/400", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { id: "2", title: "Lo-Fi Gaming", genre: "Chill", artist: "Cloud 9", cover: "https://picsum.photos/seed/lofi/400/400", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { id: "3", title: "Epic Victory", genre: "Orchestral", artist: "Legion", cover: "https://picsum.photos/seed/epic/400/400", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
  { id: "4", title: "Trap King", genre: "Hip Hop", artist: "TRVP", cover: "https://picsum.photos/seed/trap/400/400", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
  { id: "5", title: "Neon Nights", genre: "Retrowave", artist: "Chrome", cover: "https://picsum.photos/seed/neon/400/400", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
  { id: "6", title: "Aggressive Phonk", genre: "Phonk", artist: "DRIFT", cover: "https://picsum.photos/seed/phonk/400/400", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3" },
  { id: "7", title: "Summer Vibes", genre: "Pop", artist: "Solaris", cover: "https://picsum.photos/seed/summer/400/400", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3" },
  { id: "8", title: "Dark Souls", genre: "Cinematic", artist: "Ethereal", cover: "https://picsum.photos/seed/dark/400/400", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" },
  { id: "9", title: "Future Bass", genre: "EDM", artist: "Vortex", cover: "https://picsum.photos/seed/future/400/400", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3" },
  { id: "10", title: "8-Bit Adventure", genre: "Chiptune", artist: "Pixel", cover: "https://picsum.photos/seed/8bit/400/400", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3" },
];

const BGM_SELECT_ITEMS: Record<string, string> = {
  none: "None",
  ...Object.fromEntries(TRACKS.map((track) => [track.id, `${track.title} · ${track.genre}`])),
};

function bgmSelectLabel(trackId: string | null | undefined): string {
  if (!trackId) return BGM_SELECT_ITEMS.none;
  return BGM_SELECT_ITEMS[trackId] ?? BGM_SELECT_ITEMS.none;
}

const CAPTION_STYLE_OPTIONS: Array<{ value: string; labelKey: string; fallback: string }> = [
  { value: "kinetic_hormozi", labelKey: "clip_editor.polish.meme.styles.kinetic", fallback: "Kinetic (Hormozi)" },
  { value: "clean_subtitle", labelKey: "clip_editor.polish.meme.styles.clean", fallback: "Clean subtitle" },
  { value: "impact_meme", labelKey: "clip_editor.polish.meme.styles.impact_meme", fallback: "Impact meme" },
  { value: "impact", labelKey: "clip_editor.polish.meme.styles.impact", fallback: "Impact (Classic)" },
  { value: "modern", labelKey: "clip_editor.polish.meme.styles.modern", fallback: "Modern Sans" },
  { value: "classic", labelKey: "clip_editor.polish.meme.styles.classic", fallback: "Classic Serif" },
  { value: "neon", labelKey: "clip_editor.polish.meme.styles.neon", fallback: "Neon Glow" },
];

/** Overlay text colors burned into Download/Render (ASS PrimaryColour). */
const CAPTION_TEXT_COLORS: Array<{ hex: string; label: string }> = [
  { hex: "#FFFFFF", label: "White" },
  { hex: "#FFE600", label: "Yellow" },
  { hex: "#00E5FF", label: "Cyan" },
  { hex: "#B8FF3C", label: "Lime" },
  { hex: "#FF4D9E", label: "Pink" },
  { hex: "#FF8A3D", label: "Orange" },
  { hex: "#FF3B3B", label: "Red" },
  { hex: "#111111", label: "Black" },
];

function formatClipApiError(err: unknown, fallback = "Something went wrong"): string {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  const anyErr = err as { message?: string | string[]; error?: string };
  if (Array.isArray(anyErr?.message)) return anyErr.message.join(", ");
  if (typeof anyErr?.message === "string" && anyErr.message.trim()) return anyErr.message;
  if (typeof anyErr?.error === "string" && anyErr.error.trim()) return anyErr.error;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function coachOverlayOnCut(
  time: number,
  cuts: Array<{ start: number; end: number; show: boolean }> | null,
): boolean {
  if (!cuts?.length) return true;
  return cuts.some(
    (c) => c.show && time >= c.start - 0.08 && time < c.end + 0.08,
  );
}

export default function ClipEditor() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderStatus, setRenderStatus] = useState<string | null>(null);
  const [contentStatus, setContentStatus] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const step = searchParams.get("step") || "trim";
  const isAlreadyPublished = String(contentStatus || "").toLowerCase() === "published";
  const publishBlockedReason = isAlreadyPublished
    ? "This clip is already published. Publish is locked — use Download to export a new polished MP4."
    : null;
  const [isPlaying, setIsPlaying] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  
  // Dirty state tracking for navigation guard
  const [isDirty, setIsDirty] = useState(false);
  /** Ignore dirty marks while hydrating server state into form fields (refresh). */
  const suppressDirtyRef = useRef(true);
  const isLoaded = useRef(false);
  /** True after server clipEditSpec (or first metadata) applied — blocks trim corruption. */
  const specHydratedRef = useRef(false);
  const autoCaptionRanRef = useRef(false);
  const retryAnimateRanRef = useRef(false);
  const [trimEnd, setTrimEnd] = useState(30);
  const [currentTime, setCurrentTime] = useState(0);
  const [DURATION, setDuration] = useState(90);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  /** Blob URL of the completed burn-in MP4 — shown in polish preview after Save & Render. */
  const [renderPreviewSrc, setRenderPreviewSrc] = useState<string | null>(null);
  const [renderPreviewDuration, setRenderPreviewDuration] = useState(0);
  const [videoLoading, setVideoLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trimPreviewRef = useRef<HTMLDivElement | null>(null);
  const polishPreviewRef = useRef<HTMLDivElement | null>(null);
  const renderPreviewUrlRef = useRef<string | null>(null);
  const showingFinalRenderRef = useRef(false);
  const [activePolishTab, setActivePolishTab] = useState(
    () => (searchParams.get("action") === "hooks" ? "details" : "audio"),
  );
  const [isAnimateClip, setIsAnimateClip] = useState(false);

  const mergeSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(updates)) {
        if (value === null) next.delete(key);
        else next.set(key, value);
      }
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );
  const {
    profile,
    dueToday,
    categoryLabel,
    niches,
    nicheDialogOpen,
    setNicheDialogOpen,
    confirmNicheChange,
    applyDuePrompt,
    hasWeekPlan,
  } = useCreatorStudioContext("clip");
  const [clipVolume, setClipVolume] = useState(0.8);
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [masterVolume, setMasterVolume] = useState(1.0);
  const [isClipMuted, setIsClipMuted] = useState(false);
  const [isMusicMuted, setIsMusicMuted] = useState(false);
  const [isMasterMuted, setIsMasterMuted] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [polishProgress, setPolishProgress] = useState(0);
  const [polishStep, setPolishStep] = useState(0);
  const [polishStepNotes, setPolishStepNotes] = useState<string[]>(["", "", ""]);
  const polishRunIdRef = useRef(0);
  const polishBusyRef = useRef(false);
  const [isDragging, setIsDragging] = useState<"start" | "end" | "playhead" | null>(null);
  const [finalTrim, setFinalTrim] = useState<{ start: number; end: number } | null>(null);
  
  // Music State
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [composeEnabled, setComposeEnabled] = useState(
    () => searchParams.get("compose") === "1",
  );
  const [composeSources, setComposeSources] = useState<
    Array<{
      contentId: string;
      storageKey?: string;
      label?: string;
      order: number;
      inMs: number;
      outMs: number;
    }>
  >([]);
  const [composeTransitions, setComposeTransitions] = useState<
    Array<{
      afterIndex: number;
      type:
        | "none"
        | "cut"
        | "crossfade"
        | "fade_in"
        | "fade_out"
        | "flash"
        | "dissolve"
        | "split"
        | "wipe"
        | "slide"
        | "zoom"
        | "circle";
      durationMs?: number;
      sfxId?: string;
    }>
  >([]);
  const [previewingTrackId, setPreviewingTrackId] = useState<string | null>(null);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [title, setTitle] = useState("My Epic Clip");
  const [description, setDescription] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagDraft, setHashtagDraft] = useState("");
  const [socialPlatforms, setSocialPlatforms] = useState<SocialPlatform[]>([]);
  const [topText, setTopText] = useState("");
  const [bottomText, setBottomText] = useState("");
  const [topOverlay, setTopOverlay] = useState(DEFAULT_TOP_CAPTION_PCT);
  const [bottomOverlay, setBottomOverlay] = useState(DEFAULT_BOTTOM_CAPTION_PCT);
  const [memeCaptionStyle, setMemeCaptionStyle] = useState("kinetic_hormozi");
  const [captionFontId, setCaptionFontId] = useState<ClipCaptionFontId>(CLIP_CAPTION_FONT_DEFAULT);
  const [captionTextColor, setCaptionTextColor] = useState("#FFFFFF");
  const previewPlaybackGenRef = useRef(0);
  const [hooks, setHooks] = useState<Array<{ text: string; startMs: number; durationMs: number; styleId?: string }>>([]);
  /** AI alternatives from Generate hooks — pick one to overwrite the active on-clip hook. */
  const [hookOptions, setHookOptions] = useState<
    Array<{ text: string; startMs: number; durationMs: number; styleId?: string }>
  >([]);
  const [selectedHookOptionIndex, setSelectedHookOptionIndex] = useState<number | null>(null);
  const [silenceEnabled, setSilenceEnabled] = useState(true);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGeneratingHooks, setIsGeneratingHooks] = useState(false);
  const [transcriptPreview, setTranscriptPreview] = useState("");
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [prompt, setPrompt] = useState(searchParams.get("prompt") || "");
  /** Raw uploads must not inherit Coach calendar briefs as Creator Context. */
  const [isUserUploadClip, setIsUserUploadClip] = useState(false);
  const [coachAdvice, setCoachAdvice] = useState<{ context: string; advice: string } | null>(null);
  const [coachMeta, setCoachMeta] = useState<{ mode?: string; contentType?: string } | null>(null);
  const [coachTextCuts, setCoachTextCuts] = useState<
    Array<{ start: number; end: number; show: boolean }> | null
  >(null);
  const [coachStitchJoins, setCoachStitchJoins] = useState<
    Array<
      | "none"
      | "cut"
      | "crossfade"
      | "fade_in"
      | "fade_out"
      | "flash"
      | "dissolve"
      | "split"
      | "wipe"
      | "slide"
      | "zoom"
      | "circle"
    >
  >([]);
  /** True after Apply to clip — keep multi-cut order through Polish / Download. */
  const [coachViralApplied, setCoachViralApplied] = useState(false);
  const coachStitchIndexRef = useRef(0);
  /** True while playing the full Coach moment playlist (not a single Preview cut). */
  const coachStitchPlayRef = useRef(false);
  const isReviewingTrimRef = useRef(false);
  const [cropMode, setCropMode] = useState<"face" | "center">("face");
  
  // Enhancement States
  const [isNoiseReduced, setIsNoiseReduced] = useState(false);
  const [colorCorrection, setColorCorrection] = useState(0);
  const [isAutoColorEnabled, setIsAutoColorEnabled] = useState(false);
  const [enhanceShowOriginal, setEnhanceShowOriginal] = useState(false);
  const [transitionSuggestions, setTransitionSuggestions] = useState<{ time: number; type: string; caption?: string; sfx?: string }[]>([]);
  const [appliedTransitions, setAppliedTransitions] = useState<{ time: number; type: string; caption?: string; sfx?: string }[]>([]);
  const [transitionPreview, setTransitionPreview] = useState<{
    type: string;
    caption?: string;
    sfx?: string;
  } | null>(null);
  const [isGeneratingTransitions, setIsGeneratingTransitions] = useState(false);
  const [publishPreviewOpen, setPublishPreviewOpen] = useState(false);
  const transitionPreviewTimerRef = useRef<number | null>(null);
  const transitionFiredKeysRef = useRef<Set<string>>(new Set());
  const transitionPreviewActiveRef = useRef(false);
  useEffect(() => {
    return () => {
      if (transitionPreviewTimerRef.current) {
        window.clearTimeout(transitionPreviewTimerRef.current);
      }
      transitionFiredKeysRef.current.clear();
    };
  }, []);

  const previewFilterStyle = (() => {
    if (enhanceShowOriginal || colorCorrection <= 0) {
      return { filter: "none", WebkitFilter: "none" } as const;
    }
    const vibrance = Math.max(0, Math.min(1, colorCorrection / 100));
    const brightness = 1 + vibrance * 0.22;
    const saturate = 1 + vibrance * 0.85;
    const contrast = 1 + vibrance * 0.32;
    const css = `brightness(${brightness.toFixed(3)}) saturate(${saturate.toFixed(3)}) contrast(${contrast.toFixed(3)})`;
    return { filter: css, WebkitFilter: css, transition: "filter 160ms ease" } as const;
  })();

  const normalizeHashtag = (tag: string) => {
    const cleaned = tag.trim().replace(/^#+/, "").replace(/\s+/g, "");
    return cleaned ? `#${cleaned}` : "";
  };

  const addHashtagFromDraft = () => {
    const parts = hashtagDraft.split(/[\s,]+/).map(normalizeHashtag).filter(Boolean);
    if (!parts.length) return;
    setHashtags((prev) => {
      const next = [...prev];
      for (const tag of parts) {
        if (!next.includes(tag) && next.length < 20) next.push(tag);
      }
      return next;
    });
    setHashtagDraft("");
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mixBgmRef = useRef<HTMLAudioElement | null>(null);
  const mixBgmTrackIdRef = useRef<string | null>(null);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  
  const timelineRef = useRef<HTMLDivElement>(null);

  // Preview-only web fonts (burn-in uses media-worker OFL TTFs)
  useEffect(() => {
    const linkId = "nxclip-caption-fonts";
    if (document.getElementById(linkId)) return;
    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Inter:wght@700&family=Montserrat:wght@900&display=swap";
    document.head.appendChild(link);
  }, []);

  // Load real clip media for this content id (F6 Phase 0 foundation).
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    (async () => {
      setVideoLoading(true);
      try {
        // Drafts after upload live on /content/mine/:id — /content/:id is published-only (404).
        const item = await contentApi.getOwnedContentById(id, { suppressErrorLog: true });
        if (cancelled) return;
        if (item.title) setTitle(item.title);
        if (item.description) {
          setDescription(item.description);
        } else {
          const inheritedCaption = item.selectedCaption || item.captions?.[0];
          if (inheritedCaption) setDescription(inheritedCaption);
        }
        if (Array.isArray(item.captions) && item.captions.length) {
          setAiSuggestions(item.captions.slice(0, 3));
        }
        if (item.status) setContentStatus(String(item.status));
        {
          const st = String(item.renderStatus || "").toLowerCase();
          const extras =
            item.clipEditSpec?.extras && typeof item.clipEditSpec.extras === "object"
              ? (item.clipEditSpec.extras as Record<string, unknown>)
              : {};
          const quality = String(extras.renderQuality || "");
          const hasHash = typeof extras.renderSpecHash === "string" && extras.renderSpecHash;
          // Copy-fallback / unverified "completed" must not unlock Final Preview.
          if (st === "completed" && (quality === "fallback" || !hasHash)) {
            setRenderStatus("idle");
            setIsDirty(true);
          } else {
            if (item.renderStatus) setRenderStatus(item.renderStatus);
            if (st === "completed") setIsDirty(false);
          }
        }
        const spec = item.clipEditSpec;
        const isAnimate =
          Boolean(spec?.animate) ||
          Boolean(spec?.sourceContentId) ||
          String(item.contentType || "").toLowerCase().includes("animate");
        setIsAnimateClip(isAnimate);
        const storageKey = String(item.storageKey || "");
        const userUpload =
          storageKey.startsWith("uploads/") && !isAnimate;
        setIsUserUploadClip(userUpload);
        if (spec) {
          if (typeof spec.inMs === "number") setTrimStart(spec.inMs / 1000);
          if (typeof spec.outMs === "number") setTrimEnd(spec.outMs / 1000);
          if (typeof spec.inMs === "number" && typeof spec.outMs === "number") {
            setFinalTrim({ start: spec.inMs / 1000, end: spec.outMs / 1000 });
          }
          if (spec.bgmTrackId) setSelectedTrackId(spec.bgmTrackId);
          const compose = (spec as { compose?: { enabled?: boolean; sources?: any[]; transitions?: any[] } })
            .compose;
          if (compose?.enabled && Array.isArray(compose.sources) && compose.sources.length >= 2) {
            setComposeEnabled(true);
            setComposeSources(compose.sources);
            setComposeTransitions(compose.transitions ?? []);
          }
          if (typeof spec.voiceVolume === "number") setClipVolume(Math.min(1, Math.max(0, spec.voiceVolume)));
          if (typeof spec.bgmVolume === "number") setMusicVolume(Math.min(1, Math.max(0, spec.bgmVolume)));
          if (typeof spec.masterVolume === "number") setMasterVolume(Math.min(1.5, Math.max(0, spec.masterVolume)));
          if (spec.captions?.topText) setTopText(spec.captions.topText);
          if (spec.captions?.bottomText) setBottomText(spec.captions.bottomText);
          setTopOverlay(
            overlayPctOrDefault(spec.captions?.topX, spec.captions?.topY, DEFAULT_TOP_CAPTION_PCT),
          );
          setBottomOverlay(
            overlayPctOrDefault(
              spec.captions?.bottomX,
              spec.captions?.bottomY,
              DEFAULT_BOTTOM_CAPTION_PCT,
            ),
          );
          if (spec.captions?.styleId) setMemeCaptionStyle(spec.captions.styleId);
          if (spec.captions?.fontId) {
            const allowed = CLIP_CAPTION_FONTS.some((f) => f.id === spec.captions?.fontId);
            if (allowed) setCaptionFontId(spec.captions.fontId as ClipCaptionFontId);
          }
          if (
            typeof spec.captions?.textColor === "string" &&
            /^#[0-9A-Fa-f]{6}$/.test(spec.captions.textColor.trim())
          ) {
            setCaptionTextColor(spec.captions.textColor.trim().toUpperCase());
          }
          if (spec.hooks?.length) setHooks(spec.hooks);
          {
            const extras = spec.extras as Record<string, unknown> | undefined;
            const opts = extras?.hookOptions;
            if (Array.isArray(opts) && opts.length) {
              setHookOptions(
                opts
                  .filter((h): h is { text: string; startMs?: number; durationMs?: number; styleId?: string } =>
                    Boolean(h && typeof h === "object" && typeof (h as { text?: unknown }).text === "string"),
                  )
                  .map((h) => ({
                    text: String(h.text).slice(0, 80),
                    startMs: Math.max(0, Math.round(Number(h.startMs) || 0)),
                    durationMs: Math.max(400, Math.round(Number(h.durationMs) || 2200)),
                    styleId: typeof h.styleId === "string" ? h.styleId : undefined,
                  })),
              );
              const active = (spec.captions?.topText || spec.hooks?.[0]?.text || "").trim().toLowerCase();
              if (active) {
                const idx = opts.findIndex(
                  (h) =>
                    h &&
                    typeof h === "object" &&
                    typeof (h as { text?: unknown }).text === "string" &&
                    String((h as { text: string }).text).trim().toLowerCase() === active,
                );
                setSelectedHookOptionIndex(idx >= 0 ? idx : null);
              }
            }
          }
          if (spec.silence?.enabled === false) setSilenceEnabled(false);
          if (spec.transcript) setTranscriptPreview(spec.transcript);
          {
            const storedContext =
              typeof spec.creatorContext === "string"
                ? spec.creatorContext
                : typeof spec.polishPrompt === "string"
                  ? spec.polishPrompt
                  : "";
            const dueBrief = applyDuePrompt();
            // Uploaded event footage: ignore auto-injected Coach calendar briefs.
            // nxClip-generated / I2V clips may keep the day brief as polish context.
            const weekPlanBrief =
              Boolean(dueBrief && storedContext.trim() === dueBrief.trim()) ||
              (/—\s*Niche:/i.test(storedContext) &&
                /—\s*Focus:/i.test(storedContext));
            if (userUpload && weekPlanBrief) {
              setPrompt("");
            } else if (storedContext) {
              setPrompt(sanitizeCreatorContext(storedContext));
            }
          }
          const extras = (spec as { extras?: Record<string, unknown> }).extras;
          const viralOn = extras?.viralEditApplied === true;
          setCoachViralApplied(viralOn);
          const coach = extras?.clipCoach as
            | {
                creativeBrief?: {
                  creatorContext?: string;
                  mode?: string;
                  contentType?: string;
                };
                editPlan?: {
                  segments?: Array<{ start: number; end: number; purpose?: string }>;
                  hookOverlay?: string;
                  contextOverlay?: string;
                  captionStyle?: string;
                };
              }
            | undefined;
          if (viralOn) {
            const segs = coach?.editPlan?.segments || [];
            const textFlags = Array.isArray(extras?.coachCutText)
              ? (extras.coachCutText as boolean[])
              : segs.map(() => true);
            if (segs.length) {
              setCoachTextCuts(
                segs.map((s, i) => ({
                  start: s.start,
                  end: s.end,
                  show: textFlags[i] !== false,
                })),
              );
              const joinsRaw = Array.isArray(extras?.coachCutTransitions)
                ? (extras.coachCutTransitions as Array<{ type?: string }>)
                : [];
              setCoachStitchJoins(
                segs.slice(0, -1).map((_, i) => {
                  const t = String(joinsRaw[i]?.type || "flash").toLowerCase();
                  const allowed = new Set([
                    "none",
                    "cut",
                    "crossfade",
                    "fade_in",
                    "fade_out",
                    "flash",
                    "dissolve",
                    "split",
                    "wipe",
                    "slide",
                    "zoom",
                    "circle",
                  ]);
                  return (allowed.has(t) ? t : "flash") as (typeof coachStitchJoins)[number];
                }),
              );
            }
            // Restore overlays + context from the applied Coach plan after refresh.
            const briefCtx = String(coach?.creativeBrief?.creatorContext || "").trim();
            if (briefCtx) setPrompt(sanitizeCreatorContext(briefCtx));
            if (coach?.editPlan?.hookOverlay?.trim()) {
              setTopText(coach.editPlan.hookOverlay.trim().slice(0, 120));
            }
            if (coach?.editPlan?.contextOverlay?.trim()) {
              setBottomText(coach.editPlan.contextOverlay.trim().slice(0, 120));
            }
            if (coach?.editPlan?.captionStyle) {
              setMemeCaptionStyle(
                coach.editPlan.captionStyle === "kinetic_hormozi"
                  ? "kinetic_hormozi"
                  : "clean_subtitle",
              );
            }
            if (coach?.creativeBrief?.mode || coach?.creativeBrief?.contentType) {
              setCoachMeta({
                mode: coach.creativeBrief.mode,
                contentType: coach.creativeBrief.contentType,
              });
            }
          } else {
            setCoachTextCuts(null);
            setCoachStitchJoins([]);
          }
          const extrasHashtags = extras?.hashtags;
          if (Array.isArray(extrasHashtags)) {
            setHashtags(
              extrasHashtags
                .filter((h): h is string => typeof h === "string")
                .map((h) => (h.startsWith("#") ? h : `#${h}`)),
            );
          } else {
            const inheritedTags = item.selectedHashtags || item.hashtagSets?.[0];
            if (Array.isArray(inheritedTags) && inheritedTags.length) {
              setHashtags(
                inheritedTags
                  .filter((h): h is string => typeof h === "string")
                  .map((h) => (h.startsWith("#") ? h : `#${h}`)),
              );
            }
          }
          const extrasTransitions = extras?.transitions;
          if (Array.isArray(extrasTransitions)) {
            setAppliedTransitions(
              extrasTransitions
                .filter((s): s is { time: number; type: string; caption?: string; sfx?: string } =>
                  Boolean(s && typeof s === "object" && typeof (s as { type?: unknown }).type === "string"),
                )
                .map((s) => ({
                  time: Number((s as { time?: number }).time) || 0,
                  type: String((s as { type: string }).type),
                  caption: typeof (s as { caption?: unknown }).caption === "string" ? (s as { caption: string }).caption : undefined,
                  sfx: typeof (s as { sfx?: unknown }).sfx === "string" ? (s as { sfx: string }).sfx : undefined,
                })),
            );
          }
          const enhance =
            (spec.enhance as { noiseReduced?: boolean; colorCorrection?: number } | undefined) ||
            (extras?.enhance as { noiseReduced?: boolean; colorCorrection?: number } | undefined);
          if (enhance) {
            if (typeof enhance.noiseReduced === "boolean") setIsNoiseReduced(enhance.noiseReduced);
            if (typeof enhance.colorCorrection === "number") setColorCorrection(enhance.colorCorrection);
          }
          specHydratedRef.current = true;
        } else {
          // Restore per-clip local draft only when server has no blueprint yet
          const savedData = safeLocalStorage.getItem(`nexaclip_editor_autosave:${id}`);
          if (savedData) {
            try {
              const parsed = JSON.parse(savedData);
              if (typeof parsed.trimStart === "number") setTrimStart(parsed.trimStart);
              if (typeof parsed.trimEnd === "number") setTrimEnd(parsed.trimEnd);
              if (parsed.selectedTrackId) setSelectedTrackId(parsed.selectedTrackId);
              if (parsed.topText) setTopText(parsed.topText);
              if (parsed.bottomText) setBottomText(parsed.bottomText);
              if (parsed.topOverlay || parsed.bottomOverlay) {
                setTopOverlay(
                  overlayPctOrDefault(parsed.topOverlay?.x, parsed.topOverlay?.y, DEFAULT_TOP_CAPTION_PCT),
                );
                setBottomOverlay(
                  overlayPctOrDefault(
                    parsed.bottomOverlay?.x,
                    parsed.bottomOverlay?.y,
                    DEFAULT_BOTTOM_CAPTION_PCT,
                  ),
                );
              }
              if (parsed.memeCaptionStyle) setMemeCaptionStyle(parsed.memeCaptionStyle);
              if (parsed.captionFontId && CLIP_CAPTION_FONTS.some((f) => f.id === parsed.captionFontId)) {
                setCaptionFontId(parsed.captionFontId as ClipCaptionFontId);
              }
            } catch {
              /* ignore corrupt draft */
            }
          }
          const inheritedTags = item.selectedHashtags || item.hashtagSets?.[0];
          if (Array.isArray(inheritedTags) && inheritedTags.length) {
            setHashtags(
              inheritedTags
                .filter((h): h is string => typeof h === "string")
                .map((h) => (h.startsWith("#") ? h : `#${h}`)),
            );
          }
          suppressDirtyRef.current = true;
          specHydratedRef.current = true;
          // Allow form state to settle after hydrate before treating changes as edits.
          window.setTimeout(() => {
            if (!cancelled) suppressDirtyRef.current = false;
          }, 1800);
        }

        // Always load the original master for editing. Feed/detail use the polished
        // render by default once burn-in completes — without variant=master Studio
        // would show the burned MP4 and feel like edits "didn't apply" on re-open.
        const token = getAccessToken();
        const mediaUrl = `${resolveBaseGatewayUrl()}/content/${id}/media?variant=master`;
        let lastErr: unknown;
        for (let attempt = 0; attempt < 4; attempt++) {
          if (cancelled) return;
          try {
            const res = await fetch(mediaUrl, {
              cache: "no-store",
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            if (!res.ok) throw new Error(`Media ${res.status}`);
            const blob = await res.blob();
            if (!blob || blob.size < 64) throw new Error("Media empty");
            objectUrl = URL.createObjectURL(blob);
            if (!cancelled) setVideoSrc(objectUrl);
            lastErr = null;
            break;
          } catch (err) {
            lastErr = err;
            // confirm-upload / GCS may lag briefly after navigation
            await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
          }
        }
        if (lastErr) throw lastErr;
      } catch (err) {
        console.warn("Clip media load failed", err);
        if (!cancelled) {
          toast.message("Preview unavailable", {
            description: "Upload may still be processing — trim uses fallback duration until media loads.",
          });
        }
      } finally {
        if (!cancelled) setVideoLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);

  // Auto-seed the day brief only for nxClip-generated / I2V clips.
  // Raw uploads stay empty until the user taps "Use brief" (load already strips inherited briefs).
  useEffect(() => {
    if (isUserUploadClip) return;
    if (!prompt && dueToday) {
      setPrompt(applyDuePrompt());
    }
  }, [dueToday, isUserUploadClip, prompt, applyDuePrompt]);

  // Simulated audio waveform data
  const waveformData = useRef(Array.from({ length: 100 }, () => 20 + Math.random() * 60)).current;

  const [markers, setMarkers] = useState<{ time: number; label: string }[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isSuggestingTrim, setIsSuggestingTrim] = useState(false);
  const [suggestedTrim, setSuggestedTrim] = useState<{ start: number; end: number } | null>(null);
  const [scanningProgress, setScanningProgress] = useState(0);
  const [isReviewingTrim, setIsReviewingTrim] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [reviewProgress, setReviewProgress] = useState(0);
  const reviewIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reviewAdvanceLockRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const socialCaption = composeSocialCaption({
    caption: description,
    title,
    hashtags,
  }).slice(0, 2000);

  /** Completed burn-in that matches current edits — Publish/Download unlock. */
  const renderReady =
    String(renderStatus || "").toLowerCase() === "completed" && !isDirty;

  /** Polish player shows the real burned MP4 (not CSS/live mix preview). */
  const showingFinalRender = Boolean(renderReady && renderPreviewSrc);
  showingFinalRenderRef.current = showingFinalRender;

  const renderGateMessage =
    "Save & Render first so your latest edits are burned into the MP4. Then Publish or Download.";

  const clearRenderPreview = useCallback(() => {
    if (renderPreviewUrlRef.current) {
      URL.revokeObjectURL(renderPreviewUrlRef.current);
      renderPreviewUrlRef.current = null;
    }
    setRenderPreviewSrc(null);
    setRenderPreviewDuration(0);
  }, []);

  /** Fetch completed render into the polish preview player. */
  const loadRenderPreview = useCallback(async () => {
    if (!id) return;
    const token = getAccessToken();
    const mediaUrl = `${resolveBaseGatewayUrl()}/content/${id}/media?variant=render&_=${Date.now()}`;
    const res = await fetch(mediaUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Render preview failed (${res.status})`);
    const blob = await res.blob();
    if (!blob || blob.size < 64) throw new Error("Render preview empty");
    const objectUrl = URL.createObjectURL(blob);
    if (renderPreviewUrlRef.current) {
      URL.revokeObjectURL(renderPreviewUrlRef.current);
    }
    renderPreviewUrlRef.current = objectUrl;
    setRenderPreviewSrc(objectUrl);
    // Stop live mix — final MP4 already has BGM/captions burned in.
    mixBgmRef.current?.pause();
    const el = videoRef.current;
    if (el) {
      el.pause();
      setIsPlaying(false);
    }
  }, [id]);

  const openPublishPreview = () => {
    if (!id) {
      toast.error("No active clip ID found.");
      return;
    }
    if (isAlreadyPublished) {
      toast.error("Already published", {
        description: publishBlockedReason || undefined,
      });
      return;
    }
    if (!renderReady) {
      toast.error("Save & Render required", {
        description: renderGateMessage,
      });
      return;
    }
    setPublishPreviewOpen(true);
  };

  const scanHighlights = async () => {
    setIsScanning(true);
    setScanningProgress(0);
    
    // Simulated scanning progress
    const progressInterval = setInterval(() => {
      setScanningProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    try {
      if (!id) throw new Error("Missing clip id");
      const mediaDur =
        videoRef.current && Number.isFinite(videoRef.current.duration) && videoRef.current.duration > 0
          ? videoRef.current.duration
          : DURATION;
      const dur = Math.max(0.5, mediaDur);
      const res = await contentApi.suggestClipTimeline(id, {
        kind: "highlights",
        durationSec: dur,
      });
      const fromApi = Array.isArray(res.highlights)
        ? res.highlights.map((m) => ({
            time: Number(m.time),
            label: String(m.label || "peak"),
          }))
        : [];
      const inRange = markersInDuration(fromApi, dur);
      const next = inRange.length > 0 ? inRange : heuristicHighlightMarkers(dur);
      setMarkers(next);
      toast.success(
        t("clip_editor.trim.scan_found", {
          count: next.length,
          defaultValue: "Marked {{count}} highlight beats on the timeline",
        }),
        {
          description: t("clip_editor.trim.scan_found_hint", {
            defaultValue: "Hook = start, peak = keep, close = end. Handles snap to these marks.",
          }),
        },
      );
    } catch (error) {
      console.error("Error scanning highlights:", error);
      const mediaDur =
        videoRef.current && Number.isFinite(videoRef.current.duration) && videoRef.current.duration > 0
          ? videoRef.current.duration
          : DURATION;
      const fallback = heuristicHighlightMarkers(Math.max(0.5, mediaDur));
      setMarkers(fallback);
      toast.error("Highlight scan failed", {
        description: formatClipApiError(error, t("clip_editor.trim.scan_fallback", { defaultValue: "Placed generic beats on this clip so you can still trim." })),
      });
    } finally {
      clearInterval(progressInterval);
      setScanningProgress(100);
      setTimeout(() => {
        setIsScanning(false);
        setScanningProgress(0);
      }, 500);
    }
  };

  const suggestSmartTrim = async () => {
    setIsSuggestingTrim(true);
    setScanningProgress(0);
    
    // Simulated scanning progress
    const progressInterval = setInterval(() => {
      setScanningProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 5;
      });
    }, 50);

    try {
      if (!id) throw new Error("Missing clip id");
      const res = await contentApi.suggestClipTimeline(id, {
        kind: "smart_trim",
        durationSec: DURATION,
      });
      if (res.smartTrim && typeof res.smartTrim.start === "number" && typeof res.smartTrim.end === "number") {
          setSuggestedTrim({
          start: Math.max(0, Math.min(DURATION, res.smartTrim.start)),
          end: Math.max(res.smartTrim.start + 1, Math.min(DURATION, res.smartTrim.end)),
          });
      }
    } catch (error) {
      console.error("Error suggesting smart trim:", error);
      toast.error("Smart trim failed", {
        description: formatClipApiError(error, "Try adjusting handles manually."),
      });
    } finally {
      clearInterval(progressInterval);
      setScanningProgress(100);
      setTimeout(() => {
        setIsSuggestingTrim(false);
        setScanningProgress(0);
      }, 500);
    }
  };

  const formatTime = useCallback((seconds: number) => {
    const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
    const total = Math.round(safe);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }, []);

  const formatSpan = useCallback((start: number, end: number) => {
    const from = Math.max(0, Math.round(Number.isFinite(start) ? start : 0));
    const to = Math.max(from, Math.round(Number.isFinite(end) ? end : 0));
    return formatTime(to - from);
  }, [formatTime]);

  const seekVideo = useCallback((time: number) => {
    const el = videoRef.current;
    const clamped = Math.max(0, Math.min(DURATION, time));
    setCurrentTime(clamped);
    if (el && Number.isFinite(clamped)) {
      el.currentTime = clamped;
    }
  }, [DURATION]);

  const clearMixBgm = useCallback(() => {
    const bgm = mixBgmRef.current;
    mixBgmTrackIdRef.current = null;
    if (!bgm) return;
    bgm.pause();
    bgm.muted = true;
    bgm.volume = 0;
    bgm.removeAttribute("src");
    try {
      bgm.load();
    } catch {
      /* ignore */
    }
  }, []);

  const applyPreviewMix = useCallback(() => {
    const master = isMasterMuted ? 0 : masterVolume;
    const clip = isClipMuted ? 0 : clipVolume;
    const music = isMusicMuted ? 0 : musicVolume;
    // Allow Coach BGM on Trim as well as Polish so Analyze preview is audible.
    const musicOn = Boolean(selectedTrackId);
    const usedGraph = setMixPreviewGains({ master, clip, music, musicOn });
    const el = videoRef.current;
    const bgm = mixBgmRef.current;
    if (el) {
      el.volume = usedGraph ? 1 : Math.max(0, Math.min(1, master * clip));
      el.muted = isMasterMuted || isClipMuted || clip === 0 || master === 0;
    }
    if (bgm) {
      if (!musicOn) {
        bgm.pause();
        bgm.muted = true;
        bgm.volume = 0;
      } else {
        // BGM is element-routed (not Web Audio) so CORS CDNs stay audible.
        bgm.volume = Math.max(0, Math.min(1, music * master));
        bgm.muted = isMusicMuted || isMasterMuted || music === 0 || master === 0;
      }
    }
  }, [
    clipVolume,
    isClipMuted,
    masterVolume,
    isMasterMuted,
    musicVolume,
    isMusicMuted,
    selectedTrackId,
  ]);

  // Coach mode / Audio picker changed the track — swap the underlay immediately.
  useEffect(() => {
    const bgm = mixBgmRef.current;
    if (!bgm) return;
    if (!selectedTrackId) {
      clearMixBgm();
      return;
    }
    const track = TRACKS.find((t) => t.id === selectedTrackId);
    if (!track) return;
    if (mixBgmTrackIdRef.current === selectedTrackId) {
      applyPreviewMix();
      return;
    }
    bgm.src = track.url;
    mixBgmTrackIdRef.current = selectedTrackId;
    bgm.currentTime = 0;
    applyPreviewMix();
    const videoPlaying = Boolean(videoRef.current && !videoRef.current.paused);
    if (videoPlaying) {
      void bgm.play().catch(() => {});
    }
  }, [selectedTrackId, applyPreviewMix, clearMixBgm]);

  const joinToFlash = useCallback((join?: string) => {
    const j = String(join || "flash").toLowerCase();
    if (j === "none") return null;
    if (j === "cut") return { type: "cut", caption: "Cut" };
    if (j === "crossfade" || j === "fade") return { type: "crossfade", caption: "Fade" };
    if (j === "fade_in") return { type: "fade_in", caption: "Fade in" };
    if (j === "fade_out") return { type: "fade_out", caption: "Fade out" };
    if (j === "dissolve") return { type: "dissolve", caption: "Dissolve" };
    if (j === "split") return { type: "split", caption: "Split" };
    if (j === "wipe") return { type: "wipe", caption: "Wipe" };
    if (j === "slide") return { type: "slide", caption: "Slide" };
    if (j === "zoom") return { type: "zoom", caption: "Zoom" };
    if (j === "circle") return { type: "circle", caption: "Circle" };
    if (j === "flash") return { type: "flash", caption: "Flash" };
    return { type: j, caption: j.replace(/_/g, " ") };
  }, []);

  /** Coach: play one keep-range so the user can audition that cut. */
  const previewCoachSegment = useCallback(
    (startSec: number, endSec: number) => {
      const el = videoRef.current;
      if (!el) return;
      const start = Math.max(0, Math.min(DURATION, startSec));
      const end = Math.max(start + 0.35, Math.min(DURATION, endSec));
      coachStitchPlayRef.current = false;
      el.currentTime = start;
      setCurrentTime(start);
      const onTime = () => {
        if (el.currentTime >= end - 0.05) {
          el.pause();
          setIsPlaying(false);
          mixBgmRef.current?.pause();
          el.removeEventListener("timeupdate", onTime);
        }
      };
      el.removeEventListener("timeupdate", onTime);
      el.addEventListener("timeupdate", onTime);
      applyPreviewMix();
      void el
        .play()
        .then(() => {
          setIsPlaying(true);
          const bgm = mixBgmRef.current;
          const track = TRACKS.find((t) => t.id === selectedTrackId);
          if (bgm && track && selectedTrackId) {
            if (mixBgmTrackIdRef.current !== selectedTrackId) {
              bgm.src = track.url;
              mixBgmTrackIdRef.current = selectedTrackId;
              bgm.currentTime = 0;
            }
            void bgm.play().catch(() => {});
          }
        })
        .catch(() => setIsPlaying(false));
    },
    [DURATION, applyPreviewMix, selectedTrackId],
  );

  /** Coach: play checked moments in order (skip gaps) — preview before Download. */
  const previewCoachStitch = useCallback(() => {
    const el = videoRef.current;
    const cuts = coachTextCuts;
    if (!el || !cuts?.length) {
      toast.message("Analyze first", {
        description: "Moments appear here after AI Coach Analyze.",
      });
      return;
    }
    coachStitchPlayRef.current = true;
    coachStitchIndexRef.current = 0;
    const first = cuts[0]!;
    el.currentTime = first.start;
    setCurrentTime(first.start);
    applyPreviewMix();
    void el
      .play()
      .then(() => {
        setIsPlaying(true);
        const bgm = mixBgmRef.current;
        const track = TRACKS.find((t) => t.id === selectedTrackId);
        if (bgm && track && selectedTrackId) {
          if (mixBgmTrackIdRef.current !== selectedTrackId) {
            bgm.src = track.url;
            mixBgmTrackIdRef.current = selectedTrackId;
            bgm.currentTime = 0;
          }
          void bgm.play().catch(() => {});
        }
        toast.message("Previewing final edit", {
          description: `${cuts.length} moment${cuts.length === 1 ? "" : "s"} in order — gaps are skipped.`,
        });
      })
      .catch(() => setIsPlaying(false));
  }, [coachTextCuts, applyPreviewMix, selectedTrackId]);

  /** Coach: audition selected BGM under the current clip window. */
  const previewCoachBgm = useCallback(() => {
    const track = TRACKS.find((t) => t.id === selectedTrackId);
    const bgm = mixBgmRef.current;
    if (!selectedTrackId || !track || !bgm) {
      toast.message("No BGM selected yet — run Analyze first");
      return;
    }
    if (mixBgmTrackIdRef.current !== selectedTrackId) {
      bgm.src = track.url;
      mixBgmTrackIdRef.current = selectedTrackId;
      bgm.currentTime = 0;
    }
    applyPreviewMix();
    void bgm.play().catch(() => {});
    const el = videoRef.current;
    if (el && el.paused) {
      void el
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }
    toast.message(`Playing ${track.title}`, {
      description: "BGM under your clip. Cut SFX only appear after Render.",
    });
  }, [selectedTrackId, applyPreviewMix]);

  const togglePlayback = useCallback(async () => {
    const el = videoRef.current;
    const start = finalTrim?.start ?? trimStart;
    const end = finalTrim?.end ?? trimEnd;
    if (!el) {
      setIsPlaying((prev) => !prev);
      return;
    }
    try {
      if (el.paused) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        if (previewTimerRef.current) {
          clearInterval(previewTimerRef.current);
          previewTimerRef.current = null;
        }
        setPreviewingTrackId(null);
        setPreviewProgress(0);

        // Final burned MP4: play as-is (trim/BGM/captions already in file).
        if (showingFinalRenderRef.current) {
          coachStitchPlayRef.current = false;
          mixBgmRef.current?.pause();
          clearMixBgm();
          if (el.currentTime >= Math.max(0.05, (el.duration || 0) - 0.08)) {
            el.currentTime = 0;
            setCurrentTime(0);
          }
          await el.play();
          setIsPlaying(true);
          return;
        }

        if (coachTextCuts?.length) {
          coachStitchPlayRef.current = true;
          const t = el.currentTime;
          let idx = coachTextCuts.findIndex((c) => t >= c.start - 0.05 && t < c.end - 0.05);
          if (idx < 0) idx = 0;
          coachStitchIndexRef.current = idx;
          const cut = coachTextCuts[idx]!;
          if (t < cut.start || t >= cut.end) {
            el.currentTime = cut.start;
            setCurrentTime(cut.start);
          }
        } else {
          coachStitchPlayRef.current = false;
          if (el.currentTime < start || el.currentTime >= end) {
            el.currentTime = start;
            setCurrentTime(start);
          }
        }
        applyPreviewMix();
        await el.play();
        setIsPlaying(true);
        const bgm = mixBgmRef.current;
        const track = TRACKS.find((t) => t.id === selectedTrackId);
        if (bgm && track && selectedTrackId) {
          if (mixBgmTrackIdRef.current !== selectedTrackId) {
            bgm.src = track.url;
            mixBgmTrackIdRef.current = selectedTrackId;
            bgm.currentTime = 0;
          }
          applyPreviewMix();
          void bgm.play().catch(() => {});
        } else {
          clearMixBgm();
          setMixPreviewGains({
            master: isMasterMuted ? 0 : masterVolume,
            clip: isClipMuted ? 0 : clipVolume,
            music: 0,
            musicOn: false,
          });
        }
      } else {
        el.pause();
        setIsPlaying(false);
        mixBgmRef.current?.pause();
      }
    } catch (err) {
      console.warn("Playback failed", err);
      setIsPlaying(false);
      mixBgmRef.current?.pause();
    }
  }, [
    trimStart,
    trimEnd,
    finalTrim,
    coachTextCuts,
    selectedTrackId,
    isMasterMuted,
    isClipMuted,
    isMusicMuted,
    masterVolume,
    clipVolume,
    applyPreviewMix,
    clearMixBgm,
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case " ":
          e.preventDefault();
          void togglePlayback();
          break;
        case "arrowleft":
          e.preventDefault();
          seekVideo(currentTime - 5);
          break;
        case "arrowright":
          e.preventDefault();
          seekVideo(currentTime + 5);
          break;
        case "arrowup":
          e.preventDefault();
          setClipVolume(prev => Math.min(1, prev + 0.1));
          setIsClipMuted(false);
          break;
        case "arrowdown":
          e.preventDefault();
          setClipVolume(prev => Math.max(0, prev - 0.1));
          break;
        case "m":
          e.preventDefault();
          setIsClipMuted(prev => !prev);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [DURATION, currentTime, seekVideo, togglePlayback]);

  // Drive playhead from the real video element (no fake clock when media is loaded).
  useEffect(() => {
    if (videoSrc) return;
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          const next = prev + 0.1;
          if (next > trimEnd || next < trimStart) return trimStart;
          return next;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, trimStart, trimEnd, videoSrc]);

  // Keep <video> + mix BGM volume in sync with editor controls (Web Audio hub carries master).
  useEffect(() => {
    applyPreviewMix();
  }, [applyPreviewMix, videoSrc]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      let newTime = Math.max(0, Math.min(DURATION, ((clientX - rect.left) / rect.width) * DURATION));
      
      // Snapping logic
      const nearestMarker = markers.find(m => Math.abs(m.time - newTime) < (DURATION / rect.width) * 15); // 15px snap zone
      if (nearestMarker !== undefined) {
        newTime = nearestMarker.time;
      }

      if (isDragging === "start") {
        if (newTime < trimEnd - 1) setTrimStart(newTime);
      } else if (isDragging === "end") {
        if (newTime > trimStart + 1) setTrimEnd(newTime);
      } else if (isDragging === "playhead") {
        seekVideo(newTime);
      }
    };

    const handleMouseUp = () => setIsDragging(null);

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleMouseMove, { passive: false });
      window.addEventListener("touchend", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleMouseMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging, trimStart, trimEnd, DURATION, markers, seekVideo]);

  const stopAllPreviewPlayback = useCallback(() => {
    previewPlaybackGenRef.current += 1;
    reviewAdvanceLockRef.current = true;
    isReviewingTrimRef.current = false;
    coachStitchPlayRef.current = false;
    if (reviewIntervalRef.current) {
      clearInterval(reviewIntervalRef.current);
      reviewIntervalRef.current = null;
    }
    const el = videoRef.current;
    if (el) {
      el.pause();
      el.muted = true;
    }
    const bgm = mixBgmRef.current;
    if (bgm) {
      bgm.pause();
      bgm.currentTime = 0;
    }
    setIsPlaying(false);
    setIsReviewingTrim(false);
  }, []);

  const startPolishing = async () => {
    if (polishBusyRef.current) return;
    polishBusyRef.current = true;
    stopAllPreviewPlayback();
    const runId = ++polishRunIdRef.current;
    const still = () => polishRunIdRef.current === runId;
    isReviewingTrimRef.current = false;
    setIsReviewingTrim(false);
    setIsPolishing(true);
    setPolishStep(0);
    setPolishProgress(4);
    setPolishStepNotes(["", "", ""]);

    const setNote = (index: number, note: string) => {
      setPolishStepNotes((prev) => {
        const next = [...prev];
        next[index] = note;
        return next;
      });
    };

    try {
      if (id) {
        await contentApi.saveClipEdit(id, buildClipEditSpec());
      }
    } catch (err) {
      toast.error("Could not save trim", {
        description: formatClipApiError(err, "Fix trim and try again."),
      });
      setIsPolishing(false);
      polishBusyRef.current = false;
      return;
    }

    try {
      if (!still()) return;

      // Resume-aware: drafts that already finished Whisper / copy should not re-run them.
      let existingTranscript =
        (transcriptPreview || "").trim() ||
        "";
      let serverHashtags: string[] = [];
      let serverCaption = "";
      let serverRenderStatus = "";
      if (id) {
        try {
          const latest = await contentApi.getOwnedContentById(id, {
            suppressErrorLog: true,
          });
          if (!still()) return;
          serverRenderStatus = String(latest.renderStatus || "");
          const spec = latest.clipEditSpec;
          if (typeof spec?.transcript === "string" && spec.transcript.trim()) {
            existingTranscript = spec.transcript.trim();
            setTranscriptPreview(existingTranscript);
          }
          const tags =
            latest.selectedHashtags ||
            latest.hashtagSets?.[0] ||
            (Array.isArray(spec?.extras?.hashtags) ? spec.extras.hashtags : []);
          if (Array.isArray(tags)) {
            serverHashtags = tags
              .filter((t): t is string => typeof t === "string" && Boolean(t.trim()))
              .map((t) => (t.startsWith("#") ? t : `#${t}`));
          }
          serverCaption = String(
            latest.selectedCaption ||
              latest.captions?.[0] ||
              latest.description ||
              "",
          ).trim();
        } catch {
          /* continue with local state */
        }
      }

      const hasTranscript = Boolean(existingTranscript);
      const hasCopy =
        Boolean(description.trim() || serverCaption) &&
        Boolean(hashtags.length || serverHashtags.length);
      const hasHook =
        Boolean(topText.trim()) ||
        hooks.some((h) => Boolean(h?.text?.trim())) ||
        coachViralApplied;
      const hasTransitions = appliedTransitions.length > 0 || coachViralApplied;
      const polishAlreadyDone =
        hasTranscript && hasCopy && (hasHook || hasTransitions);

      // Fast path: returning draft — skip Whisper/captions/effects regeneration.
      if (polishAlreadyDone) {
        setPolishStep(0);
        setNote(0, t("clip_editor.overlays.steps.transcribing_done", { defaultValue: "Transcript ready" }));
        setPolishProgress(40);
        setPolishStep(1);
        setNote(1, t("clip_editor.overlays.steps.captions_done", { defaultValue: "Caption and hashtags drafted" }));
        autoCaptionRanRef.current = true;
        if (serverHashtags.length && !hashtags.length) setHashtags(serverHashtags);
        if (!description.trim() && serverCaption) setDescription(serverCaption);
        setPolishProgress(80);
        setPolishStep(2);
        setNote(2, t("clip_editor.overlays.steps.effects_done", { defaultValue: "Hooks and transition beats ready" }));
        await waitAtLeast(Date.now(), 450);
        if (!still()) return;
        setPolishProgress(100);
        setPolishStep(3);
        if (String(serverRenderStatus).toLowerCase() === "completed") {
          setIsDirty(false);
        }
        mergeSearchParams({ step: "polish" });
        return;
      }

      setPolishProgress(10);
      setNote(0, t("clip_editor.overlays.steps.transcribing_queued", { defaultValue: "Queued speech-to-text…" }));

      if (id) {
        const transcribeStarted = Date.now();
        try {
          if (hasTranscript) {
            setNote(
              0,
              t("clip_editor.overlays.steps.transcribing_done", { defaultValue: "Transcript ready" }),
            );
          } else {
            await contentApi.transcribeClip(id);
            const transcript = await waitForClipTranscript(
              () => contentApi.getOwnedContentById(id, { suppressErrorLog: true }),
              {
                attempts: 12,
                delayMs: 2000,
                isCancelled: () => !still(),
                onTick: (attempt, attempts) => {
                  setPolishProgress(10 + Math.round((attempt / Math.max(1, attempts)) * 28));
                  setNote(
                    0,
                    t("clip_editor.overlays.steps.transcribing_wait", {
                      defaultValue: "Listening for words… {{attempt}}/{{attempts}}",
                      attempt: attempt + 1,
                      attempts,
                    }),
                  );
                },
              },
            );
            if (!still()) return;
            if (transcript != null) {
              setTranscriptPreview(transcript);
              setNote(
                0,
                transcript.trim()
                  ? t("clip_editor.overlays.steps.transcribing_done", { defaultValue: "Transcript ready" })
                  : t("clip_editor.overlays.steps.transcribing_empty", { defaultValue: "No speech detected — continuing" }),
              );
            } else {
              setNote(
                0,
                t("clip_editor.overlays.steps.transcribing_slow", {
                  defaultValue: "Still processing — you can transcribe again on Captions",
                }),
              );
            }
          }
        } catch (err) {
          setNote(0, formatClipApiError(err, t("clip_editor.overlays.steps.transcribing_fail", { defaultValue: "Transcription skipped" })));
        }
        await waitAtLeast(transcribeStarted, 700);
      }

      if (!still()) return;
      setPolishStep(1);
      setPolishProgress(42);
      setNote(1, t("clip_editor.overlays.steps.generating_captions_sub"));
      const captionStarted = Date.now();
      if (hasCopy) {
        autoCaptionRanRef.current = true;
        if (serverHashtags.length && !hashtags.length) setHashtags(serverHashtags);
        if (!description.trim() && serverCaption) setDescription(serverCaption);
        setNote(1, t("clip_editor.overlays.steps.captions_done", { defaultValue: "Caption and hashtags drafted" }));
      } else {
        await generateAICaption({ silent: true });
        autoCaptionRanRef.current = true;
        setNote(1, t("clip_editor.overlays.steps.captions_done", { defaultValue: "Caption and hashtags drafted" }));
      }
      await waitAtLeast(captionStarted, 700);
      if (!still()) return;

      setPolishStep(2);
      setPolishProgress(72);
      setNote(2, t("clip_editor.overlays.steps.suggesting_effects_sub"));
      const effectsStarted = Date.now();
      if (id) {
        try {
          await contentApi.saveClipEdit(id, buildClipEditSpec());
          // Coach / prior edit already set the active hook — do not auto-overwrite it.
          // Still fetch alternatives into hookOptions when empty so Details can offer picks.
          const existingHook =
            topText.trim() || hooks.find((h) => Boolean(h?.text?.trim()))?.text?.trim() || "";
          if (existingHook) {
            if (still() && (!hooks.length || !hooks[0]?.text?.trim())) {
              setHooks([
                {
                  text: existingHook.slice(0, 80),
                  startMs: Math.round((finalTrim?.start ?? trimStart) * 1000),
                  durationMs: 2800,
                  styleId: memeCaptionStyle,
                },
              ]);
            }
            if (still() && hookOptions.length < 3) {
              try {
                const hooksRes = await contentApi.generateClipHooks(id);
                if (still() && hooksRes.hooks?.length) {
                  setHookOptions(hooksRes.hooks);
                }
              } catch {
                /* optional alternatives */
              }
            }
          } else if (!hasHook) {
            const hooksRes = await contentApi.generateClipHooks(id);
            if (still() && hooksRes.hooks?.length) {
              setHookOptions(hooksRes.hooks);
              const first = hooksRes.hooks[0];
              if (first?.text?.trim()) {
                setTopText(first.text.trim().slice(0, 50));
                setHooks([first]);
                setSelectedHookOptionIndex(0);
              }
            }
          }
        } catch {
          /* hooks stay empty — user can retry on polish */
        }
        if (!still()) return;
        // Do not replace Coach cut joins with Enhance timeline suggestions after Viral Apply.
        if (!coachViralApplied && !hasTransitions) {
          try {
            await generateTransitionSuggestions();
          } catch {
            /* transitions optional */
          }
        }
      }
      await waitAtLeast(effectsStarted, 700);
      if (!still()) return;
      setNote(2, t("clip_editor.overlays.steps.effects_done", { defaultValue: "Hooks and transition beats ready" }));
      setPolishProgress(100);
      setPolishStep(3);

      mergeSearchParams({ step: "polish" });
    } catch (err) {
      if (!still()) return;
      toast.error("Could not start polish", {
        description: formatClipApiError(err, "Trim is saved — open Polish & Publish to continue."),
      });
      mergeSearchParams({ step: "polish" });
    } finally {
      if (still()) {
        setIsPolishing(false);
        polishBusyRef.current = false;
        // Restore mute so Polish play uses normal mix (clip + BGM).
        if (videoRef.current) videoRef.current.muted = false;
        applyPreviewMix();
      }
    }
  };

  /** Next: Polish — silent handoff (no trim-review audio under the progress overlay). */
  const handleApplyTrim = () => {
    setFinalTrim({ start: trimStart, end: trimEnd });
    stopAllPreviewPlayback();
    void startPolishing();
  };

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      const playPromise = playPromiseRef.current;
      
      if (playPromise) {
        playPromise.then(() => {
          audio.pause();
          audio.currentTime = 0;
        }).catch(() => {
          audio.pause();
        });
      } else {
        audio.pause();
        audio.currentTime = 0;
      }
      
      audioRef.current = null;
      playPromiseRef.current = null;
    }
  }, []);

  const stopPreview = useCallback(() => {
    stopAudio();
    if (previewTimerRef.current) {
      clearInterval(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    setPreviewingTrackId(null);
    setPreviewProgress(0);
  }, [stopAudio]);

  useEffect(() => {
    if (previewingTrackId) {
      const track = TRACKS.find(t => t.id === previewingTrackId);
      if (track) {
        // Stop any currently playing audio hardware-wise
        // But DON'T call stopPreview() as it resets the state we just set
        stopAudio();
        if (previewTimerRef.current) {
          clearInterval(previewTimerRef.current);
          previewTimerRef.current = null;
        }

        const audio = new Audio(track.url);
        const master = isMasterMuted ? 0 : masterVolume;
        audio.volume = isMusicMuted ? 0 : Math.max(0, Math.min(1, musicVolume * master));
        audioRef.current = audio;
        
        const playPromise = audio.play();
        playPromiseRef.current = playPromise;
        
        playPromise.catch(err => {
          if (err.name !== "AbortError") {
            console.error("Playback error:", err);
          }
        });
        
        setPreviewProgress(0);
        const startTime = Date.now();
        
        previewTimerRef.current = setInterval(() => {
          const elapsed = (Date.now() - startTime) / 1000;
          const progress = (elapsed / 15) * 100;
          
          if (elapsed >= 15) {
            stopPreview();
          } else {
            setPreviewProgress(progress);
          }
        }, 100);
      }
    } else {
      stopAudio();
    }

    return () => stopAudio();
  }, [previewingTrackId, stopAudio]);

  useEffect(() => {
    if (audioRef.current) {
      const master = isMasterMuted ? 0 : masterVolume;
      audioRef.current.volume = isMusicMuted ? 0 : Math.max(0, Math.min(1, musicVolume * master));
    }
  }, [musicVolume, isMusicMuted, masterVolume, isMasterMuted]);

  const handleTrackPreview = (trackId: string | null) => {
    mixBgmRef.current?.pause();
    videoRef.current?.pause();
    setIsPlaying(false);
    if (!trackId) {
      stopPreview();
      return;
    }
    if (previewingTrackId === trackId) stopPreview();
    else setPreviewingTrackId(trackId);
  };

  useEffect(() => {
    const bgm = mixBgmRef.current;
    const track = TRACKS.find((t) => t.id === selectedTrackId);
    if (!selectedTrackId || !track) {
      clearMixBgm();
      applyPreviewMix();
      return;
    }
    if (!bgm) return;
    if (mixBgmTrackIdRef.current !== selectedTrackId) {
      bgm.src = track.url;
      mixBgmTrackIdRef.current = selectedTrackId;
      bgm.currentTime = 0;
    }
    applyPreviewMix();
    const video = videoRef.current;
    if (video && !video.paused) {
      void bgm.play().catch(() => {});
    }
  }, [selectedTrackId, clearMixBgm, applyPreviewMix]);

  const generateAITitle = async () => {
    setIsGeneratingTitle(true);
    try {
      if (!id) throw new Error("Missing clip id");
      const res = await contentApi.generateClipTitle(id, {
        title,
        prompt: prompt || undefined,
      });
      if (res.title) {
        setTitle(res.title.trim().slice(0, 80));
      }
    } catch (error) {
      console.error("Error generating title:", error);
      toast.error("Title generation failed", {
        description: formatClipApiError(error),
      });
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const generateAICaption = async (opts?: { silent?: boolean }) => {
    if (!title) return;
    setIsGeneratingCaption(true);
    const nicheFocus = nicheFocusLabel(categoryLabel, niches);
    const applyHeuristic = () => {
      const slugTags = [categoryLabel, ...niches]
        .flatMap((s) => String(s || "").split(/[&,/]+/))
        .map((s) => s.trim().replace(/[^a-zA-Z0-9]/g, ""))
        .filter((s) => s.length > 1)
        .slice(0, 6)
        .map((s) => `#${s}`);
      const suggestions = [
        `${title.trim()} ✨`,
        `${title.trim()} — ${nicheFocus} 🔥`,
        `New drop: ${title.trim()}. Save this. 📌`,
      ];
      setAiSuggestions(suggestions);
      if (!description.trim() && suggestions[0]) setDescription(suggestions[0]);
      if (!hashtags.length) {
        setHashtags([...new Set(["#NxClip", ...slugTags])].slice(0, 8));
      }
    };
    try {
      if (!id) throw new Error("Missing clip id");
      const res = await contentApi.generateClipCopy(id, {
        title,
        existingHashtags: hashtags.length ? hashtags : undefined,
      });
      const captions = Array.isArray(res.captions) ? res.captions.filter(Boolean).slice(0, 3) : [];
      if (captions.length) {
        setAiSuggestions(captions);
        if (!description.trim() && captions[0]) setDescription(captions[0]);
      } else {
        applyHeuristic();
      }
      if (!hashtags.length && Array.isArray(res.hashtagSets) && res.hashtagSets[0]?.length) {
        setHashtags(
          res.hashtagSets[0]
            .filter((t): t is string => typeof t === "string" && Boolean(t.trim()))
            .map((t) => (t.startsWith("#") ? t : `#${t}`))
            .slice(0, 12),
        );
      }
    } catch (error) {
      console.error("Error generating caption:", error);
      applyHeuristic();
      if (!opts?.silent) {
        toast.error("Caption generation failed", {
          description: formatClipApiError(error, "Used a starter caption instead. You can edit it."),
        });
      }
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  const buildClipEditSpec = useCallback(() => {
    const inMs = Math.max(0, Math.round(trimStart * 1000));
    const outMs = Math.max(inMs + 1, Math.round(trimEnd * 1000));
    const vibrance = colorCorrection / 100;
    return {
      inMs,
      outMs,
      aspect: "9:16",
      creatorCategory: categoryLabel || undefined,
      niches: niches.length ? niches : undefined,
      title,
      description,
      bgmTrackId: selectedTrackId || undefined,
      voiceVolume: clipVolume,
      bgmVolume: musicVolume,
      masterVolume: Math.min(1.5, masterVolume),
      captions: {
        topText: topText || undefined,
        bottomText: bottomText || undefined,
        styleId: memeCaptionStyle || undefined,
        fontId: captionFontId || undefined,
        textColor: captionTextColor || undefined,
        burnWords: true,
        topX: topOverlay.x,
        topY: topOverlay.y,
        bottomX: bottomOverlay.x,
        bottomY: bottomOverlay.y,
      },
      // Omit hooks that duplicate topText so render does not stack white MemeTop + yellow Hook.
      hooks: (() => {
        const topNorm = topText.trim().toLowerCase();
        const unique = hooks.filter((h) => {
          const t = (h?.text || "").trim();
          if (!t) return false;
          if (!topNorm) return true;
          return t.toLowerCase() !== topNorm;
        });
        return unique.length ? unique : undefined;
      })(),
      silence: { enabled: silenceEnabled, minSilenceMs: 700 },
      crop: { mode: cropMode },
      // creatorContext is authoritative (up to 500). polishPrompt stays ≤200 for legacy readers.
      polishPrompt: prompt
        ? sanitizeCreatorContext(prompt).slice(0, 200)
        : undefined,
      creatorContext: prompt ? sanitizeCreatorContext(prompt) || undefined : undefined,
      extras: {
        hashtags: hashtags.length ? hashtags : undefined,
        // Always send transitions (incl. []) so clearing them invalidates prior burn-in.
        transitions: appliedTransitions,
        enhance: {
          noiseReduced: isNoiseReduced,
          colorCorrection,
          brightness: 1 + vibrance * 0.12,
          saturate: 1 + vibrance * 0.45,
          contrast: 1 + vibrance * 0.18,
        },
      },
    };
  }, [
    trimStart,
    trimEnd,
    categoryLabel,
    niches,
    title,
    description,
    selectedTrackId,
    clipVolume,
    musicVolume,
    masterVolume,
    topText,
    bottomText,
    topOverlay,
    bottomOverlay,
    memeCaptionStyle,
    captionFontId,
    captionTextColor,
    hooks,
    silenceEnabled,
    prompt,
    hashtags,
    isNoiseReduced,
    colorCorrection,
    appliedTransitions,
    cropMode,
  ]);

  const saveClipEditToServer = useCallback(async () => {
    if (!id) return;
    try {
      await contentApi.saveClipEdit(id, buildClipEditSpec());
    } catch (err) {
      console.warn("clip-edit autosave failed", err);
      toast.error("Autosave failed", {
        description: formatClipApiError(err, "Your last change may not be saved."),
      });
    }
  }, [id, buildClipEditSpec]);

  const polishNeedsBurnIn = useCallback(() => {
    return Boolean(
      coachViralApplied ||
        selectedTrackId ||
        topText.trim() ||
        bottomText.trim() ||
        hooks.some((h) => Boolean(h?.text?.trim())) ||
        silenceEnabled ||
        appliedTransitions.length ||
        (captionTextColor && captionTextColor.toUpperCase() !== "#FFFFFF"),
    );
  }, [
    coachViralApplied,
    selectedTrackId,
    topText,
    bottomText,
    hooks,
    silenceEnabled,
    appliedTransitions.length,
    captionTextColor,
  ]);

  /** Persist clipEditSpec and wait for media-worker polish (BGM, captions, hooks, trim).
   * If a job is already queued/processing, polls it instead of starting another (avoids 400). */
  const ensurePolishedRender = useCallback(
    async (opts?: {
      download?: boolean;
      toastId?: string;
      loadingMessage?: string;
      force?: boolean;
    }) => {
      if (!id) throw new Error("No active clip ID found.");
      const toastId = opts?.toastId ?? "render-clip";
      let status = String(renderStatus || "").toLowerCase();

      const isPolishedComplete = (item: {
        renderStatus?: string | null;
        clipEditSpec?: { extras?: Record<string, unknown> | null } | null;
      }) => {
        const st = String(item.renderStatus || "").toLowerCase();
        const extras = item.clipEditSpec?.extras || {};
        const quality = String(extras.renderQuality || "");
        const hasHash =
          typeof extras.renderSpecHash === "string" && Boolean(extras.renderSpecHash);
        // Reject copy-fallback / unverified "completed" assets — no burned edits.
        return st === "completed" && quality !== "fallback" && (quality === "polished" || hasHash);
      };

      const pollUntilDone = async () => {
        toast.loading(
          opts?.loadingMessage ?? "Rendering your edits into the MP4…",
          { id: toastId },
        );
        const started = Date.now();
        while (Date.now() - started < 240_000) {
          await new Promise((r) => setTimeout(r, 2000));
          const polled = await contentApi.getOwnedContentById(id, {
            suppressErrorLog: true,
          });
          status = String(polled.renderStatus || status).toLowerCase();
          setRenderStatus(polled.renderStatus || status);
          if (status === "completed" || status === "failed") break;
        }
      };

      try {
        const latest = await contentApi.getOwnedContentById(id, {
          suppressErrorLog: true,
        });
        status = String(latest.renderStatus || status).toLowerCase();
        setRenderStatus(latest.renderStatus || status);

        // Stale copy-fallback must not unlock Final Preview — force a real burn-in.
        const staleFallback =
          String(latest.clipEditSpec?.extras?.renderQuality || "") === "fallback" ||
          (status === "completed" && !latest.clipEditSpec?.extras?.renderSpecHash);

        if (!opts?.force && !staleFallback && (status === "queued" || status === "processing")) {
          await pollUntilDone();
        } else if (!opts?.force && !staleFallback && isPolishedComplete(latest)) {
          status = "completed";
        } else {
          const spec = buildClipEditSpec();
          await contentApi.saveClipEdit(id, spec);
          const forceNew = Boolean(opts?.force || staleFallback);
          try {
            const queued = await contentApi.renderClip(id, {
              clipEditSpec: spec,
              ...(forceNew ? { force: true } : {}),
            });
            status = String(
              queued.renderStatus || queued.status || "queued",
            ).toLowerCase();
            setRenderStatus(
              status === "completed" ? "completed" : queued.renderStatus || status,
            );
          } catch (err) {
            const msg = formatClipApiError(err, "");
            if (/already in progress/i.test(msg)) {
              status = "processing";
              setRenderStatus("processing");
            } else {
              throw err;
            }
          }

          if (status !== "completed") {
            await pollUntilDone();
          }
        }

        const verified = await contentApi.getOwnedContentById(id, {
          suppressErrorLog: true,
        });
        status = String(verified.renderStatus || status).toLowerCase();
        setRenderStatus(verified.renderStatus || status);
        if (!isPolishedComplete(verified)) {
          clearRenderPreview();
          throw new Error(
            status === "failed"
              ? "Render did not burn edits (encode failed). Retry Save & Render."
              : "Render finished without a polished MP4. Retry Save & Render.",
          );
        }
        setIsDirty(false);
      } catch (err) {
        const detail = formatClipApiError(
          err,
          "Could not start or finish render. Your Apply is still saved.",
        );
        throw new Error(detail);
      }

      if (opts?.download) {
        toast.loading("Preparing download…", { id: toastId });
        const token = getAccessToken();
        const mediaUrl = `${resolveBaseGatewayUrl()}/content/${id}/media?variant=render&_=${Date.now()}`;
        const res = await fetch(mediaUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Download failed (${res.status})`);
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = `${(title || "clip").replace(/[^\w\-]+/g, "_")}.mp4`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);
      }

      return status;
    },
    [id, buildClipEditSpec, title, renderStatus, clearRenderPreview],
  );

  const handlePublishContent = async () => {
    if (!id) {
      toast.error("No active clip ID found.");
      return;
    }
    if (isAlreadyPublished) {
      toast.error("Already published", {
        description: publishBlockedReason || undefined,
      });
      return;
    }
    if (coachTextCuts && coachTextCuts.length > 1 && !coachViralApplied) {
      toast.error("Apply the Coach edit first", {
        description:
          "Stitch order, joins, and hide-text only burn in after Apply to clip.",
      });
      return;
    }
    if (!renderReady) {
      toast.error("Save & Render required", {
        description: renderGateMessage,
        id: "publish-clip",
      });
      return;
    }
    setIsPublishing(true);
    triggerHaptic("medium");
    try {
      // Render already completed via Save & Render — publish that same MP4 to the feed.
      toast.loading("Submitting to content moderation and feed...", { id: "publish-clip" });
      await contentApi.publish(id, {
        title,
        description,
        caption: socialCaption || title,
        hashtags: hashtags.length ? hashtags : undefined,
        socialPlatforms: socialPlatforms.length ? socialPlatforms : undefined,
      });

      toast.success("Published to your feed", { id: "publish-clip" });
      const planDay = searchParams.get("planDay");
      if (planDay && profile?.uid && id) {
        markPlanDayComplete(profile.uid, planDay, id);
      }
      triggerHaptic("success");
      setIsDirty(false);
      setPublishPreviewOpen(false);
      navigate("/feed", {
        state: { refreshFeed: true, publishedContentId: id },
      });
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to publish clip", {
        description: formatClipApiError(err, "An unexpected error occurred during publication."),
        id: "publish-clip",
      });
      triggerHaptic("error");
    } finally {
      setIsPublishing(false);
    }
  };

  // Dashboard Workflow Intelligence: ?action=hooks generates viral hooks once.
  const autoHooksRanRef = useRef(false);
  useEffect(() => {
    autoHooksRanRef.current = false;
    autoCaptionRanRef.current = false;
    retryAnimateRanRef.current = false;
  }, [id]);

  useEffect(() => {
    const action = searchParams.get("action");
    if (action !== "hooks" || !id || autoHooksRanRef.current) return;
    if (videoLoading || !specHydratedRef.current) return;
    setActivePolishTab("details");
    // Focus hooks editor once Details is visible
    requestAnimationFrame(() => {
      document.getElementById("clip-hooks-editor")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    if (hookOptions.length >= 3) {
      autoHooksRanRef.current = true;
      return;
    }
    autoHooksRanRef.current = true;
    let cancelled = false;
    (async () => {
      setIsGeneratingHooks(true);
      try {
        await saveClipEditToServer();
        if (cancelled) return;
        const res = await contentApi.generateClipHooks(id);
        if (cancelled) return;
        const generatedHooks = res.hooks || [];
        setHookOptions(generatedHooks);
        if (!topText.trim() && generatedHooks[0]?.text?.trim()) {
          setTopText(generatedHooks[0].text.trim().slice(0, 50));
          setHooks([generatedHooks[0]]);
          setSelectedHookOptionIndex(0);
        }
        toast.success(
          t("clip_editor.polish.details.hooks_ready", {
            defaultValue: "{{count}} hooks ready — tap one to replace the on-clip hook",
            count: generatedHooks.length,
          }),
        );
        const params = new URLSearchParams(searchParams);
        params.delete("action");
        if (!params.get("step")) params.set("step", "polish");
        setSearchParams(params, { replace: true });
      } catch (err) {
        autoHooksRanRef.current = false;
        toast.error("Hook generation failed", {
          description: formatClipApiError(err),
        });
      } finally {
        if (!cancelled) setIsGeneratingHooks(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot deep link
  }, [id, searchParams, hookOptions.length, saveClipEditToServer, videoLoading]);

  // Auto-generate AI caption once when polish loads and description is empty.
  useEffect(() => {
    if (step !== "polish" || !specHydratedRef.current || autoCaptionRanRef.current) return;
    if (!title.trim()) return;
    if (description.trim()) {
      autoCaptionRanRef.current = true;
      return;
    }
    autoCaptionRanRef.current = true;
    void generateAICaption({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot on polish entry
  }, [step, title, description]);

  // Dashboard: ?retryAnimate=1 retries animate-as-clip when media is missing.
  useEffect(() => {
    if (!id || retryAnimateRanRef.current) return;
    if (searchParams.get("retryAnimate") !== "1") return;
    let cancelled = false;
    (async () => {
      try {
        const item = await contentApi.getOwnedContentById(id, { suppressErrorLog: true });
        if (cancelled) return;
        const status = String(item.status || "").toLowerCase();
        const renderFailed = String(item.renderStatus || "").toLowerCase() === "failed";
        const failed = status === "generation_failed" || renderFailed;
        if (item.storageKey && !failed) {
          retryAnimateRanRef.current = true;
          mergeSearchParams({ retryAnimate: null });
          return;
        }
        retryAnimateRanRef.current = true;
        toast.message("Retrying animation…", {
          description: "We’ll refresh the preview when the MP4 is ready.",
        });
        const sourceContentId =
          typeof item.clipEditSpec?.sourceContentId === "string"
            ? item.clipEditSpec.sourceContentId
            : undefined;
        await contentApi.retryAnimate(id, { sourceContentId });
        if (cancelled) return;
        let ready = false;
        for (let i = 0; i < 40; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          if (cancelled) return;
          const latest = await contentApi.getUserContentById(id, { suppressErrorLog: true });
          const status = String(latest.status || "").toLowerCase();
          if (latest.storageKey) {
            ready = true;
            toast.success("Animation ready — loading preview");
            // Trigger media reload by clearing then re-setting via navigation params
            const token = getAccessToken();
            const mediaUrl = `${resolveBaseGatewayUrl()}/content/${id}/media?variant=master`;
            try {
              const res = await fetch(mediaUrl, {
                cache: "no-store",
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              });
              if (res.ok) {
                const blob = await res.blob();
                if (blob.size >= 64) {
                  setVideoSrc(URL.createObjectURL(blob));
                }
              }
            } catch {
              /* load effect may still recover on remount */
            }
            break;
          }
          if (status === "generation_failed" || status === "failed") {
            toast.error("Animation retry failed");
            break;
          }
        }
        if (!ready && !cancelled) {
          toast.message("Still processing", {
            description: "Animation is taking longer — refresh in a minute.",
          });
        }
        mergeSearchParams({ retryAnimate: null });
      } catch (err) {
        retryAnimateRanRef.current = false;
        toast.error("Retry animate failed", {
          description: formatClipApiError(err),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot deep link
  }, [id, searchParams]);

  /** Burn current edits once. After success, load final MP4 into preview; Publish/Download unlock. */
  const handleSaveAndRender = async () => {
    if (!id) {
      toast.error("No active clip ID found.");
      return;
    }
    if (coachTextCuts && coachTextCuts.length > 1 && !coachViralApplied) {
      toast.error("Apply the Coach edit first", {
        description:
          "Stitch order, joins, and hide-text only burn in after Apply to clip.",
      });
      return;
    }
    setIsRendering(true);
    triggerHaptic("medium");
    try {
      // Re-render always forces a new FFmpeg burn-in (never reuse a stale/raw asset).
      await ensurePolishedRender({
        toastId: "save-render",
        loadingMessage: "Saving edit and rendering clip…",
        force: renderReady,
      });
      setRenderStatus("completed");
      toast.loading("Loading final preview…", { id: "save-render" });
      await loadRenderPreview();
      toast.success("Final render ready — play it below, then Publish or Download", {
        id: "save-render",
      });
      triggerHaptic("success");
    } catch (err: any) {
      console.error(err);
      clearRenderPreview();
      setRenderStatus("failed");
      toast.error("Save & Render failed", {
        description: formatClipApiError(err, "Could not burn in this clip."),
        id: "save-render",
      });
      triggerHaptic("error");
    } finally {
      setIsRendering(false);
    }
  };

  /** Download the completed render only — no re-render (use Save & Render first). */
  const handleRenderDownload = async () => {
    if (!id) {
      toast.error("No active clip ID found.");
      return;
    }
    if (!renderReady) {
      toast.error("Save & Render required", {
        description: renderGateMessage,
        id: "render-clip",
      });
      return;
    }
    setIsRendering(true);
    triggerHaptic("medium");
    try {
      toast.loading("Preparing download…", { id: "render-clip" });
      const token = getAccessToken();
      const mediaUrl = `${resolveBaseGatewayUrl()}/content/${id}/media?variant=render&_=${Date.now()}`;
      const res = await fetch(mediaUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${(title || "clip").replace(/[^\w\-]+/g, "_")}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success("Download started", { id: "render-clip" });
      triggerHaptic("success");
    } catch (err: any) {
      console.error(err);
      toast.error("Download failed", {
        description: formatClipApiError(err, "Could not export this clip."),
        id: "render-clip",
      });
      triggerHaptic("error");
    } finally {
      setIsRendering(false);
    }
  };

  // Auto-save logic (per content id — never reuse another clip's draft)
  useEffect(() => {
    specHydratedRef.current = false;
    isLoaded.current = false;
    suppressDirtyRef.current = true;
    clearRenderPreview();
    const timer = setTimeout(() => {
      isLoaded.current = true;
    }, 400);
    return () => clearTimeout(timer);
  }, [id, clearRenderPreview]);

  const saveToLocalStorage = useCallback(() => {
    if (!id || !specHydratedRef.current) return;
    const data = {
      trimStart,
      trimEnd,
      selectedTrackId,
      topText,
      bottomText,
      topOverlay,
      bottomOverlay,
      memeCaptionStyle,
      captionFontId,
      updatedAt: new Date().toISOString()
    };
    safeLocalStorage.setItem(`nexaclip_editor_autosave:${id}`, safeStringify(data));
  }, [id, trimStart, trimEnd, selectedTrackId, topText, bottomText, topOverlay, bottomOverlay, memeCaptionStyle, captionFontId]);

  // Periodic autosave every 30 seconds (local + server blueprint)
  useEffect(() => {
    const interval = setInterval(() => {
      saveToLocalStorage();
      void saveClipEditToServer();
    }, 30000);
    return () => clearInterval(interval);
  }, [saveToLocalStorage, saveClipEditToServer]);

  // Autosave when significant changes occur
  useEffect(() => {
    saveToLocalStorage();
  }, [trimStart, trimEnd, selectedTrackId, saveToLocalStorage]);

  // Debounced server clip-edit persist after trim / caption changes
  useEffect(() => {
    if (!isLoaded.current || !id || !specHydratedRef.current) return;
    const timer = setTimeout(() => {
      void saveClipEditToServer();
    }, 1200);
    return () => clearTimeout(timer);
  }, [trimStart, trimEnd, selectedTrackId, topText, bottomText, topOverlay, bottomOverlay, memeCaptionStyle, captionFontId, captionTextColor, title, description, prompt, hooks, silenceEnabled, hashtags, isNoiseReduced, colorCorrection, clipVolume, musicVolume, masterVolume, appliedTransitions, id, saveClipEditToServer]);

  // Track real user edits only — ignore hydration / post-render state sync.
  useEffect(() => {
    if (!isLoaded.current || !specHydratedRef.current || suppressDirtyRef.current) return;
    setIsDirty(true);
    // New edits invalidate the final-render preview — back to live CSS/mix preview.
    clearRenderPreview();
  }, [trimStart, trimEnd, selectedTrackId, topText, bottomText, topOverlay, bottomOverlay, memeCaptionStyle, captionFontId, captionTextColor, title, description, prompt, hooks, silenceEnabled, hashtags, colorCorrection, isNoiseReduced, clipVolume, musicVolume, masterVolume, appliedTransitions, cropMode, coachViralApplied, coachTextCuts, coachStitchJoins, clearRenderPreview]);

  // Resume an in-flight render after refresh (no 400 — just poll until done).
  useEffect(() => {
    if (!id || step !== "polish") return;
    let cancelled = false;
    void (async () => {
      try {
        const latest = await contentApi.getOwnedContentById(id, {
          suppressErrorLog: true,
        });
        if (cancelled) return;
        let status = String(latest.renderStatus || "").toLowerCase();
        setRenderStatus(latest.renderStatus || status);
        if (status !== "queued" && status !== "processing") {
          if (status === "completed") setIsDirty(false);
          return;
        }
        setIsRendering(true);
        toast.loading("Finishing render in progress…", { id: "save-render" });
        const started = Date.now();
        while (!cancelled && Date.now() - started < 240_000) {
          await new Promise((r) => setTimeout(r, 2000));
          const polled = await contentApi.getOwnedContentById(id, {
            suppressErrorLog: true,
          });
          status = String(polled.renderStatus || status).toLowerCase();
          if (!cancelled) setRenderStatus(polled.renderStatus || status);
          if (status === "completed" || status === "failed") break;
        }
        if (cancelled) return;
        if (status === "completed") {
          setIsDirty(false);
          await loadRenderPreview();
          toast.success("Final render ready — play it below", { id: "save-render" });
        } else if (status === "failed") {
          toast.error("Render failed — tap Save & Render to retry", { id: "save-render" });
        } else {
          toast.error("Render timed out — tap Save & Render to retry", { id: "save-render" });
        }
      } catch {
        /* soft — user can tap Save & Render */
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, step, loadRenderPreview]);

  // If a completed render already exists (reload / prior session), show it in polish preview.
  useEffect(() => {
    if (step !== "polish" || !renderReady || renderPreviewSrc || isRendering) return;
    let cancelled = false;
    void (async () => {
      try {
        await loadRenderPreview();
      } catch {
        if (!cancelled) {
          /* keep live preview if render asset is not fetchable yet */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, renderReady, renderPreviewSrc, isRendering, loadRenderPreview]);

  // Revoke render preview blob on leave / content change.
  useEffect(() => {
    return () => {
      if (renderPreviewUrlRef.current) {
        URL.revokeObjectURL(renderPreviewUrlRef.current);
        renderPreviewUrlRef.current = null;
      }
    };
  }, [id]);

  // Tab/window close warning. In-app leave confirm needs a data router (useBlocker);
  // App uses BrowserRouter, so we only guard hard navigations here.
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  const generateTransitionSuggestions = useCallback(async (opts?: { silent?: boolean }) => {
    setIsGeneratingTransitions(true);
    const window = polishWindow(finalTrim, trimStart, trimEnd);
    const applyCoachFallback = () => {
      const fromCoach = transitionsFromCoachBeats(markers, window.start, window.end);
      if (fromCoach.length) {
        setTransitionSuggestions(fromCoach);
        if (!opts?.silent) {
          toast.message("Transitions from AI Coach beats", {
            description: "Preview on the player — burn-in on export is next.",
          });
        }
        return true;
      }
      return false;
    };
    try {
      if (!id) throw new Error("Missing clip id");
      const res = await contentApi.suggestClipTimeline(id, {
        kind: "transitions",
        durationSec: Math.max(window.end, DURATION),
        trimStartSec: window.start,
        trimEndSec: window.end,
      });
      if (Array.isArray(res.transitions) && res.transitions.length) {
        setTransitionSuggestions(
          res.transitions.map((s) => ({
            time: toClipRelativeTime(Number(s.time), window.start, window.end),
            type: String(s.type),
            caption: s.caption ? String(s.caption) : undefined,
            sfx: s.sfx ? String(s.sfx) : undefined,
          })),
        );
        if (!opts?.silent) {
          toast.success("Transition suggestions ready");
        }
        return;
      }
      if (!applyCoachFallback() && !opts?.silent) {
        toast.message("No transitions yet", {
          description: "Run AI Coach analyze (or AI Scan on Trim) so we have beats to suggest from.",
        });
      }
    } catch (error) {
      console.error("Error generating transitions:", error);
      if (applyCoachFallback()) return;
      if (!opts?.silent) {
        toast.error("Transition suggestions failed", {
          description: formatClipApiError(error, "Enhance transitions are preview-only."),
        });
      }
    } finally {
      setIsGeneratingTransitions(false);
    }
  }, [DURATION, finalTrim, id, markers, trimEnd, trimStart]);

  // Auto-suggest transitions when entering Polish / Enhance — skip when Coach viral stitch is locked.
  const transitionsAutoForIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (step !== "polish" || !id || coachViralApplied) return;
    if (transitionSuggestions.length > 0 || isGeneratingTransitions) return;
    if (transitionsAutoForIdRef.current === id) return;
    transitionsAutoForIdRef.current = id;
    void generateTransitionSuggestions({ silent: true });
  }, [
    step,
    id,
    coachViralApplied,
    transitionSuggestions.length,
    isGeneratingTransitions,
    generateTransitionSuggestions,
  ]);

  useEffect(() => {
    if (step !== "polish" || activePolishTab !== "enhance" || coachViralApplied) return;
    if (transitionSuggestions.length > 0 || isGeneratingTransitions) return;
    void generateTransitionSuggestions({ silent: true });
  }, [
    activePolishTab,
    step,
    coachViralApplied,
    transitionSuggestions.length,
    isGeneratingTransitions,
    generateTransitionSuggestions,
  ]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const onWheel = (e: globalThis.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
        const zoomAmount = e.deltaY > 0 ? -0.2 : 0.2;
        setZoomLevel((z) => Math.min(5, Math.max(1, z + zoomAmount)));
        return;
      }
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [step]);

  // Centering logic for zoom
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollWidth = container.scrollWidth;
      const playheadX = (currentTime / DURATION) * scrollWidth;
      
      container.scrollTo({
        left: playheadX - container.clientWidth / 2,
        behavior: zoomLevel > 1 ? "auto" : "smooth"
      });
    }
  }, [zoomLevel]);

  const polishSteps = [
    { label: "clip_editor.overlays.steps.transcribing", subtext: "clip_editor.overlays.steps.transcribing_sub" },
    { label: "clip_editor.overlays.steps.generating_captions", subtext: "clip_editor.overlays.steps.generating_captions_sub" },
    { label: "clip_editor.overlays.steps.suggesting_effects", subtext: "clip_editor.overlays.steps.suggesting_effects_sub" }
  ];

  useEffect(() => {
    if (isPlaying && scrollContainerRef.current && zoomLevel > 1) {
      const container = scrollContainerRef.current;
      const scrollWidth = container.scrollWidth;
      const playheadX = (currentTime / DURATION) * scrollWidth;
      
      const scrollLeft = container.scrollLeft;
      const viewWidth = container.clientWidth;
      
      if (playheadX < scrollLeft + viewWidth * 0.2 || playheadX > scrollLeft + viewWidth * 0.8) {
        container.scrollTo({
          left: playheadX - viewWidth / 2,
          behavior: "smooth"
        });
      }
    }
  }, [currentTime, isPlaying, zoomLevel, DURATION]);

  const enhanceClipWindow = polishWindow(finalTrim, trimStart, trimEnd);
  const coachBeat = pickCoachTransition(transitionSuggestions);

  const showTransitionFlash = useCallback(
    (s: { type: string; caption?: string; sfx?: string }, holdMs = 1100) => {
      transitionPreviewActiveRef.current = true;
      setTransitionPreview({
        type: s.type,
        caption: s.caption,
        sfx: s.sfx,
      });
      if (transitionPreviewTimerRef.current) {
        window.clearTimeout(transitionPreviewTimerRef.current);
      }
      transitionPreviewTimerRef.current = window.setTimeout(() => {
        setTransitionPreview(null);
        transitionPreviewActiveRef.current = false;
        transitionPreviewTimerRef.current = null;
      }, holdMs);
    },
    [],
  );

  /** Advance source playhead through Coach keep-ranges; returns true if stitch handled the tick. */
  const tickCoachStitch = useCallback(
    (el: HTMLVideoElement, t: number) => {
      const cuts = coachTextCuts;
      if (!coachStitchPlayRef.current || !cuts?.length) return false;
      let idx = coachStitchIndexRef.current;
      if (idx < 0 || idx >= cuts.length) {
        idx = 0;
        coachStitchIndexRef.current = 0;
      }
      const cur = cuts[idx]!;
      if (t < cur.start - 0.12) {
        el.currentTime = cur.start;
        setCurrentTime(cur.start);
        return true;
      }
      if (t >= cur.end - 0.05) {
        if (idx < cuts.length - 1) {
          const flash = joinToFlash(coachStitchJoins[idx]);
          if (flash) showTransitionFlash(flash, 700);
          const next = cuts[idx + 1]!;
          coachStitchIndexRef.current = idx + 1;
          el.currentTime = next.start;
          setCurrentTime(next.start);
        } else if (isReviewingTrimRef.current) {
          // Review handler advances to polish — do not loop the stitch.
          return true;
        } else {
          el.pause();
          setIsPlaying(false);
          mixBgmRef.current?.pause();
          coachStitchIndexRef.current = 0;
          el.currentTime = cuts[0]!.start;
          setCurrentTime(cuts[0]!.start);
        }
        return true;
      }
      return true;
    },
    [coachTextCuts, coachStitchJoins, joinToFlash, showTransitionFlash],
  );

  const applyTransitionPreview = (s: { time: number; type: string; caption?: string; sfx?: string }) => {
    const abs = Math.min(
      enhanceClipWindow.end - 0.05,
      enhanceClipWindow.start + Math.max(0, s.time),
    );
    setAppliedTransitions((prev) => {
      const next = prev.filter((p) => !(Math.abs(p.time - s.time) < 0.05 && p.type === s.type));
      return [...next, s];
    });
    const el = videoRef.current;
    let flashed = false;
    const runFlash = () => {
      if (flashed) return;
      flashed = true;
      showTransitionFlash(s, 1200);
      if (el?.paused) {
        void el.play().then(() => setIsPlaying(true)).catch(() => {});
        const bgm = mixBgmRef.current;
        const track = TRACKS.find((t) => t.id === selectedTrackId);
        if (bgm && track && selectedTrackId) {
          if (mixBgmTrackIdRef.current !== selectedTrackId) {
            bgm.src = track.url;
            mixBgmTrackIdRef.current = selectedTrackId;
          }
          applyPreviewMix();
          void bgm.play().catch(() => {});
        }
      }
    };
    if (el) {
      const onSeeked = () => {
        el.removeEventListener("seeked", onSeeked);
        runFlash();
      };
      el.addEventListener("seeked", onSeeked);
      el.currentTime = abs;
      setCurrentTime(abs);
      window.setTimeout(() => {
        el.removeEventListener("seeked", onSeeked);
        runFlash();
      }, 200);
    } else {
      seekVideo(abs);
      runFlash();
    }
    toast.success(
      t("clip_editor.polish.enhance.transition_preview", {
        defaultValue: "Previewing {{type}} at {{time}}",
        type: s.type,
        time: formatTime(s.time),
      }),
      {
        description: t("clip_editor.polish.enhance.transition_preview_note", {
          defaultValue:
            "Flash on the 9:16 player now. Cut SFX/transitions burn into the MP4 on Render.",
        }),
      },
    );
  };

  return (
    <div className="space-y-8">
      <audio ref={mixBgmRef} preload="none" hidden />
      {step === "polish" ? (
        <MixGraphTap
          videoRef={videoRef}
          bgmRef={mixBgmRef}
          tap
          videoKey={videoSrc}
          bgmKey={selectedTrackId}
          wake={isPlaying}
          noiseReduced={isNoiseReduced && !enhanceShowOriginal}
        />
      ) : null}
      <SEO 
        title="Advanced AI Video Clip Studio | NexaClip.ai"
        description="AI Coach cuts, sound design, captions, and polish for short-form clips — then publish."
      />
      <StudioPlanBanner
        toolLabel="Clip Studio"
        categoryLabel={categoryLabel}
        niches={niches}
        hasWeekPlan={hasWeekPlan}
        dueToday={dueToday}
        onApplyDue={() => {
          const brief = applyDuePrompt()?.trim();
          if (!brief) {
            toast.message("No day brief available", {
              description: "Create or open a Creator Coach week plan first.",
            });
            return;
          }
          // Optional: user opted in — put today’s plan into AI Coach Creator Context.
          setPrompt(brief.slice(0, 500));
          toast.success("Day brief applied to Creator Context", {
            description: isUserUploadClip
              ? "Edit the context if it doesn’t match this footage, then Analyze again."
              : "Analyze again so Coach uses this brief for cuts and music.",
          });
        }}
        onRequestNicheChange={() => setNicheDialogOpen(true)}
        nicheDialogOpen={nicheDialogOpen}
        onNicheDialogOpenChange={setNicheDialogOpen}
        onConfirmNicheChange={confirmNicheChange}
      />
        {/* Step Indicator — progress for Clip Studio: source → Coach/Edit → Polish/Publish */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-8 mb-8 md:mb-12 overflow-x-auto py-2 no-scrollbar">
          {(() => {
            const sourceDone = Boolean(id);
            const coachDone = step === "polish" || Boolean(finalTrim);
            const polishDone = isAlreadyPublished;
            const studioSteps: Array<{
              id: string;
              label: string;
              hint: string;
              icon: typeof Film;
              active: boolean;
              done: boolean;
              clickable: boolean;
            }> = [
              {
                id: "upload",
                label: t("clip_editor.steps.upload", { defaultValue: "Clip ready" }),
                hint: t("clip_editor.steps.upload_hint", { defaultValue: "Source loaded" }),
                icon: Film,
                active: false,
                done: sourceDone,
                clickable: false,
              },
              {
                id: "trim",
                label: t("clip_editor.steps.trim", { defaultValue: "Coach & Edit" }),
                hint: t("clip_editor.steps.trim_hint", {
                  defaultValue: "Cuts, BGM, sound design",
                }),
                icon: BrainCircuit,
                active: step === "trim",
                done: coachDone,
                clickable: Boolean(id),
              },
              {
                id: "polish",
                label: t("clip_editor.steps.polish", { defaultValue: "Polish & Publish" }),
                hint: t("clip_editor.steps.polish_hint", {
                  defaultValue: "Captions, enhance, share",
                }),
                icon: Sparkles,
                active: step === "polish",
                done: polishDone,
                clickable: Boolean(id),
              },
            ];
            return studioSteps.map((s, i) => {
              const Icon = s.done && !s.active ? CheckCircle2 : s.icon;
              const prevDone = i === 0 ? true : studioSteps[i - 1]!.done;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={!s.clickable}
                  aria-current={s.active ? "step" : undefined}
                  aria-label={`${s.label}${s.done ? " (done)" : s.active ? " (current)" : ""}`}
                  onClick={() => {
                    if (!s.clickable) return;
                    mergeSearchParams({ step: s.id });
                  }}
                  className={cn(
                    "flex items-center gap-2 sm:gap-3 shrink-0",
                    s.clickable ? "cursor-pointer hover:opacity-90" : "cursor-default",
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border-2 transition-all shrink-0",
                      s.active
                        ? "bg-primary border-primary text-primary-foreground shadow-lg"
                        : s.done
                          ? "bg-primary/10 border-primary/40 text-primary"
                          : "bg-background border-border text-muted-foreground",
                    )}
                  >
                    <Icon size={16} className="md:w-[18px] md:h-[18px]" />
                  </div>
                  <div className="min-w-0 text-left">
                    <span
                      className={cn(
                        "block text-[10px] md:text-sm font-bold whitespace-nowrap",
                        s.active ? "text-foreground" : s.done ? "text-foreground/80" : "text-muted-foreground",
                      )}
                    >
                      {s.label}
                    </span>
                    <span className="hidden sm:block text-[9px] md:text-[10px] text-muted-foreground leading-tight whitespace-nowrap">
                      {s.hint}
                    </span>
                  </div>
                  {i < studioSteps.length - 1 ? (
                    <div
                      className={cn(
                        "w-4 sm:w-8 md:w-12 h-0.5 ml-2 sm:ml-3 md:ml-4 shrink-0 transition-colors",
                        prevDone && s.done ? "bg-primary/50" : "bg-border",
                      )}
                    />
                  ) : null}
                </button>
              );
            });
          })()}
        </div>

        <div
          className={cn(
            !composeEnabled && id
              ? "grid gap-4 lg:grid-cols-[minmax(17.5rem,22rem)_minmax(0,1fr)] lg:items-start"
              : undefined,
          )}
        >
          {!composeEnabled && id ? (
            <aside className="order-2 lg:order-1 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-5.5rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-0.5">
              <ClipCoachPanel
                id={id}
                context={prompt}
                onContext={(v) => setPrompt(v.slice(0, 500))}
                duration={DURATION}
                layout="sidebar"
                captionFontId={captionFontId}
                onCaptionFontId={setCaptionFontId}
                captionStyle={
                  memeCaptionStyle === "kinetic_hormozi"
                    ? "kinetic_hormozi"
                    : "clean_subtitle"
                }
                onCaptionStyle={(style) => setMemeCaptionStyle(style)}
                save={async (opts) => {
                  const spec = buildClipEditSpec();
                  if (opts?.creatorContext != null) {
                    const ctx = opts.creatorContext.slice(0, 500);
                    spec.creatorContext = ctx;
                    spec.polishPrompt = ctx.slice(0, 200);
                    setPrompt(ctx);
                  }
                  return contentApi.saveClipEdit(id, spec);
                }}
                onBeats={(m) => {
                  setMarkers(m);
                }}
                onUnderstanding={(r) => {
                  setCoachAdvice({
                    context: r.creativeBrief.creatorContext,
                    advice:
                      r.creativeBrief.recommendations.slice(0, 2).join(" ") ||
                      r.creativeBrief.summary,
                  });
                  setCoachMeta({
                    mode: r.creativeBrief.mode,
                    contentType: r.creativeBrief.contentType,
                  });
                  const pack = resolveCoachImpactPack(
                    r.creativeBrief.mode,
                    r.creativeBrief.contentType,
                  );
                  // Preview impact immediately: mode BGM + junction transitions (not text-only).
                  setSelectedTrackId(pack.bgmTrackId);
                  const enhance = enhanceDefaultsFromBrief(
                    r.creativeBrief.contentType,
                    r.editPlan.captionStyle,
                    [
                      ...r.creativeBrief.recommendations,
                      ...r.editPlan.recommendations,
                    ],
                    r.creativeBrief.mode,
                  );
                  setIsNoiseReduced(enhance.noiseReduced);
                  if (enhance.colorCorrection > 0) {
                    setColorCorrection(enhance.colorCorrection);
                    setIsAutoColorEnabled(true);
                  }
                  setCropMode(enhance.cropMode);
                  setMemeCaptionStyle(enhance.captionStyle);
                  const fromSegs = transitionsFromCoachSegments(
                    r.editPlan.segments,
                    pack,
                    trimStart,
                    trimEnd,
                  );
                  const fromBeats = transitionsFromCoachBeats(
                    r.creativeBrief.moments,
                    trimStart,
                    trimEnd,
                  );
                  const suggestions = fromSegs.length ? fromSegs : fromBeats;
                  if (suggestions.length) {
                    setTransitionSuggestions(suggestions);
                    setAppliedTransitions(suggestions);
                  }
                }}
                onModeImpact={(impact) => {
                  setSelectedTrackId(impact.bgmTrackId);
                  if (impact.captionStyle) setMemeCaptionStyle(impact.captionStyle);
                  setCoachMeta((prev) => ({
                    mode: impact.mode,
                    contentType: prev?.contentType,
                  }));
                  if (impact.segments && impact.segments.length > 1) {
                    const pack = resolveCoachImpactPack(
                      impact.mode,
                      coachMeta?.contentType,
                    );
                    const fx = transitionsFromCoachSegments(
                      impact.segments,
                      pack,
                      trimStart,
                      trimEnd,
                    );
                    if (fx.length) {
                      setTransitionSuggestions(fx);
                      setAppliedTransitions(fx);
                    }
                  }
                  const trackTitle =
                    TRACKS.find((t) => t.id === impact.bgmTrackId)?.title ||
                    `Track ${impact.bgmTrackId}`;
                  toast.message(`${impact.label} · ${trackTitle}`, {
                    description:
                      "New BGM is selected now. Play the clip or Preview BGM to hear it. Re-analyze to rebuild which moments are kept.",
                  });
                }}
                onPreview={(payload: CoachPreviewPayload | null) => {
                  if (!payload) {
                    setCoachTextCuts(null);
                    setCoachStitchJoins([]);
                    setCoachViralApplied(false);
                    coachStitchPlayRef.current = false;
                    coachStitchIndexRef.current = 0;
                    return;
                  }
                  setCoachTextCuts(payload.textCuts ?? null);
                  setCoachStitchJoins(payload.joins ?? []);
                  coachStitchIndexRef.current = 0;
                  const style =
                    payload.captionStyle === "kinetic_hormozi"
                      ? "kinetic_hormozi"
                      : "clean_subtitle";
                  setMemeCaptionStyle(style);
                  if (payload.hookText.trim()) {
                    const hook = payload.hookText.trim().slice(0, 120);
                    setTopText(hook);
                    setHooks([
                      {
                        text: hook,
                        startMs: Math.round((payload.segments[0]?.start ?? 0) * 1000),
                        durationMs: 2800,
                        styleId: style,
                      },
                    ]);
                  } else {
                    setTopText("");
                    setHooks([]);
                  }
                  if (payload.contextText?.trim()) {
                    setBottomText(payload.contextText.trim().slice(0, 120));
                  } else {
                    setBottomText("");
                  }
                }}
                onApplied={(plan) => {
                  const segs = plan.segments;
                  setCoachViralApplied(true);
                  // Force a Coach-aware re-render on Download/Publish (invalidate stale polish).
                  setRenderStatus("idle");
                  setIsDirty(true);
                  // textCuts/joins already set by onPreview from Apply — keep that order.
                  setCoachTextCuts((prev) =>
                    prev?.length === segs.length
                      ? prev
                      : segs.map((s) => ({
                          start: s.start,
                          end: s.end,
                          show: true,
                        })),
                  );
                  if (segs.length > 0) {
                    const first = segs[0]!;
                    // Bounding window for UI only — playback uses coachTextCuts order.
                    const start = Math.min(...segs.map((s) => s.start));
                    const end = Math.max(...segs.map((s) => s.end));
                    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
                      setTrimStart(Math.max(0, start));
                      setTrimEnd(Math.min(DURATION, end));
                    }
                    seekVideo(first.start);
                    coachStitchIndexRef.current = 0;
                  }
                  const style =
                    plan.captionStyle === "kinetic_hormozi"
                      ? "kinetic_hormozi"
                      : "clean_subtitle";
                  setMemeCaptionStyle(style);
                  if (plan.hookOverlay?.trim()) {
                    const hook = plan.hookOverlay.trim().slice(0, 120);
                    setTopText(hook);
                    setHooks([
                      {
                        text: hook,
                        startMs: Math.round((segs[0]?.start ?? 0) * 1000),
                        durationMs: 2800,
                        styleId: style,
                      },
                    ]);
                  } else {
                    setTopText("");
                    setHooks([]);
                  }
                  if (plan.contextOverlay?.trim()) {
                    setBottomText(plan.contextOverlay.trim().slice(0, 120));
                  } else {
                    setBottomText("");
                  }
                  const appliedPack = resolveCoachImpactPack(
                    coachMeta?.mode,
                    coachMeta?.contentType,
                  );
                  setSelectedTrackId(appliedPack.bgmTrackId);
                  // Preview flashes only at real keep-range junctions (not gap filler).
                  const junctionFx = transitionsFromCoachSegments(
                    segs,
                    appliedPack,
                    segs[0]?.start ?? trimStart,
                    segs[segs.length - 1]?.end ?? trimEnd,
                  );
                  if (junctionFx.length) {
                    setTransitionSuggestions(junctionFx);
                    setAppliedTransitions(junctionFx);
                  }
                  const trackTitle =
                    TRACKS.find((t) => t.id === appliedPack.bgmTrackId)?.title || "BGM";
                  toast.message("Viral edit locked", {
                    description:
                      segs.length > 1
                        ? `${segs.length} moments kept in your order + ${appliedPack.label} (${trackTitle}). Play or Preview final edit to hear the stitch; Download burns it.`
                        : `${appliedPack.label}: ${trackTitle} applied. Render burns trim, text, BGM into the MP4.`,
                  });
                }}
                seek={seekVideo}
                previewSegment={previewCoachSegment}
                previewStitch={previewCoachStitch}
                previewBgm={previewCoachBgm}
              />
              <div className="mt-4">
                <SoundDesignPanel
                  contentId={id}
                  durationSec={DURATION}
                  creatorContext={prompt}
                />
              </div>
            </aside>
          ) : null}

          <div className={cn("min-w-0", !composeEnabled && id && "order-1 lg:order-2")}>
        {step === "trim" && (
          <div className="space-y-8">
            {/* Video Player Area */}
            <div
              ref={trimPreviewRef}
              className="aspect-video bg-background rounded-xl overflow-hidden relative group shadow-soft-xl border border-border"
            >
              {videoSrc ? (
                <video
                  ref={videoRef}
                  src={videoSrc}
                  className="w-full h-full object-contain bg-black"
                  playsInline
                  onLoadedMetadata={(e) => {
                    const d = e.currentTarget.duration;
                    if (Number.isFinite(d) && d > 0) {
                      setDuration(d);
                      // Only clamp end to duration — never rewrite in-point after hydrate
                      setTrimEnd((prev) => Math.min(Math.max(prev, 1), d));
                      if (!specHydratedRef.current) {
                        setTrimStart(0);
                        setTrimEnd(Math.min(30, d));
                        specHydratedRef.current = true;
                      }
                      // Seek into trim window for preview
                      if (e.currentTarget.currentTime < trimStart) {
                        e.currentTarget.currentTime = trimStart;
                      }
                    }
                  }}
                  onTimeUpdate={(e) => {
                    const t = e.currentTarget.currentTime;
                    setCurrentTime(t);
                    if (isReviewingTrim) {
                      if (coachViralApplied && coachTextCuts && coachTextCuts.length > 0) {
                        // Stitch review: advance cuts, then start polish after the last moment.
                        const cuts = coachTextCuts;
                        const idx = Math.max(0, coachStitchIndexRef.current);
                        const total = cuts.reduce((n, c) => n + Math.max(0, c.end - c.start), 0);
                        let played = 0;
                        for (let i = 0; i < idx; i++) played += Math.max(0, cuts[i]!.end - cuts[i]!.start);
                        const cur = cuts[idx];
                        if (cur) played += Math.max(0, Math.min(cur.end, t) - cur.start);
                        setReviewProgress(
                          Math.min(100, Math.max(0, (played / Math.max(0.4, total)) * 100)),
                        );
                        coachStitchPlayRef.current = true;
                        const atLast =
                          idx >= cuts.length - 1 && cur && t >= cur.end - 0.08;
                        if (atLast && !reviewAdvanceLockRef.current) {
                          reviewAdvanceLockRef.current = true;
                          e.currentTarget.pause();
                          mixBgmRef.current?.pause();
                          setIsPlaying(false);
                          void startPolishing();
                          return;
                        }
                        tickCoachStitch(e.currentTarget, t);
                        return;
                      }
                      const span = Math.max(0.4, trimEnd - trimStart);
                      setReviewProgress(Math.min(100, Math.max(0, ((t - trimStart) / span) * 100)));
                      if (t >= trimEnd - 0.08 && !reviewAdvanceLockRef.current) {
                        reviewAdvanceLockRef.current = true;
                        e.currentTarget.pause();
                        void startPolishing();
                      }
                      return;
                    }
                    if (tickCoachStitch(e.currentTarget, t)) return;
                    if (t >= trimEnd - 0.05) {
                      e.currentTarget.currentTime = trimStart;
                      setCurrentTime(trimStart);
                    }
                  }}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted/30 text-xs text-muted-foreground">
                  {videoLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading clip…
                    </span>
                  ) : (
                    "No media yet — re-upload if this stays empty"
                  )}
                </div>
              )}

              <TransitionPreviewOverlay
                type={transitionPreview?.type ?? null}
                caption={transitionPreview?.caption}
                sfx={transitionPreview?.sfx}
              />

              {/* AI Coach / caption live preview — drag to reposition (same as Polish) */}
              {(topText || hooks[0]?.text) && coachOverlayOnCut(currentTime, coachTextCuts) ? (
                <DraggableCaptionOverlay
                  text={topText || hooks[0]?.text || ""}
                  xPct={topOverlay.x}
                  yPct={topOverlay.y}
                  onChange={(x, y) => setTopOverlay({ x, y })}
                  fontFamily={clipCaptionFontCss(captionFontId)}
                  stageRef={trimPreviewRef}
                  label="Hook text on clip"
                  color={captionTextColor}
                />
              ) : null}
              {bottomText && coachOverlayOnCut(currentTime, coachTextCuts) ? (
                <DraggableCaptionOverlay
                  text={bottomText}
                  xPct={bottomOverlay.x}
                  yPct={bottomOverlay.y}
                  onChange={(x, y) => setBottomOverlay({ x, y })}
                  fontFamily={clipCaptionFontCss(captionFontId)}
                  stageRef={trimPreviewRef}
                  label="Context text on clip"
                  color={captionTextColor}
                />
              ) : null}
              
              {/* Auto-play indicator */}
              <div className="absolute top-4 left-4 md:top-6 md:left-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-popover/80 backdrop-blur-xl rounded-full border border-border">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                  <span className="text-[9px] md:text-[10px] font-bold text-foreground">{t('clip_editor.player.live_preview')}</span>
                </div>
              </div>

              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  initial={false}
                  animate={{ scale: isPlaying ? 0.9 : 1, opacity: isPlaying ? 0 : 1 }}
                  className="pointer-events-none"
                >
                  <Button 
                    size="icon-2xl"
                    variant="secondary"
                    className="md:size-20 bg-popover/80 backdrop-blur-xl rounded-full text-foreground border border-border shadow-soft-xl"
                    onClick={() => {
                      void togglePlayback();
                    }}
                  >
                    <Play size={28} fill="currentColor" className="ml-1" />
                  </Button>
                </motion.div>
              </div>
              
              {/* Tap to Play — under caption overlays so text stays draggable */}
              <div 
                className="absolute inset-0 z-10 cursor-pointer"
                onClick={() => void togglePlayback()}
              />
              
              {/* Controls Overlay */}
              <div className="absolute bottom-0 left-0 right-0 z-30 p-4 md:p-6 bg-gradient-to-t from-black/95 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <div className="space-y-4 pointer-events-auto">
                  {/* Miniature Progress Bar */}
                  <div className="h-1 w-full bg-foreground/20 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-primary"
                      style={{ width: `${(currentTime / DURATION) * 100}%` }}
                      layoutId="playerProgress"
                    />
                  </div>

                  <div className="flex items-center justify-between text-foreground flex-wrap gap-3">
                    <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                      {/* Play/Pause */}
                      <Button 
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => void togglePlayback()}
                        className="md:size-9 hover:bg-muted rounded-full text-foreground"
                        aria-label={isPlaying ? t('clip_editor.player.pause') : t('clip_editor.player.play')}
                      >
                        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                      </Button>

                      {/* Volume Control */}
                      <div className="flex items-center gap-2 md:gap-3">
                        <Button 
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setIsClipMuted(!isClipMuted)}
                          className="md:size-9 hover:bg-muted rounded-full text-foreground"
                          aria-label={isClipMuted ? t('clip_editor.player.unmute') : t('clip_editor.player.mute')}
                          aria-pressed={isClipMuted}
                        >
                          {isClipMuted || clipVolume === 0 ? <VolumeX size={18} className="text-destructive" /> : <Volume2 size={18} />}
                        </Button>
                        <div className="hidden sm:flex w-24 items-center">
                          <Slider 
                            min={0}
                            max={1}
                            step={0.01}
                            value={[isClipMuted ? 0 : clipVolume]}
                            onValueChange={(v) => {
                              const val = Array.isArray(v) ? v[0] : v;
                              setClipVolume(val);
                              if (isClipMuted) setIsClipMuted(false);
                            }}
                            className="w-full"
                            aria-label={t('clip_editor.player.adjust_volume')}
                          />
                        </div>
                      </div>

                      {/* Time Display */}
                      <div className="flex items-center gap-2 px-2 md:px-3 py-1 bg-muted/50 backdrop-blur-md rounded-lg border border-border" aria-label={t('clip_editor.player.playback_time')}>
                        <span className="text-[10px] md:text-xs font-bold font-mono tabular-nums tracking-tight" aria-current="time">
                          {formatTime(currentTime)}
                        </span>
                        <span className="text-[9px] md:text-[10px] font-bold text-foreground/40" aria-hidden="true">/</span>
                        <span className="text-[10px] md:text-xs font-bold font-mono tabular-nums tracking-tight text-foreground/60">
                          {formatTime(DURATION)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setTrimStart(0);
                          setTrimEnd(DURATION);
                          setCurrentTime(0);
                        }}
                        className="flex items-center gap-1.5 hover:bg-muted rounded-lg text-[9px] md:text-[10px] font-bold tracking-wider text-foreground"
                        aria-label={t('clip_editor.player.reset_trim')}
                      >
                        <RotateCcw size={12} className="md:w-3.5 md:h-3.5" />
                        <span className="hidden xs:inline">{t('clip_editor.player.reset_trim')}</span>
                      </Button>
                      <Button variant="ghost" size="icon-sm" className="md:size-9 hover:bg-muted rounded-full text-foreground" aria-label={t('clip_editor.player.fullscreen')}>
                        <Maximize size={18} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Area */}
            <div className="ui-card p-4 md:p-8 space-y-6 relative overflow-hidden">
              <AnimatePresence>
                {(isScanning || isSuggestingTrim) && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6"
                  >
                    <div className="w-full max-w-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-primary">
                          <Wand2 size={18} className="animate-pulse" />
                          <span className="text-xs md:text-sm font-bold">{isSuggestingTrim ? t('clip_editor.trim.calculating') : t('clip_editor.trim.scanning')}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-foreground">{scanningProgress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${scanningProgress}%` }}
                          className="h-full bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]"
                        />
                      </div>
                      <p className="text-[10px] text-center text-muted-foreground font-medium tracking-wider leading-relaxed">
                        {isSuggestingTrim ? t('clip_editor.trim.action_moments') : t('clip_editor.trim.analyzing_cues')}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock size={14} />
                    <span className="text-[10px] font-bold">{t('clip_editor.trim.timeline_trimmer')}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline"
                          size="default"
                          onClick={scanHighlights}
                          disabled={isScanning || isSuggestingTrim}
                          className="gap-2 bg-primary/5 text-primary border-primary/20 hover:bg-primary/10 transition-all text-[10px] font-bold disabled:opacity-50"
                        >
                          <Search size={12} />
                          {t('clip_editor.trim.ai_scan')}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[240px]">
                        {categoryLabel
                          ? t("clip_editor.trim.ai_scan_tooltip_niche", { category: categoryLabel })
                          : t("clip_editor.trim.ai_scan_tooltip")}
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline"
                          size="default"
                          onClick={suggestSmartTrim}
                          disabled={isScanning || isSuggestingTrim}
                          className="gap-2 bg-brand-secondary/10 text-brand-secondary border-brand-secondary/20 hover:bg-brand-secondary/20 transition-all text-[10px] font-bold disabled:opacity-50"
                        >
                          <Scissors size={12} />
                          {t('clip_editor.trim.ai_smart_trim')}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {t('clip_editor.trim.ai_smart_trim_tooltip')}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  
                  {/* Precision Trim Slider */}
                  <div className="flex-1 min-w-[200px] flex items-center gap-3 px-4 py-2 bg-muted/50 rounded-lg border border-border">
                    <div className="space-y-1 flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-bold text-muted-foreground">{t('clip_editor.trim.precision_trim')}</span>
                        <Badge variant="outline" className="text-[8px] h-4 py-0 font-bold tracking-wider tabular-nums">
                          {formatSpan(trimStart, trimEnd)}
                        </Badge>
                      </div>
                      <Slider 
                        min={0}
                        max={DURATION}
                        step={0.1}
                        value={[trimStart, trimEnd]}
                        onValueChange={(val) => {
                          if (Array.isArray(val) && val.length === 2) {
                            if (val[1] - val[0] >= 1) { // Min 1s duration
                              setTrimStart(val[0]);
                              setTrimEnd(val[1]);
                              // Sync playhead if out of bounds
                              if (currentTime < val[0]) setCurrentTime(val[0]);
                              if (currentTime > val[1]) setCurrentTime(val[1]);
                            }
                          }
                        }}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-md border border-border self-start md:self-auto">
                  <Button 
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setZoomLevel(Math.max(1, zoomLevel - 0.5))}
                    className="md:size-8 text-muted-foreground hover:text-primary transition-all"
                  >
                    <ZoomOut size={12} />
                  </Button>
                  <div className="w-16 md:w-24 px-1 md:px-2">
                    <Slider 
                      value={[zoomLevel]} 
                      min={1} 
                      max={5} 
                      step={0.1} 
                      onValueChange={(v) => {
                        const val = Array.isArray(v) ? v[0] : v;
                        setZoomLevel(val);
                      }} 
                    />
                  </div>
                  <Button 
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setZoomLevel(Math.min(5, zoomLevel + 0.5))}
                    className="md:size-8 text-muted-foreground hover:text-primary transition-all"
                  >
                    <ZoomIn size={12} />
                  </Button>
                  <Separator orientation="vertical" className="h-4 mx-1" />
                  <span className="text-[9px] md:text-[10px] font-mono font-bold text-muted-foreground w-6 md:w-8 text-center text-primary">
                    {zoomLevel.toFixed(1)}x
                  </span>
                </div>

                <div className="text-[10px] font-mono text-muted-foreground hidden md:block">
                  {DURATION.toFixed(1)}s {t('clip_editor.player.total')}
                </div>
              </div>

              <div className="relative">
                {/* Time Markers */}
                <div className="flex justify-between text-[9px] font-mono text-muted-foreground mb-2 px-1">
                  {[0, 0.25, 0.5, 0.75, 1].map(p => (
                    <span key={p}>{formatTime(DURATION * p)}</span>
                  ))}
                </div>

                <div 
                  ref={scrollContainerRef}
                  className="relative overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-lg border border-border no-scrollbar touch-pan-x"
                >
                  <div 
                    ref={timelineRef}
                    style={{ width: `${zoomLevel * 100}%` }}
                    className="relative h-16 md:h-[4.5rem] bg-muted group/timeline cursor-pointer min-w-full transition-[width] duration-300 ease-out"
                    onClick={(e) => {
                      if (isDragging) return;
                      const rect = timelineRef.current?.getBoundingClientRect();
                      if (rect) {
                        const newTime = ((e.clientX - rect.left) / rect.width) * DURATION;
                        seekVideo(Math.max(0, Math.min(DURATION, newTime)));
                      }
                    }}
                  >
                    {/* Waveform Visualization */}
                    <div className="absolute inset-0 bottom-2 flex items-center justify-between gap-[2px] px-4 pointer-events-none">
                      {waveformData.map((height, i) => {
                        const time = (i / waveformData.length) * DURATION;
                        const isWithinTrim = time >= trimStart && time <= trimEnd;
                        const isPlayed = currentTime > time;
                        
                        return (
                          <div 
                            key={i} 
                            className={cn(
                              "w-1 rounded-full transition-all duration-500",
                              isWithinTrim 
                                ? (isPlayed ? "bg-primary/60" : "bg-primary shadow-[0_0_10px_rgba(var(--color-primary),0.3)]") 
                                : "bg-muted-foreground/20"
                            )}
                            style={{ 
                              height: `${Math.max(18, height * 0.7)}%`,
                              opacity: isWithinTrim ? 1 : 0.4
                            }}
                          />
                        );
                      })}
                    </div>

                    {selectedTrackId ? (
                      <div
                        className="absolute bottom-0 h-1.5 rounded-sm bg-brand-secondary/70 z-20 pointer-events-none"
                        style={{
                          left: `${(trimStart / DURATION) * 100}%`,
                          width: `${((trimEnd - trimStart) / DURATION) * 100}%`,
                        }}
                        title={TRACKS.find((t) => t.id === selectedTrackId)?.title || "BGM"}
                      />
                    ) : null}

                    {/* AI Markers */}
                    {markers.map((marker, i) => (
                      <button
                        type="button"
                        key={`${marker.label}-${i}`}
                        className="absolute inset-y-0 z-10 w-10 -translate-x-1/2 group/marker"
                        style={{ left: `${(marker.time / Math.max(0.5, DURATION)) * 100}%` }}
                        title={`${t(`clip_editor.trim.markers.${marker.label}`, { defaultValue: marker.label.replace(/_/g, " ") })} · ${formatTime(marker.time)} — ${t(`clip_editor.trim.marker_roles.${marker.label}`, { defaultValue: beatPurpose(marker.label) })}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          seekVideo(marker.time);
                        }}
                      >
                        <span className="absolute inset-y-1 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--color-primary),0.6)]" />
                        <span className="absolute top-1 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-0.5">
                          <Zap size={12} className="text-primary fill-primary drop-shadow" />
                          <span className="max-w-[4.75rem] truncate rounded-md border border-primary/50 bg-background px-1.5 py-0.5 text-[10px] font-bold capitalize leading-none text-foreground shadow-md">
                            {t(`clip_editor.trim.markers.${marker.label}`, {
                              defaultValue: marker.label.replace(/_/g, " "),
                            })}
                          </span>
                        </span>
                      </button>
                    ))}

                    {/* AI Suggested Trim Range */}
                    {suggestedTrim && (
                      <motion.div 
                        initial={{ opacity: 0, scaleY: 0.8 }}
                        animate={{ opacity: 1, scaleY: 1 }}
                        className="absolute inset-y-0 bg-brand-secondary/5 border-2 border-brand-secondary/30 border-dashed z-20"
                        style={{ 
                          left: `${(suggestedTrim.start / DURATION) * 100}%`, 
                          right: `${100 - (suggestedTrim.end / DURATION) * 100}%` 
                        }}
                      >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
                          <div className="bg-brand-secondary text-brand-secondary-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-t">
                            {t('clip_editor.trim.ai_suggestion')}
                          </div>
                          <div className="bg-brand-secondary/20 backdrop-blur-sm border border-brand-secondary/30 px-2 py-0.5 rounded-b flex items-center gap-1">
                            <Sparkles size={8} className="text-brand-secondary" />
                            <span className="text-[9px] font-bold text-brand-secondary">
                              {formatTime(suggestedTrim.end - suggestedTrim.start)}
                            </span>
                          </div>
                        </div>
                        
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTrimStart(suggestedTrim.start);
                            setTrimEnd(suggestedTrim.end);
                            setSuggestedTrim(null);
                          }}
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-secondary hover:bg-brand-secondary-strong text-brand-secondary-foreground text-[9px] font-bold shadow-lg"
                        >
                          {t('clip_editor.trim.apply_ai_trim')}
                        </Button>
                      </motion.div>
                    )}

                    {/* Trim Range Overlay */}
                    <motion.div 
                      layout
                      transition={{ type: "spring", bounce: 0, duration: 0.2 }}
                      className="absolute inset-y-0 bg-primary/10 border-x-2 border-primary/50"
                      style={{ 
                        left: `${(trimStart / DURATION) * 100}%`, 
                        right: `${100 - (trimEnd / DURATION) * 100}%` 
                      }}
                    >
                      {/* Floating Duration Label */}
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm px-2 py-0.5 rounded-md shadow-sm border border-border flex items-center gap-1.5 pointer-events-none">
                        <Clock size={10} className="text-primary" />
                        <span className="text-[9px] font-bold text-foreground">
                          {formatSpan(trimStart, trimEnd)}
                        </span>
                      </div>
                    </motion.div>

                    {/* Start Handle */}
                    <motion.div 
                      layout
                      transition={{ type: "spring", bounce: 0, duration: 0.2 }}
                      className="absolute inset-y-0 z-30 flex items-center"
                      style={{ left: `${(trimStart / DURATION) * 100}%` }}
                    >
                      <div 
                        onMouseDown={(e) => { e.stopPropagation(); setIsDragging("start"); }}
                        onTouchStart={(e) => { e.stopPropagation(); setIsDragging("start"); }}
                        className={cn(
                          "w-10 h-16 md:w-6 md:h-14 bg-primary rounded-md -translate-x-1/2 cursor-ew-resize flex flex-col items-center justify-center shadow-xl transition-all touch-none border-2 border-primary-foreground/20",
                          isDragging === "start" ? "scale-110 ring-4 ring-primary/20 brightness-110" : "hover:scale-105"
                        )}
                      >
                        <div className="w-1 h-4 bg-primary-foreground/40 rounded-full mb-1" />
                        <GripVertical size={10} className="text-primary-foreground/80" />
                        <div className="w-1 h-4 bg-primary-foreground/40 rounded-full mt-1" />
                      </div>
                      
                      <AnimatePresence>
                        {isDragging === "start" && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                            className="absolute bottom-full mb-4 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-black px-2 py-1.5 rounded-md shadow-[0_10px_30px_rgba(var(--primary),0.4)] border border-primary-strong whitespace-nowrap z-50 flex items-center gap-1.5"
                          >
                            <Clock size={10} />
                            {formatTime(trimStart)}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    {/* End Handle */}
                    <motion.div 
                      layout
                      transition={{ type: "spring", bounce: 0, duration: 0.2 }}
                      className="absolute inset-y-0 z-30 flex items-center"
                      style={{ left: `${(trimEnd / DURATION) * 100}%` }}
                    >
                      <div 
                        onMouseDown={(e) => { e.stopPropagation(); setIsDragging("end"); }}
                        onTouchStart={(e) => { e.stopPropagation(); setIsDragging("end"); }}
                        className={cn(
                          "w-10 h-16 md:w-6 md:h-14 bg-primary rounded-md -translate-x-1/2 cursor-ew-resize flex flex-col items-center justify-center shadow-xl transition-all touch-none border-2 border-primary-foreground/20",
                          isDragging === "end" ? "scale-110 ring-4 ring-primary/20 brightness-110" : "hover:scale-105"
                        )}
                      >
                        <div className="w-1 h-4 bg-primary-foreground/40 rounded-full mb-1" />
                        <GripVertical size={10} className="text-primary-foreground/80" />
                        <div className="w-1 h-4 bg-primary-foreground/40 rounded-full mt-1" />
                      </div>

                      <AnimatePresence>
                        {isDragging === "end" && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                            className="absolute bottom-full mb-4 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-black px-2 py-1.5 rounded-md shadow-[0_10px_30px_rgba(var(--primary),0.4)] border border-primary-strong whitespace-nowrap z-50 flex items-center gap-1.5"
                          >
                            <Clock size={10} />
                            {formatTime(trimEnd)}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    {/* Playhead */}
                    <motion.div 
                      layout
                      transition={{ type: "spring", bounce: 0, duration: 0.1 }}
                      className="absolute inset-y-0 z-40 w-0.5 bg-primary-foreground shadow-[0_0_10px_rgba(var(--primary-rgb),0.8)] pointer-events-none"
                      style={{ left: `${(currentTime / DURATION) * 100}%` }}
                    >
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary-foreground rounded-full shadow-lg" />
                      {/* Draggable playhead handle */}
                    <div 
                        onMouseDown={(e) => { e.stopPropagation(); setIsDragging("playhead"); }}
                        onTouchStart={(e) => { e.stopPropagation(); setIsDragging("playhead"); }}
                        className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-8 md:w-6 md:h-6 bg-foreground/20 hover:bg-foreground/40 rounded-full cursor-grab active:cursor-grabbing pointer-events-auto flex items-center justify-center transition-colors touch-none"
                      >
                        <div className="w-2.5 h-2.5 bg-primary-foreground rounded-full shadow-lg" />
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>

              {markers.length > 0 ? (
                <div className="mt-3 space-y-2 rounded-xl border border-primary/15 bg-primary/5 p-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-primary">
                        {t("clip_editor.trim.scan_results", {
                          defaultValue: "Highlight beats (optional)",
                        })}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        {t("clip_editor.trim.scan_help", {
                          defaultValue:
                            "Optional timeline pins only — not the Coach cut list. Click a beat to jump there; drag handles snap to them. Coach Analyze still builds the multi-cut plan + BGM.",
                        })}
                      </p>
                  </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0 h-8 text-[10px] font-bold"
                      onClick={() => {
                        const window = trimWindowFromBeats(markers, DURATION);
                        if (!window) return;
                        setTrimStart(window.start);
                        setTrimEnd(window.end);
                        seekVideo(window.start);
                        toast.success(
                          t("clip_editor.trim.trim_to_beats_done", {
                            defaultValue: "Keep range set from opening beat to close",
                          }),
                        );
                      }}
                    >
                      {t("clip_editor.trim.trim_to_beats", {
                        defaultValue: "Set keep range from first → last beat",
                      })}
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {markers.map((marker, i) => (
                      <button
                        type="button"
                        key={`${marker.label}-chip-${i}`}
                        onClick={() => seekVideo(marker.time)}
                        title={t(`clip_editor.trim.marker_roles.${marker.label}`, {
                          defaultValue: beatPurpose(marker.label),
                        })}
                        className="inline-flex flex-col items-start gap-0.5 rounded-lg border border-primary/20 bg-background px-2 py-1.5 text-left hover:bg-primary/10"
                      >
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-primary">
                          <Zap size={10} className="fill-primary" />
                          {t(`clip_editor.trim.markers.${marker.label}`, {
                            defaultValue: marker.label.replace(/_/g, " "),
                          })}
                          <span className="font-mono text-muted-foreground">{formatTime(marker.time)}</span>
                        </span>
                        <span className="text-[9px] text-muted-foreground font-medium leading-snug max-w-[160px]">
                          {t(`clip_editor.trim.marker_roles.${marker.label}`, {
                            defaultValue: beatPurpose(marker.label),
                          })}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-[10px] text-muted-foreground">
                  {t("clip_editor.trim.scan_empty", {
                    defaultValue:
                      "Optional. AI Scan only marks moments on the timeline for trimming. Prefer AI Coach Analyze when you want cuts, BGM, and transitions.",
                  })}
                </p>
              )}

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-4 md:pt-3">
                <div className="flex flex-col gap-2 bg-muted/20 p-3 rounded-xl md:bg-transparent md:p-0">
                  <p className="text-[10px] text-muted-foreground">{t('clip_editor.trim.trim_help')}</p>
                  <div className="flex items-center justify-around md:justify-start gap-4 md:gap-6">
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">{t('clip_editor.trim.keep_from')}</p>
                      <p className="text-sm md:text-base font-display font-bold text-foreground tabular-nums">{formatTime(trimStart)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">{t('clip_editor.trim.keep_to')}</p>
                      <p className="text-sm md:text-base font-display font-bold text-foreground tabular-nums">{formatTime(trimEnd)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">{t('clip_editor.trim.clip_length')}</p>
                      <p className="text-sm md:text-base font-display font-bold text-foreground tabular-nums">
                        {formatSpan(trimStart, trimEnd)}
                      </p>
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={handleApplyTrim}
                  size="default"
                  className="rounded-full shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 font-bold w-full md:w-auto h-11 px-6"
                >
                  {t('clip_editor.trim.apply_continue')}
                  <ChevronRight size={18} />
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "polish" && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between mb-4 px-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => mergeSearchParams({ step: "trim" })}
                className="flex items-center gap-2 -ml-2 text-muted-foreground hover:text-foreground transition-all group active:scale-95"
              >
                <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center group-hover:border-primary/50 transition-colors">
                  <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                </div>
                <span className="text-[11px] font-bold">{t('clip_editor.polish.editor')}</span>
              </Button>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider px-3 py-1">
                  {t('clip_editor.polish.polishing')}
                </Badge>
                {isAlreadyPublished ? (
                  <Badge variant="outline" className="bg-muted border-border text-muted-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-1">
                    Published
                  </Badge>
                ) : null}
              </div>
            </div>

            {isAlreadyPublished ? (
              <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
                This clip is already published. Publish and social targets are locked. You can still tweak polish and use{" "}
                <span className="font-semibold text-foreground">Download</span> to export a new MP4.
              </div>
            ) : null}

            {composeEnabled && composeSources.length >= 2 && (
              <ComposeTimelinePanel
                contentId={id!}
                sources={composeSources}
                transitions={composeTransitions}
                onUpdated={({ sources, transitions, title: nextTitle }) => {
                  setComposeSources(sources);
                  setComposeTransitions(transitions);
                  if (nextTitle) setTitle(nextTitle);
                }}
              />
            )}

            {composeEnabled && id ? (
              <div className="mt-2">
                <SoundDesignPanel
                  contentId={id}
                  durationSec={DURATION}
                  creatorContext={prompt}
                  storyEngine
                />
              </div>
            ) : null}

            <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 pb-32 md:pb-0">
              {/* Preview Column */}
              <div className="lg:col-span-2 space-y-4 md:space-y-6">
                <div className="w-full max-w-[320px] sm:max-w-[340px] md:max-w-[420px] mx-auto space-y-3">
                <div
                  ref={polishPreviewRef}
                  className="aspect-[9/16] w-full bg-background rounded-xl overflow-hidden relative shadow-soft-2xl border border-border group"
                >
                {(showingFinalRender ? renderPreviewSrc : videoSrc) ? (
                  <div
                    className="w-full h-full"
                    style={showingFinalRender ? undefined : previewFilterStyle}
                  >
                  <video
                    ref={videoRef}
                    key={showingFinalRender ? `final-${renderPreviewSrc}` : `live-${videoSrc}`}
                    src={(showingFinalRender ? renderPreviewSrc : videoSrc) || undefined}
                    className="w-full h-full object-cover transform-gpu"
                    muted={false}
                    playsInline
                    controls={false}
                    onLoadedMetadata={(e) => {
                      if (showingFinalRender) {
                        e.currentTarget.currentTime = 0;
                        setCurrentTime(0);
                        setRenderPreviewDuration(
                          Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0,
                        );
                        mixBgmRef.current?.pause();
                        return;
                      }
                      const start = finalTrim?.start ?? trimStart;
                      e.currentTarget.currentTime = start;
                      setCurrentTime(start);
                      applyPreviewMix();
                    }}
                    onTimeUpdate={(e) => {
                      const tNow = e.currentTarget.currentTime;
                      setCurrentTime(tNow);
                      if (showingFinalRender) {
                        const dur = e.currentTarget.duration || renderPreviewDuration;
                        if (dur > 0 && tNow >= dur - 0.05) {
                          e.currentTarget.currentTime = 0;
                          setCurrentTime(0);
                        }
                        return;
                      }
                      const start = finalTrim?.start ?? trimStart;
                      const end = finalTrim?.end ?? trimEnd;
                      if (tickCoachStitch(e.currentTarget, tNow)) return;
                      // Fire applied Enhance transitions when the playhead crosses them.
                      if (!transitionPreviewActiveRef.current && appliedTransitions.length) {
                        const rel = tNow - start;
                        for (const tr of appliedTransitions) {
                          const key = `${tr.type}@${tr.time.toFixed(2)}`;
                          if (transitionFiredKeysRef.current.has(key)) continue;
                          if (Math.abs(rel - tr.time) <= 0.18) {
                            transitionFiredKeysRef.current.add(key);
                            showTransitionFlash(tr, 900);
                            break;
                          }
                        }
                      }
                      if (tNow >= end - 0.05) {
                        e.currentTarget.currentTime = start;
                        setCurrentTime(start);
                        transitionFiredKeysRef.current.clear();
                        if (mixBgmRef.current) mixBgmRef.current.currentTime = 0;
                      }
                    }}
                    onPlay={() => {
                      setIsPlaying(true);
                      setPreviewingTrackId(null);
                      transitionFiredKeysRef.current.clear();
                      if (showingFinalRender) mixBgmRef.current?.pause();
                    }}
                    onPause={() => {
                      setIsPlaying(false);
                      mixBgmRef.current?.pause();
                    }}
                  />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                    {videoLoading || isRendering ? "Loading preview…" : "No clip media yet"}
                  </div>
                )}

                {!showingFinalRender ? (
                  <TransitionPreviewOverlay
                    type={transitionPreview?.type ?? null}
                    caption={transitionPreview?.caption}
                    sfx={transitionPreview?.sfx}
                  />
                ) : null}

                <div
                  className="absolute inset-0 z-10 cursor-pointer"
                  onClick={() => void togglePlayback()}
                  aria-hidden
                />

                <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                  <motion.div
                    initial={false}
                    animate={{ scale: isPlaying ? 0.9 : 1, opacity: isPlaying ? 0 : 1 }}
                  >
                    <div className="size-16 md:size-20 bg-popover/80 backdrop-blur-xl rounded-full text-foreground border border-border shadow-soft-xl flex items-center justify-center">
                      <Play size={28} fill="currentColor" className="ml-1" />
                    </div>
                  </motion.div>
                </div>

                {/* Duration overlay */}
                <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-black/60 text-[10px] font-mono font-bold text-white pointer-events-none">
                  {showingFinalRender
                    ? `${formatTime(Math.max(0, currentTime))} / ${formatTime(renderPreviewDuration || 0)}`
                    : `${formatTime(Math.max(0, currentTime - (finalTrim?.start ?? trimStart)))} / ${formatTime((finalTrim?.end ?? trimEnd) - (finalTrim?.start ?? trimStart))}`}
                </div>

                {!showingFinalRender && (enhanceShowOriginal || isNoiseReduced || colorCorrection > 0) ? (
                  <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-none flex justify-center">
                    <div className="px-2.5 py-1 rounded-md bg-black/70 text-[10px] font-bold text-white">
                      {enhanceShowOriginal
                        ? t("clip_editor.polish.enhance.comparing", { defaultValue: "Original" })
                        : [
                            colorCorrection > 0
                              ? t("clip_editor.polish.enhance.color_pct", {
                                  defaultValue: "Color {{pct}}%",
                                  pct: colorCorrection,
                                })
                              : null,
                            isNoiseReduced
                              ? t("clip_editor.polish.enhance.noise_on", { defaultValue: "Noise reduced" })
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                    </div>
                  </div>
                ) : null}

                {/* Preview Badge */}
                <div className="absolute top-3 right-3 z-20 pointer-events-none">
                  <div
                    className={cn(
                      "px-2.5 py-1 rounded-md border text-[10px] font-bold shadow-soft-xl flex items-center gap-1.5",
                      showingFinalRender
                        ? "bg-emerald-600/90 border-emerald-400/40 text-white"
                        : "bg-popover/80 backdrop-blur-xl border-border text-foreground",
                    )}
                  >
                    {showingFinalRender ? (
                      <>
                        <CheckCircle2 size={12} />
                        Final render
                      </>
                    ) : (
                      <>
                        <Sparkles size={12} className="text-primary" />
                        Live preview
                      </>
                    )}
                  </div>
                </div>
                
                {/* Caption overlays only for live preview — final render already has them burned in */}
                {!showingFinalRender && (topText || hooks[0]?.text) && coachOverlayOnCut(currentTime, coachTextCuts) ? (
                  <DraggableCaptionOverlay
                    text={topText || hooks[0]?.text || ""}
                    xPct={topOverlay.x}
                    yPct={topOverlay.y}
                    onChange={(x, y) => setTopOverlay({ x, y })}
                    fontFamily={clipCaptionFontCss(captionFontId)}
                    stageRef={polishPreviewRef}
                    label={t("clip_editor.polish.meme.top_text")}
                    color={captionTextColor}
                  />
                ) : null}
                {!showingFinalRender && bottomText && coachOverlayOnCut(currentTime, coachTextCuts) ? (
                  <DraggableCaptionOverlay
                    text={bottomText}
                    xPct={bottomOverlay.x}
                    yPct={bottomOverlay.y}
                    onChange={(x, y) => setBottomOverlay({ x, y })}
                    fontFamily={clipCaptionFontCss(captionFontId)}
                    stageRef={polishPreviewRef}
                    label={t("clip_editor.polish.meme.bottom_text")}
                    color={captionTextColor}
                  />
                ) : null}
                  </div>
                <Button
                  type="button"
                  size="lg"
                  className="w-full rounded-full font-bold h-11"
                  onClick={() => void togglePlayback()}
                  disabled={!(showingFinalRender ? renderPreviewSrc : videoSrc)}
                >
                  {isPlaying ? <Pause size={18} fill="currentColor" className="mr-2" /> : <Play size={18} fill="currentColor" className="mr-2 ml-0.5" />}
                  {isPlaying
                    ? t("clip_editor.player.pause")
                    : showingFinalRender
                      ? "Play final render"
                      : t("clip_editor.polish.audio.play_mix", { defaultValue: "Play clip + music mix" })}
                </Button>
              </div>
            </div>

            {/* Controls Column */}
            <div className="space-y-6">
              <div className="ui-card p-0 overflow-hidden lg:border-border">
                <Tabs value={activePolishTab} onValueChange={setActivePolishTab} className="w-full">
                  <TabsList className="w-full grid grid-cols-4 bg-muted border-none rounded-none p-1 shrink-0 h-14">
                    <TabsTrigger value="details" className="text-[10px] md:text-[11px] font-bold py-0 h-full data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all">
                      <div className="flex flex-col items-center gap-1">
                        <Settings size={14} className="md:hidden" />
                        {t('clip_editor.polish.tabs.details')}
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="meme" className="text-[10px] md:text-[11px] font-bold py-0 h-full data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all">
                      <div className="flex flex-col items-center gap-1">
                        <Type size={14} className="md:hidden" />
                        {t('clip_editor.polish.tabs.meme')}
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="audio" className="text-[10px] md:text-[11px] font-bold py-0 h-full data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all">
                      <div className="flex flex-col items-center gap-1">
                        <Music size={14} className="md:hidden" />
                        {t('clip_editor.polish.tabs.audio')}
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="enhance" className="text-[10px] md:text-[11px] font-bold py-0 h-full data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all">
                      <div className="flex flex-col items-center gap-1">
                        <Sparkles size={14} className="md:hidden" />
                        {t('clip_editor.polish.tabs.enhance')}
                      </div>
                    </TabsTrigger>
                  </TabsList>

                  <div className="p-4 sm:p-6">
                    <TabsContent value="details" className="mt-0 space-y-6">
                      <div className="flex items-center justify-between mb-1 md:mb-2">
                        <h3 className="text-base md:text-lg font-display font-bold text-foreground flex items-center gap-2">
                          <Settings size={18} className="text-primary" />
                          {t('clip_editor.polish.details.title')}
                        </h3>
                        {finalTrim && (
                          <div className="ui-badge bg-primary/5 text-primary border-primary/20 text-[10px] md:text-xs">
                            {formatSpan(finalTrim.start, finalTrim.end)}
                          </div>
                        )}
                      </div>

                      {/* Trim Summary */}
                      <div className="p-3 md:p-4 bg-muted/50 rounded-xl border border-border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="ui-icon-chip-primary w-8 h-8 md:w-10 md:h-10">
                            <Scissors size={14} className="md:size-18" />
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-muted-foreground leading-none mb-1">{t('clip_editor.polish.details.duration')}</p>
                            <p className="text-xs md:text-sm font-bold font-mono">{formatTime(finalTrim?.start || 0)} - {formatTime(finalTrim?.end || DURATION)}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => mergeSearchParams({ step: "trim" })}
                          className="ui-link-primary text-[10px] font-black"
                        >
                          {t('clip_editor.polish.details.change')}
                        </button>
                      </div>

                      {/* Title & Description */}
                      <div className="space-y-4">
                        {/* Creation Prompt (Optional Context for AI) */}
                        {composeEnabled && <div className="space-y-1.5">
                          <div className="flex justify-between items-center px-1">
                            <label className="text-[10px] font-bold text-muted-foreground">{t('clip_editor.polish.details.context_label')}</label>
                            <span className={cn(
                              "text-[9px] font-mono transition-colors",
                              prompt.length >= 180 ? "text-amber-500" : "text-muted-foreground"
                            )}>
                              {prompt.length}/200
                            </span>
                          </div>
                          <Input 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value.slice(0, 200))}
                            placeholder={t('clip_editor.polish.details.context_placeholder')}
                            className="h-10 bg-muted/20 border-border rounded-md text-xs font-medium"
                          />
                          <p className="text-[9px] text-muted-foreground">{t('clip_editor.polish.details.context_help')}</p>
                        </div>}

                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <label className="text-[10px] font-bold text-muted-foreground">{t('clip_editor.polish.details.clip_title')}</label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost"
                                    size="sm"
                                    onClick={generateAITitle}
                                    disabled={isGeneratingTitle}
                                    className="h-auto p-0 flex items-center gap-1.5 text-[10px] font-bold text-primary hover:text-primary/80 hover:bg-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    {isGeneratingTitle ? (
                                      <Loader2 size={12} className="animate-spin" />
                                    ) : (
                                      <Sparkles size={12} />
                                    )}
                                    {t('clip_editor.polish.details.ai_suggest')}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                  {t('clip_editor.polish.details.title_tooltip')}
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <span className={cn(
                              "text-[10px] font-mono",
                              title.length > 70 ? "text-orange-500" : "text-muted-foreground"
                            )}>
                              {title.length}/80
                            </span>
                          </div>
                          <Input 
                            value={title}
                            onChange={(e) => setTitle(e.target.value.slice(0, 80))}
                            placeholder={t('clip_editor.polish.details.title_placeholder')}
                            className="h-12 bg-muted/30 border-border rounded-md text-sm font-medium"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-muted-foreground">{t('clip_editor.polish.details.caption')}</label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost"
                                  size="sm"
                                  onClick={generateAICaption}
                                  disabled={isGeneratingCaption || !title}
                                  className="h-auto p-0 flex items-center gap-1.5 text-[10px] font-bold text-primary hover:text-primary/80 hover:bg-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  {isGeneratingCaption ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    <Sparkles size={12} />
                                  )}
                                  {t('clip_editor.polish.details.ai_generate')}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                {t('clip_editor.polish.details.caption_tooltip')}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Textarea 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('clip_editor.polish.details.caption_placeholder')}
                            rows={4}
                            className="bg-muted/30 border-border rounded-md text-sm font-medium resize-none"
                          />
                          
                          <AnimatePresence>
                            {aiSuggestions.length > 0 && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="mt-3 space-y-2 overflow-hidden"
                              >
                                <p className="text-[10px] font-bold text-muted-foreground">{t('clip_editor.polish.details.ai_suggestions_label')}</p>
                                <div className="grid gap-2">
                                  {aiSuggestions.map((suggestion, idx) => (
                                    <Button
                                      key={idx}
                                      variant="outline"
                                      onClick={() => {
                                        setDescription(suggestion);
                                        setAiSuggestions([]);
                                      }}
                                      className="justify-start h-auto p-3 bg-primary/5 border-primary/10 rounded-md text-xs font-medium text-primary hover:bg-primary/10 transition-all text-left whitespace-normal"
                                    >
                                      {suggestion}
                                    </Button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Hashtags */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-muted-foreground">
                            {t('clip_editor.polish.details.hashtags', { defaultValue: 'Hashtags' })}
                          </label>
                          <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                            {hashtags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="gap-1 text-[10px] cursor-pointer"
                                onClick={() => setHashtags((prev) => prev.filter((h) => h !== tag))}
                              >
                                {tag}
                                <span className="opacity-60">×</span>
                              </Badge>
                            ))}
                          </div>
                          <Input
                            value={hashtagDraft}
                            onChange={(e) => setHashtagDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === ",") {
                                e.preventDefault();
                                addHashtagFromDraft();
                              }
                            }}
                            onBlur={addHashtagFromDraft}
                            placeholder={t('clip_editor.polish.details.hashtags_placeholder', { defaultValue: 'Add #hashtag and press Enter' })}
                            className="h-10 bg-muted/30 border-border rounded-md text-xs"
                          />
                        </div>

                        {/* Generate hooks (moved from Captions) */}
                        <div className="space-y-3 pt-2 border-t border-border/50">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              disabled={!id || isGeneratingHooks}
                              onClick={async () => {
                                if (!id) return;
                                setIsGeneratingHooks(true);
                                try {
                                  await saveClipEditToServer();
                                  const res = await contentApi.generateClipHooks(id);
                                  const next = res.hooks || [];
                                  setHookOptions(next);
                                  setSelectedHookOptionIndex(null);
                                  toast.success(
                                    t("clip_editor.polish.details.hooks_ready", {
                                      defaultValue:
                                        "{{count}} hooks ready — tap one to replace the on-clip hook",
                                      count: next.length,
                                    }),
                                  );
                                } catch (err) {
                                  toast.error("Hook generation failed", {
                                    description: formatClipApiError(err),
                                  });
                                } finally {
                                  setIsGeneratingHooks(false);
                                }
                              }}
                            >
                              {isGeneratingHooks ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} />}
                              <span className="ml-1">
                                {hookOptions.length
                                  ? t("clip_editor.polish.details.refresh_hooks", {
                                      defaultValue: "Refresh hooks",
                                    })
                                  : t("clip_editor.polish.details.generate_hooks", {
                                      defaultValue: "Generate hooks",
                                    })}
                              </span>
                            </Button>
                          </div>
                          <div className="space-y-2" id="clip-hooks-editor">
                            <label className="text-[10px] font-bold text-muted-foreground">
                              {t("clip_editor.polish.details.active_hook", {
                                defaultValue: "Active hook (on-clip)",
                              })}
                            </label>
                            <Input
                              value={topText}
                              onChange={(e) => {
                                const text = e.target.value.slice(0, 50);
                                setTopText(text);
                                setSelectedHookOptionIndex(null);
                                if (hooks.length) {
                                  const next = [...hooks];
                                  next[0] = { ...next[0]!, text: text.slice(0, 80) };
                                  setHooks(next);
                                } else if (text.trim()) {
                                  setHooks([
                                    {
                                      text: text.slice(0, 80),
                                      startMs: Math.round((finalTrim?.start ?? trimStart) * 1000),
                                      durationMs: 2800,
                                      styleId: memeCaptionStyle,
                                    },
                                  ]);
                                }
                              }}
                              placeholder={t("clip_editor.polish.details.active_hook_placeholder", {
                                defaultValue: "Hook shown on the clip",
                              })}
                              className="h-9 text-xs"
                            />
                          </div>
                          {hookOptions.length > 0 ? (
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-muted-foreground">
                                {t("clip_editor.polish.details.pick_hook", {
                                  defaultValue: "Pick a hook (replaces Coach / active)",
                                })}
                              </label>
                              <div className="space-y-1.5">
                                {hookOptions.map((h, idx) => {
                                  const active =
                                    selectedHookOptionIndex === idx ||
                                    (selectedHookOptionIndex == null &&
                                      topText.trim().toLowerCase() === h.text.trim().toLowerCase());
                                  return (
                                    <button
                                      key={`${h.text}-${idx}`}
                                      type="button"
                                      onClick={() => {
                                        const text = h.text.trim().slice(0, 80);
                                        setSelectedHookOptionIndex(idx);
                                        setTopText(text.slice(0, 50));
                                        setHooks([
                                          {
                                            ...h,
                                            text,
                                            styleId: h.styleId || memeCaptionStyle,
                                          },
                                        ]);
                                        toast.message(
                                          t("clip_editor.polish.details.hook_applied", {
                                            defaultValue: "Hook updated on the clip",
                                          }),
                                        );
                                      }}
                                      className={cn(
                                        "w-full text-left rounded-lg border px-3 py-2 text-xs transition-colors",
                                        active
                                          ? "border-amber-500/70 bg-amber-500/20 text-foreground"
                                          : "border-amber-500/30 bg-amber-500/10 text-foreground/80 hover:border-amber-500/50 hover:bg-amber-500/15",
                                      )}
                                    >
                                      <span className="flex items-center justify-between gap-2">
                                        <span className="font-medium leading-snug">{h.text}</span>
                                        {active ? (
                                          <span className="shrink-0 text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300">
                                            {t("clip_editor.polish.details.hook_selected", {
                                              defaultValue: "Active",
                                            })}
                                          </span>
                                        ) : (
                                          <span className="shrink-0 text-[10px] font-bold uppercase text-amber-700/80 dark:text-amber-300/80">
                                            {t("clip_editor.polish.details.use_hook", {
                                              defaultValue: "Use",
                                            })}
                                          </span>
                                        )}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}
                          <label className="flex items-center justify-between gap-3 text-xs font-medium border border-border/40 rounded-lg px-3 py-2">
                            <span>{t('clip_editor.polish.details.cut_silence', { defaultValue: 'Cut dead air (silence)' })}</span>
                            <input
                              type="checkbox"
                              checked={silenceEnabled}
                              onChange={(e) => setSilenceEnabled(e.target.checked)}
                            />
                          </label>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="meme" className="mt-0 space-y-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base md:text-lg font-display font-bold text-foreground flex items-center gap-2">
                          <Type size={18} className="text-primary" />
                          {t('clip_editor.polish.meme.title')}
                        </h3>
                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-primary/20 text-primary bg-primary/5">
                          {t('clip_editor.polish.meme.beta')}
                        </Badge>
                      </div>

                      <div className="space-y-6">
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {t("clip_editor.polish.meme.drag_hint")}
                        </p>
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between px-1">
                              <label className="text-[10px] font-bold text-muted-foreground">{t('clip_editor.polish.meme.top_text')}</label>
                              <span className={cn(
                                "text-[9px] font-mono transition-colors",
                                topText.length >= 45 ? "text-amber-500" : "text-muted-foreground"
                              )}>
                                {topText.length}/50
                              </span>
                            </div>
                            <Input 
                              placeholder={t('clip_editor.polish.meme.top_placeholder')} 
                              value={topText}
                              onChange={(e) => {
                                const text = e.target.value.slice(0, 50);
                                setTopText(text);
                                if (hooks.length) {
                                  const next = [...hooks];
                                  next[0] = { ...next[0]!, text: text.slice(0, 80) };
                                  setHooks(next);
                                } else if (text.trim()) {
                                  setHooks([
                                    {
                                      text: text.slice(0, 80),
                                      startMs: Math.round((finalTrim?.start ?? trimStart) * 1000),
                                      durationMs: 2800,
                                      styleId: memeCaptionStyle,
                                    },
                                  ]);
                                }
                              }}
                              className="h-10 text-xs bg-muted/30 border-border/50 rounded-lg focus:border-primary/50"
                            />
                          </div>
                          
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between px-1">
                              <label className="text-[10px] font-bold text-muted-foreground">{t('clip_editor.polish.meme.bottom_text')}</label>
                              <span className={cn(
                                "text-[9px] font-mono transition-colors",
                                bottomText.length >= 45 ? "text-amber-500" : "text-muted-foreground"
                              )}>
                                {bottomText.length}/50
                              </span>
                            </div>
                            <Input 
                              placeholder={t('clip_editor.polish.meme.bottom_placeholder')} 
                              value={bottomText}
                              onChange={(e) => setBottomText(e.target.value.slice(0, 50))}
                              className="h-10 text-xs bg-muted/30 border-border/50 rounded-lg focus:border-primary/50"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground ml-1">{t('clip_editor.polish.meme.caption_style')}</label>
                            <Select
                              value={memeCaptionStyle}
                              onValueChange={setMemeCaptionStyle}
                              items={Object.fromEntries(
                                CAPTION_STYLE_OPTIONS.map((opt) => [
                                  opt.value,
                                  t(opt.labelKey, { defaultValue: opt.fallback }),
                                ]),
                              )}
                            >
                              <SelectTrigger className="h-10 w-full text-xs bg-muted/30 border-border/50 rounded-lg">
                                <SelectValue placeholder={t('clip_editor.polish.meme.caption_style')}>
                                  {(value: string | null) => {
                                    const opt = CAPTION_STYLE_OPTIONS.find((o) => o.value === value);
                                    return opt
                                      ? t(opt.labelKey, { defaultValue: opt.fallback })
                                      : t('clip_editor.polish.meme.caption_style');
                                  }}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {CAPTION_STYLE_OPTIONS.map((opt) => {
                                  const label = t(opt.labelKey, { defaultValue: opt.fallback });
                                  return (
                                    <SelectItem key={opt.value} value={opt.value} label={label}>
                                      {label}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground ml-1">
                              {t('clip_editor.polish.meme.caption_font', { defaultValue: 'Caption font' })}
                            </label>
                            <Select
                              value={captionFontId}
                              onValueChange={(v) => setCaptionFontId(v as ClipCaptionFontId)}
                              items={Object.fromEntries(CLIP_CAPTION_FONTS.map((font) => [font.id, font.label]))}
                            >
                              <SelectTrigger className="h-10 w-full text-xs bg-muted/30 border-border/50 rounded-lg">
                                <SelectValue placeholder={t('clip_editor.polish.meme.caption_font', { defaultValue: 'Caption font' })}>
                                  {(value: string | null) =>
                                    CLIP_CAPTION_FONTS.find((font) => font.id === value)?.label ??
                                    t('clip_editor.polish.meme.caption_font', { defaultValue: 'Caption font' })
                                  }
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {CLIP_CAPTION_FONTS.map((font) => (
                                  <SelectItem key={font.id} value={font.id} label={font.label}>
                                    <span style={{ fontFamily: font.cssFamily, fontWeight: font.previewWeight }}>
                                      {font.label}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-[10px] text-muted-foreground px-1">
                              Burned into Download/Render via media-worker (OFL pack).
                            </p>
                        </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground ml-1">
                              {t("clip_editor.polish.meme.text_color", {
                                defaultValue: "Text color",
                              })}
                            </label>
                            <div className="flex flex-wrap gap-2 px-1">
                              {CAPTION_TEXT_COLORS.map((swatch) => {
                                const selected =
                                  captionTextColor.toUpperCase() === swatch.hex.toUpperCase();
                                return (
                                  <button
                                    key={swatch.hex}
                                    type="button"
                                    title={swatch.label}
                                    aria-label={swatch.label}
                                    aria-pressed={selected}
                                    onClick={() => setCaptionTextColor(swatch.hex)}
                                    className={cn(
                                      "h-7 w-7 rounded-full border-2 shadow-sm transition-transform",
                                      selected
                                        ? "border-primary scale-110"
                                        : "border-border hover:scale-105",
                                    )}
                                    style={{ backgroundColor: swatch.hex }}
                                  />
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={!id || isTranscribing}
                              onClick={async () => {
                                if (!id) return;
                                setIsTranscribing(true);
                                try {
                                  await contentApi.transcribeClip(id);
                                  toast.message("Transcription queued", {
                                    description: "Word timings appear after the job completes.",
                                  });
                                  let ready = false;
                                  for (let i = 0; i < 16; i++) {
                                    await new Promise((r) => setTimeout(r, 2500));
                                    const item = await contentApi.getOwnedContentById(id, { suppressErrorLog: true });
                                    if (typeof item.clipEditSpec?.transcript === "string") {
                                      setTranscriptPreview(item.clipEditSpec.transcript);
                                      toast.success(
                                        item.clipEditSpec.transcript.trim()
                                          ? "Transcript ready"
                                          : "No speech detected",
                                      );
                                      ready = true;
                                      break;
                                    }
                                  }
                                  if (!ready) {
                                    toast.message("Still processing", {
                                      description: "Transcription is taking longer — try again in a minute.",
                                    });
                                  }
                                } catch (err) {
                                  toast.error("Transcribe failed", {
                                    description: formatClipApiError(err),
                                  });
                                } finally {
                                  setIsTranscribing(false);
                                }
                              }}
                            >
                              {isTranscribing ? <Loader2 className="animate-spin" size={14} /> : <Type size={14} />}
                              <span className="ml-1">Transcribe</span>
                            </Button>
                          </div>

                          {transcriptPreview ? (
                            <p className="text-[11px] text-muted-foreground line-clamp-3 border border-border/40 rounded-lg p-2 bg-muted/20">
                              {transcriptPreview}
                            </p>
                          ) : null}

                        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles size={14} className="text-primary" />
                            <p className="text-[10px] font-bold text-foreground">{t('clip_editor.polish.meme.pro_tip')}</p>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                              Captions, hooks, BGM, and silence cuts burn into the exported MP4 on Download/Render — not just this preview.
                          </p>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="audio" className="mt-0 space-y-6 md:space-y-8">
                      <div className="flex items-center justify-between mb-2 md:mb-4">
                        <h3 className="text-base md:text-lg font-display font-bold text-foreground flex items-center gap-2">
                          <Volume2 size={18} className="text-primary" />
                          {t('clip_editor.polish.audio.title')}
                        </h3>
                        <MixMeterBars
                          videoRef={videoRef}
                          bgmRef={mixBgmRef}
                          tap={step === "polish"}
                          animate={isPlaying && step === "polish"}
                          videoKey={videoSrc}
                          bgmKey={selectedTrackId}
                        />
                      </div>

                      {/* Master Volume */}
                      <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
                              <Zap size={18} fill="currentColor" />
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-primary/60">{t('clip_editor.polish.audio.master_mix')}</p>
                              <p className="text-[13px] font-bold">{t('clip_editor.polish.audio.final_output')}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] sm:text-xs font-mono font-bold text-primary">{Math.round((isMasterMuted ? 0 : masterVolume) * 100)}%</span>
                            <Button 
                              variant="ghost"
                              size="icon"
                              onClick={() => setIsMasterMuted(!isMasterMuted)}
                              className="h-9 w-9 hover:bg-primary/10 rounded-lg"
                            >
                              {isMasterMuted || masterVolume === 0 ? <VolumeX size={16} className="text-destructive" /> : <Volume2 size={16} />}
                            </Button>
                          </div>
                        </div>
                        <div className="px-1 py-1">
                          <Slider 
                            min={0}
                            max={1.5}
                            step={0.01}
                            value={[isMasterMuted ? 0 : masterVolume]}
                            onValueChange={(v) => {
                              const val = Array.isArray(v) ? v[0] : v;
                              setMasterVolume(val);
                              if (isMasterMuted) setIsMasterMuted(false);
                            }}
                            className="w-full"
                          />
                          <p className="text-[10px] text-muted-foreground leading-relaxed">
                            {t("clip_editor.polish.audio.mix_hint", {
                              defaultValue:
                                "Tap Play on the preview to hear original clip audio and selected BGM together. Master mix scales both.",
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        {/* Clip Volume */}
                        <div className="space-y-4 p-4 bg-muted/30 rounded-xl border border-border/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                                <Scissors size={14} />
                              </div>
                              <span className="text-xs font-bold text-foreground">{t('clip_editor.polish.audio.original_clip')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-muted-foreground">{Math.round((isClipMuted ? 0 : clipVolume) * 100)}%</span>
                              <Button 
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setIsClipMuted(!isClipMuted)}
                                className="hover:bg-muted rounded-md"
                              >
                                {isClipMuted || clipVolume === 0 ? <VolumeX size={14} className="text-destructive" /> : <Volume2 size={14} />}
                              </Button>
                            </div>
                          </div>
                          <Slider 
                            min={0}
                            max={1}
                            step={0.01}
                            value={[isClipMuted ? 0 : clipVolume]}
                            onValueChange={(v) => {
                              const val = Array.isArray(v) ? v[0] : v;
                              setClipVolume(val);
                              if (isClipMuted) setIsClipMuted(false);
                            }}
                            className="w-full"
                          />
                          {isAnimateClip ? (
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                              {t('clip_editor.polish.audio.animate_no_source', {
                                defaultValue: 'Animated clips often have no source audio — raise BGM or keep this low.',
                              })}
                            </p>
                          ) : null}
                        </div>

                        {/* Music Volume */}
                        <div className="space-y-4 p-4 bg-muted/30 rounded-xl border border-border/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                                <Music size={14} />
                              </div>
                              <span className="text-xs font-bold text-foreground">{t('clip_editor.polish.audio.bg_music')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-muted-foreground">{Math.round((isMusicMuted ? 0 : musicVolume) * 100)}%</span>
                              <Button 
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setIsMusicMuted(!isMusicMuted)}
                                className="hover:bg-muted rounded-md"
                                disabled={!selectedTrackId}
                              >
                                {isMusicMuted || musicVolume === 0 ? <VolumeX size={14} className="text-destructive" /> : <Volume2 size={14} />}
                              </Button>
                            </div>
                          </div>
                          <Slider 
                            min={0}
                            max={1}
                            step={0.01}
                            value={[isMusicMuted ? 0 : musicVolume]}
                            onValueChange={(v) => {
                              const val = Array.isArray(v) ? v[0] : v;
                              setMusicVolume(val);
                              if (isMusicMuted) setIsMusicMuted(false);
                            }}
                            className="w-full"
                            disabled={!selectedTrackId}
                          />
                        </div>
                      </div>

                      {/* Music Selection */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-bold text-muted-foreground leading-none">{t('clip_editor.polish.audio.sound_library')}</span>
                          <span className="text-[10px] font-bold text-primary leading-none">{t('clip_editor.polish.audio.previews')}</span>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Select
                            value={selectedTrackId || "none"}
                            items={BGM_SELECT_ITEMS}
                            onValueChange={(v) => {
                              if (v === "none") {
                                setSelectedTrackId(null);
                                stopPreview();
                                clearMixBgm();
                                applyPreviewMix();
                              } else {
                                setSelectedTrackId(v);
                              }
                            }}
                          >
                            <SelectTrigger className="h-10 w-full flex-1 min-w-0 text-xs bg-muted/30 border-border/50 rounded-lg">
                              <SelectValue placeholder="None">
                                {(value: string | null) =>
                                  value === "none" || !value ? "None" : bgmSelectLabel(value)
                                }
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none" label="None">
                                None
                              </SelectItem>
                              {TRACKS.map((track) => (
                                <SelectItem
                                    key={track.id}
                                  value={track.id}
                                  label={`${track.title} · ${track.genre}`}
                                  >
                                  {track.title} · {track.genre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                                    <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!selectedTrackId}
                            onClick={() => handleTrackPreview(selectedTrackId)}
                            className="shrink-0"
                          >
                            {previewingTrackId === selectedTrackId ? (
                              <>
                                <Pause size={14} className="mr-1" /> Stop
                              </>
                            ) : (
                              <>
                                <Play size={14} className="mr-1" /> Preview
                              </>
                            )}
                                    </Button>
                            </div>
                        {previewingTrackId && (
                          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary transition-all" style={{ width: `${previewProgress}%` }} />
                        </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="enhance" className="mt-0 space-y-6">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base md:text-lg font-display font-bold text-foreground flex items-center gap-2 min-w-0">
                            <Sparkles size={18} className="text-primary shrink-0" />
                            <span className="truncate">{t("clip_editor.polish.tabs.enhance")}</span>
                        </h3>
                          <Badge
                            variant="secondary"
                            className="shrink-0 bg-muted text-muted-foreground border-border text-[10px] font-bold"
                          >
                            {t("clip_editor.polish.enhance.live_preview", { defaultValue: "Live preview" })}
                        </Badge>
                      </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {t("clip_editor.polish.enhance.preview_hint", {
                            defaultValue:
                              "Watch the 9:16 preview. Play the clip, toggle noise reduction, drag color, then Compare original.",
                          })}
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant={enhanceShowOriginal ? "default" : "outline"}
                          className="h-8 text-[11px] font-bold"
                          onClick={() => setEnhanceShowOriginal((v) => !v)}
                        >
                          {enhanceShowOriginal
                            ? t("clip_editor.polish.enhance.comparing", { defaultValue: "Showing original" })
                            : t("clip_editor.polish.enhance.compare_original", { defaultValue: "Compare original" })}
                        </Button>
                      </div>
                      {/* Audio Enhancement Section */}
                      <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Volume2 size={16} className="text-muted-foreground" />
                          <span className="text-[10px] font-bold text-muted-foreground">
                            {t("clip_editor.polish.enhance.audio_polish")}
                          </span>
                        </div>
                        
                        <div 
                          onClick={() => {
                            const next = !isNoiseReduced;
                            setIsNoiseReduced(next);
                            if (next && !isPlaying) void togglePlayback();
                          }}
                          className={cn(
                            "p-4 rounded-xl border transition-all cursor-pointer group",
                            isNoiseReduced 
                              ? "bg-primary/5 border-primary/30 shadow-lg shadow-primary/5" 
                              : "bg-muted/30 border-border hover:border-primary/20"
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className={cn(
                                    "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                                    isNoiseReduced ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                  )}>
                                    <VolumeX size={18} />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-[200px]">
                                  {t('clip_editor.polish.enhance.noise_reduction_tooltip')}
                                </TooltipContent>
                              </Tooltip>
                              <div>
                                <p className="text-sm font-bold">{t('clip_editor.polish.enhance.noise_reduction')}</p>
                                <p className="text-[10px] text-muted-foreground tracking-wider">{t('clip_editor.polish.enhance.voice_isolation')}</p>
                              </div>
                            </div>
                            <div className={cn(
                              "w-10 h-6 rounded-full relative transition-colors",
                              isNoiseReduced ? "bg-primary" : "bg-muted"
                            )}>
                              <motion.div 
                                animate={{ x: isNoiseReduced ? 18 : 2 }}
                                className="absolute top-1 left-0 w-4 h-4 bg-primary-foreground rounded-full shadow-sm"
                              />
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {isAnimateClip
                              ? t("clip_editor.polish.audio.animate_no_source", {
                                  defaultValue:
                                    "Animated clips often have no source audio — raise BGM or keep this low.",
                                })
                              : t("clip_editor.polish.enhance.audio_polish_hint", {
                                  defaultValue:
                                    "Cuts rumble and hiss and lifts the voice. Play, toggle this, then Compare original.",
                                })}
                          </p>
                        </div>
                      </div>

                      <Separator className="bg-border/50" />

                      {/* Visual Enhancement Section */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Wand2 size={16} className="text-muted-foreground shrink-0" />
                            <span className="text-[10px] font-bold text-muted-foreground">
                              {t("clip_editor.polish.enhance.visual_polish")}
                            </span>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button 
                                type="button"
                                onClick={() => {
                                  const next = !isAutoColorEnabled;
                                  setIsAutoColorEnabled(next);
                                  if (next) setColorCorrection(75);
                                }}
                                className={cn(
                                  "shrink-0 text-[10px] font-bold px-2 py-1 rounded transition-colors",
                                  isAutoColorEnabled ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary"
                                )}
                              >
                                {isAutoColorEnabled ? t('clip_editor.polish.enhance.auto_applied') : t('clip_editor.polish.enhance.auto_correct')}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              {t('clip_editor.polish.enhance.auto_correct_tooltip')}
                            </TooltipContent>
                          </Tooltip>
                        </div>

                        <div className="space-y-4 p-4 bg-muted/30 rounded-xl border border-border">
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {t("clip_editor.polish.enhance.visual_polish_hint", {
                              defaultValue:
                                "Drag toward Vibrant — saturation and contrast update on the 9:16 preview immediately.",
                            })}
                          </p>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold">{t('clip_editor.polish.enhance.smart_color')}</span>
                              <span className="text-xs font-mono font-bold text-primary">{colorCorrection}%</span>
                            </div>
                            <Slider 
                              value={[colorCorrection]}
                              min={0}
                              max={100}
                              step={1}
                              onValueChange={(v) => {
                                const val = Math.round(firstSliderValue(v));
                                setColorCorrection(val);
                                if (val > 0) setIsAutoColorEnabled(false);
                              }}
                              className="w-full py-2"
                            />
                            <div className="flex justify-between text-[9px] font-bold text-muted-foreground tracking-tighter">
                              <span>{t('clip_editor.polish.enhance.natural')}</span>
                              <span>{t('clip_editor.polish.enhance.vibrant')}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator className="bg-border/50" />

                      {/* Transition Suggestions Section */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Zap size={16} className="text-muted-foreground" />
                            <span className="text-[10px] font-bold text-muted-foreground">{t('clip_editor.polish.enhance.transitions_title')}</span>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={generateTransitionSuggestions}
                                disabled={isGeneratingTransitions}
                                className="h-auto p-0 text-[10px] font-bold text-primary hover:bg-transparent"
                              >
                                {isGeneratingTransitions ? <Loader2 size={12} className="animate-spin mr-1.5" /> : <Sparkles size={12} className="mr-1.5" />}
                                {t('clip_editor.polish.enhance.analyze_clip')}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              {t('clip_editor.polish.enhance.transitions_tooltip')}
                            </TooltipContent>
                          </Tooltip>
                        </div>

                        <div className="space-y-3">
                          {isGeneratingTransitions ? (
                            <div className="space-y-2">
                              {[1, 2, 3].map(i => (
                                <div key={i} className="h-12 bg-muted/50 animate-pulse rounded-lg border border-border/50" />
                              ))}
                            </div>
                          ) : transitionSuggestions.length > 0 ? (
                            <div className="grid gap-2">
                              {transitionSuggestions.map((s, i) => (
                                <div 
                                  key={i}
                                  className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-lg group hover:border-primary/30 transition-all"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                                      {formatTime(s.time)}
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold">{s.type} {t('clip_editor.polish.enhance.transition', { defaultValue: 'Transition' })}</p>
                                      <div className="flex flex-wrap items-center gap-2 mt-1">
                                        {s.caption && (
                                          <Badge variant="outline" className="text-[8px] bg-primary/5 border-primary/10 text-primary py-0 h-4">
                                            "{s.caption}"
                                          </Badge>
                                        )}
                                        {s.sfx && (
                                          <div className="flex items-center gap-2 text-[8px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded font-black tracking-tighter">
                                            <Volume2 size={8} />
                                            {s.sfx}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="px-2 text-[9px] font-bold text-primary hover:bg-primary/10"
                                    onClick={() => applyTransitionPreview(s)}
                                  >
                                    {appliedTransitions.some(
                                      (p) => Math.abs(p.time - s.time) < 0.05 && p.type === s.type,
                                    )
                                      ? t("clip_editor.polish.enhance.applied_btn", {
                                          defaultValue: "Replay on clip",
                                        })
                                      : t("clip_editor.polish.enhance.apply_btn", {
                                          defaultValue: "Preview on clip",
                                        })}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-6 border border-dashed border-border rounded-xl text-center space-y-3">
                              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                                <Layout size={20} />
                              </div>
                              <p className="text-xs text-muted-foreground font-medium">
                                {t('clip_editor.polish.enhance.no_transitions')}
                              </p>
                              <p className="text-[10px] text-muted-foreground px-2">
                                Suggestions load automatically on Polish. If empty, run AI Coach
                                analyze first, then tap Analyze Clip here.
                              </p>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-[10px] font-bold"
                                disabled={isGeneratingTransitions}
                                onClick={() => void generateTransitionSuggestions()}
                              >
                                {isGeneratingTransitions ? (
                                  <Loader2 size={12} className="animate-spin mr-1.5" />
                                ) : (
                                  <Sparkles size={12} className="mr-1.5" />
                                )}
                                {t('clip_editor.polish.enhance.analyze_clip')}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* AI Recommendations Footer */}
                      <div className="p-4 sm:p-5 bg-primary/5 rounded-xl border border-primary/10 relative overflow-hidden group">
                        <div className="absolute -top-2 -right-2 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                          <Sparkles size={80} className="text-primary" />
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                            <BrainCircuit size={14} />
                          </div>
                          <p className="text-[10px] font-bold">{t('clip_editor.polish.enhance.coach_title')}</p>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed italic relative z-10">
                          {coachAdvice?.context === prompt ? coachAdvice.advice : coachBeat
                            ? t("clip_editor.polish.enhance.coach_tip_pick", {
                                type: coachBeat.type,
                                time: formatTime(coachBeat.time),
                                duration: formatTime(enhanceClipWindow.duration),
                              })
                            : t("clip_editor.polish.enhance.coach_tip_empty", {
                                duration: formatTime(enhanceClipWindow.duration),
                              })}
                        </p>
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>

              <div className="hidden lg:block space-y-3 pt-4">
                <div
                  className={cn(
                    "rounded-xl border px-3 py-2 text-[11px] font-medium",
                    renderReady
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
                  )}
                >
                  {isRendering
                    ? "Rendering your edits into the MP4…"
                    : showingFinalRender
                      ? "Final render in preview — play it, then Publish or Download."
                      : renderReady
                        ? "Render ready — loading final preview…"
                        : "Edits pending — tap Save & Render before Publish or Download."}
                </div>
                <Button
                  size="default"
                  onClick={() => void handleSaveAndRender()}
                  disabled={isPublishing || isRendering}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 rounded-full font-bold transition-all h-11",
                    renderReady
                      ? "border border-border bg-muted/40 text-foreground hover:bg-muted"
                      : "shadow-lg shadow-primary/20 bg-primary hover:bg-primary-strong text-primary-foreground",
                  )}
                  variant={renderReady ? "outline" : "default"}
                >
                  {isRendering ? (
                    <>
                      <Loader2 size={18} className="mr-1 animate-spin" />
                      {renderStatus === "processing" || renderStatus === "queued"
                        ? "Rendering…"
                        : "Saving…"}
                    </>
                  ) : (
                    <>
                      <Save size={18} className="mr-1" />
                      {renderReady ? "Re-render" : "Save & Render"}
                    </>
                  )}
                </Button>
                <SocialPublishTargets
                  selected={socialPlatforms}
                  onChange={setSocialPlatforms}
                  disabled={isPublishing || isAlreadyPublished || !renderReady}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="block w-full">
                      <Button
                        size="default"
                        onClick={openPublishPreview}
                        disabled={isPublishing || isAlreadyPublished || !renderReady || isRendering}
                        className="w-full flex items-center justify-center gap-2 rounded-full font-bold transition-all h-11 disabled:opacity-60"
                        variant="outline"
                      >
                        {isPublishing ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-foreground border-t-transparent rounded-full animate-spin mr-2" />
                            Publishing...
                          </>
                        ) : (
                          <>
                            {isAlreadyPublished
                              ? "Already published"
                              : t("clip_editor.polish.actions.publish")}
                            {!isAlreadyPublished ? <ChevronRight size={18} /> : null}
                          </>
                        )}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[280px]">
                    {publishBlockedReason ||
                      (!renderReady ? renderGateMessage : "Publish the rendered MP4 to your feed.")}
                  </TooltipContent>
                </Tooltip>
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => void handleRenderDownload()}
                  disabled={isPublishing || isRendering || !renderReady}
                  className="w-full rounded-full font-bold transition-all h-11 disabled:opacity-60"
                >
                  <Download size={18} className="mr-2" />
                  {t("clip_editor.polish.actions.download")}
                </Button>
              </div>

              {/* Mobile Sticky Footer */}
              <div className="lg:hidden space-y-3 pt-4 pb-28">
                <div
                  className={cn(
                    "rounded-xl border px-3 py-2 text-[11px] font-medium",
                    renderReady
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
                  )}
                >
                  {renderReady
                    ? "Render ready — Publish or Download."
                    : "Save & Render required before Publish or Download."}
                </div>
                <SocialPublishTargets
                  selected={socialPlatforms}
                  onChange={setSocialPlatforms}
                  disabled={isPublishing || isAlreadyPublished || !renderReady}
                />
              </div>
              <div className="lg:hidden fixed bottom-20 left-0 right-0 p-4 bg-background/95 backdrop-blur-xl border-t border-border z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 shadow-soft-xl">
                <div className="max-w-md mx-auto grid grid-cols-6 gap-2">
                  <Button
                    onClick={() => void handleRenderDownload()}
                    className="col-span-1 rounded-xl border-border bg-muted/50 hover:bg-muted active:scale-95 disabled:opacity-50"
                    variant="outline"
                    size="icon-2xl"
                    disabled={isPublishing || isRendering || !renderReady}
                    title={renderReady ? "Download" : "Save & Render first"}
                  >
                    <Download size={18} />
                  </Button>
                  <Button
                    onClick={() => void handleSaveAndRender()}
                    className={cn(
                      "col-span-2 rounded-xl font-bold text-xs active:scale-95",
                      !renderReady && "bg-primary text-primary-foreground",
                    )}
                    variant={renderReady ? "outline" : "default"}
                    size="2xl"
                    disabled={isPublishing || isRendering}
                  >
                    {isRendering ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <Save size={14} className="mr-1 shrink-0" />
                        {renderReady ? "Re-render" : "Save & Render"}
                      </>
                    )}
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="col-span-3 block">
                        <Button
                          onClick={openPublishPreview}
                          size="2xl"
                          disabled={
                            isPublishing || isAlreadyPublished || !renderReady || isRendering
                          }
                          className="w-full flex items-center justify-center gap-1.5 shadow-soft-lg rounded-xl font-bold text-sm bg-primary hover:bg-primary-strong transition-all active:scale-95 text-primary-foreground disabled:opacity-60"
                        >
                          {isPublishing
                            ? "Publishing..."
                            : isAlreadyPublished
                              ? "Published"
                              : t("clip_editor.polish.actions.publish")}
                          {!isAlreadyPublished && renderReady ? <ChevronRight size={16} /> : null}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px]">
                      {publishBlockedReason ||
                        (!renderReady ? renderGateMessage : "Publish the rendered MP4.")}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
          </div>
        </div>

        {/* Polishing Overlay */}
        <AnimatePresence>
          {isReviewingTrim && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/40 backdrop-blur-md z-[100] flex items-center justify-center p-6"
            >
              <div className="ui-card w-full max-w-lg p-8 shadow-2xl text-center space-y-6">
                <div className="ui-icon-chip-primary w-20 h-20 bg-primary text-primary-foreground mx-auto shadow-lg shadow-primary/20">
                  <Play size={32} fill="currentColor" className="ml-1" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-display font-bold text-foreground">{t('clip_editor.overlays.review_title')}</h3>
                  <p className="text-muted-foreground text-sm">
                    {t('clip_editor.overlays.review_desc', { duration: formatSpan(trimStart, trimEnd) })}
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${reviewProgress}%` }}
                      className="h-full bg-primary"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <button 
                      onClick={() => {
                        reviewAdvanceLockRef.current = true;
                        isReviewingTrimRef.current = false;
                        setIsReviewingTrim(false);
                        if (reviewIntervalRef.current) {
                          clearInterval(reviewIntervalRef.current);
                          reviewIntervalRef.current = null;
                        }
                        videoRef.current?.pause();
                        mixBgmRef.current?.pause();
                        setIsPlaying(false);
                      }}
                      className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {t('clip_editor.overlays.cancel')}
                    </button>
                    <Button 
                      onClick={() => {
                        reviewAdvanceLockRef.current = true;
                        void startPolishing();
                      }}
                      size="xl"
                      className="px-6 h-10 text-xs font-bold shadow-lg shadow-primary/20 flex items-center gap-2"
                    >
                      {t('clip_editor.overlays.skip_polish')}
                      <ChevronRight size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {isPolishing && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6"
            >
              <div className="w-full max-w-md space-y-8">
                <div className="text-center space-y-4">
                  <div className="relative w-24 h-24 mx-auto">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 rounded-full border-2 border-dashed border-primary/30"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles size={40} className="text-primary animate-pulse" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-display font-bold text-foreground">{t('clip_editor.overlays.polishing_title')}</h3>
                  <p className="text-muted-foreground">{t('clip_editor.overlays.polishing_desc')}</p>
                </div>

                <div className="space-y-6">
                  {polishSteps.map((s, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ 
                        opacity: polishStep >= i ? 1 : 0.3,
                        x: 0,
                        scale: polishStep === i ? 1.02 : 1
                      }}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-md border transition-all",
                        polishStep === i ? "bg-primary/5 border-primary/20 shadow-lg shadow-primary/5" : "bg-muted/30 border-transparent"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-md flex items-center justify-center transition-colors",
                        polishStep > i ? "bg-brand-secondary text-primary-foreground" : 
                        polishStep === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        {polishStep > i ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-foreground">{t(s.label)}</p>
                        <p className="text-[10px] text-muted-foreground font-medium">
                          {polishStepNotes[i] || t(s.subtext)}
                        </p>
                      </div>
                      {polishStep === i && (
                        <Loader2 size={18} className="text-primary animate-spin" />
                      )}
                    </motion.div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-muted-foreground tracking-[0.2em]">
                    <span>{t('clip_editor.overlays.overall_progress')}</span>
                    <span>{polishProgress}%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${polishProgress}%` }}
                      className="h-full bg-primary shadow-[0_0_20px_rgba(var(--primary),0.5)]"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
        <ClipPublishPreview
          open={publishPreviewOpen}
          onOpenChange={setPublishPreviewOpen}
          onConfirm={() => void handlePublishContent()}
          confirming={isPublishing}
          videoSrc={videoSrc}
          title={title}
          caption={socialCaption || title}
          hashtags={hashtags}
          hook={hooks[0]?.text}
          topText={topText}
          bottomText={bottomText}
          platforms={socialPlatforms}
        />
      </div>
  );
}
