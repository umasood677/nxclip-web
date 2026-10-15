import { getAccessToken } from "../services/auth/authService";
import { buildGatewayProxyUrl } from "./authenticatedMediaUrl";
import { resolveContentKind } from "./contentKind";
import { contentApi } from "../services/apiClient";

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
 * Always ask the server to render from the saved clipEditSpec.
 * Server reuses the prior MP4 when the edit fingerprint is unchanged; otherwise
 * burns a new one so iterative edits download correctly without publishing.
 */
async function ensureClipRenderOnce(contentId: string): Promise<string> {
  const queued = await contentApi.renderClip(contentId, {});
  let status = String(queued.renderStatus || queued.status || "queued").toLowerCase();
  if (status === "completed") return status;

  const started = Date.now();
  while (Date.now() - started < 240_000) {
    await new Promise((r) => setTimeout(r, 2000));
    const polled = await contentApi.getOwnedContentById(contentId, {
      suppressErrorLog: true,
    });
    status = String(polled.renderStatus || status).toLowerCase();
    if (status === "completed" || status === "failed") break;
  }
  if (status !== "completed") {
    throw new Error(
      status === "failed"
        ? "Render failed on the server. Try again from Clip Studio."
        : "Render timed out. Try again in a moment.",
    );
  }
  return status;
}

/**
 * Download content media via authenticated gateway media route (supports video clips).
 * Clips: render once if needed, then reuse the completed burn-in on later downloads.
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
  /** When true (default for clips), ensure a completed render before fetch. */
  ensureRender?: boolean;
}): Promise<void> {
  const kind = resolveContentKind(item);
  let useRender = String(item.renderStatus || "").toLowerCase() === "completed";

  if (kind === "clip" && item.ensureRender !== false) {
    try {
      const status = await ensureClipRenderOnce(item.id);
      useRender = status === "completed";
    } catch (err) {
      // Published feed viewers may lack owner render APIs — fall through to media URL.
      if (String(item.renderStatus || "").toLowerCase() === "completed") {
        useRender = true;
      } else if (!(err instanceof Error && /403|401|forbidden|not owned/i.test(err.message))) {
        throw err;
      }
    }
  }

  // Prefer polished when completed; bust cache so iterative downloads get fresh bytes.
  const path = `/content/${item.id}/media${useRender ? `?variant=render&_=${Date.now()}` : `?_=${Date.now()}`}`;
  const url = buildGatewayProxyUrl(path);
  const token = getAccessToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: "include",
    cache: "no-store",
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
