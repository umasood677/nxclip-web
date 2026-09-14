import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart3,
  Layers,
  Users,
  Image as ImageIcon,
  Clock,
  Gamepad2,
  Globe,
  Map,
  BrainCircuit,
  Download,
  Sparkles,
  ExternalLink,
  Eye,
} from "lucide-react";

import { Button } from "../../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

import { OverviewTab } from "./components/OverviewTab/OverviewTab";
import { ContentTab } from "./components/ContentTab/ContentTab";
import { PlatformsTab } from "./components/PlatformsTab/PlatformsTab";
import { AnalyticsSkeleton } from "./skeletons/AnalyticsSkeleton";
import { WorkspaceExportDialog } from "../../components/WorkspaceExportDialog";
import { EmptyState } from "../../components/common/EmptyState";
import { AuthenticatedImage } from "../../components/AuthenticatedImage";
import {
  analyticsApi,
  contentApi,
  extractValidImageUrl,
  socialApi,
  type AnalyticsTimeseriesPointDto,
  type ContentAnalyticsMetricDto,
  type ContentDto,
  type DashboardMetricsDto,
  type PlatformStatDto,
  type WeeklyReportDto,
} from "../../services/apiClient";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { cn } from "../../lib/utils";
import { dateRangeToDays, resolveContentLabel } from "./lib/socialMetrics";

const COMING_SOON_TABS = new Set([
  "creative",
  "geo-intel",
  "audience",
  "games",
  "retention",
  "ai",
]);

function ComingSoonPanel({ label, isAi }: { label: string; isAi?: boolean }) {
  return (
    <Card className="border-dashed border-border bg-muted/20">
      <CardContent className="py-16 flex flex-col items-center text-center gap-3">
        <Sparkles className="text-primary" size={28} />
        <h3 className="font-display text-lg font-bold text-foreground">{label}</h3>
        <p className="text-sm text-muted-foreground max-w-md font-medium">
          {isAi
            ? "AI Insights are not live yet — Overview shows coaching tips from your real metrics. Deeper LLM insights ship after MVP."
            : "Coming soon after MVP — Overview already shows your live summary metrics. Deeper breakdowns ship in the next cycle."}
        </p>
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const spotlightId = searchParams.get("contentId")?.trim() || "";
  const [platform, setPlatform] = useState("all");
  const [contentType, setContentType] = useState("all");
  const [dateRange, setDateRange] = useState("7d");
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [hasContent, setHasContent] = useState<boolean | null>(null);
  const [content, setContent] = useState<ContentDto[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetricsDto | null>(null);
  const [report, setReport] = useState<WeeklyReportDto | null>(null);
  const [timeseries, setTimeseries] = useState<AnalyticsTimeseriesPointDto[]>([]);
  const [contentMetrics, setContentMetrics] = useState<ContentAnalyticsMetricDto[]>([]);
  const [livePlatformStats, setLivePlatformStats] = useState<PlatformStatDto[]>([]);
  const [platformStatsByContent, setPlatformStatsByContent] = useState<
    Map<string, PlatformStatDto[]>
  >(new Map());
  const [spotlightPost, setSpotlightPost] = useState<ContentDto | null>(null);
  const days = dateRangeToDays(dateRange);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const items = await contentApi.getUserContentList(60);
        setContent(items || []);
        setHasContent((items || []).length > 0);

        if ((items || []).length > 0) {
          const [m, r, series, perContent, live] = await Promise.all([
            analyticsApi.fetchSummaryMetrics(days).catch(() => null),
            analyticsApi.fetchLatestWeeklyReport().catch(() => null),
            analyticsApi.fetchTimeseries(days).catch(() => ({ points: [] })),
            analyticsApi.fetchContentMetrics(days).catch(() => ({ items: [] })),
            socialApi.listLiveMetrics().catch(() => ({ items: [] })),
          ]);
          setMetrics(m);
          setReport(r);
          setTimeseries(series?.points || []);
          setContentMetrics(perContent?.items || []);

          const byContent = new Map<string, PlatformStatDto[]>();
          const flat: PlatformStatDto[] = [];
          for (const row of live?.items || []) {
            const stat: PlatformStatDto = {
              platform: row.platform,
              externalUrl: row.externalUrl,
              views: row.metrics?.views,
              likes: row.metrics?.likes,
              comments: row.metrics?.comments,
              shares: row.metrics?.shares,
              reach: row.metrics?.reach,
              saves: row.metrics?.saves,
              followersOrSubscribers: row.metrics?.followersOrSubscribers,
              syncedAt: row.lastSyncedAt,
              verified: true,
            };
            flat.push(stat);
            const list = byContent.get(row.contentId) || [];
            list.push(stat);
            byContent.set(row.contentId, list);
          }
          setLivePlatformStats(flat);
          setPlatformStatsByContent(byContent);
        }
      } catch (err) {
        console.error("Failed to load analytics:", err);
        setHasContent(false);
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, [days]);

  const analyticsByContent = useMemo(() => {
    const map = new Map<string, ContentAnalyticsMetricDto>();
    for (const row of contentMetrics) {
      map.set(String(row.contentId), row);
    }
    return map;
  }, [contentMetrics]);

  useEffect(() => {
    if (!spotlightId) {
      setSpotlightPost(null);
      return;
    }
    const fromList = content.find((item) => String(item.id) === spotlightId);
    if (fromList) {
      setSpotlightPost(fromList);
      return;
    }
    let cancelled = false;
    contentApi
      .getContentById(spotlightId, { suppressErrorLog: true })
      .then((item) => {
        if (!cancelled) setSpotlightPost(item || null);
      })
      .catch(() => {
        if (!cancelled) setSpotlightPost(null);
      });
    return () => {
      cancelled = true;
    };
  }, [spotlightId, content]);

  const spotlightThumb = useMemo(
    () => (spotlightPost ? extractValidImageUrl(spotlightPost) : ""),
    [spotlightPost],
  );

  if (isLoading && hasContent === null) {
    return <AnalyticsSkeleton />;
  }

  if (hasContent === false) {
    return (
      <div className="py-20">
        <EmptyState
          variant="insights"
          title={t("analytics.empty_state.title", { defaultValue: "No Analytics Data Found" })}
          description={t("analytics.empty_state.desc", {
            defaultValue:
              "You need to publish content to see performance insights. Start by creating your first post.",
          })}
          actionLabel={t("analytics.empty_state.cta", { defaultValue: "Create First Post" })}
          onAction={() => navigate("/create/image")}
          className="max-w-2xl mx-auto"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans">
      {spotlightId ? (
        <Card
          className={cn(
            "rounded-xl border border-primary/25 bg-primary/[0.06] shadow-soft",
            !spotlightPost && "border-dashed border-border bg-muted/20",
          )}
        >
          <CardContent className="p-3 sm:px-4 sm:py-3">
            {spotlightPost ? (
              <div className="flex flex-row items-center gap-3">
                {spotlightThumb ? (
                  <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                    <AuthenticatedImage
                      src={spotlightThumb}
                      alt=""
                      disableRemoteFallback
                      className="!absolute !inset-0 !h-full !w-full !object-cover"
                      wrapperClassName="!absolute !inset-0 !h-full !w-full !aspect-auto !bg-transparent"
                      placeholderAspectRatio="4 / 5"
                    />
                  </div>
                ) : (
                  <div className="flex h-12 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
                    <ImageIcon size={14} className="text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary leading-none">
                    {t("analytics.spotlight.title", { defaultValue: "Post spotlight" })}
                  </p>
                  <h2 className="truncate text-sm font-display font-bold text-foreground leading-snug">
                    {spotlightPost.title || spotlightPost.caption || "Untitled"}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                    <Badge variant="outline" className="h-4 px-1.5 capitalize text-[9px]">
                      {spotlightPost ? resolveContentLabel(spotlightPost) : "image"}
                    </Badge>
                    <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
                      <Eye size={11} />
                      {Number(spotlightPost.views || 0).toLocaleString()} views
                    </span>
                    <span className="capitalize">{spotlightPost.status || "draft"}</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 gap-1.5 px-2.5 text-[11px] font-bold"
                  onClick={() => navigate(`/feed/post/${spotlightPost.id}`)}
                >
                  <ExternalLink size={13} />
                  <span className="hidden sm:inline">
                    {t("analytics.spotlight.open_detail", { defaultValue: "View post details" })}
                  </span>
                  <span className="sm:hidden">Details</span>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-0.5">
                {t("analytics.spotlight.missing", {
                  defaultValue: "That post wasn’t found in your recent library.",
                })}
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex flex-wrap items-center gap-2 ui-filter-panel mb-0 py-2 px-2.5 w-full md:w-auto bg-muted/20 border-border">
          <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-md border border-border shrink-0">
            {["7D", "30D", "90D"].map((r) => (
              <Button
                key={r}
                variant={dateRange === r.toLowerCase() ? "secondary" : "ghost"}
                size="sm"
                className="h-8 text-xs font-bold px-3 transition-all"
                onClick={() => setDateRange(r.toLowerCase())}
              >
                {r}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-1 md:flex-none justify-end">
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="w-[130px] md:w-[150px] h-9 text-xs font-bold bg-card border-border">
                <SelectValue placeholder={t("common.platform")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all_platforms")}</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
              </SelectContent>
            </Select>

            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger className="w-[130px] md:w-[150px] h-9 text-xs font-bold bg-card border-border">
                <SelectValue placeholder={t("common.filter")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("create_post.labels.content_style")}</SelectItem>
                <SelectItem value="video">{t("nav.clip_editor")}</SelectItem>
                <SelectItem value="meme">{t("dashboard.content_matrix.memes")}</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 md:w-auto md:gap-2 text-xs font-bold p-0 md:px-3"
              onClick={() => setIsWorkspaceOpen(true)}
            >
              <Download size={14} className="md:size-3.5 rtl:ml-0 rtl:mr-1" />
              <span className="hidden md:inline">{t("analytics.export")}</span>
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="relative group">
          <TabsList className="ui-tabs-list w-full overflow-x-auto no-scrollbar justify-start md:justify-center">
            {[
              { id: "overview", label: t("analytics.tabs.overview"), icon: BarChart3 },
              { id: "content", label: t("analytics.tabs.content"), icon: Layers },
              { id: "creative", label: t("analytics.tabs.creative"), icon: ImageIcon },
              { id: "platforms", label: t("analytics.tabs.platforms"), icon: Globe },
              { id: "geo-intel", label: t("analytics.tabs.geo"), icon: Map },
              { id: "audience", label: t("analytics.tabs.audience"), icon: Users },
              { id: "games", label: t("analytics.tabs.games"), icon: Gamepad2 },
              { id: "retention", label: t("analytics.tabs.retention"), icon: Clock },
              { id: "ai", label: t("analytics.tabs.ai"), icon: BrainCircuit },
            ].map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="ui-tabs-trigger shrink-0">
                <tab.icon size={12} className="mr-2 rtl:mr-0 rtl:ml-2" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="absolute right-0 rtl:left-0 rtl:right-auto top-0 bottom-6 w-8 bg-gradient-to-l rtl:bg-gradient-to-r from-background to-transparent pointer-events-none md:hidden" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.25 }}
            className="outline-none mt-6"
          >
            <TabsContent value="overview" className="mt-0 outline-none">
              <OverviewTab
                isLoading={isLoading}
                metrics={metrics}
                report={report}
                content={content}
                timeseries={timeseries}
                platformStatsByContent={platformStatsByContent}
                highlightContentId={spotlightId || undefined}
              />
            </TabsContent>

            <TabsContent value="content" className="mt-0 outline-none">
              <ContentTab
                isLoading={isLoading}
                contentType={contentType}
                content={content}
                platformStatsByContent={platformStatsByContent}
                analyticsByContent={analyticsByContent}
              />
            </TabsContent>

            <TabsContent value="platforms" className="mt-0 outline-none">
              <PlatformsTab
                isLoading={isLoading}
                platformFilter={platform}
                platformStats={livePlatformStats}
              />
            </TabsContent>

            {Array.from(COMING_SOON_TABS).map((id) => (
              <TabsContent key={id} value={id} className="mt-0 outline-none">
                <ComingSoonPanel
                  label={t(`analytics.tabs.${id === "geo-intel" ? "geo" : id}`)}
                  isAi={id === "ai"}
                />
              </TabsContent>
            ))}
          </motion.div>
        </AnimatePresence>
      </Tabs>

      <WorkspaceExportDialog isOpen={isWorkspaceOpen} onClose={() => setIsWorkspaceOpen(false)} />
    </div>
  );
}
