import { useEffect, useState } from "react";
import type { BrandKitSummary } from "../../BrandKits/lib/brandKitTypes";
import { getAccessToken } from "../../../services/auth/authService";
import { buildBrandAssetUrlMap, type BrandAssetUrlMap } from "./brandAssetUrls";

import { resolveBaseGatewayUrl } from "../../../services/apiClient";
import {
  protectedBrandMediaPath,
  isUsableBrandImage,
} from "../../BrandKits/lib/secureBrandMedia";

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
    const entries = Object.entries(base).filter(
      ([, url]) => protectedBrandMediaPath(url, brandKit?.id || "") !== null,
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
            const path = protectedBrandMediaPath(url, brandKit?.id || "");
            if (!path) return;
            const fetchUrl = `/api/gateway-proxy${path}`;
            const res = await fetch(fetchUrl, {
              headers: {
                Authorization: `Bearer ${token}`,
                "X-Target-Gateway-Url": resolveBaseGatewayUrl(),
              },
              redirect: "error",
            });
            if (!res.ok) return;
            const blob = await res.blob();
            if (cancelled || !isUsableBrandImage(blob)) return;
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
