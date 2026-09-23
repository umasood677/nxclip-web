import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import CreatePostDialog from "./components/CreatePostDialog";
import { DashboardSkeleton } from "./skeletons/DashboardSkeleton";
import {
  Sparkles, 
  BrainCircuit, 
  TrendingUp,
  Zap,
  Rocket,
  Calendar,
  Target,
  ArrowUpRight,
  Clock,
  ChevronLeft,
  FileEdit,
  Radio,
  ListChecks,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer
} from "recharts";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { cn } from "../../lib/utils";
import { SEO } from "../../components/SEO";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

// --- Types & Components ---
import { KPICard, KPICardProps } from "./components/KPICard";
import { ContentTypeCard } from "./components/ContentTypeCard";
import { SectionHeader } from "./components/SectionHeader";
import { WorkflowIntelligenceDock } from "./components/WorkflowIntelligenceDock";
import { PwaInstallPrompt } from "../../components/PwaInstallPrompt";

import { EmptyState } from "../../components/common/EmptyState";
import { cssAspectRatio, parseAspectRatio } from "../../components/JustifiedGallery";
import { SocialPlatformIcon } from "../../components/social/SocialPlatformIcon";
import { resolveItemAspectRatio } from "../ContentLibrary/lib/aspectRatio";
import { buildContentSocialInsight, type SocialDistributionRow } from "../../lib/contentSocialInsight";
import {
  analyticsApi,
  coachApi,
  contentApi,
  extractValidImageUrl,
  feedApi,
  socialApi,
  type ContentDto,
  type DashboardMetricsDto,
  type FeedItemDto,
  type SocialPlatform,
} from "../../services/apiClient";
import { AuthenticatedImage } from "../../components/AuthenticatedImage";
import { useAppSelector } from "../../store/hooks";
import { selectAuthProfile } from "../../store/slices/authSlice";
import { CreatorNicheTags } from "../../components/CreatorNicheTags";
import { onboardingSnapshotFromProfile } from "../../lib/onboardingSnapshot";
import { connectedMapFromAccounts } from "../../lib/socialConnect";
import {
  beginOnboardingRevision,
  beginWeekPlanRenewal,
  buildPlanDayPrompt,
  buildStudioHrefForPlanDay,
  planDayCtaLabel,
  weekPlanFromProfile,
} from "../../lib/weekPlan";
import {
  buildPlanWorkflowSuggestions,
  buildWeekGoalsPayload,
  evaluatePlanDays,
  mergeWorkflowSuggestions,
  type PlanWorkflowSuggestion,
} from "../../lib/weekPlanWorkflow";
import { contentKindLabel, resolveContentKind } from "../../lib/contentKind";
import { resolveLibraryTitle } from "../ContentLibrary/lib/title";

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function isPublishedOnFeed(item: ContentDto): boolean {
  const s = (item.status || "").toLowerCase();
  return s === "published" || s === "approved";
}

function isWithinLastDays(iso: string | undefined | null, days: number): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return false;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return d.getTime() >= cutoff;
}

function formatPublishedStamp(iso?: string | null, locale?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(locale || undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    hour: "numeric",
    minute: "2-digit",
  });
}

const WORKFLOW_DOCK_OPEN_KEY = "nxclip.workflowDockOpen";

function readWorkflowDockOpen(): boolean {
  try {
    const raw = sessionStorage.getItem(WORKFLOW_DOCK_OPEN_KEY);
    if (raw === "0") return false;
    if (raw === "1") return true;
  } catch {
    /* ignore */
  }
  return true;
}

function writeWorkflowDockOpen(open: boolean) {
  try {
    sessionStorage.setItem(WORKFLOW_DOCK_OPEN_KEY, open ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function resolveThumb(item: ContentDto): string {
  // Prefer authenticated media route (same path Feed/Library use via gateway proxy).
  // extractValidImageUrl applies revision bust so refine updates the thumb.
  if (item.id) {
    return (
      extractValidImageUrl({
        ...item,
        thumbnailUrl: `/content/${item.id}/media`,
        cdnUrl: `/content/${item.id}/media`,
      }) || `/content/${item.id}/media`
    );
  }
  const direct = extractValidImageUrl(item);
  if (
    direct &&
    (direct.startsWith("http://") ||
      direct.startsWith("https://") ||
      direct.startsWith("/content/") ||
      direct.includes("/content/"))
  ) {
    return direct;
  }
  return "";
}

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const [loading, setLoading] = useState(true);
  const [activePlatform, setActivePlatform] = useState("all");
  const [dateRange, setDateRange] = useState("7d");
  const [hasContent, setHasContent] = useState<boolean | null>(null);
  const [mine, setMine] = useState<ContentDto[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetricsDto | null>(null);
  const [strategyTip, setStrategyTip] = useState<string | null>(null);
  const [strategyTipProvider, setStrategyTipProvider] = useState<string | null>(null);
  const [strategyTipLoading, setStrategyTipLoading] = useState(false);
  const [workflowSuggestions, setWorkflowSuggestions] = useState<PlanWorkflowSuggestion[]>([]);
  const [connectedSocials, setConnectedSocials] = useState<
    Partial<Record<SocialPlatform, boolean>>
  >({});
  const [feedByContentId, setFeedByContentId] = useState<Map<string, FeedItemDto>>(() => new Map());
  const [distributionsByContentId, setDistributionsByContentId] = useState<
    Map<string, SocialDistributionRow[]>
  >(() => new Map());
  const [workflowProvider, setWorkflowProvider] = useState<string | null>(null);
  const [workflowEvaluated, setWorkflowEvaluated] = useState(0);
  const [workflowCacheHits, setWorkflowCacheHits] = useState(0);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [workflowDockOpen, setWorkflowDockOpen] = useState(readWorkflowDockOpen);
  const navigate = useNavigate();
  const authProfile = useAppSelector(selectAuthProfile);
  const weekPlan = useMemo(() => weekPlanFromProfile(authProfile), [authProfile]);
  const setWorkflowDockOpenPersist = useCallback((open: boolean) => {
    setWorkflowDockOpen(open);
    writeWorkflowDockOpen(open);
  }, []);
  const onboarding = onboardingSnapshotFromProfile(authProfile);
  const isLegacyOnboarding = Boolean(
    onboarding?.isLegacy || (weekPlan && (!onboarding?.categoryLabel && !(onboarding?.niches?.length))),
  );

  const planDayStatuses = useMemo(() => {
    if (!weekPlan || !authProfile?.uid) return [];
    return evaluatePlanDays(weekPlan, mine, authProfile.uid);
  }, [weekPlan, mine, authProfile?.uid]);

  const planWorkflowSuggestions = useMemo(() => {
    if (!weekPlan || !authProfile?.uid) return [];
    const raw = String(authProfile.plan || "free").toUpperCase();
    const userPlan: "FREE" | "PRO" | "STUDIO" =
      raw === "PRO" || raw === "STUDIO" ? raw : "FREE";
    return buildPlanWorkflowSuggestions(weekPlan, mine, authProfile.uid, {
      categoryLabel: onboarding?.categoryLabel,
      niches: onboarding?.niches,
      userPlan,
    });
  }, [weekPlan, mine, authProfile?.uid, authProfile?.plan, onboarding?.categoryLabel, onboarding?.niches]);

  const displayWorkflowSuggestions = useMemo(
    () => mergeWorkflowSuggestions(planWorkflowSuggestions, workflowSuggestions, 12),
    [planWorkflowSuggestions, workflowSuggestions],
  );

  const hasConnectedSocial = useMemo(() => {
    if (Object.values(connectedSocials).some(Boolean)) return true;
    const profileSocials = authProfile?.connectedSocials || {};
    return Object.values(profileSocials).some(Boolean);
  }, [connectedSocials, authProfile?.connectedSocials]);

  const connectedPlatforms = useMemo(
    () =>
      (Object.entries(connectedSocials) as [SocialPlatform, boolean][])
        .filter(([, on]) => !!on)
        .map(([platform]) => platform),
    [connectedSocials],
  );

  const resolveSocialInsight = useCallback(
    (contentId: string) =>
      buildContentSocialInsight({
        platformStats: feedByContentId.get(contentId)?.platformStats,
        distributions: distributionsByContentId.get(contentId),
        socialRollup: feedByContentId.get(contentId)?.socialRollup,
        connectedPlatforms,
      }),
    [feedByContentId, distributionsByContentId, connectedPlatforms],
  );

  const isLiveContent = useCallback(
    (item: ContentDto) => resolveSocialInsight(item.id).displayStatus === "live",
    [resolveSocialInsight],
  );

  const handleReviseOnboarding = useCallback(() => {
    beginOnboardingRevision();
    navigate("/onboarding", {
      state: { renewWeekPlan: true, reviseOnboarding: true },
    });
  }, [navigate]);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [items, summary, accounts, feedRes] = await Promise.all([
          contentApi.getUserContentList(80),
          analyticsApi.fetchSummaryMetrics().catch(() => null),
          socialApi.listAccounts().catch(() => []),
          feedApi.fetchPersonalFeed(undefined, 80).catch(() => ({ items: [] as FeedItemDto[] })),
        ]);
        const cleaned = (items || []).filter((i) => {
          const s = (i.status || "").toLowerCase();
          return s !== "deleted" && s !== "archived";
        });
        const feedMap = new Map<string, FeedItemDto>();
        for (const feedItem of feedRes?.items ?? []) {
          if (feedItem.contentId) feedMap.set(feedItem.contentId, feedItem);
        }
        setFeedByContentId(feedMap);
        setDistributionsByContentId(new Map());
        setMine(cleaned);
        setHasContent(cleaned.length > 0);
        setMetrics(summary);
        setConnectedSocials(connectedMapFromAccounts(accounts || []));
      } catch (err) {
        console.error("Failed to load dashboard:", err);
        setHasContent(false);
      } finally {
        setLoading(false);
      }
    }
    void loadDashboard();
  }, []);

  useEffect(() => {
    if (!mine.length) return;
    const topIds = [...mine]
      .filter((i) => isPublishedOnFeed(i))
      .sort((a, b) => (b.views || b.likes || 0) - (a.views || a.likes || 0))
      .slice(0, 4)
      .map((i) => i.id);
    if (!topIds.length) return;

    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        topIds.map(async (contentId) => {
          try {
            const res = await socialApi.getDistributions(contentId);
            return [contentId, (res?.items ?? []) as SocialDistributionRow[]] as const;
          } catch {
            return [contentId, [] as SocialDistributionRow[]] as const;
          }
        }),
      );
      if (cancelled) return;
      setDistributionsByContentId(new Map(entries));
    })();

    return () => {
      cancelled = true;
    };
  }, [mine]);

  const pipeline = useMemo(() => {
    const draft = mine.filter((i) => {
      const s = (i.status || "").toLowerCase();
      return s === "draft" || s === "processing" || s === "generation_failed" || s === "moderation_rejected";
    }).length;
    const published = mine.filter((i) => {
      const s = (i.status || "").toLowerCase();
      return s === "published" || s === "approved";
    }).length;
    const live = mine.filter((i) => isLiveContent(i)).length;
    const scheduled = mine.filter((i) => resolveSocialInsight(i.id).displayStatus === "scheduled").length;
    return { draft, published, live, scheduled };
  }, [mine, isLiveContent, resolveSocialInsight]);

  const loadStrategyTip = useCallback(async () => {
    setStrategyTipLoading(true);
    try {
      const connected = Object.entries(connectedSocials)
        .filter(([, on]) => !!on)
        .map(([platform]) => platform);
      const niches =
        authProfile?.creatorNiches?.length
          ? authProfile.creatorNiches
          : authProfile?.gameNiches?.length
            ? authProfile.gameNiches
            : authProfile?.games || [];

      const res = await coachApi.getStrategyTip({
        drafts: pipeline.draft,
        published: pipeline.published,
        live: pipeline.live,
        scheduled: pipeline.scheduled,
        niches,
        creatorCategory:
          authProfile?.creatorCategoryLabel || authProfile?.creatorCategory || undefined,
        hasWeekPlan: !!weekPlan,
        connectedSocials: connected,
        language: i18n.language,
      });
      setStrategyTip(res.tip);
      setStrategyTipProvider(res.provider);
    } catch (err) {
      console.warn("Strategy tip unavailable:", err);
      setStrategyTip(t("dashboard.tip.content"));
      setStrategyTipProvider(null);
    } finally {
      setStrategyTipLoading(false);
    }
  }, [
    connectedSocials,
    authProfile?.creatorCategory,
    authProfile?.creatorCategoryLabel,
    authProfile?.creatorNiches,
    authProfile?.gameNiches,
    authProfile?.games,
    i18n.language,
    pipeline.draft,
    pipeline.live,
    pipeline.published,
    pipeline.scheduled,
    t,
    weekPlan,
  ]);

  const loadStrategyTipRef = useRef(loadStrategyTip);
  loadStrategyTipRef.current = loadStrategyTip;

  useEffect(() => {
    if (loading) return;
    void loadStrategyTipRef.current();
  }, [loading, authProfile?.uid, i18n.language]);

  const loadWorkflowIntelligence = useCallback(async () => {
    setWorkflowLoading(true);
    try {
      const niches =
        authProfile?.creatorNiches?.length
          ? authProfile.creatorNiches
          : authProfile?.gameNiches?.length
            ? authProfile.gameNiches
            : authProfile?.games || [];
      const weekGoals =
        weekPlan && authProfile?.uid
          ? buildWeekGoalsPayload(weekPlan, mine, authProfile.uid)
          : undefined;
      const res = await contentApi.getWorkflowIntelligence({
        niches,
        creatorCategory:
          authProfile?.creatorCategoryLabel || authProfile?.creatorCategory || undefined,
        language: i18n.language,
        limit: 12,
        weekGoals,
      });
      setWorkflowSuggestions(
        (res.suggestions || []).map((s) => ({
          ...s,
          source: "asset" as const,
        })),
      );
      setWorkflowProvider(res.provider || null);
      setWorkflowEvaluated(res.evaluatedCount ?? 0);
      setWorkflowCacheHits(res.cacheHits ?? 0);
    } catch (err) {
      console.warn("Workflow intelligence unavailable:", err);
      setWorkflowSuggestions([]);
      setWorkflowProvider(null);
      setWorkflowEvaluated(0);
      setWorkflowCacheHits(0);
    } finally {
      setWorkflowLoading(false);
    }
  }, [
    authProfile?.creatorCategory,
    authProfile?.creatorCategoryLabel,
    authProfile?.creatorNiches,
    authProfile?.gameNiches,
    authProfile?.games,
    authProfile?.uid,
    i18n.language,
    mine,
    weekPlan,
  ]);

  const loadWorkflowIntelligenceRef = useRef(loadWorkflowIntelligence);
  loadWorkflowIntelligenceRef.current = loadWorkflowIntelligence;

  useEffect(() => {
    if (loading) return;
    void loadWorkflowIntelligenceRef.current();
  }, [loading, authProfile?.uid, i18n.language]);

  const attentionItems = useMemo(() => {
    const items: { id: string; issue: string; action: string; impact: string; cta: string; path: string }[] = [];
    const failed = mine.filter((i) => {
      const s = (i.status || "").toLowerCase();
      return s.includes("fail") || s.includes("reject");
    });
    failed.slice(0, 2).forEach((i) => {
      const isClip = resolveContentKind(i) === "clip";
      const noMedia = !i.storageKey;
      items.push({
        id: i.id,
        issue: resolveLibraryTitle(i, "Generation issue"),
        action: isClip && noMedia ? "Retry animation" : "Retry or edit in Studio",
        impact: "High",
        cta: "Fix",
        path: isClip
          ? `/create/clip/${i.id}/edit?step=polish&retryAnimate=${noMedia ? "1" : "0"}`
          : "/create/image",
      });
    });
    const drafts = mine.filter((i) => (i.status || "").toLowerCase() === "draft");
    drafts.slice(0, 2).forEach((i) => {
      const isClip = resolveContentKind(i) === "clip";
      items.push({
        id: `draft-${i.id}`,
        issue: resolveLibraryTitle(i, "Unfinished draft"),
        action: isClip ? "Polish in Clip Studio" : "Resume and publish",
        impact: "Medium",
        cta: isClip ? "Polish" : "Resume",
        path: isClip ? `/create/clip/${i.id}/edit?step=polish` : "/create",
      });
    });
    const socials = authProfile?.connectedSocials || {};
    const connected =
      hasConnectedSocial ||
      Object.values(socials).some(Boolean);
    if (!connected) {
      items.push({
        id: "connect-social",
        issue: "Social accounts not connected",
        action: "Connect to go Live on platforms",
        impact: "High",
        cta: "Connect",
        path: "/profile?focus=social#profile-social-channels",
      });
    }
    return items.slice(0, 4);
  }, [mine, hasConnectedSocial, authProfile?.connectedSocials]);

  const topContent = useMemo(() => {
    return [...mine]
      .filter((i) => isPublishedOnFeed(i))
      .sort((a, b) => (b.views || b.likes || 0) - (a.views || a.likes || 0))
      .slice(0, 4)
      .map((i) => {
        const insight = resolveSocialInsight(i.id);
        const aspect = resolveItemAspectRatio(i);
        const stampSource = i.publishedAt || i.createdAt;
        return {
          id: i.id,
          title: resolveLibraryTitle(i),
          thumbnail: resolveThumb(i),
          status: insight.displayLabel,
          displayStatus: insight.displayStatus,
          livePlatforms: insight.livePlatforms,
          contentType: contentKindLabel(resolveContentKind(i)),
          aspectRatio: parseAspectRatio(aspect),
          aspectCss: cssAspectRatio(aspect),
          publishedStamp: formatPublishedStamp(stampSource, i18n.language),
          statusLine: insight.statusLine,
          actionLine: insight.actionLine,
          actionCta: insight.actionCta,
        };
      });
  }, [mine, i18n.language, resolveSocialInsight]);

  const DASHBOARD_KPIS: KPICardProps[] = useMemo(() => {
    const views = metrics?.views ?? mine.reduce((a, i) => a + (i.views || 0), 0);
    const published = pipeline.published;
    const live = pipeline.live;
    const attention = attentionItems.length;
    const followers = metrics?.followers ?? 0;
    return [
      {
        label: t('dashboard.kpis.growth'),
        value: formatCompact(views),
        trend: "neutral",
        status: views > 0 ? "Views" : t('dashboard.kpis.healthy'),
        icon: TrendingUp,
      },
      {
        label: t('dashboard.kpis.published'),
        value: String(published),
        trend: "neutral",
        status: `${live} Live`,
        icon: Calendar,
      },
      {
        label: t('dashboard.kpis.top_platform'),
        value: live > 0 ? "Social" : published > 0 ? "Feed" : "-",
        trend: "neutral",
        status: t('dashboard.kpis.viral'),
        icon: Zap,
      },
      {
        label: t('dashboard.kpis.attention'),
        value: `${attention} ${t('dashboard.kpis.items')}`,
        trend: attention > 0 ? "down" : "neutral",
        status: t('dashboard.kpis.action'),
        icon: Target,
      },
      {
        label: t('dashboard.kpis.opportunity'),
        value: followers > 0 ? formatCompact(followers) : weekPlan ? "Plan" : "-",
        trend: "neutral",
        status: followers > 0 ? "Followers" : t('dashboard.kpis.high'),
        icon: Rocket,
      },
    ];
  }, [metrics, mine, pipeline, attentionItems.length, weekPlan, t]);

  const CONTENT_PERFORMANCE = useMemo(() => {
    const types = ["clip", "meme", "image"] as const;
    return types.map((type) => {
      const subset = mine.filter((i) => resolveContentKind(i) === type);
      const publishedItems = subset.filter((i) => isPublishedOnFeed(i));
      const likes = subset.reduce((a, i) => a + (i.likes || 0), 0);
      const top = [...publishedItems, ...subset].sort(
        (a, b) => (b.views || b.likes || 0) - (a.views || a.likes || 0),
      )[0];
      const topLive = top ? isLiveContent(top) : false;
      return {
        type:
          type === "clip"
            ? t("dashboard.content_matrix.clips")
            : type === "meme"
              ? t("dashboard.content_matrix.memes")
              : "Images",
        typeKey: type,
        totalCount: subset.length,
        published: publishedItems.length,
        engagement: likes > 0 ? `${likes}` : "—",
        platform: topLive ? "Live" : publishedItems.length > 0 ? "Feed" : "—",
        topPost: top ? resolveLibraryTitle(top) : "Nothing in this format yet",
        topPostId: top?.id,
      };
    });
  }, [mine, t, isLiveContent]);

  const TOP_CONTENT = topContent;
  const ATTENTION_ITEMS = attentionItems;

  const PULSE_DATA = useMemo(() => {
    const publishedThisWeek = mine.filter((i) => {
      if (!isPublishedOnFeed(i)) return false;
      return isWithinLastDays(i.publishedAt || i.createdAt, 7);
    }).length;

    const planDays = weekPlan?.days?.length ?? 0;
    const planDaysDone = planDayStatuses.filter((d) => d.status === "done").length;
    const planProgressValue =
      planDays > 0
        ? `${planDaysDone} / ${planDays}`
        : t("dashboard.pulse.no_plan");
    const planHint =
      planDays > 0
        ? planDaysDone >= planDays
          ? t("dashboard.pulse.plan_done")
          : t("dashboard.pulse.plan_remaining", {
              count: Math.max(planDays - planDaysDone, 0),
            })
        : t("dashboard.pulse.plan_create_hint");

    const readyToGoLive = mine.filter(
      (i) => isPublishedOnFeed(i) && !isLiveContent(i),
    ).length;

    const draftsWaiting = mine.filter(
      (i) => (i.status || "").toLowerCase() === "draft",
    ).length;

    return [
      {
        id: "published-week",
        label: t("dashboard.pulse.published_week"),
        value: String(publishedThisWeek),
        hint:
          publishedThisWeek > 0
            ? t("dashboard.pulse.published_hint")
            : t("dashboard.pulse.published_empty"),
        icon: Calendar,
        path: "/my-content?status=published",
      },
      {
        id: "plan-progress",
        label: t("dashboard.pulse.plan_progress"),
        value: planProgressValue,
        hint: planHint,
        icon: ListChecks,
        path: weekPlan ? "/profile?tab=plan" : "/onboarding",
        onClick: weekPlan
          ? undefined
          : () => {
              beginWeekPlanRenewal();
              navigate("/onboarding", { state: { renewWeekPlan: true } });
            },
      },
      {
        id: "ready-live",
        label: t("dashboard.pulse.ready_live"),
        value: String(readyToGoLive),
        hint:
          readyToGoLive > 0
            ? t("dashboard.pulse.ready_live_hint")
            : t("dashboard.pulse.ready_live_empty"),
        icon: Radio,
        path: "/feed",
      },
      {
        id: "drafts",
        label: t("dashboard.pulse.drafts_waiting"),
        value: String(draftsWaiting),
        hint:
          draftsWaiting > 0
            ? t("dashboard.pulse.drafts_hint")
            : t("dashboard.pulse.drafts_empty"),
        icon: FileEdit,
        path: "/create",
      },
    ];
  }, [t, mine, weekPlan, planDayStatuses, navigate, isLiveContent]);

  const chartData = useMemo(() => {
    const days = [
      t("dashboard.days.mon"),
      t("dashboard.days.tue"),
      t("dashboard.days.wed"),
      t("dashboard.days.thu"),
      t("dashboard.days.fri"),
      t("dashboard.days.sat"),
      t("dashboard.days.sun"),
    ];
    const buckets = Array(7).fill(0) as number[];
    mine.forEach((item) => {
      const d = new Date(item.publishedAt || item.createdAt || 0);
      if (isNaN(d.getTime())) return;
      const idx = (d.getDay() + 6) % 7; // Mon=0
      buckets[idx] += 1;
    });
    return days.map((name, i) => ({ name, posts: buckets[i] }));
  }, [t, mine]);

  const chartHasSignal = useMemo(
    () => chartData.some((d) => d.posts > 0),
    [chartData],
  );

  const handlePostCreated = useCallback((post: { content: string; media: string | null; mediaType: "image" | "video" | null; tags: string[]; }) => {
    console.log("Post created:", post);
    setHasContent(true);
  }, []);

  if (loading && hasContent === null) {
    return <DashboardSkeleton />;
  }

  if (hasContent === false) {
    const emptyWorkflow = mergeWorkflowSuggestions(planWorkflowSuggestions, workflowSuggestions, 12);
    return (
      <div className="py-20">
        <EmptyState
          variant="generic"
          title={t('dashboard.empty_state.title', { defaultValue: 'Welcome to nxclip.app' })}
          description={t('dashboard.empty_state.desc', { defaultValue: 'Your dashboard is ready. Start creating content to see your performance metrics and AI insights.' })}
          actionLabel={t('dashboard.empty_state.cta', { defaultValue: 'Create First Creation' })}
          onAction={() => {
            const next = planDayStatuses.find((s) => s.status === "pending");
            if (next) {
              navigate(
                buildStudioHrefForPlanDay(
                  next.day,
                  onboarding?.categoryLabel,
                  onboarding?.niches,
                ),
              );
              return;
            }
            navigate('/create/image');
          }}
          className="max-w-2xl mx-auto"
        />
        <WorkflowIntelligenceDock
          open={workflowDockOpen}
          onOpenChange={setWorkflowDockOpenPersist}
          suggestions={emptyWorkflow}
          loading={workflowLoading}
          provider={workflowProvider}
          evaluatedCount={workflowEvaluated}
          cacheHits={workflowCacheHits}
          onRefresh={() => void loadWorkflowIntelligence()}
        />
      </div>
    );
  }

  return (
    <div className="ui-dashboard-page">
      <SEO 
        title="Creator Dashboard | NexaClip.ai"
        description="Monitor your gaming content performance, viral reach, and AI-powered creator insights."
      />
      {/* --- Page Header --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground tracking-tight">{t('dashboard.header.title')}</h1>
            <p className="text-sm font-medium text-muted-foreground">
              {t('dashboard.header.subtitle')}
            </p>
            {onboarding || weekPlan ? (
              <div className="pt-1.5 space-y-2">
                <CreatorNicheTags
                  categoryLabel={onboarding?.categoryLabel}
                  niches={onboarding?.niches || []}
                  size="md"
                  emptyLabel={t("dashboard.header.niche_not_set")}
                />
                {isLegacyOnboarding || !onboarding?.categoryLabel ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
                      {t("dashboard.header.legacy_onboarding_note")}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] font-bold shrink-0"
                      onClick={handleReviseOnboarding}
                    >
                      {t("dashboard.header.revise_cta")}
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
             <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[80px] h-9 text-xs font-semibold bg-card border-border">
                  <SelectValue placeholder="7D" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7D</SelectItem>
                  <SelectItem value="30d">30D</SelectItem>
                  <SelectItem value="90d">90D</SelectItem>
                </SelectContent>
             </Select>

              <Select value={activePlatform} onValueChange={setActivePlatform}>
                <SelectTrigger className="w-[120px] h-9 text-xs font-semibold bg-card border-border">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all_platforms')}</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                </SelectContent>
             </Select>

             <CreatePostDialog onPost={handlePostCreated} />
          </div>
        </div>

        <PwaInstallPrompt variant="banner" allowManual className="mb-6 mt-2" />

        {/* --- KPI Row --- */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {DASHBOARD_KPIS.map((kpi) => (
            <KPICard key={kpi.label} {...kpi} />
          ))}
        </div>

        {/* --- Main Grid: ~70% main / ~30% sidebar --- */}
        <div className="ui-dashboard-grid-ops">
           {/* Left: chart → by format → published this week */}
           <div className="min-w-0 space-y-6 md:space-y-8">
              <Card className="p-6 md:p-8 bg-card border-border shadow-soft">
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                      <SectionHeader
                        title={t('dashboard.performance.title')}
                        subtitle="Posts created by weekday — how active your pipeline was this week."
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                       <Button onClick={() => navigate("/analytics")} variant="outline" size="sm" className="h-9 text-xs font-semibold">
                        {t('dashboard.performance.full_analytics')} 
                        {isAr ? <ChevronLeft size={12} className="me-1" /> : <ArrowUpRight size={12} className="ms-1" />}
                      </Button>
                    </div>
                 </div>

                 <div className="flex items-center gap-2 mb-4">
                   <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                     <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                     Posts / day
                   </span>
                   <span className="text-xs text-muted-foreground font-medium">
                     · Based on your content create / publish dates
                   </span>
                 </div>

                 <div className="h-[280px] w-full relative" dir="ltr">
                    {!chartHasSignal && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-muted/40 border border-dashed border-border">
                        <p className="text-sm font-medium text-muted-foreground px-6 text-center">
                          No weekday activity yet — create or publish content to see this chart fill in.
                        </p>
                      </div>
                    )}
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="snapGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.45} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--foreground)", fontWeight: 600 }} dy={10} reversed={isAr} />
                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)", fontWeight: 600 }} orientation={isAr ? "right" : "left"} />
                        <RechartsTooltip 
                           contentStyle={{ backgroundColor: "var(--popover)", borderColor: "var(--border)", borderRadius: "8px", fontSize: "13px", fontWeight: 600 }}
                           itemStyle={{ color: "var(--foreground)" }}
                           formatter={(value: number) => [`${value} post${value === 1 ? "" : "s"}`, "Activity"]}
                        />
                        <Area type="monotone" dataKey="posts" name="Posts" stroke="var(--primary)" strokeWidth={3} fill="url(#snapGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                 </div>
              </Card>

              {/* By format */}
              <div>
                <SectionHeader
                  title="By format"
                  subtitle="Counts of clips, memes, and images. Tap a count to open Library filtered to that format (drafts, published, and everything else)."
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                   {CONTENT_PERFORMANCE.map((item) => (
                     <ContentTypeCard key={item.type} post={item} />
                   ))}
                </div>
              </div>

              {/* Published this week — under By format, 4 compact tiles */}
              <div>
                <SectionHeader
                  title="Published this week"
                  subtitle="Thumbnail plus title, status, and next step — text stays below the media so nothing overlaps your content."
                />
                <div className="pt-2">
                  {TOP_CONTENT.length === 0 ? (
                    <Card className="p-6 border-dashed text-center">
                      <p className="text-sm font-medium text-muted-foreground">
                        No published posts yet — publish from Studio or Feed to populate this week’s top content.
                      </p>
                      <Button className="mt-3" size="sm" onClick={() => navigate("/create")}>
                        Open Creator Hub
                      </Button>
                    </Card>
                  ) : (
                    <div className="ui-dashboard-top-content-grid pt-0.5">
                      {TOP_CONTENT.map((content) => (
                      <Card
                        key={content.id}
                        className="ui-top-content-card group flex flex-col overflow-hidden !p-2.5 min-w-0 bg-card h-full"
                      >
                        <div
                          className="relative w-full rounded-lg overflow-hidden bg-muted shrink-0 isolate aspect-[4/5]"
                          style={content.aspectCss ? { aspectRatio: content.aspectCss } : undefined}
                        >
                          {content.thumbnail ? (
                            <AuthenticatedImage
                              key={content.thumbnail}
                              src={content.thumbnail}
                              alt=""
                              disableRemoteFallback
                              priority
                              placeholderAspectRatio={content.aspectCss}
                              loadTimeoutMs={15000}
                              className="!absolute inset-0 !h-full !w-full !max-w-none !object-cover"
                              wrapperClassName="!absolute inset-0 !h-full !w-full min-h-full"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40">
                              <Sparkles size={18} />
                            </div>
                          )}

                          <div className="absolute inset-0 z-10 bg-black/0 group-hover:bg-black/45 transition-colors pointer-events-none" />

                          <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-8 text-[11px] font-semibold rounded-md shadow-xl px-3"
                              onClick={() => navigate(`/feed/post/${content.id}`)}
                            >
                              {isAr ? <ChevronLeft size={12} className="me-0.5" /> : <ArrowUpRight size={12} className="ms-0.5" />} {t("dashboard.top_content.view_details")}
                            </Button>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 pt-2.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1 min-w-0">
                            <Badge
                              className={cn(
                                "h-5 px-1.5 text-[10px] font-semibold border leading-none inline-flex items-center gap-1 shrink-0",
                                content.displayStatus === "live"
                                  ? "bg-rose-500 text-white border-rose-400/40"
                                  : content.displayStatus === "scheduled"
                                    ? "bg-amber-500 text-white border-amber-400/40"
                                    : content.displayStatus === "publishing"
                                      ? "bg-sky-600 text-white border-sky-400/40"
                                      : content.displayStatus === "failed"
                                        ? "bg-orange-600 text-white border-orange-400/40"
                                        : "bg-emerald-600 text-white border-emerald-400/40",
                              )}
                            >
                              {content.displayStatus === "live" ? (
                                <Radio size={9} className="animate-pulse" />
                              ) : null}
                              {content.status}
                            </Badge>
                            {content.livePlatforms.map((platform) => (
                              <SocialPlatformIcon
                                key={platform}
                                platform={platform}
                                className="h-4 w-4 shrink-0 opacity-90"
                              />
                            ))}
                            <Badge className="h-5 px-1.5 text-[10px] font-semibold border-none bg-primary/15 text-primary leading-none shrink-0">
                              {content.contentType}
                            </Badge>
                          </div>

                          <h4 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 break-words">
                            {content.title}
                          </h4>

                          {content.publishedStamp ? (
                            <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1 min-w-0">
                              <Clock size={10} className="shrink-0 opacity-80" />
                              <span className="truncate">{content.publishedStamp}</span>
                            </p>
                          ) : null}

                          <div className="p-2 rounded-md bg-primary/5 border border-primary/20 min-w-0">
                            <p className="text-[10px] font-semibold text-primary mb-0.5">Social status</p>
                            <p className="text-[11px] font-medium text-foreground leading-snug line-clamp-2 break-words">
                              {content.statusLine}
                            </p>
                            {content.actionLine ? (
                              <p className="text-[10px] font-medium text-muted-foreground leading-snug line-clamp-2 break-words mt-1">
                                {content.actionLine}
                              </p>
                            ) : null}
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full h-7 text-[11px] font-semibold text-primary hover:text-primary hover:bg-primary/5 mt-auto"
                            onClick={() => navigate(`/feed/post/${content.id}`)}
                          >
                            {content.actionCta} <ArrowUpRight size={11} className="ms-0.5" />
                          </Button>
                        </div>
                      </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
           </div>

           {/* Right column ~30% */}
           <div className="min-w-0 space-y-4 md:space-y-5">
              <Card className="p-4 border border-primary/25 bg-primary text-primary-foreground shadow-xl shadow-primary/20 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-500">
                    <BrainCircuit size={72} />
                 </div>
                 <div className="relative space-y-4">
                    <div>
                       <div className="flex items-center gap-2 mb-1.5">
                          <Badge className="bg-primary-foreground/20 text-primary-foreground text-[10px] h-5 font-semibold border-none">{t('dashboard.command.title')}</Badge>
                       </div>
                       <h3 className="text-base font-display font-bold leading-snug">{t('dashboard.command.insight')}</h3>
                    </div>
                    <div className="space-y-2">
                       <p className="text-[10px] font-semibold opacity-80">{t('dashboard.command.next_best')}</p>
                       <div className="space-y-1.5">
                          {(t('dashboard.command.actions', { returnObjects: true }) as string[]).map((action, i) => (
                             <div key={i} className="flex items-start gap-2 text-xs font-semibold leading-snug">
                                <span className="h-4 w-4 rounded-full bg-primary-foreground/20 flex items-center justify-center text-[10px] shrink-0">{i+1}</span>
                                <span>{action}</span>
                             </div>
                          ))}
                       </div>
                    </div>
                    <Button
                      className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold h-9 text-xs rounded-md"
                      onClick={() => navigate("/create")}
                    >
                       {t('dashboard.command.cta')} <Rocket size={12} className="ms-1.5" />
                    </Button>
                 </div>
              </Card>

              <div className="ui-sidebar-panel border-l-4 border-l-teal-500">
                 <div className="flex items-center justify-between gap-2">
                    <SectionHeader title={t('dashboard.progress.title')} />
                    {weekPlan ? (
                      <Badge className="bg-teal-500/15 text-teal-700 dark:text-teal-300 border-none text-xs font-semibold h-5">
                        {t("dashboard.progress.days_badge", { count: weekPlan.days.length })}
                      </Badge>
                    ) : (
                      <Badge className="bg-muted text-foreground/80 border-none text-xs font-semibold h-5">
                        {t("dashboard.progress.no_plan_badge")}
                      </Badge>
                    )}
                 </div>
                 <div className="space-y-3 pt-1">
                    {weekPlan ? (
                      <>
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                          {weekPlan.introMessage || t("dashboard.progress.intro_fallback")}
                        </p>
                        <div className="space-y-2 max-h-[280px] overflow-y-auto pe-1">
                          {weekPlan.days.map((day) => {
                            const status = planDayStatuses.find(
                              (s) => s.day.day === day.day,
                            );
                            const done = status?.status === "done";
                            const planSuggestion = planWorkflowSuggestions.find(
                              (s) => s.planDay === day.day && s.action !== "renew_plan",
                            );
                            const href =
                              planSuggestion?.href ||
                              buildStudioHrefForPlanDay(
                                day,
                                onboarding?.categoryLabel,
                                onboarding?.niches,
                              );
                            const cta =
                              planSuggestion?.ctaLabel ||
                              planDayCtaLabel(day, {
                                userPlan: String(authProfile?.plan || "free").toUpperCase(),
                              });
                            const showCta = !done || !!planSuggestion;
                            return (
                              <div
                                key={day.day}
                                className={cn(
                                  "p-3 rounded-md border",
                                  done && !planSuggestion
                                    ? "bg-muted/30 border-border/60 opacity-80"
                                    : "bg-muted/40 border-border hover:border-teal-500/35 transition-colors",
                                )}
                              >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="text-xs font-semibold uppercase text-teal-700 dark:text-teal-300">
                                    {day.day}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    {done ? (
                                      <Badge className="h-5 text-[10px] border-none bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                        Done
                                      </Badge>
                                    ) : null}
                                    <span className="text-xs font-medium text-muted-foreground">
                                      {day.contentType}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-sm font-semibold text-foreground line-clamp-1">
                                  {day.title || day.theme}
                                </p>
                                {showCta ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="mt-2 h-7 w-full text-[11px] font-semibold"
                                    onClick={() => navigate(href)}
                                  >
                                    {cta}
                                  </Button>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                        <div className="p-3 rounded-md bg-teal-500/5 border border-teal-500/20">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 mb-1">
                            {t("dashboard.progress.up_next")}
                          </p>
                          <p className="text-xs font-semibold text-foreground leading-snug">
                            {(() => {
                              const next = planDayStatuses.find((s) => s.status === "pending");
                              if (!next) {
                                return "All days generated — plan a new week for fresh themes.";
                              }
                              return `${next.day.day}: ${next.day.title || next.day.theme}`;
                            })()}
                          </p>
                        </div>
                        <Button onClick={() => navigate("/profile?tab=plan")} variant="outline" className="w-full h-9 text-xs font-semibold">
                          {t("dashboard.progress.view_full")}
                        </Button>
                        <Button
                          onClick={() => { beginWeekPlanRenewal(); navigate("/onboarding", { state: { renewWeekPlan: true } }); }}
                          variant="ghost"
                          className="w-full h-9 text-xs font-semibold text-muted-foreground"
                        >
                          {t("dashboard.progress.plan_new")}
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {t("dashboard.progress.empty")}
                        </p>
                        <div className="p-3 rounded-md bg-muted/40 border border-border">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                            {t("dashboard.progress.up_next")}
                          </p>
                          <p className="text-xs font-semibold text-foreground leading-snug">
                            {t("dashboard.progress.up_next_task")}
                          </p>
                        </div>
                        <Button
                          onClick={() => { beginWeekPlanRenewal(); navigate("/onboarding", { state: { renewWeekPlan: true } }); }}
                          className="w-full h-9 text-xs font-semibold"
                        >
                          {t("dashboard.progress.create_plan")}
                        </Button>
                      </>
                    )}
                 </div>
              </div>

              <div className="ui-sidebar-panel border-l-4 border-l-sky-500">
                <div className="flex items-center justify-between gap-2">
                  <SectionHeader title="Scheduled" />
                  <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-300 border-none text-xs font-semibold h-5">
                    Pipeline
                  </Badge>
                </div>
                <div className="space-y-3 pt-1">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Queue publish times for YouTube, Instagram, Facebook, and TikTok. After a post is Published on the feed, schedule it to go <span className="text-rose-600 dark:text-rose-400 font-semibold">Live</span> on social.
                  </p>
                  <div className="p-4 rounded-md bg-muted/40 border border-dashed border-border text-center space-y-2">
                    <Clock size={18} className="mx-auto text-muted-foreground" />
                    <p className="text-sm font-semibold text-muted-foreground">No scheduled posts yet</p>
                  </div>
                  <Button variant="outline" className="w-full h-9 text-xs font-semibold" onClick={() => navigate("/feed")}>
                    Manage posts on Feed
                  </Button>
                </div>
              </div>

              <div className="ui-sidebar-panel border-l-4 border-l-amber-500">
                 <SectionHeader title={t('dashboard.attention.title')} />
                 <div className="space-y-3 pt-1">
                {ATTENTION_ITEMS.map((item) => (
                  <div key={item.id} className="p-3.5 rounded-lg bg-amber-500/5 border border-amber-500/25 flex items-center justify-between gap-3">
                     <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                           <h5 className="text-sm font-semibold text-foreground line-clamp-1">{item.issue}</h5>
                           <Badge className={cn(
                             "text-[11px] h-5 px-1.5 border-none font-semibold",
                             item.impact === "High" ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                           )}>{item.impact}</Badge>
                        </div>
                        <p className="text-xs font-medium text-muted-foreground">{item.action}</p>
                     </div>
                     <Button
                       variant="outline"
                       size="sm"
                       className="h-8 text-xs font-semibold text-primary shrink-0"
                       onClick={() => navigate(item.path)}
                     >
                        {item.cta}
                     </Button>
                  </div>
                ))}
                {ATTENTION_ITEMS.length === 0 && (
                  <p className="text-sm text-muted-foreground font-medium py-2">
                    {t("dashboard.attention.clear")}
                  </p>
                )}
                 </div>
              </div>

              <div className="ui-sidebar-panel border-l-4 border-l-primary">
                 <SectionHeader
                   title={t("dashboard.pulse.title")}
                   subtitle={t("dashboard.pulse.subtitle")}
                 />
                 <div className="grid grid-cols-1 gap-2.5 pt-1">
                    {PULSE_DATA.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="ui-pulse-card flex items-center gap-3 w-full text-start hover:border-primary/40 hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => {
                            if (item.onClick) {
                              item.onClick();
                              return;
                            }
                            navigate(item.path);
                          }}
                        >
                           <div className="p-2 rounded-md bg-card border border-border text-primary shrink-0">
                              <item.icon size={16} />
                           </div>
                           <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-muted-foreground leading-none mb-1">{item.label}</p>
                              <p className="text-sm font-bold text-foreground">{item.value}</p>
                              <p className="text-[11px] font-medium text-muted-foreground mt-0.5 line-clamp-1">{item.hint}</p>
                           </div>
                           <ArrowUpRight size={14} className="text-muted-foreground shrink-0 opacity-60" />
                        </button>
                    ))}
                 </div>
              </div>

              <Card className="p-4 border border-amber-500/25 bg-amber-500/10 text-amber-900 dark:text-amber-100 rounded-xl">
                 <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Sparkles size={16} className="shrink-0" />
                      <p className="text-xs font-bold truncate">{t('dashboard.tip.title')}</p>
                    </div>
                    <button
                      type="button"
                      aria-label={t("dashboard.tip.refresh")}
                      disabled={strategyTipLoading}
                      onClick={() => void loadStrategyTip()}
                      className="h-7 w-7 rounded-md flex items-center justify-center text-amber-800/80 dark:text-amber-100/80 hover:bg-amber-500/15 disabled:opacity-50 shrink-0"
                    >
                      {strategyTipLoading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <RefreshCw size={14} />
                      )}
                    </button>
                 </div>
                 <p className="text-xs leading-relaxed font-medium min-h-[2.5rem]">
                    {strategyTipLoading && !strategyTip
                      ? t("dashboard.tip.loading")
                      : strategyTip || t("dashboard.tip.content")}
                 </p>
                 {strategyTipProvider && !strategyTipLoading ? (
                   <p className="text-[10px] font-medium opacity-60 mt-2 truncate">
                     {t("dashboard.tip.powered_by", {
                       provider: strategyTipProvider.replace(/^(anthropic|gemini|openai|mock)-/, ""),
                       defaultValue: `AI · ${strategyTipProvider}`,
                     })}
                   </p>
                 ) : null}
              </Card>
           </div>
        </div>

        <WorkflowIntelligenceDock
          open={workflowDockOpen}
          onOpenChange={setWorkflowDockOpenPersist}
          suggestions={displayWorkflowSuggestions}
          loading={workflowLoading}
          provider={workflowProvider}
          evaluatedCount={workflowEvaluated}
          cacheHits={workflowCacheHits}
          onRefresh={() => void loadWorkflowIntelligence()}
        />
      </div>
  );
}
