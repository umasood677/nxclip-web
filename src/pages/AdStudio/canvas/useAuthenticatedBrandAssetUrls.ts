import { useEffect, useState } from "react";
import type { BrandKitSummary } from "../../BrandKits/lib/brandKitTypes";
import { getAccessToken } from "../../../services/auth/authService";
import {
  buildBrandAssetUrlMap,
  type BrandAssetUrlMap,
} from "./brandAssetUrls";

const AUTH_MEDIA_RE = /\/brands\/[^/]+\/assets\/[^/]+\/media(?:\?|$)/i;

/**
 * Brand Kit `readUrl` values for local/gateway media require Authorization.
 * `<img src>` cannot send Bearer tokens, so hydrate those URLs to blob: object URLs.
 * Public https readUrls (e.g. signed GCS) pass through unchanged.
 */
export function useAuthenticatedBrandAssetUrls(
  brandKit: BrandKitSummary | null | undefined,
): BrandAssetUrlMap {
  const [urls, setUrls] = useState<BrandAssetUrlMap>(() =>
    buildBrandAssetUrlMap(brandKit),
  );

  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];
    const base = buildBrandAssetUrlMap(brandKit);
    setUrls(base);

    const token = getAccessToken();
    const entries = Object.entries(base).filter(([, url]) =>
      AUTH_MEDIA_RE.test(url),
    );
    if (!token || entries.length === 0) {
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      const next: Record<string, string> = { ...base };
      await Promise.all(
        entries.map(async ([id, url]) => {
          try {
            const parsedUrl = new URL(url, window.location.origin);

            const isProtectedBrandMedia =
              /^\/brands\/[^/]+\/assets\/[^/]+\/media\/?$/i.test(parsedUrl.pathname);

            const fetchUrl = isProtectedBrandMedia
              ? `/api/gateway-proxy${parsedUrl.pathname}${parsedUrl.search}`
              : url;

            const res = await fetch(fetchUrl, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              redirect: "error",
            });
            if (!res.ok) return;
            const blob = await res.blob();
            if (!blob.type.startsWith("image/") && blob.size < 32) return;
            const obj = URL.createObjectURL(blob);
            created.push(obj);
            next[id] = obj;
          } catch {
            /* keep gateway URL — SceneStage shows unavailable on error */
          }
        }),
      );
      if (!cancelled) setUrls(next);
    })();

    return () => {
      cancelled = true;
      for (const u of created) URL.revokeObjectURL(u);
    };
  }, [brandKit]);

  return urls;
}
