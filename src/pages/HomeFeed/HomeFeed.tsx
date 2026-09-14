import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Rocket,
  Sparkles,
  ChevronRight,
  Flame,
  Search,
  X,
  Eye,
  Radio,
  TrendingUp,
  LayoutDashboard,
  ArrowRight,
} from "lucide-react";
import { HomeFeedSkeleton } from "./skeletons/HomeFeedSkeleton";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Input } from "../../components/ui/input";
import { cn } from "../../lib/utils";
import {
  contentApi,
  feedApi,
  identityApi,
  ContentDto,
  extractValidImageUrl,
  type PlatformStatDto,
} from "../../services/apiClient";
import { toast } from "sonner";
import { EmptyState } from "../../components/common/EmptyState";
import { useAppSelector } from "../../store/hooks";
import { selectAuthUser, selectResolvedUserPhoto, selectResolvedDisplayName } from "../../store/slices/authSlice";

import {
  PostCard,
  type Post,
  type SocialTarget,
  resolveFeedDisplayStatus,
} from "./components/PostCard";
import { SectionHeading } from "./components/SectionHeading";
import { MetricCard } from "./components/MetricCard";
import {
  JustifiedGallery,
  JustifiedLayoutOptions,
  parseAspectRatio,
} from "../../components/JustifiedGallery";

const FEED_LAYOUT: JustifiedLayoutOptions = {
  maxColumns: 6,
  minTileEdge: 200,
  minRowHeight: 360,
  maxRowHeight: 470,
};

/** Session cache so revisiting Home Feed does not re-hit identity for the same authors. */
const creatorIdentityCache = new Map<
  string,
  { displayName?: string; avatarUrl?: string; isFollowing?: boolean }
>();

const METRICS_CONTENT_LIMIT = 24;
const PERSONAL_FEED_LIMIT = 20;
const TRENDING_FEED_LIMIT = 12;
const CREATOR_HYDRATE_LIMIT = 8;
const CREATOR_HYDRATE_CONCURRENCY = 4;

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await worker(items[idx]);
    }
  });
  await Promise.all(runners);
  return results;
}

const getPostRatio = (post: Post) => parseAspectRatio(post.aspectRatio);
const getPostKey = (post: Post) => String(post.id);
const getPostRatioKey = (post: Post) => String(post.contentId || post.id);

function FeedGallery({
  posts,
  onFollow,
  onDelete,
  onSocialSchedule,
  priorityCount = 4,
}: {
  posts: Post[];
  onFollow?: (userId: string, currentlyFollowing: boolean) => void;
  onDelete?: (id: string | number) => void;
  onSocialSchedule?: (postId: string | number, target: SocialTarget) => void;
  priorityCount?: number;
}) {
  return (
    <JustifiedGallery
      items={posts}
      getRatio={getPostRatio}
      getKey={getPostKey}
      getRatioKey={getPostRatioKey}
      options={FEED_LAYOUT}
      renderItem={({ item, resolvedRatio, reportRatio, index }) => (
        <PostCard
          post={item}
          aspectRatio={resolvedRatio ?? undefined}
          onMediaLoad={reportRatio}
          index={index}
          priority={index < priorityCount}
          onFollow={onFollow}
          onDelete={onDelete}
          onSocialSchedule={onSocialSchedule}
        />
      )}
    />
  );
}

const PLATFORM_FILTER_LABELS: Record<string, string> = {
  all: "All Platforms",
  youtube: "YouTube",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
};

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

/** Build socialTargets from platformStats so Live status can resolve without social APIs yet. */
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

const dtoToPost = (item: ContentDto): Post => {
  const data =
    (item as any).content && typeof (item as any).content === "object"
      ? (item as any).content
      : item;
  const views = data.viewCount ?? data.views ?? data.reach ?? 0;
  const likes = data.likeCount ?? data.likes ?? 0;
  const comments = data.commentCount ?? data.comments ?? 0;
  const shares = data.shareCount ?? data.shares ?? 0;
  const saves = data.saveCount ?? data.saves ?? 0;

  const engagement =
    data.engagement !== undefined
      ? data.engagement
      : views > 0
        ? parseFloat((((likes + comments + shares) / views) * 100).toFixed(1))
        : 0;

  const rawImg = extractValidImageUrl(data);
  const platformStats: PlatformStatDto[] | undefined = Array.isArray(data.platformStats)
    ? data.platformStats
    : undefined;
  const userId = data.userId || (item as any).userId;

  const gameRaw = data.game || data.category;
  const game =
    typeof gameRaw === "string" &&
    gameRaw.trim() &&
    gameRaw.trim().toLowerCase() !== "gaming"
      ? gameRaw.trim()
      : undefined;

  return {
    id: data.id || (item as any).id,
    contentId: data.id || (item as any).id,
    userId,
    creator:
      data.creatorName ||
      data.user?.displayName ||
      "",
    game,
    time: data.publishedAt
      ? new Date(data.publishedAt).toLocaleDateString()
      : data.createdAt
        ? new Date(data.createdAt).toLocaleDateString()
        : "Just now",
    content:
      data.title ||
      data.caption ||
      data.selectedCaption ||
      data.description ||
      (item as any).content ||
      "Untitled Creation",
    tags: data.selectedHashtags || data.hashtags || data.tags || [],
    contentType:
      data.memeSpec || data.style === "meme"
        ? "meme"
        : ((data.contentType as Post["contentType"]) || "image"),
    platform: data.platform || "all",
    likes,
    comments,
    shares,
    saves,
    reach: views,
    engagement,
    retention: data.retention,
    avgWatchTime: data.avgWatchTime,
    image: resolveValidPostImage(rawImg),
    avatar: data.creatorAvatar || data.user?.photoURL || data.user?.avatarUrl || data.avatar || "",
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

const applyOwnCreatorIdentity = (
  post: Post,
  currentUser?: { uid?: string | null; displayName?: string | null; photoURL?: string | null } | null,
): Post => {
  if (!currentUser?.uid || !post.isOwn) return post;
  return {
    ...post,
    creator: currentUser.displayName?.trim() || post.creator,
    avatar: currentUser.photoURL || post.avatar,
  };
};

const feedItemToPost = (
  item: any,
  currentUser?: { uid?: string | null; displayName?: string | null; photoURL?: string | null } | null,
): Post => {
  const data = item.content && typeof item.content === "object" ? item.content : item;
  const platformStats: PlatformStatDto[] = Array.isArray(item.platformStats)
    ? item.platformStats
    : Array.isArray(data.platformStats)
      ? data.platformStats
      : [];

  const socialViews = platformStats.reduce(
    (acc, s) => acc + (Number(s.views) || 0),
    0,
  );
  const socialLikes = platformStats.reduce(
    (acc, s) => acc + (Number(s.likes) || 0),
    0,
  );
  const socialComments = platformStats.reduce(
    (acc, s) => acc + (Number(s.comments) || 0),
    0,
  );

  const rawImg = extractValidImageUrl(data) || extractValidImageUrl(item);
  const userId = item.userId || data.userId;
  const isOwn =
    !!currentUser?.uid && !!userId && String(userId) === String(currentUser.uid);

  const creatorRaw =
    (isOwn && currentUser?.displayName) ||
    item.user?.displayName ||
    data.creatorName ||
    data.creator ||
    item.userName ||
    "";
  const creator =
    typeof creatorRaw === "string" &&
    creatorRaw.trim() &&
    creatorRaw.trim().toLowerCase() !== "creator"
      ? creatorRaw.trim()
      : "";

  const gameRaw = data.game || data.category;
  const game =
    typeof gameRaw === "string" &&
    gameRaw.trim() &&
    gameRaw.trim().toLowerCase() !== "gaming"
      ? gameRaw.trim()
      : undefined;

  const existingTargets: SocialTarget[] | undefined = Array.isArray(item.socialTargets)
    ? item.socialTargets
    : Array.isArray(data.socialTargets)
      ? data.socialTargets
      : undefined;

  const resolvedTypeRaw = data.contentType || item.contentType || data.type || "image";
  const contentType =
    data.memeSpec || data.style === "meme" || String(resolvedTypeRaw).toLowerCase() === "meme"
      ? "meme"
      : resolvedTypeRaw;

  return {
    id: item.id || data.id || item.contentId || `feed_${Math.random()}`,
    contentId: item.contentId || data.contentId || data.id,
    userId,
    creator,
    game,
    time:
      data.publishedAt || item.publishedAt
        ? new Date(data.publishedAt || item.publishedAt).toLocaleDateString()
        : data.createdAt
          ? new Date(data.createdAt).toLocaleDateString()
          : "Just now",
    content:
      data.title ||
      item.title ||
      data.caption ||
      data.selectedCaption ||
      data.description ||
      data.content ||
      "Feed Post",
    tags: data.selectedHashtags || data.hashtags || data.tags || [],
    contentType: contentType as Post["contentType"],
    platform: data.platform || "all",
    likes: socialLikes,
    comments: socialComments,
    shares: data.shareCount ?? data.shares ?? 0,
    saves: data.saveCount ?? data.saves ?? 0,
    reach: socialViews,
    engagement:
      socialViews > 0
        ? parseFloat((((socialLikes + socialComments) / socialViews) * 100).toFixed(1))
        : 0,
    retention: data.retention,
    avgWatchTime: data.avgWatchTime,
    image: resolveValidPostImage(rawImg || item.thumbnailUrl),
    avatar:
      (isOwn && currentUser?.photoURL) ||
      item.user?.photoURL ||
      item.user?.avatarUrl ||
      data.creatorAvatar ||
      data.avatar ||
      "",
    isLiked: false,
    status: data.status || "published",
    planStep: data.planStep,
    aiInsight: data.aiInsight,
    platformStats,
    wesScore: item.wesScore ?? data.wesScore,
    socialRollup: item.socialRollup ?? data.socialRollup,
    socialTargets:
      existingTargets && existingTargets.length > 0
        ? existingTargets
        : socialTargetsFromPlatformStats(platformStats),
    aspectRatio: data.aspectRatio || item.aspectRatio,
    isOwn,
    isFollowing: !!(item.isFollowing ?? data.isFollowing),
  };
};

function postMatchesPlatform(post: Post, platformFilter: string): boolean {
  if (!platformFilter || platformFilter === "all") return true;
  const needle = platformFilter.toLowerCase();
  if (post.platform?.toLowerCase() === needle) return true;
  if (post.socialTargets?.some((t) => t.platform?.toLowerCase() === needle)) return true;
  if (post.platformStats?.some((s) => s.platform?.toLowerCase() === needle)) return true;
  return false;
}

function postMatchesSearch(post: Post, searchQuery: string): boolean {
  if (!searchQuery.trim()) return true;
  const q = searchQuery.toLowerCase().trim();
  const cleanTag = q.startsWith("#") ? q.slice(1) : q;
  const titleMatch =
    post.content?.toLowerCase().includes(q) ||
    post.game?.toLowerCase().includes(q) ||
    post.creator?.toLowerCase().includes(q);
  const tagMatch = post.tags?.some(
    (tag) => tag.toLowerCase().includes(cleanTag) || tag.toLowerCase().includes(q),
  );
  return !!(titleMatch || tagMatch);
}

export default function HomeFeed() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const authUser = useAppSelector(selectAuthUser);
  const resolvedUserPhoto = useAppSelector(selectResolvedUserPhoto);
  const resolvedDisplayName = useAppSelector(selectResolvedDisplayName);
  const currentUserId = authUser?.uid ?? null;
  const currentUserIdentity = useMemo(
    () => ({
      uid: authUser?.uid ?? null,
      displayName: resolvedDisplayName,
      photoURL: resolvedUserPhoto,
    }),
    [authUser?.uid, resolvedDisplayName, resolvedUserPhoto],
  );

  const [activeTab, setActiveTab] = useState("posts");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [contentApiPosts, setContentApiPosts] = useState<Post[]>([]);
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendingLoaded, setTrendingLoaded] = useState(false);

  const fetchPersonalFeed = useCallback(async () => {
    const personalFeedRes = await feedApi.fetchPersonalFeed(undefined, PERSONAL_FEED_LIMIT);
    if (personalFeedRes?.items) {
      setFeedPosts(
        personalFeedRes.items.map((item: any) =>
          feedItemToPost(item, currentUserIdentity),
        ),
      );
    }
  }, [currentUserIdentity]);

  const fetchMetricsContent = useCallback(async () => {
    try {
      const contentList = await contentApi.getUserContentList(METRICS_CONTENT_LIMIT);
      const val: any = contentList;
      const rawItems = Array.isArray(val) ? val : val?.items || val?.data || [];
      if (Array.isArray(rawItems)) {
        setContentApiPosts(
          rawItems.map((item: ContentDto) =>
            applyOwnCreatorIdentity(dtoToPost(item), currentUserIdentity),
          ),
        );
      }
    } catch (err) {
      console.warn("Home feed metrics content failed:", err);
    }
  }, [currentUserIdentity]);

  const fetchTrending = useCallback(async () => {
    try {
      const trendingRes = await feedApi.getTrendingFeed(undefined, TRENDING_FEED_LIMIT);
      if (trendingRes?.items) {
        setTrendingPosts(
          trendingRes.items.map((item: any) =>
            feedItemToPost(item, currentUserIdentity),
          ),
        );
      }
    } catch (err) {
      console.warn("Home feed trending failed:", err);
    } finally {
      setTrendingLoaded(true);
    }
  }, [currentUserIdentity]);

  // Reset deferred loads when identity changes (login / profile update).
  useEffect(() => {
    setTrendingLoaded(false);
  }, [currentUserIdentity.uid]);

  const refreshFeed = useCallback(async () => {
    setLoading(true);
    setTrendingLoaded(false);
    try {
      await fetchPersonalFeed();
      await Promise.allSettled([fetchMetricsContent(), fetchTrending()]);
    } catch (err) {
      console.warn("Error refreshing home feed:", err);
    } finally {
      setLoading(false);
    }
  }, [fetchPersonalFeed, fetchMetricsContent, fetchTrending]);

  // Critical path: personal feed only — unlock UI as soon as Posts can render.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        await fetchPersonalFeed();
      } catch (err) {
        console.warn("Error fetching personal feed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchPersonalFeed]);

  // Secondary: studio metrics from /content/mine (capped) — does not block first paint.
  useEffect(() => {
    if (loading) return;
    void fetchMetricsContent();
  }, [loading, fetchMetricsContent]);

  // Trending: load when tab opens, or prefetch shortly after first paint.
  useEffect(() => {
    if (trendingLoaded) return;
    if (activeTab === "trending") {
      void fetchTrending();
      return;
    }
    if (loading) return;
    const timer = window.setTimeout(() => {
      void fetchTrending();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [activeTab, loading, trendingLoaded, fetchTrending]);

  // Hydrate creator identity (avatar/name) + follow state — cached, concurrent, capped.
  useEffect(() => {
    const candidates = [...feedPosts, ...trendingPosts, ...contentApiPosts];
    const ids = Array.from(
      new Set(
        candidates
          .filter((p) => {
            if (!p.userId) return false;
            const cached = creatorIdentityCache.get(String(p.userId));
            if (p.isOwn) {
              // Own posts: only fill missing avatar (label stays "You").
              return !p.avatar && !cached?.avatarUrl && !currentUserIdentity.photoURL;
            }
            const missingName = !p.creator && !cached?.displayName;
            const missingAvatar = !p.avatar && !cached?.avatarUrl;
            const missingFollow =
              p.isFollowing === undefined && cached?.isFollowing === undefined;
            return missingName || missingAvatar || missingFollow;
          })
          .map((p) => String(p.userId)),
      ),
    ).slice(0, CREATOR_HYDRATE_LIMIT);

    const applyOwnPhoto = (posts: Post[]) => {
      const photo = currentUserIdentity.photoURL;
      if (!photo) return posts;
      let changed = false;
      const next = posts.map((p) => {
        if (!p.isOwn || p.avatar === photo) return p;
        changed = true;
        return { ...p, avatar: photo };
      });
      return changed ? next : posts;
    };

    if (ids.length === 0) {
      // Apply session cache only when posts are missing fields (no network).
      const applyCached = (posts: Post[]) => {
        let changed = false;
        const next = posts.map((p) => {
          if (!p.userId) return p;
          const info = creatorIdentityCache.get(String(p.userId));
          if (!info) return p;
          let updated = p;
          if (p.isOwn) {
            if (!p.avatar && (info.avatarUrl || currentUserIdentity.photoURL)) {
              updated = {
                ...updated,
                avatar: info.avatarUrl || currentUserIdentity.photoURL || "",
              };
              changed = true;
            }
            return updated;
          }
          if (!p.creator && info.displayName) {
            updated = { ...updated, creator: info.displayName };
            changed = true;
          }
          if (!p.avatar && info.avatarUrl) {
            updated = { ...updated, avatar: info.avatarUrl };
            changed = true;
          }
          if (p.isFollowing === undefined && info.isFollowing !== undefined) {
            updated = { ...updated, isFollowing: info.isFollowing };
            changed = true;
          }
          return updated;
        });
        return changed ? next : posts;
      };
      setFeedPosts((prev) => applyOwnPhoto(applyCached(prev)));
      setTrendingPosts((prev) => applyOwnPhoto(applyCached(prev)));
      setContentApiPosts((prev) => applyOwnPhoto(applyCached(prev)));
      return;
    }

    let cancelled = false;
    void mapPool(ids, CREATOR_HYDRATE_CONCURRENCY, async (id) => {
      const cached = creatorIdentityCache.get(id);
      const needIdentity = !cached?.displayName || !cached?.avatarUrl;
      const needFollow = cached?.isFollowing === undefined;

      const [identity, feedProfile] = await Promise.allSettled([
        needIdentity ? identityApi.getUserById(id) : Promise.resolve(null),
        needFollow ? feedApi.getFeedUserProfile(id) : Promise.resolve(null),
      ]);

      const prev = creatorIdentityCache.get(id) || {};
      const next = {
        displayName:
          identity.status === "fulfilled" && identity.value
            ? identity.value?.displayName || identity.value?.username || prev.displayName
            : prev.displayName,
        avatarUrl:
          identity.status === "fulfilled" && identity.value
            ? identity.value?.avatarUrl || identity.value?.photoURL || prev.avatarUrl
            : prev.avatarUrl,
        isFollowing:
          feedProfile.status === "fulfilled" && feedProfile.value
            ? !!feedProfile.value.isFollowing
            : prev.isFollowing,
      };
      creatorIdentityCache.set(id, next);
      return { id, ...next };
    }).then((results) => {
      if (cancelled || results.length === 0) return;

      const identityMap = new Map(results.map((r) => [r.id, r] as const));

      const patch = (posts: Post[]) =>
        applyOwnPhoto(
          posts.map((p) => {
            if (!p.userId) return p;
            const info = identityMap.get(String(p.userId));
            if (!info) return p;
            const nextPost: Post = { ...p };
            if (p.isOwn) {
              if (!p.avatar && info.avatarUrl) nextPost.avatar = info.avatarUrl;
              return nextPost;
            }
            if (info.displayName) nextPost.creator = info.displayName;
            if (info.avatarUrl) nextPost.avatar = info.avatarUrl;
            if (info.isFollowing !== undefined) nextPost.isFollowing = info.isFollowing;
            return nextPost;
          }),
        );
      setFeedPosts(patch);
      setTrendingPosts(patch);
      setContentApiPosts(patch);
    });

    return () => {
      cancelled = true;
    };
  }, [
    feedPosts.length,
    trendingPosts.length,
    contentApiPosts.length,
    currentUserIdentity.photoURL,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredFeedPosts = useMemo(() => {
    return feedPosts.filter(
      (p) => postMatchesPlatform(p, platformFilter) && postMatchesSearch(p, searchQuery),
    );
  }, [feedPosts, platformFilter, searchQuery]);

  const filteredTrendingPosts = useMemo(() => {
    return trendingPosts.filter(
      (p) => postMatchesPlatform(p, platformFilter) && postMatchesSearch(p, searchQuery),
    );
  }, [trendingPosts, platformFilter, searchQuery]);

  const rawPostsList = useMemo(() => {
    const map = new Map<string | number, Post>();
    contentApiPosts.forEach((p) => map.set(p.id, p));
    feedPosts.forEach((p) => map.set(p.id, p));
    return Array.from(map.values());
  }, [contentApiPosts, feedPosts]);

  const totalReach = useMemo(
    () => rawPostsList.reduce((acc, p) => acc + (p.reach || 0), 0),
    [rawPostsList],
  );

  const totalLikes = useMemo(
    () => rawPostsList.reduce((acc, p) => acc + (p.likes || 0), 0),
    [rawPostsList],
  );

  const avgEngagementRate = useMemo(() => {
    if (rawPostsList.length === 0) return "0.0%";
    const sum = rawPostsList.reduce((acc, p) => acc + (p.engagement || 0), 0);
    return `${(sum / rawPostsList.length).toFixed(1)}%`;
  }, [rawPostsList]);

  const publishedOnFeedCount = useMemo(() => {
    return rawPostsList.filter((p) => {
      const key = resolveFeedDisplayStatus(p).key;
      return key === "published" || key === "live" || key === "scheduled" || key === "publishing";
    }).length;
  }, [rawPostsList]);

  const liveOnSocialCount = useMemo(() => {
    return rawPostsList.filter((p) => resolveFeedDisplayStatus(p).key === "live").length;
  }, [rawPostsList]);

  const formatCompactNumber = useCallback((num: number) => {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
    return num.toString();
  }, []);

  const handleFollow = useCallback(async (userId: string, currentlyFollowing: boolean) => {
    const apply = (following: boolean) => {
      const cached = creatorIdentityCache.get(userId) || {};
      creatorIdentityCache.set(userId, { ...cached, isFollowing: following });
      const patch = (posts: Post[]) =>
        posts.map((p) =>
          String(p.userId) === String(userId) ? { ...p, isFollowing: following } : p,
        );
      setFeedPosts(patch);
      setContentApiPosts(patch);
      setTrendingPosts(patch);
    };

    try {
      if (currentlyFollowing) {
        await feedApi.unfollowUser(userId);
        apply(false);
        toast.success("Unfollowed");
      } else {
        await feedApi.followUser(userId);
        apply(true);
        toast.success("Following creator");
      }
    } catch (err: any) {
      apply(currentlyFollowing);
      const msg = Array.isArray(err?.message)
        ? err.message.join(", ")
        : err?.message || "Follow failed";
      toast.error(msg);
    }
  }, []);

  const handleDeletePost = useCallback(async (postId: string | number) => {
    try {
      await contentApi.deleteContent(String(postId));
      const keep = (p: Post) => String(p.contentId || p.id) !== String(postId);
      setContentApiPosts((prev) => prev.filter(keep));
      setFeedPosts((prev) => prev.filter(keep));
      setTrendingPosts((prev) => prev.filter(keep));
      toast.success("Creation deleted successfully!");
    } catch (err) {
      console.error("Failed to delete creation:", err);
      toast.error("Failed to delete creation.");
    }
  }, []);

  const handleSocialSchedule = useCallback(
    (postId: string | number, target: SocialTarget) => {
      const update = (posts: Post[]) =>
        posts.map((p) => {
          if (String(p.contentId || p.id) !== String(postId)) return p;
          const without = (p.socialTargets || []).filter(
            (t) => t.platform !== target.platform,
          );
          return { ...p, socialTargets: [...without, target] };
        });
      setFeedPosts(update);
      setContentApiPosts(update);
      setTrendingPosts(update);
    },
    [],
  );

  if (loading) {
    return <HomeFeedSkeleton />;
  }

  return (
    <div className="w-full space-y-4 pb-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-start">
        {/* --- Main Feed Column --- */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          {/* Create Post CTA banner only */}
          <Card className="ui-plan-card border border-border bg-card shadow-soft overflow-hidden relative p-4 md:p-5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
              <div className="space-y-1 text-center sm:text-start">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <Badge className="bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md h-5">
                    Studio Overview
                  </Badge>
                </div>
                <h2 className="text-sm md:text-base font-black text-foreground tracking-tight">
                  Create & Manage Your Content
                </h2>
                <p className="text-[11px] text-muted-foreground max-w-md">
                  Generate clips and graphics, publish to your feed, then go Live on YouTube,
                  Instagram, Facebook, or TikTok.
                </p>
              </div>
              <Button
                variant="brand-gradient"
                size="lg"
                className="shrink-0"
                onClick={() => navigate("/create/image")}
              >
                <Plus size={16} className="mr-1.5" /> Create Post
              </Button>
            </div>
          </Card>

          {/* Metrics strip */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <MetricCard
              label="Total Audience Reach"
              value={formatCompactNumber(totalReach)}
              weeklyChange={{
                value: "0%",
                direction: "neutral",
                period: "vs last week",
              }}
              subtext={`${rawPostsList.length} creations tracked`}
              icon={Eye}
              iconBg="bg-emerald-500/10 border-emerald-500/20"
              iconColor="text-emerald-500"
              accentGlow="bg-emerald-500/10"
            />
            <MetricCard
              label="Avg Engagement"
              value={avgEngagementRate}
              weeklyChange={{
                value: "0%",
                direction: "neutral",
                period: "vs last week",
              }}
              subtext={`${formatCompactNumber(totalLikes)} likes across feed`}
              icon={Flame}
              iconBg="bg-violet-500/10 border-violet-500/20"
              iconColor="text-violet-500"
              accentGlow="bg-violet-500/10"
            />
            <MetricCard
              label="Published on Feed"
              value={publishedOnFeedCount}
              weeklyChange={{
                value: "0%",
                direction: "neutral",
                period: "vs last week",
              }}
              subtext="On nxClip feed"
              icon={Rocket}
              iconBg="bg-amber-500/10 border-amber-500/20"
              iconColor="text-amber-500"
              accentGlow="bg-amber-500/10"
            />
            <MetricCard
              label="Live on Social"
              value={liveOnSocialCount}
              weeklyChange={{
                value: "0%",
                direction: "neutral",
                period: "vs last week",
              }}
              subtext="Posted to YT / IG / TikTok"
              icon={Radio}
              iconBg="bg-rose-500/10 border-rose-500/20"
              iconColor="text-rose-500"
              accentGlow="bg-rose-500/10"
            />
          </div>

          {/* Tabs: Posts / Trending / Insights */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="ui-tabs-list w-full justify-start overflow-x-auto no-scrollbar scroll-smooth mb-4">
              {[
                { id: "posts", label: t("home.tabs.posts", { defaultValue: "Posts" }), icon: Flame },
                {
                  id: "trending",
                  label: t("home.tabs.trending", { defaultValue: "Trending" }),
                  icon: TrendingUp,
                },
                {
                  id: "insights",
                  label: t("home.tabs.insights", { defaultValue: "Insights" }),
                  icon: Sparkles,
                },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="ui-tabs-trigger shrink-0 px-5 gap-2"
                >
                  <tab.icon size={12} />
                  {tab.id === "posts" ? "Posts" : tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2 }}
                className="outline-none"
              >
                <TabsContent value="posts" className="mt-0 space-y-4">
                  {filteredFeedPosts.length === 0 ? (
                    <EmptyState
                      variant="posts"
                      title={
                        searchQuery.trim() || platformFilter !== "all"
                          ? "No Matching Posts"
                          : "Your Feed is Empty"
                      }
                      description={
                        searchQuery.trim() || platformFilter !== "all"
                          ? "Try clearing search or switching platform filter."
                          : "Follow other creators to see their latest clips and memes here."
                      }
                      actionLabel={
                        searchQuery.trim() || platformFilter !== "all"
                          ? "Clear Filters"
                          : "Explore Trending"
                      }
                      onAction={() => {
                        if (searchQuery.trim() || platformFilter !== "all") {
                          setSearchQuery("");
                          setPlatformFilter("all");
                        } else {
                          setActiveTab("trending");
                        }
                      }}
                    />
                  ) : (
                    <FeedGallery
                      posts={filteredFeedPosts}
                      onFollow={handleFollow}
                      onDelete={handleDeletePost}
                      onSocialSchedule={handleSocialSchedule}
                    />
                  )}
                </TabsContent>

                <TabsContent value="trending" className="mt-0">
                  {filteredTrendingPosts.length === 0 ? (
                    <EmptyState
                      variant="trending"
                      title="Explore is empty"
                      description="Live + verified social posts will appear here once creators connect YouTube, Instagram, Facebook, or TikTok."
                      actionLabel="Refresh Explore"
                      onAction={refreshFeed}
                    />
                  ) : (
                    <div className="space-y-3">
                      <SectionHeading
                        title={t("home.tabs.trending")}
                        subtitle="WES-ranked Live social posts"
                      />
                      <FeedGallery
                        posts={filteredTrendingPosts}
                        onFollow={handleFollow}
                        onSocialSchedule={handleSocialSchedule}
                      />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="insights" className="mt-0 space-y-5">
                  <div className="ui-feed-section">
                    <div className="flex items-center justify-between mb-3">
                      <SectionHeading
                        title={t("home.insights.recent_posts")}
                        subtitle={t("home.insights.recent_subtitle")}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-[9px] font-bold text-primary hover:text-primary hover:bg-primary/5"
                        onClick={() => navigate("/my-content")}
                      >
                        {t("home.insights.full_library")}
                      </Button>
                    </div>

                    {filteredFeedPosts.length === 0 ? (
                      searchQuery.trim() ? (
                        <EmptyState
                          variant="insights"
                          title="No Matching Insights Posts"
                          description={`No posts found matching "${searchQuery}".`}
                          actionLabel="Clear Search"
                          onAction={() => setSearchQuery("")}
                        />
                      ) : (
                        <EmptyState
                          variant="insights"
                          title="No Insights Data Available"
                          description="Publish your first posts to unlock performance analytics, engagement metrics, and AI recommendations."
                          actionLabel="Generate First Post"
                          onAction={() => navigate("/create/image")}
                        />
                      )
                    ) : (
                      <FeedGallery
                        posts={filteredFeedPosts.slice(0, 3)}
                        onFollow={handleFollow}
                        onDelete={handleDeletePost}
                        onSocialSchedule={handleSocialSchedule}
                        priorityCount={2}
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="ui-feed-card p-4 group hover:border-primary/20">
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className={cn(
                            "ui-icon-chip-primary p-2 text-brand-secondary bg-brand-secondary/10",
                            isAr && "ml-0",
                          )}
                        >
                          <Rocket size={16} />
                        </div>
                        <Badge className="bg-brand-secondary/10 text-brand-secondary text-[8px] h-4 font-bold border-none">
                          Opportunity
                        </Badge>
                      </div>
                      <h3 className="text-sm font-bold text-foreground mb-1">
                        {t("home.insights.boost_title")}
                      </h3>
                      <p className="text-[10px] text-muted-foreground leading-relaxed mb-3">
                        {t("home.insights.boost_desc")}
                      </p>
                      <Button
                        variant="link"
                        className="p-0 h-4 text-[10px] font-bold text-brand-secondary hover:no-underline"
                        onClick={() => navigate("/dashboard")}
                      >
                        {t("home.insights.boost_action")}
                        <ChevronRight
                          size={10}
                          className={cn(isAr ? "mr-1 rotate-180" : "ml-1")}
                        />
                      </Button>
                    </Card>

                    <Card className="ui-feed-card p-4 group hover:border-amber-500/20">
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className={cn(
                            "ui-icon-chip-primary p-2 text-amber-600 dark:text-amber-400 bg-amber-500/10",
                            isAr && "ml-0",
                          )}
                        >
                          <Sparkles size={16} />
                        </div>
                        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[8px] h-4 font-bold border-none">
                          AI Tip
                        </Badge>
                      </div>
                      <h3 className="text-sm font-bold text-foreground mb-1">
                        {t("home.insights.tutorial_title")}
                      </h3>
                      <p className="text-[10px] text-muted-foreground leading-relaxed mb-3">
                        {t("home.insights.tutorial_desc")}
                      </p>
                      <Button
                        variant="link"
                        className="p-0 h-4 text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:no-underline"
                        onClick={() => navigate("/create/image")}
                      >
                        {t("home.insights.tutorial_action")}
                        <ChevronRight
                          size={10}
                          className={cn(isAr ? "mr-1 rotate-180" : "ml-1")}
                        />
                      </Button>
                    </Card>
                  </div>
                </TabsContent>
              </motion.div>
            </AnimatePresence>
          </Tabs>
        </div>

        {/* --- Lean right sidebar --- */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          {/* Search + platform filter */}
          <div className="ui-sidebar-panel border-border">
            <SectionHeading title="Filter & Search" />
            <div className="space-y-2.5 pt-1">
              <div className="relative">
                <Search
                  size={14}
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none",
                    isAr ? "right-3" : "left-3",
                  )}
                />
                <Input
                  type="text"
                  placeholder={t("home.search_placeholder", {
                    defaultValue: "Search posts...",
                  })}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    "h-9 w-full text-[11px] font-medium bg-background/60 border-border/80 focus-visible:border-primary/60 rounded-xl placeholder:text-muted-foreground/60",
                    isAr ? "pr-9 pl-8" : "pl-9 pr-8",
                  )}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors",
                      isAr ? "left-2" : "right-2",
                    )}
                    title="Clear search"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-full h-9 text-[10px] font-bold border-border bg-background/60">
                  <SelectValue placeholder="All Platforms">
                    {PLATFORM_FILTER_LABELS[platformFilter] ?? "All Platforms"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                </SelectContent>
              </Select>

              {searchQuery && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground tabular-nums h-6 inline-flex items-center px-1">
                  {filteredFeedPosts.length}{" "}
                  {filteredFeedPosts.length === 1 ? "match" : "matches"}
                </span>
              )}
            </div>
          </div>

          <div className="ui-sidebar-panel border-border">
            <SectionHeading title="Published → Live" />
            <div className="space-y-3 pt-1">
              <ol className="space-y-2.5 text-[11px] font-medium text-muted-foreground leading-relaxed">
                <li className="flex gap-2">
                  <span className="shrink-0 mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/15 text-[9px] font-black text-emerald-500">
                    1
                  </span>
                  <span>
                    <span className="font-bold text-foreground">Published</span> — your post is live
                    on the nxClip feed.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500/15 text-[9px] font-black text-rose-500">
                    2
                  </span>
                  <span>
                    <span className="font-bold text-foreground">Live</span> — use the Share icon on a
                    card to schedule or post to YouTube, Instagram, Facebook, or TikTok.
                  </span>
                </li>
              </ol>
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-[10px] font-bold gap-1.5"
                onClick={() => navigate("/dashboard")}
              >
                <LayoutDashboard size={12} />
                Schedule & week plan
                <ArrowRight size={11} className={cn(isAr && "rotate-180")} />
              </Button>
              <p className="text-[9px] text-muted-foreground leading-relaxed">
                Calendar scheduling and weekly plan now live on the Dashboard.
              </p>
            </div>
          </div>

          <div className="ui-sidebar-panel bg-primary/5 border-primary/20">
            <SectionHeading title={t("home.viral.title")} />
            <div className="space-y-2.5 pt-1">
              <p className="text-[11px] font-bold text-foreground leading-tight">
                {t("home.viral.no_opportunities", {
                  defaultValue: "No active viral hooks identified at this time.",
                })}
              </p>
              <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                {t("home.viral.tip_empty", {
                  defaultValue: "Post more content to enable AI-powered trend detection.",
                })}
              </p>
              <Button
                className="w-full h-8 text-[9px] font-bold rounded-md bg-primary/20 text-primary/60 cursor-not-allowed"
                disabled
              >
                {t("home.viral.action")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
