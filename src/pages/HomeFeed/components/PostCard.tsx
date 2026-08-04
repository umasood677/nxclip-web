import { memo, useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Share2,
  MoreHorizontal,
  Sparkles,
  BarChart3,
  Youtube,
  Instagram,
  Trash2,
  ExternalLink,
  FileEdit,
  Eye,
  Heart,
  MessageSquare,
  Link2,
  Radio,
  Clock,
  UserRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { TiktokIcon } from "../../../components/TiktokIcon";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../components/ui/tooltip";
import { cn } from "../../../lib/utils";
import { AuthenticatedImage } from "../../../components/AuthenticatedImage";
import { CreatorAvatar } from "../../../components/CreatorAvatar";
import { cssAspectRatio } from "../../../components/JustifiedGallery";
import type { PlatformStatDto } from "../../../services/apiClient";

const sanitizeImageUrl = (url?: string): string => {
  if (
    !url ||
    typeof url !== "string" ||
    url.includes("gcs-mock-upload-bucket") ||
    url.includes("mock-bucket") ||
    url.includes("undefined") ||
    url.includes("null") ||
    url.trim() === ""
  ) {
    return "";
  }
  const trimmed = url.trim();
  if (trimmed.startsWith("/")) {
    return `${window.location.origin}${trimmed}`;
  }
  return trimmed;
};

export type SocialTargetStatus = "scheduled" | "publishing" | "live" | "failed";

export interface SocialTarget {
  platform: "youtube" | "instagram" | "tiktok" | string;
  status: SocialTargetStatus;
  /** ISO or display time when the post goes live on that platform */
  scheduledAt?: string;
  externalUrl?: string;
}

export interface Post {
  id: string | number;
  contentId?: string;
  userId?: string;
  /** Author display name — only meaningful for other creators' posts */
  creator: string;
  game?: string;
  time: string;
  content: string;
  tags?: string[];
  contentType: "clip" | "meme" | "image" | "insight";
  platform: "tiktok" | "youtube" | "instagram" | "twitch" | "all";
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  engagement: number;
  retention?: number;
  avgWatchTime?: string;
  image: string;
  avatar: string;
  isLiked?: boolean;
  planStep?: string;
  aiInsight?: string;
  /** Content pipeline status from API (draft → published → …) */
  status?: string;
  platformStats?: PlatformStatDto[];
  wesScore?: number;
  socialRollup?: string;
  aspectRatio?: string;
  /** Per-platform social destinations (Live when posted to YT/IG/TikTok) */
  socialTargets?: SocialTarget[];
  /** True when this card is the current user's own content */
  isOwn?: boolean;
  /** Whether the viewer already follows this author */
  isFollowing?: boolean;
}

interface PostCardProps {
  post: Post;
  /** Numeric width/height when the card sits inside a JustifiedGallery slot. */
  aspectRatio?: number;
  /** Reports the loaded image's size so posts stored without a ratio can be laid out. */
  onMediaLoad?: (naturalWidth: number, naturalHeight: number) => void;
  onLike?: (id: string | number) => void;
  onDelete?: (id: string | number) => void;
  onFollow?: (userId: string, currentlyFollowing: boolean) => void;
  /** Local UI update when scheduling to a social platform (prep for real integration) */
  onSocialSchedule?: (postId: string | number, target: SocialTarget) => void;
  priority?: boolean;
  index?: number;
}

function formatStat(value?: number, display?: string): string {
  if (display) return display;
  if (value == null) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function PlatformIcon({ platform, size = 11 }: { platform: string; size?: number }) {
  const p = platform.toLowerCase();
  if (p === "youtube") return <Youtube size={size} className="text-red-500" />;
  if (p === "instagram") return <Instagram size={size} className="text-pink-500" />;
  if (p === "tiktok") return <TiktokIcon size={size} />;
  return <Link2 size={size} />;
}

/** Resolve feed display status: Live supersedes Published once posted to social. */
export function resolveFeedDisplayStatus(post: Post): {
  key: string;
  label: string;
} {
  const targets = post.socialTargets || [];
  const hasLiveTarget =
    targets.some((t) => t.status === "live") ||
    post.socialRollup === "live" ||
    post.status === "live" ||
    (post.platformStats || []).some((s) => !!s.externalUrl);

  if (hasLiveTarget) return { key: "live", label: "Live" };

  if (
    targets.some((t) => t.status === "scheduled") ||
    post.socialRollup === "scheduled" ||
    post.status === "scheduled"
  ) {
    return { key: "scheduled", label: "Scheduled" };
  }

  if (post.socialRollup === "publishing" || post.status === "publishing") {
    return { key: "publishing", label: "Publishing" };
  }

  switch (post.status) {
    case "published":
    case "approved":
      return { key: "published", label: "Published" };
    case "draft":
      return { key: "draft", label: "Draft" };
    case "processing":
      return { key: "processing", label: "Processing" };
    case "generation_failed":
      return { key: "failed", label: "Failed" };
    case "moderation_rejected":
      return { key: "rejected", label: "Rejected" };
    default:
      return {
        key: post.status || "unknown",
        label: (post.status || "Unknown").replace(/_/g, " "),
      };
  }
}

function statusBadgeClass(key: string): string {
  switch (key) {
    case "live":
      return "bg-rose-500/90 text-white border-rose-400/40";
    case "published":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    case "scheduled":
      return "bg-sky-500/20 text-sky-300 border-sky-500/40";
    case "publishing":
    case "processing":
      return "bg-amber-500/20 text-amber-300 border-amber-500/40";
    case "draft":
      return "bg-blue-500/20 text-blue-300 border-blue-500/40";
    case "failed":
    case "rejected":
      return "bg-red-500/20 text-red-300 border-red-500/40";
    default:
      return "bg-white/10 text-white/80 border-white/20";
  }
}

export const PostCard = memo(
  ({
    post,
    aspectRatio,
    onMediaLoad,
    onDelete,
    onFollow,
    onSocialSchedule,
    priority,
    index,
  }: PostCardProps) => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const isAr = i18n.language === "ar";
    const [hovered, setHovered] = useState(false);
    const [localTargets, setLocalTargets] = useState<SocialTarget[]>(post.socialTargets || []);
    const [following, setFollowing] = useState(!!post.isFollowing);

    useEffect(() => {
      setLocalTargets(post.socialTargets || []);
    }, [post.socialTargets]);

    useEffect(() => {
      setFollowing(!!post.isFollowing);
    }, [post.isFollowing]);

    const isPriority = priority ?? (typeof index === "number" && index < 4);
    const stats = post.platformStats ?? [];
    const hasLiveStats = stats.length > 0;

    const [imgSrc, setImgSrc] = useState<string>(() => sanitizeImageUrl(post.image));

    useEffect(() => {
      setImgSrc(sanitizeImageUrl(post.image));
    }, [post.image]);

    const formattedTime = (() => {
      if (!post.time) return t("common.time.just_now");
      if (post.time.includes("h")) return t("common.time.hours_ago", { count: parseInt(post.time) || 1 });
      if (post.time.includes("d")) return t("common.time.days_ago", { count: parseInt(post.time) || 1 });
      if (post.time === "now" || post.time === "Just now") return t("common.time.just_now");
      const dateObj = new Date(post.time);
      return !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString() : post.time;
    })();

    const detailId = post.contentId || post.id;
    const tileAspect = cssAspectRatio(post.aspectRatio);
    const displayStatus = useMemo(
      () => resolveFeedDisplayStatus({ ...post, socialTargets: localTargets }),
      [post, localTargets],
    );

    /** Author label: own posts → You; other creators → their name; skip junk fallbacks */
    const authorLabel = (() => {
      if (post.isOwn) return "You";
      const name = (post.creator || "").trim();
      if (!name || name === "Creator" || name === "Gaming" || name.toLowerCase() === "work") {
        return null;
      }
      return name;
    })();

    const scheduleToSocial = (platform: "youtube" | "instagram" | "tiktok") => {
      const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const target: SocialTarget = { platform, status: "scheduled", scheduledAt };
      setLocalTargets((prev) => {
        const without = prev.filter((t) => t.platform !== platform);
        return [...without, target];
      });
      onSocialSchedule?.(detailId, target);
      toast.success(`Scheduled to ${platform}`, {
        description:
          "Social publishing will go live when YouTube / Instagram / TikTok are connected. The post view is ready for Live status.",
      });
    };

    const markLiveLocal = (platform: "youtube" | "instagram" | "tiktok") => {
      const target: SocialTarget = {
        platform,
        status: "live",
        scheduledAt: new Date().toISOString(),
      };
      setLocalTargets((prev) => {
        const without = prev.filter((t) => t.platform !== platform);
        return [...without, target];
      });
      onSocialSchedule?.(detailId, target);
      toast.success(`Marked Live on ${platform}`, {
        description: "Preview only — wire real publish APIs when social accounts are connected.",
      });
    };

    const typeLabel =
      post.contentType === "clip"
        ? "Clip"
        : post.contentType === "meme"
          ? "Meme"
          : post.contentType === "insight"
            ? "Insight"
            : "Image";

    return (
      <article
        className={cn(
          "ui-post-card group relative h-full overflow-hidden",
          "rounded-xl border border-border/50 bg-card/40",
          "shadow-[0_8px_30px_rgba(0,0,0,0.12)]",
          "transition-shadow duration-200",
          hovered && "shadow-[0_16px_40px_rgba(0,0,0,0.22)] z-10",
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="relative h-full w-full overflow-hidden">
          <AuthenticatedImage
            src={post.image || imgSrc}
            fallbackSrc="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80"
            alt={post.content || "Post image"}
            disableRemoteFallback={false}
            priority={isPriority}
            placeholderAspectRatio={tileAspect}
            wrapperClassName="!absolute !inset-0 !h-full !w-full !bg-transparent overflow-hidden"
            className={cn(
              "absolute inset-0 h-full w-full cursor-pointer origin-center transition-transform duration-500 ease-out will-change-transform",
              aspectRatio ? "object-cover" : "object-contain",
              hovered && "scale-110",
            )}
            onClick={() => navigate(`/feed/post/${detailId}`)}
            onLoad={(e) =>
              onMediaLoad?.(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)
            }
            onError={() => setImgSrc("")}
          />

          {/* Create Hub–style dark overlay on hover */}
          <div
            className={cn(
              "absolute inset-0 bg-black/55 transition-opacity duration-300 pointer-events-none z-[5]",
              hovered ? "opacity-100" : "opacity-0",
            )}
          />

          {post.contentType === "clip" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none mb-16 z-[6]">
              <div className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
                <div className="w-0 h-0 border-y-[5px] border-y-transparent border-l-[9px] border-l-primary ms-0.5" />
              </div>
            </div>
          )}

          {/* Hover actions — top of image */}
          <div
            className={cn(
              "absolute top-2.5 end-2.5 z-20 flex items-center gap-1.5 transition-all duration-200",
              hovered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none",
            )}
          >
            {post.userId && onFollow && !post.isOwn && (
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 text-[10px] font-bold rounded-lg px-2.5 backdrop-blur-md border-white/20 text-white hover:bg-black/70",
                  following ? "bg-white/20" : "bg-black/55",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  const next = !following;
                  setFollowing(next);
                  onFollow(post.userId!, following);
                }}
              >
                {following ? "Following" : "Follow"}
              </Button>
            )}

            {/* Share → social publish (colored square platform icons) */}
            <DropdownMenu>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg bg-black/55 text-white/90 hover:text-white hover:bg-black/70 backdrop-blur-md border border-white/15"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Publish to social"
                      >
                        <Share2 size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px] font-bold">Share to social</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent
                align={isAr ? "start" : "end"}
                className="w-60 border-border bg-popover text-sm font-medium shadow-lg data-open:zoom-in-100 data-closed:zoom-out-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-2.5 py-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground">
                  Publish / Schedule
                </div>
                <DropdownMenuItem
                  className="gap-2.5 cursor-pointer py-2 text-[13px] font-medium tracking-normal"
                  onClick={() => scheduleToSocial("youtube")}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-[#FF0000] shrink-0 [transform:translateZ(0)]">
                    <Youtube size={14} strokeWidth={2.25} className="text-white" aria-hidden />
                  </span>
                  YouTube
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2.5 cursor-pointer py-2 text-[13px] font-medium tracking-normal"
                  onClick={() => scheduleToSocial("instagram")}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] shrink-0 [transform:translateZ(0)]">
                    <Instagram size={14} strokeWidth={2.25} className="text-white" aria-hidden />
                  </span>
                  Instagram
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2.5 cursor-pointer py-2 text-[13px] font-medium tracking-normal"
                  onClick={() => scheduleToSocial("tiktok")}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-black shrink-0 border border-white/25 [transform:translateZ(0)]">
                    <TiktokIcon size={14} className="text-white" />
                  </span>
                  TikTok
                </DropdownMenuItem>
                {(post.status === "published" ||
                  displayStatus.key === "published" ||
                  displayStatus.key === "scheduled") && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-2.5 py-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground">
                      Mark Live
                    </div>
                    <DropdownMenuItem
                      className="gap-2.5 cursor-pointer py-2 text-[13px] font-medium tracking-normal"
                      onClick={() => markLiveLocal("youtube")}
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-[#FF0000] shrink-0 [transform:translateZ(0)]">
                        <Youtube size={14} strokeWidth={2.25} className="text-white" aria-hidden />
                      </span>
                      Live on YouTube
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2.5 cursor-pointer py-2 text-[13px] font-medium tracking-normal"
                      onClick={() => markLiveLocal("instagram")}
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] shrink-0 [transform:translateZ(0)]">
                        <Instagram size={14} strokeWidth={2.25} className="text-white" aria-hidden />
                      </span>
                      Live on Instagram
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2.5 cursor-pointer py-2 text-[13px] font-medium tracking-normal"
                      onClick={() => markLiveLocal("tiktok")}
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-black shrink-0 border border-white/25 [transform:translateZ(0)]">
                        <TiktokIcon size={14} className="text-white" />
                      </span>
                      Live on TikTok
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2.5 cursor-pointer py-2 text-[13px] font-medium tracking-normal text-foreground/80"
                  onClick={() => navigate("/profile")}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-muted border border-border shrink-0">
                    <UserRound size={14} strokeWidth={2.25} aria-hidden />
                  </span>
                  Connect accounts in Profile
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Copy post link */}
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg bg-black/55 text-white/90 hover:text-white hover:bg-black/70 backdrop-blur-md border border-white/15"
                    onClick={(e) => {
                      e.stopPropagation();
                      void navigator.clipboard?.writeText(
                        `${window.location.origin}/feed/post/${detailId}`,
                      );
                      toast.success("Post link copied");
                    }}
                    aria-label="Copy post link"
                  >
                    <Link2 size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-[10px] font-bold">Copy post link</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              variant="outline"
              size="sm"
              className="h-8 text-[10px] font-bold rounded-lg px-2.5 bg-black/55 border-white/20 text-white hover:bg-black/70 backdrop-blur-md"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/feed/post/${detailId}`);
              }}
            >
              <BarChart3 size={12} className="me-1" />
              {t("home.post.analytics")}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg bg-black/55 text-white/90 hover:text-white hover:bg-black/70 backdrop-blur-md border border-white/15"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align={isAr ? "start" : "end"}
                className="w-52 border-border bg-popover text-sm font-medium shadow-lg data-open:zoom-in-100 data-closed:zoom-out-100"
              >
                {post.status === "draft" && (
                  <DropdownMenuItem
                    className="gap-2.5 cursor-pointer py-2 text-[13px] font-medium tracking-normal"
                    onClick={() =>
                      navigate("/create/image", {
                        state: {
                          draftId: post.contentId || post.id,
                          title: post.content || "",
                          prompt: post.content || "",
                          imageUrl: post.image,
                          mode: post.contentType === "meme" ? "meme" : "image",
                        },
                      })
                    }
                  >
                    <FileEdit size={15} strokeWidth={2} /> Edit Draft
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="gap-2.5 cursor-pointer py-2 text-[13px] font-medium tracking-normal"
                  onClick={() => navigate(`/feed/post/${detailId}`)}
                >
                  <ExternalLink size={15} strokeWidth={2} /> View Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2.5 cursor-pointer py-2 text-[13px] font-medium tracking-normal"
                  onClick={() => navigate("/create/image")}
                >
                  <Sparkles size={15} strokeWidth={2} /> {t("home.post.remix")}
                </DropdownMenuItem>
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="gap-2.5 text-destructive focus:text-destructive cursor-pointer py-2 text-[13px] font-medium tracking-normal"
                      onClick={() => onDelete(post.contentId || post.id)}
                    >
                      <Trash2 size={15} strokeWidth={2} /> Delete Post
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Permanent dark footer */}
          <div className="absolute inset-x-0 bottom-0 z-10 pointer-events-none bg-gradient-to-t from-black/90 via-black/55 to-transparent pt-16 pb-3 px-3">
            <div className="pointer-events-auto space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge
                  className={cn(
                    "text-[9px] font-bold h-5 px-2 border capitalize inline-flex items-center gap-1",
                    statusBadgeClass(displayStatus.key),
                  )}
                >
                  {displayStatus.key === "live" && <Radio size={10} className="animate-pulse" />}
                  {displayStatus.key === "scheduled" && <Clock size={10} />}
                  {displayStatus.label}
                </Badge>
                <Badge className="bg-primary/90 text-primary-foreground text-[9px] font-bold h-5 px-2 border-none capitalize">
                  {typeLabel}
                </Badge>
                {localTargets.map((t) => (
                  <Badge
                    key={t.platform}
                    variant="outline"
                    className={cn(
                      "text-[9px] h-5 px-1.5 border-white/20 text-white/90 gap-1 capitalize",
                      t.status === "live" && "bg-rose-500/30 border-rose-400/40",
                    )}
                  >
                    <PlatformIcon platform={t.platform} size={10} />
                    {t.status === "live" ? "Live" : "Queued"}
                  </Badge>
                ))}
              </div>

              <button
                type="button"
                className="text-left w-full min-w-0"
                onClick={() => navigate(`/feed/post/${detailId}`)}
              >
                <p className="text-[13px] font-semibold text-white leading-snug line-clamp-2 drop-shadow-sm">
                  {post.content}
                </p>
              </button>

              <div className="flex items-center gap-2 text-[10px] text-white/70 font-medium min-w-0">
                <button
                  type="button"
                  className="flex items-center gap-1.5 min-w-0 hover:text-white transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (post.isOwn) {
                      navigate("/profile");
                      return;
                    }
                    if (post.userId) navigate(`/users/${post.userId}`);
                  }}
                  title={post.isOwn ? "Your profile" : "View creator"}
                >
                  <CreatorAvatar
                    src={post.avatar}
                    email={post.creator || post.userId || "creator"}
                    size="sm"
                    className="!h-5 !w-5 border-white/25 shrink-0"
                  />
                  <span className="truncate font-semibold text-white/90 max-w-[9rem]">
                    {authorLabel || (post.isOwn ? "You" : "Creator")}
                  </span>
                </button>
                <span className="shrink-0 opacity-70">· {formattedTime}</span>
              </div>

              {hasLiveStats && (
                <div className="space-y-1 pt-0.5">
                  {stats.slice(0, 2).map((s) => (
                    <div key={s.platform} className="flex items-center gap-2 text-[10px] text-white/85">
                      <PlatformIcon platform={s.platform} />
                      <span className="capitalize font-semibold w-14 shrink-0">{s.platform}</span>
                      <span className="flex items-center gap-1">
                        <Eye size={10} /> {formatStat(s.views, s.viewsDisplay)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart size={10} /> {formatStat(s.likes, s.likesDisplay)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare size={10} /> {formatStat(s.comments, s.commentsDisplay)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </article>
    );
  },
);

PostCard.displayName = "PostCard";
