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

function contentKindLabel(contentType?: string): string {
  const kind = String(contentType || "")
    .trim()
    .toLowerCase();
  if (kind === "clip" || kind === "video") return "clip";
  if (kind === "meme") return "meme";
  if (kind === "image") return "image";
  return "content";
}

/**
 * User-facing subject for a piece of content — never a truncated id.
 * Use `sentenceStart: true` when the phrase begins a sentence ("Your clip…").
 */
export function contentSubject(
  payload: Record<string, unknown> = {},
  opts?: { sentenceStart?: boolean },
): string {
  const title = String(payload.contentTitle || payload.title || "").trim();
  if (title) return `"${title}"`;
  const kind = contentKindLabel(
    String(payload.contentType || payload.content_type || ""),
  );
  const label =
    kind === "clip"
      ? "your clip"
      : kind === "meme"
        ? "your meme"
        : kind === "image"
          ? "your image"
          : "your content";
  if (opts?.sentenceStart) {
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  return label;
}

function libraryHref(payload: Record<string, unknown>): string {
  const contentId = String(payload.contentId || payload.content_id || "").trim();
  return contentId ? "/my-content" : "/notifications";
}

function clipStudioHref(payload: Record<string, unknown>): string {
  const contentId = String(payload.contentId || payload.content_id || "").trim();
  if (!contentId) return "/create/clip";
  return `/create/clip/${contentId}/edit?step=trim`;
}

function storyEngineHref(payload: Record<string, unknown>): string {
  const contentId = String(payload.contentId || payload.content_id || "").trim();
  // Story drafts are edited in Clip Studio's compose/polish flow after analyse.
  if (!contentId) return "/create/story-engine";
  return `/create/clip/${contentId}/edit?step=polish&compose=1`;
}

function imageStudioHref(): string {
  return "/create/image";
}

function renderKindOf(payload: Record<string, unknown>): "animate" | "polish" | "story" {
  const kind = String(payload.renderKind || "").toLowerCase();
  if (kind === "animate" || kind === "polish" || kind === "story") return kind;
  if (String(payload.contentType || "").toLowerCase() === "clip") {
    // Heuristic for older payloads without renderKind.
    return "polish";
  }
  return "polish";
}

function describeEvent(
  eventName: string,
  payload: Record<string, unknown> = {},
): {
  title: string;
  body: string;
  href?: string;
} {
  const subject = contentSubject(payload);
  const subjectStart = contentSubject(payload, { sentenceStart: true });
  const kind = contentKindLabel(String(payload.contentType || ""));
  const status = String(payload.status || "").toLowerCase();
  const reason = String(payload.reason || "").trim();
  const flags = Array.isArray(payload.flags)
    ? payload.flags.filter(Boolean).join(", ")
    : "";
  const renderKind = renderKindOf(payload);

  switch (eventName) {
    case "content:moderation_complete": {
      const approved = status === "approved" || status === "published";
      const published = status === "published";
      if (published) {
        return {
          title: "Post is live",
          body: `${subjectStart} is live on the Home feed.`,
          href: libraryHref(payload),
        };
      }
      if (approved) {
        return {
          title: "Cleared moderation",
          body: `${subjectStart} cleared moderation and can appear on the feed.`,
          href: libraryHref(payload),
        };
      }
      return {
        title: "Moderation rejected",
        body: flags
          ? `${subjectStart} was rejected by moderation (${flags}). Edit it and try publishing again.`
          : reason ||
            `${subjectStart} was rejected by moderation. Edit it and try publishing again.`,
        href: libraryHref(payload),
      };
    }
    case "content:generation_complete": {
      if (kind === "meme") {
        return {
          title: "Meme ready",
          body: `${subjectStart} is ready in Image Studio and your Library.`,
          href: libraryHref(payload),
        };
      }
      if (kind === "clip") {
        return {
          title: "Clip ready",
          body: `${subjectStart} is ready — open Clip Studio to polish and export.`,
          href: clipStudioHref(payload),
        };
      }
      return {
        title: "Image ready",
        body: `${subjectStart} is ready in Image Studio and your Library.`,
        href: libraryHref(payload),
      };
    }
    case "content:generation_failed": {
      if (kind === "meme") {
        return {
          title: "Meme generation failed",
          body:
            reason ||
            `${subjectStart} could not be generated. Open Image Studio to try again.`,
          href: imageStudioHref(),
        };
      }
      if (kind === "clip") {
        return {
          title: "Clip generation failed",
          body:
            reason ||
            `${subjectStart} could not be generated. Open Clip Studio or Image Studio to retry.`,
          href: imageStudioHref(),
        };
      }
      return {
        title: "Image generation failed",
        body:
          reason ||
          `${subjectStart} could not be generated. Open Image Studio to try again.`,
        href: imageStudioHref(),
      };
    }
    case "content:transcription_complete":
      return {
        title: "Transcript ready",
        body: `The transcript for ${subject} is ready. Open Clip Studio to review captions.`,
        href: clipStudioHref(payload),
      };
    case "content:captions_ready":
      return {
        title: "Captions ready",
        body: `Captions for ${subject} are ready to review in Clip Studio.`,
        href: clipStudioHref(payload),
      };
    case "content:polish_complete":
      return {
        title: "Polish complete",
        body: `${subjectStart} is polished and ready to preview in Clip Studio.`,
        href: clipStudioHref(payload),
      };
    case "content:render_complete": {
      if (renderKind === "animate") {
        return {
          title: "Animation ready",
          body: `${subjectStart} is ready — open Clip Studio to polish and export.`,
          href: clipStudioHref(payload),
        };
      }
      if (renderKind === "story") {
        return {
          title: "Story export ready",
          body: `Your story export for ${subject} is ready in your Library.`,
          href: libraryHref(payload),
        };
      }
      return {
        title: "Clip export ready",
        body: `The export for ${subject} is ready in your Library.`,
        href: libraryHref(payload),
      };
    }
    case "content:render_failed": {
      if (renderKind === "animate") {
        return {
          title: "Animation failed",
          body:
            reason ||
            `Animating ${subject} failed. Open Image Studio and try again.`,
          href: imageStudioHref(),
        };
      }
      if (renderKind === "story") {
        return {
          title: "Story export failed",
          body:
            reason ||
            `Exporting ${subject} failed. Open Story Engine to adjust sources and retry.`,
          href: storyEngineHref(payload),
        };
      }
      return {
        title: "Clip export failed",
        body:
          reason ||
          `Exporting ${subject} failed. Open Clip Studio to retry.`,
        href: clipStudioHref(payload),
      };
    }
    case "content:story_plan_ready": {
      const count = Number(payload.sourceCount);
      const sources =
        Number.isFinite(count) && count > 0
          ? ` from ${count} clip${count === 1 ? "" : "s"}`
          : "";
      return {
        title: "Story plan ready",
        body: `Your AI story plan${sources} for ${subject} is ready. Review it in Story Engine, then produce when you're set.`,
        href: storyEngineHref(payload),
      };
    }
    case "content:story_plan_failed":
      return {
        title: "Story plan failed",
        body:
          reason ||
          `We couldn't build a story plan for ${subject}. Open Story Engine to adjust sources and try again.`,
        href: storyEngineHref(payload),
      };
    case "content:processing":
      return {
        title: "Processing content",
        body: String(payload.step || `Working on ${subject}…`),
      };
    case "content:transcribing":
      return {
        title: "Transcribing",
        body: `Creating a transcript for ${subject}…`,
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
        body: reason || flags || "Open Notifications for details.",
      };
    }
  }
}

/** Normalize API (eventName/payload/readAt) or legacy (title/body/read) notification shapes. */
export function normalizeNotification(raw: RawNotification): NormalizedNotification {
  // Prefer regenerating copy from event + payload so older inbox rows lose truncated ids.
  if (raw.eventName && raw.payload && typeof raw.payload === "object") {
    const described = describeEvent(raw.eventName, raw.payload as Record<string, unknown>);
    return {
      id: raw.id,
      title: described.title,
      body: described.body,
      read: typeof raw.read === "boolean" ? raw.read : Boolean(raw.readAt),
      createdAt: raw.createdAt,
      eventName: raw.eventName,
      href: described.href,
    };
  }

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

/** Build live toast copy from a websocket event payload. */
export function describeNotificationEvent(
  eventName: string,
  payload: Record<string, unknown> = {},
): { title: string; body: string; href?: string } {
  return describeEvent(eventName, payload);
}
