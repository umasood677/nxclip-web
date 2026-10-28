/** Canonicalize only this kit's authenticated media routes. Never forward a JWT to a supplied origin. */
export function protectedBrandMediaPath(
  url: string,
  brandId: string,
): string | null {
  try {
    const parsed = new URL(url, "http://nxclip.local");
    const path = parsed.pathname.replace(/^\/api\/gateway-proxy/, "");
    const match = /^\/brands\/([^/]+)\/assets\/([^/]+)\/media\/?$/.exec(path);
    return match && decodeURIComponent(match[1]) === brandId ? path : null;
  } catch {
    return null;
  }
}
export function isUsableBrandImage(blob: {
  type: string;
  size: number;
}): boolean {
  return (
    /^image\/(png|jpeg|webp|gif|svg\+xml|avif)$/i.test(blob.type) &&
    blob.size > 0 &&
    blob.size <= 25 * 1024 * 1024
  );
}
