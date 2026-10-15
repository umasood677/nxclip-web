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
  ShieldAlert,
  UserPlus,
  UserCheck,
  Type as TypeIcon,
  Music,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SEO } from "../../components/SEO";
import { AuthenticatedMediaPreview } from "../../components/AuthenticatedMediaPreview";
import { CreatorAvatar } from "../../components/CreatorAvatar";
import {
  feedApi,
  contentApi,
  identityApi,
  extractValidImageUrl,
  ContentDto,
  GLOBAL_FALLBACK_IMAGES,
} from "../../services/apiClient";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { SocialLiveActions } from "../../components/social/SocialLiveActions";
import { downloadContentMedia } from "../../lib/downloadContentMedia";
import { useAppSelector } from "../../store/hooks";
import { selectAuthUser } from "../../store/slices/authSlice";

const CLIP_BGM_LABELS: Record<string, string> = {
  "1": "Cyberpunk Pulse",
  "2": "Lo-Fi Gaming",
  "3": "Epic Victory",
  "4": "Trap King",
  "5": "Neon Nights",
  "6": "Aggressive Phonk",
  "7": "Summer Vibes",
  "8": "Dark Souls",
  "9": "Future Bass",
  "10": "8-Bit Adventure",
};

function formatClipDuration(inMs?: number, outMs?: number): string {
  if (typeof inMs !== "number" || typeof outMs !== "number" || outMs <= inMs) return "—";
  const sec = Math.max(0, Math.round((outMs - inMs) / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
}

export function generateMetadata(id: string | undefined) {
  return {
    title: `Post details · nxclip.app`,
    description: `Detailed view, AI generation prompt, and metadata for creation ${id || ""}.`.trim(),
  };
}

function resolveDisplayContentType(data: any): string {
  if (!data) return "IMAGE";
  const nested = data.content && typeof data.content === "object" ? data.content : null;
  const raw =
    data.contentType ||
    nested?.contentType ||
    data.type ||
    "";
  if (
    data.memeSpec ||
    nested?.memeSpec ||
    data.style === "meme" ||
    nested?.style === "meme" ||
    String(raw).toLowerCase() === "meme"
  ) {
    return "MEME";
  }
  if (String(raw).toLowerCase() === "clip" || String(raw).toLowerCase() === "video") {
    return "CLIP";
  }
  return String(raw || "image").toUpperCase();
}

function pickPrompt(data: any): string {
  if (!data) return "";
  return (
    data.basePrompt ||
    data.prompt ||
    data.metadata?.prompt ||
    data.parameters?.prompt ||
    data.refinePrompt ||
    ""
  );
}

function pickAspectRatio(data: any): string {
  if (!data) return "1:1";
  const direct =
    data.aspectRatio ||
    data.metadata?.aspectRatio ||
    data.clipEditSpec?.aspect ||
    data.content?.aspectRatio ||
    "";
  if (direct) return String(direct);
  const ct = String(data.contentType || data.type || data.content?.contentType || "")
    .trim()
    .toLowerCase();
  if (ct === "clip" || ct === "video") return "9:16";
  return "1:1";
}

function pickSelectedCaption(data: any): string {
  if (!data) return "";
  const fromFields =
    data.selectedCaption ||
    data.caption ||
    (Array.isArray(data.captions) ? data.captions[0] : "") ||
    data.content?.selectedCaption ||
    data.content?.caption ||
    "";
  if (fromFields) return String(fromFields).trim();
  // Legacy publishes stored the caption only in description
  const title = String(data.title || data.content?.title || "").trim();
  const description = String(data.description || data.content?.description || "").trim();
  if (description && description !== title && description !== "No description provided.") {
    return description;
  }
  return "";
}

function pickSelectedHashtags(data: any): string[] {
  if (!data) return [];

  const asList = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value
        .map((tag) => String(tag || "").trim())
        .filter(Boolean)
        .map((tag) => (tag.startsWith("#") ? tag : `#${tag.replace(/^#+/, "")}`));
    }
    if (typeof value === "string" && value.trim()) {
      return value
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((tag) => (tag.startsWith("#") ? tag : `#${tag.replace(/^#+/, "")}`));
    }
    return [];
  };

  const candidates: unknown[] = [
    data.selectedHashtags,
    data.hashtags,
    Array.isArray(data.hashtagSets) ? data.hashtagSets[0] : undefined,
    data.clipEditSpec?.extras?.hashtags,
    data.content?.selectedHashtags,
    data.content?.hashtags,
    Array.isArray(data.content?.hashtagSets) ? data.content.hashtagSets[0] : undefined,
    data.content?.clipEditSpec?.extras?.hashtags,
  ];

  for (const candidate of candidates) {
    const list = asList(candidate);
    if (list.length) return list;
  }

  // Last resort: pull #tags from caption / description body
  const text = [
    data.selectedCaption,
    data.caption,
    data.description,
    data.content?.description,
  ]
    .filter(Boolean)
    .join(" ");
  const fromText = text.match(/#[\w\u00C0-\u024F]+/g);
  if (fromText?.length) {
    return [...new Set(fromText)];
  }

  return [];
}

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const authUser = useAppSelector(selectAuthUser);
  
  const [comment, setComment] = useState("");
  const [postData, setPostData] = useState<ContentDto | any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedNegPrompt, setCopiedNegPrompt] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedHashtagsAll, setCopiedHashtagsAll] = useState(false);
  const [copiedHashtag, setCopiedHashtag] = useState<string | null>(null);
  const [commentsList, setCommentsList] = useState<Array<{ id: string; author: string; avatar: string; text: string; time: string }>>([]);
  const [isFullscreenImage, setIsFullscreenImage] = useState(false);
  const [creatorProfile, setCreatorProfile] = useState<{
    displayName: string;
    avatarUrl: string;
    username?: string;
    followerCount: number;
    followingCount: number;
    isFollowing: boolean;
  } | null>(null);
  const [followBusy, setFollowBusy] = useState(false);
  /** Intrinsic media aspect (w/h) once video/image loads — avoids letterbox bars. */
  const [mediaAspectCss, setMediaAspectCss] = useState<string | null>(null);
  const [downloadBusy, setDownloadBusy] = useState(false);

  const meta = generateMetadata(id);

  useEffect(() => {
    let isMounted = true;
    async function loadPost() {
      if (!id) return;
      setLoading(true);
      try {
        let data: any = null;
        let fetchError: any = null;

        const [ownedRes, contentRes, feedRes] = await Promise.allSettled([
          contentApi.getUserContentById(id, { suppressErrorLog: true }),
          contentApi.getContentById(id, { suppressErrorLog: true }),
          feedApi.getFeedItemById(id, { suppressErrorLog: true }),
        ]);

        if (ownedRes.status === "fulfilled" && ownedRes.value) {
          data = { ...ownedRes.value };
        } else if (contentRes.status === "fulfilled" && contentRes.value) {
          data = { ...contentRes.value };
        } else if (ownedRes.status === "rejected") {
          fetchError = ownedRes.reason;
        } else if (contentRes.status === "rejected") {
          fetchError = contentRes.reason;
        }

        if (feedRes.status === "fulfilled" && feedRes.value) {
          const feed = feedRes.value as any;
          if (data) {
            data = {
              ...data,
              platformStats: feed.platformStats ?? data.platformStats,
              publishedAt: data.publishedAt || feed.publishedAt,
              title: data.title || feed.title,
              description: data.description || feed.description,
              // Prefer content-service type; only fill gap from feed
              contentType: data.contentType || feed.contentType,
              thumbnailUrl: data.thumbnailUrl || feed.thumbnailUrl,
              userId: data.userId || feed.userId,
              contentId: data.id || feed.contentId,
              socialRollup: feed.socialRollup,
              wesScore: feed.wesScore,
            };
          } else {
            data = feed;
          }
        } else if (!data && feedRes.status === "rejected") {
          fetchError = feedRes.reason;
        }

        if (!data) {
          try {
            const list = await contentApi.getUserContentList(100);
            data = list.find((item) => String(item.id) === String(id));
          } catch (e3) {
            fetchError = e3;
          }
        }

        if (isMounted) {
          if (data) {
            setPostData(data);
            
            const commentTargetId = data.id || data.contentId || id;
            const isPublished = String(data.status || "").toLowerCase() === "published";
            if (isPublished) {
              try {
                const commentsRes = await feedApi.getCommentsList(commentTargetId);
                const items = Array.isArray(commentsRes.items) ? commentsRes.items : [];
                if (items.length > 0) {
                  const userIds = [
                    ...new Set(
                      items
                        .map((c: any) => String(c.userId || "").trim())
                        .filter(Boolean),
                    ),
                  ];
                  const profileEntries = await Promise.all(
                    userIds.map(async (uid) => {
                      try {
                        const u = await identityApi.getUserById(uid);
                        return [
                          uid,
                          {
                            name: u?.displayName || u?.username || "User",
                            avatar: u?.avatarUrl || u?.photoURL || "",
                          },
                        ] as const;
                      } catch {
                        return [uid, { name: "User", avatar: "" }] as const;
                      }
                    }),
                  );
                  const profiles = Object.fromEntries(profileEntries);
                  setCommentsList(
                    items.map((c: any) => {
                      const uid = String(c.userId || "");
                      const profile = profiles[uid];
                      return {
                        id: c.id,
                        author: profile?.name || c.userName || "User",
                        avatar:
                          profile?.avatar ||
                          c.userAvatar ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(uid || c.id)}`,
                        text: c.body || "",
                        time: c.createdAt
                          ? new Date(c.createdAt).toLocaleDateString()
                          : "Just now",
                      };
                    }),
                  );
                }
              } catch (err) {
                console.warn("Failed to fetch live comments:", err);
              }
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

  const creatorUserId = postData?.userId || postData?.content?.userId || "";
  const isOwnPost = !!(
    authUser?.uid &&
    creatorUserId &&
    String(authUser.uid) === String(creatorUserId)
  );

  useEffect(() => {
    if (!creatorUserId) {
      setCreatorProfile(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      if (isOwnPost) {
        setCreatorProfile({
          displayName: authUser?.displayName || "You",
          avatarUrl: authUser?.photoURL || "",
          followerCount: 0,
          followingCount: 0,
          isFollowing: false,
        });
      }
      try {
        const [identity, feedProfile] = await Promise.allSettled([
          identityApi.getUserById(creatorUserId),
          feedApi.getFeedUserProfile(creatorUserId),
        ]);
        if (cancelled) return;
        const u = identity.status === "fulfilled" ? identity.value : null;
        const fp = feedProfile.status === "fulfilled" ? feedProfile.value : null;
        setCreatorProfile({
          displayName:
            u?.displayName ||
            u?.username ||
            (isOwnPost ? authUser?.displayName || "You" : "Creator"),
          avatarUrl: u?.avatarUrl || u?.photoURL || (isOwnPost ? authUser?.photoURL || "" : ""),
          username: u?.username,
          followerCount: fp?.followerCount ?? 0,
          followingCount: fp?.followingCount ?? 0,
          isFollowing: !!fp?.isFollowing,
        });
      } catch {
        if (!cancelled && !isOwnPost) {
          setCreatorProfile({
            displayName: "Creator",
            avatarUrl: "",
            followerCount: 0,
            followingCount: 0,
            isFollowing: false,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [creatorUserId, isOwnPost, authUser?.displayName, authUser?.photoURL]);

  const handleFollowToggle = async () => {
    if (!creatorUserId || isOwnPost || followBusy) return;
    setFollowBusy(true);
    const currently = !!creatorProfile?.isFollowing;
    try {
      if (currently) {
        await feedApi.unfollowUser(creatorUserId);
        setCreatorProfile((prev) =>
          prev
            ? {
                ...prev,
                isFollowing: false,
                followerCount: Math.max(0, (prev.followerCount || 0) - 1),
              }
            : prev,
        );
        toast.success("Unfollowed");
      } else {
        const res = await feedApi.followUser(creatorUserId);
        setCreatorProfile((prev) =>
          prev
            ? {
                ...prev,
                isFollowing: true,
                followerCount: res.followerCount ?? (prev.followerCount || 0) + 1,
              }
            : prev,
        );
        toast.success("Following creator");
      }
    } catch (err: any) {
      toast.error(
        Array.isArray(err?.message) ? err.message.join(", ") : err?.message || "Follow failed",
      );
    } finally {
      setFollowBusy(false);
    }
  };

  const handleCopyText = (
    text: string,
    type: "prompt" | "negPrompt" | "caption" | "hashtag",
    tagValue?: string,
  ) => {
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
    const contentId = postData?.id || id;
    if (!contentId) {
      toast.error("Nothing to download");
      return;
    }
    setDownloadBusy(true);
    const toastId = "post-detail-download";
    try {
      toast.loading("Preparing download…", { id: toastId });
      // All download entry points share this path (auth + render-once for clips).
      await downloadContentMedia({
        id: contentId,
        title: title || postData?.title,
        contentType: postData?.contentType || contentType,
        type: postData?.type,
        mimeType: postData?.mimeType,
        style: postData?.style,
        memeSpec: postData?.memeSpec,
        renderStatus: postData?.renderStatus,
        ensureRender: contentType === "CLIP",
      });
      toast.success("Download started", { id: toastId });
    } catch (err) {
      toast.error("Download failed", {
        id: toastId,
        description: err instanceof Error ? err.message : "Try again in a moment.",
      });
    } finally {
      setDownloadBusy(false);
    }
  };

  const handleRemixInStudio = () => {
    const contentId = postData?.id || id;
    if (contentType === "CLIP") {
      if (!contentId) {
        toast.error("Clip id missing");
        return;
      }
      navigate(`/create/clip/${contentId}/edit?step=polish`);
      toast.success("Opened in Clip Studio");
      return;
    }
    const targetPrompt = prompt || "";
    navigate("/create/image", {
      state: {
        draftId: status === "draft" ? contentId : undefined,
        prompt: targetPrompt,
        style,
        aspectRatio,
        title,
        description,
        imageUrl: initialImageUrl,
        mode: contentType.toLowerCase() === "meme" ? "meme" : "image",
      },
    });
    toast.success("Loaded content into Image Studio!");
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = comment.trim();
    const contentId = postData?.id || postData?.contentId || id;
    if (!body || !contentId) return;
    if (!authUser?.uid) {
      toast.error("Sign in to comment");
      return;
    }
    const optimistic = {
      id: `local_${Date.now()}`,
      author: authUser.displayName || "You",
      avatar:
        authUser.photoURL ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(authUser.uid)}`,
      text: body,
      time: "Just now",
    };
    setCommentsList((prev) => [optimistic, ...prev]);
    setComment("");
    try {
      const saved = await feedApi.addComment(contentId, body);
      setCommentsList((prev) =>
        prev.map((c) =>
          c.id === optimistic.id
            ? {
                ...c,
                id: saved.id,
                time: saved.createdAt
                  ? new Date(saved.createdAt).toLocaleDateString()
                  : "Just now",
              }
            : c,
        ),
      );
      toast.success("Comment posted");
    } catch (err) {
      setCommentsList((prev) => prev.filter((c) => c.id !== optimistic.id));
      setComment(body);
      toast.error("Could not post comment", {
        description: err instanceof Error ? err.message : "Try again.",
      });
    }
  };

  const handleDeletePost = async () => {
    if (!id) return;
    if (confirm("Are you sure you want to delete this creation?")) {
      try {
        await contentApi.deleteContent(id);
        toast.success("Content deleted successfully");
        navigate("/my-content");
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
      setMediaAspectCss(null);
    }
  }, [postData]);

  const handleImageError = () => {
    setDisplayImage(GLOBAL_FALLBACK_IMAGES[0]);
  };

  const getMetric = (field: string, fallback: number = 0) => {
    if (!postData) return fallback;
    const data = (postData.content && typeof postData.content === "object") ? postData.content : postData;
    const stats: any[] = Array.isArray(postData.platformStats)
      ? postData.platformStats
      : Array.isArray(data.platformStats)
        ? data.platformStats
        : [];

    if (stats.length > 0) {
      const rollupKey =
        field === "views" ? "views" : field === "likes" ? "likes" : field === "comments" ? "comments" : null;
      if (rollupKey) {
        return stats.reduce((acc, s) => acc + (Number(s[rollupKey]) || 0), 0);
      }
    }
    
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
  const descriptionRaw = postData?.content?.description || postData?.description || "";
  const selectedCaption = pickSelectedCaption(postData);
  const description =
    descriptionRaw && descriptionRaw !== selectedCaption
      ? descriptionRaw
      : "";
  const creatorName =
    creatorProfile?.displayName ||
    postData?.user?.displayName ||
    postData?.creatorName ||
    postData?.creator ||
    (isOwnPost ? authUser?.displayName || "You" : "Creator");
  const creatorAvatar =
    creatorProfile?.avatarUrl ||
    postData?.user?.photoURL ||
    postData?.user?.avatarUrl ||
    postData?.creatorAvatar ||
    postData?.avatar ||
    (isOwnPost ? authUser?.photoURL || "" : "");
  const publishedAtDisplay = postData?.publishedAt
    ? new Date(postData.publishedAt).toLocaleDateString()
    : postData?.createdAt
      ? new Date(postData.createdAt).toLocaleDateString()
      : "Just now";
  const contentType = resolveDisplayContentType(postData);
  const status = (postData?.status || postData?.content?.status || "published").toLowerCase();
  
  const selectedHashtags = pickSelectedHashtags(postData);

  const prompt = pickPrompt(postData);

  const negativePrompt = 
    postData?.negativePrompt || 
    postData?.metadata?.negativePrompt || 
    "";

  const clipSpec =
    postData?.clipEditSpec && typeof postData.clipEditSpec === "object"
      ? postData.clipEditSpec
      : null;
  const isClip = contentType === "CLIP";

  const aiModel = isClip
    ? clipSpec?.animate?.mode
      ? `NxClip Animate (${clipSpec.animate.mode})`
      : clipSpec?.compose?.enabled
        ? "NxClip Story Engine"
        : "NxClip Clip Studio"
    : postData?.model ||
      postData?.imageModel ||
      postData?.metadata?.model ||
      (contentType === "MEME" ? "NxClip Meme Composer" : "Gemini Image");

  const style = isClip
    ? clipSpec?.creatorCategory ||
      (Array.isArray(clipSpec?.niches) && clipSpec.niches.length
        ? clipSpec.niches.slice(0, 2).join(" · ")
        : null) ||
      postData?.style ||
      "—"
    : postData?.style || postData?.metadata?.style || (contentType === "MEME" ? "Meme" : "—");

  const aspectRatio = pickAspectRatio(postData);
  const frameAspectCss =
    mediaAspectCss ||
    String(aspectRatio || (contentType === "CLIP" ? "9:16" : "1:1")).replace(":", " / ");

  const clipDuration = isClip
    ? formatClipDuration(Number(clipSpec?.inMs), Number(clipSpec?.outMs))
    : "—";
  const clipBgm =
    isClip && clipSpec?.bgmTrackId
      ? CLIP_BGM_LABELS[String(clipSpec.bgmTrackId)] || `Track ${clipSpec.bgmTrackId}`
      : isClip
        ? "None"
        : "—";
  const clipRenderLabel = isClip
    ? String(postData?.renderStatus || "idle").replace(/^\w/, (c: string) => c.toUpperCase())
    : "—";
  const clipCaptionSummary = isClip
    ? [clipSpec?.captions?.topText, clipSpec?.captions?.bottomText]
        .map((t) => String(t || "").trim())
        .filter(Boolean)
        .join(" / ") || "None"
    : "—";

  const lighting =
    postData?.lighting ||
    postData?.metadata?.lighting ||
    "";

  const guidance =
    postData?.creativity?.[0] !== undefined
      ? `${postData.creativity[0]} / 1.0`
      : postData?.guidanceScale
        ? `${postData.guidanceScale}`
        : "";

  const seed = postData?.seed || postData?.metadata?.seed || "";

  const memeTexts: Array<{ slot: string; text: string }> = Array.isArray(postData?.memeSpec?.texts)
    ? postData.memeSpec.texts
    : [];
  const topText =
    postData?.topText ||
    postData?.metadata?.topText ||
    memeTexts.find((t) => /top|upper/i.test(t.slot))?.text ||
    "";
  const bottomText =
    postData?.bottomText ||
    postData?.metadata?.bottomText ||
    memeTexts.find((t) => /bottom|lower/i.test(t.slot))?.text ||
    "";

  const alternativeCaptions: string[] = Array.isArray(postData?.captions) 
    ? postData.captions.filter((c: string) => c && c !== selectedCaption) 
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
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <SEO title={meta.title} description={meta.description} />

      <header className="flex flex-col gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft size={16} />
            Back
          </button>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Post details
          </p>
          <h1 className="truncate text-xl font-display font-bold tracking-tight text-foreground sm:text-2xl">
            {loading ? "Loading…" : title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRemixInStudio}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90"
          >
            {status === "draft" ? <FileEdit size={14} /> : <Wand2 size={14} />}
            {status === "draft" ? "Edit in Studio" : "Remix in Studio"}
          </button>

          <button
            type="button"
            onClick={() => void handleDownloadMedia()}
            disabled={downloadBusy}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs font-semibold text-foreground transition-all hover:bg-muted/50 disabled:opacity-50"
          >
            {downloadBusy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Download
          </button>

          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success("Post link copied to clipboard");
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs font-semibold text-foreground transition-all hover:bg-muted/50"
          >
            <Share2 size={14} />
            Share
          </button>

          <button
            type="button"
            onClick={() => navigate(`/analytics?contentId=${encodeURIComponent(String(id || ""))}`)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs font-semibold text-foreground transition-all hover:bg-muted/50"
          >
            <TrendingUp size={14} />
            Analytics
          </button>

          <button
            type="button"
            onClick={handleDeletePost}
            className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 transition-all hover:bg-red-500/20"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </header>

      {/* Main Grid: Content Details (Left 8 cols) & Sidebar (Right 4 cols) */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
        
        {/* Left Column - Media & Complete Information */}
        <div className="space-y-6 lg:col-span-8">
          
          {/* Main Media Showcase Card */}
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
            {/* Top Media Frame — size from content aspect so 9:16 and 16:9 both fill properly */}
            <div
              className={cn(
                "group relative w-full overflow-hidden bg-zinc-950",
                contentType === "CLIP" ? "mx-auto max-w-lg" : "max-w-full",
              )}
              style={{
                aspectRatio: frameAspectCss,
                maxHeight: contentType === "CLIP" ? "min(78vh, 820px)" : "min(70vh, 640px)",
              }}
            >
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-24 absolute inset-0">
                  <Loader2 className="animate-spin text-primary" size={36} />
                  <p className="font-mono text-xs text-muted-foreground">Loading content media...</p>
                </div>
              ) : (
                <>
                  <AuthenticatedMediaPreview
                    item={postData}
                    kind={contentType === "CLIP" ? "video" : "auto"}
                    src={imageUrl}
                    fallbackSrc={GLOBAL_FALLBACK_IMAGES[0]}
                    alt={title}
                    playable={contentType === "CLIP"}
                    autoPlay={contentType === "CLIP"}
                    priority={contentType === "CLIP"}
                    className="!absolute !inset-0 !h-full !w-full !object-cover"
                    wrapperClassName="!absolute !inset-0 !h-full !w-full !aspect-auto !bg-transparent"
                    showPlayBadge={contentType === "CLIP"}
                    onLoad={(e) => {
                      const el = e.currentTarget;
                      if (el instanceof HTMLVideoElement && el.videoWidth > 0 && el.videoHeight > 0) {
                        setMediaAspectCss(`${el.videoWidth} / ${el.videoHeight}`);
                      } else if (
                        el instanceof HTMLImageElement &&
                        el.naturalWidth > 0 &&
                        el.naturalHeight > 0
                      ) {
                        setMediaAspectCss(`${el.naturalWidth} / ${el.naturalHeight}`);
                      }
                    }}
                    onError={handleImageError}
                  />
                  
                  {/* Top Overlay Badges — above media (z-20) so they never sit under the image */}
                  <div className="pointer-events-none absolute inset-x-4 top-4 z-20 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/70 px-3 py-1 text-xs font-bold text-white shadow-lg backdrop-blur-md">
                        {contentType === "CLIP" ? (
                          <Film size={12} className="text-primary" />
                        ) : contentType === "MEME" ? (
                          <Sparkles size={12} className="text-primary" />
                        ) : (
                          <ImageIcon size={12} className="text-primary" />
                        )}
                        {contentType}
                      </span>
                      {getStatusBadge(status)}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/70 px-2.5 py-1 font-mono text-[11px] font-bold text-zinc-300 backdrop-blur-md">
                        <Sliders size={12} className="text-muted-foreground" />
                        {aspectRatio}
                      </span>
                      <span className="hidden items-center gap-1 rounded-full border border-white/10 bg-black/70 px-2.5 py-1 font-mono text-[11px] font-medium text-zinc-400 backdrop-blur-md sm:inline-flex">
                        {getResolutionEstimate(aspectRatio)}
                      </span>
                    </div>
                  </div>

                  {/* Expand Fullscreen Button — always visible so clips/mobile can open it */}
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFullscreenImage(true);
                    }}
                    className="absolute bottom-4 right-4 z-30 rounded-xl border border-white/20 bg-black/70 p-2.5 text-white shadow-lg backdrop-blur-md transition-all hover:bg-black/90"
                    title="View Fullscreen"
                  >
                    <Maximize2 size={16} />
                  </button>
                </>
              )}
            </div>

            {/* Engagement Action Bar — social platformStats only (no in-app likes) */}
            <div className="flex items-center justify-between border-b border-border/60 bg-muted/10 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-4">
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
                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Eye size={14} />{getMetric("views")}</span>
                    <span className="inline-flex items-center gap-1"><Heart size={14} />{getMetric("likes")}</span>
                    <span className="inline-flex items-center gap-1"><MessageSquare size={14} />{getMetric("comments")}</span>
                    <span className="text-[11px] font-medium">· Connect social for live platform stats</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success("Link copied!");
                  }}
                  className="group flex items-center gap-2 px-2 text-sm font-bold text-muted-foreground transition-all hover:text-foreground"
                >
                  <Share2 size={18} className="transition-transform group-hover:scale-110" />
                  <span className="hidden sm:inline">Share</span>
                </button>
                <button 
                  type="button"
                  onClick={() => void handleDownloadMedia()}
                  disabled={downloadBusy}
                  className="rounded-lg p-2 text-muted-foreground transition-all hover:bg-muted/40 hover:text-foreground disabled:opacity-50"
                  title="Download Media"
                >
                  {downloadBusy ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                </button>

                <button 
                  onClick={() => {
                    setIsSaved(!isSaved);
                    toast.success(isSaved ? "Unsaved" : "Saved to collection");
                  }}
                  className={cn(
                    "rounded-lg p-2 transition-all",
                    isSaved ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  )}
                  title="Bookmark"
                >
                  <Bookmark size={18} className={isSaved ? "fill-primary" : ""} />
                </button>
              </div>
            </div>

            {/* Description Block (title already in page header) */}
            <div className="space-y-3 p-5 sm:p-6">
              {description ? (
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                  {description}
                </p>
              ) : null}
              {selectedCaption ? (
                <div className="rounded-xl border border-border/60 bg-muted/20 px-3.5 py-3">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Caption</p>
                  <p className="text-sm leading-relaxed text-foreground">{selectedCaption}</p>
                </div>
              ) : null}
              {!description && !selectedCaption ? (
                <p className="text-sm italic text-muted-foreground/80">No description or caption provided.</p>
              ) : null}
            </div>
          </div>

          {/* AI Generation Prompt & Studio Parameters Card */}
          <div className="space-y-6 rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
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
                {prompt ? (
                  <p className="whitespace-pre-wrap">{prompt}</p>
                ) : (
                  <p className="italic text-zinc-500">No generation prompt stored for this post.</p>
                )}
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
            {(topText || bottomText || memeTexts.length > 0) && (
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
                  {memeTexts
                    .filter((t) => t.text && t.text !== topText && t.text !== bottomText)
                    .map((t) => (
                      <div key={t.slot} className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                        <span className="text-[10px] text-muted-foreground block uppercase font-bold mb-1">{t.slot}</span>
                        <p className="text-foreground font-bold">{t.text}</p>
                      </div>
                    ))}
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

            {/* Specs — clip fields for videos; image fields only when present */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Cpu size={14} className="text-primary" />
                  <span>{isClip ? "Studio / Engine" : "AI Engine / Model"}</span>
                </div>
                <p className="text-sm font-bold text-foreground truncate">{aiModel}</p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Sparkles size={14} className="text-primary" />
                  <span>{isClip ? "Category / Niche" : "Visual Style"}</span>
                </div>
                <p className="text-sm font-bold text-foreground truncate">{style}</p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Maximize2 size={14} className="text-primary" />
                  <span>Aspect Ratio</span>
                </div>
                <p className="text-sm font-bold text-foreground font-mono">
                  {aspectRatio} ({getResolutionEstimate(aspectRatio)})
                </p>
              </div>

              {isClip ? (
                <>
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <Clock size={14} className="text-primary" />
                      <span>Clip Duration</span>
                    </div>
                    <p className="text-sm font-bold text-foreground font-mono">{clipDuration}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <Music size={14} className="text-primary" />
                      <span>Background Music</span>
                    </div>
                    <p className="text-sm font-bold text-foreground truncate">{clipBgm}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <Film size={14} className="text-primary" />
                      <span>Render Status</span>
                    </div>
                    <p className="text-sm font-bold text-foreground truncate">{clipRenderLabel}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1 col-span-2 sm:col-span-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <TypeIcon size={14} className="text-primary" />
                      <span>Burned Captions</span>
                    </div>
                    <p className="text-sm font-bold text-foreground line-clamp-2">{clipCaptionSummary}</p>
                  </div>
                </>
              ) : (
                <>
                  {lighting ? (
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Zap size={14} className="text-primary" />
                        <span>Lighting / Mood</span>
                      </div>
                      <p className="text-sm font-bold text-foreground truncate">{lighting}</p>
                    </div>
                  ) : null}
                  {guidance ? (
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Sliders size={14} className="text-primary" />
                        <span>Creativity Scale</span>
                      </div>
                      <p className="text-sm font-bold text-foreground font-mono">{guidance}</p>
                    </div>
                  ) : null}
                  {seed ? (
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Code2 size={14} className="text-primary" />
                        <span>Generation Seed</span>
                      </div>
                      <p className="text-xs font-mono font-bold text-foreground truncate">{seed}</p>
                    </div>
                  ) : null}
                </>
              )}

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
                {selectedHashtags.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No hashtags on this post. Add them in Studio before publishing.
                  </p>
                ) : (
                  selectedHashtags.map((tag, idx) => (
                  <button 
                    key={`${tag}-${idx}`}
                    onClick={() => handleCopyText(tag, "hashtag", tag)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all cursor-pointer"
                    title="Click to copy hashtag"
                  >
                    {copiedHashtag === tag ? <Check size={12} /> : null}
                    <span>{tag}</span>
                  </button>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Right Column - Author & Interactive Comments Panel */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Author Card */}
          <div className="ui-card p-6 border border-white/10 bg-card/60 backdrop-blur-md rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground tracking-wider uppercase">Creator Profile</h3>
            <button
              type="button"
              className="flex w-full items-center gap-3 sm:gap-4 text-start rounded-xl hover:bg-muted/30 transition-colors p-2"
              onClick={() => {
                if (isOwnPost) {
                  navigate("/profile");
                  return;
                }
                if (creatorUserId) navigate(`/users/${creatorUserId}`);
              }}
            >
              <CreatorAvatar
                src={creatorAvatar}
                email={creatorName || creatorUserId || "creator"}
                size="lg"
                className="!h-12 !w-12 border-white/20 shrink-0"
              />
              <div className="min-w-0 flex-1 pl-0.5">
                <p className="text-base font-bold text-foreground truncate">
                  {creatorName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {creatorProfile?.username ? `@${creatorProfile.username}` : null}
                  {creatorProfile?.username ? " · " : null}
                  Published {publishedAtDisplay}
                </p>
                {creatorProfile && (creatorProfile.followerCount > 0 || creatorProfile.followingCount > 0) ? (
                  <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                    {creatorProfile.followerCount} followers · {creatorProfile.followingCount} following
                  </p>
                ) : null}
              </div>
            </button>
            {creatorUserId && !isOwnPost ? (
              <button
                type="button"
                disabled={followBusy}
                className={cn(
                  "w-full h-9 mt-1 rounded-lg text-xs font-bold transition-colors inline-flex items-center justify-center gap-2",
                  creatorProfile?.isFollowing
                    ? "bg-muted text-foreground border border-border hover:bg-muted/80"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
                onClick={handleFollowToggle}
              >
                {followBusy ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : creatorProfile?.isFollowing ? (
                  <>
                    <UserCheck size={14} />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus size={14} />
                    Follow Creator
                  </>
                )}
              </button>
            ) : isOwnPost ? (
              <button
                type="button"
                className="w-full h-9 mt-1 rounded-lg text-xs font-bold bg-muted text-foreground border border-border hover:bg-muted/80 transition-colors"
                onClick={() => navigate("/profile")}
              >
                View your profile
              </button>
            ) : null}
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Opens the creator’s public profile to follow, see follower counts, and browse their published posts.
            </p>
          </div>

          {isOwnPost && status === "published" ? (
            <SocialLiveActions
              contentId={postData.contentId || postData.id || id || ""}
              caption={pickSelectedCaption(postData)}
            />
          ) : null}

          {/* Quick Metrics Card — platformStats with content fallbacks */}
          <div className="space-y-4 rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Performance</h3>
              <TrendingUp size={16} className="text-primary" />
            </div>
            {(postData?.platformStats?.length ?? 0) > 0 ? (
              <div className="space-y-3">
                {(postData.platformStats as any[]).map((s: any) => (
                  <div key={s.platform} className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
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
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl border border-border/60 bg-muted/20 px-2 py-3">
                    <p className="text-[10px] text-muted-foreground">Views</p>
                    <p className="text-sm font-extrabold tabular-nums">{getMetric("views")}</p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-muted/20 px-2 py-3">
                    <p className="text-[10px] text-muted-foreground">Likes</p>
                    <p className="text-sm font-extrabold tabular-nums">{getMetric("likes")}</p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-muted/20 px-2 py-3">
                    <p className="text-[10px] text-muted-foreground">Comments</p>
                    <p className="text-sm font-extrabold tabular-nums">{getMetric("comments")}</p>
                  </div>
                </div>
                <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                  Live platform stats appear after you connect social accounts.
                </p>
                <button
                  type="button"
                  onClick={() => navigate(`/analytics?contentId=${encodeURIComponent(String(id || ""))}`)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs font-bold text-foreground transition-colors hover:bg-muted/50"
                >
                  <TrendingUp size={14} />
                  Open Analytics
                </button>
              </div>
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
                    <CreatorAvatar
                      src={c.avatar}
                      email={c.author}
                      size="sm"
                      className="!h-8 !w-8 shrink-0 border-white/10"
                    />
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-foreground truncate">{c.author}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{c.time}</span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed break-words">{c.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={(e) => void handleAddComment(e)} className="p-3 border-t border-white/10 bg-black/20">
              <div className="flex items-center gap-2.5">
                <CreatorAvatar
                  src={authUser?.photoURL || ""}
                  email={authUser?.displayName || authUser?.uid || "you"}
                  size="sm"
                  className="!h-8 !w-8 shrink-0 border-white/15"
                />
                <div className="relative min-w-0 flex-1">
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={
                      authUser?.uid
                        ? "Add a comment…"
                        : "Sign in to comment on this post"
                    }
                    disabled={!authUser?.uid}
                    className="w-full pl-3 pr-10 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs font-medium text-foreground focus:border-primary outline-none transition-all placeholder:text-muted-foreground disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={!comment.trim() || !authUser?.uid}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-primary disabled:opacity-30 hover:scale-110 transition-all"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground leading-relaxed">
                Any signed-in viewer can comment on a published post — following the creator is optional.
              </p>
            </form>
          </div>

        </div>

      </div>

      {/* Fullscreen media modal */}
      {isFullscreenImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8"
          onClick={() => setIsFullscreenImage(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen media"
        >
          <button 
            type="button"
            onClick={(e) => {
                      e.stopPropagation();
                      setIsFullscreenImage(false);
                    }}
            className="absolute top-6 right-6 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all border border-white/20 z-20"
          >
            <X size={20} />
          </button>
          {(() => {
            const token = String(aspectRatio || (contentType === "CLIP" ? "9:16" : "1:1"));
            const [aw, ah] = token.split(/[:/]/).map((n) => Number(n.trim()));
            const w = aw > 0 ? aw : 9;
            const h = ah > 0 ? ah : 16;
            const fsAspect = mediaAspectCss || `${w} / ${h}`;
            const widthCss = `min(90vw, calc(90vh * ${w} / ${h}), ${contentType === "CLIP" ? "28rem" : "70rem"})`;
            return (
              <div
                className="relative overflow-hidden rounded-xl border border-white/10 shadow-2xl bg-zinc-950"
                style={{
                  aspectRatio: fsAspect,
                  width: widthCss,
                  height: "auto",
                  maxHeight: "90vh",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <AuthenticatedMediaPreview
                  item={postData}
                  kind={contentType === "CLIP" ? "video" : "auto"}
                  src={imageUrl}
                  alt={title}
                  playable={contentType === "CLIP"}
                  autoPlay={contentType === "CLIP"}
                  priority
                  className="!absolute !inset-0 !h-full !w-full !max-h-none !max-w-none !object-cover"
                  wrapperClassName="!absolute !inset-0 !h-full !w-full !max-w-none !max-h-none !aspect-auto !bg-transparent"
                  showPlayBadge={contentType === "CLIP"}
                />
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
