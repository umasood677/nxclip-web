/**
 * Journey B reference uploads live under uploads/…
 * Animate masters historically used uploads/…/animated.mp4 — never treat those as references.
 */
export function isReferenceAsset(item: {
  storageKey?: string | null;
  contentType?: string | null;
  type?: string | null;
  clipEditSpec?: unknown;
}): boolean {
  const key = item.storageKey || "";
  if (!key.startsWith("uploads/")) return false;
  if (isLegacyAnimateMaster(item)) return false;
  const ct = String(item.contentType || item.type || "")
    .trim()
    .toLowerCase();
  if (ct === "clip" || ct === "video") return false;
  return true;
}

/** User-uploaded source file (reference still or Clip Studio video) — not NxClip-generated. */
export function isSourceUpload(item: {
  storageKey?: string | null;
  clipEditSpec?: unknown;
}): boolean {
  const key = item.storageKey || "";
  if (!key.startsWith("uploads/")) return false;
  return !isLegacyAnimateMaster(item);
}

function isLegacyAnimateMaster(item: {
  storageKey?: string | null;
  clipEditSpec?: unknown;
}): boolean {
  const key = item.storageKey || "";
  if (key.includes("/animated.mp4") || key.endsWith("animated.mp4")) return true;
  if (
    item.clipEditSpec &&
    typeof item.clipEditSpec === "object" &&
    (item.clipEditSpec as { animate?: unknown }).animate
  ) {
    return true;
  }
  return false;
}

/** Clip produced by NxClip (animate-from-still, I2V, Ken Burns) — not a user-uploaded video. */
export function isNxClipGeneratedClip(item: {
  storageKey?: string | null;
  contentType?: string | null;
  type?: string | null;
  clipEditSpec?: unknown;
}): boolean {
  const ct = String(item.contentType || item.type || "")
    .trim()
    .toLowerCase();
  if (ct !== "clip" && ct !== "video") return false;
  if (isSourceUpload(item)) return false;
  return true;
}
