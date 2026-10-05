import type { NotificationDto } from "../services/apiClient";

export interface NormalizedNotification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt?: string;
  eventName?: string;
  href?: string;
}

type RawNotification = NotificationDto & {
  title?: string;
  body?: string;
  read?: boolean;
  eventName?: string;
  payload?: Record<string, unknown>;
  readAt?: string | null;
};

/** Streaming / progress events that must never appear in the notification inbox. */
export const EPHEMERAL_NOTIFICATION_EVENTS = new Set([
  "coach:token",
  "coach:progress",
  "content:processing",
  "content:transcribing",
]);

export function isEphemeralNotificationEvent(eventName?: string | null): boolean {
  if (!eventName) return false;
  return EPHEMERAL_NOTIFICATION_EVENTS.has(eventName);
}

function describeEvent(eventName: string, payload: Record<string, unknown> = {}): {
  title: string;
  body: string;
  href?: string;
} {
  const contentId = String(payload.contentId || payload.content_id || "").slice(0, 8);
  const status = String(payload.status || "");
  const reason = String(payload.reason || "");
  const flags = Array.isArray(payload.flags) ? payload.flags.join(", ") : "";

  switch (eventName) {
    case "content:moderation_complete": {
      const approved = status === "approved" || status === "published";
      const published = status === "published";
      return {
        title: published ? "Content published" : approved ? "Content approved" : "Content rejected",
        body:
          reason ||
          flags ||
          (published
            ? `Your post${contentId ? ` (${contentId}…)` : ""} is live on the Home feed.`
            : approved
              ? `Your post${contentId ? ` (${contentId}…)` : ""} cleared moderation and can appear on the feed.`
              : `Moderation rejected this draft${contentId ? ` (${contentId}…)` : ""} — edit and re-publish.`),
        href: contentId ? "/library" : "/notifications",
      };
    }
    case "content:generation_complete":
      return {
        title: "Generation complete",
        body: `Content${contentId ? ` ${contentId}…` : ""} is ready in your library.`,
        href: "/library",
      };
    case "content:generation_failed":
      return {
        title: "Generation failed",
        body: reason || `Generation failed${contentId ? ` for ${contentId}…` : ""}. You can retry in Image Studio.`,
        href: "/create/image",
      };
    case "content:transcription_complete":
      return {
        title: "Transcription ready",
        body: `Transcript is ready${contentId ? ` for ${contentId}…` : ""}.`,
        href: "/library",
      };
    case "content:render_complete":
      return {
        title: "Clip render ready",
        body: `Your export is ready${contentId ? ` for ${contentId}…` : ""}.`,
        href: "/library",
      };
    case "content:render_failed": {
      const friendly =
        /credits|spending limit|permission-denied|quota/i.test(reason)
          ? "Animation provider is out of credits or over its limit. Retry later, or ask an admin to top up xAI/Vertex / switch AI_VIDEO_PROVIDER."
          : reason;
      return {
        title: "Clip animation failed",
        body:
          friendly ||
          `Animate failed${contentId ? ` for ${contentId}…` : ""}. Open the draft in Image Studio and try again.`,
        href: "/create/image",
      };
    }
    case "content:processing":
      return {
        title: "Processing content",
        body: String(payload.step || `Working on ${contentId || "your content"}…`),
      };
    case "onboarding:complete":
      return {
        title: "Onboarding complete",
        body: String(payload.message || "Your Creator Coach plan is ready."),
        href: "/dashboard",
      };
    case "analytics:report_ready":
      return {
        title: "Analytics report ready",
        body: "Your weekly performance report is available.",
        href: "/analytics",
      };
    case "social:engagement":
      return {
        title: "New engagement",
        body: String(payload.message || "Someone interacted with your content."),
        href: "/profile",
      };
    case "social:distribution_update":
      return {
        title: "Social distribution update",
        body: String(payload.errorMessage || payload.status || "Your social post status changed."),
        href: "/profile",
      };
    case "billing:subscription_changed":
      return {
        title: "Subscription updated",
        body: `Your plan is now ${String(payload.plan || "updated")}.`,
        href: "/settings",
      };
    case "billing:upgrade_nudge":
      return {
        title: String(payload.title || "Upgrade your plan"),
        body: String(payload.body || payload.message || "Unlock more creator tools."),
        href: "/upgrade",
      };
    case "system:update":
      return {
        title: "System update",
        body: String(payload.message || payload.body || "There is a new system update."),
      };
    case "coach:token":
    case "coach:progress":
      return {
        title: "Creator Coach",
        body: String(payload.message || payload.token || "Coach is typing…"),
        href: "/coach",
      };
    default: {
      const pretty = eventName.replace(/^content:/, "").replace(/[_:]/g, " ");
      return {
        title: pretty.charAt(0).toUpperCase() + pretty.slice(1) || "Notification",
        body: reason || flags || (contentId ? `Related to content ${contentId}…` : "Open Notifications for details."),
      };
    }
  }
}

/** Normalize API (eventName/payload/readAt) or legacy (title/body/read) notification shapes. */
export function normalizeNotification(raw: RawNotification): NormalizedNotification {
  if (raw.title) {
    return {
      id: raw.id,
      title: raw.title,
      body: raw.body || "",
      read: typeof raw.read === "boolean" ? raw.read : Boolean(raw.readAt),
      createdAt: raw.createdAt,
      eventName: raw.eventName,
    };
  }

  const eventName = raw.eventName || "system:update";
  const payload = (raw.payload || {}) as Record<string, unknown>;
  const described = describeEvent(eventName, payload);

  return {
    id: raw.id,
    title: described.title,
    body: described.body,
    read: Boolean(raw.readAt) || raw.read === true,
    createdAt: raw.createdAt,
    eventName,
    href: described.href,
  };
}

export function normalizeNotificationList(
  res: { items?: RawNotification[] } | RawNotification[] | null | undefined,
): NormalizedNotification[] {
  const items = Array.isArray(res) ? res : res?.items || [];
  return items
    .map(normalizeNotification)
    .filter((n) => !isEphemeralNotificationEvent(n.eventName));
}
