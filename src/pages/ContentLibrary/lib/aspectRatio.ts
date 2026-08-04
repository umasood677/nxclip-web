import { ContentDto } from "../../../services/apiClient";
import { normalizeAspectToken } from "../../../components/JustifiedGallery";

/**
 * Aspect ratio for a library item.
 *
 * Prefers the API field, falls back to the snake_case variant, then to a hint
 * embedded in the description ("with ratio: 9:16") for older records. Shared by
 * the gallery (which needs it to lay out rows) and the tile (which needs it to
 * decide between cropping and letterboxing).
 */
export function resolveItemAspectRatio(item: ContentDto): string | undefined {
  const direct = item.aspectRatio || (item as { aspect_ratio?: string }).aspect_ratio || undefined;
  if (direct && normalizeAspectToken(direct)) return direct;

  const fromDescription = (item.description || "").match(/ratio[:\s]+(\d+\s*[:/]\s*\d+)/i);
  if (fromDescription?.[1]) return fromDescription[1].replace(/\s+/g, "");

  return undefined;
}
