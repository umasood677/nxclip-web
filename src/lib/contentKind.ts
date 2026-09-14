/** Resolve display kind for gallery tiles (API stores memes as contentType=image + style/memeSpec). */

export type ContentKind = "image" | "meme" | "clip";

export function resolveContentKind(item: {
  contentType?: string | null;
  type?: string | null;
  style?: string | null;
  memeSpec?: unknown;
}): ContentKind {
  const ct = String(item.contentType || item.type || "")
    .trim()
    .toLowerCase();
  if (ct === "clip" || ct === "video") return "clip";
  if (ct === "meme") return "meme";
  if (String(item.style || "").trim().toLowerCase() === "meme") return "meme";
  if (item.memeSpec && typeof item.memeSpec === "object") return "meme";
  return "image";
}

export function contentKindLabel(kind: ContentKind): string {
  if (kind === "meme") return "Meme";
  if (kind === "clip") return "Clip";
  return "Image";
}
