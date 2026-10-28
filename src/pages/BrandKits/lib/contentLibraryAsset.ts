import type { ContentDto } from "../../../services/apiClient";
export const MAX_BRAND_IMAGE_BYTES = 25 * 1024 * 1024;
export function selectableBrandImage(
  item: Pick<ContentDto, "contentType" | "status">,
): boolean {
  return (
    ["image", "meme"].includes(item.contentType) &&
    ![
      "deleted",
      "processing",
      "generation_failed",
      "moderation_rejected",
    ].includes(item.status)
  );
}
/** Owner-scoped record, fetched through the app media API; no arbitrary URL or token in query. */
export async function readLibraryImageFile(
  contentId: string,
  token: string,
  gateway: string,
  request: typeof fetch = fetch,
): Promise<File> {
  if (!contentId || !token)
    throw new Error("Sign in again before selecting an asset.");
  const response = await request(
    `/api/gateway-proxy/content/${encodeURIComponent(contentId)}/media`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Target-Gateway-Url": gateway,
      },
      credentials: "same-origin",
      redirect: "error",
    },
  );
  if (!response.ok)
    throw new Error(
      `Content Library image could not be read (${response.status}).`,
    );
  const length = Number(response.headers.get("content-length") || 0);
  if (length > MAX_BRAND_IMAGE_BYTES)
    throw new Error("Choose an image smaller than 25 MB.");
  const blob = await response.blob();
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(blob.type) ||
    !blob.size ||
    blob.size > MAX_BRAND_IMAGE_BYTES
  )
    throw new Error("Choose a PNG, JPEG or WebP image smaller than 25 MB.");
  const ext = blob.type === "image/jpeg" ? "jpg" : blob.type.split("/")[1];
  return new File([blob], `library-${contentId}.${ext}`, { type: blob.type });
}
