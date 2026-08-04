import { useState, useEffect } from "react";
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
import { AnalyticsSkeleton } from "./skeletons/AnalyticsSkeleton";
import { WorkspaceExportDialog } from "../../components/WorkspaceExportDialog";
import { EmptyState } from "../../components/common/EmptyState";
import {
  analyticsApi,
  contentApi,
  type ContentDto,
  type DashboardMetricsDto,
  type WeeklyReportDto,
} from "../../services/apiClient";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../../components/ui/card";

const COMING_SOON_TABS = new Set([
  "content",
  "creative",
  "platforms",
  "geo-intel",
  "audience",
  "games",
  "retention",
  "ai",
]);

function ComingSoonPanel({ label }: { label: string }) {
  return (
    <Card className="border-dashed border-border bg-muted/20">
      <CardContent className="py-16 flex flex-col items-center text-center gap-3">
        <Sparkles className="text-primary" size={28} />
        <h3 className="font-display text-lg font-bold text-foreground">{label}</h3>
        <p className="text-sm text-muted-foreground max-w-md font-medium">
          Coming soon after MVP — Overview already shows your live summary metrics.
          Deeper breakdowns ship in the next cycle.
        </p>
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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

  useEffect(() => {
    async function load() {
      try {
        const items = await contentApi.getUserContentList(60);
        setContent(items || []);
        setHasContent((items || []).length > 0);

        if ((items || []).length > 0) {
          const [m, r] = await Promise.all([
            analyticsApi.fetchSummaryMetrics().catch(() => null),
            analyticsApi.fetchLatestWeeklyReport().catch(() => null),
          ]);
          setMetrics(m);
          setReport(r);
        }
      } catch (err) {
        console.error("Failed to load analytics:", err);
        setHasContent(false);
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, []);

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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-border">
        <div className="space-y-1 text-start">
          <h1 className="text-2xl md:text-3xl font-display font-black tracking-tight text-foreground">
            {t("analytics.title")}
          </h1>
          <p className="text-[11px] md:text-xs text-muted-foreground font-bold tracking-tight max-w-lg">
            {t("analytics.description")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 ui-filter-panel mb-0 py-1.5 px-2 w-full md:w-auto bg-muted/20 border-border">
          <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-md border border-border shrink-0">
            {["7D", "30D", "90D"].map((r) => (
              <Button
                key={r}
                variant={dateRange === r.toLowerCase() ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-[9px] md:text-[10px] font-bold px-2.5 md:px-3 transition-all"
                onClick={() => setDateRange(r.toLowerCase())}
              >
                {r}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-1 md:flex-none justify-end">
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="w-[110px] md:w-[130px] h-8 text-[10px] font-bold bg-card border-border">
                <SelectValue placeholder={t("common.platform")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all_platforms")}</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
              </SelectContent>
            </Select>

            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger className="w-[110px] md:w-[130px] h-8 text-[10px] font-bold bg-card border-border">
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
              className="h-8 w-8 md:w-auto md:gap-2 text-[9px] font-bold p-0 md:px-3"
              onClick={() => setIsWorkspaceOpen(true)}
            >
              <Download size={14} className="md:size-3 rtl:ml-0 rtl:mr-1" />
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
              />
            </TabsContent>

            {Array.from(COMING_SOON_TABS).map((id) => (
              <TabsContent key={id} value={id} className="mt-0 outline-none">
                <ComingSoonPanel label={t(`analytics.tabs.${id === "geo-intel" ? "geo" : id}`)} />
              </TabsContent>
            ))}
          </motion.div>
        </AnimatePresence>
      </Tabs>

      <WorkspaceExportDialog isOpen={isWorkspaceOpen} onClose={() => setIsWorkspaceOpen(false)} />
    </div>
  );
}
