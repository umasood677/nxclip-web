import { useEffect, useState } from "react";
import { adImageApi, resolveBaseGatewayUrl } from "../../../services/apiClient";
import { getAccessToken } from "../../../services/auth/authService";
/** Private generated assets use owner-authenticated media routes, never public/signed URLs. */
export function useCreativeAssetUrls(ids: readonly string[]) {
  const key = [...new Set(ids)].sort().join(","),
    [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];
    setUrls({});
    const token = getAccessToken();
    if (!token || !key) return;
    void (async () => {
      const next: Record<string, string> = {};
      await Promise.all(
        key.split(",").map(async (id) => {
          try {
            const list = await adImageApi.assets(id);
            for (const asset of list.items) {
              if (cancelled) return;
              if (
                asset.status !== "ready" ||
                asset.readUrl !== "/ad-studio/assets/" + asset.id + "/media"
              )
                continue;
              const r = await fetch("/api/gateway-proxy" + asset.readUrl, {
                headers: {
                  Authorization: "Bearer " + token,
                  "X-Target-Gateway-Url": resolveBaseGatewayUrl(),
                },
                redirect: "error",
              });
              if (!r.ok) continue;
              const image = await r.blob();
              if (cancelled) return;
              if (
                !image.type.startsWith("image/") ||
                image.size > 10 * 1024 * 1024
              )
                continue;
              const url = URL.createObjectURL(image);
              created.push(url);
              next[asset.id] = url;
            }
          } catch {
            /* Unavailable assets stay unresolved; no public URL fallback or token exposure. */
          }
        }),
      );
      if (!cancelled) setUrls(next);
    })();
    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [key]);
  return urls;
}
