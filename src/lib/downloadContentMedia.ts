import { getAccessToken } from "../services/auth/authService";
import { buildGatewayProxyUrl } from "./authenticatedMediaUrl";
import { resolveContentKind } from "./contentKind";

function guessExtension(contentType: string | null | undefined, kind: "image" | "meme" | "clip"): string {
  const ct = (contentType || "").toLowerCase();
  if (ct.includes("mp4") || kind === "clip") return "mp4";
  if (ct.includes("webm")) return "webm";
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  if (ct.includes("svg")) return "svg";
  return kind === "clip" ? "mp4" : "png";
}

/**
 * Download content media via authenticated gateway media route (supports video clips).
 */
export async function downloadContentMedia(item: {
  id: string;
  title?: string | null;
  contentType?: string | null;
  type?: string | null;
  mimeType?: string | null;
  style?: string | null;
  memeSpec?: unknown;
  renderStatus?: string | null;
  storageKey?: string | null;
}): Promise<void> {
  const kind = resolveContentKind(item);
  const useRender = String(item.renderStatus || "").toLowerCase() === "completed";
  const path = `/content/${item.id}/media${useRender ? "?variant=render" : ""}`;
  const url = buildGatewayProxyUrl(path);
  const token = getAccessToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const ext = guessExtension(blob.type || item.mimeType, kind);
  const safeTitle = (item.title || kind || "nxclip")
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `${safeTitle || "nxclip"}.${ext}`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
