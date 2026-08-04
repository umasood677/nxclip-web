import type { NotificationDto } from "../services/apiClient";

export interface NormalizedNotification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt?: string;
  eventName?: string;
}

type RawNotification = NotificationDto & {
  title?: string;
  body?: string;
  read?: boolean;
  eventName?: string;
  payload?: Record<string, unknown>;
  readAt?: string | null;
};

function describeEvent(eventName: string, payload: Record<string, unknown> = {}): { title: string; body: string } {
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
      };
    }
    case "content:generation_complete":
      return {
        title: "Generation complete",
        body: `Content${contentId ? ` ${contentId}…` : ""} is ready in your library.`,
      };
    case "content:generation_failed":
      return {
        title: "Generation failed",
        body: reason || `Generation failed${contentId ? ` for ${contentId}…` : ""}. You can retry in Image Studio.`,
      };
    case "content:transcription_complete":
      return {
        title: "Transcription ready",
        body: `Transcript is ready${contentId ? ` for ${contentId}…` : ""}.`,
      };
    case "content:processing":
      return {
        title: "Processing content",
        body: String(payload.step || `Working on ${contentId || "your content"}…`),
      };
    case "onboarding:complete":
      return {
        title: "Onboarding complete",
        body: "Your Creator Coach plan is ready.",
      };
    case "analytics:report_ready":
      return {
        title: "Analytics report ready",
        body: "Your weekly performance report is available.",
      };
    case "social:engagement":
      return {
        title: "New engagement",
        body: String(payload.message || "Someone interacted with your content."),
      };
    case "system:update":
      return {
        title: "System update",
        body: String(payload.message || payload.body || "There is a new system update."),
      };
    default: {
      const pretty = eventName.replace(/^content:/, "").replace(/_/g, " ");
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
  };
}

export function normalizeNotificationList(
  res: { items?: RawNotification[] } | RawNotification[] | null | undefined,
): NormalizedNotification[] {
  const items = Array.isArray(res) ? res : res?.items || [];
  return items.map(normalizeNotification);
}
