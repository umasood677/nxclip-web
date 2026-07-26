import { memo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { 
  Share2, MoreHorizontal, Check, 
  Sparkles, BarChart3, Youtube, Instagram, Twitch, Trash2, ExternalLink, FileEdit,
  Eye, Heart, MessageSquare, Link2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TiktokIcon } from "../../../components/TiktokIcon";
import { Card, CardContent } from "../../../components/ui/card";
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

export interface Post {
  id: string | number;
  contentId?: string;
  userId?: string;
  creator: string;
  game: string;
  time: string;
  content: string;
  tags?: string[];
  contentType: "clip" | "meme" | "image" | "insight";
  platform: "tiktok" | "youtube" | "instagram" | "twitch" | "all";
  /** @deprecated Prefer platformStats for product UX */
  likes: number;
  /** @deprecated Prefer platformStats for product UX */
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
  status?: string;
  platformStats?: PlatformStatDto[];
  wesScore?: number;
  socialRollup?: string;
}

interface PostCardProps {
  post: Post;
  /** @deprecated Like UX removed — kept for call-site compatibility */
  onLike?: (id: string | number) => void;
  onDelete?: (id: string | number) => void;
  onFollow?: (userId: string) => void;
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

function PlatformIcon({ platform }: { platform: string }) {
  const p = platform.toLowerCase();
  if (p === "youtube") return <Youtube size={11} className="text-red-500" />;
  if (p === "instagram") return <Instagram size={11} className="text-pink-500" />;
  if (p === "tiktok") return <TiktokIcon size={11} />;
  return <Link2 size={11} />;
}

export const PostCard = memo(({ post, onDelete, onFollow, priority, index }: PostCardProps) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isAr = i18n.language === "ar";

  const isPriority = priority ?? (typeof index === "number" && index < 4);
  const stats = post.platformStats ?? [];
  const hasLiveStats = stats.length > 0;

  const [imgSrc, setImgSrc] = useState<string>(() => sanitizeImageUrl(post.image));

  useEffect(() => {
    setImgSrc(sanitizeImageUrl(post.image));
  }, [post.image]);

  const handleImageError = () => {
    setImgSrc("");
  };

  const formattedTime = (() => {
    if (!post.time) return t('common.time.just_now');
    if (post.time.includes('h')) return t('common.time.hours_ago', { count: parseInt(post.time) || 1 });
    if (post.time.includes('d')) return t('common.time.days_ago', { count: parseInt(post.time) || 1 });
    if (post.time === 'now' || post.time === 'Just now') return t('common.time.just_now');
    const dateObj = new Date(post.time);
    return !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString() : post.time;
  })();

  const getStatusBadgeClass = (status?: string) => {
    switch (status) {
      case "published":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "draft":
        return "bg-blue-500/15 text-blue-400 border-blue-500/30";
      case "processing":
      case "publishing":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "generation_failed":
      case "moderation_rejected":
        return "bg-red-500/15 text-red-400 border-red-500/30";
      default:
        return "bg-background/80 text-muted-foreground border-border/80";
    }
  };

  const detailId = post.contentId || post.id;

  return (
    <Card className="ui-post-card group h-full text-start flex flex-col border border-border/70 bg-card/60 backdrop-blur-md hover:border-primary/40 hover:bg-card/90 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 active:scale-[0.995] transition-all duration-300 ease-out rounded-2xl overflow-hidden">
      <div className="ui-post-thumbnail relative aspect-video bg-muted/50 overflow-hidden rounded-t-2xl group/thumb">
        <AuthenticatedImage 
          src={post.image || imgSrc} 
          fallbackSrc="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80"
          alt={post.content || "Post creation image"} 
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover/thumb:scale-105" 
          priority={isPriority}
          onError={handleImageError}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 opacity-80 group-hover/thumb:opacity-70 transition-opacity duration-300" />
        
        {post.contentType === "clip" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-foreground shadow-lg transform group-hover/thumb:scale-110 transition-transform duration-300">
              <BarChart3 className="w-4 h-4 text-primary hidden group-hover/thumb:block" />
              <div className="w-0 h-0 border-y-[5px] border-y-transparent border-l-[9px] border-l-primary ms-0.5 group-hover/thumb:hidden" />
            </div>
          </div>
        )}

        <div className="absolute top-2.5 start-2.5 flex flex-wrap gap-1.5 max-w-[calc(100%-40px)] z-10">
          {post.game && (
            <Badge className="bg-black/60 backdrop-blur-md text-zinc-200 border border-white/10 text-[9px] font-semibold h-5 px-2 whitespace-nowrap shadow-sm">
              {post.game}
            </Badge>
          )}
          {post.platform && post.platform !== "all" && (
            <Badge className={cn(
              "text-[9px] font-semibold h-5 px-2 border border-white/10 whitespace-nowrap flex items-center gap-1.5 shadow-sm capitalize",
              post.platform === "tiktok" ? "bg-black/80 text-white" :
              post.platform === "instagram" ? "bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white" : 
              post.platform === "youtube" ? "bg-red-600/90 text-white" :
              post.platform === "twitch" ? "bg-purple-600/90 text-white" :
              "bg-zinc-800/80 text-zinc-200"
            )}>
              {post.platform === "tiktok" && <TiktokIcon size={10} />}
              {post.platform === "youtube" && <Youtube size={10} />}
              {post.platform === "instagram" && <Instagram size={10} />}
              {post.platform === "twitch" && <Twitch size={10} />}
              {post.platform}
            </Badge>
          )}
          {typeof post.wesScore === "number" && post.wesScore > 0 && (
            <Badge className="bg-amber-500/90 text-black text-[9px] font-bold h-5 px-2 border-none">
              WES {Math.round(post.wesScore)}
            </Badge>
          )}
        </div>

        <div className="absolute bottom-2.5 start-2.5 flex items-center gap-1.5 z-10">
           {post.contentType && (
             <Badge className="bg-primary/90 backdrop-blur-md text-primary-foreground text-[9px] font-bold h-5 px-2 border border-primary/30 capitalize shadow-sm">
               {post.contentType}
             </Badge>
           )}
           {post.status && (
             <Badge variant="outline" className={cn("backdrop-blur-md text-[9px] font-bold h-5 px-2 capitalize shadow-sm border", getStatusBadgeClass(post.status))}>
               {post.status.replace('_', ' ')}
             </Badge>
           )}
        </div>
      </div>
      
      <CardContent className="p-3.5 md:p-4 flex-1 flex flex-col space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="text-[13px] font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors" title={post.content}>
              {post.content}
            </h4>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] text-muted-foreground font-medium">
                {formattedTime}
              </span>
              {post.creator && post.creator !== "You" && (
                <button
                  type="button"
                  className="text-[10px] text-muted-foreground/70 font-medium hover:text-primary"
                  onClick={() => post.userId && navigate(`/users/${post.userId}`)}
                >
                  • {post.creator}
                </button>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
               <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg shrink-0 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
                 <MoreHorizontal size={14} />
               </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isAr ? "start" : "end"} className="w-44 border-border/80 bg-popover/95 backdrop-blur-md text-[11px] font-bold shadow-xl">
               {post.status === "draft" && (
                 <DropdownMenuItem 
                   className="gap-2 cursor-pointer focus:bg-primary/10 text-primary focus:text-primary font-bold" 
                   onClick={() => navigate("/create/image", {
                     state: {
                       draftId: post.contentId || post.id,
                       title: post.content || "",
                       prompt: post.content || "",
                       imageUrl: post.image,
                       mode: post.contentType === "meme" ? "meme" : "image"
                     }
                   })}
                 >
                   <FileEdit size={12} /> Edit Draft
                 </DropdownMenuItem>
               )}
               <DropdownMenuItem className="gap-2 cursor-pointer focus:bg-primary/10 focus:text-primary" onClick={() => navigate(`/feed/post/${detailId}`)}>
                 <ExternalLink size={12} /> View Details
               </DropdownMenuItem>
               <DropdownMenuItem className="gap-2 cursor-pointer focus:bg-primary/10 focus:text-primary" onClick={() => navigate(`/feed/post/${detailId}`)}>
                 <BarChart3 size={12} /> {t('home.post.view_stats')}
               </DropdownMenuItem>
               {post.userId && onFollow && (
                 <DropdownMenuItem className="gap-2 cursor-pointer focus:bg-primary/10 focus:text-primary" onClick={() => onFollow(post.userId!)}>
                   Follow Creator
                 </DropdownMenuItem>
               )}
               <DropdownMenuItem className="gap-2 cursor-pointer focus:bg-primary/10 focus:text-primary" onClick={() => navigate(`/create/image`)}>
                 <Sparkles size={12} /> {t('home.post.remix')}
               </DropdownMenuItem>
               {onDelete && (
                 <>
                   <DropdownMenuSeparator className="bg-border/60" />
                   <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer" onClick={() => onDelete(post.contentId || post.id)}>
                     <Trash2 size={12} /> Delete Post
                   </DropdownMenuItem>
                 </>
               )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {post.tags.slice(0, 4).map((tag, i) => (
              <span key={i} className="text-[9px] font-mono text-primary/90 bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-md transition-colors hover:bg-primary/20">
                #{tag.replace(/^#/, '')}
              </span>
            ))}
          </div>
        )}

        {post.planStep && (
          <div className="flex flex-wrap items-center gap-1.5 py-1 px-2.5 rounded-lg bg-muted/20 border border-border/60">
            <div className="flex items-center gap-1.5 min-w-0">
              <Check size={11} className="text-emerald-400 shrink-0" />
              <span className="text-[10px] font-medium text-muted-foreground truncate">{t('home.post.step', { step: post.planStep })}</span>
            </div>
            {post.status && (
              <Badge variant="outline" className="ms-auto text-[8px] h-3.5 border-emerald-500/20 bg-emerald-500/10 text-emerald-400 whitespace-nowrap">
                {post.status}
              </Badge>
            )}
          </div>
        )}

        {/* Social platformStats (product engagement) */}
        {hasLiveStats ? (
          <div className="mt-auto space-y-1.5 border border-border/50 bg-white/[0.02] rounded-xl p-2.5">
            {stats.map((s) => (
              <div key={s.platform} className="flex items-center gap-2 text-[10px]">
                <PlatformIcon platform={s.platform} />
                <span className="font-bold capitalize text-foreground/90 w-16 shrink-0">{s.platform}</span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Eye size={10} /> {formatStat(s.views, s.viewsDisplay)}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Heart size={10} /> {formatStat(s.likes, s.likesDisplay)}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MessageSquare size={10} /> {formatStat(s.comments, s.commentsDisplay)}
                </span>
                {s.externalUrl && (
                  <a
                    href={s.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ms-auto text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Open
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-auto border border-dashed border-border/60 bg-muted/10 rounded-xl p-2.5 text-center">
            <p className="text-[10px] font-medium text-muted-foreground">
              Connect social for live stats
            </p>
          </div>
        )}

        {post.aiInsight && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20 transition-colors hover:bg-primary/15">
            <Sparkles size={12} className="text-primary mt-0.5 shrink-0" />
            <p className="text-[10px] text-primary/90 leading-tight font-medium">{post.aiInsight}</p>
          </div>
        )}
      </CardContent>

      <div className="ui-post-action-row border-t border-border/60 px-3.5 py-2.5 bg-card/40 flex items-center justify-between">
         <div className="flex items-center gap-2">
            {post.userId && onFollow && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[9px] font-bold rounded-lg px-2.5"
                onClick={() => onFollow(post.userId!)}
              >
                Follow
              </Button>
            )}
            {post.socialRollup && post.socialRollup !== "idle" && (
              <Badge variant="outline" className="text-[8px] h-5 capitalize">
                {post.socialRollup}
              </Badge>
            )}
         </div>
         <div className="flex items-center gap-1.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 active:scale-90 transition-all duration-200">
                    <Share2 size={13} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-[10px] font-bold">{t('home.post.share')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button 
              variant="outline" 
              className="h-7 text-[9px] font-bold rounded-lg px-2.5 border-border/80 hover:bg-primary/10 hover:border-primary/40 hover:text-primary hover:shadow-sm active:scale-95 transition-all duration-200"
              onClick={() => navigate(`/feed/post/${detailId}`)}
            >
              {t('home.post.analytics')}
            </Button>
         </div>
      </div>
    </Card>
  );
});

PostCard.displayName = "PostCard";
