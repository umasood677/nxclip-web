import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell,
  Zap,
  Sparkles,
  MessageSquare,
  Sparkle,
  Clock,
  X,
  ArrowRight,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useAppSelector } from "../store/hooks";
import { selectAuthProfile } from "../store/slices/authSlice";
import { markUpgradeNudgeShown } from "../lib/upgradeNudge";
import { notificationApi } from "../services/apiClient";
import { NotificationItem } from "../types";

interface NotificationPanelProps {
  isCollapsed: boolean;
  notifications: NotificationItem[];
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
}

const NOTIF_CONFIG = {
  engagement: { icon: MessageSquare, color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Engagement" },
  update: { icon: Zap, color: "text-amber-400", bg: "bg-amber-500/10", label: "Update" },
  insight: { icon: Sparkles, color: "text-purple-400", bg: "bg-purple-500/10", label: "Insight" },
  billing: { icon: Sparkle, color: "text-pink-400", bg: "bg-pink-500/10", label: "Upgrade" },
};

type FilterType = "all" | "engagement" | "update" | "insight" | "billing";

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isCollapsed,
  notifications,
  setNotifications,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const profile = useAppSelector(selectAuthProfile);
  const [filter, setFilter] = useState<FilterType>("all");

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    void Promise.allSettled(
      notifications
        .filter((n) => n.unread && !n.id.startsWith("upgrade-nudge") && !n.id.startsWith("eng-") && !n.id.startsWith("ins-") && !n.id.startsWith("onb-") && !n.id.startsWith("bill-"))
        .map((n) => notificationApi.markAsRead(n.id)),
    );
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const openNotification = (notif: NotificationItem) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, unread: false } : n)),
    );
    const isLocalId = /^(upgrade-nudge|eng-|ins-|onb-|bill-|live-)/.test(notif.id);
    if (!isLocalId) {
      void notificationApi.markAsRead(notif.id).catch(() => undefined);
    }
    if (notif.href === "/upgrade" || notif.id.startsWith("upgrade-nudge")) {
      markUpgradeNudgeShown(profile?.plan);
      navigate("/upgrade");
      return;
    }
    if (notif.href) {
      navigate(notif.href);
      return;
    }
    navigate("/notifications");
  };

  const unreadCount = notifications.filter((n) => n.unread).length;
  const filteredNotifications = notifications.filter(
    (n) => filter === "all" || n.type === filter,
  );

  if (isCollapsed) {
    return null;
  }

  return (
    <div className="flex flex-col h-[400px]">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-primary" />
          <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">
            {t("nav.live_alerts", { defaultValue: "Live Alerts" })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-[9px] font-bold text-primary hover:text-primary/80 transition-colors"
            >
              {t("nav.mark_all_read", { defaultValue: "Mark all read" })}
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-2 border-b border-border flex items-center gap-1 overflow-x-auto no-scrollbar bg-card">
        {(["all", "engagement", "update", "insight", "billing"] as FilterType[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1 rounded-full text-[10px] font-bold transition-all whitespace-nowrap",
              filter === f
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/50 text-muted-foreground hover:bg-muted",
            )}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-grow overflow-y-auto p-2 space-y-2 no-scrollbar">
        <AnimatePresence initial={false} mode="popLayout">
          {filteredNotifications.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full py-8 text-center"
            >
              <div className="p-3 rounded-full bg-muted/30 mb-2">
                <Bell size={24} className="text-muted-foreground/30" />
              </div>
              <p className="text-[11px] text-muted-foreground font-medium">
                {t("nav.no_alerts", { defaultValue: "No alerts yet" })}
              </p>
            </motion.div>
          ) : (
            filteredNotifications.map((notif) => {
              const config = NOTIF_CONFIG[notif.type] || NOTIF_CONFIG.insight;
              const Icon = config.icon;

              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    "p-3 rounded-xl border border-border/50 bg-muted/20 group relative overflow-hidden transition-all hover:bg-muted/40",
                    notif.unread && "border-primary/20 bg-primary/5",
                  )}
                >
                  <button
                    type="button"
                    className="flex gap-3 w-full text-left"
                    onClick={() => openNotification(notif)}
                  >
                    <div className={cn("shrink-0 p-2 rounded-lg h-fit", config.bg, config.color)}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-bold text-foreground truncate">
                          {notif.title}
                        </span>
                        <div className="flex items-center gap-2">
                          {notif.unread && <span className="w-1.5 h-1.5 bg-primary rounded-full" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                        {notif.description}
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[9px] font-medium text-muted-foreground/60 flex items-center gap-1.5">
                          <Clock size={10} />
                          {notif.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                          {notif.href === "/upgrade"
                            ? t("notifications.upgrade.cta_short", { defaultValue: "Upgrade" })
                            : "Open"}{" "}
                          <ArrowRight size={10} />
                        </span>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearNotification(notif.id);
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded-md"
                    aria-label="Dismiss"
                  >
                    <X size={12} className="text-muted-foreground" />
                  </button>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      <div className="p-3 border-t border-border bg-muted/10">
        <Link
          to="/notifications"
          className="flex items-center justify-center w-full py-2 rounded-xl text-[11px] font-bold bg-muted hover:bg-muted/80 transition-all text-muted-foreground"
        >
          {t("nav.view_all_notifications", { defaultValue: "View all notifications" })}
        </Link>
      </div>
    </div>
  );
};
