import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell,
  TrendingUp,
  Zap,
  Sparkles,
  MessageSquare,
  CheckCircle2,
  Filter,
  Wifi,
  WifiOff,
  RefreshCw,
  ShieldCheck,
  Sparkle,
  Loader2,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";
import { cn } from "../../lib/utils";
import { socketService, SocketStatus, WebSocketEnvelope } from "../../services/socketService";
import { notificationApi } from "../../services/apiClient";
import { normalizeNotification, normalizeNotificationList } from "../../lib/notifications";
import { toast } from "sonner";
import { EmptyState } from "../../components/common/EmptyState";

interface ClientNotification {
  id: string;
  title: string;
  description: string;
  icon: typeof Bell;
  color: string;
  bg: string;
  time: string;
  date: string;
  unread: boolean;
  type: "trend" | "system" | "analytics" | "social" | "achievement" | "billing" | "moderation";
}

const TYPE_CONFIG = {
  trend: { icon: TrendingUp, color: "text-blue-400", bg: "bg-blue-500/10" },
  system: { icon: Zap, color: "text-amber-400", bg: "bg-amber-500/10" },
  analytics: { icon: Sparkles, color: "text-purple-400", bg: "bg-purple-500/10" },
  social: { icon: MessageSquare, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  achievement: { icon: CheckCircle2, color: "text-orange-400", bg: "bg-orange-500/10" },
  billing: { icon: Sparkle, color: "text-pink-400", bg: "bg-pink-500/10" },
  moderation: { icon: ShieldCheck, color: "text-indigo-400", bg: "bg-indigo-500/10" },
};

function inferType(title: string, body: string, eventName?: string): ClientNotification["type"] {
  const t = `${eventName || ""} ${title} ${body}`.toLowerCase();
  if (t.includes("moderat")) return "moderation";
  if (t.includes("bill") || t.includes("subscription")) return "billing";
  if (t.includes("analytic") || t.includes("report")) return "analytics";
  if (t.includes("social") || t.includes("follow") || t.includes("comment") || t.includes("engagement")) return "social";
  if (t.includes("trend")) return "trend";
  if (t.includes("achieve") || t.includes("unlock") || t.includes("onboarding")) return "achievement";
  return "system";
}

function toClient(raw: Parameters<typeof normalizeNotification>[0]): ClientNotification {
  const n = normalizeNotification(raw);
  const type = inferType(n.title, n.body, n.eventName);
  const cfg = TYPE_CONFIG[type];
  const created = n.createdAt ? new Date(n.createdAt) : new Date();
  return {
    id: n.id,
    title: n.title,
    description: n.body,
    icon: cfg.icon,
    color: cfg.color,
    bg: cfg.bg,
    time: created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    date: created.toLocaleDateString(),
    unread: !n.read,
    type,
  };
}

function fromSocket(
  title: string,
  description: string,
  type: ClientNotification["type"] = "system",
): ClientNotification {
  const cfg = TYPE_CONFIG[type];
  const now = new Date();
  return {
    id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    description,
    icon: cfg.icon,
    color: cfg.color,
    bg: cfg.bg,
    time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    date: now.toLocaleDateString(),
    unread: true,
    type,
  };
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [wsStatus, setWsStatus] = useState<SocketStatus>("disconnected");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [activeGeneration, setActiveGeneration] = useState<{
    contentId: string;
    progress: number;
    step: string;
  } | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationApi.getNotifications(undefined, 50);
      setNotifications(normalizeNotificationList(res).map((n) => toClient(n as any)));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load notifications";
      toast.error("Notifications", { description: message });
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    socketService.init();
    const unsubscribeStatus = socketService.onStatusChange(setWsStatus);

    const pushLive = (n: ClientNotification) => {
      setNotifications((prev) => [n, ...prev]);
    };

    const unsubProcessing = socketService.subscribe("content:processing", (_e, payload) => {
      const data = (payload as WebSocketEnvelope<any>)?.data || payload;
      setActiveGeneration({
        contentId: data.contentId || "—",
        progress: data.progress || 0,
        step: data.step || "Processing…",
      });
    });

    const unsubGenComplete = socketService.subscribe("content:generation_complete", (_e, payload) => {
      const data = (payload as WebSocketEnvelope<any>)?.data || payload;
      setActiveGeneration(null);
      pushLive(
        fromSocket(
          "Generation complete",
          `Content ${data.contentId || ""} is ready in your library.`,
          "system",
        ),
      );
      void loadNotifications();
    });

    const unsubModeration = socketService.subscribe("content:moderation_complete", (_e, payload) => {
      const data = (payload as WebSocketEnvelope<any>)?.data || payload;
      const status = String(data.status || "").toLowerCase();
      const approved = status === "approved" || status === "published";
      const published = status === "published";
      pushLive(
        fromSocket(
          published ? "Content published" : approved ? "Content approved" : "Content rejected",
          data.reason ||
            (published
              ? "Your post is live on the Home feed."
              : approved
                ? "Your post cleared moderation and can appear on the feed."
                : "Moderation rejected this draft — edit and re-publish."),
          "moderation",
        ),
      );
      void loadNotifications();
    });

    const unsubOnboarding = socketService.subscribe("onboarding:complete", () => {
      pushLive(fromSocket("Onboarding complete", "Your Creator Coach plan is ready.", "achievement"));
      void loadNotifications();
    });

    return () => {
      unsubscribeStatus();
      unsubProcessing();
      unsubGenComplete();
      unsubModeration();
      unsubOnboarding();
    };
  }, [loadNotifications]);

  const filtered = useMemo(() => {
    if (activeFilter === "all") return notifications;
    if (activeFilter === "unread") return notifications.filter((n) => n.unread);
    return notifications.filter((n) => n.type === activeFilter);
  }, [notifications, activeFilter]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n)),
    );
    if (id.startsWith("live-")) return;
    try {
      await notificationApi.markAsRead(id);
    } catch {
      /* non-blocking */
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => n.unread && !n.id.startsWith("live-"));
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    await Promise.allSettled(unread.map((n) => notificationApi.markAsRead(n.id)));
  };

  const filters = [
    { id: "all", label: "All" },
    { id: "unread", label: "Unread" },
    { id: "moderation", label: "Moderation" },
    { id: "system", label: "System" },
    { id: "analytics", label: "Analytics" },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] px-1 py-2 md:px-2 max-w-3xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-sm text-muted-foreground">
            Generation, moderation, and system updates from your account
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5",
              wsStatus === "connected" ? "text-emerald-500" : "text-muted-foreground",
            )}
          >
            {wsStatus === "connected" ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {wsStatus}
          </Badge>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground tabular-nums">
              {unreadCount} new
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => void loadNotifications()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => void markAllRead()}>
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {activeGeneration && (
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium">Processing {activeGeneration.contentId}</span>
              <span>{activeGeneration.progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${activeGeneration.progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">{activeGeneration.step}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {filters.map((f) => (
          <Button
            key={f.id}
            size="sm"
            variant={activeFilter === f.id ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setActiveFilter(f.id)}
          >
            {f.id === "all" && <Filter className="h-3 w-3 mr-1" />}
            {f.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="Publish content, finish onboarding, or wait for moderation updates — they will show up here."
        />
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {filtered.map((n) => {
              const Icon = n.icon;
              return (
                <motion.li
                  key={n.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <button
                    type="button"
                    onClick={() => void markRead(n.id)}
                    className={cn(
                      "w-full text-left rounded-2xl border p-4 transition-colors",
                      n.unread
                        ? "border-primary/25 bg-primary/5"
                        : "border-border/50 bg-card/40 hover:bg-muted/30",
                    )}
                  >
                    <div className="flex gap-3">
                      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", n.bg)}>
                        <Icon className={cn("h-5 w-5", n.color)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm">{n.title}</p>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {n.time}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{n.description}</p>
                        <p className="text-[10px] text-muted-foreground/70 mt-2">{n.date}</p>
                      </div>
                      {n.unread && <span className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />}
                    </div>
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

