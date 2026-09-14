import { motion } from "motion/react";
import { 
  Eye,
  Heart,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  UserCheck,
  Play,
  Loader2
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";
import {
  contentApi,
  feedApi,
  identityApi,
  extractValidImageUrl,
  type FeedItemDto,
} from "../../services/apiClient";
import { AuthenticatedImage } from "../../components/AuthenticatedImage";
import {
  JustifiedGallery,
  JustifiedLayoutOptions,
  parseAspectRatio,
} from "../../components/JustifiedGallery";
import { toast } from "sonner";
import { useAppSelector } from "../../store/hooks";
import { selectAuthUser } from "../../store/slices/authSlice";

const PROFILE_LAYOUT: JustifiedLayoutOptions = {
  maxColumns: 6,
  minTileEdge: 180,
  minRowHeight: 330,
  maxRowHeight: 430,
};

const getFeedRatio = (post: FeedItemDto) => parseAspectRatio(post.aspectRatio);
const getFeedKey = (post: FeedItemDto) => String(post.id || post.contentId);
const getFeedRatioKey = (post: FeedItemDto) => String(post.contentId || post.id);

function isAuthMediaAvatar(src: string): boolean {
  return (
    src.startsWith("/content/") ||
    (src.includes("/content/") && src.includes("/media")) ||
    src.includes("api-gateway")
  );
}

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const authUser = useAppSelector(selectAuthUser);
  const isOwnProfile = !!(authUser?.uid && id && String(authUser.uid) === String(id));

  const [loading, setLoading] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [posts, setPosts] = useState<FeedItemDto[]>([]);

  useEffect(() => {
    if (isOwnProfile) {
      navigate("/profile", { replace: true });
    }
  }, [isOwnProfile, navigate]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [feedProfile, identityUser, personalFeed] = await Promise.allSettled([
        feedApi.getFeedUserProfile(id),
        identityApi.getUserById(id),
        feedApi.fetchPersonalFeed(undefined, 50),
      ]);

      if (feedProfile.status === "fulfilled") {
        setFollowerCount(feedProfile.value.followerCount ?? 0);
        setFollowingCount(feedProfile.value.followingCount ?? 0);
        setIsFollowing(!!feedProfile.value.isFollowing);
      }

      if (identityUser.status === "fulfilled" && identityUser.value) {
        const u = identityUser.value;
        setDisplayName(u.displayName || u.username || `Creator`);
        setUsername(u.username || id.slice(0, 8));
        setBio(u.bio || "");
        setAvatarUrl(u.avatarUrl || "");
        setCoverUrl(u.coverUrl || "");
      } else {
        setDisplayName(`Creator`);
        setUsername(id.slice(0, 8));
      }

      // Prefer published catalog filtered by author; fallback to home feed items by userId
      let authorPosts: FeedItemDto[] = [];
      try {
        const catalog = await contentApi.getContentList(undefined, 50);
        const owned = (catalog.items || []).filter((c: any) => String(c.userId) === String(id));
        authorPosts = owned.map((c: any) => ({
          id: c.id,
          contentId: c.id,
          userId: c.userId,
          title: c.title || c.caption || "Untitled",
          description: c.description || "",
          contentType: c.contentType || "image",
          thumbnailUrl: extractValidImageUrl(c) || c.thumbnailUrl || "",
          aspectRatio: c.aspectRatio || c.aspect_ratio,
          platformStats: c.platformStats || [],
          publishedAt: c.publishedAt || c.createdAt,
        }));
      } catch {
        /* ignore */
      }

      if (authorPosts.length === 0 && personalFeed.status === "fulfilled") {
        authorPosts = (personalFeed.value.items || []).filter(
          (item) => String(item.userId) === String(id)
        );
      }

      setPosts(authorPosts);
    } catch (err) {
      console.error("Failed to load user profile:", err);
      toast.error("Could not load creator profile");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFollowToggle = async () => {
    if (!id || followBusy) return;
    setFollowBusy(true);
    try {
      if (isFollowing) {
        await feedApi.unfollowUser(id);
        setIsFollowing(false);
        setFollowerCount((c) => Math.max(0, c - 1));
        toast.success("Unfollowed");
      } else {
        const res = await feedApi.followUser(id);
        setIsFollowing(true);
        setFollowerCount(res.followerCount ?? followerCount + 1);
        toast.success("Following");
      }
    } catch (err: any) {
      toast.error(Array.isArray(err?.message) ? err.message.join(", ") : err?.message || "Follow failed");
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  const statsDefinitions = [
    { key: "posts", value: String(posts.length) },
    { key: "followers", value: String(followerCount) },
    { key: "following", value: String(followingCount) },
  ];

  return (
    <div className="space-y-8">
        <Button 
          variant="ghost"
          onClick={() => navigate(-1)}
          className="gap-2 mb-4"
        >
          {isRtl ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {t('common.back')}
        </Button>

        <div className="ui-profile-header">
          <div className="ui-profile-cover relative">
            {coverUrl ? (
              <AuthenticatedImage
                src={coverUrl}
                alt="Cover"
                disableRemoteFallback
                placeholderAspectRatio="3 / 1"
                className="!absolute inset-0 !h-full !w-full !max-w-none !object-cover !object-center"
                wrapperClassName="!absolute inset-0 !h-full !w-full !aspect-auto !bg-transparent"
              />
            ) : null}
          </div>
          <div className="px-6 md:px-12 pb-12 relative">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="flex flex-col md:flex-row md:items-end gap-6 text-start">
                <div className="ui-profile-avatar-wrap -ml-0 md:-ml-0">
                  <div className="ui-profile-avatar overflow-hidden bg-muted">
                    {avatarUrl ? (
                      isAuthMediaAvatar(avatarUrl) ? (
                        <AuthenticatedImage
                          src={avatarUrl}
                          alt=""
                          disableRemoteFallback
                          priority
                          placeholderAspectRatio="1 / 1"
                          className="!absolute inset-0 !h-full !w-full !object-cover !max-w-none"
                          wrapperClassName="!absolute inset-0 !h-full !w-full !aspect-auto !bg-transparent"
                        />
                      ) : (
                        <img src={avatarUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
                      )
                    ) : (
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    )}
                  </div>
                </div>
                <div className="pb-2">
                  <h2 className="ui-title mb-1">{displayName}</h2>
                  <p className="text-muted-foreground font-bold rtl:text-end">@{username}</p>
                </div>
              </div>
              <div className="flex gap-3 pb-2">
                {!isOwnProfile ? (
                <Button 
                  onClick={handleFollowToggle}
                  disabled={followBusy}
                  variant={isFollowing ? "secondary" : "default"}
                  size="2xl"
                  className="px-8"
                >
                  {followBusy ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : isFollowing ? (
                    <>
                      <UserCheck size={18} className={cn(isRtl ? "ml-2" : "mr-2")} />
                      {t('profile.actions.following')}
                    </>
                  ) : (
                    <>
                      <UserPlus size={18} className={cn(isRtl ? "ml-2" : "mr-2")} />
                      {t('profile.actions.follow')}
                    </>
                  )}
                </Button>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-12 max-w-md">
              {statsDefinitions.map((stat) => (
                <div key={stat.key} className="ui-stat-card p-6 text-start">
                  <p className="text-2xl font-display font-bold text-foreground mb-1">{stat.value}</p>
                  <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase rtl:tracking-normal rtl:normal-case">{t(`profile.stats.${stat.key}`)}</p>
                </div>
              ))}
            </div>

            {bio && (
              <div className="mt-10 text-start">
                <p className="text-muted-foreground font-medium leading-relaxed max-w-2xl">
                  {bio}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-border/50">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-display font-bold text-foreground">{t('profile.actions.recent_creations')}</h3>
          </div>
          
          {posts.length === 0 ? (
            <p className="text-sm text-muted-foreground font-medium py-12 text-center">
              No published creations yet.
            </p>
          ) : (
            <JustifiedGallery
              items={posts}
              getRatio={getFeedRatio}
              getKey={getFeedKey}
              getRatioKey={getFeedRatioKey}
              options={PROFILE_LAYOUT}
              renderItem={({ item, resolvedRatio, reportRatio, index }) => {
                const img = extractValidImageUrl(item) || item.thumbnailUrl;
                const stats = item.platformStats || [];
                const views = stats.reduce((a, s) => a + (s.views || 0), 0);
                const likes = stats.reduce((a, s) => a + (s.likes || 0), 0);
                return (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
                    className="group relative h-full ui-card overflow-hidden cursor-pointer rounded-xl border-border/40"
                    onClick={() => navigate(`/feed/post/${item.contentId || item.id}`)}
                  >
                    <AuthenticatedImage
                      src={img}
                      alt={item.title}
                      className={cn(
                        "absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-110",
                        resolvedRatio ? "object-cover" : "object-contain",
                      )}
                      wrapperClassName="!absolute !inset-0 !h-full !w-full !bg-transparent"
                      onLoad={(e) =>
                        reportRatio(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)
                      }
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4">
                      <p className="text-white text-xs font-bold line-clamp-2 mb-2">{item.title}</p>
                      <div className="flex items-center justify-between text-white">
                        <div className="flex items-center gap-3">
                          {stats.length > 0 ? (
                            <>
                              <div className="flex items-center gap-1">
                                <Eye size={14} />
                                <span className="text-xs font-bold">{views || "—"}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Heart size={14} />
                                <span className="text-xs font-bold">{likes || "—"}</span>
                              </div>
                            </>
                          ) : (
                            <span className="text-[10px] font-medium opacity-80">Connect social for live stats</span>
                          )}
                        </div>
                        {item.contentType === "clip" && (
                          <div className="w-8 h-8 rounded-full bg-popover/20 backdrop-blur-xl flex items-center justify-center">
                            <Play size={14} className="fill-white ml-0.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              }}
            />
          )}
        </div>
      </div>
  );
}
