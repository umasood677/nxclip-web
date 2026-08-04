import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Eye, Heart, MessageSquare, TrendingUp, Zap, BrainCircuit, Flame } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { MetricCard, CustomTooltip } from "../shared-components";
import { AnalyticsOverviewSkeleton } from "../../skeletons/AnalyticsSkeleton";
import type { ContentDto, DashboardMetricsDto, WeeklyReportDto } from "../../../../services/apiClient";
import { extractValidImageUrl } from "../../../../services/apiClient";

interface OverviewTabProps {
  isLoading: boolean;
  metrics: DashboardMetricsDto | null;
  report: WeeklyReportDto | null;
  content: ContentDto[];
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n ?? 0);
}

export const OverviewTab = memo(({ isLoading, metrics, report, content }: OverviewTabProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const views = metrics?.views ?? 0;
  const likes = metrics?.likes ?? 0;
  const comments = metrics?.comments ?? 0;
  const followers = metrics?.followers ?? 0;
  const reach = metrics?.reach ?? views;
  const engagementRate =
    views > 0 ? Number((((likes + comments) / views) * 100).toFixed(1)) : 0;
  const growth = report?.growthRate ?? 0;

  const trends = useMemo(() => {
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const buckets = Array(7).fill(0) as number[];
    const eng = Array(7).fill(0) as number[];
    content.forEach((item) => {
      const d = new Date(item.publishedAt || item.createdAt || 0);
      if (isNaN(d.getTime())) return;
      const idx = (d.getDay() + 6) % 7;
      buckets[idx] += item.views || 1;
      eng[idx] += (item.likes || 0) + (item.comments || 0);
    });
    // If no per-day signal, show a flat honest line from totals
    if (buckets.every((v) => v === 0) && views > 0) {
      const daily = Math.round(views / 7);
      return labels.map((name) => ({
        name,
        views: daily,
        engagement: Math.round((likes + comments) / 7),
      }));
    }
    return labels.map((name, i) => ({
      name,
      views: buckets[i],
      engagement: eng[i],
    }));
  }, [content, views, likes, comments]);

  const topPosts = useMemo(() => {
    return [...content]
      .filter((i) => {
        const s = (i.status || "").toLowerCase();
        return s === "published" || s === "approved";
      })
      .sort((a, b) => (b.views || b.likes || 0) - (a.views || a.likes || 0))
      .slice(0, 5);
  }, [content]);

  if (isLoading) {
    return <AnalyticsOverviewSkeleton />;
  }

  const hasSignal = views + likes + comments + followers + reach > 0;

  return (
    <>
      {!hasSignal && (
        <div className="mb-4 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3 text-[12px] font-medium text-muted-foreground">
          Metrics are live from analytics — publish and engage to grow these numbers. Zeros are real, not placeholders.
        </div>
      )}

      <div className="ui-stat-grid">
        <MetricCard title={t("analytics.metrics.views")} value={formatCompact(views)} trend={growth || undefined} icon={Eye} />
        <MetricCard
          title={t("analytics.metrics.engagement")}
          value={`${engagementRate}%`}
          icon={Heart}
          description={`${formatCompact(likes)} likes · ${formatCompact(comments)} comments`}
        />
        <MetricCard title="Reach" value={formatCompact(reach)} icon={Zap} />
        <MetricCard title={t("analytics.metrics.followers")} value={formatCompact(followers)} trend={growth || undefined} icon={TrendingUp} />
        <MetricCard title="Likes" value={formatCompact(likes)} icon={Heart} />
        <MetricCard title="Comments" value={formatCompact(comments)} icon={MessageSquare} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
        <Card className="lg:col-span-8 ui-chart-card border-border hover:border-primary/20 transition-all">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-[10px] tracking-widest font-bold text-muted-foreground uppercase">
                {t("analytics.charts.performance_pulse")}
              </CardTitle>
              <CardDescription className="text-sm font-display font-bold text-foreground">
                {t("analytics.charts.performance_desc")}
              </CardDescription>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-[9px] font-bold tracking-wider">{t("analytics.charts.views")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-tertiary" />
                <span className="text-[9px] font-bold tracking-wider">{t("analytics.charts.engagement")}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[300px] md:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="viewArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="views" name={t("analytics.charts.views")} stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#viewArea)" />
                <Area type="monotone" dataKey="engagement" name={t("analytics.charts.engagement")} stroke="var(--tertiary)" strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="lg:col-span-4 space-y-6">
          <Card className="rounded-lg border border-primary/30 bg-primary/5 shadow-soft shadow-primary/5">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-primary">
                <div className="ui-icon-chip-primary w-6 h-6 border-primary/20">
                  <BrainCircuit size={14} />
                </div>
                <CardTitle className="text-[10px] tracking-widest font-bold leading-none uppercase">
                  {t("analytics.ai.title")}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg bg-card/60 border border-primary/10">
                <div className="flex items-center gap-2 mb-1.5">
                  <Flame size={12} className="text-orange-500 rtl:ml-2 rtl:mr-0" />
                  <span className="text-[11px] font-display font-bold text-foreground">
                    {hasSignal ? "Keep the cadence" : "Publish to unlock growth"}
                  </span>
                </div>
                <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">
                  {hasSignal
                    ? report
                      ? `Latest report growth: ${report.growthRate}% · ${formatCompact(report.views)} views in period.`
                      : "Your summary metrics are connected. Ship the next post while engagement is warm."
                    : "Create in Image Studio, publish to Feed, then return here — numbers update from real events."}
                </p>
              </div>
              <Button
                variant="brand"
                className="w-full text-primary-foreground font-display font-bold h-9 text-[11px] rounded-md shadow-lg shadow-primary/20 border border-primary/20"
                onClick={() => navigate(hasSignal ? "/create" : "/create/image")}
              >
                {hasSignal ? "Create next post" : "Create first post"}
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-border bg-card shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] tracking-widest font-bold text-muted-foreground uppercase">
                {t("analytics.overview.top_5_title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topPosts.length === 0 ? (
                <p className="text-[11px] text-muted-foreground font-medium py-2">
                  No published posts yet.
                </p>
              ) : (
                topPosts.map((item) => {
                  const thumb = extractValidImageUrl(item);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="flex items-center gap-3 group cursor-pointer p-1 rounded-md hover:bg-muted/30 transition-colors w-full text-start"
                      onClick={() => navigate(`/feed/post/${item.id}`)}
                    >
                      {thumb ? (
                        <img
                          src={thumb}
                          alt=""
                          className="w-10 h-12 object-cover rounded border border-border group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-10 h-12 rounded border border-border bg-muted" />
                      )}
                      <div className="flex-1 overflow-hidden">
                        <p className="text-[10px] font-bold truncate group-hover:text-primary transition-colors tracking-tight">
                          {item.title || item.caption || "Untitled"}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider tabular-nums">
                            {formatCompact(item.views || 0)} views
                          </span>
                          <Badge className="h-4 text-[7px] px-1 font-bold border-border/50 capitalize">
                            {item.contentType || "image"}
                          </Badge>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
});

OverviewTab.displayName = "OverviewTab";
