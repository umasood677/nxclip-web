/** Map Content API status → clean glass status pills with a status dot */

export type StatusBadgeInfo = {
  label: string;
  /** Pill surface classes */
  className: string;
  /** Colored indicator dot */
  dotClassName: string;
};

export function isReferenceAsset(item: { storageKey?: string | null }): boolean {
  return Boolean(item.storageKey?.startsWith("uploads/"));
}

const PILL_BASE =
  "bg-black/45 text-white/95 border border-white/15 backdrop-blur-md shadow-sm";

export function getStatusBadge(status?: string): StatusBadgeInfo | null {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s === "draft") {
    return { label: "Draft", className: PILL_BASE, dotClassName: "bg-amber-400" };
  }
  if (s === "published") {
    return { label: "Published", className: PILL_BASE, dotClassName: "bg-emerald-400" };
  }
  if (s === "processing" || s === "publishing") {
    return {
      label: s === "publishing" ? "Publishing" : "Processing",
      className: PILL_BASE,
      dotClassName: "bg-sky-400",
    };
  }
  if (s === "generation_failed" || s === "moderation_rejected") {
    return {
      label: s === "moderation_rejected" ? "Rejected" : "Failed",
      className: PILL_BASE,
      dotClassName: "bg-red-400",
    };
  }
  if (s === "queued") {
    return { label: "Queued", className: PILL_BASE, dotClassName: "bg-orange-400" };
  }
  if (s === "archived" || s === "deleted") {
    return {
      label: s === "deleted" ? "Deleted" : "Archived",
      className: PILL_BASE,
      dotClassName: "bg-zinc-400",
    };
  }
  return {
    label: status.replace(/_/g, " "),
    className: `${PILL_BASE} capitalize`,
    dotClassName: "bg-white/70",
  };
}

/** Prefer Reference over Draft/status when the asset is an uploaded reference. */
export function getDisplayStatusBadge(item: {
  status?: string;
  storageKey?: string | null;
}): StatusBadgeInfo | null {
  if (isReferenceAsset(item)) {
    return {
      label: "Reference",
      className: PILL_BASE,
      dotClassName: "bg-violet-400",
    };
  }
  return getStatusBadge(item.status);
}

export function formatCreatedDate(timestamp: number | string): string {
  try {
    const t = typeof timestamp === "string" ? new Date(timestamp).getTime() : timestamp;
    return new Date(t).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function formatCreatedTime(timestamp: number | string): string {
  try {
    const t = typeof timestamp === "string" ? new Date(timestamp).getTime() : timestamp;
    return new Date(t).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}
