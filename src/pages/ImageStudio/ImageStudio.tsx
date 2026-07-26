import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { 
  Sparkles, 
  Download, 
  RefreshCw, 
  Image as ImageIcon, 
  Maximize2, 
  History,
  X,
  Copy,
  Check,
  CheckCircle2
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../components/ui/accordion";
import { Badge } from "../../components/ui/badge";
import { generateImage, generateCaptions, generateTitle, AIError } from "../../services/aiService";
import { contentApi, ContentDto, resolveBaseGatewayUrl, extractValidImageUrl } from "../../services/apiClient";
import { socketService } from "../../services/socketService";
import { SEO } from "../../components/SEO";
import { toast } from "sonner";
import { cn, compressImageBase64, safeStringify } from "../../lib/utils";
import { safeLocalStorage } from "../../lib/safeStorage";
import { GenerationHistoryItem } from "./types";
import { GeneratePanel } from "./components/GeneratePanel";
import { CanvasPanel } from "./components/CanvasPanel";
import { EditPanel } from "./components/EditPanel";
import { triggerHaptic } from "../../lib/vibration";
import { AuthenticatedImage } from "../../components/AuthenticatedImage";
import { DevTerminal, ApiCallLog } from "./components/DevTerminal";

const SUGGESTION_POOL = [
  "Cyberpunk neon street",
  "Vintage pixel art gamer",
  "Cinematic fantasy castle",
  "Futuristic gaming setup",
  "Adorable 3D mascot",
  "Dark horror aesthetic",
  "Synthwave sunset drive",
  "Epic boss battle scene",
  "Funny reaction meme",
  "Cozy lofi gaming room",
  "Post-apocalyptic ruins",
  "Stylized anime landscape",
  "Surreal dream world",
  "High-octane racing",
  "Magic forest at night"
];

const STYLE_SPECIFIC_SUGGESTIONS: Record<string, string[]> = {
  realistic: [
    "Ultra-detailed portrait of a cyberpunk hacker",
    "High-resolution landscape of a Scandinavian fjord",
    "Close-up of a high-tech mechanical keyboard with RGB lighting",
    "Professional photograph of a modern desert villa",
    "Macro shot of a butterfly on a vibrant flower"
  ],
  cinematic: [
    "Wide shot of an abandoned space colony on a red planet",
    "Dramatic silhouette of a knight standing against a sunset",
    "Intense car chase through a rain-slicked futuristic city",
    "Moodily lit epic fantasy library with floating candles",
    "First-person view of a high-speed snowy mountain descent"
  ],
  cartoon: [
    "Cutesy 3D render of a baby dragon eating a taco",
    "Stylized 2D animation character of a space adventurer",
    "Colorful whimsical village made of giant candy",
    "Vector art mascot for a tech startup",
    "Retro Saturday morning cartoon style superhero"
  ],
  thumbnail: [
    "Aggressive red border gaming thumbnail with epic text",
    "Bright high-contrast reaction face for a tech review",
    "Money falling from the sky with a large success badge",
    "Progression comparison from a noob to a pro in a sandbox game",
    "Extreme fitness transformation with bold motivational quotes"
  ],
  meme: [
    "Distorted surreal humor image with a confused cat",
    "Classic impact font style template of a person winning",
    "Deep-fried aesthetic of a common household object",
    "Wholesome drawing of a supportive animal friend",
    "Nihilistic abstract art for a relatable 3am thought"
  ]
};

const AVAILABLE_MODELS = [
  { id: "gemini-3.1-flash-lite-image", label: "Gemini 3.1 Flash Lite Image (Fast)" },
  { id: "gemini-3.1-flash-image", label: "Gemini 3.1 Flash Image (Standard)" },
  { id: "gemini-3-pro-image", label: "Gemini 3 Pro Image (High Quality)" },
];

export default function ImageStudio() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const navigate = useNavigate();
  const location = useLocation();

  const STYLE_PRESETS = [
    { id: "realistic", label: t('image_studio.style_presets.realistic') },
    { id: "cinematic", label: t('image_studio.style_presets.cinematic') },
    { id: "cartoon", label: t('image_studio.style_presets.cartoon') },
    { id: "thumbnail", label: t('image_studio.style_presets.thumbnail') },
    { id: "meme", label: t('image_studio.style_presets.meme') },
  ];
  const [mode, setMode] = useState<"image" | "meme">("image");
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [style, setStyle] = useState("cinematic");
  const [aspectRatio, setAspectRatio] = useState("1:1");

  const [searchParams] = useSearchParams();
  const [imageModel, setImageModel] = useState("gemini-3.1-flash-lite-image");
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
      const contentList = await contentApi.getUserContentList();
      if (Array.isArray(contentList) && contentList.length > 0) {
        const mappedItems: GenerationHistoryItem[] = contentList.map(item => {
          let itemTimestamp = Date.now();
          if (item && item.createdAt) {
            const parsedTime = new Date(item.createdAt).getTime();
            if (!isNaN(parsedTime)) {
              itemTimestamp = parsedTime;
            }
          }
          return {
            id: item?.id || Math.random().toString(),
            url: item?.thumbnailUrl || (item as any)?.cdnUrl || "",
            title: item?.title || "Untitled Creation",
            prompt: item?.title || item?.description || "",
            type: (item?.contentType as "image" | "meme") || "image",
            style: item?.description?.includes("Generated style:") 
              ? item.description.split("Generated style:")[1]?.split("with ratio:")[0]?.trim() || "cinematic"
              : "cinematic",
            timestamp: itemTimestamp
          };
        });
        setHistory(mappedItems);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error("Failed to load history from Content API:", err);
    }
  };

  useEffect(() => {
    fetchHistoryFromContentApi();

    const savedGens = safeLocalStorage.getItem("nxclip_generations_left");
    if (savedGens !== null) {
      const currentVal = Number(savedGens);
      if (currentVal < 20) {
        setGenerationsLeft(20);
        safeLocalStorage.setItem("nxclip_generations_left", "20");
      } else {
        setGenerationsLeft(currentVal);
      }
    } else {
      setGenerationsLeft(20);
    }
  }, []);

  useEffect(() => {
    safeLocalStorage.setItem("nexaclip_image_history", safeStringify(history));
  }, [history]);
  
  // Meme state
  const [topText, setTopText] = useState("");
  const [bottomText, setBottomText] = useState("");
  const [captionStyle, setCaptionStyle] = useState("impact");

  // Advanced state
  const [creativity, setCreativity] = useState([70]);
  const [lighting, setLighting] = useState("natural");
  const [negativePrompt, setNegativePrompt] = useState("");

  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [generationsLeft, setGenerationsLeft] = useState<number | null>(null);
  const [caption, setCaption] = useState("");
  const [captionSuggestions, setCaptionSuggestions] = useState<string[]>([]);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  
  const [currentContentId, setCurrentContentId] = useState<string | null>(null);
  const [generatedHashtags, setGeneratedHashtags] = useState<string[][]>([]);
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Initialize draft data from location state or search params
  useEffect(() => {
    const draftIdFromParam = searchParams.get("draftId") || searchParams.get("editId");

    if (location.state) {
      if (location.state.prompt) setPrompt(location.state.prompt);
      if (location.state.title) setTitle(location.state.title);
      if (location.state.description) setDescription(location.state.description);
      if (location.state.style) setStyle(location.state.style);
      if (location.state.aspectRatio) setAspectRatio(location.state.aspectRatio);
      if (location.state.mode) setMode(location.state.mode);
      if (location.state.imageUrl) setResultImage(location.state.imageUrl);
      if (location.state.draftId) setCurrentContentId(location.state.draftId);
      if (location.state.caption) setCaption(location.state.caption);

      if (location.state.draftId || location.state.imageUrl) {
        toast.info(t("image_studio.draft_loaded", { defaultValue: "Continuing draft in Image Studio" }), { id: "draft-loaded" });
      }
    } else if (draftIdFromParam) {
      (async () => {
        try {
          const item = await contentApi.getContentById(draftIdFromParam, { suppressErrorLog: true });
          if (item) {
            const imgUrl = extractValidImageUrl(item) || item.thumbnailUrl || (item.mediaUrl as string);
            setPrompt(item.title || item.caption || item.description || "");
            setTitle(item.title || item.caption || "Draft Creation");
            if (item.description) setDescription(item.description);
            if (imgUrl) setResultImage(imgUrl);
            setCurrentContentId(item.id);
            if (item.contentType === "meme") setMode("meme");
            toast.info(t("image_studio.draft_loaded", { defaultValue: "Loaded draft into Image Studio" }), { id: "draft-param-loaded" });
          }
        } catch (err) {
          console.error("Failed to load draft item by ID:", err);
        }
      })();
    }
  }, [location.state, searchParams]);

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
    if (!prompt) return;
    if (generationsLeft !== null && generationsLeft <= 0) {
      setError("No generations left today. Upgrade your plan for more!");
      triggerHaptic('warning');
      return;
    }

    // Open terminal automatically to display the execution log in real-time
    setIsTerminalOpen(true);
    setIsTerminalMinimized(false);

    executeActualGeneration();
  };

  const executeActualGeneration = async () => {
    setIsGenerating(true);
    setError(null);
    triggerHaptic('heavy');
    
    const isMeme = mode === "meme";
    const targetPrompt = isMeme
      ? `${prompt}. Meme format with top text: "${topText}" and bottom text: "${bottomText}"`
      : prompt;
    const canRegenerate =
      Boolean(currentContentId) &&
      !isPublished &&
      !isMeme;

    const payload = isMeme
      ? { mode: "ai", prompt: targetPrompt, style: "meme", aspectRatio, topText, bottomText }
      : { prompt: targetPrompt, style, aspectRatio, model: "default" };
    const apiPath = canRegenerate
      ? `/content/${currentContentId}/regenerate`
      : isMeme
        ? "/content/meme"
        : "/content/generate";
    const { id: generateLogId, traceId } = addApiLog("POST", apiPath, payload);

    try {
      toast.info(canRegenerate ? "Regenerating draft…" : "Generating content from API...", {
        description: isMeme ? "Meme Studio (POST /content/meme)" : `Style: ${style}`,
      });
      
      let apiResponse: any;
      if (canRegenerate && currentContentId) {
        apiResponse = await contentApi.regenerateImage(currentContentId, {
          prompt: targetPrompt,
          style,
          aspectRatio,
          model: "default",
        });
      } else if (isMeme) {
        apiResponse = await contentApi.createMeme({
          mode: "ai",
          prompt: targetPrompt,
          aspectRatio: (aspectRatio as "1:1" | "16:9" | "9:16") || "1:1",
          texts: [
            ...(topText ? [{ slot: "top", text: topText }] : []),
            ...(bottomText ? [{ slot: "bottom", text: bottomText }] : []),
          ],
        });
      } else {
        apiResponse = await contentApi.generateImage(targetPrompt, style, aspectRatio, "default");
      }
      const contentId = apiResponse.contentId || apiResponse.id || apiResponse.jobId;

      if (!contentId) {
        throw new Error("Failed to generate content: No content ID returned.");
      }

      const img = apiResponse.imageUrl || apiResponse.cdnUrl || apiResponse.thumbnailUrl;
      if (!img) {
        throw new Error("API response did not contain an image payload.");
      }
      const thumb = apiResponse.thumbnailUrl || img;

      // Log details into browser console
      console.log("=== Image Studio API Response ===");
      console.log("Content ID:", contentId);
      console.log("Generated Image:", img.substring(0, 100) + "...");
      console.log("=================================");

      // Update generation log in DevTerminal with final URLs
      updateApiLogSuccess(
        generateLogId, 
        200, 
        {
          ...apiResponse,
          cdnUrl: img,
          thumbnailUrl: thumb
        }, 
        `Generation completed inline. Content ID: ${contentId}`
      );
      setResultImage(img);
      setVariations([img]);

      // Set publication draft states
      setCurrentContentId(contentId);
      setIsPublished(false);
      setIsPublishing(false);
      setDescription("");
      
      if (apiResponse.captions) {
        setCaptionSuggestions(apiResponse.captions);
        setCaption(apiResponse.captions[0] || "");
      }
      if (apiResponse.hashtagSets) {
        setGeneratedHashtags(apiResponse.hashtagSets);
        setSelectedHashtags(apiResponse.hashtagSets[0] || []);
      }

      // Track the history reloading call
      const { id: listLogId } = addApiLog("GET", "/content/mine", undefined, traceId);
      try {
        await fetchHistoryFromContentApi();
        updateApiLogSuccess(listLogId, 200, { success: true }, "History list successfully updated.");
      } catch (historyErr: any) {
        updateApiLogFailed(listLogId, historyErr?.statusCode || 500, historyErr, "Failed to refresh history list.");
      }

      setGenerationsLeft(prev => {
        const newVal = prev !== null ? Math.max(0, prev - 1) : 19;
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
      
      // Update generation log in terminal as failed
      const statusCode = err?.statusCode || 500;
      updateApiLogFailed(generateLogId, statusCode, err, `Generation failed: ${err?.message || errorMessage}`);

      if (err instanceof AIError) {
        errorMessage = err.message;
        toast.error("Image Generation Failed", {
          description: errorMessage,
          action: err.code === "RATE_LIMIT" ? {
            label: "Retry",
            onClick: () => handleGenerate()
          } : undefined
        });
      } else if (err && typeof err === "object" && "message" in err) {
        errorMessage = String((err as any).message);
        toast.error("Image Generation Failed", {
          description: errorMessage
        });
      } else {
        toast.error("Image Generation Failed", {
          description: errorMessage
        });
      }
      setError(errorMessage);
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
      
      const publishRes = await contentApi.publish(currentContentId, {
        title,
        caption,
        hashtags: selectedHashtags,
        description,
      });

      updateApiLogSuccess(publishLogId, 200, publishRes, "Content status set to [publishing]");

      const { id: listId } = addApiLog("GET", "/content/mine", undefined, traceId);
      
      await fetchHistoryFromContentApi();
      updateApiLogSuccess(listId, 200, { success: true }, "History list updated with published item.");

      toast.info("Submitted for moderation", {
        description: "Waiting for content:moderation_complete — you can watch the Notifications page.",
      });

      const publishedId = currentContentId;
      const unsubMod = socketService.subscribe("content:moderation_complete", (_evt, payload) => {
        const data = (payload as { data?: any })?.data || payload;
        if (data?.contentId && data.contentId !== publishedId) return;
        unsubMod();
        void fetchHistoryFromContentApi();
        if (data?.status === "approved" || data?.status === "published") {
          setIsPublished(true);
          toast.success("Moderation approved — content can appear on your Home feed.");
          setShowSuccessModal(true);
        } else {
          toast.error("Moderation rejected", {
            description: data?.reason || "Edit the draft and publish again.",
          });
          setIsPublished(false);
        }
      });
      
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

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
  };

  const handleReuseGeneration = (item: GenerationHistoryItem) => {
    setPrompt(item.prompt);
    setTitle(item.title || "");
    setStyle(item.style || "cinematic");
    if (item.type) {
      setMode(item.type as "image" | "meme");
    }
    if (item.url) {
      setResultImage(item.url);
    }
    if (item.id) {
      setCurrentContentId(item.id);
    }
    setIsPublished(false);
    setIsPublishing(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDownload = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexaclip-gen-${Date.now()}.png`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
              prompt={prompt} setPrompt={setPrompt}
              title={title} setTitle={setTitle}
              isGeneratingTitle={isGeneratingTitle}
              handleGenerateTitle={handleGenerateTitle}
              style={style} setStyle={setStyle}
              aspectRatio={aspectRatio} setAspectRatio={setAspectRatio}
              imageModel={imageModel} setImageModel={setImageModel}
              isGenerating={isGenerating}
              handleGenerate={handleGenerate}
              activeSuggestions={activeSuggestions}
              refreshSuggestions={refreshSuggestions}
              STYLE_PRESETS={STYLE_PRESETS}
              AVAILABLE_MODELS={AVAILABLE_MODELS}
              handleSuggestionClick={handleSuggestionClick}
              generationsLeft={generationsLeft}
              setIsQuickEditOpen={setIsQuickEditOpen}
              topText={topText} setTopText={setTopText}
              bottomText={bottomText} setBottomText={setBottomText}
              captionStyle={captionStyle} setCaptionStyle={setCaptionStyle}
              creativity={creativity} setCreativity={setCreativity}
              lighting={lighting} setLighting={setLighting}
              negativePrompt={negativePrompt} setNegativePrompt={setNegativePrompt}
              caption={caption} setCaption={setCaption}
              isGeneratingCaption={isGeneratingCaption}
              handleGenerateCaption={handleGenerateCaption}
              captionSuggestions={captionSuggestions}
              resultImage={resultImage}
              history={history}
              handleReuseGeneration={handleReuseGeneration}
              setIsConfirmClearOpen={setIsConfirmClearOpen}
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
              handleDownload={handleDownload}
              variations={variations}
              setResultImage={setResultImage}
              brightness={brightness} setBrightness={setBrightness}
              contrast={contrast} setContrast={setContrast}
              saturation={saturation} setSaturation={setSaturation}
              onPublishClick={() => setIsPublishModalOpen(true)}
              isPublishing={isPublishing}
              isPublished={isPublished}
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
          prompt={prompt} setPrompt={setPrompt}
          title={title} setTitle={setTitle}
          isGeneratingTitle={isGeneratingTitle}
          handleGenerateTitle={handleGenerateTitle}
          style={style} setStyle={setStyle}
          aspectRatio={aspectRatio} setAspectRatio={setAspectRatio}
          imageModel={imageModel} setImageModel={setImageModel}
          isGenerating={isGenerating}
          handleGenerate={handleGenerate}
          activeSuggestions={activeSuggestions}
          refreshSuggestions={refreshSuggestions}
          STYLE_PRESETS={STYLE_PRESETS}
          AVAILABLE_MODELS={AVAILABLE_MODELS}
          handleSuggestionClick={handleSuggestionClick}
          generationsLeft={generationsLeft}
          setIsQuickEditOpen={setIsQuickEditOpen}
          topText={topText} setTopText={setTopText}
          bottomText={bottomText} setBottomText={setBottomText}
          captionStyle={captionStyle} setCaptionStyle={setCaptionStyle}
          creativity={creativity} setCreativity={setCreativity}
          lighting={lighting} setLighting={setLighting}
          negativePrompt={negativePrompt} setNegativePrompt={setNegativePrompt}
          caption={caption} setCaption={setCaption}
          isGeneratingCaption={isGeneratingCaption}
          handleGenerateCaption={handleGenerateCaption}
          captionSuggestions={captionSuggestions}
          resultImage={resultImage}
          history={history}
          handleReuseGeneration={handleReuseGeneration}
          setIsConfirmClearOpen={setIsConfirmClearOpen}
          className="w-80 h-full"
        />

        {/* CENTER PANEL - Canvas */}
        <CanvasPanel 
          resultImage={resultImage}
          aspectRatio={aspectRatio}
          isGenerating={isGenerating}
          error={error}
          handleGenerate={handleGenerate}
          handleDownload={handleDownload}
          variations={variations}
          setResultImage={setResultImage}
          brightness={brightness} setBrightness={setBrightness}
          contrast={contrast} setContrast={setContrast}
          saturation={saturation} setSaturation={setSaturation}
          onPublishClick={() => setIsPublishModalOpen(true)}
          isPublishing={isPublishing}
          isPublished={isPublished}
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
          isPublishing={isPublishing}
          isPublished={isPublished}
          className="w-72" 
        />
      </div>

      <div className="mt-8">
        <Accordion className="w-full">
          <AccordionItem value="history" className="border-border bg-card/30 rounded-lg px-8 overflow-hidden shadow-xl backdrop-blur-md">
            <AccordionTrigger className="hover:no-underline py-6 group/trigger">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary transition-transform group-hover/trigger:scale-110">
                    <History size={24} />
                  </div>
                  <div className={cn(isRTL ? "text-right" : "text-left")}>
                    <h4 className="text-lg font-display font-bold text-foreground">{t('image_studio.history.title')}</h4>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">{t('image_studio.history.subtitle')}</p>
                  </div>
                </div>
                {history.length > 0 && (
                  <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary font-mono">
                    {history.length} ITEMS
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Your last {history.length} generations are saved locally.
                  </p>
                  {history.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setIsConfirmClearOpen(true)}
                      className="text-[10px] font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 uppercase tracking-wider"
                    >
                      Clear All
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {history.length === 0 ? (
                      <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-border/50 rounded-lg bg-muted/10">
                        <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                          <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                        <h5 className="text-sm font-bold text-foreground mb-1">No generations yet</h5>
                        <p className="text-xs text-muted-foreground">Start creating above to build your history.</p>
                      </div>
                  ) : (
                    history.map((item, i) => (
                      <motion.div 
                        key={item.timestamp || i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => handleReuseGeneration(item)}
                        className="group/hist relative flex flex-col p-4 rounded-lg bg-background/40 border border-border hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 cursor-pointer"
                      >
                        <div className="flex gap-4 mb-4">
                          <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0 border border-border relative group/thumb">
                            <AuthenticatedImage 
                              src={item.url} 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer" 
                            />
                            <div className="absolute inset-0 bg-popover/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setResultImage(item.url);
                                }}
                              >
                                <Maximize2 size={16} />
                              </Button>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-foreground line-clamp-1 mb-0.5">
                                  {item.title || "Untitled Creation"}
                                </span>
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  {new Date(item.timestamp).toLocaleDateString()}
                                </span>
                                <div className="flex gap-1 mt-1">
                                  <Badge variant="secondary" className="w-fit text-[8px] h-4 px-1 uppercase tracking-tighter">
                                    {item.style}
                                  </Badge>
                                  <Badge variant="outline" className="w-fit text-[8px] h-4 px-1 uppercase tracking-tighter border-primary/30 text-primary">
                                    {item.type}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <p className="text-[11px] text-foreground/80 line-clamp-3 italic leading-relaxed">
                              "{item.prompt}"
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="h-9 text-[10px] gap-2 font-bold uppercase tracking-wider"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReuseGeneration(item);
                            }}
                          >
                            <RefreshCw size={14} />
                            Reuse Prompt
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-9 text-[10px] gap-2 font-bold uppercase tracking-wider"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(item.url);
                            }}
                          >
                            <Download size={14} />
                            Download
                          </Button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
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
                      "text-xs font-mono transition-colors",
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
              <h3 className="text-xl font-bold text-foreground mb-2">Clear History?</h3>
              <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                This will permanently delete your local generation history. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setIsConfirmClearOpen(false)}>Cancel</Button>
                <Button variant="destructive" className="font-bold" onClick={clearHistory}>
                  Clear Everything
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
                          <span className="text-[10px] font-mono text-muted-foreground uppercase">
                            {aspectRatio} • Draft
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Form fields column */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="publish-title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Post Title</Label>
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
                      <Label htmlFor="publish-caption" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Caption</Label>
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
                      <Label htmlFor="publish-description" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Detailed Description</Label>
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
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hashtags / Tags</Label>
                      <div className="flex flex-wrap gap-1.5 p-2.5 bg-muted/20 border border-border/50 rounded-lg min-h-[40px] items-center">
                        {selectedHashtags.length === 0 ? (
                          <span className="text-xs text-muted-foreground px-1">No hashtags selected. Select AI suggestions below or add custom tags.</span>
                        ) : (
                          selectedHashtags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-[10px] font-mono py-0.5 px-2 flex items-center gap-1 border border-primary/15 bg-primary/5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all cursor-pointer group animate-none"
                              onClick={() => setSelectedHashtags(prev => prev.filter(t => t !== tag))}
                              title="Click to remove"
                            >
                              #{tag}
                              <X size={8} className="text-muted-foreground group-hover:text-destructive transition-colors" />
                            </Badge>
                          ))
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-mono font-bold">#</span>
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
                            className="pl-6 bg-muted/30 border-border/50 focus:border-primary/50 transition-all text-xs h-9"
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
                      <Label className="text-xs text-muted-foreground">Select AI Suggested Caption</Label>
                      <div className="grid grid-cols-1 gap-2">
                        {captionSuggestions.slice(0, 3).map((suggestion, idx) => {
                          const isSelected = caption === suggestion;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setCaption(suggestion)}
                              className={cn(
                                "text-left p-3 rounded-lg border text-xs leading-relaxed transition-all",
                                isSelected 
                                  ? "bg-primary/5 border-primary text-foreground shadow-sm shadow-primary/10" 
                                  : "bg-muted/20 border-border/40 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                              )}
                              disabled={isPublishing}
                            >
                              {suggestion}
                            </button>
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
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSelectedHashtags(hashSet)}
                              className={cn(
                                "text-left p-3 rounded-lg border transition-all flex flex-wrap gap-1.5 items-center",
                                isSelected 
                                  ? "bg-primary/5 border-primary shadow-sm shadow-primary/10" 
                                  : "bg-muted/20 border-border/40 hover:bg-muted/40"
                              )}
                              disabled={isPublishing}
                            >
                              <span className={cn(
                                "text-[10px] uppercase font-bold tracking-wider mr-2",
                                isSelected ? "text-primary" : "text-muted-foreground"
                              )}>
                                Set {idx + 1}
                              </span>
                              {hashSet.map((tag, tIdx) => (
                                <span 
                                  key={tIdx}
                                  className={cn(
                                    "px-1.5 py-0.5 rounded text-[10px] font-mono",
                                    isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                  )}
                                >
                                  #{tag}
                                </span>
                              ))}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-border/50 bg-muted/20 flex justify-end gap-3">
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
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedHashtags.map((tag, tIdx) => (
                          <span key={tIdx} className="text-[8px] font-mono text-primary bg-primary/5 px-1 rounded border border-primary/10">
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
                      onClick={() => setShowSuccessModal(false)}
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
