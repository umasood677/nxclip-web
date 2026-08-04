import type { ContentDto } from "../../../services/apiClient";

/** Last path segment of a storage key, e.g. uploads/…/photo.png → photo.png */
export function fileNameFromStorageKey(storageKey?: string | null): string | undefined {
  if (!storageKey) return undefined;
  const parts = storageKey.split("/").filter(Boolean);
  const last = parts[parts.length - 1];
  if (!last) return undefined;
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

/** Generated assets are often stored as `{uuid}.ext` — not a useful display title. */
export function isGeneratedObjectFileName(name?: string | null): boolean {
  if (!name) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.[a-z0-9]+)?$/i.test(
    name.trim(),
  );
}

function isPlaceholderTitle(value?: string | null): boolean {
  const t = (value || "").trim().toLowerCase();
  return !t || t === "untitled" || t === "untitled creation";
}

/** Prefer API title, then upload filename from storageKey, then prompt/caption. */
export function resolveLibraryTitle(
  item: Pick<ContentDto, "title" | "caption" | "prompt" | "storageKey" | "captions">,
  untitled = "Untitled Creation",
): string {
  const titled = item.title?.trim();
  if (titled && !isPlaceholderTitle(titled) && !isUploadFileName(titled)) {
    return titled;
  }
  const caption = item.caption?.trim() || item.captions?.[0]?.trim();
  if (caption && !isUploadFileName(caption)) return caption;
  const prompt = item.prompt?.trim();
  if (prompt) return prompt.length > 80 ? `${prompt.slice(0, 80)}…` : prompt;
  const fromKey = fileNameFromStorageKey(item.storageKey);
  // Prefer real upload filenames; skip UUID-based generated object names and cover dumps
  if (fromKey && !isGeneratedObjectFileName(fromKey) && !isUploadFileName(fromKey)) {
    return fromKey;
  }
  if (titled && !isPlaceholderTitle(titled)) return titled;
  return untitled;
}

/** Filenames / cover dumps that should not be shown as human titles on Dashboard. */
export function isUploadFileName(name?: string | null): boolean {
  if (!name) return false;
  const n = name.trim();
  if (/\.(jpe?g|png|webp|gif|mp4|mov|webm)$/i.test(n)) return true;
  if (/^cover[-_]?\d+/i.test(n)) return true;
  return false;
}

/** Statuses / media gaps where the library tile should use the grey logo placeholder. */
export function isIncompleteLibraryItem(
  item: Pick<ContentDto, "status" | "storageKey" | "cdnUrl" | "thumbnailUrl" | "imageUrl">,
): boolean {
  const s = (item.status || "").toLowerCase();
  if (
    s === "generation_failed" ||
    s === "processing" ||
    s === "publishing" ||
    s === "queued" ||
    s === "moderation_rejected"
  ) {
    return true;
  }
  // No stored object and no real asset URL (only a synthetic /content/:id/media path left)
  const hasStoredObject = Boolean(item.storageKey?.trim());
  const hasDirectUrl = Boolean(
    item.cdnUrl?.trim() || item.thumbnailUrl?.trim() || item.imageUrl?.trim(),
  );
  if (!hasStoredObject && !hasDirectUrl) {
    return true;
  }
  return false;
}
