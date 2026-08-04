import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  Sparkles,
  Video,
  Layout,
  ChevronRight,
  Lock,
  Image as ImageIcon,
  PlayCircle,
  Radio,
  CalendarDays,
  Library,
  AlertCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { cn } from "../../lib/utils";
import { UserProfile } from "../../types";
import { SEO } from "../../components/SEO";
import { useAppSelector } from "../../store/hooks";
import { selectAuthProfile } from "../../store/slices/authSlice";
import {
  contentApi,
  extractValidImageUrl,
  type ContentDto,
} from "../../services/apiClient";
import { AuthenticatedImage } from "../../components/AuthenticatedImage";
import { resolveLibraryTitle } from "../ContentLibrary/lib/title";
import {
  isReferenceAsset,
  getDisplayStatusBadge,
} from "../ImageStudio/components/RecentGenerations/statusStyles";
import { StatusPill } from "../ImageStudio/components/RecentGenerations/StatusPill";
import { EmptyState } from "../../components/common/EmptyState";
import { beginWeekPlanRenewal, weekPlanFromProfile } from "../../lib/weekPlan";

const tools = [
  {
    title: "create.tools.image_studio.title",
    description: "create.tools.image_studio.description",
    icon: Sparkles,
    href: "/create/image",
    roleRequired: "user",
    tone: {
      card: "border-primary/25 bg-primary/10 hover:bg-primary/15 hover:border-primary/40 dark:bg-primary/15 dark:hover:bg-primary/25",
      icon: "bg-primary text-primary-foreground shadow-sm shadow-primary/30",
      title: "text-foreground",
      desc: "text-primary/80 dark:text-primary-foreground/70",
      chevron: "bg-primary/20 text-primary group-hover:bg-primary group-hover:text-primary-foreground",
      glow: "from-primary/20",
    },
  },
  {
    title: "create.tools.clip_editor.title",
    description: "create.tools.clip_editor.description",
    icon: Video,
    href: "/create/clip",
    roleRequired: "creator",
    tone: {
      card: "border-teal-500/25 bg-teal-500/10 hover:bg-teal-500/15 hover:border-teal-500/40 dark:bg-teal-500/15 dark:hover:bg-teal-500/25",
      icon: "bg-teal-600 text-white shadow-sm shadow-teal-600/30 dark:bg-teal-500",
      title: "text-foreground",
      desc: "text-teal-800/80 dark:text-teal-200/80",
      chevron: "bg-teal-500/20 text-teal-700 dark:text-teal-300 group-hover:bg-teal-600 group-hover:text-white",
      glow: "from-teal-500/20",
    },
  },
  {
    title: "create.tools.meme_gen.title",
    description: "create.tools.meme_gen.description",
    icon: Layout,
    href: "/create/image?type=meme",
    roleRequired: "user",
    tone: {
      card: "border-violet-500/25 bg-violet-500/10 hover:bg-violet-500/15 hover:border-violet-500/40 dark:bg-violet-500/15 dark:hover:bg-violet-500/25",
      icon: "bg-violet-600 text-white shadow-sm shadow-violet-600/30 dark:bg-violet-500",
      title: "text-foreground",
      desc: "text-violet-800/80 dark:text-violet-200/80",
      chevron: "bg-violet-500/20 text-violet-700 dark:text-violet-300 group-hover:bg-violet-600 group-hover:text-white",
      glow: "from-violet-500/20",
    },
  },
];

function typeLabel(contentType?: string) {
  const t = (contentType || "image").toLowerCase();
  if (t === "clip") return "Clip";
  if (t === "meme") return "Meme";
  return "Image";
}

function openCreation(navigate: ReturnType<typeof useNavigate>, item: ContentDto) {
  const id = item.id;
  if (item.status === "published") {
    navigate(`/feed/post/${id}`);
    return;
  }
  if (item.contentType === "clip") {
    navigate("/create/clip", { state: { contentId: id } });
    return;
  }
  navigate("/create/image", {
    state: {
      draftId: id,
      title: item.title || "",
      prompt: item.prompt || "",
      imageUrl: extractValidImageUrl(item),
      mode: item.contentType === "meme" ? "meme" : "image",
    },
  });
}

function isUnfinished(item: ContentDto): boolean {
  const s = (item.status || "").toLowerCase();
  return (
    s === "draft" ||
    s === "processing" ||
    s === "publishing" ||
    s === "generation_failed" ||
    s === "moderation_rejected"
  );
}

function isPublishedNotLive(item: ContentDto): boolean {
  const s = (item.status || "").toLowerCase();
  if (s !== "published" && s !== "approved") return false;
  const stats = (item as { platformStats?: { externalUrl?: string }[] }).platformStats;
  const hasLive = Array.isArray(stats) && stats.some((p) => !!p.externalUrl);
  return !hasLive;
}

function ActionThumb({
  item,
  cta,
  onOpen,
}: {
  item: ContentDto;
  cta: string;
  onOpen: () => void;
}) {
  const imageUrl = extractValidImageUrl(item);
  const title = resolveLibraryTitle(item);
  const statusBadge = getDisplayStatusBadge(item);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex gap-3 rounded-xl border border-border/70 bg-card/60 p-2.5 text-start hover:border-primary/35 hover:bg-card transition-colors w-full"
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
        {imageUrl ? (
          <AuthenticatedImage
            key={imageUrl}
            src={imageUrl}
            alt={title}
            disableRemoteFallback
            placeholderAspectRatio="1 / 1"
            wrapperClassName="!absolute inset-0 !h-full !w-full !aspect-auto overflow-hidden [&>img]:!absolute [&>img]:inset-0 [&>img]:!h-full [&>img]:!w-full [&>img]:!object-cover [&>img]:transition-transform [&>img]:duration-400 group-hover:[&>img]:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1 py-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {statusBadge ? <StatusPill badge={statusBadge} /> : null}
          <span className="text-[9px] font-bold tracking-wide px-1.5 py-0.5 rounded-md bg-primary/15 text-primary">
            {typeLabel(item.contentType)}
          </span>
        </div>
        <p className="text-[13px] font-semibold text-foreground line-clamp-1">{title}</p>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary">
          {cta}
          <ChevronRight size={12} />
        </span>
      </div>
    </button>
  );
}

export default function CreateHub() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const reduxProfile = useAppSelector(selectAuthProfile);
  const navigate = useNavigate();
  const weekPlan = weekPlanFromProfile(reduxProfile);

  const [items, setItems] = useState<ContentDto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await contentApi.getUserContentList(48, undefined, {
        excludeUploads: true,
      });
      const filtered = data
        .filter((item) => !isReferenceAsset(item))
        .filter((item) => {
          const s = (item.status || "").toLowerCase();
          return s !== "deleted" && s !== "archived";
        })
        .sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt || 0).getTime() -
            new Date(a.updatedAt || a.createdAt || 0).getTime(),
        );
      setItems(filtered);
    } catch (err) {
      console.error("Failed to load hub actions:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const continueItems = useMemo(
    () => items.filter(isUnfinished).slice(0, 4),
    [items],
  );
  const readyItems = useMemo(
    () => items.filter(isPublishedNotLive).slice(0, 4),
    [items],
  );
  const weekDays = weekPlan?.days?.slice(0, 2) ?? [];

  const userRole: UserProfile["role"] = reduxProfile?.role || "user";
  const isAdmin = userRole === "admin";

  const hasAccess = (requiredRole: string) => {
    if (isAdmin) return true;
    if (requiredRole === "creator") return userRole === "creator";
    return true;
  };

  return (
    <div className="w-full pb-10">
      <SEO
        title={`${t("create.header.title")} | NexaClip.ai`}
        description={t("create.header.subtitle")}
      />

      <div className="mb-4 md:mb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-display font-bold text-foreground mb-1">
            {t("create.header.plan")}
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground font-medium">
            Pick a tool, finish what’s open, then go Live — Library holds everything else.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs font-bold shrink-0"
          onClick={() => navigate("/my-content")}
        >
          <Library size={13} className="me-1.5" />
          View all in Library
        </Button>
      </div>

      {/* Compact colored tool options */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 md:gap-3">
        <AnimatePresence mode="popLayout">
          {tools.map((tool, index) => {
            const locked = !hasAccess(tool.roleRequired);
            const Icon = tool.icon;

            return (
              <motion.div
                key={tool.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                whileHover={locked ? {} : { y: -3 }}
              >
                <Link
                  to={locked ? "#" : tool.href}
                  className={cn("block h-full", locked && "cursor-not-allowed")}
                  onClick={(e) => {
                    if (!locked) return;
                    e.preventDefault();
                  }}
                >
                  <div
                    className={cn(
                      "group relative h-full overflow-hidden rounded-xl border px-3 py-3 md:px-3.5 md:py-3.5 transition-all duration-200",
                      "hover:shadow-md",
                      tool.tone.card,
                      locked && "opacity-70 grayscale-[0.35]",
                    )}
                  >
                    <div
                      className={cn(
                        "pointer-events-none absolute -top-8 -end-8 h-24 w-24 rounded-full bg-gradient-to-br to-transparent blur-2xl opacity-70",
                        tool.tone.glow,
                      )}
                    />

                    <div className="relative flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110",
                          tool.tone.icon,
                        )}
                      >
                        <Icon size={18} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3
                            className={cn(
                              "truncate text-sm font-bold leading-tight tracking-tight",
                              tool.tone.title,
                            )}
                          >
                            {t(tool.title)}
                          </h3>
                          {tool.roleRequired === "creator" && (
                            <Badge
                              variant={locked ? "destructive" : "secondary"}
                              className="h-4 shrink-0 rounded-full px-1.5 text-[8px] font-bold tracking-wide"
                            >
                              {locked ? (
                                <Lock size={8} className={cn(isAr ? "ml-0.5" : "mr-0.5")} />
                              ) : null}
                              {t("create.tools.creator_only")}
                            </Badge>
                          )}
                        </div>
                        <p
                          className={cn(
                            "mt-0.5 line-clamp-1 text-[11px] font-medium leading-snug",
                            tool.tone.desc,
                          )}
                        >
                          {t(tool.description)}
                        </p>
                      </div>

                      {locked ? (
                        <Button
                          variant="brand-gradient"
                          size="sm"
                          className="h-8 shrink-0 px-2.5 text-[10px] font-bold"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate("/pricing");
                          }}
                        >
                          <Lock size={12} className={isAr ? "ml-1" : "mr-1"} />
                          {t("create.tools.upgrade")}
                        </Button>
                      ) : (
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-200",
                            tool.tone.chevron,
                          )}
                        >
                          <ChevronRight
                            size={15}
                            className={cn(
                              "transition-transform",
                              isAr
                                ? "rotate-180 group-hover:-translate-x-0.5"
                                : "group-hover:translate-x-0.5",
                            )}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Action lanes — not a mini Library */}
      <div className="mt-5 md:mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-border bg-card rounded-xl overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4 space-y-1">
            <div className="flex items-center gap-2">
              <PlayCircle size={16} className="text-primary" />
              <CardTitle className="text-sm font-bold">Continue</CardTitle>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">
              Drafts & unfinished work
            </p>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-muted/60 animate-pulse" />
              ))
            ) : continueItems.length === 0 ? (
              <EmptyState
                icon={ImageIcon}
                title="Nothing to resume"
                description="Start in Image Studio — drafts will land here."
                actionLabel="Open Image Studio"
                onAction={() => navigate("/create/image")}
                className="!p-4 !rounded-xl"
              />
            ) : (
              continueItems.map((item) => (
                <ActionThumb
                  key={item.id}
                  item={item}
                  cta={
                    (item.status || "").includes("fail") ||
                    (item.status || "").includes("reject")
                      ? "Fix & retry"
                      : "Resume"
                  }
                  onOpen={() => openCreation(navigate, item)}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card rounded-xl overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4 space-y-1">
            <div className="flex items-center gap-2">
              <Radio size={16} className="text-rose-500" />
              <CardTitle className="text-sm font-bold">Ready to go Live</CardTitle>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">
              Published on Feed — push to social
            </p>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-muted/60 animate-pulse" />
              ))
            ) : readyItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-4 text-center space-y-2">
                <AlertCircle size={18} className="mx-auto text-muted-foreground/50" />
                <p className="text-[12px] font-medium text-muted-foreground">
                  Publish from Studio or Library, then schedule Live from Feed.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-[11px] font-bold"
                  onClick={() => navigate("/feed")}
                >
                  Open Feed
                </Button>
              </div>
            ) : (
              readyItems.map((item) => (
                <ActionThumb
                  key={item.id}
                  item={item}
                  cta="Go Live"
                  onOpen={() => navigate(`/feed/post/${item.id}`)}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card rounded-xl overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4 space-y-1">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-teal-600 dark:text-teal-400" />
              <CardTitle className="text-sm font-bold">This week</CardTitle>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">
              Plan hooks from Coach
            </p>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {weekDays.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-4 text-center space-y-2">
                <p className="text-[12px] font-medium text-muted-foreground">
                  No week plan yet — generate one with Creator Coach.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    size="sm"
                    variant="brand"
                    className="h-8 text-[11px] font-bold"
                    onClick={() => {
                      beginWeekPlanRenewal();
                      navigate("/coach");
                    }}
                  >
                    Build week plan
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-[11px] font-bold"
                    onClick={() => navigate("/dashboard")}
                  >
                    Dashboard
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {weekDays.map((day) => (
                  <button
                    key={`${day.day}-${day.theme}`}
                    type="button"
                    onClick={() => navigate("/create/image")}
                    className="w-full rounded-xl border border-border/70 bg-muted/30 p-3 text-start hover:border-teal-500/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {day.day}
                      </span>
                      <Badge variant="secondary" className="h-4 text-[8px] font-bold">
                        {day.contentType}
                      </Badge>
                    </div>
                    <p className="text-[13px] font-semibold text-foreground line-clamp-2">
                      {day.title || day.theme}
                    </p>
                    {day.hook ? (
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                        {day.hook}
                      </p>
                    ) : null}
                  </button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-8 text-[11px] font-bold"
                  onClick={() => navigate("/coach")}
                >
                  Open Coach
                  <ChevronRight size={12} className="ms-1" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
