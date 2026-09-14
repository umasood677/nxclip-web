import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Layers, Zap } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../../components/ui/table";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { AnalyticsContentSkeleton } from "../../skeletons/AnalyticsSkeleton";
import { AuthenticatedImage } from "../../../../components/AuthenticatedImage";
import {
  extractValidImageUrl,
  type ContentAnalyticsMetricDto,
  type ContentDto,
  type PlatformStatDto,
} from "../../../../services/apiClient";
import {
  engagementRate,
  resolveContentLabel,
  rollupFromStats,
} from "../../lib/socialMetrics";

interface ContentTabProps {
  isLoading: boolean;
  contentType: string;
  content: ContentDto[];
  platformStatsByContent: Map<string, PlatformStatDto[]>;
  analyticsByContent: Map<string, ContentAnalyticsMetricDto>;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n ?? 0);
}

export const ContentTab = memo(
  ({ isLoading, contentType, content, platformStatsByContent, analyticsByContent }: ContentTabProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const rows = useMemo(() => {
      return content
        .filter((item) => {
          const status = String(item.status || "").toLowerCase();
          if (status !== "published" && status !== "approved") return false;
          if (contentType === "all") return true;
          return resolveContentLabel(item) === contentType;
        })
        .map((item) => {
          const social = rollupFromStats(platformStatsByContent.get(String(item.id)) || item.platformStats);
          const analytics = analyticsByContent.get(String(item.id));
          const views = social.views || analytics?.views || item.views || 0;
          const likes = social.likes || analytics?.likes || item.likes || 0;
          const comments = social.comments || analytics?.comments || item.comments || 0;
          const shares = social.shares || analytics?.shares || item.shares || 0;
          const eng = engagementRate({
            views,
            likes,
            comments,
            shares,
            reach: social.reach || analytics?.reach || 0,
            saves: social.saves || analytics?.saves || 0,
            followers: 0,
          });
          const platforms = (platformStatsByContent.get(String(item.id)) || item.platformStats || [])
            .map((s) => s.platform)
            .filter(Boolean)
            .join(", ");
          return {
            item,
            views,
            likes,
            comments,
            shares,
            eng,
            platforms: platforms || "—",
            thumb: extractValidImageUrl(item),
          };
        })
        .sort((a, b) => b.views - a.views);
    }, [analyticsByContent, content, contentType, platformStatsByContent]);

    if (isLoading) {
      return <AnalyticsContentSkeleton />;
    }

    return (
      <div className="ui-table-container overflow-x-auto no-scrollbar">
        <Table className="ui-table-shell min-w-[700px] lg:min-w-0 font-sans">
          <TableHeader className="ui-table-header">
            <TableRow className="ui-table-row">
              <TableHead className="uppercase text-[9px] tracking-wider font-bold text-muted-foreground">
                {t("analytics.table.item")}
              </TableHead>
              <TableHead className="hidden md:table-cell uppercase text-[9px] tracking-wider font-bold text-muted-foreground">
                Platforms
              </TableHead>
              <TableHead className="uppercase text-[9px] tracking-wider font-bold text-muted-foreground">
                {t("analytics.table.type")}
              </TableHead>
              <TableHead className="text-end uppercase text-[9px] tracking-wider font-bold text-muted-foreground">
                {t("analytics.table.views")}
              </TableHead>
              <TableHead className="text-end uppercase text-[9px] tracking-wider font-bold text-muted-foreground">
                {t("analytics.table.engagement")}
              </TableHead>
              <TableHead className="text-end hidden sm:table-cell uppercase text-[9px] tracking-wider font-bold text-muted-foreground">
                Shares
              </TableHead>
              <TableHead className="text-end uppercase text-[9px] tracking-wider font-bold text-muted-foreground">
                Likes
              </TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground py-8">
                    <Layers className="size-8 mb-2 opacity-20" />
                    <p className="text-xs font-bold">
                      {t("analytics.table.no_data", {
                        defaultValue: "No published content with social stats yet.",
                      })}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.item.id} className="ui-table-row">
                  <TableCell className="ui-table-cell">
                    <div className="flex items-center gap-3">
                      {row.thumb ? (
                        <div className="relative w-10 h-14 overflow-hidden rounded border border-border bg-muted shrink-0">
                          <AuthenticatedImage
                            src={row.thumb}
                            alt=""
                            disableRemoteFallback
                            className="!absolute !inset-0 !h-full !w-full !object-cover"
                            wrapperClassName="!absolute !inset-0 !h-full !w-full !aspect-auto !bg-transparent"
                            placeholderAspectRatio="4 / 5"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-14 rounded border border-border bg-muted shrink-0" />
                      )}
                      <div className="space-y-1">
                        <p className="ui-text-body-semibold leading-tight max-w-[120px] md:max-w-[200px] truncate">
                          {row.item.title || row.item.caption || "Untitled"}
                        </p>
                        <span className="ui-text-caption text-muted-foreground block font-bold capitalize">
                          {row.platforms}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="ui-table-cell ui-text-mono-label text-muted-foreground hidden md:table-cell capitalize">
                    {row.platforms}
                  </TableCell>
                  <TableCell className="ui-table-cell">
                    <Badge variant="secondary" className="text-[8px] h-4 tracking-tighter uppercase">
                      {resolveContentLabel(row.item)}
                    </Badge>
                  </TableCell>
                  <TableCell className="ui-table-cell text-end font-bold text-[11px]">
                    {formatCompact(row.views)}
                  </TableCell>
                  <TableCell className="ui-table-cell text-end font-bold text-brand-secondary">
                    {row.eng}%
                  </TableCell>
                  <TableCell className="ui-table-cell text-end font-bold opacity-80 hidden sm:table-cell">
                    {formatCompact(row.shares)}
                  </TableCell>
                  <TableCell className="ui-table-cell text-end">
                    <div className="inline-flex items-center gap-1 ui-text-caption text-primary px-1.5 py-0.5 rounded-full bg-primary/10">
                      <Zap size={10} className="fill-primary" /> {formatCompact(row.likes)}
                    </div>
                  </TableCell>
                  <TableCell className="ui-table-cell text-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => navigate(`/analytics?contentId=${row.item.id}`)}
                    >
                      <ExternalLink size={14} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    );
  },
);

ContentTab.displayName = "ContentTab";
