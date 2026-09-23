import { Outlet, useLocation } from "react-router-dom";
import AppShell from "../AppShell";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, Clapperboard, FileImage, Home, LayoutDashboard, LayoutGrid, Sparkles, User, Video } from "lucide-react";

/**
 * DashboardLayout wraps authenticated routes with the AppShell.
 * It provides a consistent navigation experience across the dashboard.
 */
export default function DashboardLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const [title, setTitle] = useState("");

  const isDashboard = location.pathname === "/dashboard";
  const isLibrary = location.pathname === "/my-content" || location.pathname === "/library";
  const isFeed = location.pathname === "/feed";
  const isAnalytics = location.pathname === "/analytics";
  const isImageStudio =
    location.pathname.startsWith("/create/image") || location.pathname === "/image-studio";
  const isClipEditor = location.pathname.startsWith("/create/clip");
  const isCreateHub = location.pathname === "/create";
  const isPostDetail = location.pathname.startsWith("/feed/post/");
  const isProfile =
    location.pathname === "/profile" ||
    location.pathname.startsWith("/profile/") ||
    location.pathname.startsWith("/users/");

  useEffect(() => {
    const path = location.pathname;
    const pathMap: Record<string, string> = {
      "/feed": t("nav.home_feed"),
      "/dashboard": t("nav.dashboard"),
      "/create": t("nav.create_hub"),
      "/analytics": t("analytics.title", { defaultValue: "Creator Analytics" }),
      "/coach": t("nav.coach"),
      "/my-content": t("nav.content_library"),
      "/library": t("nav.content_library"),
      "/profile": t("profile.title"),
      "/profile/edit": t("profile.edit.title"),
      "/settings": t("nav.settings"),
      "/admin": t("nav.admin_panel"),
      "/upgrade": t("nav.upgrade_pro"),
      "/notifications": t("top_bar.notifications"),
      "/image-studio": t("nav.image_studio"),
    };

    if (path.startsWith("/feed/post/")) {
      setTitle(t("post.detail", { defaultValue: "Post details" }));
    } else if (path.startsWith("/users/")) {
      setTitle(t("user.profile", { defaultValue: "Creator profile" }));
    } else if (path.startsWith("/create/image") || path === "/image-studio") {
      setTitle(t("nav.image_studio"));
    } else if (path.startsWith("/create/clip")) {
      setTitle(t("nav.clip_editor"));
    } else {
      setTitle(pathMap[path] || t("nav.dashboard"));
    }
  }, [location.pathname, t]);

  const subtitle = useMemo(() => {
    if (isDashboard) {
      return t("dashboard.header.subtitle", {
        defaultValue: "Your content is trending up across all platforms.",
      });
    }
    if (isLibrary) {
      return t("content_library.subtitle", {
        defaultValue: "Manage your AI-generated clips and images.",
      });
    }
    if (isFeed) {
      return t("home.header.subtitle", {
        defaultValue: "Your daily command center for stills, clips, Live posts, and growth.",
      });
    }
    if (isAnalytics) {
      return t("analytics.description", {
        defaultValue: "Track still, clip, and Live performance across YouTube, Instagram, TikTok, and Facebook.",
      });
    }
    if (isImageStudio) {
      return t("image_studio.header.subtitle", {
        defaultValue: "Generate images and memes with AI.",
      });
    }
    if (isCreateHub) {
      return t("create.header.subtitle", {
        defaultValue: "Pick a studio and start creating.",
      });
    }
    if (isClipEditor) {
      return t("clip_editor.header.subtitle", {
        defaultValue: "Upload and edit short-form clips.",
      });
    }
    return undefined;
  }, [isDashboard, isLibrary, isFeed, isAnalytics, isImageStudio, isCreateHub, isClipEditor, t]);

  const titleIcon = isDashboard ? (
    <LayoutDashboard className="h-4 w-4" />
  ) : isLibrary ? (
    <Clapperboard className="h-4 w-4" />
  ) : isFeed ? (
    <Home className="h-4 w-4" />
  ) : isAnalytics ? (
    <BarChart3 className="h-4 w-4" />
  ) : isImageStudio ? (
    <Sparkles className="h-4 w-4" />
  ) : isClipEditor ? (
    <Video className="h-4 w-4" />
  ) : isCreateHub ? (
    <LayoutGrid className="h-4 w-4" />
  ) : isPostDetail ? (
    <FileImage className="h-4 w-4" />
  ) : isProfile ? (
    <User className="h-4 w-4" />
  ) : undefined;

  const dense =
    isLibrary ||
    isFeed ||
    isAnalytics ||
    isImageStudio ||
    isCreateHub ||
    isClipEditor ||
    isPostDetail ||
    isDashboard;

  return (
    <AppShell title={title} subtitle={subtitle} titleIcon={titleIcon} dense={dense}>
      <Outlet />
    </AppShell>
  );
}
