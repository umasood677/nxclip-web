import { Outlet, useLocation } from "react-router-dom";
import AppShell from "../AppShell";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Clapperboard, Home, Sparkles, Video, LayoutGrid } from "lucide-react";

/**
 * DashboardLayout wraps authenticated routes with the AppShell.
 * It provides a consistent navigation experience across the dashboard.
 */
export default function DashboardLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const [title, setTitle] = useState("");

  const isLibrary = location.pathname === "/my-content" || location.pathname === "/library";
  const isFeed = location.pathname === "/feed";
  const isImageStudio =
    location.pathname.startsWith("/create/image") || location.pathname === "/image-studio";
  const isClipEditor = location.pathname.startsWith("/create/clip");
  const isCreateHub = location.pathname === "/create";

  useEffect(() => {
    const path = location.pathname;
    const pathMap: Record<string, string> = {
      "/feed": t("nav.home_feed"),
      "/dashboard": t("nav.dashboard"),
      "/create": t("nav.create_hub"),
      "/analytics": t("nav.analytics"),
      "/coach": t("nav.coach"),
      "/my-content": t("nav.content_library"),
      "/library": t("nav.content_library"),
      "/profile": t("top_bar.actions.profile"),
      "/settings": t("nav.settings"),
      "/admin": t("nav.admin_panel"),
      "/upgrade": t("nav.upgrade_pro"),
      "/notifications": t("top_bar.notifications"),
      "/image-studio": t("nav.image_studio"),
    };

    if (path.startsWith("/feed/post/")) setTitle(t("post.detail"));
    else if (path.startsWith("/users/")) setTitle(t("user.profile"));
    else if (path.startsWith("/create/image") || path === "/image-studio")
      setTitle(t("nav.image_studio"));
    else if (path.startsWith("/create/clip")) setTitle(t("nav.clip_editor"));
    else setTitle(pathMap[path] || t("nav.dashboard"));
  }, [location.pathname, t]);

  const subtitle = useMemo(() => {
    if (isLibrary) {
      return t("content_library.subtitle", {
        defaultValue: "Manage your AI-generated clips and images.",
      });
    }
    if (isFeed) {
      return t("home.header.subtitle", {
        defaultValue: "Your daily command center for gaming clips, memes, and growth.",
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
  }, [isLibrary, isFeed, isImageStudio, isCreateHub, isClipEditor, t]);

  const titleIcon = isLibrary ? (
    <Clapperboard className="h-4 w-4" />
  ) : isFeed ? (
    <Home className="h-4 w-4" />
  ) : isImageStudio ? (
    <Sparkles className="h-4 w-4" />
  ) : isClipEditor ? (
    <Video className="h-4 w-4" />
  ) : isCreateHub ? (
    <LayoutGrid className="h-4 w-4" />
  ) : undefined;

  const dense = isLibrary || isFeed || isImageStudio || isCreateHub || isClipEditor;

  return (
    <AppShell title={title} subtitle={subtitle} titleIcon={titleIcon} dense={dense}>
      <Outlet />
    </AppShell>
  );
}
