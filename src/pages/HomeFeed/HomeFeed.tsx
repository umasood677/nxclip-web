import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { 
  Plus, Calendar, Rocket, 
  Target, Zap, Clock, 
  Video, Image as ImageIcon, Sparkles, ChevronRight,
  Play, Edit3, Layers, Flame, Library, RefreshCw,
  Search, X, Eye, Heart, TrendingUp
} from "lucide-react";
import { HomeFeedSkeleton } from "./skeletons/HomeFeedSkeleton";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../components/ui/avatar";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Skeleton } from "../../components/ui/skeleton";
import { Input } from "../../components/ui/input";
import { cn } from "../../lib/utils";
import { contentApi, feedApi, ContentDto, extractValidImageUrl } from "../../services/apiClient";
import { toast } from "sonner";
import { EmptyState } from "../../components/common/EmptyState";
import { Pagination } from "../../components/ui/pagination";

// --- Types & Interfaces ---

import { Post } from "./components/PostCard";

interface PlanTask {
  id: string;
  day: string;
  contentType: "clip" | "meme" | "image" | "insight";
  game: string;
  title: string;
  platform: "tiktok" | "youtube" | "instagram" | "twitch" | "all";
  status: "ready" | "in_progress" | "scheduled" | "published" | "needs_review" | "completed" | "pending";
  dueTime: string;
  cta: string;
  objective: string;
}

// No mock data - using API values
const WEEKLY_PLAN: any[] = [];
const SCHEDULED_POSTS: any[] = [];
const SUGGESTED_CREATORS: any[] = [];

// --- Components ---

import { PostCard } from "./components/PostCard";
import { SectionHeading } from "./components/SectionHeading";
import { MetricCard } from "./components/MetricCard";

const resolveValidPostImage = (itemOrUrl: any): string => {
  const url = typeof itemOrUrl === "string" ? itemOrUrl : extractValidImageUrl(itemOrUrl);
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

const dtoToPost = (item: ContentDto): Post => {
  const data = (item as any).content && typeof (item as any).content === "object" ? (item as any).content : item;
  const isVideo = data.contentType === "clip";
  const views = data.viewCount ?? data.views ?? data.reach ?? 0;
  const likes = data.likeCount ?? data.likes ?? 0;
  const comments = data.commentCount ?? data.comments ?? 0;
  const shares = data.shareCount ?? data.shares ?? 0;
  const saves = data.saveCount ?? data.saves ?? 0;
  
  const engagement = data.engagement !== undefined
    ? data.engagement
    : (views > 0 ? parseFloat(((likes + comments + shares) / views * 100).toFixed(1)) : 0);

  const rawImg = extractValidImageUrl(data);

  return {
    id: data.id || (item as any).id,
    creator: data.creatorName || data.user?.displayName || (item as any).creatorName || "You",
    game: data.game || (isVideo ? "Clip Studio" : "Image Studio"),
    time: data.publishedAt ? new Date(data.publishedAt).toLocaleDateString() : (data.createdAt ? new Date(data.createdAt).toLocaleDateString() : "Just now"),
    content: data.title || data.caption || data.description || (item as any).content || "Untitled Creation",
    tags: data.hashtags || data.tags || [],
    contentType: (data.contentType as any) || "image",
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
    avatar: data.creatorAvatar || data.user?.photoURL || data.avatar || "",
    isLiked: data.likedByMe || data.isLiked || false,
    status: data.status || "published",
    planStep: data.planStep,
    aiInsight: data.aiInsight,
  };
};

const feedItemToPost = (item: any): Post => {
  const data = item.content && typeof item.content === "object" ? item.content : item;
  const platformStats = Array.isArray(item.platformStats)
    ? item.platformStats
    : Array.isArray(data.platformStats)
      ? data.platformStats
      : [];

  // Aggregate social stats for legacy metric fields (not shown as in-app likes)
  const socialViews = platformStats.reduce((acc: number, s: any) => acc + (Number(s.views) || 0), 0);
  const socialLikes = platformStats.reduce((acc: number, s: any) => acc + (Number(s.likes) || 0), 0);
  const socialComments = platformStats.reduce((acc: number, s: any) => acc + (Number(s.comments) || 0), 0);

  const rawImg = extractValidImageUrl(data) || extractValidImageUrl(item);

  return {
    id: item.id || data.id || item.contentId || `feed_${Math.random()}`,
    contentId: item.contentId || data.contentId || data.id,
    userId: item.userId || data.userId,
    creator: item.user?.displayName || data.creatorName || data.creator || item.userName || "Creator",
    game: data.game || data.category || "Gaming",
    time: data.publishedAt || item.publishedAt
      ? new Date(data.publishedAt || item.publishedAt).toLocaleDateString()
      : (data.createdAt ? new Date(data.createdAt).toLocaleDateString() : "Just now"),
    content: data.title || item.title || data.caption || data.description || data.content || "Feed Post",
    tags: data.hashtags || data.tags || [],
    contentType: data.contentType || item.contentType || data.type || "clip",
    platform: data.platform || "all",
    likes: socialLikes,
    comments: socialComments,
    shares: data.shareCount ?? data.shares ?? 0,
    saves: data.saveCount ?? data.saves ?? 0,
    reach: socialViews,
    engagement: socialViews > 0
      ? parseFloat((((socialLikes + socialComments) / socialViews) * 100).toFixed(1))
      : 0,
    retention: data.retention,
    avgWatchTime: data.avgWatchTime,
    image: resolveValidPostImage(rawImg || item.thumbnailUrl),
    avatar: item.user?.photoURL || data.creatorAvatar || data.avatar || "",
    isLiked: false,
    status: data.status || "published",
    planStep: data.planStep,
    aiInsight: data.aiInsight,
    platformStats,
    wesScore: item.wesScore ?? data.wesScore,
    socialRollup: item.socialRollup ?? data.socialRollup,
  };
};

export default function HomeFeed() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [activeTab, setActiveTab] = useState("feed");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  
  const [contentApiPosts, setContentApiPosts] = useState<Post[]>([]);
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // Today's Focus - Derived from WEEKLY_PLAN (now empty)
  const todaysFocus = undefined;

  const fetchLiveFeedData = useCallback(async () => {
    setLoading(true);
    try {
      const [contentList, personalFeedRes, trendingRes] = await Promise.allSettled([
        contentApi.getUserContentList(),
        feedApi.fetchPersonalFeed(),
        feedApi.getTrendingFeed()
      ]);

      if (contentList.status === "fulfilled" && contentList.value) {
        const val: any = contentList.value;
        const rawItems = Array.isArray(val) 
          ? val 
          : (val.items || val.data || []);
        if (Array.isArray(rawItems)) {
          setContentApiPosts(rawItems.map(dtoToPost));
        }
      }

      if (personalFeedRes.status === "fulfilled" && personalFeedRes.value?.items) {
        setFeedPosts(personalFeedRes.value.items.map(feedItemToPost));
      }

      if (trendingRes.status === "fulfilled" && trendingRes.value?.items) {
        setTrendingPosts(trendingRes.value.items.map(feedItemToPost));
      }
    } catch (err) {
      console.warn("Error fetching data from API Gate:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveFeedData();
  }, [fetchLiveFeedData]);

  const allUserPosts = useMemo(() => {
    let list = [...feedPosts];
    
    if (platformFilter && platformFilter !== "all") {
      list = list.filter(p => p.platform?.toLowerCase() === platformFilter.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const cleanTag = q.startsWith("#") ? q.slice(1) : q;
      list = list.filter(p => {
        const titleMatch = p.content?.toLowerCase().includes(q) || p.game?.toLowerCase().includes(q) || p.creator?.toLowerCase().includes(q);
        const tagMatch = p.tags?.some(tag => tag.toLowerCase().includes(cleanTag) || tag.toLowerCase().includes(q));
        return titleMatch || tagMatch;
      });
    }
    return list;
  }, [feedPosts, platformFilter, searchQuery]);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, platformFilter, activeTab]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(allUserPosts.length / pageSize));
  }, [allUserPosts.length, pageSize]);

  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return allUserPosts.slice(start, start + pageSize);
  }, [allUserPosts, currentPage, pageSize]);

  // Base raw posts list for channel-wide metrics
  const rawPostsList = useMemo(() => {
    const map = new Map<string | number, Post>();
    contentApiPosts.forEach(p => map.set(p.id, p));
    feedPosts.forEach(p => map.set(p.id, p));
    return Array.from(map.values());
  }, [contentApiPosts, feedPosts]);

  // Computed KPI Metrics from available post data
  const totalReach = useMemo(() => {
    return rawPostsList.reduce((acc, p) => acc + (p.reach || 0), 0);
  }, [rawPostsList]);

  const totalInteractions = useMemo(() => {
    return rawPostsList.reduce((acc, p) => acc + (p.likes || 0) + (p.comments || 0) + (p.shares || 0), 0);
  }, [rawPostsList]);

  const totalLikes = useMemo(() => {
    return rawPostsList.reduce((acc, p) => acc + (p.likes || 0), 0);
  }, [rawPostsList]);

  const avgEngagementRate = useMemo(() => {
    if (rawPostsList.length === 0) return "0.0%";
    const sum = rawPostsList.reduce((acc, p) => acc + (p.engagement || 0), 0);
    return `${(sum / rawPostsList.length).toFixed(1)}%`;
  }, [rawPostsList]);

  const publishedCount = useMemo(() => {
    return rawPostsList.filter(p => p.status === 'published').length;
  }, [rawPostsList]);

  const pipelineCount = useMemo(() => {
    return rawPostsList.filter(p => p.status === 'ready' || p.status === 'draft' || p.status === 'in_progress' || p.status === 'needs_review').length;
  }, [rawPostsList]);

  const formatCompactNumber = useCallback((num: number) => {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
    return num.toString();
  }, []);

  const handleFollow = useCallback(async (userId: string) => {
    try {
      await feedApi.followUser(userId);
      toast.success("Following creator");
    } catch (err: any) {
      const msg = Array.isArray(err?.message) ? err.message.join(", ") : err?.message || "Follow failed";
      toast.error(msg);
    }
  }, []);

  const handleDeletePost = useCallback(async (postId: string | number) => {
    try {
      await contentApi.deleteContent(String(postId));
      setContentApiPosts(prev => prev.filter(p => String(p.contentId || p.id) !== String(postId)));
      setFeedPosts(prev => prev.filter(p => String(p.contentId || p.id) !== String(postId)));
      setTrendingPosts(prev => prev.filter(p => String(p.contentId || p.id) !== String(postId)));
      toast.success("Creation deleted successfully!");
    } catch (err) {
      console.error("Failed to delete creation:", err);
      toast.error("Failed to delete creation.");
    }
  }, []);

  if (loading) {
    return <HomeFeedSkeleton />;
  }

  return (
    <div className="ui-dashboard-page">
        {/* --- Page Header --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 pb-4 border-b border-border">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight">{t('home.header.title')}</h1>
            <p className="text-[10px] md:text-[11px] font-bold text-muted-foreground max-w-md">
              {t('home.header.subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="flex-1 sm:w-[120px] h-9 text-[10px] font-bold border-border bg-card">
                <SelectValue placeholder={t('common.platform')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all_platforms')}</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
              </SelectContent>
            </Select>

            <DropdownMenu>
               <DropdownMenuTrigger asChild>
                  <Button variant="brand" size="sm" className="px-6 shadow-soft transition-transform hover:scale-[1.01]">
                    <Plus className="mr-2 h-3 w-3" /> {t('common.create_new')}
                  </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent align={isAr ? "start" : "end"} className="w-52 border-border text-[11px] font-bold">
                  <DropdownMenuItem onClick={() => navigate('/create/clip')} className="gap-2 py-2.5"><Video size={14} className="text-primary" /> {t('common.create_clip')}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/create/image')} className="gap-2 py-2.5"><Sparkles size={14} className="text-amber-500" /> {t('common.create_meme')}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/create/image')} className="gap-2 py-2.5"><ImageIcon size={14} className="text-blue-500/80" /> {t('common.create_image')}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/calendar')} className="gap-2 py-2.5"><Calendar size={14} className="text-brand-secondary" /> {t('common.schedule')}</DropdownMenuItem>
               </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="ui-dashboard-grid">
          {/* --- Main Feed Column --- */}
          <div className="ui-dashboard-main">
            {/* Section 1: Today's Focus */}
            {todaysFocus ? (
              <Card className="ui-plan-card border border-border bg-primary/5 shadow-soft overflow-hidden relative">
                <div className={cn("absolute top-0 p-4 opacity-5 pointer-events-none text-primary", isAr ? "left-0" : "right-0")}>
                  <Sparkles size={120} />
                </div>
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 relative z-10">
                    <div className="flex-1 space-y-3 text-center md:text-start">
                      <div className="flex items-center justify-center md:justify-start gap-2">
                        <Badge className="bg-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded-md h-5">{t('home.focus.title')}</Badge>
                        <span className="text-[10px] font-bold text-muted-foreground/60 tracking-wider">• {t('home.focus.due', { time: todaysFocus.dueTime })}</span>
                      </div>
                      <h2 className="text-base md:text-xl font-black text-foreground leading-tight tracking-tight max-w-2xl">
                        {t(todaysFocus.contentType === "clip" ? 'home.focus.task' : 'home.focus.task_gen', { game: todaysFocus.game, type: t(`onboarding.plan.types.${todaysFocus.contentType}`), platform: todaysFocus.platform })}
                      </h2>
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                           <Target size={12} className="text-primary" /> {t('home.focus.goal', { objective: todaysFocus.objective })}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col gap-2.5 w-full md:w-44">
                      <Button variant="brand" size="lg" className="transition-transform hover:scale-[1.01]" onClick={() => navigate('/create/image')}>
                        {t(todaysFocus.contentType === "clip" ? 'home.focus.action_edit' : 'home.focus.action_gen')}
                      </Button>
                      <p className="text-[9px] text-center font-bold text-muted-foreground tracking-widest opacity-60">{t('home.focus.est', { time: 15 })}</p>
                    </div>
                </div>
              </Card>
            ) : (
              <Card className="ui-plan-card border border-border bg-card shadow-soft overflow-hidden relative p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                  <div className="space-y-2 text-center md:text-start">
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <Badge className="bg-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded-md h-5">Studio Overview</Badge>
                    </div>
                    <h2 className="text-base md:text-xl font-black text-foreground tracking-tight">
                      Create & Manage Your Content
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Generate viral clips, AI graphics, and manage live published posts across platforms.
                    </p>
                  </div>
                  <Button variant="brand-gradient" size="lg" className="shrink-0" onClick={() => navigate('/create/image')}>
                    <Plus size={16} className="mr-1.5" /> Create Post
                  </Button>
                </div>
              </Card>
            )}

            {/* Section 2: Summary Metrics Strip */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              <MetricCard 
                label={t('home.metrics.total_reach', { defaultValue: "Total Audience Reach" })}
                value={formatCompactNumber(totalReach)}
                weeklyChange={{
                  value: "0%",
                  direction: "neutral",
                  period: "vs last week"
                }}
                subtext={t('home.metrics.reach_subtext', { defaultValue: `${rawPostsList.length} creations tracked` })}
                icon={Eye}
                iconBg="bg-emerald-500/10 border-emerald-500/20"
                iconColor="text-emerald-500"
                accentGlow="bg-emerald-500/10"
              />
              <MetricCard 
                label={t('home.metrics.avg_engagement', { defaultValue: "Avg. Engagement Rate" })}
                value={avgEngagementRate}
                weeklyChange={{
                  value: "0%",
                  direction: "neutral",
                  period: "vs last week"
                }}
                subtext={t('home.metrics.eng_subtext', { defaultValue: `${formatCompactNumber(totalLikes)} likes across feed` })}
                icon={Flame}
                iconBg="bg-violet-500/10 border-violet-500/20"
                iconColor="text-violet-500"
                accentGlow="bg-violet-500/10"
              />
              <MetricCard 
                label={t('home.metrics.published_creations', { defaultValue: "Published Creations" })}
                value={publishedCount}
                weeklyChange={{
                  value: "0%",
                  direction: "neutral",
                  period: "vs last week"
                }}
                subtext={t('home.metrics.published_subtext', { defaultValue: "Active on connected feeds" })}
                icon={Rocket}
                iconBg="bg-amber-500/10 border-amber-500/20"
                iconColor="text-amber-500"
                accentGlow="bg-amber-500/10"
              />
              <MetricCard 
                label={t('home.metrics.active_pipeline', { defaultValue: "Creation Pipeline" })}
                value={pipelineCount}
                weeklyChange={{
                  value: "0%",
                  direction: "neutral",
                  period: "vs last week"
                }}
                subtext={t('home.metrics.pipeline_subtext', { defaultValue: "Drafts & clips in progress" })}
                icon={Layers}
                iconBg="bg-primary/10 border-primary/20"
                iconColor="text-primary"
                accentGlow="bg-primary/10"
              />
            </div>

            {/* Section: Search Bar */}
            <div className="relative flex items-center justify-between gap-3 my-4">
              <div className="relative flex-1 max-w-md">
                <Search size={15} className={cn("absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none", isAr ? "right-3.5" : "left-3.5")} />
                <Input
                  type="text"
                  placeholder={t('home.search_placeholder', { defaultValue: "Search posts by title, game, or #tag..." })}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    "h-9 text-[11px] font-medium bg-card/80 backdrop-blur-md border-border/80 focus-visible:border-primary/60 rounded-xl shadow-soft placeholder:text-muted-foreground/60 transition-all",
                    isAr ? "pr-10 pl-9" : "pl-10 pr-9"
                  )}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className={cn("absolute top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors", isAr ? "left-2.5" : "right-2.5")}
                    title="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              {searchQuery && (
                <Badge variant="outline" className="text-[10px] font-mono h-7 px-2.5 border-border bg-card">
                  {allUserPosts.length} {allUserPosts.length === 1 ? 'match' : 'matches'}
                </Badge>
              )}
            </div>

            {/* Section 3: Feed Tabs Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="relative">
                <TabsList className="ui-tabs-list w-full justify-start overflow-x-auto no-scrollbar scroll-smooth mb-8">
                  {[
                    { id: "feed", label: t('nav.home_feed'), icon: Flame },
                    { id: "plan", label: t('home.tabs.plan'), icon: Calendar },
                    { id: "scheduled", label: t('home.tabs.scheduled'), icon: Clock },
                    { id: "trending", label: t('home.tabs.trending'), icon: Flame },
                    { id: "insights", label: t('home.tabs.insights'), icon: Sparkles },
                  ].map((tab) => (
                    <TabsTrigger 
                      key={tab.id} 
                      value={tab.id}
                      className="ui-tabs-trigger shrink-0 px-5 gap-2"
                    >
                      <tab.icon size={12} />
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <div className={cn("absolute top-0 bottom-8 w-12 pointer-events-none md:hidden", isAr ? "start-0 bg-gradient-to-r from-background to-transparent" : "end-0 bg-gradient-to-l from-background to-transparent")} />
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.25 }}
                  className="outline-none"
                >
                  {/* - Feed Tab Content - */}
                  <TabsContent value="feed" className="mt-0 space-y-6">
                    <div className="flex items-center justify-between mb-2">
                      <SectionHeading title={t('nav.home_feed')} subtitle="Stay updated with the latest from the community" />
                    </div>
                    {feedPosts.length === 0 ? (
                      <EmptyState
                        variant="posts"
                        title="Your Feed is Empty"
                        description="Follow other creators to see their latest clips and memes here."
                        actionLabel="Explore Trending"
                        onAction={() => setActiveTab("trending")}
                      />
                    ) : (
                      <div className="space-y-4">
                        <div className="ui-feed-grid">
                          {feedPosts.map((post, idx) => (
                            <PostCard 
                              key={post.id} 
                              post={post} 
                              index={idx}
                              priority={idx < 4}
                              onFollow={handleFollow}
                              onDelete={handleDeletePost} 
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* - Insights Tab Content - */}
                  <TabsContent value="insights" className="mt-0 space-y-8">
                    <div className="ui-feed-section">
                      <div className="flex items-center justify-between mb-4">
                        <SectionHeading 
                          title={t('home.insights.recent_posts')} 
                          subtitle={t('home.insights.recent_subtitle')} 
                        />
                        <Button variant="ghost" size="sm" className="h-8 text-[9px] font-bold text-primary hover:text-primary hover:bg-primary/5" onClick={() => navigate('/my-content')}>
                          {t('home.insights.full_library')}
                        </Button>
                      </div>
                      
                      {loading ? (
                        <div className="ui-feed-grid">
                          <Card className="ui-post-card border-border bg-muted/5 animate-pulse">
                            <Skeleton className="aspect-video w-full bg-muted/20" />
                            <div className="p-4 space-y-3">
                              <Skeleton className="h-3 w-3/4 bg-muted/20" />
                              <Skeleton className="h-10 w-full bg-muted/20" />
                            </div>
                          </Card>
                        </div>
                      ) : allUserPosts.length === 0 ? (
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
                            onAction={() => navigate('/create/image')}
                          />
                        )
                      ) : (
                        <div className="ui-feed-grid">
                          {allUserPosts.slice(0, 3).map((post, idx) => (
                            <PostCard 
                              key={post.id} 
                              post={post} 
                              index={idx}
                              priority={idx < 2}
                              onFollow={handleFollow}
                              onDelete={handleDeletePost} 
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="ui-feed-card p-5 group hover:border-primary/20">
                        <div className="flex items-center justify-between mb-4">
                          <div className={cn("ui-icon-chip-primary p-2 text-brand-secondary bg-brand-secondary/10", isAr && "ml-0")}>
                            <Rocket size={16} />
                          </div>
                          <Badge className="bg-brand-secondary/10 text-brand-secondary text-[8px] h-4 font-bold border-none">Opportunity</Badge>
                        </div>
                        <h3 className="text-sm font-bold text-foreground mb-1">{t('home.insights.boost_title')}</h3>
                        <p className="text-[10px] text-muted-foreground leading-relaxed mb-4">{t('home.insights.boost_desc')}</p>
                        <Button variant="link" className="p-0 h-4 text-[10px] font-bold text-brand-secondary hover:no-underline">
                          {t('home.insights.boost_action')} 
                          <ChevronRight size={10} className={cn(isAr ? "mr-1 rotate-180" : "ml-1")} />
                        </Button>
                      </Card>

                      <Card className="ui-feed-card p-5 group hover:border-amber-500/20">
                        <div className="flex items-center justify-between mb-4">
                          <div className={cn("ui-icon-chip-primary p-2 text-amber-600 dark:text-amber-400 bg-amber-500/10", isAr && "ml-0")}>
                            <Sparkles size={16} />
                          </div>
                          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[8px] h-4 font-bold border-none">AI Tip</Badge>
                        </div>
                        <h3 className="text-sm font-bold text-foreground mb-1">{t('home.insights.tutorial_title')}</h3>
                        <p className="text-[10px] text-muted-foreground leading-relaxed mb-4">{t('home.insights.tutorial_desc')}</p>
                        <Button variant="link" className="p-0 h-4 text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:no-underline">
                          {t('home.insights.tutorial_action')} 
                          <ChevronRight size={10} className={cn(isAr ? "mr-1 rotate-180" : "ml-1")} />
                        </Button>
                      </Card>
                    </div>
                  </TabsContent>

                  {/* - Weekly Plan Tab Content - */}
                  <TabsContent value="plan" className="mt-0 space-y-6">
                    {WEEKLY_PLAN.length === 0 ? (
                      <EmptyState
                        variant="plan"
                        title="No Weekly Plan Scheduled"
                        description="Your content release plan is currently empty. Organize your daily clip drops and game announcements in the calendar."
                        actionLabel="Plan Content Schedule"
                        onAction={() => navigate('/calendar')}
                        secondaryActionLabel="Create Post"
                        onSecondaryAction={() => navigate('/create/image')}
                      />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {WEEKLY_PLAN.map((day) => (
                          <Card key={day.id} className={cn(
                            "rounded-lg border shadow-soft transition-all duration-200",
                            day.status === "published" || day.status === "completed" ? "border-brand-secondary/40 bg-brand-secondary/5" : 
                            day.status === "in_progress" ? "border-primary/40 bg-primary/5" : "border-border bg-card"
                          )}>
                            <div className="p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-foreground">{t(`common.days.${day.day}`)}</p>
                                <Badge className={cn(
                                  "text-[8px] h-4 font-bold",
                                  day.status === "published" || day.status === "completed" ? "bg-brand-secondary text-primary-foreground border-brand-secondary/20" : "bg-muted text-muted-foreground border-border"
                                )}>
                                  {t(`home.status.${day.status}`)}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-[11px] font-bold text-foreground line-clamp-1">{day.title}</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <Badge variant="outline" className="text-[8px] h-3.5 border-border text-muted-foreground">{day.game}</Badge>
                                  <Badge variant="outline" className="text-[8px] h-3.5 border-border text-muted-foreground">{t(`onboarding.plan.types.${day.contentType}`)}</Badge>
                                </div>
                              </div>
                            </div>
                            <div className="p-4 bg-muted/20 border-t border-border">
                              <Button className={cn(
                                "w-full h-8 text-[9px] font-bold rounded-md",
                                day.status === "published" || day.status === "completed" ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
                              )}>
                                {day.cta}
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* - Scheduled Content - */}
                  <TabsContent value="scheduled" className="mt-0">
                    {SCHEDULED_POSTS.length === 0 ? (
                      <EmptyState
                        variant="scheduled"
                        title="No Scheduled Posts Queued"
                        description="There are currently no upcoming scheduled posts queued in your publishing pipeline."
                        actionLabel="Schedule Content"
                        onAction={() => navigate('/calendar')}
                      />
                    ) : (
                      <div className="ui-feed-grid">
                        {SCHEDULED_POSTS.map((post) => (
                          <Card key={post.id} className="ui-feed-card p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                                <Clock size={16} className="text-muted-foreground" />
                              </div>
                              <div className="space-y-0.5">
                                <h4 className="text-xs font-bold">{post.title}</h4>
                                <p className="text-[10px] text-muted-foreground font-bold">{post.platform} • {t(`common.time.${post.time}`)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[8px] h-4 font-bold">{t(`home.status.${post.status}`)}</Badge>
                              <Button variant="ghost" size="icon" className="h-7 w-7"><Edit3 size={12} /></Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* - Explore / Trending (GET /feed/trending) - */}
                  <TabsContent value="trending" className="mt-0">
                    {trendingPosts.length === 0 ? (
                      <EmptyState
                        variant="trending"
                        title="Explore is empty"
                        description="Live+verified social posts will appear here once creators connect YouTube, Instagram, or TikTok. Home feed still works without social."
                        actionLabel="Refresh Explore"
                        onAction={fetchLiveFeedData}
                      />
                    ) : (
                      <div className="space-y-4">
                        <SectionHeading title={t('home.tabs.trending')} subtitle="WES-ranked Live social posts" />
                        <div className="ui-feed-grid">
                          {trendingPosts.map((post, idx) => (
                            <PostCard
                              key={post.id}
                              post={post}
                              index={idx}
                              priority={idx < 4}
                              onFollow={handleFollow}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </motion.div>
              </AnimatePresence>
            </Tabs>
          </div>

          {/* --- Right Sidebar Column --- */}
          <div className="ui-dashboard-sidebar">
            {/* Widget 1: Today's Creator Pipeline */}
            <div className="ui-sidebar-panel group border-border hover:border-primary/40 transition-colors">
              <SectionHeading title={t('home.pipeline.title')} />
              <div className="space-y-4 pt-2">
                <div className="space-y-2 text-[11px] font-bold text-foreground">
                <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-muted-foreground tracking-tight">{t('home.pipeline.no_active_task', { defaultValue: 'No active task' })}</span>
                      <span className="text-primary tracking-tight">0%</span>
                   </div>
                   <div className="relative h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "0%" }}
                        className="h-full bg-primary" 
                      />
                   </div>
                </div>
                <div className="flex items-center justify-between p-2 rounded-md bg-muted/30 border border-border group/item hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Sparkles size={12} className="text-amber-600 dark:text-amber-400" />
                    <span className="text-[10px] font-bold tracking-tight">{t('home.pipeline.gen')}</span>
                  </div>
                  <Badge className="bg-primary/10 text-primary text-[8px] h-4 border-primary/20 font-bold">{t('home.pipeline.ready')}</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-md bg-muted/20 border border-border opacity-60">
                  <div className="flex items-center gap-2">
                    <Calendar size={12} className="text-muted-foreground" />
                    <span className="text-[10px] font-bold tracking-tight">{t('home.pipeline.schedule')}</span>
                  </div>
                  <Badge variant="outline" className="text-[8px] h-4 border-border bg-muted text-muted-foreground font-bold">{t('home.pipeline.pending')}</Badge>
                </div>
              </div>
            </div>

            {/* Widget 2: Weekly Progress */}
            <div className="ui-sidebar-panel">
               <SectionHeading title={t('home.metrics.weekly_progress')} />
               <div className="space-y-4 pt-2">
                  <div className="flex items-end justify-between">
                     <p className="text-2xl font-black font-mono">0 <span className="text-xs text-muted-foreground font-sans font-bold">/ 7</span></p>
                     <p className="text-[10px] font-bold text-brand-secondary">{t('home.metrics.streak')}</p>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                    <div className="h-full bg-primary" style={{ width: '0%' }} />
                    <div className="h-full bg-brand-secondary/20" style={{ width: '0%' }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium italic leading-relaxed">{t('home.metrics.goal_desc')}</p>
               </div>
            </div>

            {/* Widget 3: Viral Opportunities */}
            <div className="ui-sidebar-panel bg-primary/5 border-primary/20">
               <SectionHeading title={t('home.viral.title')} />
               <div className="space-y-3 pt-2">
                  <p className="text-[11px] font-bold text-foreground leading-tight">{t('home.viral.no_opportunities', { defaultValue: 'No active viral hooks identified at this time.' })}</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed italic">{t('home.viral.tip_empty', { defaultValue: 'Post more content to enable AI-powered trend detection.' })}</p>
                   <Button className="w-full h-8 text-[9px] font-bold rounded-md bg-primary/20 text-primary/60 cursor-not-allowed" disabled>{t('home.viral.action')}</Button>
               </div>
            </div>

            {/* Widget 4: Suggested Creators */}
            <div className="ui-sidebar-panel">
               <SectionHeading title={t('home.creators.title')} />
               <div className="space-y-4 pt-2">
                  {SUGGESTED_CREATORS.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground italic">No suggested creators at present.</p>
                  ) : (
                    SUGGESTED_CREATORS.map(c => (
                      <div key={c.id} className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border border-border">
                               <AvatarImage src={c.avatar} />
                               <AvatarFallback>{c.name.charAt(1)}</AvatarFallback>
                            </Avatar>
                            <div>
                               <p className="text-[11px] font-bold text-foreground">{c.name}</p>
                               <p className="text-[9px] font-bold text-muted-foreground">{c.overlap} {t('home.creators.overlap')}</p>
                            </div>
                         </div>
                         <Button
                           variant="ghost"
                           size="sm"
                           className="h-7 text-[9px] font-bold text-primary hover:text-primary-foreground hover:bg-primary rounded-md"
                           onClick={() => feedApi.followUser(c.id).then(() => toast.success(`Following ${c.name}`)).catch(() => toast.error("Follow failed"))}
                         >
                           {t('home.creators.follow')}
                         </Button>
                      </div>
                    ))
                  )}
               </div>
            </div>
          </div>
        </div>
      </div>
  );
}
