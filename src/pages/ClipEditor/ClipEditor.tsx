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
import { TransitionPreviewOverlay } from "./TransitionPreviewOverlay";
import { ClipPublishPreview } from "./ClipPublishPreview";
import { pickCoachTransition, polishWindow, toClipRelativeTime } from "./clipEnhanceCoach";
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

export default function ClipEditor() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderStatus, setRenderStatus] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const step = searchParams.get("step") || "trim";
  const [isPlaying, setIsPlaying] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  
  // Dirty state tracking for navigation guard
  const [isDirty, setIsDirty] = useState(false);
  const isLoaded = useRef(false);
  /** True after server clipEditSpec (or first metadata) applied — blocks trim corruption. */
  const specHydratedRef = useRef(false);
  const autoCaptionRanRef = useRef(false);
  const retryAnimateRanRef = useRef(false);
  const [trimEnd, setTrimEnd] = useState(30);
  const [currentTime, setCurrentTime] = useState(0);
  const [DURATION, setDuration] = useState(90);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const polishPreviewRef = useRef<HTMLDivElement | null>(null);
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
  const [hooks, setHooks] = useState<Array<{ text: string; startMs: number; durationMs: number; styleId?: string }>>([]);
  const [silenceEnabled, setSilenceEnabled] = useState(true);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGeneratingHooks, setIsGeneratingHooks] = useState(false);
  const [transcriptPreview, setTranscriptPreview] = useState("");
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [prompt, setPrompt] = useState(searchParams.get("prompt") || "");
  
  // Enhancement States
  const [isNoiseReduced, setIsNoiseReduced] = useState(false);
  const [colorCorrection, setColorCorrection] = useState(0);
  const [isAutoColorEnabled, setIsAutoColorEnabled] = useState(false);
  const [enhanceShowOriginal, setEnhanceShowOriginal] = useState(false);
  const [transitionSuggestions, setTransitionSuggestions] = useState<{ time: number; type: string; caption?: string; sfx?: string }[]>([]);
  const [appliedTransitions, setAppliedTransitions] = useState<{ time: number; type: string; caption?: string; sfx?: string }[]>([]);
  const [transitionPreviewType, setTransitionPreviewType] = useState<string | null>(null);
  const [isGeneratingTransitions, setIsGeneratingTransitions] = useState(false);
  const [publishPreviewOpen, setPublishPreviewOpen] = useState(false);
  const transitionPreviewTimerRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (transitionPreviewTimerRef.current) {
        window.clearTimeout(transitionPreviewTimerRef.current);
      }
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
        if (item.renderStatus) setRenderStatus(item.renderStatus);
        const spec = item.clipEditSpec;
        const isAnimate =
          Boolean(spec?.animate) ||
          Boolean(spec?.sourceContentId) ||
          String(item.contentType || "").toLowerCase().includes("animate");
        setIsAnimateClip(isAnimate);
        if (spec) {
          if (typeof spec.inMs === "number") setTrimStart(spec.inMs / 1000);
          if (typeof spec.outMs === "number") setTrimEnd(spec.outMs / 1000);
          if (typeof spec.inMs === "number" && typeof spec.outMs === "number") {
            setFinalTrim({ start: spec.inMs / 1000, end: spec.outMs / 1000 });
          }
          if (spec.bgmTrackId) setSelectedTrackId(spec.bgmTrackId);
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
          if (spec.hooks?.length) setHooks(spec.hooks);
          if (spec.silence?.enabled === false) setSilenceEnabled(false);
          if (spec.transcript) setTranscriptPreview(spec.transcript);
          if (spec.polishPrompt) setPrompt(spec.polishPrompt);
          const extras = (spec as { extras?: Record<string, unknown> }).extras;
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
          specHydratedRef.current = true;
        }

        // Always use the authenticated media route for video (not image URL extractors).
        const token = getAccessToken();
        const mediaUrl = `${resolveBaseGatewayUrl()}/content/${id}/media`;
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

  // Seed coach due-today brief into polish prompt once.
  useEffect(() => {
    if (!prompt && dueToday) {
      setPrompt(applyDuePrompt());
    }
  }, [dueToday]);

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

  const openPublishPreview = () => {
    if (!id) {
      toast.error("No active clip ID found.");
      return;
    }
    setPublishPreviewOpen(true);
  };

  const handlePublishContent = async () => {
    if (!id) {
      toast.error("No active clip ID found.");
      return;
    }
    setIsPublishing(true);
    triggerHaptic('medium');
    try {
      toast.loading("Submitting to content moderation and feed...", { id: "publish-clip" });
      await saveClipEditToServer();
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
      triggerHaptic('success');
      setIsDirty(false);
      setPublishPreviewOpen(false);
      navigate("/feed");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to publish clip", {
        description: formatClipApiError(err, "An unexpected error occurred during publication."),
        id: "publish-clip"
      });
      triggerHaptic('error');
    } finally {
      setIsPublishing(false);
    }
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
      const next = inRange.length > 0 ? inRange : heuristicHighlightMarkers(dur, categoryLabel, niches);
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
      const fallback = heuristicHighlightMarkers(Math.max(0.5, mediaDur), categoryLabel, niches);
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
    const musicOn = Boolean(selectedTrackId) && step === "polish";
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
        bgm.volume = usedGraph ? 1 : Math.max(0, Math.min(1, music * master));
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
    step,
  ]);

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
        if (el.currentTime < start || el.currentTime >= end) {
          el.currentTime = start;
          setCurrentTime(start);
        }
        applyPreviewMix();
        await el.play();
        setIsPlaying(true);
        const bgm = mixBgmRef.current;
        const track = TRACKS.find((t) => t.id === selectedTrackId);
        if (bgm && track && step === "polish" && selectedTrackId) {
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
    selectedTrackId,
    step,
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

  const startPolishing = async () => {
    if (polishBusyRef.current) return;
    polishBusyRef.current = true;
    if (reviewIntervalRef.current) {
      clearInterval(reviewIntervalRef.current);
      reviewIntervalRef.current = null;
    }
    const runId = ++polishRunIdRef.current;
    const still = () => polishRunIdRef.current === runId;
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
      setPolishProgress(10);
      setNote(0, t("clip_editor.overlays.steps.transcribing_queued", { defaultValue: "Queued speech-to-text…" }));

      if (id) {
        const transcribeStarted = Date.now();
        try {
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
      await generateAICaption({ silent: true });
      autoCaptionRanRef.current = true;
      await waitAtLeast(captionStarted, 700);
      if (!still()) return;
      setNote(1, t("clip_editor.overlays.steps.captions_done", { defaultValue: "Caption and hashtags drafted" }));

      setPolishStep(2);
      setPolishProgress(72);
      setNote(2, t("clip_editor.overlays.steps.suggesting_effects_sub"));
      const effectsStarted = Date.now();
      if (id) {
        try {
          await contentApi.saveClipEdit(id, buildClipEditSpec());
          const hooksRes = await contentApi.generateClipHooks(id);
          if (still() && hooksRes.hooks?.length) setHooks(hooksRes.hooks);
        } catch {
          /* hooks stay empty — user can retry on polish */
        }
        if (!still()) return;
        try {
          await generateTransitionSuggestions();
        } catch {
          /* transitions optional */
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
      }
    }
  };

  const handleApplyTrim = () => {
    setFinalTrim({ start: trimStart, end: trimEnd });
    reviewAdvanceLockRef.current = false;
    setIsReviewingTrim(true);
    setReviewProgress(0);
    if (reviewIntervalRef.current) {
      clearInterval(reviewIntervalRef.current);
      reviewIntervalRef.current = null;
    }
    seekVideo(trimStart);
    const el = videoRef.current;
    if (el) {
      el.currentTime = trimStart;
      void el.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      setIsPlaying(true);
    }
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
    if (step !== "polish") {
      mixBgmRef.current?.pause();
    }
  }, [step]);

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
        burnWords: true,
        topX: topOverlay.x,
        topY: topOverlay.y,
        bottomX: bottomOverlay.x,
        bottomY: bottomOverlay.y,
      },
      hooks: hooks.length ? hooks : undefined,
      silence: { enabled: silenceEnabled, minSilenceMs: 700 },
      crop: { mode: "face" as const },
      polishPrompt: prompt || undefined,
      extras: {
        hashtags: hashtags.length ? hashtags : undefined,
        transitions: appliedTransitions.length ? appliedTransitions : undefined,
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
    hooks,
    silenceEnabled,
    prompt,
    hashtags,
    isNoiseReduced,
    colorCorrection,
    appliedTransitions,
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
    if (hooks.length > 0) {
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
        setHooks(res.hooks || []);
        toast.success(`Generated ${res.hooks?.length ?? 0} hooks`);
        const next = new URLSearchParams(searchParams);
        next.delete("action");
        if (!next.get("step")) next.set("step", "polish");
        setSearchParams(next, { replace: true });
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
  }, [id, searchParams, hooks.length, saveClipEditToServer, videoLoading]);

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
            const mediaUrl = `${resolveBaseGatewayUrl()}/content/${id}/media`;
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

  const handleRenderDownload = async () => {
    if (!id) {
      toast.error("No active clip ID found.");
      return;
    }
    setIsRendering(true);
    triggerHaptic("medium");
    try {
      toast.loading("Saving edit and starting render…", { id: "render-clip" });
      const spec = buildClipEditSpec();
      await contentApi.saveClipEdit(id, spec);
      const queued = await contentApi.renderClip(id, { clipEditSpec: spec });
      setRenderStatus(queued.renderStatus || "queued");

      // Poll until completed/failed (WS is nice-to-have; poll is reliable for Phase 0).
      const started = Date.now();
      let status = queued.renderStatus || "queued";
      while (Date.now() - started < 120_000) {
        await new Promise((r) => setTimeout(r, 1500));
        const latest = await contentApi.getOwnedContentById(id, { suppressErrorLog: true });
        status = latest.renderStatus || status;
        setRenderStatus(status);
        if (status === "completed" || status === "failed") break;
      }

      if (status !== "completed") {
        throw new Error(status === "failed" ? "Render failed on the server" : "Render timed out");
      }

      const token = getAccessToken();
      const mediaUrl = `${resolveBaseGatewayUrl()}/content/${id}/media?variant=render`;
      const res = await fetch(mediaUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
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

      setIsDirty(false);
      toast.success("Render ready — download started", { id: "render-clip" });
      triggerHaptic("success");
    } catch (err: any) {
      console.error(err);
      toast.error("Render failed", {
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
    const timer = setTimeout(() => {
      isLoaded.current = true;
    }, 400);
    return () => clearTimeout(timer);
  }, [id]);

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
  }, [trimStart, trimEnd, selectedTrackId, topText, bottomText, topOverlay, bottomOverlay, memeCaptionStyle, captionFontId, title, description, prompt, hooks, silenceEnabled, hashtags, isNoiseReduced, colorCorrection, clipVolume, musicVolume, masterVolume, appliedTransitions, id, saveClipEditToServer]);

  // Track if any changes have been made (making the editor "dirty")
  useEffect(() => {
    if (isLoaded.current) {
      setIsDirty(true);
    }
  }, [trimStart, trimEnd, selectedTrackId, topText, bottomText, topOverlay, bottomOverlay, memeCaptionStyle, captionFontId, title, description, hooks, silenceEnabled, hashtags, colorCorrection, isNoiseReduced, clipVolume, musicVolume, masterVolume]);

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

  const generateTransitionSuggestions = async () => {
    setIsGeneratingTransitions(true);
    try {
      if (!id) throw new Error("Missing clip id");
      const window = polishWindow(finalTrim, trimStart, trimEnd);
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
      }
    } catch (error) {
      console.error("Error generating transitions:", error);
      toast.error("Transition suggestions failed", {
        description: formatClipApiError(error, "Enhance transitions are preview-only."),
      });
    } finally {
      setIsGeneratingTransitions(false);
    }
  };

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

  const applyTransitionPreview = (s: { time: number; type: string; caption?: string; sfx?: string }) => {
    const abs = Math.min(enhanceClipWindow.end - 0.05, enhanceClipWindow.start + Math.max(0, s.time));
    seekVideo(abs);
    setTransitionPreviewType(s.type);
    setAppliedTransitions((prev) => {
      const next = prev.filter((p) => !(p.time === s.time && p.type === s.type));
      return [...next, s];
    });
    if (transitionPreviewTimerRef.current) {
      window.clearTimeout(transitionPreviewTimerRef.current);
    }
    transitionPreviewTimerRef.current = window.setTimeout(() => {
      setTransitionPreviewType(null);
      transitionPreviewTimerRef.current = null;
    }, 850);
    const el = videoRef.current;
    if (el?.paused) {
      void togglePlayback();
    }
    toast.success(
      t("clip_editor.polish.enhance.transition_preview", {
        defaultValue: "Previewing {{type}} at {{time}}",
        type: s.type,
        time: formatTime(s.time),
      }),
      {
        description: t("clip_editor.polish.enhance.transition_preview_note", {
          defaultValue: "Preview is live on the 9:16 player. Burn-in in the export is coming next.",
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
        description="Trim, polish, and enhance your clips with AI. Captions, transitions, and niche-aligned polish from your onboarding plan."
      />
      <StudioPlanBanner
        toolLabel="Clip Studio"
        categoryLabel={categoryLabel}
        niches={niches}
        hasWeekPlan={hasWeekPlan}
        dueToday={dueToday}
        onApplyDue={() => {
          const brief = applyDuePrompt();
          if (brief) {
            setPrompt(brief);
            toast.success("Today’s coach brief applied to polish");
          }
        }}
        onRequestNicheChange={() => setNicheDialogOpen(true)}
        nicheDialogOpen={nicheDialogOpen}
        onNicheDialogOpenChange={setNicheDialogOpen}
        onConfirmNicheChange={confirmNicheChange}
      />
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 sm:gap-6 md:gap-12 mb-8 md:mb-12 overflow-x-auto py-2 no-scrollbar">
          {[
            { id: "upload", label: t('clip_editor.steps.upload'), icon: CheckCircle2, active: true, done: true, clickable: false },
            { id: "trim", label: t('clip_editor.steps.trim'), icon: Scissors, active: step === "trim", done: step !== "trim", clickable: true },
            { id: "polish", label: t('clip_editor.steps.polish'), icon: Sparkles, active: step === "polish", done: false, clickable: true },
          ].map((s, i) => (
            <button
              key={s.id}
              type="button"
              disabled={!s.clickable}
              onClick={() => {
                if (!s.clickable) return;
                mergeSearchParams({ step: s.id });
              }}
              className={cn(
                "flex items-center gap-2 sm:gap-3 shrink-0",
                s.clickable ? "cursor-pointer hover:opacity-90" : "cursor-default",
              )}
            >
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border-2 transition-all shrink-0 ${
                s.active ? "bg-primary border-primary text-primary-foreground shadow-lg" : 
                s.done ? "bg-muted border-border text-primary" : "bg-background border-border text-muted-foreground"
              }`}>
                <s.icon size={16} className="md:w-[18px] md:h-[18px]" />
              </div>
              <span className={`text-[10px] md:text-sm font-bold whitespace-nowrap ${s.active ? "text-foreground" : "text-muted-foreground"}`}>
                {s.label}
              </span>
              {i < 2 && <div className="w-4 sm:w-8 md:w-12 h-0.5 bg-border ml-2 sm:ml-4 md:ml-6" />}
            </button>
          ))}
        </div>

        {step === "trim" && (
          <div className="space-y-8">
            {/* Video Player Area */}
            <div className="aspect-video bg-background rounded-xl overflow-hidden relative group shadow-soft-xl border border-border">
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
                      const span = Math.max(0.4, trimEnd - trimStart);
                      setReviewProgress(Math.min(100, Math.max(0, ((t - trimStart) / span) * 100)));
                      if (t >= trimEnd - 0.08 && !reviewAdvanceLockRef.current) {
                        reviewAdvanceLockRef.current = true;
                        e.currentTarget.pause();
                        void startPolishing();
                      }
                      return;
                    }
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
              
              {/* Tap to Play overlay for mobile */}
              <div 
                className="absolute inset-0 cursor-pointer"
                onClick={() => void togglePlayback()}
              />
              
              {/* Controls Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-black/95 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
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
                    className="relative h-14 md:h-16 bg-muted group/timeline cursor-pointer min-w-full transition-[width] duration-300 ease-out"
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
                        className="absolute inset-y-0 z-10 w-8 -translate-x-1/2 group/marker"
                        style={{ left: `${(marker.time / Math.max(0.5, DURATION)) * 100}%` }}
                        title={`${t(`clip_editor.trim.markers.${marker.label}`, { defaultValue: marker.label.replace(/_/g, " ") })} · ${formatTime(marker.time)} — ${t(`clip_editor.trim.marker_roles.${marker.label}`, { defaultValue: beatPurpose(marker.label) })}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          seekVideo(marker.time);
                        }}
                      >
                        <span className="absolute inset-y-1 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--color-primary),0.6)]" />
                        <span className="absolute top-0 left-1/2 -translate-x-1/2">
                          <Zap size={10} className="text-primary fill-primary" />
                        </span>
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-sm bg-primary/90 px-1 text-[7px] font-black uppercase text-primary-foreground">
                          {t(`clip_editor.trim.markers.${marker.label}`, {
                            defaultValue: marker.label.replace(/_/g, " "),
                          })}
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
                        {t("clip_editor.trim.scan_results", { defaultValue: "Highlight beats" })}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        {t("clip_editor.trim.scan_help", {
                          defaultValue:
                            "These marks are the story of the clip: open on the hook, keep the peak, cut after the close. Click a beat to jump there. Drag handles snap to them.",
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
                      {t("clip_editor.trim.trim_to_beats", { defaultValue: "Trim to these beats" })}
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
                    defaultValue: "AI Scan marks hook, peak, and close so you know what to keep — it does not cut the clip by itself.",
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
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 pb-32 md:pb-0">
              {/* Preview Column */}
              <div className="lg:col-span-2 space-y-4 md:space-y-6">
                <div className="w-full max-w-[320px] sm:max-w-[340px] md:max-w-[420px] mx-auto space-y-3">
                <div
                  ref={polishPreviewRef}
                  className="aspect-[9/16] w-full bg-background rounded-xl overflow-hidden relative shadow-soft-2xl border border-border group"
                >
                {videoSrc ? (
                  <div className="w-full h-full" style={previewFilterStyle}>
                  <video
                    ref={videoRef}
                    src={videoSrc}
                    className="w-full h-full object-cover transform-gpu"
                    muted={false}
                    playsInline
                    controls={false}
                    onLoadedMetadata={(e) => {
                      const start = finalTrim?.start ?? trimStart;
                      const end = finalTrim?.end ?? trimEnd;
                      e.currentTarget.currentTime = start;
                      setCurrentTime(start);
                      applyPreviewMix();
                    }}
                    onTimeUpdate={(e) => {
                      const start = finalTrim?.start ?? trimStart;
                      const end = finalTrim?.end ?? trimEnd;
                      const tNow = e.currentTarget.currentTime;
                      setCurrentTime(tNow);
                      if (tNow >= end - 0.05) {
                        e.currentTarget.currentTime = start;
                        setCurrentTime(start);
                        if (mixBgmRef.current) mixBgmRef.current.currentTime = 0;
                      }
                    }}
                    onPlay={() => {
                      setIsPlaying(true);
                      setPreviewingTrackId(null);
                    }}
                    onPause={() => {
                      setIsPlaying(false);
                      mixBgmRef.current?.pause();
                    }}
                  />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                    {videoLoading ? "Loading preview…" : "No clip media yet"}
                  </div>
                )}

                <TransitionPreviewOverlay type={transitionPreviewType} />

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
                  {formatTime(Math.max(0, currentTime - (finalTrim?.start ?? trimStart)))}
                  {" / "}
                  {formatTime((finalTrim?.end ?? trimEnd) - (finalTrim?.start ?? trimStart))}
                </div>

                {enhanceShowOriginal || isNoiseReduced || colorCorrection > 0 ? (
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
                <div className="absolute top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0 pointer-events-none">
                  <div className="px-4 py-2 bg-popover/80 backdrop-blur-xl rounded-md border border-border shadow-soft-xl flex items-center gap-2">
                    <Sparkles size={14} className="text-primary animate-pulse" />
                    <span className="text-[10px] font-bold text-foreground">Live clip preview</span>
                  </div>
                </div>
                
                {/* Caption / hook overlays from editor state */}
                {hooks[0]?.text ? (
                  <div className="absolute top-24 left-0 right-0 px-6 text-center pointer-events-none">
                    <div
                      className="inline-block bg-black/70 text-yellow-300 text-lg py-2 px-4 rounded-md"
                      style={{ fontFamily: clipCaptionFontCss(captionFontId), fontWeight: 700 }}
                    >
                      {hooks[0].text}
                    </div>
                  </div>
                ) : null}
                {topText ? (
                  <DraggableCaptionOverlay
                    text={topText}
                    xPct={topOverlay.x}
                    yPct={topOverlay.y}
                    onChange={(x, y) => setTopOverlay({ x, y })}
                    fontFamily={clipCaptionFontCss(captionFontId)}
                    stageRef={polishPreviewRef}
                    label={t("clip_editor.polish.meme.top_text")}
                  />
                ) : null}
                {bottomText ? (
                  <DraggableCaptionOverlay
                    text={bottomText}
                    xPct={bottomOverlay.x}
                    yPct={bottomOverlay.y}
                    onChange={(x, y) => setBottomOverlay({ x, y })}
                    fontFamily={clipCaptionFontCss(captionFontId)}
                    stageRef={polishPreviewRef}
                    label={t("clip_editor.polish.meme.bottom_text")}
                  />
                ) : null}
              </div>
                <Button
                  type="button"
                  size="lg"
                  className="w-full rounded-full font-bold h-11"
                  onClick={() => void togglePlayback()}
                  disabled={!videoSrc}
                >
                  {isPlaying ? <Pause size={18} fill="currentColor" className="mr-2" /> : <Play size={18} fill="currentColor" className="mr-2 ml-0.5" />}
                  {isPlaying
                    ? t("clip_editor.player.pause")
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
                        <div className="space-y-1.5">
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
                        </div>

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
                                  setHooks(res.hooks || []);
                                  toast.success(`Generated ${res.hooks?.length ?? 0} hooks`);
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
                              <span className="ml-1">{t('clip_editor.polish.details.generate_hooks', { defaultValue: 'Generate hooks' })}</span>
                            </Button>
                          </div>
                          {hooks.length > 0 ? (
                            <div className="space-y-2" id="clip-hooks-editor">
                              <label className="text-[10px] font-bold text-muted-foreground">
                                {t('clip_editor.polish.details.viral_hooks', { defaultValue: 'Viral hooks' })}
                              </label>
                              {hooks.map((h, idx) => (
                                <Input
                                  key={`${h.startMs}-${idx}`}
                                  value={h.text}
                                  onChange={(e) => {
                                    const next = [...hooks];
                                    next[idx] = { ...h, text: e.target.value.slice(0, 80) };
                                    setHooks(next);
                                  }}
                                  className="h-9 text-xs"
                                />
                              ))}
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
                              onChange={(e) => setTopText(e.target.value.slice(0, 50))}
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
                                    {appliedTransitions.some((p) => p.time === s.time && p.type === s.type)
                                      ? t("clip_editor.polish.enhance.applied_btn", { defaultValue: "Replay" })
                                      : t("clip_editor.polish.enhance.apply_btn")}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-8 border border-dashed border-border rounded-xl text-center space-y-3">
                              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                                <Layout size={20} />
                              </div>
                              <p className="text-xs text-muted-foreground font-medium">{t('clip_editor.polish.enhance.no_transitions')}</p>
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
                          {coachBeat
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
                <SocialPublishTargets
                  selected={socialPlatforms}
                  onChange={setSocialPlatforms}
                  disabled={isPublishing}
                />
                <Button 
                  size="default" 
                  onClick={openPublishPreview}
                  disabled={isPublishing}
                  className="w-full flex items-center justify-center gap-2 shadow-lg shadow-primary/20 rounded-full font-bold bg-primary hover:bg-primary-strong transition-all h-11"
                >
                  {isPublishing ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-background border-t-transparent rounded-full animate-spin mr-2" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      {t('clip_editor.polish.actions.publish')}
                      <ChevronRight size={18} />
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="default" 
                  onClick={() => void handleRenderDownload()}
                  disabled={isPublishing || isRendering}
                  className="w-full rounded-full font-bold transition-all h-11"
                >
                  {isRendering ? (
                    <>
                      <Loader2 size={18} className="mr-2 animate-spin" />
                      {renderStatus === "processing" || renderStatus === "queued"
                        ? "Rendering…"
                        : "Preparing…"}
                    </>
                  ) : (
                    <>
                      <Download size={18} className="mr-2" />
                      {t('clip_editor.polish.actions.download')}
                    </>
                  )}
                </Button>
              </div>

              {/* Mobile Sticky Footer */}
              <div className="lg:hidden space-y-3 pt-4 pb-24">
                <SocialPublishTargets
                  selected={socialPlatforms}
                  onChange={setSocialPlatforms}
                  disabled={isPublishing}
                />
              </div>
              <div className="lg:hidden fixed bottom-20 left-0 right-0 p-4 bg-background/95 backdrop-blur-xl border-t border-border z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 shadow-soft-xl">
                <div className="max-w-md mx-auto grid grid-cols-6 gap-2">
                  <Button 
                    onClick={() => void handleRenderDownload()}
                    className="col-span-1 rounded-xl border-border bg-muted/50 hover:bg-muted active:scale-95" 
                    variant="outline" 
                    size="icon-2xl"
                    disabled={isPublishing || isRendering}
                  >
                    {isRendering ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                  </Button>
                  <Button 
                    onClick={openPublishPreview}
                    size="2xl" 
                    disabled={isPublishing}
                    className="col-span-5 flex items-center justify-center gap-2 shadow-soft-lg rounded-xl font-bold text-sm bg-primary hover:bg-primary-strong transition-all active:scale-95 text-primary-foreground"
                  >
                    <div className="flex items-center gap-1.5 mr-1">
                      <SocialPlatformIcon platform="youtube" size={14} variant="mono" />
                      <SocialPlatformIcon platform="instagram" size={14} variant="mono" />
                      <SocialPlatformIcon platform="facebook" size={14} variant="mono" />
                      <SocialPlatformIcon platform="tiktok" size={14} variant="mono" />
                    </div>
                    {isPublishing ? "Publishing..." : t('clip_editor.polish.actions.publish_socials')}
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

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
                        setIsReviewingTrim(false);
                        if (reviewIntervalRef.current) {
                          clearInterval(reviewIntervalRef.current);
                          reviewIntervalRef.current = null;
                        }
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
