import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  Camera,
  Edit3,
  Plus,
  Sparkles,
  Zap,
  Lock,
  Loader2,
  Calendar,
  Radio,
} from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
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
import { beginWeekPlanRenewal, contentPlanFromOnboarding, weekPlanFromProfile, beginOnboardingRevision } from "../../lib/weekPlan";
import {
  creatorFieldsFromIdentityMe,
  onboardingSnapshotFromProfile,
} from "../../lib/onboardingSnapshot";
import { CreatorNicheTags } from "../../components/CreatorNicheTags";
import { loadProfileExtras, saveProfileExtras, dataUrlToFile } from "../../lib/profileExtras";
import {
  SOCIAL_CONNECT_PLATFORMS,
  type SocialPlatformId,
} from "../../lib/creatorNiches";
import { useTranslation } from "react-i18next";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { selectAuthProfile, selectAuthUser, setAuthProfile, setAuthUser, selectResolvedUserPhoto } from "../../store/slices/authSlice";
import {
  contentApi,
  extractValidImageUrl,
  feedApi,
  identityApi,
  socialApi,
  type ContentDto,
  type FeedItemDto,
  type PlatformStatDto,
  type SocialPlatform,
  type SocialAccountDto,
} from "../../services/apiClient";
import {
  accountsMapFromList,
  connectedMapFromAccounts,
  notifyOpenerSocialOAuth,
  socialAccountKindLabel,
  socialAccountPrimaryName,
  startSocialOAuth,
} from "../../lib/socialConnect";
import { SocialPlatformIcon, SocialPlatformTile } from "../../components/social/SocialPlatformIcon";
import { ConnectedSocialAccountAvatar } from "../../components/social/ConnectedSocialAccountAvatar";
import { SocialDisconnectDialog } from "../../components/social/SocialDisconnectDialog";
import {
  PostCard,
  resolveFeedDisplayStatus,
  type Post,
  type SocialTarget,
} from "../HomeFeed/components/PostCard";
import {
  JustifiedGallery,
  JustifiedLayoutOptions,
  parseAspectRatio,
} from "../../components/JustifiedGallery";

type ProfileTab = "published" | "live" | "scheduled" | "plan";
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
    socialRollup: data.socialRollup,
    aspectRatio: data.aspectRatio,
    isOwn: true,
  };
};

function overlayFeedLive(post: Post, feedItem?: FeedItemDto): Post {
  if (!feedItem) return post;
  const platformStats = feedItem.platformStats ?? post.platformStats;
  return {
    ...post,
    platformStats,
    socialRollup: feedItem.socialRollup ?? post.socialRollup,
    socialTargets: post.socialTargets ?? socialTargetsFromPlatformStats(platformStats),
  };
}

function isLiveOnSocial(post: Post): boolean {
  return resolveFeedDisplayStatus(post).key === "live";
}

function isScheduledOnSocial(post: Post): boolean {
  const key = resolveFeedDisplayStatus(post).key;
  return key === "scheduled" || key === "publishing";
}

function parseProfileTab(value: string | null): ProfileTab {
  if (value === "live" || value === "scheduled" || value === "plan") return value;
  return "published";
}

export default function OwnProfile() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<ProfileTab>(() =>
    parseProfileTab(searchParams.get("tab")),
  );
  const reduxProfile = useAppSelector(selectAuthProfile);
  const authUser = useAppSelector(selectAuthUser);
  const resolvedUserPhoto = useAppSelector(selectResolvedUserPhoto);
  const [profile, setProfile] = useState<UserProfile | null>(reduxProfile);
  const [loading, setLoading] = useState(!reduxProfile);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [photoTarget, setPhotoTarget] = useState<PhotoTarget>("avatar");
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [connectedSocials, setConnectedSocials] = useState<
    Partial<Record<SocialPlatformId, boolean>>
  >({});
  const [socialAccounts, setSocialAccounts] = useState<
    Partial<Record<SocialPlatform, SocialAccountDto>>
  >({});
  const [socialBusy, setSocialBusy] = useState(false);
  const [disconnectTarget, setDisconnectTarget] = useState<SocialPlatformId | null>(null);
  const [highlightSocial, setHighlightSocial] = useState(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const weekPlan = weekPlanFromProfile(profile);
  const onboarding = onboardingSnapshotFromProfile(profile);
  const games = onboarding?.niches?.length
    ? onboarding.niches
    : profile?.creatorNiches?.length
      ? profile.creatorNiches
      : profile?.games || profile?.gameNiches || [];

  useEffect(() => {
    setActiveTab(parseProfileTab(searchParams.get("tab")));
  }, [searchParams]);

  useEffect(() => {
    const wantsSocial =
      location.hash === "#profile-social-channels" ||
      searchParams.get("focus") === "social";
    if (loading || !wantsSocial) return;

    const timer = window.setTimeout(() => {
      const el = document.getElementById("profile-social-channels");
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightSocial(true);
    }, 280);
    const clearHighlight = window.setTimeout(() => setHighlightSocial(false), 2800);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(clearHighlight);
    };
  }, [loading, location.hash, searchParams]);

  useEffect(() => {
    const status = searchParams.get("social");
    const platform = searchParams.get("platform");
    if (!status) return;
    if (
      notifyOpenerSocialOAuth({
        status,
        platform,
        reason: searchParams.get("reason"),
      })
    ) {
      return;
    }
    if (status === "connected") {
      const key = platform as SocialPlatform | null;
      if (key === "youtube" || key === "instagram" || key === "facebook" || key === "tiktok") {
        setConnectedSocials((prev) => ({ ...prev, [key]: true }));
        setSocialAccounts((prev) => ({
          ...prev,
          [key]: { platform: key, status: "connected" },
        }));
      }
      toast.success(`${platform || "Channel"} connected`);
      void socialApi.listAccounts().then((accounts) => {
        setConnectedSocials(connectedMapFromAccounts(accounts));
        setSocialAccounts(accountsMapFromList(accounts));
      });
      setHighlightSocial(true);
      window.setTimeout(() => {
        document.getElementById("profile-social-channels")?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 200);
      window.setTimeout(() => setHighlightSocial(false), 2800);
    } else if (status === "error") {
      toast.error(searchParams.get("reason") || "Could not connect that channel");
    }
    searchParams.delete("social");
    searchParams.delete("platform");
    searchParams.delete("reason");
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    void socialApi
      .listAccounts()
      .then((accounts) => {
        if (!cancelled) {
          setConnectedSocials(connectedMapFromAccounts(accounts));
          setSocialAccounts(accountsMapFromList(accounts));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setConnectedSocials({});
          setSocialAccounts({});
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
        facebook: false,
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
        const creator = creatorFieldsFromIdentityMe(me as Record<string, unknown>);
        const onboardingPlan = creator.onboardingPlan ?? me.onboardingPlan ?? null;
        const p = mergeExtras({
          uid: me.id || me.uid,
          displayName: me.displayName || me.username || "Creator",
          email: me.email,
          photoURL: me.avatarUrl || null,
          coverUrl: me.coverUrl || null,
          bio: me.bio || "",
          plan: (me.plan || "free").toLowerCase() as UserProfile["plan"],
          role: (me.roles?.[0] || "creator") as UserProfile["role"],
          onboardingCompleted: me.onboardingCompleted === true,
          onboardingPlan,
          creatorCategory: creator.creatorCategory,
          creatorCategoryLabel: creator.creatorCategoryLabel,
          creatorNiches: creator.creatorNiches,
          contentPlan: contentPlanFromOnboarding(onboardingPlan) ?? contentPlanFromOnboarding(me.onboardingPlan),
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
    if (!profile) return;
    let cancelled = false;
    const loadPosts = async () => {
      setPostsLoading(true);
      try {
        const [items, feed] = await Promise.all([
          contentApi.getUserContentList(50),
          feedApi.fetchPersonalFeed(undefined, 50).catch(() => ({ items: [] as FeedItemDto[] })),
        ]);
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
        const feedById = new Map(
          (feed.items || []).map((row) => [String(row.contentId || row.id), row]),
        );
        setPosts(
          chosen.map((item) => {
            const post = contentDtoToPost(item, profile?.photoURL || resolvedUserPhoto);
            return overlayFeedLive(post, feedById.get(String(post.contentId || post.id)));
          }),
        );
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
    // Re-run when profile arrives so avatar is stamped correctly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.uid]);

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
    navigate("/onboarding", { state: { renewWeekPlan: true } });
  };

  const handleReviseOnboarding = () => {
    beginOnboardingRevision();
    navigate("/onboarding", {
      state: { renewWeekPlan: true, reviseOnboarding: true },
    });
  };

  const hasConnectedSocial = useMemo(
    () => SOCIAL_CONNECT_PLATFORMS.some((p) => !!connectedSocials[p.id]),
    [connectedSocials],
  );

  const hasNicheIdentity = Boolean(
    games.length > 0 ||
      onboarding?.categoryLabel ||
      weekPlan?.days?.length ||
      profile?.creatorCategory ||
      profile?.onboardingCompleted,
  );

  const completion = useMemo(() => {
    if (!profile) return 0;
    const fields = [
      () => !!profile.displayName && profile.displayName !== "Creator",
      () => !!profile.bio && profile.bio.length > 10,
      () => hasNicheIdentity,
      () => !!profile.photoURL,
      () => !!profile.onboardingCompleted,
      () => hasConnectedSocial,
    ];
    const done = fields.filter((check) => check()).length;
    return Math.round((done / fields.length) * 100);
  }, [profile, hasNicheIdentity, hasConnectedSocial]);

  const missingFields = useMemo(() => {
    if (!profile) return [];
    const missing: string[] = [];
    if (!profile.displayName || profile.displayName === "Creator") {
      missing.push(t("profile.missing_fields.display_name"));
    }
    if (!profile.bio || profile.bio.length <= 10) {
      missing.push(t("profile.missing_fields.bio"));
    }
    if (!hasNicheIdentity) {
      missing.push(t("profile.missing_fields.games"));
    }
    if (!profile.photoURL) {
      missing.push(t("profile.missing_fields.avatar"));
    }
    if (!profile.onboardingCompleted) {
      missing.push(t("profile.missing_fields.onboarding"));
    }
    if (!hasConnectedSocial) {
      missing.push(t("profile.missing_fields.socials"));
    }
    return missing;
  }, [profile, hasNicheIdentity, hasConnectedSocial, t]);

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
        await identityApi.updateProfile({ coverUrl: mediaUrl });
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

  const handleSocialConnect = async (id: SocialPlatformId) => {
    if (id === "twitch" || id === "twitter") {
      toast.info("YouTube, Instagram, Facebook, and TikTok are available to connect.");
      return;
    }
    if (connectedSocials[id]) {
      setDisconnectTarget(id);
      return;
    }
    try {
      setSocialBusy(true);
      const result = await startSocialOAuth(id as SocialPlatform, "/profile");
      if (result.status === "redirecting") return;
      if (result.status === "connected") {
        toast.success(`${result.platform || id} connected`);
        const accounts = await socialApi.listAccounts();
        setConnectedSocials(connectedMapFromAccounts(accounts));
        setSocialAccounts(accountsMapFromList(accounts));
      } else if (result.status === "error") {
        toast.error(result.reason || "Could not connect that channel");
      }
    } catch (err: any) {
      toast.error(err?.message || "Could not start connect");
    } finally {
      setSocialBusy(false);
    }
  };

  const confirmSocialDisconnect = async () => {
    const id = disconnectTarget;
    if (!id) return;
    try {
      setSocialBusy(true);
      await socialApi.disconnectAccount(id as SocialPlatform);
      setConnectedSocials((prev) => ({ ...prev, [id]: false }));
      setSocialAccounts((prev) => {
        const next = { ...prev };
        delete next[id as SocialPlatform];
        return next;
      });
      setDisconnectTarget(null);
      toast.success(`${id} disconnected`);
    } catch (err: any) {
      toast.error(err?.message || "Could not disconnect");
    } finally {
      setSocialBusy(false);
    }
  };

  const livePosts = useMemo(() => posts.filter(isLiveOnSocial), [posts]);
  const scheduledPosts = useMemo(() => posts.filter(isScheduledOnSocial), [posts]);

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

  const tabs: ProfileTab[] = ["published", "scheduled", "plan", "live"];

  if (loading && !profile) {
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
                <div className={cn("flex flex-wrap items-center gap-1.5 pt-1", isRtl && "flex-row-reverse")}>
                  {SOCIAL_CONNECT_PLATFORMS.map((platform) => {
                    const isConnected = !!connectedSocials[platform.id];
                    return (
                      <button
                        key={platform.id}
                        type="button"
                        title={
                          isConnected
                            ? `${platform.label} — ${t("profile.edit.connected_btn")}`
                            : `${t("profile.edit.connect_btn")} ${platform.label}`
                        }
                        aria-label={
                          isConnected
                            ? `${platform.label} — ${t("profile.edit.connected_btn")}`
                            : `${t("profile.edit.connect_btn")} ${platform.label}`
                        }
                        disabled={socialBusy && !isConnected}
                        className={cn(
                          "inline-flex size-6 shrink-0 items-center justify-center p-0 rounded-[5px] transition-opacity",
                          isConnected ? "cursor-default" : "hover:opacity-80",
                        )}
                        onClick={() => {
                          if (isConnected) {
                            document
                              .getElementById("profile-social-channels")
                              ?.scrollIntoView({ behavior: "smooth", block: "center" });
                            return;
                          }
                          void handleSocialConnect(platform.id);
                        }}
                      >
                        <SocialPlatformTile
                          platform={platform.id}
                          size={26}
                          iconSize={18}
                          muted={!isConnected}
                        />
                      </button>
                    );
                  })}
                </div>
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
                  src={profile?.photoURL || resolvedUserPhoto}
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
            <div className={cn("flex flex-wrap items-center gap-2", isRtl && "flex-row-reverse justify-end")}>
              <CreatorNicheTags
                categoryLabel={onboarding?.categoryLabel}
                niches={games}
                size="md"
                emptyLabel={
                  weekPlan || profile?.onboardingCompleted
                    ? t("profile.niche_not_tagged")
                    : t("profile.no_niches")
                }
              />
              {(onboarding?.isLegacy || (!games.length && (weekPlan || profile?.onboardingCompleted))) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] font-bold"
                  onClick={handleReviseOnboarding}
                >
                  {t("profile.strategy.revise_cta")}
                </Button>
              )}
            </div>

            <div
              id="profile-social-channels"
              className={cn(
                "space-y-4 pt-4 scroll-mt-24 rounded-xl transition-shadow duration-500",
                highlightSocial && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background p-3 -mx-1",
              )}
            >
              <div className={cn("px-1", isRtl ? "text-right" : "text-left")}>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                  {t("profile.edit.social_links_label")}
                </p>
                <p className="text-[10px] text-muted-foreground/60 font-medium mt-1">
                  {t("profile.edit.social_links_desc")}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {SOCIAL_CONNECT_PLATFORMS.map((platform) => {
                  const isConnected = !!connectedSocials[platform.id];
                  const account = socialAccounts[platform.id as SocialPlatform];
                  return (
                    <div
                      key={platform.id}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-muted/10",
                        isRtl && "flex-row-reverse",
                      )}
                    >
                      <ConnectedSocialAccountAvatar
                        platform={platform.id as SocialPlatform}
                        account={account}
                        size={40}
                        muted={!isConnected}
                        className={cn(isConnected && "ring-2 ring-primary/40 rounded-full")}
                      />
                      <div className={cn("flex-1 min-w-0", isRtl && "text-right")}>
                        <p className="text-sm font-bold text-foreground">{platform.label}</p>
                        {isConnected && account ? (
                          <>
                            <p className="text-[12px] font-semibold text-foreground mt-0.5 truncate">
                              {socialAccountPrimaryName(account)}
                            </p>
                            <p className="text-[11px] text-muted-foreground font-medium mt-0.5 leading-snug">
                              {socialAccountKindLabel(account)}
                            </p>
                          </>
                        ) : (
                          <p className="text-[11px] text-muted-foreground font-medium mt-0.5 truncate">
                            {platform.description}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant={isConnected ? "secondary" : "outline"}
                        size="sm"
                        className={cn(
                          "shrink-0 h-9 px-4 font-bold text-xs",
                          isConnected && "bg-primary/10 text-primary border-primary/20",
                        )}
                        disabled={socialBusy}
                        onClick={() => void handleSocialConnect(platform.id)}
                      >
                        {isConnected
                          ? t("profile.edit.disconnect_btn")
                          : t("profile.edit.connect_btn")}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <SocialDisconnectDialog
        open={!!disconnectTarget}
        platformLabel={
          SOCIAL_CONNECT_PLATFORMS.find((p) => p.id === disconnectTarget)?.label ||
          disconnectTarget ||
          ""
        }
        busy={socialBusy}
        onCancel={() => !socialBusy && setDisconnectTarget(null)}
        onConfirm={() => void confirmSocialDisconnect()}
      />

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
              onClick={() => {
                setActiveTab(tab);
                const next = new URLSearchParams(searchParams);
                if (tab === "published") next.delete("tab");
                else next.set("tab", tab);
                setSearchParams(next, { replace: true });
              }}
              className={`inline-flex items-center gap-1.5 pb-3 text-xs font-bold uppercase tracking-widest transition-all relative whitespace-nowrap ${
                activeTab === tab
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "live" ? (
                <span className="inline-flex items-center -space-x-1" aria-hidden>
                  {(["youtube", "instagram", "facebook", "tiktok"] as const).map((platform) => (
                    <span
                      key={platform}
                      className="inline-flex size-3.5 items-center justify-center rounded-full bg-background ring-1 ring-background"
                    >
                      <SocialPlatformIcon platform={platform} size={12} />
                    </span>
                  ))}
                </span>
              ) : null}
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

        {activeTab === "published" &&
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

        {activeTab === "live" &&
          (postsLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-primary" size={28} />
            </div>
          ) : livePosts.length === 0 ? (
            <div className="ui-card p-12 text-center space-y-4">
              <Radio className="mx-auto text-muted-foreground/30" size={40} />
              <div className="space-y-2 max-w-md mx-auto">
                <p className="text-foreground font-bold">No live posts yet</p>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                  Published posts appear here after they go Live on YouTube, Instagram, Facebook, or
                  TikTok.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="font-bold"
                onClick={() => {
                  setActiveTab("published");
                  const next = new URLSearchParams(searchParams);
                  next.delete("tab");
                  setSearchParams(next, { replace: true });
                }}
              >
                View published
              </Button>
            </div>
          ) : (
            <JustifiedGallery
              items={livePosts}
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

        {activeTab === "scheduled" &&
          (postsLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-primary" size={28} />
            </div>
          ) : scheduledPosts.length === 0 ? (
            <div className="ui-card p-12 text-center space-y-4">
              <Calendar className="mx-auto text-muted-foreground/30" size={40} />
              <div className="space-y-2 max-w-md mx-auto">
                <p className="text-foreground font-bold">No scheduled posts</p>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                  Publish a creation, then schedule Live auto-post to YouTube, Instagram, Facebook,
                  or TikTok from Post details or the feed Share menu.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="font-bold"
                  onClick={() => {
                    setActiveTab("published");
                    const next = new URLSearchParams(searchParams);
                    next.delete("tab");
                    setSearchParams(next, { replace: true });
                  }}
                >
                  View published
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="font-bold"
                  onClick={() => navigate("/feed")}
                >
                  Open Home Feed
                </Button>
              </div>
            </div>
          ) : (
            <JustifiedGallery
              items={scheduledPosts}
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
                  onClick={handleReviseOnboarding}
                >
                  {t("profile.strategy.revise_cta")}
                </Button>
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

            {onboarding ? (
              <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
                      {t("profile.strategy.onboarding_title")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("profile.strategy.onboarding_subtitle")}
                    </p>
                  </div>
                  <CreatorNicheTags
                    categoryLabel={onboarding.categoryLabel}
                    niches={onboarding.niches}
                  />
                </div>
                {(() => {
                  const detailRows = onboarding.rows.filter((row) => row.key !== "niches");
                  const hasFullAnswers = Boolean(
                    onboarding.audience ||
                      onboarding.goal ||
                      onboarding.frequency ||
                      onboarding.startPoint,
                  );
                  if (onboarding.isLegacy || !hasFullAnswers) {
                    return (
                      <div className="rounded-lg border border-dashed border-border bg-card/40 p-3 space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {t("profile.strategy.legacy_answers_note")}
                        </p>
                        <Button
                          size="sm"
                          className="font-bold"
                          onClick={handleReviseOnboarding}
                        >
                          {t("profile.strategy.legacy_answers_cta")}
                        </Button>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-3">
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {detailRows.map((row) => (
                          <div key={row.key} className="rounded-lg border border-border bg-card/60 p-3">
                            <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              {t(`profile.strategy.fields.${row.key}`, { defaultValue: row.label })}
                            </dt>
                            <dd className="text-sm font-semibold text-foreground mt-1 leading-snug">
                              {row.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="font-bold text-muted-foreground"
                        onClick={handleReviseOnboarding}
                      >
                        {t("profile.strategy.revise_cta")}
                      </Button>
                    </div>
                  );
                })()}
              </div>
            ) : null}

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
