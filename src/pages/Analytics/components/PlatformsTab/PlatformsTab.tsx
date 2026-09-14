import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, Facebook, Instagram, Youtube } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { CustomTooltip } from "../shared-components";
import { AnalyticsPlatformsSkeleton } from "../../skeletons/AnalyticsSkeleton";
import { TiktokIcon } from "../../../../components/TiktokIcon";
import type { PlatformStatDto } from "../../../../services/apiClient";
import {
  ANALYTICS_PLATFORMS,
  addRollup,
  emptyRollup,
  engagementRate,
  type SocialMetricRollup,
} from "../../lib/socialMetrics";

const PLATFORM_META: Record<string, { name: string; color: string; icon: LucideIcon }> = {
  tiktok: { name: "TikTok", color: "#000000", icon: TiktokIcon as LucideIcon },
  youtube: { name: "YouTube", color: "#FF0000", icon: Youtube },
  instagram: { name: "Instagram", color: "#E1306C", icon: Instagram },
  facebook: { name: "Facebook", color: "#1877F2", icon: Facebook },
};

interface PlatformsTabProps {
  isLoading: boolean;
  platformFilter: string;
  platformStats: PlatformStatDto[];
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n ?? 0);
}

export const PlatformsTab = memo(({ isLoading, platformFilter, platformStats }: PlatformsTabProps) => {
  const { t } = useTranslation();

  const byPlatform = useMemo(() => {
    const map = new Map<string, SocialMetricRollup & { posts: number; syncedAt?: string }>();
    for (const id of ANALYTICS_PLATFORMS) {
      map.set(id, { ...emptyRollup(), posts: 0 });
    }
    for (const stat of platformStats) {
      const key = String(stat.platform || "").toLowerCase();
      if (!map.has(key)) continue;
      const current = map.get(key)!;
      const next = addRollup(current, {
        views: stat.views,
        likes: stat.likes,
        comments: stat.comments,
        shares: stat.shares,
        reach: stat.reach,
        saves: stat.saves,
        followers: undefined,
      });
      map.set(key, {
        ...next,
        followers: Math.max(current.followers, Number(stat.followersOrSubscribers || 0)),
        posts: current.posts + 1,
        syncedAt: stat.syncedAt || current.syncedAt,
      });
    }
    return map;
  }, [platformStats]);

  const cards = ANALYTICS_PLATFORMS.filter((id) => platformFilter === "all" || platformFilter === id).map(
    (id) => {
      const stats = byPlatform.get(id) || { ...emptyRollup(), posts: 0 };
      const meta = PLATFORM_META[id];
      return { id, meta, stats, eng: engagementRate(stats) };
    },
  );

  const chartData = cards.map((c) => ({
    name: c.meta.name,
    views: c.stats.views,
    eng: c.stats.likes + c.stats.comments + c.stats.shares,
  }));

  if (isLoading) {
    return <AnalyticsPlatformsSkeleton />;
  }

  const hasSignal = cards.some((c) => c.stats.views + c.stats.likes + c.stats.comments > 0);

  return (
    <div className="space-y-6 font-sans">
      {!hasSignal ? (
        <Card className="border-dashed border-border bg-muted/20">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No live social metrics yet. Publish to connected platforms and wait for the next sync
            (about every 4 hours) to see TikTok / YouTube / Instagram / Facebook performance here.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((p) => (
          <Card
            key={p.id}
            className="rounded-lg border border-border bg-card shadow-soft group hover:bg-muted/10 transition-colors"
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div
                  className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center border border-border group-hover:border-primary/20 transition-all shadow-sm"
                  style={{ color: p.meta.color }}
                >
                  <p.meta.icon size={20} />
                </div>
                <Badge
                  className="h-5 text-[9px] font-bold tracking-wider border-border text-muted-foreground bg-muted/40"
                  variant="outline"
                >
                  {p.stats.posts} live
                </Badge>
              </div>
              <CardTitle className="text-base font-display font-black mt-4 tracking-tight">
                {p.meta.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                    {t("analytics.platforms.views")}
                  </p>
                  <p className="text-xl font-display font-black">{formatCompact(p.stats.views)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                    {t("analytics.platforms.eng_rate")}
                  </p>
                  <p className="text-xl font-display font-black">{p.eng}%</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                    Shares
                  </p>
                  <p className="text-xl font-display font-black">{formatCompact(p.stats.shares)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                    Reach
                  </p>
                  <p className="text-xl font-display font-black text-primary">
                    {formatCompact(p.stats.reach || p.stats.views)}
                  </p>
                </div>
              </div>
              <div className="pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-[10px] font-bold w-full rounded-md tracking-widest hover:bg-primary/5 transition-colors"
                  disabled
                >
                  {t("analytics.platforms.deep_dive")}
                  <ArrowUpRight size={10} className="ml-1 rtl:mr-1 rtl:ml-0 rtl:rotate-[-90deg]" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="ui-chart-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold text-muted-foreground uppercase">
            {t("analytics.charts.inter_platform")}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Bar dataKey="views" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={40} />
              <Bar dataKey="eng" fill="var(--tertiary)" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
});

PlatformsTab.displayName = "PlatformsTab";
