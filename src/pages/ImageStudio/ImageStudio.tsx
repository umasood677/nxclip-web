import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { 
  Sparkles, 
  Download, 
  RefreshCw, 
  X,
  Copy,
  Check,
  CheckCircle2
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { Badge } from "../../components/ui/badge";
import { generateImage, generateCaptions, generateTitle, AIError } from "../../services/aiService";
import {
  contentApi,
  ContentDto,
  RecommendMemeResponseDto,
  WeekPlanDto,
  resolveBaseGatewayUrl,
  extractValidImageUrl,
  contentMediaRevision,
  withContentMediaRevision,
  type SocialPlatform,
} from "../../services/apiClient";
import { SocialPublishTargets } from "../../components/social/SocialPublishTargets";
import { getAccessToken } from "../../services/auth/authService";
import { socketService } from "../../services/socketService";
import { SEO } from "../../components/SEO";
import { toast } from "sonner";
import { cn, compressImageBase64, safeStringify } from "../../lib/utils";
import { safeLocalStorage } from "../../lib/safeStorage";
import { GenerationHistoryItem, OrderedReferenceChip, ReferenceUploadItem } from "./types";
import { GeneratePanel } from "./components/GeneratePanel";
import { CanvasPanel } from "./components/CanvasPanel";
import { EditPanel } from "./components/EditPanel";
import { RecentGenerationsGallery } from "./components/RecentGenerations";
import {
  buildWeekPlanDays,
} from "./components/MemeWeekPlanCanvas";
import {
  MemeVoiceId,
  buildClientVoiceHumorClause,
  clipMemeVoiceForApi,
  resolveMemeVoice,
} from "./lib/memeVoice";
import { triggerHaptic } from "../../lib/vibration";
import { AuthenticatedImage } from "../../components/AuthenticatedImage";
import { DevTerminal, ApiCallLog } from "./components/DevTerminal";
import { extensionForMimeType, toDownloadableBlob } from "../../lib/imageDownload";
import { StudioPlanBanner } from "../../components/StudioPlanBanner";
import { useCreatorStudioContext } from "../../hooks/useCreatorStudioContext";
import { markPlanDayComplete } from "../../lib/weekPlanWorkflow";
import { clipImageFirstBannerCopy } from "../../lib/weekPlan";

/** Strip leading # so UI can safely render `#{tag}` without producing `##tag`. */
function normalizeHashtag(tag: string): string {
  return String(tag || "")
    .replace(/^#+/, "")
    .trim();
}

function normalizeHashtagSets(sets?: string[][] | null): string[][] {
  if (!Array.isArray(sets) || !sets.length) return [];
  return sets
    .map((set) =>
      (Array.isArray(set) ? set : [set])
        .map((tag) => normalizeHashtag(String(tag)))
        .filter(Boolean),
    )
    .filter((set) => set.length > 0);
}

function normalizeHashtagList(tags?: string[] | null): string[] {
  if (!Array.isArray(tags) || !tags.length) return [];
  return tags.map((tag) => normalizeHashtag(String(tag))).filter(Boolean);
}

const SUGGESTION_POOL = [
  "Modern product launch visual",
  "Founder portrait in a clean studio",
  "Cinematic travel poster",
  "Playful cartoon mascot",
  "Minimal gradient social ad",
  "Editorial fashion campaign",
  "Funny reaction meme",
  "Warm coffee shop scene",
  "Luxury packaging mockup",
  "Bold tech startup thumbnail",
  "Stylized anime landscape",
  "Dreamlike surreal artwork",
  "Food hero shot",
  "Nature documentary frame",
  "Creative fitness campaign"
];

/** Matches content-service plan-limits for FREE. */
const FREE_DAILY_GENERATION_LIMIT = 5;
const FREE_MAX_REFERENCE_IMAGES = 2;
const PRO_MAX_REFERENCE_IMAGES = 4;

function readUserPlan(): "FREE" | "PRO" | "STUDIO" {
  try {
    const token = getAccessToken();
    if (!token) return "FREE";
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    const plan = String(payload.plan || "FREE").toUpperCase();
    if (plan === "PRO" || plan === "STUDIO") return plan;
    return "FREE";
  } catch {
    return "FREE";
  }
}

function startOfUtcDayMs(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function estimateGenerationsLeft(items: GenerationHistoryItem[], plan: string): number | null {
  if (plan !== "FREE") return null; // unlimited / not metered in UI
  const since = startOfUtcDayMs();
  // Backend counts rows with prompt IS NOT NULL created today (UTC).
  const used = items.filter((item) => {
    if (!(item.prompt || "").trim()) return false;
    return item.timestamp >= since;
  }).length;
  return Math.max(0, FREE_DAILY_GENERATION_LIMIT - used);
}

/** Bust browser/CDN cache so regenerate of the same /content/{id}/media URL actually refreshes. */
function withCacheBust(url: string): string {
  if (!url) return url;
  try {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const u = new URL(url);
      u.searchParams.set("v", String(Date.now()));
      return u.toString();
    }
  } catch {
    // fall through
  }
  const cleaned = url.replace(/([?&])v=[^&]*/g, "").replace(/[?&]$/, "");
  const sep = cleaned.includes("?") ? "&" : "?";
  return `${cleaned}${sep}v=${Date.now()}`;
}

/**
 * Fetch media with cache:no-store and return a blob: URL so Studio preview
 * shows the new bytes after in-place regenerate (same /content/{id}/media path).
 */
async function resolveFreshMediaPreview(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    const baseGateway = resolveBaseGatewayUrl();
    let relative = url.trim();
    if (relative.startsWith("http://") || relative.startsWith("https://")) {
      try {
        const u = new URL(relative);
        relative = u.pathname + u.search;
      } catch {
        relative = relative.replace(/https?:\/\/[^/]+/, "");
      }
    }
    if (!relative.startsWith("/")) relative = `/${relative}`;

    const isGateway =
      relative.startsWith("/content/") ||
      relative.includes("/content/") ||
      relative.startsWith("/api/gateway");
    // Content-service absolute media URLs (Cloud Run) still share the /content/{id}/media path.
    if (
      !isGateway &&
      !url.includes("api-gateway") &&
      !url.includes("nxclip") &&
      !url.includes("content-service") &&
      !/\/content\/[^/]+\/media/.test(url)
    ) {
      return null;
    }

    const token = getAccessToken();
    const busted = withCacheBust(relative);
    const sep = busted.includes("?") ? "&" : "?";
    const proxyUrl = `/api/gateway-proxy${busted}${
      token ? `${sep}token=${encodeURIComponent(token)}` : ""
    }`;

    const res = await fetch(proxyUrl, {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob || blob.size < 32) return null;
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

const STYLE_SPECIFIC_SUGGESTIONS: Record<string, string[]> = {
  realistic: [
    "Ultra-detailed portrait of a founder in a modern studio",
    "High-resolution landscape of a Scandinavian fjord",
    "Close-up product photograph of a premium smartwatch",
    "Professional photograph of a modern desert villa",
    "Macro shot of a butterfly on a vibrant flower"
  ],
  cinematic: [
    "Wide shot of an abandoned space colony on a red planet",
    "Dramatic silhouette of a traveler standing against a sunset",
    "Rain-slicked futuristic city street at blue hour",
    "Moodily lit fantasy library with floating candles",
    "Luxury product reveal with dramatic spotlight"
  ],
  cartoon: [
    "Cutesy 3D render of a baby dragon eating a taco",
    "Stylized 2D character welcoming users to an app",
    "Colorful whimsical village made of giant candy",
    "Vector art mascot for a tech startup",
    "Retro Saturday morning cartoon style superhero"
  ],
  pixel_art: [
    "16-bit adventure hero standing at a castle gate",
    "Retro city plaza with animated billboards",
    "Pixel spaceship flying through a starfield",
    "Isometric creative studio with tiny desk props",
    "8-bit platform scene with glowing portal"
  ],
  meme: [
    "Distorted surreal humor image with a confused cat",
    "Classic reaction meme about shipping fast",
    "Deep-fried aesthetic of a common household object",
    "Wholesome drawing of a supportive animal friend",
    "Relatable late-night work meme"
  ]
};

export default function ImageStudio() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const navigate = useNavigate();
  const location = useLocation();

  const STYLE_PRESETS = [
    { id: "realistic", label: t('image_studio.style_presets.realistic') },
    { id: "cinematic", label: t('image_studio.style_presets.cinematic') },
    { id: "cartoon", label: t('image_studio.style_presets.cartoon') },
    { id: "pixel_art", label: "Pixel Art" },
    { id: "meme", label: t('image_studio.style_presets.meme') },
  ];
  const [mode, setMode] = useState<"image" | "meme">("image");
  const studioTool = mode === "meme" ? "meme" : "image";
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
  } = useCreatorStudioContext(studioTool);
  const [memeMode, setMemeModeState] = useState<"ai" | "template" | "hybrid">("ai");
  const setMemeMode = (next: "ai" | "template" | "hybrid") => {
    setMemeModeState(next);
    // Pure template cannot refine the previous draft in place.
    if (next === "template") setForceNewGenerate(true);
  };
  const [memeTemplates, setMemeTemplates] = useState<import("../../services/apiClient").MemeTemplateDto[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [slotTexts, setSlotTexts] = useState<Record<string, string>>({});
  const [isSuggestingMemeCopy, setIsSuggestingMemeCopy] = useState(false);
  const [memeJokeVariants, setMemeJokeVariants] = useState<Array<Record<string, string>>>([]);
  const [memeJokeVariantIndex, setMemeJokeVariantIndex] = useState(0);
  const [memeRecommendations, setMemeRecommendations] =
    useState<RecommendMemeResponseDto | null>(null);
  const [isRecommendingMemes, setIsRecommendingMemes] = useState(false);
  const [weekPlanCanvasOpen, setWeekPlanCanvasOpen] = useState(false);
  const [weekPlanSelectedIndex, setWeekPlanSelectedIndex] = useState(0);
  const [activeWeekPlan, setActiveWeekPlan] = useState<WeekPlanDto | null>(null);
  const [isActivatingWeekPlan, setIsActivatingWeekPlan] = useState(false);
  const [isCancellingWeekPlan, setIsCancellingWeekPlan] = useState(false);
  const [memeBrandName, setMemeBrandName] = useState("");
  const [memeVoiceIds, setMemeVoiceIds] = useState<MemeVoiceId[]>(["elegant"]);
  const [memeCustomVoice, setMemeCustomVoice] = useState("");
  const [memeHumorIntensity, setMemeHumorIntensity] = useState(2);
  /** Queued rewrite slots applied after selectedTemplateId effect rebuilds keys. */
  const pendingRewriteSlotsRef = useRef<Record<string, string> | null>(null);
  const recommendDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolvedMemeVoice = resolveMemeVoice(memeVoiceIds, memeCustomVoice);

  useEffect(() => {
    if (!memeBrandName.trim() && categoryLabel) {
      setMemeBrandName(categoryLabel.slice(0, 48));
    }
  }, [categoryLabel, niches]);
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [style, setStyle] = useState("cinematic");
  const [aspectRatio, setAspectRatio] = useState("1:1");

  const [searchParams] = useSearchParams();
  const [activeSuggestions, setActiveSuggestions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    refreshSuggestions();
  }, [style]);

  const refreshSuggestions = () => {
    const pool = STYLE_SPECIFIC_SUGGESTIONS[style] || SUGGESTION_POOL;
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    setActiveSuggestions(shuffled.slice(0, 8));
  };
  const [error, setError] = useState<string | null>(null);
  const [isQuickEditOpen, setIsQuickEditOpen] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [variations, setVariations] = useState<string[]>([]);
  const [history, setHistory] = useState<GenerationHistoryItem[]>([]);
  const [libraryImages, setLibraryImages] = useState<GenerationHistoryItem[]>([]);

  // Developer Console / Terminal state
  const [apiLogs, setApiLogs] = useState<ApiCallLog[]>([]);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isTerminalMinimized, setIsTerminalMinimized] = useState(false);
  const [currentTraceId, setCurrentTraceId] = useState<string>("");

  const addApiLog = (method: "GET" | "POST" | "PUT" | "DELETE" | "WS", url: string, requestPayload?: any, traceIdOverride?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const traceId = traceIdOverride || currentTraceId || `trace_client_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    if (!currentTraceId && !traceIdOverride) {
      setCurrentTraceId(traceId);
    }

    // Resolve complete absolute addresses for real-time trace logging
    const cleanSubPath = url.replace(/^\/+/, "");
    const baseGatewayUrl = resolveBaseGatewayUrl();
    const clientOrigin = typeof window !== "undefined" ? window.location.origin : "";
    const proxyUrl = `${clientOrigin}/api/gateway-proxy/${cleanSubPath}`;
    
    let resolvedUrl = `${baseGatewayUrl.replace(/\/+$/, "")}/${cleanSubPath}`;
    let routedService = "Cloud Gateway Proxy";

    if (baseGatewayUrl.includes("localhost") || baseGatewayUrl.includes("127.0.0.1")) {
      const isFeedEngagement = 
        /^(content|users)\/[^\/]+\/(like|comment|comments|follow|profile)/.test(cleanSubPath) ||
        cleanSubPath.startsWith("feed");

      if (isFeedEngagement) {
        resolvedUrl = `http://localhost:5003/${cleanSubPath}`;
        routedService = "Feed Service (Port 5003)";
      } else if (cleanSubPath.startsWith("auth") || cleanSubPath === "users/me" || cleanSubPath.startsWith("users/me/")) {
        resolvedUrl = `http://localhost:5001/${cleanSubPath}`;
        routedService = "Identity Service (Port 5001)";
      } else if (cleanSubPath.startsWith("content")) {
        resolvedUrl = `http://localhost:5002/${cleanSubPath}`;
        routedService = "Content Service (Port 5002)";
      } else if (cleanSubPath.startsWith("analytics")) {
        resolvedUrl = `http://localhost:5005/${cleanSubPath}`;
        routedService = "Analytics Service (Port 5005)";
      } else if (cleanSubPath.startsWith("notifications")) {
        resolvedUrl = `http://localhost:5006/${cleanSubPath}`;
        routedService = "Notification Service (Port 5006)";
      } else if (cleanSubPath.startsWith("ai-coach")) {
        resolvedUrl = `http://localhost:5004/${cleanSubPath}`;
        routedService = "AI Coach Service (Port 5004)";
      } else if (cleanSubPath.startsWith("users/")) {
        if (cleanSubPath.endsWith("/profile")) {
          resolvedUrl = `http://localhost:5003/${cleanSubPath}`;
          routedService = "Feed Service (Port 5003)";
        } else {
          resolvedUrl = `http://localhost:5001/${cleanSubPath}`;
          routedService = "Identity Service (Port 5001)";
        }
      } else {
        routedService = "Local Gateway (Port 5000)";
      }
    } else {
      const isFeedEngagement = 
        /^(content|users)\/[^\/]+\/(like|comment|comments|follow|profile)/.test(cleanSubPath) ||
        cleanSubPath.startsWith("feed");
      
      if (isFeedEngagement) {
        routedService = "Cloud Feed Split Service";
      } else {
        routedService = "Production Cloud Gateway";
      }
    }

    const newLog: ApiCallLog = {
      id,
      timestamp: new Date().toISOString(),
      method,
      url,
      status: "pending",
      requestPayload,
      traceId,
      proxyUrl,
      resolvedUrl,
      routedService
    };
    setApiLogs(prev => [...prev, newLog]);
    return { id, traceId };
  };

  const updateApiLogSuccess = (id: string, statusCode: number, responsePayload: any, message?: string) => {
    setApiLogs(prev => prev.map(log => log.id === id ? {
      ...log,
      status: "success",
      statusCode,
      responsePayload,
      message,
      duration: Date.now() - new Date(log.timestamp).getTime()
    } : log));
  };

  const updateApiLogFailed = (id: string, statusCode: number, responsePayload: any, message?: string) => {
    setApiLogs(prev => prev.map(log => log.id === id ? {
      ...log,
      status: "failed",
      statusCode,
      responsePayload,
      message,
      duration: Date.now() - new Date(log.timestamp).getTime()
    } : log));
  };

  const fetchHistoryFromContentApi = async () => {
    try {
      // Generations-only page (no uploads crowding) + full mine for reference picker.
      const [studioList, contentList] = await Promise.all([
        contentApi.getUserContentList(100, undefined, { excludeUploads: true }),
        contentApi.getUserContentList(200),
      ]);
      if (!Array.isArray(contentList)) {
        setHistory([]);
        setLibraryImages([]);
        return;
      }

      const mapItem = (item: ContentDto): GenerationHistoryItem => {
        let itemTimestamp = Date.now();
        if (item.createdAt) {
          const parsedTime = new Date(item.createdAt).getTime();
          if (!isNaN(parsedTime)) itemTimestamp = parsedTime;
        }
        const baseUrl = extractValidImageUrl(item) || item.thumbnailUrl || item.cdnUrl || "";
        // extractValidImageUrl already revision-busts; keep mediaRevision for React keys.
        const mediaRevision = contentMediaRevision(item);
        const url = baseUrl.includes("v=")
          ? baseUrl
          : withContentMediaRevision(baseUrl, mediaRevision);
        const styleFromDesc = item.description?.includes("Generated style:")
          ? item.description.split("Generated style:")[1]?.split("with ratio:")[0]?.trim()
          : undefined;
        return {
          id: item.id,
          url,
          title: (item.title || "").trim() || undefined,
          prompt: (item.prompt || item.refinePrompt || item.basePrompt || "").trim(),
          basePrompt: (item.basePrompt || item.prompt || "").trim() || undefined,
          refinePrompt: (item.refinePrompt || "").trim() || undefined,
          type:
            item.contentType === "meme" ||
            item.style === "meme" ||
            Boolean(item.memeSpec)
              ? "meme"
              : "image",
          style: item.style || styleFromDesc || undefined,
          status: item.status,
          aspectRatio: item.aspectRatio,
          watermarked: item.watermarked,
          storageKey: item.storageKey,
          mediaRevision,
          captions: item.captions,
          hashtagSets: item.hashtagSets,
          memeSpec: item.memeSpec,
          timestamp: itemTimestamp,
        };
      };

      const isStudioGeneration = (item: GenerationHistoryItem) => {
        const key = item.storageKey || "";
        if (key.startsWith("uploads/")) return false;
        if (key.startsWith("generated/")) return true;
        if ((item.prompt || item.basePrompt || "").trim().length >= 3) return true;
        if (Array.isArray(item.captions) && item.captions.length > 0) return true;
        if (item.style) return true;
        return false;
      };

      const libraryMapped = contentList
        .filter((item) => item && item.status !== "deleted" && item.contentType !== "clip")
        .map(mapItem)
        .filter((item) => Boolean(item.url))
        .sort((a, b) => b.timestamp - a.timestamp);

      const studioMapped = (Array.isArray(studioList) ? studioList : [])
        .filter((item) => item && item.status !== "deleted" && item.contentType !== "clip")
        .map(mapItem)
        .filter((item) => Boolean(item.url) && isStudioGeneration(item))
        .sort((a, b) => b.timestamp - a.timestamp);

      setLibraryImages(libraryMapped);
      setHistory(studioMapped.length > 0 ? studioMapped : libraryMapped.filter(isStudioGeneration));
      const plan = readUserPlan();
      const left = estimateGenerationsLeft(
        [...studioMapped, ...libraryMapped.filter((i) => (i.prompt || "").trim())],
        plan,
      );
      if (left !== null) {
        setGenerationsLeft(left);
        safeLocalStorage.setItem("nxclip_generations_left", String(left));
      } else {
        setGenerationsLeft(null);
      }
    } catch (err) {
      console.error("Failed to load history from Content API:", err);
    }
  };

  useEffect(() => {
    fetchHistoryFromContentApi();

    void (async () => {
      try {
        const res = await contentApi.getMemeTemplates();
        setMemeTemplates(res.items || []);
        if (res.items?.[0] && !selectedTemplateId) {
          setSelectedTemplateId(res.items[0].id);
        }
      } catch (err) {
        console.warn("Failed to load meme templates", err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedTemplateId) return;
    const tpl = memeTemplates.find((t) => t.id === selectedTemplateId);
    if (!tpl) return;
    const pending = pendingRewriteSlotsRef.current;
    pendingRewriteSlotsRef.current = null;
    setSlotTexts((prev) => {
      const next: Record<string, string> = {};
      for (const slot of tpl.slots) {
        const raw =
          pending && Object.prototype.hasOwnProperty.call(pending, slot.id)
            ? pending[slot.id]
            : prev[slot.id] || "";
        next[slot.id] = String(raw || "").slice(0, slot.maxLength);
      }
      return next;
    });
    // Keep the user's ratio if the template supports it; otherwise fall back to
    // the template default so the preview and composed output stay in sync.
    setAspectRatio((current) =>
      tpl.supportedAspectRatios.includes(current as (typeof tpl.supportedAspectRatios)[number])
        ? current
        : tpl.defaultAspectRatio,
    );
  }, [selectedTemplateId, memeTemplates]);

  // Switching into template/hybrid mode can leave an unsupported ratio selected.
  useEffect(() => {
    if (mode !== "meme" || memeMode === "ai") return;
    const tpl = memeTemplates.find((t) => t.id === selectedTemplateId);
    if (!tpl) return;
    if (!tpl.supportedAspectRatios.includes(aspectRatio as (typeof tpl.supportedAspectRatios)[number])) {
      setAspectRatio(tpl.defaultAspectRatio);
    }
  }, [mode, memeMode, selectedTemplateId, memeTemplates, aspectRatio]);

  const setSlotText = (slotId: string, value: string) => {
    setSlotTexts((prev) => ({ ...prev, [slotId]: value }));
  };

  const applyMemeJokeSuggestion = (
    suggestion: Record<string, string>,
    slotId?: string,
  ) => {
    const tpl = memeTemplates.find((t) => t.id === selectedTemplateId);
    if (!tpl) return;
    const next: Record<string, string> = { ...slotTexts };
    if (slotId) {
      const value = suggestion[slotId];
      if (typeof value === "string" && value.trim()) {
        const slot = tpl.slots.find((s) => s.id === slotId);
        next[slotId] = value.slice(0, slot?.maxLength ?? 120);
      }
    } else {
      for (const slot of tpl.slots) {
        const value = suggestion[slot.id];
        if (typeof value === "string" && value.trim()) {
          next[slot.id] = value.slice(0, slot.maxLength);
        }
      }
    }
    setSlotTexts(next);
  };

  const handleSuggestMemeCopy = async (opts?: { slotId?: string }) => {
    if (!selectedTemplateId || isSuggestingMemeCopy) return;

    // Cycle local variants from the last fetch before hitting the API again.
    if (memeJokeVariants.length > 1) {
      const nextIndex = (memeJokeVariantIndex + 1) % memeJokeVariants.length;
      setMemeJokeVariantIndex(nextIndex);
      applyMemeJokeSuggestion(memeJokeVariants[nextIndex], opts?.slotId);
      toast.success(opts?.slotId ? "Tried another line for this slot" : "Tried another copy set");
      return;
    }

    if (memeJokeVariants.length === 1 && opts?.slotId) {
      applyMemeJokeSuggestion(memeJokeVariants[0], opts.slotId);
      toast.success("Slot copy applied");
      return;
    }

    setIsSuggestingMemeCopy(true);
    try {
      const res = await contentApi.suggestMemeCopy({
        templateId: selectedTemplateId,
        // API caps idea at 280 — long hybrid scene prompts must be clipped.
        idea: prompt.trim().slice(0, 280) || undefined,
        brandName: memeBrandName.trim() || undefined,
        brandPersonality: clipMemeVoiceForApi(resolvedMemeVoice, 120) || undefined,
        humorIntensity: memeHumorIntensity,
      });
      const suggestions = Array.isArray(res.suggestions) ? res.suggestions : [];
      if (!suggestions.length) {
        toast.error("No copy suggestions returned");
        return;
      }
      setMemeJokeVariants(suggestions);
      setMemeJokeVariantIndex(0);
      applyMemeJokeSuggestion(suggestions[0], opts?.slotId);
      toast.success(
        opts?.slotId
          ? "Slot copy generated"
          : suggestions.length > 1
            ? "Copy applied — click again for another"
            : "Copy applied",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate copy");
    } finally {
      setIsSuggestingMemeCopy(false);
    }
  };

  const handleRecommendMemes = async (opts?: { silent?: boolean }) => {
    if (isRecommendingMemes) return;
    const idea =
      prompt.trim() ||
      (Object.values(slotTexts) as string[])
        .map((value) => value.trim())
        .filter(Boolean)
        .join(" ");
    if (!idea) {
      if (!opts?.silent) toast.info("Add an idea or prompt first");
      return;
    }

    setIsRecommendingMemes(true);
    const personality =
      clipMemeVoiceForApi(
        resolvedMemeVoice || niches.slice(0, 3).join(", "),
        // Cloud content-service still enforces 80 until redeployed with MaxLength(160).
        80,
      ) || undefined;
    const payload = {
      idea: idea.slice(0, 280),
      imageDescription: prompt.trim().slice(0, 500) || undefined,
      brandName: (memeBrandName.trim() || categoryLabel || "").slice(0, 80) || undefined,
      brandPersonality: personality,
      humorIntensity: memeHumorIntensity,
      contentId: currentContentId || undefined,
      sceneTags: [
        ...(categoryLabel ? [categoryLabel.toLowerCase().replace(/\s+/g, "_")] : []),
        ...niches.map((n) => n.toLowerCase().replace(/\s+/g, "_")),
      ].slice(0, 8),
      limit: 5,
      fanOut: 12,
    };
    const { id: logId } = addApiLog("POST", "/content/meme/recommend", payload);
    try {
      const response = await contentApi.recommendMemes(payload);
      setMemeRecommendations(response);
      updateApiLogSuccess(logId, 200, response, "AI creative direction ready");
      if (!opts?.silent) {
        toast.success("Creative direction ready", {
          description: `${response.rankings.length} of ${response.fanOutConsidered} layouts · ${response.visionSource || "text_only"}`,
        });
      }
    } catch (err) {
      updateApiLogFailed(
        logId,
        (err as { statusCode?: number })?.statusCode || 500,
        err,
        "Creative direction failed",
      );
      if (!opts?.silent) {
        toast.error(
          err instanceof Error ? err.message : "Failed to analyze meme layouts",
        );
      }
    } finally {
      setIsRecommendingMemes(false);
    }
  };

  const handleChooseMemeRecommendation = (
    templateId: string,
    slots: Record<string, string>,
  ) => {
    const template = memeTemplates.find((item) => item.id === templateId);
    if (!template) return;
    const next: Record<string, string> = {};
    for (const slot of template.slots) {
      next[slot.id] = (slots[slot.id] || "").slice(0, slot.maxLength);
    }
    // Same template: the selection effect won't re-run, so apply slots now.
    // Different template: queue rewrite so the selection effect merges after
    // rebuilding slot keys (avoids a race that can wipe the rewrite).
    if (templateId === selectedTemplateId) {
      pendingRewriteSlotsRef.current = null;
      setSlotTexts(next);
    } else {
      pendingRewriteSlotsRef.current = next;
      setSelectedTemplateId(templateId);
    }
    setAspectRatio((current) =>
      template.supportedAspectRatios.includes(
        current as (typeof template.supportedAspectRatios)[number],
      )
        ? current
        : template.defaultAspectRatio,
    );
    triggerHaptic("light");
    toast.success(`${template.name} direction applied`);
  };

  const weekPlanDays = buildWeekPlanDays(
    memeRecommendations,
    activeWeekPlan,
    memeTemplates,
  );

  useEffect(() => {
    if (mode !== "meme" || memeMode === "ai") return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await contentApi.getActiveWeekPlan();
        if (!cancelled) setActiveWeekPlan(res.plan || null);
      } catch {
        if (!cancelled) setActiveWeekPlan(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, memeMode]);

  const handleOpenWeekPlan = () => {
    if (!weekPlanDays.length) {
      toast.info("Run Direct my post first to build a 7-day plan");
      return;
    }
    setWeekPlanSelectedIndex(0);
    setWeekPlanCanvasOpen(true);
  };

  const handleActivateWeekPlan = async () => {
    if (!memeRecommendations?.calendarPlan?.length || isActivatingWeekPlan) return;
    if (activeWeekPlan) {
      toast.message("Cancel the active plan before activating a new one");
      return;
    }
    setIsActivatingWeekPlan(true);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const res = await contentApi.createWeekPlan({
        timezone,
        idea: prompt.trim().slice(0, 280) || undefined,
        brandName: memeBrandName.trim() || undefined,
        brandPersonality: clipMemeVoiceForApi(resolvedMemeVoice, 120) || undefined,
        humorIntensity: memeHumorIntensity,
        aspectRatio: (aspectRatio as "1:1" | "16:9" | "9:16" | "4:5") || "9:16",
        slots: memeRecommendations.calendarPlan.map((slot) => {
          const rewrite = memeRecommendations.rewrites.find(
            (item) => item.templateId === slot.templateId,
          );
          return {
            day: slot.day,
            templateId: slot.templateId,
            templateName: slot.templateName,
            theme: slot.theme,
            hook: slot.hook,
            bestTimeLocal: slot.bestTimeLocal,
            platformTip: slot.platformTip,
            rewriteSlots: rewrite?.slots,
          };
        }),
      });
      setActiveWeekPlan(res.plan);
      toast.success("7-day plan activated", {
        description: "Drafts created — nxClip will auto-publish on the suggested days.",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to activate plan");
    } finally {
      setIsActivatingWeekPlan(false);
    }
  };

  const handleCancelWeekPlan = async () => {
    if (!activeWeekPlan || isCancellingWeekPlan) return;
    setIsCancellingWeekPlan(true);
    try {
      const res = await contentApi.cancelWeekPlan(activeWeekPlan.id);
      setActiveWeekPlan(res.plan.status === "active" ? res.plan : null);
      toast.success("Plan cancelled", {
        description: "Remaining scheduled publishes were skipped.",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel plan");
    } finally {
      setIsCancellingWeekPlan(false);
    }
  };

  const handleUseWeekPlanDay = () => {
    const day = weekPlanDays[weekPlanSelectedIndex];
    if (!day) return;
    handleChooseMemeRecommendation(day.templateId, day.slots);
    setWeekPlanCanvasOpen(false);
  };

  // Reset joke cycle when template or prompt idea changes.
  useEffect(() => {
    setMemeJokeVariants([]);
    setMemeJokeVariantIndex(0);
  }, [selectedTemplateId, prompt]);

  // Auto-recommend when the idea settles (template/hybrid meme modes only).
  useEffect(() => {
    if (mode !== "meme" || memeMode === "ai") return;
    const idea =
      prompt.trim() ||
      Object.values(slotTexts).some((value) => value.trim());
    if (!idea || prompt.trim().length < 8) return;
    if (recommendDebounceRef.current) clearTimeout(recommendDebounceRef.current);
    recommendDebounceRef.current = setTimeout(() => {
      void handleRecommendMemes({ silent: true });
    }, 900);
    return () => {
      if (recommendDebounceRef.current) clearTimeout(recommendDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional debounce on prompt/brand/humor
  }, [prompt, memeBrandName, memeVoiceIds, memeCustomVoice, memeHumorIntensity, mode, memeMode]);

  useEffect(() => {
    safeLocalStorage.setItem("nexaclip_image_history", safeStringify(history));
  }, [history]);
  
  // Meme state
  const [topText, setTopText] = useState("");
  const [bottomText, setBottomText] = useState("");

  // Prompt enhancers (folded into prompt — not separate API fields)
  const [lighting, setLighting] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");

  // Reference images for generate / regenerate
  const [referenceContentIds, setReferenceContentIds] = useState<string[]>([]);
  const [referenceLibraryPreviews, setReferenceLibraryPreviews] = useState<Record<string, string>>({});
  const [referenceUploads, setReferenceUploads] = useState<ReferenceUploadItem[]>([]);
  /** When true, next Generate uses POST /content/generate (no previous image as base). */
  const [forceNewGenerate, setForceNewGenerate] = useState(false);
  const isUploadingReference = referenceUploads.some((u) => u.status === "uploading");
  const userPlan = readUserPlan();
  const maxReferences =
    userPlan === "FREE" ? FREE_MAX_REFERENCE_IMAGES : PRO_MAX_REFERENCE_IMAGES;
  const dailyGenerationLimit = userPlan === "FREE" ? FREE_DAILY_GENERATION_LIMIT : null;
  const referencePlanHint = userPlan === "FREE" ? "Free" : userPlan === "PRO" ? "Pro" : "Studio";
  const referenceUploadsRef = useRef(referenceUploads);
  referenceUploadsRef.current = referenceUploads;
  const hydratedNavKeyRef = useRef<string | null>(null);
  const planDayRef = useRef<string | null>(null);
  const forClipPlanRef = useRef(false);
  const [isClipPlanFlow, setIsClipPlanFlow] = useState(false);

  /** Ordered ready content IDs matching UI Image 1…N (uploads then library picks). */
  const orderedReadyReferenceIds = [
    ...referenceUploads
      .filter((u) => u.status === "ready" && u.id)
      .map((u) => u.id as string),
    ...referenceContentIds,
  ];

  const orderedReferenceChips: OrderedReferenceChip[] = [
    ...referenceUploads.map((u, idx) => ({
      key: `upload-${u.localId}`,
      label: `Image ${idx + 1}`,
      previewUrl: u.previewUrl,
      status: u.status,
      source: "upload" as const,
      removeId: u.localId,
    })),
    ...referenceContentIds.map((id, idx) => {
      const lib = libraryImages.find((h) => h.id === id);
      return {
        key: `library-${id}`,
        label: `Image ${referenceUploads.length + idx + 1}`,
        previewUrl: lib?.url || referenceLibraryPreviews[id] || "",
        status: "ready" as const,
        source: "library" as const,
        removeId: id,
      };
    }),
  ];

  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [generationsLeft, setGenerationsLeft] = useState<number | null>(null);
  const [caption, setCaption] = useState("");
  const [captionSuggestions, setCaptionSuggestions] = useState<string[]>([]);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  
  const [currentContentId, setCurrentContentId] = useState<string | null>(null);
  const [contentStatus, setContentStatus] = useState<string | null>(null);
  const [watermarked, setWatermarked] = useState(false);
  /** Preview AI-suggestions prompts — kept even when published remix clears currentContentId. */
  const [viewedBasePrompt, setViewedBasePrompt] = useState<string | undefined>();
  const [viewedRefinePrompt, setViewedRefinePrompt] = useState<string | undefined>();
  const [generatedHashtags, setGeneratedHashtags] = useState<string[][]>([]);
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [socialPlatforms, setSocialPlatforms] = useState<SocialPlatform[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isAnimatingAsClip, setIsAnimatingAsClip] = useState(false);
  const [animatePickerOpen, setAnimatePickerOpen] = useState(false);
  const [animateMode, setAnimateMode] = useState<"ken_burns" | "i2v">("ken_burns");
  const [motionPrompt, setMotionPrompt] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  /** True only after the preview image has finished loading (keeps captions behind the image). */
  const [previewReady, setPreviewReady] = useState(false);
  /** Canvas library browser for reference picking (opened from Generate panel). */
  const [libraryPickerOpen, setLibraryPickerOpen] = useState(false);
  const historySectionRef = useRef<HTMLDivElement | null>(null);
  const previewBlobUrlRef = useRef<string | null>(null);
  const publishWatchRef = useRef<{ contentId: string; done: boolean } | null>(null);

  const applyViewedPrompts = (item: {
    basePrompt?: string | null;
    refinePrompt?: string | null;
    prompt?: string | null;
  }) => {
    const base = (item.basePrompt || item.prompt || "").trim() || undefined;
    const refine = (item.refinePrompt || "").trim() || undefined;
    setViewedBasePrompt(base);
    // Keep refine even when it matches base so Last refine stays visible after reopen.
    setViewedRefinePrompt(refine);
  };

  const clearViewedPrompts = () => {
    setViewedBasePrompt(undefined);
    setViewedRefinePrompt(undefined);
  };

  const revokePreviewBlob = () => {
    if (previewBlobUrlRef.current) {
      URL.revokeObjectURL(previewBlobUrlRef.current);
      previewBlobUrlRef.current = null;
    }
  };

  const applyPreviewImage = async (mediaUrl: string) => {
    setPreviewReady(false);
    revokePreviewBlob();
    const fresh = await resolveFreshMediaPreview(mediaUrl);
    if (fresh) {
      previewBlobUrlRef.current = fresh;
      setResultImage(fresh);
      setVariations([fresh]);
      // Blob is local — mark ready so canvas leaves the baking state without waiting onLoad.
      setPreviewReady(true);
      return;
    }
    // Same /content/{id}/media path after refine — bust so AuthenticatedImage remounts.
    const busted = withCacheBust(mediaUrl);
    setResultImage(busted);
    setVariations([busted]);
  };

  useEffect(() => {
    return () => {
      referenceUploadsRef.current.forEach((u) => {
        if (u.previewUrl.startsWith("blob:")) URL.revokeObjectURL(u.previewUrl);
      });
      revokePreviewBlob();
    };
  }, []);

  const willCreateNewImage =
    forceNewGenerate ||
    !currentContentId ||
    isPublished ||
    contentStatus === "generation_failed" ||
    contentStatus === "published" ||
    // Pure template memes are deterministic; AI + hybrid refine the same draft.
    (mode === "meme" && memeMode === "template");

  const activeDraftItem = currentContentId
    ? history.find((h) => h.id === currentContentId)
    : undefined;
  // Prefer explicit viewed prompts so published remix (currentContentId=null) still shows Last refine.
  const draftBasePrompt = viewedBasePrompt ?? activeDraftItem?.basePrompt;
  const draftRefinePrompt = viewedRefinePrompt ?? activeDraftItem?.refinePrompt;

  const isMemeContent = (item: { contentType?: string; style?: string; type?: string }) =>
    item.contentType === "meme" ||
    item.style === "meme" ||
    item.type === "meme";

  const clearReferences = () => {
    referenceUploadsRef.current.forEach((u) => {
      if (u.previewUrl.startsWith("blob:")) URL.revokeObjectURL(u.previewUrl);
    });
    setReferenceUploads([]);
    setReferenceContentIds([]);
    setReferenceLibraryPreviews({});
  };

  const markReferencesDirty = () => {
    // Changing refs must not silently regenerate the previous output as multimodal base.
    setForceNewGenerate(true);
  };

  const clearMemeFormOptions = () => {
    setPrompt("");
    setTopText("");
    setBottomText("");
    setSlotTexts({});
    pendingRewriteSlotsRef.current = null;
    setMemeRecommendations(null);
    setTitle("");
    setNegativePrompt("");
    clearReferences();
  };

  const startFreshDraft = () => {
    clearMemeFormOptions();
    clearViewedPrompts();
    setForceNewGenerate(true);
    setCurrentContentId(null);
    setContentStatus(null);
    setIsPublished(false);
    toast.message(mode === "meme" ? "Ready for a new meme" : "Ready for a new image", {
      description: "Options cleared — Generate will create a new draft.",
    });
  };

  const applyContentItemToStudio = (item: ContentDto, imgUrl?: string) => {
    const resolvedUrl =
      imgUrl || extractValidImageUrl(item) || item.thumbnailUrl || item.cdnUrl || "";
    const isPublishedItem = item.status === "published";
    const isMemeItem = isMemeContent(item);

    clearReferences();
    revokePreviewBlob();
    applyViewedPrompts(item);
    setPrompt(
      item.refinePrompt ||
        item.prompt ||
        item.basePrompt ||
        item.caption ||
        item.description ||
        item.title ||
        "",
    );
    setTitle(item.title || item.caption || "");
    setDescription(item.description || "");
    setStyle(item.style || (isMemeItem ? "meme" : "cinematic"));
    if (item.aspectRatio && ["1:1", "16:9", "9:16", "4:5"].includes(item.aspectRatio)) {
      setAspectRatio(item.aspectRatio);
    }
    setMode(isMemeItem ? "meme" : "image");
    if (isMemeItem) {
      const memeModeFromSpec =
        item.memeSpec?.mode === "template" || item.memeSpec?.mode === "hybrid"
          ? item.memeSpec.mode
          : "ai";
      setMemeModeState(memeModeFromSpec);
      if (item.memeSpec?.templateId) {
        setSelectedTemplateId(item.memeSpec.templateId);
      }
      if (item.memeSpec?.texts?.length) {
        const next: Record<string, string> = {};
        for (const entry of item.memeSpec.texts) {
          if (entry?.slot) next[entry.slot] = entry.text || "";
        }
        setSlotTexts(next);
      }
    }
    if (resolvedUrl) {
      setPreviewReady(false);
      const busted = withCacheBust(resolvedUrl);
      setResultImage(busted);
      setVariations([busted]);
      void applyPreviewImage(resolvedUrl);
    } else {
      setResultImage(null);
      setVariations([]);
      setPreviewReady(false);
    }
    setContentStatus(item.status || null);
    setWatermarked(Boolean(item.watermarked));
    setIsPublished(isPublishedItem);
    setIsPublishing(false);
    setCaptionSuggestions(item.captions?.length ? item.captions : []);
    setCaption(item.selectedCaption || item.caption || item.captions?.[0] || "");
    setGeneratedHashtags(normalizeHashtagSets(item.hashtagSets));
    {
      const selected = normalizeHashtagList(item.selectedHashtags);
      setSelectedHashtags(
        selected.length ? selected : normalizeHashtagSets(item.hashtagSets)[0] || [],
      );
    }
    setError(null);

    if (isPublishedItem) {
      // Remix published work as a new create with the image as Reference Image 1.
      setCurrentContentId(null);
      setForceNewGenerate(true);
      if (item.id) {
        setReferenceContentIds([item.id]);
        if (resolvedUrl) {
          setReferenceLibraryPreviews({ [item.id]: resolvedUrl });
        }
      }
    } else {
      setCurrentContentId(item.id);
      setForceNewGenerate(false);
    }
  };

  const resetStudioSession = () => {
    clearReferences();
    revokePreviewBlob();
    clearViewedPrompts();
    setForceNewGenerate(false);
    setCurrentContentId(null);
    setContentStatus(null);
    setIsPublished(false);
    setIsPublishing(false);
    setResultImage(null);
    setVariations([]);
    setPreviewReady(false);
    setPrompt("");
    setTitle("");
    setDescription("");
    setCaption("");
    setCaptionSuggestions([]);
    setGeneratedHashtags([]);
    setSelectedHashtags([]);
    setError(null);
    setWatermarked(false);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
  };

  // Initialize draft data from location state or search params (full replace — no additive leak)
  useEffect(() => {
    const draftIdFromParam = searchParams.get("draftId") || searchParams.get("editId");
    const typeParam = searchParams.get("type");
    const navKey = `${location.key}|${draftIdFromParam || ""}|${location.state?.draftId || ""}|${location.state?.studioSessionKey || ""}|${searchParams.get("planDay") || ""}|${searchParams.get("prompt") || ""}`;
    if (hydratedNavKeyRef.current === navKey) return;
    hydratedNavKeyRef.current = navKey;

    if (typeParam === "meme" || location.state?.mode === "meme") {
      setMode("meme");
      setStyle("meme");
      if (typeParam === "template" || location.state?.memeMode === "template") {
        setMemeMode("template");
      }
    }

    if (location.state && (location.state.draftId || location.state.imageUrl || location.state.item)) {
      const state = location.state as {
        draftId?: string;
        title?: string;
        prompt?: string;
        imageUrl?: string;
        mode?: "image" | "meme";
        description?: string;
        style?: string;
        aspectRatio?: string;
        status?: string;
        caption?: string;
        captions?: string[];
        hashtagSets?: string[][];
        watermarked?: boolean;
        item?: ContentDto;
      };

      if (state.item?.id) {
        applyContentItemToStudio(state.item, state.imageUrl);
      } else {
        clearReferences();
        setPrompt(state.prompt || "");
        setTitle(state.title || "");
        setDescription(state.description || "");
        if (state.style) setStyle(state.style);
        if (state.aspectRatio && ["1:1", "16:9", "9:16", "4:5"].includes(state.aspectRatio)) {
          setAspectRatio(state.aspectRatio);
        }
        if (state.mode) setMode(state.mode);
        if (state.imageUrl) {
          setPreviewReady(false);
          setResultImage(state.imageUrl);
          setVariations([state.imageUrl]);
        } else {
          setResultImage(null);
          setVariations([]);
          setPreviewReady(false);
        }
        const status = state.status || null;
        setContentStatus(status);
        setWatermarked(Boolean(state.watermarked));
        setIsPublished(status === "published");
        setIsPublishing(false);
        setCaption(state.caption || "");
        setCaptionSuggestions(state.captions?.length ? state.captions : []);
        setGeneratedHashtags(normalizeHashtagSets(state.hashtagSets));
        setSelectedHashtags(normalizeHashtagSets(state.hashtagSets)[0] || []);
        setError(null);

        if (status === "published" && state.draftId) {
          setCurrentContentId(null);
          setForceNewGenerate(true);
          setReferenceContentIds([state.draftId]);
          if (state.imageUrl) {
            setReferenceLibraryPreviews({ [state.draftId]: state.imageUrl });
          }
        } else {
          setCurrentContentId(state.draftId || null);
          setForceNewGenerate(false);
        }
        applyViewedPrompts({
          basePrompt: state.prompt,
          refinePrompt: undefined,
          prompt: state.prompt,
        });
      }

      toast.info(t("image_studio.draft_loaded", { defaultValue: "Continuing draft in Image Studio" }), {
        id: "draft-loaded",
      });
    } else if (draftIdFromParam) {
      (async () => {
        try {
          const item =
            (await contentApi.getUserContentById(draftIdFromParam, { suppressErrorLog: true }).catch(() => null)) ||
            (await contentApi.getContentById(draftIdFromParam, { suppressErrorLog: true }));
          if (item) {
            applyContentItemToStudio(item);
            toast.info(t("image_studio.draft_loaded", { defaultValue: "Loaded draft into Image Studio" }), {
              id: "draft-param-loaded",
            });
          }
        } catch (err) {
          console.error("Failed to load draft item by ID:", err);
        }
      })();
    }

    const suggest = searchParams.get("suggest");
    const promptParam = searchParams.get("prompt");
    const planDayParam = searchParams.get("planDay");
    const forClipParam = searchParams.get("forClip") === "1";
    const ratioParam = searchParams.get("ratio");
    if (promptParam && !location.state?.prompt) {
      setPrompt(promptParam);
    }
    if (planDayParam) {
      planDayRef.current = planDayParam;
    }
    if (forClipParam) {
      forClipPlanRef.current = true;
      setIsClipPlanFlow(true);
      setAspectRatio((current) =>
        ratioParam && ["1:1", "16:9", "9:16", "4:5"].includes(ratioParam) ? ratioParam : "9:16",
      );
      toast.message("Week plan · Clip day", {
        description:
          "Generate your base image first, then use Animate → Clip Studio to finish the short for your niche.",
        duration: 6000,
      });
    } else if (ratioParam && ["1:1", "16:9", "9:16", "4:5"].includes(ratioParam)) {
      setAspectRatio(ratioParam);
    }
    if (suggest === "animate_i2v" || suggest === "animate_ken_burns") {
      setAnimateMode(suggest === "animate_i2v" ? "i2v" : "ken_burns");
      // Open picker after draft hydration paints
      window.setTimeout(() => setAnimatePickerOpen(true), 400);
    } else if (suggest === "meme") {
      setMode("meme");
      setStyle("meme");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once per navigation key
  }, [location.key, location.state, searchParams, t]);

  const toggleReferenceContent = (id: string) => {
    const isSelected = referenceContentIds.includes(id);
    if (isSelected) {
      markReferencesDirty();
      setReferenceContentIds((prev) => prev.filter((x) => x !== id));
      setReferenceLibraryPreviews((previews) => {
        const next = { ...previews };
        delete next[id];
        return next;
      });
      return;
    }
    if (referenceContentIds.length + referenceUploads.length >= maxReferences) {
      toast.message(`Max ${maxReferences} references`);
      return;
    }
    markReferencesDirty();
    const lib = libraryImages.find((h) => h.id === id);
    setReferenceContentIds((prev) => [...prev, id]);
    if (lib?.url) {
      setReferenceLibraryPreviews((previews) => ({ ...previews, [id]: lib.url }));
    }
  };

  const onRemoveReferenceUpload = (localId: string) => {
    setReferenceUploads((prev) => {
      const item = prev.find((u) => u.localId === localId);
      if (item?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((u) => u.localId !== localId);
    });
    markReferencesDirty();
  };

  const onClearReferences = () => {
    clearReferences();
    markReferencesDirty();
  };

  const onUploadReference = async (file: File) => {
    if (referenceContentIds.length + referenceUploads.length >= maxReferences) {
      toast.message(`Max ${maxReferences} references`);
      return;
    }
    markReferencesDirty();
    const localId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const previewUrl = URL.createObjectURL(file);
    setReferenceUploads((prev) => [
      ...prev,
      {
        localId,
        name: file.name || "Reference image",
        previewUrl,
        status: "uploading",
      },
    ]);
    try {
      const meta = await contentApi.uploadFile(file);
      const refId = meta.assetId || meta.contentId;
      if (!refId) throw new Error("Upload did not return an asset id");
      setReferenceUploads((prev) =>
        prev.map((u) =>
          u.localId === localId ? { ...u, id: refId, status: "ready" as const } : u,
        ),
      );
      toast.success("Reference uploaded");
      void fetchHistoryFromContentApi();
    } catch (err: any) {
      setReferenceUploads((prev) => {
        const item = prev.find((u) => u.localId === localId);
        if (item?.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(item.previewUrl);
        }
        return prev.filter((u) => u.localId !== localId);
      });
      toast.error("Reference upload failed", { description: err?.message || "Try again" });
    }
  };

  const buildEnhancedPrompt = (base: string) => {
    let next = base.trim();
    const lightingLabels: Record<string, string> = {
      natural: "Natural",
      neon: "Neon",
      golden: "Golden hour",
      dramatic: "Dramatic",
    };
    if (lighting) {
      next = `${next}. Lighting: ${lightingLabels[lighting] || lighting}`;
    }
    if (negativePrompt.trim()) {
      next = `${next}. Avoid: ${negativePrompt.trim()}`;
    }
    return next;
  };

  const handleAddCustomTag = () => {
    const cleanTag = customTagInput.trim().replace(/^#+/, '').replace(/[^a-zA-Z0-9_]/g, '');
    if (cleanTag && !selectedHashtags.includes(cleanTag)) {
      setSelectedHashtags(prev => [...prev, cleanTag]);
    }
    setCustomTagInput("");
  };

  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [showPayloadModal, setShowPayloadModal] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<any>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleUpscale = async () => {
    if (!resultImage) return;
    setIsUpscaling(true);
    try {
      // Upscale logic would go here if supported by the API Gateway
      toast.info("Upscaling is currently handled by the media processing pipeline on the gateway.");
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpscaling(false);
    }
  };

  const handleRemoveBg = async () => {
    if (!resultImage) return;
    setIsRemovingBg(true);
    try {
      // Background removal would go here if supported by the API Gateway
      toast.info("Background removal is processed by the AI edge nodes.");
    } catch (err) {
      console.error(err);
    } finally {
      setIsRemovingBg(false);
    }
  };

  const handleGenerateTitle = async () => {
    if (!prompt) return;
    setIsGeneratingTitle(true);
    triggerHaptic('medium');
    try {
      const generatedTitle = await generateTitle(prompt);
      setTitle(generatedTitle);
      triggerHaptic('success');
    } catch (err) {
      console.error(err);
      triggerHaptic('error');
      if (err instanceof AIError) {
        toast.error("Title Generation Failed", {
          description: err.message
        });
      } else {
        toast.error("Title Generation Failed", {
          description: "An unexpected error occurred while generating a title."
        });
      }
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleGenerate = () => {
    if (mode === "meme" && (memeMode === "template" || memeMode === "hybrid")) {
      if (!selectedTemplateId) {
        toast.error("Pick a meme template");
        return;
      }
      const tpl = memeTemplates.find((t) => t.id === selectedTemplateId);
      const missing = tpl?.slots.find((s) => !(slotTexts[s.id] || "").trim());
      if (missing) {
        toast.error(`Fill the "${missing.label}" slot`);
        return;
      }
      if (memeMode === "hybrid" && !prompt.trim()) {
        toast.error("Hybrid mode needs a prompt for the AI base");
        return;
      }
    } else if (!prompt) {
      return;
    }
    if (isUploadingReference) {
      toast.message("Wait for reference uploads to finish");
      return;
    }
    if (generationsLeft !== null && generationsLeft <= 0) {
      setError("No generations left today. Upgrade your plan for more!");
      triggerHaptic('warning');
      return;
    }

    setIsTerminalOpen(true);
    setIsTerminalMinimized(false);

    executeActualGeneration();
  };

  const executeActualGeneration = async () => {
    setIsGenerating(true);
    setLibraryPickerOpen(false);
    setError(null);
    setPreviewReady(false);
    revokePreviewBlob();
    // Hide previous captions/hashtags until the new image is visible.
    setCaptionSuggestions([]);
    setCaption("");
    setGeneratedHashtags([]);
    setSelectedHashtags([]);
    triggerHaptic('heavy');
    
    const isMeme = mode === "meme";
    const ratio = (["1:1", "16:9", "9:16", "4:5"].includes(aspectRatio) ? aspectRatio : "1:1") as
      | "1:1"
      | "16:9"
      | "9:16"
      | "4:5";
    const studioStyle = isMeme ? "meme" : style;
    const templateTexts = (Object.entries(slotTexts) as Array<[string, string]>)
      .filter(([, text]) => text.trim())
      .map(([slot, text]) => ({ slot, text: text.trim() }));
    const aiCaptionTexts = [
      ...(topText ? [{ slot: "top", text: topText }] : []),
      ...(bottomText ? [{ slot: "bottom", text: bottomText }] : []),
    ];
    const targetPrompt = buildEnhancedPrompt(
      isMeme && memeMode !== "template"
        ? `${prompt}${topText || bottomText ? `. Meme captions — top: "${topText}" bottom: "${bottomText}"` : ""}`
        : prompt,
    );
    const canRegenerate =
      Boolean(currentContentId) &&
      !forceNewGenerate &&
      !isPublished &&
      contentStatus !== "generation_failed" &&
      contentStatus !== "published" &&
      // Multi-ref face/scene composition must not reuse the previous draft as
      // multimodal base (that demotes the real subject face). Prefer /generate
      // or regenerate-without-draft-base (server-side); FE still forces new when
      // 2+ refs are attached so retries stay correct even on older backends.
      orderedReadyReferenceIds.length < 2 &&
      // AI + hybrid memes refine in place; pure template memes are deterministic
      // from their text slots, so they always create a new asset.
      !(isMeme && memeMode === "template");

    // Send all ready refs as referenceContentIds in UI Image 1…N order (uploads then library).
    const refs = {
      referenceContentIds: orderedReadyReferenceIds.length
        ? orderedReadyReferenceIds
        : undefined,
    };

    const voiceClause = buildClientVoiceHumorClause(
      resolvedMemeVoice,
      memeHumorIntensity,
    );
    // Bake voice into the model prompt so create/refine work even when the
    // deployed content-service build does not yet whitelist voice DTO fields.
    const memeImagePrompt =
      isMeme && memeMode !== "template"
        ? `${targetPrompt} ${voiceClause}`.trim()
        : targetPrompt;

    const memePayload =
      memeMode === "template"
        ? {
            mode: "template" as const,
            templateId: selectedTemplateId || undefined,
            aspectRatio: ratio,
            texts: templateTexts,
            title: title.trim() || undefined,
            prompt: prompt.trim() || undefined,
          }
        : memeMode === "hybrid"
          ? {
              mode: "hybrid" as const,
              prompt: memeImagePrompt,
              templateId: selectedTemplateId || undefined,
              aspectRatio: ratio,
              texts: templateTexts,
              title: title.trim() || undefined,
              ...refs,
            }
          : {
              mode: "ai" as const,
              prompt: memeImagePrompt,
              aspectRatio: ratio,
              texts: aiCaptionTexts,
              title: title.trim() || undefined,
              ...refs,
            };

    const payload = isMeme
      ? memePayload
      : { prompt: targetPrompt, style: studioStyle, aspectRatio: ratio, ...refs };
    const apiPath = canRegenerate
      ? `/content/${currentContentId}/regenerate`
      : isMeme
        ? "/content/meme"
        : "/content/generate";
    const { id: generateLogId, traceId } = addApiLog("POST", apiPath, payload);

    try {
      toast.info(
        canRegenerate ? "Regenerating draft…" : "Generating content…",
        {
          description: isMeme
            ? `Meme · ${memeMode}${selectedTemplateId ? ` · ${selectedTemplateId}` : ""}`
            : `Style: ${studioStyle} · ${ratio}`,
        },
      );
      
      let apiResponse: any;
      if (canRegenerate && currentContentId) {
        const regeneratePrompt =
          isMeme && memeMode !== "template"
            ? memeImagePrompt
            : targetPrompt;
        apiResponse = await contentApi.regenerateImage(currentContentId, {
          // Omit short/empty prompts so the server reuses the stored prompt
          // (needed for hybrid caption-only edits after the field is cleared).
          prompt: regeneratePrompt.trim().length >= 3 ? regeneratePrompt : undefined,
          style: studioStyle,
          aspectRatio: ratio,
          title: title.trim() || undefined,
          // Hybrid memes recompose their caption overlay from these slots.
          texts:
            isMeme && memeMode === "hybrid" && templateTexts.length
              ? templateTexts
              : undefined,
          // Apply Director layout switches on draft refine (not only caption edits).
          templateId:
            isMeme && memeMode === "hybrid" && selectedTemplateId
              ? selectedTemplateId
              : undefined,
          // Do not send brandName / brandPersonality / humorIntensity here —
          // older content-service builds reject unknown regenerate fields (400).
          ...refs,
        });
      } else if (isMeme) {
        apiResponse = await contentApi.createMeme(memePayload);
      } else {
        apiResponse = await contentApi.generateImage(
          targetPrompt,
          studioStyle,
          ratio,
          undefined,
          refs.referenceContentIds,
          undefined,
          title.trim() || undefined,
        );
      }
      const contentId = apiResponse.contentId || apiResponse.id || apiResponse.jobId;

      if (!contentId) {
        throw new Error("Failed to generate content: No content ID returned.");
      }

      if (planDayRef.current && profile?.uid && !forClipPlanRef.current) {
        markPlanDayComplete(profile.uid, planDayRef.current, contentId);
      }

      if (forClipPlanRef.current) {
        toast.success("Base image ready", {
          description: "Next: tap Animate → Clip Studio to turn this still into your clip.",
          duration: 7000,
        });
      }

      const img =
        extractValidImageUrl(apiResponse) ||
        apiResponse.imageUrl ||
        apiResponse.cdnUrl ||
        apiResponse.thumbnailUrl;
      if (!img) {
        throw new Error("API response did not contain an image payload.");
      }
      const bustedImg = withCacheBust(img);
      const thumb = apiResponse.thumbnailUrl || img;

      updateApiLogSuccess(
        generateLogId, 
        200, 
        {
          ...apiResponse,
          cdnUrl: bustedImg,
          thumbnailUrl: thumb
        }, 
        `Generation completed inline. Content ID: ${contentId}`
      );

      // Prefer a no-store blob so refine of the same /content/{id}/media path updates the canvas.
      await applyPreviewImage(img);

      // Optimistically refresh the matching Recent Generations tile (same media path after refine).
      const feedRevision = `local-${Date.now()}`;
      const feedUrl = withContentMediaRevision(img, feedRevision);
      const existingHistory = history.find((h) => h.id === contentId);
      const isRefinePass = Boolean(existingHistory) && !willCreateNewImage;
      const frozenBase = isRefinePass
        ? (existingHistory!.basePrompt || existingHistory!.prompt || targetPrompt).trim() ||
          targetPrompt
        : targetPrompt.trim();
      const nextPromptText = isRefinePass
        ? targetPrompt.trim().length >= 3
          ? targetPrompt.trim()
          : (existingHistory!.refinePrompt || existingHistory!.prompt || frozenBase).trim()
        : targetPrompt.trim();
      applyViewedPrompts({
        basePrompt: frozenBase,
        refinePrompt: isRefinePass ? nextPromptText : undefined,
        prompt: nextPromptText,
      });

      setHistory((prev) => {
        const idx = prev.findIndex((h) => h.id === contentId);
        if (idx < 0) {
          return [
            {
              id: contentId,
              url: feedUrl,
              mediaRevision: feedRevision,
              title: title.trim() || undefined,
              prompt: targetPrompt,
              basePrompt: targetPrompt,
              refinePrompt: undefined,
              type: isMeme ? "meme" : "image",
              style: studioStyle,
              status: "draft",
              aspectRatio: ratio,
              watermarked: Boolean(apiResponse.watermarked),
              captions: apiResponse.captions,
              hashtagSets: apiResponse.hashtagSets,
              memeSpec: isMeme
                ? {
                    mode: memeMode,
                    templateId: selectedTemplateId || undefined,
                    texts: memeMode === "ai" ? undefined : templateTexts,
                  }
                : undefined,
              timestamp: Date.now(),
            },
            ...prev,
          ];
        }
        return prev.map((h) =>
          h.id === contentId
            ? {
                ...h,
                url: feedUrl,
                mediaRevision: feedRevision,
                prompt: nextPromptText,
                basePrompt: frozenBase,
                refinePrompt: nextPromptText,
                title: title.trim() || h.title,
                style: studioStyle,
                status: "draft",
                aspectRatio: ratio,
                watermarked: Boolean(apiResponse.watermarked),
                captions: apiResponse.captions ?? h.captions,
                hashtagSets: apiResponse.hashtagSets ?? h.hashtagSets,
                memeSpec:
                  isMeme && memeMode === "hybrid"
                    ? {
                        ...(h.memeSpec || {}),
                        mode: "hybrid",
                        templateId: selectedTemplateId || h.memeSpec?.templateId,
                        texts: templateTexts.length ? templateTexts : h.memeSpec?.texts,
                      }
                    : h.memeSpec,
              }
            : h,
        );
      });

      setCurrentContentId(contentId);
      setContentStatus("draft");
      setWatermarked(Boolean(apiResponse.watermarked));
      setIsPublished(false);
      setIsPublishing(false);
      setDescription("");
      // Drop refs after success so the next create cannot silently reuse stale Image 1…N.
      clearReferences();
      if (isMeme) {
        // Clear the prompt so the field reads as "what should change next".
        setPrompt("");
        setTopText("");
        setBottomText("");
        setTitle("");
        // Template memes are deterministic, so they must create a new asset.
        // AI + hybrid stay attached so Refine edits this draft in place; hybrid
        // keeps its slot texts so caption tweaks can be sent with the refine.
        const templateOnly = memeMode === "template";
        if (templateOnly) {
          setSlotTexts({});
          setCurrentContentId(null);
        }
        setForceNewGenerate(templateOnly);
      } else {
        setForceNewGenerate(false);
      }
      
      if (apiResponse.captions) {
        setCaptionSuggestions(apiResponse.captions);
        setCaption(apiResponse.captions[0] || "");
      }
      if (apiResponse.hashtagSets) {
        const sets = normalizeHashtagSets(apiResponse.hashtagSets);
        setGeneratedHashtags(sets);
        setSelectedHashtags(sets[0] || []);
      }

      // Leave baking once generate finishes; applyPreviewImage already set previewReady for blob,
      // otherwise Canvas waits on AuthenticatedImage onLoad → onPreviewReady.
      setIsGenerating(false);

      const { id: listLogId } = addApiLog("GET", "/content/mine", undefined, traceId);
      try {
        await fetchHistoryFromContentApi();
        updateApiLogSuccess(listLogId, 200, { success: true }, "History list successfully updated.");
      } catch (historyErr: any) {
        updateApiLogFailed(listLogId, historyErr?.statusCode || 500, historyErr, "Failed to refresh history list.");
      }

      setGenerationsLeft(prev => {
        if (readUserPlan() !== "FREE") return null;
        const newVal = prev !== null ? Math.max(0, prev - 1) : Math.max(0, FREE_DAILY_GENERATION_LIMIT - 1);
        safeLocalStorage.setItem("nxclip_generations_left", String(newVal));
        return newVal;
      });

      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      triggerHaptic('success');
      toast.success("Generation completed successfully!");
    } catch (err: any) {
      console.error(err);
      triggerHaptic('error');
      let errorMessage = "Failed to generate image. Please try a different prompt.";
      
      const statusCode = err?.statusCode || 500;
      updateApiLogFailed(generateLogId, statusCode, err, `Generation failed: ${err?.message || errorMessage}`);

      if (
        statusCode === 403 &&
        (err?.upgrade_url ||
          err?.required_plan ||
          /limit|plan|upgrade/i.test(
            Array.isArray(err?.message) ? err.message.join(" ") : String(err?.message || ""),
          ))
      ) {
        errorMessage = Array.isArray(err.message)
          ? err.message.join(", ")
          : err.message || "Daily generation limit reached.";
        if (readUserPlan() === "FREE") {
          setGenerationsLeft(0);
          safeLocalStorage.setItem("nxclip_generations_left", "0");
        }
        toast.error("Plan limit reached", {
          description: errorMessage,
          action: {
            label: "Upgrade",
            onClick: () => navigate("/upgrade"),
          },
        });
      } else if (err instanceof AIError) {
        errorMessage = err.message;
        toast.error("Image Generation Failed", {
          description: errorMessage,
          action: err.code === "RATE_LIMIT" ? {
            label: "Retry",
            onClick: () => handleGenerate()
          } : undefined
        });
      } else if (err && typeof err === "object" && "message" in err) {
        errorMessage = Array.isArray(err.message) ? err.message.join(", ") : String(err.message);
        toast.error("Image Generation Failed", {
          description: errorMessage
        });
      } else {
        toast.error("Image Generation Failed", {
          description: errorMessage
        });
      }
      // A refine that fails leaves the draft untouched on the server, so the state
      // stays as-is: marking it failed here would swap Refine for a Retry the
      // server rejects, and push the next attempt into creating a new asset.
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRetryGeneration = async () => {
    if (!currentContentId) return;
    setIsGenerating(true);
    setError(null);
    setPreviewReady(false);
    setCaptionSuggestions([]);
    setCaption("");
    setGeneratedHashtags([]);
    setSelectedHashtags([]);
    const { id: generateLogId } = addApiLog("POST", `/content/${currentContentId}/retry-generation`, {});
    try {
      toast.info("Retrying failed generation…");
      const apiResponse = await contentApi.retryGeneration(currentContentId);
      const contentId = apiResponse.contentId || currentContentId;
      const img =
        extractValidImageUrl(apiResponse) ||
        apiResponse.imageUrl ||
        apiResponse.cdnUrl ||
        apiResponse.thumbnailUrl;
      if (!img) throw new Error("Retry did not return an image payload.");
      updateApiLogSuccess(generateLogId, 200, apiResponse, "Retry completed");
      await applyPreviewImage(img);
      const feedRevision = `local-${Date.now()}`;
      const feedUrl = withContentMediaRevision(img, feedRevision);
      setHistory((prev) =>
        prev.map((h) =>
          h.id === contentId
            ? { ...h, url: feedUrl, mediaRevision: feedRevision, status: "draft" }
            : h,
        ),
      );
      setCurrentContentId(contentId);
      setContentStatus("draft");
      setWatermarked(Boolean(apiResponse.watermarked));
      if (apiResponse.captions) {
        setCaptionSuggestions(apiResponse.captions);
        setCaption(apiResponse.captions[0] || "");
      }
      if (apiResponse.hashtagSets) {
        const sets = normalizeHashtagSets(apiResponse.hashtagSets);
        setGeneratedHashtags(sets);
        setSelectedHashtags(sets[0] || []);
      }
      await fetchHistoryFromContentApi();
      toast.success("Retry succeeded");
    } catch (err: any) {
      updateApiLogFailed(generateLogId, err?.statusCode || 500, err, "Retry failed");
      setContentStatus("generation_failed");
      setError(err?.message || "Retry failed");
      toast.error("Retry failed", { description: err?.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateCaption = async () => {
    if (!prompt) return;
    setIsGeneratingCaption(true);
    setCaptionSuggestions([]);
    triggerHaptic('medium');
    try {
      const caps = await generateCaptions(prompt);
      if (caps && caps.length > 0) {
        setCaptionSuggestions(caps.slice(0, 8));
        setCaption(caps[0]);
      }
      triggerHaptic('success');
    } catch (err) {
      console.error(err);
      triggerHaptic('error');
      if (err instanceof AIError) {
        toast.error("Caption Generation Failed", {
          description: err.message
        });
      } else {
        toast.error("Caption Generation Failed", {
          description: "An unexpected error occurred while generating captions."
        });
      }
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  const handlePublish = async () => {
    if (!currentContentId) {
      toast.error("No active image to publish.");
      return;
    }
    
    setIsPublishing(true);
    triggerHaptic('medium');
    socketService.init();
    
    const { id: publishLogId, traceId } = addApiLog("POST", `/content/${currentContentId}/publish`, {
      title,
      caption,
      hashtags: selectedHashtags,
      description
    });

    try {
      toast.info("Submitting draft to content moderation...", {
        description: "Checking content safety and feed projection."
      });

      // After moderation_rejected, PATCH first so status returns to draft (backend also
      // accepts edit-on-publish, but PATCH keeps Library / mine status in sync immediately).
      if (contentStatus === "moderation_rejected") {
        const desc = description || caption || undefined;
        await contentApi.editContent(currentContentId, {
          ...(title ? { title } : {}),
          ...(desc ? { description: desc } : {}),
        });
        setContentStatus("draft");
      }
      
      const publishRes = await contentApi.publish(currentContentId, {
        title,
        caption,
        hashtags: selectedHashtags,
        description,
        socialPlatforms: socialPlatforms.length ? socialPlatforms : undefined,
      });

      updateApiLogSuccess(publishLogId, 200, publishRes, "Content status set to [publishing]");
      setContentStatus("publishing");

      const { id: listId } = addApiLog("GET", "/content/mine", undefined, traceId);
      
      await fetchHistoryFromContentApi();
      updateApiLogSuccess(listId, 200, { success: true }, "History list updated with published item.");

      toast.info("Submitted for moderation", {
        description: "We'll notify you when it's published to the feed.",
      });

      const publishedId = currentContentId;
      publishWatchRef.current = { contentId: publishedId, done: false };

      const finishPublished = async () => {
        const watch = publishWatchRef.current;
        if (!watch || watch.contentId !== publishedId || watch.done) return;
        watch.done = true;
        setIsPublished(true);
        setContentStatus("published");
        toast.success("Published!", {
          description: "Your content is live on the Home feed.",
        });
        setShowSuccessModal(true);
        await fetchHistoryFromContentApi();
      };

      const finishRejected = async (reason?: string) => {
        const watch = publishWatchRef.current;
        if (!watch || watch.contentId !== publishedId || watch.done) return;
        watch.done = true;
        setContentStatus("moderation_rejected");
        setIsPublished(false);
        toast.error("Moderation rejected", {
          description: reason || "Edit the draft and publish again.",
        });
        await fetchHistoryFromContentApi();
      };

      const unsubMod = socketService.subscribe("content:moderation_complete", (_evt, payload) => {
        const data = (payload as { data?: any })?.data || payload;
        if (data?.contentId && data.contentId !== publishedId) return;
        const status = String(data?.status || "").toLowerCase();
        if (status === "published" || status === "approved") {
          unsubMod();
          void finishPublished();
        } else if (status === "rejected") {
          unsubMod();
          void finishRejected(data?.reason);
        }
      });

      // Poll as fallback when WS is down or notify arrives after refresh.
      const startedAt = Date.now();
      const pollMs = 2000;
      const maxWaitMs = 90_000;
      const poll = async () => {
        const watch = publishWatchRef.current;
        if (!watch || watch.contentId !== publishedId || watch.done) {
          unsubMod();
          return;
        }
        if (Date.now() - startedAt > maxWaitMs) {
          unsubMod();
          try {
            const latest = await contentApi.getOwnedContentById(publishedId, {
              suppressErrorLog: true,
            });
            const status = String(latest?.status || "").toLowerCase();
            if (status === "published") {
              await finishPublished();
              return;
            }
            if (status === "moderation_rejected") {
              await finishRejected(latest?.failureReason);
              return;
            }
            setContentStatus(status || "publishing");
          } catch {
            /* keep UI publishing label */
          }
          toast.message("Still publishing", {
            description: "Moderation is taking longer than usual. Refresh history in a moment.",
          });
          return;
        }
        try {
          // /content/:id is published-only (404 while publishing). Use owner route.
          const latest = await contentApi.getOwnedContentById(publishedId, {
            suppressErrorLog: true,
          });
          const status = String(latest?.status || "").toLowerCase();
          if (status === "published") {
            unsubMod();
            await finishPublished();
            return;
          }
          if (status === "moderation_rejected") {
            unsubMod();
            await finishRejected(latest?.failureReason);
            return;
          }
        } catch {
          // Keep polling while publishing (transient network only).
        }
        window.setTimeout(() => {
          void poll();
        }, pollMs);
      };
      window.setTimeout(() => {
        void poll();
      }, pollMs);
      
      triggerHaptic('success');
      setIsPublishModalOpen(false);
    } catch (err: any) {
      console.error(err);
      updateApiLogFailed(publishLogId, err?.statusCode || 500, err, "Publish failed");
      toast.error("Publishing Failed", {
        description: err?.message || "An unexpected error occurred during publication.",
        id: "publish-moderation"
      });
      triggerHaptic('error');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleAnimateAsClip = async (mode: "ken_burns" | "i2v" = animateMode) => {
    if (!currentContentId) {
      toast.error("Generate or open a draft first.");
      return;
    }
    if (mode === "i2v" && readUserPlan() === "FREE") {
      toast.error("AI motion requires Pro or Studio", {
        description: "Upgrade to unlock generative I2V, or use Quick (Ken Burns) on Free.",
        action: {
          label: "Upgrade",
          onClick: () => navigate("/upgrade"),
        },
      });
      return;
    }
    setAnimatePickerOpen(false);
    setIsAnimatingAsClip(true);
    try {
      const res = await contentApi.animateAsClip(currentContentId, {
        mode,
        motionPrompt: mode === "i2v" ? motionPrompt.trim() || undefined : undefined,
        durationSec: 6,
      });
      toast.message(mode === "i2v" ? "AI motion generating…" : "Animating still…", {
        description:
          mode === "i2v"
            ? "This can take 1–3 minutes. Opening Clip Studio when ready."
            : "Opening Clip Studio when the Ken Burns MP4 is ready.",
      });
      const newId = res.contentId;
      const maxPolls = mode === "i2v" ? 90 : 40;
      const pollMs = mode === "i2v" ? 4000 : 1500;
      for (let i = 0; i < maxPolls; i++) {
        await new Promise((r) => setTimeout(r, pollMs));
        const item =
          (await contentApi.getUserContentById(newId, { suppressErrorLog: true }).catch(() => null)) ??
          (await contentApi.getContentById(newId, { suppressErrorLog: true }).catch(() => null));
        if (item?.storageKey || item?.status === "draft") {
          const planQs = planDayRef.current
            ? `&planDay=${encodeURIComponent(planDayRef.current)}`
            : "";
          navigate(`/create/clip/${newId}/edit?step=polish${planQs}`);
          toast.success("Ready in Clip Studio");
          return;
        }
        if (item?.status === "generation_failed" || item?.renderStatus === "failed") {
          throw new Error(item.failureReason || "Animate failed");
        }
      }
      const planQs = planDayRef.current
        ? `&planDay=${encodeURIComponent(planDayRef.current)}`
        : "";
      navigate(`/create/clip/${newId}/edit?step=polish${planQs}`);
      toast.message("Clip draft created", {
        description: "Preview may take a few more seconds to load.",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Animate as clip failed");
    } finally {
      setIsAnimatingAsClip(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
  };

  const handleReuseGeneration = (item: GenerationHistoryItem) => {
    clearReferences();
    revokePreviewBlob();
    const published = item.status === "published";
    const isMemeItem = isMemeContent(item);
    setForceNewGenerate(published);
    applyViewedPrompts(item);
    // Editor field: prefer last refine for next edit; preview shows base + refine separately.
    setPrompt(item.refinePrompt || item.basePrompt || item.prompt || "");
    setTitle(item.title || "");
    setStyle(item.style || (isMemeItem ? "meme" : "cinematic"));
    if (item.aspectRatio && ["1:1", "16:9", "9:16", "4:5"].includes(item.aspectRatio)) {
      setAspectRatio(item.aspectRatio);
    }
    if (isMemeItem || item.type) {
      setMode(isMemeItem ? "meme" : ((item.type as "image" | "meme") || "image"));
    }
    if (isMemeItem) {
      const memeModeFromSpec =
        item.memeSpec?.mode === "template" || item.memeSpec?.mode === "hybrid"
          ? item.memeSpec.mode
          : "ai";
      setMemeModeState(memeModeFromSpec);
      if (item.memeSpec?.templateId) {
        setSelectedTemplateId(item.memeSpec.templateId);
      }
      if (item.memeSpec?.texts?.length) {
        const next: Record<string, string> = {};
        for (const entry of item.memeSpec.texts) {
          if (entry?.slot) next[entry.slot] = entry.text || "";
        }
        setSlotTexts(next);
      }
    }
    if (item.url) {
      setPreviewReady(false);
      const busted = withCacheBust(item.url);
      setResultImage(busted);
      setVariations([busted]);
      void applyPreviewImage(item.url);
    }
    if (published) {
      setCurrentContentId(null);
      if (item.id) {
        setReferenceContentIds([item.id]);
        if (item.url) setReferenceLibraryPreviews({ [item.id]: item.url });
      }
    } else if (item.id) {
      setCurrentContentId(item.id);
    }
    setContentStatus(item.status || "draft");
    setWatermarked(Boolean(item.watermarked));
    setIsPublished(published);
    setIsPublishing(false);
    if (item.captions?.length) {
      setCaptionSuggestions(item.captions);
      setCaption(item.captions[0] || "");
    } else {
      setCaptionSuggestions([]);
    }
    if (item.hashtagSets?.length) {
      const sets = normalizeHashtagSets(item.hashtagSets);
      setGeneratedHashtags(sets);
      setSelectedHashtags(sets[0] || []);
    } else {
      setGeneratedHashtags([]);
      setSelectedHashtags([]);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDownload = async (url: string) => {
    try {
      let downloadUrl = url;
      if (url.includes("/content/") || url.includes("api-gateway") || url.startsWith("/")) {
        const baseGateway = resolveBaseGatewayUrl();
        let relative = url;
        if (url.startsWith("http")) {
          try {
            const u = new URL(url);
            relative = u.pathname + u.search;
          } catch {
            relative = url.replace(/https?:\/\/[^/]+/, "");
          }
        }
        if (!relative.startsWith("/")) relative = `/${relative}`;
        const { getAccessToken } = await import("../../services/auth/authService");
        const token = getAccessToken();
        const sep = relative.includes("?") ? "&" : "?";
        downloadUrl = `/api/gateway-proxy${relative}${token ? `${sep}token=${encodeURIComponent(token)}` : ""}`;
      }
      const res = await fetch(downloadUrl);
      let blob = await res.blob();
      blob = await toDownloadableBlob(blob);

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `nxclip-${Date.now()}.${extensionForMimeType(blob.type)}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  const scrollToHistory = () => {
    historySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const clearHistory = async () => {
    try {
      // Loop through history items and delete them via Content API
      for (const item of history) {
        if (item.id) {
          await contentApi.deleteContent(item.id);
        }
      }
      setHistory([]);
      toast.success("History cleared successfully!");
    } catch (err) {
      console.error("Failed to clear history via Content API:", err);
      toast.error("Failed to clear history completely");
    }
    setIsConfirmClearOpen(false);
  };

  return (
    <div className={cn("space-y-8", isRTL && "rtl")}>
      <SEO 
        title={t('image_studio.seo_title')}
        description={t('image_studio.seo_description')}
      />
      <StudioPlanBanner
        toolLabel={mode === "meme" ? "Meme Studio" : "Image Studio"}
        categoryLabel={categoryLabel}
        niches={niches}
        hasWeekPlan={hasWeekPlan}
        dueToday={dueToday}
        onApplyDue={() => {
          const brief = applyDuePrompt();
          if (!brief) return;
          setPrompt(brief);
          if (dueToday && /meme/i.test(dueToday.contentType)) {
            setMode("meme");
            setMemeMode("template");
          }
          toast.success("Today’s coach brief applied");
        }}
        onRequestNicheChange={() => setNicheDialogOpen(true)}
        nicheDialogOpen={nicheDialogOpen}
        onNicheDialogOpenChange={setNicheDialogOpen}
        onConfirmNicheChange={confirmNicheChange}
      />
      {isClipPlanFlow ? (
        (() => {
          const banner = clipImageFirstBannerCopy(categoryLabel, niches);
          const marker = "Animate → Clip Studio";
          const idx = banner.body.indexOf(marker);
          return (
            <div className="rounded-lg border border-teal-500/35 bg-teal-500/10 px-3 py-2.5 text-xs text-foreground leading-relaxed">
              <span className="font-bold text-teal-700 dark:text-teal-300">{banner.title}</span>
              {" — "}
              {idx < 0 ? (
                banner.body
              ) : (
                <>
                  {banner.body.slice(0, idx)}
                  <strong>{marker}</strong>
                  {banner.body.slice(idx + marker.length)}
                </>
              )}
            </div>
          );
        })()
      ) : null}
      <div className="lg:hidden mb-4">
        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="generate">{t('image_studio.tabs.generate')}</TabsTrigger>
            <TabsTrigger value="canvas">{t('image_studio.tabs.canvas')}</TabsTrigger>
            <TabsTrigger value="edit">{t('image_studio.tabs.edit')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="generate" className="mt-4 space-y-4">
            {/* Mobile Generate Panel */}
            <GeneratePanel 
              mode={mode} setMode={setMode}
              memeMode={memeMode} setMemeMode={setMemeMode}
              prompt={prompt} setPrompt={setPrompt}
              title={title} setTitle={setTitle}
              isGeneratingTitle={isGeneratingTitle}
              handleGenerateTitle={handleGenerateTitle}
              style={style} setStyle={setStyle}
              aspectRatio={aspectRatio} setAspectRatio={setAspectRatio}
              isGenerating={isGenerating}
              handleGenerate={handleGenerate}
              activeSuggestions={activeSuggestions}
              refreshSuggestions={refreshSuggestions}
              STYLE_PRESETS={STYLE_PRESETS}
              handleSuggestionClick={handleSuggestionClick}
              generationsLeft={generationsLeft}
              dailyGenerationLimit={dailyGenerationLimit}
              setIsQuickEditOpen={setIsQuickEditOpen}
              topText={topText} setTopText={setTopText}
              bottomText={bottomText} setBottomText={setBottomText}
              memeTemplates={memeTemplates}
              selectedTemplateId={selectedTemplateId}
              setSelectedTemplateId={setSelectedTemplateId}
              slotTexts={slotTexts}
              setSlotText={setSlotText}
              isSuggestingMemeCopy={isSuggestingMemeCopy}
              onSuggestMemeCopy={handleSuggestMemeCopy}
              memeRecommendations={memeRecommendations}
              isRecommendingMemes={isRecommendingMemes}
              onRecommendMemes={() => void handleRecommendMemes()}
              onChooseMemeRecommendation={handleChooseMemeRecommendation}
              hasActiveWeekPlan={Boolean(activeWeekPlan)}
              onOpenWeekPlan={handleOpenWeekPlan}
              memeBrandName={memeBrandName}
              setMemeBrandName={setMemeBrandName}
              memeVoiceIds={memeVoiceIds}
              setMemeVoiceIds={setMemeVoiceIds}
              memeCustomVoice={memeCustomVoice}
              setMemeCustomVoice={setMemeCustomVoice}
              memeHumorIntensity={memeHumorIntensity}
              setMemeHumorIntensity={setMemeHumorIntensity}
              lighting={lighting} setLighting={setLighting}
              negativePrompt={negativePrompt} setNegativePrompt={setNegativePrompt}
              caption={caption} setCaption={setCaption}
              isGeneratingCaption={isGeneratingCaption}
              handleGenerateCaption={handleGenerateCaption}
              captionSuggestions={captionSuggestions}
              resultImage={resultImage}
              history={history}
              libraryImages={libraryImages}
              handleReuseGeneration={handleReuseGeneration}
              setIsConfirmClearOpen={setIsConfirmClearOpen}
              referenceContentIds={referenceContentIds}
              toggleReferenceContent={toggleReferenceContent}
              referenceUploads={referenceUploads}
              orderedReferenceChips={orderedReferenceChips}
              onUploadReference={onUploadReference}
              onRemoveReferenceUpload={onRemoveReferenceUpload}
              onClearReferences={onClearReferences}
              isUploadingReference={isUploadingReference}
              maxReferences={maxReferences}
              referencePlanHint={referencePlanHint}
              willCreateNewImage={willCreateNewImage}
              onStartFreshDraft={startFreshDraft}
              onScrollToHistory={scrollToHistory}
              libraryPickerOpen={libraryPickerOpen}
              onLibraryPickerOpenChange={setLibraryPickerOpen}
            />
          </TabsContent>

          <TabsContent value="canvas" className="mt-4 space-y-4">
            {/* Mobile Canvas Panel */}
            <CanvasPanel 
              resultImage={resultImage}
              aspectRatio={aspectRatio}
              isGenerating={isGenerating}
              error={error}
              handleGenerate={handleGenerate}
              handleRetry={handleRetryGeneration}
              canRetry={contentStatus === "generation_failed"}
              handleDownload={handleDownload}
              variations={variations}
              setResultImage={setResultImage}
              brightness={brightness} setBrightness={setBrightness}
              contrast={contrast} setContrast={setContrast}
              saturation={saturation} setSaturation={setSaturation}
              onPublishClick={() => setIsPublishModalOpen(true)}
              onAnimateAsClipClick={() => setAnimatePickerOpen(true)}
              isAnimatingAsClip={isAnimatingAsClip}
              isPublishing={isPublishing}
              isPublished={isPublished}
              watermarked={watermarked}
              contentStatus={contentStatus}
              mode={mode}
              memeMode={memeMode}
              memeTemplate={memeTemplates.find((t) => t.id === selectedTemplateId) || null}
              slotTexts={slotTexts}
              prompt={prompt}
              basePrompt={draftBasePrompt}
              refinePrompt={draftRefinePrompt}
              willCreateNewImage={willCreateNewImage}
              onStartFreshDraft={startFreshDraft}
              previewReady={previewReady}
              onPreviewReady={() => setPreviewReady(true)}
              libraryPickerOpen={libraryPickerOpen}
              onLibraryPickerOpenChange={setLibraryPickerOpen}
              libraryImages={libraryImages}
              referenceContentIds={referenceContentIds}
              toggleReferenceContent={toggleReferenceContent}
              maxReferences={maxReferences}
              orderedReferenceChips={orderedReferenceChips}
              captionSuggestions={captionSuggestions}
              selectedCaption={caption}
              generatedHashtags={generatedHashtags}
              selectedHashtags={selectedHashtags}
              onSelectCaption={setCaption}
              onSelectHashtagSet={setSelectedHashtags}
              weekPlanCanvasOpen={weekPlanCanvasOpen}
              weekPlanDays={weekPlanDays}
              weekPlanSelectedIndex={weekPlanSelectedIndex}
              onWeekPlanSelectDay={setWeekPlanSelectedIndex}
              activeWeekPlan={activeWeekPlan}
              isActivatingWeekPlan={isActivatingWeekPlan}
              isCancellingWeekPlan={isCancellingWeekPlan}
              canActivateWeekPlan={Boolean(memeRecommendations?.calendarPlan?.length) && !activeWeekPlan}
              onActivateWeekPlan={() => void handleActivateWeekPlan()}
              onCancelWeekPlan={() => void handleCancelWeekPlan()}
              onUseWeekPlanDay={handleUseWeekPlanDay}
              onCloseWeekPlanCanvas={() => setWeekPlanCanvasOpen(false)}
              memeTemplates={memeTemplates}
            />
          </TabsContent>

          <TabsContent value="edit" className="mt-4 space-y-4">
            {/* Mobile Edit Panel */}
            <EditPanel 
              resultImage={resultImage}
              brightness={brightness} setBrightness={setBrightness}
              contrast={contrast} setContrast={setContrast}
              saturation={saturation} setSaturation={setSaturation}
              isUpscaling={isUpscaling}
              handleUpscale={handleUpscale}
              isRemovingBg={isRemovingBg}
              handleRemoveBg={handleRemoveBg}
              onPublishClick={() => setIsPublishModalOpen(true)}
              onAnimateAsClipClick={() => setAnimatePickerOpen(true)}
              isAnimatingAsClip={isAnimatingAsClip}
              onViewHistoryClick={scrollToHistory}
              isPublishing={isPublishing}
              isPublished={isPublished}
            />
          </TabsContent>
        </Tabs>
      </div>

      <div className="hidden lg:flex flex-row h-[calc(100vh-140px)] gap-4 overflow-hidden">
        {/* LEFT PANEL - Controls */}
        <GeneratePanel 
          mode={mode} setMode={setMode}
          memeMode={memeMode} setMemeMode={setMemeMode}
          prompt={prompt} setPrompt={setPrompt}
          title={title} setTitle={setTitle}
          isGeneratingTitle={isGeneratingTitle}
          handleGenerateTitle={handleGenerateTitle}
          style={style} setStyle={setStyle}
          aspectRatio={aspectRatio} setAspectRatio={setAspectRatio}
          isGenerating={isGenerating}
          handleGenerate={handleGenerate}
          activeSuggestions={activeSuggestions}
          refreshSuggestions={refreshSuggestions}
          STYLE_PRESETS={STYLE_PRESETS}
          handleSuggestionClick={handleSuggestionClick}
          generationsLeft={generationsLeft}
          dailyGenerationLimit={dailyGenerationLimit}
          setIsQuickEditOpen={setIsQuickEditOpen}
          topText={topText} setTopText={setTopText}
          bottomText={bottomText} setBottomText={setBottomText}
          memeTemplates={memeTemplates}
          selectedTemplateId={selectedTemplateId}
          setSelectedTemplateId={setSelectedTemplateId}
          slotTexts={slotTexts}
          setSlotText={setSlotText}
          isSuggestingMemeCopy={isSuggestingMemeCopy}
          onSuggestMemeCopy={handleSuggestMemeCopy}
          memeRecommendations={memeRecommendations}
          isRecommendingMemes={isRecommendingMemes}
          onRecommendMemes={() => void handleRecommendMemes()}
          onChooseMemeRecommendation={handleChooseMemeRecommendation}
          hasActiveWeekPlan={Boolean(activeWeekPlan)}
          onOpenWeekPlan={handleOpenWeekPlan}
          memeBrandName={memeBrandName}
          setMemeBrandName={setMemeBrandName}
          memeVoiceIds={memeVoiceIds}
          setMemeVoiceIds={setMemeVoiceIds}
          memeCustomVoice={memeCustomVoice}
          setMemeCustomVoice={setMemeCustomVoice}
          memeHumorIntensity={memeHumorIntensity}
          setMemeHumorIntensity={setMemeHumorIntensity}
          lighting={lighting} setLighting={setLighting}
          negativePrompt={negativePrompt} setNegativePrompt={setNegativePrompt}
          caption={caption} setCaption={setCaption}
          isGeneratingCaption={isGeneratingCaption}
          handleGenerateCaption={handleGenerateCaption}
          captionSuggestions={captionSuggestions}
          resultImage={resultImage}
          history={history}
          libraryImages={libraryImages}
          handleReuseGeneration={handleReuseGeneration}
          setIsConfirmClearOpen={setIsConfirmClearOpen}
          referenceContentIds={referenceContentIds}
          toggleReferenceContent={toggleReferenceContent}
          referenceUploads={referenceUploads}
          orderedReferenceChips={orderedReferenceChips}
          onUploadReference={onUploadReference}
          onRemoveReferenceUpload={onRemoveReferenceUpload}
          onClearReferences={onClearReferences}
          isUploadingReference={isUploadingReference}
          maxReferences={maxReferences}
          referencePlanHint={referencePlanHint}
          willCreateNewImage={willCreateNewImage}
          onStartFreshDraft={startFreshDraft}
          onScrollToHistory={scrollToHistory}
          libraryPickerOpen={libraryPickerOpen}
          onLibraryPickerOpenChange={setLibraryPickerOpen}
          className="w-80 h-full"
        />

        {/* CENTER PANEL - Canvas */}
        <CanvasPanel 
          resultImage={resultImage}
          aspectRatio={aspectRatio}
          isGenerating={isGenerating}
          error={error}
          handleGenerate={handleGenerate}
          handleRetry={handleRetryGeneration}
          canRetry={contentStatus === "generation_failed"}
          handleDownload={handleDownload}
          variations={variations}
          setResultImage={setResultImage}
          brightness={brightness} setBrightness={setBrightness}
          contrast={contrast} setContrast={setContrast}
          saturation={saturation} setSaturation={setSaturation}
          onPublishClick={() => setIsPublishModalOpen(true)}
          onAnimateAsClipClick={() => setAnimatePickerOpen(true)}
          isAnimatingAsClip={isAnimatingAsClip}
          isPublishing={isPublishing}
          isPublished={isPublished}
          watermarked={watermarked}
          contentStatus={contentStatus}
          mode={mode}
          memeMode={memeMode}
          memeTemplate={memeTemplates.find((t) => t.id === selectedTemplateId) || null}
          slotTexts={slotTexts}
          prompt={prompt}
          basePrompt={draftBasePrompt}
          refinePrompt={draftRefinePrompt}
          willCreateNewImage={willCreateNewImage}
          onStartFreshDraft={startFreshDraft}
          previewReady={previewReady}
          onPreviewReady={() => setPreviewReady(true)}
          libraryPickerOpen={libraryPickerOpen}
          onLibraryPickerOpenChange={setLibraryPickerOpen}
          libraryImages={libraryImages}
          referenceContentIds={referenceContentIds}
          toggleReferenceContent={toggleReferenceContent}
          maxReferences={maxReferences}
          orderedReferenceChips={orderedReferenceChips}
          captionSuggestions={captionSuggestions}
          selectedCaption={caption}
          generatedHashtags={generatedHashtags}
          selectedHashtags={selectedHashtags}
          onSelectCaption={setCaption}
          onSelectHashtagSet={setSelectedHashtags}
          weekPlanCanvasOpen={weekPlanCanvasOpen}
          weekPlanDays={weekPlanDays}
          weekPlanSelectedIndex={weekPlanSelectedIndex}
          onWeekPlanSelectDay={setWeekPlanSelectedIndex}
          activeWeekPlan={activeWeekPlan}
          isActivatingWeekPlan={isActivatingWeekPlan}
          isCancellingWeekPlan={isCancellingWeekPlan}
          canActivateWeekPlan={Boolean(memeRecommendations?.calendarPlan?.length) && !activeWeekPlan}
          onActivateWeekPlan={() => void handleActivateWeekPlan()}
          onCancelWeekPlan={() => void handleCancelWeekPlan()}
          onUseWeekPlanDay={handleUseWeekPlanDay}
          onCloseWeekPlanCanvas={() => setWeekPlanCanvasOpen(false)}
          memeTemplates={memeTemplates}
        />

        {/* RIGHT PANEL - Studio Tools */}
        <EditPanel 
          resultImage={resultImage} 
          brightness={brightness} setBrightness={setBrightness}
          contrast={contrast} setContrast={setContrast}
          saturation={saturation} setSaturation={setSaturation}
          isUpscaling={isUpscaling}
          handleUpscale={handleUpscale}
          isRemovingBg={isRemovingBg}
          handleRemoveBg={handleRemoveBg}
          onPublishClick={() => setIsPublishModalOpen(true)}
          onAnimateAsClipClick={() => setAnimatePickerOpen(true)}
          isAnimatingAsClip={isAnimatingAsClip}
          onViewHistoryClick={scrollToHistory}
          isPublishing={isPublishing}
          isPublished={isPublished}
          className="w-72 h-full" 
        />
      </div>

      <div ref={historySectionRef} className="mt-8">
        <RecentGenerationsGallery
          items={history}
          onReuse={handleReuseGeneration}
          onDownload={handleDownload}
          onOpen={(item) => {
            handleReuseGeneration(item);
          }}
          onClearAll={() => setIsConfirmClearOpen(true)}
          onGenerateFirst={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </div>

      {/* QUICK EDIT OVERLAY */}
      <AnimatePresence>
        {isQuickEditOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-3xl space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Refine Prompt</h2>
                    <p className="text-sm text-muted-foreground">Focus on the details of your vision.</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsQuickEditOpen(false)}
                  className="rounded-full hover:bg-foreground/5 animate-none"
                >
                  <X size={20} />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Textarea 
                    className={cn(
                      "min-h-[300px] text-lg bg-muted/30 border-border/50 focus:border-primary/50 transition-all resize-none p-6",
                      prompt.length > 500 && "border-red-500 focus:border-red-500 ring-red-500/20"
                    )}
                    placeholder="Describe your vision in detail..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                  <div className="absolute bottom-4 right-6">
                    <span className={cn(
                      "text-xs tabular-nums transition-colors",
                      prompt.length > 500 ? "text-red-500 font-bold" : 
                      prompt.length >= 450 ? "text-amber-500" : 
                      "text-muted-foreground"
                    )}>
                      {prompt.length}/500
                    </span>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setIsQuickEditOpen(false)}>Cancel</Button>
                  <Button variant="brand-gradient" className="px-8" onClick={() => setIsQuickEditOpen(false)}>
                    Apply Changes
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CLEAR HISTORY CONFIRMATION */}
      <AnimatePresence>
        {isConfirmClearOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-background/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md glass p-8 rounded-xl border border-border shadow-2xl"
            >
              <h3 className="text-xl font-bold text-foreground mb-2">Delete all recent generations?</h3>
              <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                This permanently removes every item in Recent Generations from your account
                (soft-delete in the database and delete of the image files in storage).
                It cannot be undone from the app. Reference uploads in Content Library are not cleared by this action.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setIsConfirmClearOpen(false)}>Cancel</Button>
                <Button variant="destructive" className="font-bold" onClick={clearHistory}>
                  Delete all generations
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PUBLISH TO FEED MODAL */}
      <AnimatePresence>
        {isPublishModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-background/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-border/50 flex justify-between items-center bg-muted/20">
                <div className="flex items-center gap-2">
                  <Badge variant="brand-gradient" className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                    JOURNEY A
                  </Badge>
                  <h3 className="text-lg font-bold text-foreground">Publish to Feed</h3>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsPublishModalOpen(false)}
                  className="rounded-full h-8 w-8 hover:bg-foreground/5 animate-none"
                  disabled={isPublishing}
                >
                  <X size={16} />
                </Button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Thumbnail column */}
                  <div className="md:col-span-1 space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Preview</Label>
                    {resultImage && (
                      <div className="aspect-square rounded-xl overflow-hidden border border-border relative bg-muted group">
                        <AuthenticatedImage 
                          src={resultImage} 
                          alt="Publish preview" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {aspectRatio} • Draft
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Form fields column */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="publish-title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Post Title</Label>
                        {title.trim() ? (
                          <button
                            type="button"
                            aria-label="Copy title"
                            className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center"
                            onClick={() => {
                              void navigator.clipboard.writeText(title.trim());
                              toast.success("Title copied");
                            }}
                          >
                            <Copy size={12} />
                          </button>
                        ) : null}
                      </div>
                      <Input 
                        id="publish-title"
                        placeholder="Give your masterpiece a title..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="bg-muted/30 border-border/50 focus:border-primary/50 transition-all text-sm h-10"
                        disabled={isPublishing}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="publish-caption" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Caption</Label>
                        {caption.trim() ? (
                          <button
                            type="button"
                            aria-label="Copy caption"
                            className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center"
                            onClick={() => {
                              void navigator.clipboard.writeText(caption.trim());
                              toast.success("Caption copied");
                            }}
                          >
                            <Copy size={12} />
                          </button>
                        ) : null}
                      </div>
                      <Textarea 
                        id="publish-caption"
                        placeholder="What's on your mind?"
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        className="min-h-[100px] bg-muted/30 border-border/50 focus:border-primary/50 transition-all text-sm resize-none"
                        disabled={isPublishing}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="publish-description" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Detailed Description</Label>
                        {description.trim() ? (
                          <button
                            type="button"
                            aria-label="Copy description"
                            className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center"
                            onClick={() => {
                              void navigator.clipboard.writeText(description.trim());
                              toast.success("Description copied");
                            }}
                          >
                            <Copy size={12} />
                          </button>
                        ) : null}
                      </div>
                      <Textarea 
                        id="publish-description"
                        placeholder="Provide an in-depth description or comments on your creation..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="min-h-[100px] bg-muted/30 border-border/50 focus:border-primary/50 transition-all text-sm resize-none"
                        disabled={isPublishing}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hashtags / Tags</Label>
                        {selectedHashtags.length > 0 ? (
                          <button
                            type="button"
                            aria-label="Copy hashtags"
                            className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center"
                            onClick={() => {
                              void navigator.clipboard.writeText(
                                selectedHashtags.map((t) => `#${t}`).join(" "),
                              );
                              toast.success("Hashtags copied");
                            }}
                          >
                            <Copy size={12} />
                          </button>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2 p-3 bg-muted/20 border border-border/50 rounded-xl min-h-[48px] items-center">
                        {selectedHashtags.length === 0 ? (
                          <span className="text-sm text-muted-foreground px-1">No hashtags selected. Select AI suggestions below or add custom tags.</span>
                        ) : (
                          selectedHashtags.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium leading-snug",
                                "bg-primary/15 text-foreground border border-primary/20",
                                "hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-colors",
                              )}
                              onClick={() => setSelectedHashtags(prev => prev.filter(t => t !== tag))}
                              title="Click to remove"
                              disabled={isPublishing}
                            >
                              #{tag}
                              <X size={12} className="opacity-60" />
                            </button>
                          ))
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-2.5 text-sm text-muted-foreground font-semibold">#</span>
                          <Input
                            placeholder="Add custom tag (press Enter or comma)..."
                            value={customTagInput}
                            onChange={(e) => setCustomTagInput(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === ",") {
                                e.preventDefault();
                                handleAddCustomTag();
                              }
                            }}
                            className="pl-7 bg-muted/30 border-border/50 focus:border-primary/50 transition-all text-sm h-9"
                            disabled={isPublishing}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={handleAddCustomTag}
                          className="h-9 px-3 border border-border/50"
                          disabled={isPublishing || !customTagInput.trim()}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Suggestions Section */}
                <div className="space-y-4 pt-4 border-t border-border/30">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                    <h4 className="text-sm font-bold text-foreground">AI Creative Suggestions</h4>
                  </div>

                  {/* Caption Suggestions */}
                  {captionSuggestions.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-xs text-muted-foreground">Select AI Suggested Caption</Label>
                        <button
                          type="button"
                          aria-label="Copy all captions"
                          className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center"
                          onClick={() => {
                            void navigator.clipboard.writeText(captionSuggestions.slice(0, 3).join("\n\n"));
                            toast.success("Captions copied");
                          }}
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {captionSuggestions.slice(0, 3).map((suggestion, idx) => {
                          const isSelected = caption === suggestion;
                          return (
                            <div
                              key={idx}
                              className={cn(
                                "rounded-lg border transition-all flex items-start gap-1",
                                isSelected 
                                  ? "bg-primary/5 border-primary text-foreground shadow-sm shadow-primary/10" 
                                  : "bg-muted/20 border-border/40 text-muted-foreground"
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => setCaption(suggestion)}
                                className="flex-1 text-left p-3 text-xs leading-relaxed"
                                disabled={isPublishing}
                              >
                                {suggestion}
                              </button>
                              <button
                                type="button"
                                aria-label="Copy caption"
                                className="mt-2 mr-2 h-6 w-6 shrink-0 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center"
                                onClick={() => {
                                  void navigator.clipboard.writeText(suggestion);
                                  toast.success("Caption copied");
                                }}
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Hashtag Set Suggestions */}
                  {generatedHashtags.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Select AI Suggested Hashtag Set</Label>
                      <div className="grid grid-cols-1 gap-2">
                        {generatedHashtags.slice(0, 3).map((hashSet, idx) => {
                          const isSelected = JSON.stringify(selectedHashtags) === JSON.stringify(hashSet);
                          const tagsText = hashSet.map((t) => `#${t}`).join(" ");
                          return (
                            <div
                              key={idx}
                              className={cn(
                                "rounded-xl border transition-all space-y-2 p-3",
                                isSelected 
                                  ? "bg-primary/5 border-primary shadow-sm shadow-primary/10" 
                                  : "bg-muted/20 border-border/40"
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedHashtags(hashSet)}
                                  className={cn(
                                    "text-[11px] uppercase font-semibold tracking-wider",
                                    isSelected ? "text-primary" : "text-muted-foreground"
                                  )}
                                  disabled={isPublishing}
                                >
                                  Set {idx + 1}
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Copy hashtag set ${idx + 1}`}
                                  className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center"
                                  onClick={() => {
                                    void navigator.clipboard.writeText(tagsText);
                                    toast.success("Hashtags copied");
                                  }}
                                >
                                  <Copy size={12} />
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedHashtags(hashSet)}
                                className="w-full text-left"
                                disabled={isPublishing}
                              >
                                <div className="flex flex-wrap gap-2">
                                  {hashSet.map((tag, tIdx) => (
                                    <span 
                                      key={tIdx}
                                      className={cn(
                                        "inline-flex items-center rounded-md px-2.5 py-1 text-sm leading-snug font-medium",
                                        isSelected ? "bg-primary/15 text-foreground" : "bg-muted/60 text-foreground/90"
                                      )}
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-border/50 bg-muted/20 space-y-4">
                <SocialPublishTargets
                  selected={socialPlatforms}
                  onChange={setSocialPlatforms}
                  disabled={isPublishing}
                />
                <div className="flex justify-end gap-3">
                <Button 
                  variant="ghost" 
                  onClick={() => setIsPublishModalOpen(false)}
                  disabled={isPublishing}
                >
                  Cancel
                </Button>
                <Button 
                  variant="brand-gradient" 
                  className="px-6 font-bold"
                  onClick={handlePublish}
                  disabled={isPublishing || !title.trim()}
                >
                  {isPublishing ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-background border-t-transparent rounded-full animate-spin mr-2" />
                      Publishing...
                    </>
                  ) : (
                    "Publish Content"
                  )}
                </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PUBLICATION SUCCESS CONFIRMATION MODAL */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] bg-background/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="w-full max-w-md bg-card border border-emerald-500/20 rounded-xl shadow-2xl overflow-hidden flex flex-col relative text-left"
            >
              {/* Outer Glow behind check */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="p-6 text-center space-y-6 relative z-10">
                {/* Glowing Check Circle Icon */}
                <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/5">
                  <CheckCircle2 size={36} className="text-emerald-400 animate-pulse" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold font-display text-foreground">Content Published Successfully!</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                    Your creation is cleared by safety moderation and is now live on the creator network feed.
                  </p>
                </div>

                {/* Published Asset Summary Card */}
                <div className="p-4 bg-muted/30 border border-border/50 rounded-xl flex items-center gap-4 text-left">
                  {resultImage && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-border shrink-0 bg-muted">
                      <AuthenticatedImage 
                        src={resultImage} 
                        alt="Published thumbnail" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-1">
                    <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">LIVE POST</span>
                    <h4 className="text-sm font-bold text-foreground truncate">{title || "Untitled Creation"}</h4>
                    {caption && (
                      <p className="text-xs text-muted-foreground truncate">{caption}</p>
                    )}
                    {selectedHashtags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {selectedHashtags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="inline-flex items-center rounded-md px-2.5 py-1 text-sm font-medium leading-snug bg-primary/15 text-foreground border border-primary/15"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Navigation and Action buttons */}
                <div className="space-y-2.5 pt-2">
                  <Button 
                    variant="brand-gradient" 
                    className="w-full font-bold h-11"
                    onClick={() => {
                      setShowSuccessModal(false);
                      navigate("/feed");
                    }}
                  >
                    View on Community Feed
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      className="border-border/60 hover:bg-muted/50 font-bold h-10 text-xs"
                      onClick={() => {
                        setShowSuccessModal(false);
                        navigate("/my-content");
                      }}
                    >
                      My Content Library
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="hover:bg-foreground/5 font-bold h-10 text-xs"
                      onClick={() => {
                        setShowSuccessModal(false);
                        resetStudioSession();
                      }}
                    >
                      Keep Creating
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animate picker: Quick Ken Burns vs generative AI motion */}
      <Dialog open={animatePickerOpen} onOpenChange={setAnimatePickerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Animate in Clip Studio</DialogTitle>
            <DialogDescription>
              Quick zoom is free. AI motion uses generative I2V (PRO/STUDIO) and can take 1–3 minutes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <button
              type="button"
              onClick={() => setAnimateMode("ken_burns")}
              className={cn(
                "w-full rounded-xl border px-3 py-2.5 text-left transition-colors",
                animateMode === "ken_burns"
                  ? "border-primary/50 bg-primary/10"
                  : "border-border hover:bg-muted/30",
              )}
            >
              <span className="block text-sm font-bold">Quick (Ken Burns)</span>
              <span className="block text-[11px] text-muted-foreground mt-0.5">
                Instant still → MP4 zoom. Free on all plans.
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (userPlan === "FREE") {
                  toast.error("AI motion requires Pro or Studio", {
                    action: { label: "Upgrade", onClick: () => navigate("/upgrade") },
                  });
                  return;
                }
                setAnimateMode("i2v");
              }}
              className={cn(
                "w-full rounded-xl border px-3 py-2.5 text-left transition-colors",
                animateMode === "i2v"
                  ? "border-primary/50 bg-primary/10"
                  : "border-border hover:bg-muted/30",
                userPlan === "FREE" && "opacity-70",
              )}
            >
              <span className="block text-sm font-bold">
                AI motion{userPlan === "FREE" ? " (Pro/Studio)" : ""}
              </span>
              <span className="block text-[11px] text-muted-foreground mt-0.5">
                {userPlan === "FREE"
                  ? "Upgrade to unlock generative video from your still."
                  : "Generative video from your still — reels, ads, commercials."}
              </span>
            </button>
            {animateMode === "i2v" ? (
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Motion prompt (optional)
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Reel energy — punchy camera push-in",
                    "Product ad — soft orbit around subject",
                    "Brand sting — elegant slow drift",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className="text-[10px] font-semibold rounded-full border border-border px-2 py-1 hover:bg-muted/40"
                      onClick={() => setMotionPrompt(preset)}
                    >
                      {preset.split("—")[0].trim()}
                    </button>
                  ))}
                </div>
                <Textarea
                  value={motionPrompt}
                  onChange={(e) => setMotionPrompt(e.target.value)}
                  placeholder="Describe camera motion and vibe…"
                  className="min-h-[72px] text-xs"
                />
              </div>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAnimatePickerOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={isAnimatingAsClip}
              onClick={() => void handleAnimateAsClip(animateMode)}
            >
              {isAnimatingAsClip ? "Starting…" : "Start animate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DEV TERMINAL FOR REAL-TIME API STREAMING */}
      <AnimatePresence>
        {isTerminalOpen && (
          <DevTerminal
            logs={apiLogs}
            isOpen={isTerminalOpen}
            onClose={() => setIsTerminalOpen(false)}
            isMinimized={isTerminalMinimized}
            setIsMinimized={setIsTerminalMinimized}
            onClear={() => setApiLogs([])}
            currentTraceId={currentTraceId}
            isGenerating={isGenerating}
            resultImage={resultImage}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
