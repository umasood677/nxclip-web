import type { ContentDto, PlatformStatDto } from "../services/apiClient";

export const ANALYTICS_PLATFORMS = ["tiktok", "youtube", "instagram", "facebook"] as const;
export type AnalyticsPlatformId = (typeof ANALYTICS_PLATFORMS)[number];

export type SocialMetricRollup = {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  saves: number;
  followers: number;
};

export function emptyRollup(): SocialMetricRollup {
  return { views: 0, likes: 0, comments: 0, shares: 0, reach: 0, saves: 0, followers: 0 };
}

export function addRollup(a: SocialMetricRollup, b: Partial<SocialMetricRollup>): SocialMetricRollup {
  return {
    views: a.views + (b.views || 0),
    likes: a.likes + (b.likes || 0),
    comments: a.comments + (b.comments || 0),
    shares: a.shares + (b.shares || 0),
    reach: a.reach + (b.reach || 0),
    saves: a.saves + (b.saves || 0),
    followers: a.followers + (b.followers || 0),
  };
}

export function rollupFromStats(stats: PlatformStatDto[] | undefined): SocialMetricRollup {
  return (stats ?? []).reduce(
    (acc, stat) =>
      addRollup(acc, {
        views: stat.views,
        likes: stat.likes,
        comments: stat.comments,
        shares: stat.shares,
        reach: stat.reach,
        saves: stat.saves,
      }),
    emptyRollup(),
  );
}

export function engagementRate(rollup: SocialMetricRollup): number {
  if (rollup.views <= 0) return 0;
  return Number((((rollup.likes + rollup.comments + rollup.shares + rollup.saves) / rollup.views) * 100).toFixed(1));
}

export function resolveContentLabel(item: ContentDto): string {
  if (item.memeSpec || item.style === "meme" || String(item.contentType).toLowerCase() === "meme") {
    return "meme";
  }
  return String(item.contentType || "image").toLowerCase();
}

export function dateRangeToDays(dateRange: string): number {
  if (dateRange === "30d") return 30;
  if (dateRange === "90d") return 90;
  return 7;
}
