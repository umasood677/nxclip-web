import { 
  Heart, 
  MessageSquare, 
  Share2, 
  Bookmark, 
  ChevronLeft,
  Send,
  Loader2,
  Sparkles,
  Copy,
  Check,
  Calendar,
  Clock,
  Layers,
  FileText,
  Hash,
  Image as ImageIcon,
  Film,
  Maximize2,
  Trash2,
  Eye,
  Sliders,
  TrendingUp,
  X,
  Download,
  Wand2,
  FileEdit,
  Cpu,
  Code2,
  Zap,
  Terminal,
  ShieldAlert
} from "lucide-react";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SEO } from "../../components/SEO";
import { AuthenticatedImage } from "../../components/AuthenticatedImage";
import { feedApi, contentApi, extractValidImageUrl, ContentDto, GLOBAL_FALLBACK_IMAGES } from "../../services/apiClient";
import { toast } from "sonner";
import { cn } from "../../lib/utils";

export function generateMetadata(id: string | undefined) {
  return {
    title: `Post ${id} Details - nxclip.ai`,
    description: `Detailed view, AI generation prompt, model configuration, and metadata for creation ${id}.`
  };
}

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [comment, setComment] = useState("");
  const [postData, setPostData] = useState<ContentDto | any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedNegPrompt, setCopiedNegPrompt] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedHashtagsAll, setCopiedHashtagsAll] = useState(false);
  const [copiedHashtag, setCopiedHashtag] = useState<string | null>(null);
  const [copiedRawJson, setCopiedRawJson] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [commentsList, setCommentsList] = useState<Array<{ id: string; author: string; avatar: string; text: string; time: string }>>([]);
  const [isFullscreenImage, setIsFullscreenImage] = useState(false);

  const meta = generateMetadata(id);

  useEffect(() => {
    let isMounted = true;
    async function loadPost() {
      if (!id) return;
      setLoading(true);
      try {
        let data: any = null;
        let fetchError: any = null;

        try {
          // Prefer Feed API for detailed social context
          data = await feedApi.getFeedItemById(id, { suppressErrorLog: true });
        } catch (e1) {
          fetchError = e1;
          try {
            // Fallback to Content API
            data = await contentApi.getContentById(id, { suppressErrorLog: true });
          } catch (e2) {
            fetchError = e2;
            try {
              const list = await contentApi.getUserContentList(100);
              data = list.find(item => String(item.id) === String(id));
            } catch (e3) {
              fetchError = e3;
            }
          }
        }

        if (isMounted) {
          if (data) {
            setPostData(data);
            
            // Comments kept for owner tooling; not product engagement
            try {
              const commentsRes = await feedApi.getCommentsList(id);
              if (commentsRes.items && commentsRes.items.length > 0) {
                setCommentsList(commentsRes.items.map((c: any) => ({
                  id: c.id,
                  author: c.userName || "Anonymous",
                  avatar: c.userAvatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + c.id,
                  text: c.body || "",
                  time: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "Just now"
                })));
              }
            } catch (err) {
              console.warn("Failed to fetch live comments:", err);
            }
          } else {
            const errMsg = Array.isArray(fetchError?.message)
              ? fetchError.message.join(", ")
              : fetchError?.message || "Post not found";
            toast.error(errMsg);
          }
        }
      } catch (e: any) {
        console.warn("Failed to fetch post detail:", e);
        const errMsg = Array.isArray(e?.message) ? e.message.join(", ") : e?.message || "Could not load post details.";
        toast.error(errMsg);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadPost();
    return () => { isMounted = false; };
  }, [id]);

  const handleCopyText = (text: string, type: "prompt" | "negPrompt" | "caption" | "hashtag" | "json", tagValue?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === "prompt") {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
      toast.success("Prompt copied to clipboard");
    } else if (type === "negPrompt") {
      setCopiedNegPrompt(true);
      setTimeout(() => setCopiedNegPrompt(false), 2000);
      toast.success("Negative prompt copied to clipboard");
    } else if (type === "caption") {
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2000);
      toast.success("Caption copied to clipboard");
    } else if (type === "hashtag" && tagValue) {
      setCopiedHashtag(tagValue);
      setTimeout(() => setCopiedHashtag(null), 2000);
      toast.success(`Copied ${tagValue}`);
    } else if (type === "json") {
      setCopiedRawJson(true);
      setTimeout(() => setCopiedRawJson(false), 2000);
      toast.success("Raw JSON metadata copied");
    }
  };

  const handleCopyAllHashtags = () => {
    if (!selectedHashtags || selectedHashtags.length === 0) return;
    const allTags = selectedHashtags.join(" ");
    navigator.clipboard.writeText(allTags);
    setCopiedHashtagsAll(true);
    setTimeout(() => setCopiedHashtagsAll(false), 2000);
    toast.success("All hashtags copied to clipboard!");
  };

  const handleDownloadMedia = async () => {
    if (!imageUrl) return;
    try {
      toast.info("Preparing download...");
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(title || "creation").toLowerCase().replace(/[^a-z0-9]/g, "_")}_nxclip.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Download started!");
    } catch {
      window.open(imageUrl, "_blank");
      toast.success("Opened media asset in new tab");
    }
  };

  const handleRemixInStudio = () => {
    const targetPrompt = prompt || title;
    navigate("/create/image", {
      state: {
        draftId: status === "draft" ? (postData?.id || id) : undefined,
        prompt: targetPrompt,
        style,
        aspectRatio,
        title,
        description,
        imageUrl: initialImageUrl,
        mode: contentType.toLowerCase() === "meme" ? "meme" : "image"
      }
    });
    toast.success("Loaded content into Image Studio!");
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    const newComment = {
      id: `c_${Date.now()}`,
      author: "You",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=You",
      text: comment.trim(),
      time: "Just now"
    };
    setCommentsList(prev => [newComment, ...prev]);
    setComment("");
    toast.success("Comment added!");
  };

  const handleDeletePost = async () => {
    if (!id) return;
    if (confirm("Are you sure you want to delete this creation?")) {
      try {
        await contentApi.deleteContent(id);
        toast.success("Content deleted successfully");
        navigate("/content");
      } catch (err) {
        toast.error("Failed to delete creation");
      }
    }
  };

  // Resolved Fields
  const initialImageUrl = extractValidImageUrl(postData) || GLOBAL_FALLBACK_IMAGES[0];
  const [displayImage, setDisplayImage] = useState<string>("");

  useEffect(() => {
    if (postData) {
      setDisplayImage(extractValidImageUrl(postData));
    }
  }, [postData]);

  const handleImageError = () => {
    setDisplayImage(GLOBAL_FALLBACK_IMAGES[0]);
  };

  const getMetric = (field: string, fallback: number = 0) => {
    if (!postData) return fallback;
    const data = (postData.content && typeof postData.content === "object") ? postData.content : postData;
    
    const mapping: Record<string, string[]> = {
      views: ["viewCount", "views", "reach"],
      likes: ["likeCount", "likes"],
      comments: ["commentCount", "comments"],
      shares: ["shareCount", "shares"],
      saves: ["saveCount", "saves"],
    };

    const keys = mapping[field] || [field];
    for (const key of keys) {
      if (data[key] !== undefined && data[key] !== null) return data[key];
    }
    return fallback;
  };

  const imageUrl = displayImage || initialImageUrl;
  const title = postData?.content?.title || postData?.title || postData?.caption || postData?.description || "Untitled Creation";
  const description = postData?.content?.description || postData?.description || "No description provided.";
  const creatorName = postData?.user?.displayName || postData?.creatorName || postData?.creator || "Verified Creator";
  const creatorAvatar = postData?.user?.photoURL || postData?.creatorAvatar || postData?.avatar || "";
  const publishedAtDisplay = postData?.publishedAt ? new Date(postData.publishedAt).toLocaleDateString() : (postData?.createdAt ? new Date(postData.createdAt).toLocaleDateString() : "Just now");
  const contentType = (postData?.contentType || postData?.content?.contentType || "image").toUpperCase();
  const status = (postData?.status || postData?.content?.status || "published").toLowerCase();
  
  const selectedCaption = postData?.selectedCaption || postData?.caption || "";
  
  const rawHashtags = postData?.selectedHashtags || postData?.hashtags;
  const selectedHashtags: string[] = Array.isArray(rawHashtags) 
    ? rawHashtags 
    : typeof rawHashtags === "string" 
      ? rawHashtags.split(",").map((s: string) => s.trim().startsWith("#") ? s.trim() : `#${s.trim()}`).filter(Boolean)
      : ["#nxclip", "#ai", "#creator", "#gaming"];

  // Enhanced AI Generation Meta Resolution
  const prompt = 
    postData?.prompt || 
    postData?.metadata?.prompt || 
    postData?.parameters?.prompt || 
    postData?.data?.prompt || 
    postData?.title || 
    "";

  const negativePrompt = 
    postData?.negativePrompt || 
    postData?.metadata?.negativePrompt || 
    "";

  const aiModel = 
    postData?.model || 
    postData?.imageModel || 
    postData?.metadata?.model || 
    "Gemini 3.1 Flash Image";

  const style = postData?.style || postData?.metadata?.style || "Cinematic Studio";
  const aspectRatio = postData?.aspectRatio || postData?.metadata?.aspectRatio || "16:9";
  
  const lighting = 
    postData?.lighting || 
    postData?.metadata?.lighting || 
    "Studio Volumetric Softbox";

  const guidance = 
    postData?.creativity?.[0] !== undefined 
      ? `${postData.creativity[0]} / 1.0` 
      : postData?.guidanceScale 
        ? `${postData.guidanceScale}`
        : "0.75 (Balanced)";

  const seed = 
    postData?.seed || 
    postData?.metadata?.seed || 
    (id ? `sd_${id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)}` : "Randomized");

  const topText = postData?.topText || postData?.metadata?.topText || "";
  const bottomText = postData?.bottomText || postData?.metadata?.bottomText || "";

  const alternativeCaptions: string[] = Array.isArray(postData?.captions) 
    ? postData.captions.filter((c: string) => c !== selectedCaption) 
    : [];

  const getResolutionEstimate = (ratio: string) => {
    switch (ratio) {
      case "16:9": return "1920 × 1080 px";
      case "9:16": return "1080 × 1920 px";
      case "1:1": return "1080 × 1080 px";
      case "4:3": return "1440 × 1080 px";
      case "3:4": return "1080 × 1440 px";
      case "4:5": return "1080 × 1350 px";
      case "21:9": return "2560 × 1080 px";
      default: return "1920 × 1080 px";
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "N/A";
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "N/A";
    }
  };

  const updatedAt = formatDate(postData?.updatedAt || postData?.createdAt);

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "published":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Published
          </span>
        );
      case "draft":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Draft
          </span>
        );
      case "processing":
      case "generating":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Loader2 size={12} className="animate-spin" />
            Processing
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-zinc-300 border border-white/10 capitalize">
            {st}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <SEO title={meta.title} description={meta.description} />

      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10"
        >
          <ChevronLeft size={18} />
          Back
        </button>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button 
            onClick={handleRemixInStudio}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-md shadow-primary/20"
          >
            {status === "draft" ? <FileEdit size={14} /> : <Wand2 size={14} />}
            {status === "draft" ? "Edit Draft in Studio" : "Remix in Studio"}
          </button>

          <button 
            onClick={handleDownloadMedia}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-foreground transition-all"
          >
            <Download size={14} />
            Download
          </button>

          <button 
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success("Post link copied to clipboard");
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-foreground transition-all"
          >
            <Share2 size={14} />
            Share
          </button>
          
          <button 
            onClick={handleDeletePost}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>

      {/* Main Grid: Content Details (Left 8 cols) & Sidebar (Right 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column - Media & Complete Information */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Main Media Showcase Card */}
          <div className="ui-card p-0 overflow-hidden border border-white/10 bg-card/60 backdrop-blur-md shadow-2xl rounded-2xl">
            {/* Top Media Frame */}
            <div className="relative bg-black/80 group flex items-center justify-center min-h-[320px] max-h-[560px] overflow-hidden">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                  <Loader2 className="animate-spin text-primary" size={36} />
                  <p className="text-xs text-muted-foreground font-mono">Loading content media...</p>
                </div>
              ) : (
                <>
                  <AuthenticatedImage 
                    src={imageUrl} 
                    fallbackSrc={GLOBAL_FALLBACK_IMAGES[0]}
                    alt={title}
                    className="w-full h-full object-contain max-h-[560px] transition-transform duration-500 group-hover:scale-[1.01]" 
                    referrerPolicy="no-referrer"
                    onError={handleImageError}
                  />
                  
                  {/* Top Overlay Badges */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-black/60 backdrop-blur-md text-white border border-white/20 shadow-lg">
                        {contentType === "CLIP" ? <Film size={12} className="text-primary" /> : <ImageIcon size={12} className="text-primary" />}
                        {contentType}
                      </span>
                      {getStatusBadge(status)}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-black/60 backdrop-blur-md text-zinc-300 border border-white/10">
                        <Sliders size={12} className="text-muted-foreground" />
                        {aspectRatio}
                      </span>
                      <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-black/60 backdrop-blur-md text-zinc-400 border border-white/10">
                        {getResolutionEstimate(aspectRatio)}
                      </span>
                    </div>
                  </div>

                  {/* Expand Fullscreen Button */}
                  <button 
                    onClick={() => setIsFullscreenImage(true)}
                    className="absolute bottom-4 right-4 p-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-black/80 transition-all shadow-lg opacity-0 group-hover:opacity-100"
                    title="View Fullscreen"
                  >
                    <Maximize2 size={16} />
                  </button>
                </>
              )}
            </div>

            {/* Engagement Action Bar — social platformStats only (no in-app likes) */}
            <div className="p-4 sm:p-6 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-4 flex-wrap">
                {(postData?.platformStats?.length ?? 0) > 0 ? (
                  (postData.platformStats as any[]).map((s: any) => (
                    <div key={s.platform} className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
                      <span className="capitalize text-foreground">{s.platform}</span>
                      <span className="flex items-center gap-1"><Eye size={14} />{s.viewsDisplay ?? s.views ?? "—"}</span>
                      <span className="flex items-center gap-1"><Heart size={14} />{s.likesDisplay ?? s.likes ?? "—"}</span>
                      <span className="flex items-center gap-1"><MessageSquare size={14} />{s.commentsDisplay ?? s.comments ?? "—"}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs font-medium text-muted-foreground">Connect social for live stats</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success("Link copied!");
                  }}
                  className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-all group px-2"
                >
                  <Share2 size={20} className="group-hover:scale-110 transition-transform" />
                  <span className="hidden sm:inline">Share</span>
                </button>
                <button 
                  onClick={handleDownloadMedia}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
                  title="Download Media"
                >
                  <Download size={20} />
                </button>

                <button 
                  onClick={() => {
                    setIsSaved(!isSaved);
                    toast.success(isSaved ? "Unsaved" : "Saved to collection");
                  }}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    isSaved ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}
                  title="Bookmark"
                >
                  <Bookmark size={20} className={isSaved ? "fill-primary" : ""} />
                </button>
              </div>
            </div>

            {/* Title & Description Block */}
            <div className="p-6 sm:p-8 space-y-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-foreground tracking-tight mb-2">
                  {title}
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                  {description}
                </p>
              </div>
            </div>
          </div>

          {/* AI Generation Prompt & Studio Parameters Card */}
          <div className="ui-card p-6 sm:p-8 space-y-6 border border-white/10 bg-card/60 backdrop-blur-md rounded-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-amber-400" />
                <h2 className="text-base font-bold text-foreground">AI Prompt & Generation Studio Specs</h2>
              </div>
              <button 
                onClick={handleRemixInStudio}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all"
              >
                <Wand2 size={12} />
                Load Prompt in Studio
              </button>
            </div>

            {/* Prompt Display Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-primary" />
                  <span className="text-xs font-bold text-foreground tracking-wider uppercase">Generation Prompt</span>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleCopyText(prompt, "prompt")}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    {copiedPrompt ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedPrompt ? "Copied Prompt" : "Copy Prompt"}</span>
                  </button>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-black/60 border border-white/10 font-mono text-xs sm:text-sm text-zinc-200 leading-relaxed select-all relative group">
                <p className="whitespace-pre-wrap">{prompt || title}</p>
              </div>
            </div>

            {/* Negative Prompt (if available) */}
            {negativePrompt && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={14} className="text-red-400" />
                    <span className="text-xs font-bold text-foreground tracking-wider uppercase">Negative Prompt</span>
                  </div>
                  <button 
                    onClick={() => handleCopyText(negativePrompt, "negPrompt")}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    {copiedNegPrompt ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedNegPrompt ? "Copied" : "Copy Negative Prompt"}</span>
                  </button>
                </div>
                <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/20 font-mono text-xs text-red-200/90 leading-relaxed select-all">
                  {negativePrompt}
                </div>
              </div>
            )}

            {/* Meme Overlays (if present) */}
            {(topText || bottomText) && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-foreground tracking-wider uppercase block">Meme Overlay Captions</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                  {topText && (
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                      <span className="text-[10px] text-muted-foreground block uppercase font-bold mb-1">Top Overlay</span>
                      <p className="text-foreground font-bold">{topText}</p>
                    </div>
                  )}
                  {bottomText && (
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                      <span className="text-[10px] text-muted-foreground block uppercase font-bold mb-1">Bottom Overlay</span>
                      <p className="text-foreground font-bold">{bottomText}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Detailed Response Information Grid */}
          <div className="ui-card p-6 sm:p-8 space-y-8 border border-white/10 bg-card/60 backdrop-blur-md rounded-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Sliders size={18} className="text-primary" />
                <h2 className="text-base font-bold text-foreground">Creation Specifications & Metadata</h2>
              </div>
              <span className="text-xs font-mono text-muted-foreground">ID: {id}</span>
            </div>

            {/* Key Information Badges & Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Cpu size={14} className="text-primary" />
                  <span>AI Engine / Model</span>
                </div>
                <p className="text-sm font-bold text-foreground truncate">{aiModel}</p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Sparkles size={14} className="text-primary" />
                  <span>Visual Style</span>
                </div>
                <p className="text-sm font-bold text-foreground truncate">{style}</p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Maximize2 size={14} className="text-primary" />
                  <span>Aspect Ratio</span>
                </div>
                <p className="text-sm font-bold text-foreground font-mono">{aspectRatio} ({getResolutionEstimate(aspectRatio)})</p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Zap size={14} className="text-primary" />
                  <span>Lighting / Mood</span>
                </div>
                <p className="text-sm font-bold text-foreground truncate">{lighting}</p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Sliders size={14} className="text-primary" />
                  <span>Creativity Scale</span>
                </div>
                <p className="text-sm font-bold text-foreground font-mono">{guidance}</p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Code2 size={14} className="text-primary" />
                  <span>Generation Seed</span>
                </div>
                <p className="text-xs font-mono font-bold text-foreground truncate">{seed}</p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Layers size={14} className="text-primary" />
                  <span>Content Type</span>
                </div>
                <p className="text-sm font-bold text-foreground uppercase tracking-wide">{contentType}</p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Calendar size={14} className="text-primary" />
                  <span>Published At</span>
                </div>
                <p className="text-xs font-semibold text-foreground">{publishedAtDisplay}</p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Clock size={14} className="text-primary" />
                  <span>Updated At</span>
                </div>
                <p className="text-xs font-semibold text-foreground">{updatedAt}</p>
              </div>
            </div>

            {/* Selected Caption Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-primary" />
                  <span className="text-xs font-bold text-foreground tracking-wider uppercase">Selected Caption</span>
                </div>
                {selectedCaption && (
                  <button 
                    onClick={() => handleCopyText(selectedCaption, "caption")}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    {copiedCaption ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedCaption ? "Copied" : "Copy Caption"}</span>
                  </button>
                )}
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 text-sm text-foreground leading-relaxed">
                {selectedCaption || "No custom caption assigned yet."}
              </div>
            </div>

            {/* AI Generated Alternative Captions (if available) */}
            {alternativeCaptions.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-foreground tracking-wider uppercase block">AI Alternative Captions</span>
                <div className="space-y-2">
                  {alternativeCaptions.map((cap, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between gap-3 text-xs">
                      <p className="text-zinc-300 leading-relaxed truncate">{cap}</p>
                      <button 
                        onClick={() => handleCopyText(cap, "caption")}
                        className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors shrink-0"
                        title="Copy caption"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Hashtags Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hash size={16} className="text-primary" />
                  <span className="text-xs font-bold text-foreground tracking-wider uppercase">Selected Hashtags ({selectedHashtags.length})</span>
                </div>
                <button 
                  onClick={handleCopyAllHashtags}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  {copiedHashtagsAll ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedHashtagsAll ? "Copied All" : "Copy All Tags"}</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedHashtags.map((tag, idx) => (
                  <button 
                    key={idx}
                    onClick={() => handleCopyText(tag, "hashtag", tag)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all cursor-pointer"
                    title="Click to copy hashtag"
                  >
                    {copiedHashtag === tag ? <Check size={12} /> : null}
                    <span>{tag}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Developer Raw JSON Inspector */}
            <div className="border-t border-white/10 pt-4 space-y-3">
              <button 
                onClick={() => setShowRawJson(!showRawJson)}
                className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                <Code2 size={14} className="text-primary" />
                <span>{showRawJson ? "Hide Raw JSON Metadata" : "Inspect Raw JSON Metadata"}</span>
              </button>

              {showRawJson && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-zinc-500">Full Raw Payload Dump</span>
                    <button 
                      onClick={() => handleCopyText(JSON.stringify(postData, null, 2), "json")}
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-primary"
                    >
                      {copiedRawJson ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedRawJson ? "Copied" : "Copy JSON"}</span>
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl bg-black/80 border border-white/10 font-mono text-[11px] text-zinc-400 overflow-x-auto max-h-80 custom-scrollbar select-all">
                    {JSON.stringify(postData, null, 2)}
                  </pre>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Right Column - Author & Interactive Comments Panel */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Author Card */}
          <div className="ui-card p-6 border border-white/10 bg-card/60 backdrop-blur-md rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground tracking-wider uppercase">Creator Profile</h3>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-muted border border-white/20 overflow-hidden shrink-0">
                <img 
                  src={creatorAvatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=You"} 
                  alt="Creator" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-foreground truncate">
                  {creatorName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  Published {publishedAtDisplay}
                </p>
              </div>
            </div>
            {postData?.userId && (
              <button
                type="button"
                className="w-full h-9 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                onClick={async () => {
                  try {
                    await feedApi.followUser(postData.userId);
                    toast.success("Following creator");
                  } catch (err: any) {
                    toast.error(Array.isArray(err?.message) ? err.message.join(", ") : err?.message || "Follow failed");
                  }
                }}
              >
                Follow Creator
              </button>
            )}
          </div>

          {/* Quick Metrics Card — platformStats only */}
          <div className="ui-card p-6 border border-white/10 bg-card/60 backdrop-blur-md rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-muted-foreground tracking-wider uppercase">Social Performance</h3>
              <TrendingUp size={16} className="text-primary" />
            </div>
            {(postData?.platformStats?.length ?? 0) > 0 ? (
              <div className="space-y-3">
                {(postData.platformStats as any[]).map((s: any) => (
                  <div key={s.platform} className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                    <p className="text-xs font-bold capitalize text-foreground">{s.platform}</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Views</p>
                        <p className="text-sm font-extrabold">{s.viewsDisplay ?? s.views ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Likes</p>
                        <p className="text-sm font-extrabold">{s.likesDisplay ?? s.likes ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Comments</p>
                        <p className="text-sm font-extrabold">{s.commentsDisplay ?? s.comments ?? "—"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground font-medium text-center py-4">
                Connect social for live stats
              </p>
            )}
          </div>

          {/* Comments Panel */}
          <div className="ui-card p-0 border border-white/10 bg-card/60 backdrop-blur-md rounded-2xl overflow-hidden flex flex-col h-[480px]">
            <div className="p-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground tracking-wider uppercase flex items-center gap-2">
                <MessageSquare size={14} className="text-primary" />
                Comments ({commentsList.length})
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {commentsList.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground space-y-2">
                  <MessageSquare size={28} className="opacity-40" />
                  <p className="text-xs font-medium">No comments yet. Be the first to start the conversation!</p>
                </div>
              ) : (
                commentsList.map((c) => (
                  <div key={c.id} className="flex gap-3 text-xs">
                    <div className="w-8 h-8 rounded-full bg-muted border border-white/10 overflow-hidden shrink-0">
                      <img src={c.avatar} alt={c.author} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{c.author}</span>
                        <span className="text-[10px] text-muted-foreground">{c.time}</span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed break-words">{c.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="p-3 border-t border-white/10 bg-black/20">
              <div className="relative">
                <input 
                  type="text" 
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="w-full pl-3 pr-10 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs font-medium text-foreground focus:border-primary outline-none transition-all placeholder:text-muted-foreground"
                />
                <button 
                  type="submit"
                  disabled={!comment.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-primary disabled:opacity-30 hover:scale-110 transition-all"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>

      {/* Fullscreen Image Modal */}
      {isFullscreenImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8"
          onClick={() => setIsFullscreenImage(false)}
        >
          <button 
            onClick={() => setIsFullscreenImage(false)}
            className="absolute top-6 right-6 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all border border-white/20 z-10"
          >
            <X size={20} />
          </button>
          <img 
            src={imageUrl} 
            alt={title} 
            className="max-w-full max-h-full object-contain rounded-xl border border-white/10 shadow-2xl" 
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </div>
  );
}
