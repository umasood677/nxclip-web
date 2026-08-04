import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { TiktokIcon } from "../../components/TiktokIcon";
import {
  Camera,
  Edit3,
  Plus,
  Sparkles,
  Zap,
  Lock,
  Loader2,
  Twitch,
  Youtube,
  Instagram,
  Twitter,
  Calendar,
  type LucideIcon,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PhotoUploadDialog } from "../../components/PhotoUploadDialog";
import { ProfilePhoto } from "../../components/ProfilePhoto";
import { WeekPlanGrid } from "../../components/WeekPlanGrid";
import { AuthenticatedImage } from "../../components/AuthenticatedImage";
import { auth, handleFirestoreError, OperationType } from "../../firebase";
import { UserProfile } from "../../types";
import { Progress } from "../../components/ui/progress";
import { Badge } from "../../components/ui/badge";
import { Button, buttonVariants } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { beginWeekPlanRenewal, contentPlanFromOnboarding, weekPlanFromProfile } from "../../lib/weekPlan";
import { loadProfileExtras, saveProfileExtras, dataUrlToFile } from "../../lib/profileExtras";
import {
  SOCIAL_CONNECT_PLATFORMS,
  type SocialPlatformId,
} from "../../lib/creatorNiches";
import { useTranslation } from "react-i18next";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { selectAuthProfile, selectAuthUser, setAuthProfile, setAuthUser } from "../../store/slices/authSlice";
import {
  contentApi,
  extractValidImageUrl,
  feedApi,
  identityApi,
  type ContentDto,
  type PlatformStatDto,
} from "../../services/apiClient";
import {
  PostCard,
  type Post,
  type SocialTarget,
} from "../HomeFeed/components/PostCard";
import {
  JustifiedGallery,
  JustifiedLayoutOptions,
  parseAspectRatio,
} from "../../components/JustifiedGallery";

type ProfileTab = "posts" | "scheduled" | "plan";
type PhotoTarget = "avatar" | "cover";

const PROFILE_LAYOUT: JustifiedLayoutOptions = {
  maxColumns: 6,
  minTileEdge: 200,
  minRowHeight: 360,
  maxRowHeight: 470,
};

const getPostRatio = (post: Post) => parseAspectRatio(post.aspectRatio);
const getPostKey = (post: Post) => String(post.id);
const getPostRatioKey = (post: Post) => String(post.contentId || post.id);
const SOCIAL_ICONS: Record<SocialPlatformId, LucideIcon | typeof TiktokIcon> = {
  youtube: Youtube,
  instagram: Instagram,
  tiktok: TiktokIcon,
  twitch: Twitch,
  twitter: Twitter,
};

const SOCIAL_OAUTH_TOAST =
  "Social OAuth coming soon — connect will publish Live posts and pull stats.";

const resolveValidPostImage = (itemOrUrl: unknown): string => {
  const url =
    typeof itemOrUrl === "string" ? itemOrUrl : extractValidImageUrl(itemOrUrl);
  if (
    !url ||
    typeof url !== "string" ||
    url.includes("gcs-mock-upload-bucket") ||
    url.includes("undefined") ||
    url.includes("null") ||
    url.trim() === ""
  ) {
    return "";
  }
  return url;
};

const socialTargetsFromPlatformStats = (
  platformStats?: PlatformStatDto[],
): SocialTarget[] | undefined => {
  if (!Array.isArray(platformStats) || platformStats.length === 0) return undefined;
  return platformStats.map((s) => {
    const hasSignal =
      !!s.externalUrl ||
      (typeof s.views === "number" && s.views > 0) ||
      s.verified === true;
    return {
      platform: s.platform,
      status: hasSignal ? ("live" as const) : ("scheduled" as const),
      externalUrl: s.externalUrl,
    };
  });
};

/** Map ContentDto → Post (mirrors HomeFeed dtoToPost; always isOwn). */
const contentDtoToPost = (item: ContentDto, avatarUrl?: string | null): Post => {
  const data =
    (item as any).content && typeof (item as any).content === "object"
      ? (item as any).content
      : item;
  const views = data.viewCount ?? data.views ?? data.reach ?? 0;
  const likes = data.likeCount ?? data.likes ?? 0;
  const comments = data.commentCount ?? data.comments ?? 0;
  const shares = data.shareCount ?? data.shares ?? 0;
  const saves = data.saveCount ?? data.saves ?? 0;
  const id = data.id || (item as any).id;

  const engagement =
    data.engagement !== undefined
      ? data.engagement
      : views > 0
        ? parseFloat((((likes + comments + shares) / views) * 100).toFixed(1))
        : 0;

  const rawImg = extractValidImageUrl(data);
  const image =
    resolveValidPostImage(rawImg) || (id ? `/content/${id}/media` : "");

  const platformStats: PlatformStatDto[] | undefined = Array.isArray(data.platformStats)
    ? data.platformStats
    : undefined;

  const gameRaw = data.game || data.category;
  const game =
    typeof gameRaw === "string" &&
    gameRaw.trim() &&
    gameRaw.trim().toLowerCase() !== "gaming"
      ? gameRaw.trim()
      : undefined;

  return {
    id,
    contentId: id,
    userId: data.userId || (item as any).userId,
    creator: data.creatorName || data.user?.displayName || "",
    game,
    time: data.publishedAt
      ? new Date(data.publishedAt).toLocaleDateString()
      : data.createdAt
        ? new Date(data.createdAt).toLocaleDateString()
        : "Just now",
    content:
      data.title ||
      data.caption ||
      data.description ||
      (item as any).content ||
      "Untitled Creation",
    tags: data.hashtags || data.tags || [],
    contentType: (data.contentType as Post["contentType"]) || "image",
    platform: data.platform || "all",
    likes,
    comments,
    shares,
    saves,
    reach: views,
    engagement,
    retention: data.retention,
    avgWatchTime: data.avgWatchTime,
    image,
    avatar: avatarUrl || data.creatorAvatar || data.user?.photoURL || data.avatar || "",
    isLiked: data.likedByMe || data.isLiked || false,
    status: data.status || "published",
    planStep: data.planStep,
    aiInsight: data.aiInsight,
    platformStats,
    socialTargets: socialTargetsFromPlatformStats(platformStats),
    aspectRatio: data.aspectRatio,
    isOwn: true,
  };
};

function parseProfileTab(value: string | null): ProfileTab {
  if (value === "plan" || value === "scheduled") return value;
  return "posts";
}

export default function OwnProfile() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<ProfileTab>(() =>
    parseProfileTab(searchParams.get("tab")),
  );
  const reduxProfile = useAppSelector(selectAuthProfile);
  const authUser = useAppSelector(selectAuthUser);
  const [profile, setProfile] = useState<UserProfile | null>(reduxProfile);
  const [loading, setLoading] = useState(!reduxProfile);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [photoTarget, setPhotoTarget] = useState<PhotoTarget>("avatar");
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const weekPlan = weekPlanFromProfile(profile);

  useEffect(() => {
    setActiveTab(parseProfileTab(searchParams.get("tab")));
  }, [searchParams]);

  const mergeExtras = useCallback((base: UserProfile): UserProfile => {
    const extras = loadProfileExtras(base.uid);
    return {
      ...base,
      bio: base.bio || "",
      coverUrl: base.coverUrl ?? extras.coverUrl ?? null,
      gameNiches: base.gameNiches?.length ? base.gameNiches : extras.niches || [],
      games: base.games?.length ? base.games : extras.niches || base.gameNiches || [],
      socials: base.socials && Object.values(base.socials).some(Boolean)
        ? base.socials
        : extras.socials || {},
      connectedSocials: {
        youtube: false,
        instagram: false,
        tiktok: false,
        twitch: false,
        twitter: false,
        ...extras.connectedSocials,
        ...base.connectedSocials,
      },
    };
  }, []);

  useEffect(() => {
    if (!auth.currentUser) {
      navigate("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await identityApi.getUserMe();
        const me = res?.user ?? res;
        const onboardingPlan = me.onboardingPlan ?? null;
        const p = mergeExtras({
          uid: me.id || me.uid,
          displayName: me.displayName || me.username || "Creator",
          email: me.email,
          photoURL: me.avatarUrl || null,
          bio: me.bio || "",
          plan: (me.plan || "free").toLowerCase() as UserProfile["plan"],
          role: (me.roles?.[0] || "creator") as UserProfile["role"],
          onboardingCompleted: me.onboardingCompleted === true,
          onboardingPlan,
          contentPlan: contentPlanFromOnboarding(onboardingPlan),
          createdAt: me.createdAt || new Date().toISOString(),
        });
        setProfile(p);
        dispatch(setAuthProfile(p));
      } catch (err) {
        console.error("Error fetching profile:", err);
        if (reduxProfile) setProfile(mergeExtras(reduxProfile));
      } finally {
        setLoading(false);
      }
    };

    void fetchProfile();
    // Intentionally once on mount + when auth identity is available
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, dispatch, mergeExtras]);

  useEffect(() => {
    let cancelled = false;
    const loadPosts = async () => {
      setPostsLoading(true);
      try {
        const items = await contentApi.getUserContentList(100);
        if (cancelled) return;
        const all = items || [];
        const published = all.filter(
          (item) =>
            !item.storageKey?.startsWith("uploads/") &&
            (item.status === "published" || item.status === "approved"),
        );
        const chosen =
          published.length > 0
            ? published
            : all.filter((i) => !i.storageKey?.startsWith("uploads/")).slice(0, 24);
        setPosts(chosen.map((item) => contentDtoToPost(item, profile?.photoURL)));
      } catch {
        if (!cancelled) setPosts([]);
      } finally {
        if (!cancelled) setPostsLoading(false);
      }
    };
    void loadPosts();
    return () => {
      cancelled = true;
    };
    // Load once on mount; avatar is stamped from current profile when mapping
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const uid = profile?.uid;
    if (!uid) return;
    let cancelled = false;
    void feedApi
      .getFeedUserProfile(uid)
      .then((fp) => {
        if (cancelled) return;
        setFollowerCount(fp.followerCount ?? 0);
        setFollowingCount(fp.followingCount ?? 0);
      })
      .catch(() => {
        if (!cancelled) {
          setFollowerCount(0);
          setFollowingCount(0);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [profile?.uid]);

  useEffect(() => {
    if (!profile?.photoURL) return;
    setPosts((prev) =>
      prev.map((p) => (p.avatar === profile.photoURL ? p : { ...p, avatar: profile.photoURL! })),
    );
  }, [profile?.photoURL]);

  const handleRenewWeekPlan = () => {
    beginWeekPlanRenewal();
    navigate("/onboarding");
  };

  const games = profile?.games || profile?.gameNiches || [];

  const completion = useMemo(() => {
    if (!profile) return 0;
    let score = 0;
    const fields = [
      { weight: 20, check: () => !!profile.displayName && profile.displayName !== "Creator" },
      { weight: 20, check: () => !!profile.bio && profile.bio.length > 10 },
      { weight: 20, check: () => games.length > 0 },
      { weight: 20, check: () => !!profile.photoURL },
      { weight: 20, check: () => !!profile.onboardingCompleted },
    ];
    fields.forEach((f) => {
      if (f.check()) score += f.weight;
    });
    return score;
  }, [profile, games]);

  const missingFields = useMemo(() => {
    if (!profile) return [];
    const missing: string[] = [];
    if (!profile.displayName || profile.displayName === "Creator") {
      missing.push(t("profile.missing_fields.display_name"));
    }
    if (!profile.bio || profile.bio.length <= 10) {
      missing.push(t("profile.missing_fields.bio"));
    }
    if (games.length === 0) {
      missing.push(t("profile.missing_fields.games"));
    }
    if (!profile.photoURL) {
      missing.push(t("profile.missing_fields.avatar"));
    }
    if (!profile.onboardingCompleted) {
      missing.push(t("profile.missing_fields.onboarding"));
    }
    return missing;
  }, [profile, games, t]);

  const openPhotoDialog = (target: PhotoTarget) => {
    setPhotoTarget(target);
    setIsPhotoDialogOpen(true);
  };

  const handleUpdatePhoto = async (photoDataUrl: string) => {
    if (!auth.currentUser || !profile) return;
    setIsUpdatingPhoto(true);
    try {
      let mediaUrl = photoDataUrl;
      if (photoDataUrl.startsWith("data:")) {
        const file = await dataUrlToFile(
          photoDataUrl,
          `${photoTarget}-${Date.now()}.jpg`,
        );
        const meta = await contentApi.uploadFile(file);
        const id = meta.contentId || meta.assetId;
        if (!id) throw new Error("Upload did not return a content id");
        mediaUrl = `/content/${id}/media`;
      }

      if (photoTarget === "cover") {
        const extras = loadProfileExtras(profile.uid);
        saveProfileExtras(profile.uid, {
          ...extras,
          niches: extras.niches || games,
          socials: extras.socials || profile.socials,
          connectedSocials: profile.connectedSocials || extras.connectedSocials,
          coverUrl: mediaUrl,
        });
        const updated = { ...profile, coverUrl: mediaUrl };
        setProfile(updated);
        dispatch(setAuthProfile(updated));
        toast.success("Cover photo updated");
      } else {
        await identityApi.updateProfile({ avatarUrl: mediaUrl });
        const updated = { ...profile, photoURL: mediaUrl };
        setProfile(updated);
        dispatch(setAuthProfile(updated));
        if (authUser) {
          dispatch(setAuthUser({ ...authUser, photoURL: mediaUrl }));
        }
        toast.success("Profile photo updated");
      }
    } catch (err) {
      console.error("Failed to update photo:", err);
      toast.error(
        photoTarget === "cover"
          ? "Could not update cover. Try a smaller JPEG/PNG."
          : "Could not update avatar. Try a smaller JPEG/PNG.",
      );
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        photoTarget === "cover" ? `users/me/cover` : `users/me/avatar`,
      );
    } finally {
      setIsUpdatingPhoto(false);
    }
  };

  const handleDeletePost = useCallback(async (postId: string | number) => {
    try {
      await contentApi.deleteContent(String(postId));
      setPosts((prev) =>
        prev.filter((p) => String(p.contentId || p.id) !== String(postId)),
      );
      toast.success("Creation deleted successfully!");
    } catch (err) {
      console.error("Failed to delete creation:", err);
      toast.error("Failed to delete creation.");
    }
  }, []);

  const handleSocialSchedule = useCallback(
    (postId: string | number, target: SocialTarget) => {
      setPosts((prev) =>
        prev.map((p) => {
          if (String(p.contentId || p.id) !== String(postId)) return p;
          const without = (p.socialTargets || []).filter(
            (t) => t.platform !== target.platform,
          );
          return { ...p, socialTargets: [...without, target] };
        }),
      );
    },
    [],
  );

  const handleSocialConnectClick = (platformId: SocialPlatformId) => {
    toast.info(SOCIAL_OAUTH_TOAST);
    if (!profile?.uid) return;
    const extras = loadProfileExtras(profile.uid);
    const connectedSocials = {
      youtube: false,
      instagram: false,
      tiktok: false,
      twitch: false,
      twitter: false,
      ...extras.connectedSocials,
      ...profile.connectedSocials,
      [platformId]: extras.connectedSocials?.[platformId] ?? false,
    };
    saveProfileExtras(profile.uid, {
      ...extras,
      niches: extras.niches || games,
      socials: extras.socials || profile.socials,
      coverUrl: profile.coverUrl ?? extras.coverUrl,
      connectedSocials,
    });
  };

  const statsDefinitions = [
    { key: "posts", value: String(posts.length) },
    {
      key: "followers",
      value: followerCount == null ? "…" : String(followerCount),
    },
    {
      key: "following",
      value: followingCount == null ? "…" : String(followingCount),
    },
    { key: "engagement", value: "—", isPro: true },
  ];

  const tabs: ProfileTab[] = ["posts", "scheduled", "plan"];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {completion < 100 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="ui-card p-5 md:p-6 border-primary/20 bg-primary/5 relative overflow-hidden"
        >
          <div
            className={cn(
              "flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10",
              isRtl ? "text-right" : "text-left",
            )}
          >
            <div className="space-y-3 flex-grow min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Zap size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">
                    {t("profile.complete_your_profile")}
                  </h3>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-tighter">
                    {t("profile.unlock_features")}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-muted-foreground">{t("profile.progress")}</span>
                  <span className="text-primary">{completion}%</span>
                </div>
                <Progress value={completion} className="h-1.5 bg-muted" />
              </div>
              <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                {t("profile.boost_visibility")}{" "}
                <span className="text-foreground font-bold">
                  {missingFields.join(isRtl ? "، " : ", ")}
                </span>
              </p>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <Button
                variant="brand-gradient"
                size="sm"
                className="font-bold px-8 w-full shadow-lg shadow-primary/20"
                onClick={() => navigate("/profile/edit")}
              >
                {t("profile.finish_setup")}
              </Button>
              {!profile?.onboardingCompleted && (
                <Button
                  variant="outline"
                  size="sm"
                  className="font-bold"
                  onClick={() => navigate("/onboarding")}
                >
                  Start onboarding
                </Button>
              )}
              <p className="text-[9px] text-center text-muted-foreground font-bold uppercase tracking-widest">
                {t("profile.takes_less_than")}
              </p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-primary/10 relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Connect platforms
            </p>
            <div className="flex flex-wrap gap-2">
              {SOCIAL_CONNECT_PLATFORMS.map((platform) => {
                const Icon = SOCIAL_ICONS[platform.id];
                return (
                  <Button
                    key={platform.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 font-bold"
                    onClick={() => handleSocialConnectClick(platform.id)}
                  >
                    <Icon size={14} />
                    {platform.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      <div className="ui-profile-header">
        <div className="ui-profile-cover relative group/cover">
          {profile?.coverUrl ? (
            <AuthenticatedImage
              src={profile.coverUrl}
              alt="Cover"
              disableRemoteFallback
              placeholderAspectRatio="3 / 1"
              className="!absolute inset-0 !h-full !w-full !max-w-none !object-cover !object-center"
              wrapperClassName="!absolute inset-0 !h-full !w-full !aspect-auto !bg-transparent"
            />
          ) : null}
          <button
            type="button"
            aria-label="Change cover photo"
            className="absolute bottom-3 end-3 z-10 inline-flex items-center justify-center h-9 w-9 rounded-lg bg-black/50 text-white border border-white/20 backdrop-blur-sm opacity-80 hover:opacity-100 transition-opacity"
            onClick={() => openPhotoDialog("cover")}
            disabled={isUpdatingPhoto && photoTarget === "cover"}
          >
            {isUpdatingPhoto && photoTarget === "cover" ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Camera size={16} />
            )}
          </button>
        </div>

        <div className="px-5 md:px-10 pb-8 relative">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div
              className={cn(
                "flex flex-col sm:flex-row sm:items-end gap-4",
                isRtl ? "text-right" : "text-left",
              )}
            >
              <div
                className="ui-profile-avatar-wrap group cursor-pointer relative shrink-0"
                onClick={() => openPhotoDialog("avatar")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openPhotoDialog("avatar");
                  }
                }}
              >
                <ProfilePhoto
                  src={profile?.photoURL}
                  email={auth.currentUser?.email}
                  className={cn(
                    "ui-profile-avatar !h-full !w-full",
                    isUpdatingPhoto && photoTarget === "avatar" && "opacity-50",
                  )}
                  shape="square"
                />
                {isUpdatingPhoto && photoTarget === "avatar" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="animate-spin text-primary" size={24} />
                  </div>
                )}
                <button
                  type="button"
                  className="absolute inset-0 bg-popover/40 rounded-lg flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[2px]"
                  aria-label="Change profile photo"
                >
                  <Camera size={24} />
                </button>
              </div>
              <div className="pb-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="ui-title">{profile?.displayName || "Creator"}</h2>
                  <Badge variant={profile?.plan === "free" ? "secondary" : "brand-gradient"}>
                    {profile?.plan === "pro"
                      ? t("profile.plans.pro")
                      : profile?.plan === "studio"
                        ? t("profile.plans.studio")
                        : t("profile.plans.free")}
                  </Badge>
                </div>
                <p className="text-muted-foreground font-bold text-sm">
                  @{profile?.email?.split("@")[0] || "creator"}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                to="/profile/edit"
                className={cn(buttonVariants({ variant: "secondary" }), "gap-2")}
              >
                <Edit3 size={18} />
                {t("profile.edit_profile")}
              </Link>
              <Button
                size="icon"
                className="shadow-lg shadow-primary/20"
                onClick={() => navigate("/create")}
              >
                <Plus size={20} />
              </Button>
            </div>
          </div>

          {completion >= 100 && (
            <div className="flex flex-wrap gap-2 mt-5">
              {SOCIAL_CONNECT_PLATFORMS.map((platform) => {
                const Icon = SOCIAL_ICONS[platform.id];
                return (
                  <Button
                    key={platform.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 font-bold"
                    onClick={() => handleSocialConnectClick(platform.id)}
                  >
                    <Icon size={14} />
                    {platform.label}
                  </Button>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
            {statsDefinitions.map((stat) => (
              <div
                key={stat.key}
                className={cn("ui-stat-card p-4 relative", isRtl ? "text-right" : "text-left")}
              >
                {stat.isPro && profile?.plan === "free" && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-2">
                    <Lock size={14} className="text-primary mb-1" />
                    <p className="text-[8px] font-bold text-foreground uppercase tracking-widest">
                      {t("profile.stats.pro_only")}
                    </p>
                  </div>
                )}
                <p className="text-xl font-display font-bold text-foreground mb-0.5">
                  {stat.value}
                </p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {t(`profile.stats.${stat.key}`)}
                </p>
              </div>
            ))}
          </div>

          <div className={cn("mt-6 space-y-3", isRtl ? "text-right" : "text-left")}>
            <p className="text-muted-foreground font-medium leading-relaxed max-w-2xl text-sm">
              {profile?.bio || t("profile.no_bio")}
            </p>
            <div className={cn("flex flex-wrap gap-2", isRtl && "flex-row-reverse justify-end")}>
              {games.map((game) => (
                <span key={game} className="ui-badge-secondary px-3 py-1.5 text-xs">
                  {game}
                </span>
              ))}
              {games.length === 0 && (
                <span className="text-xs text-muted-foreground italic">
                  {t("profile.no_niches")}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <PhotoUploadDialog
        isOpen={isPhotoDialogOpen}
        onClose={() => setIsPhotoDialogOpen(false)}
        onSelect={handleUpdatePhoto}
        variant={photoTarget === "cover" ? "cover" : "avatar"}
      />

      <div className="space-y-5">
        <div className="flex items-center gap-6 border-b border-border overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all relative whitespace-nowrap ${
                activeTab === tab
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(`profile.tabs.${tab}`)}
              {activeTab === tab && (
                <motion.div
                  layoutId="profile-tab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"
                />
              )}
            </button>
          ))}
        </div>

        {activeTab === "posts" &&
          (postsLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-primary" size={28} />
            </div>
          ) : posts.length === 0 ? (
            <div className="ui-card p-12 text-center space-y-4">
              <Sparkles className="mx-auto text-muted-foreground/30" size={40} />
              <p className="text-muted-foreground font-medium">No published posts yet.</p>
              <Button
                variant="outline"
                size="sm"
                className="font-bold"
                onClick={() => navigate("/create/image")}
              >
                Create in Image Studio
              </Button>
            </div>
          ) : (
            <JustifiedGallery
              items={posts}
              getRatio={getPostRatio}
              getKey={getPostKey}
              getRatioKey={getPostRatioKey}
              options={PROFILE_LAYOUT}
              renderItem={({ item, resolvedRatio, reportRatio, index }) => (
                <PostCard
                  post={item}
                  aspectRatio={resolvedRatio ?? undefined}
                  onMediaLoad={reportRatio}
                  index={index}
                  priority={index < 4}
                  onDelete={handleDeletePost}
                  onSocialSchedule={handleSocialSchedule}
                />
              )}
            />
          ))}

        {activeTab === "scheduled" && (
          <div className="ui-card p-12 text-center space-y-4">
            <Calendar className="mx-auto text-muted-foreground/30" size={40} />
            <div className="space-y-2 max-w-md mx-auto">
              <p className="text-foreground font-bold">No scheduled posts</p>
              <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                Publish a creation, then schedule it to YouTube, Instagram, or TikTok.
                Once it goes live on a platform, it will appear as Live with platform stats.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="font-bold"
                onClick={() => navigate("/feed")}
              >
                Open Home Feed
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="font-bold"
                onClick={() => navigate("/dashboard")}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        )}

        {activeTab === "plan" && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Calendar className="text-teal-600 dark:text-teal-400" size={20} />
                <div>
                  <h3 className="text-lg font-display font-bold">
                    {t("profile.strategy.title")}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your coach week plan stays here until you create a new one.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-teal-500/30 text-teal-700 dark:text-teal-300 font-bold"
                >
                  {profile?.goal === "viral"
                    ? t("profile.strategy.growth_mode")
                    : t("profile.strategy.community_mode")}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-bold"
                  onClick={handleRenewWeekPlan}
                >
                  Plan a new week
                </Button>
              </div>
            </div>

            {weekPlan ? (
              <WeekPlanGrid plan={weekPlan} />
            ) : (
              <div className="ui-card p-12 text-center space-y-4">
                <Sparkles className="mx-auto text-muted-foreground/30" size={48} />
                <p className="text-muted-foreground font-medium">
                  {t("profile.strategy.no_plan")}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-bold"
                  onClick={handleRenewWeekPlan}
                >
                  {t("profile.strategy.start_onboarding")}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
