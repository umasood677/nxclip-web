import { useEffect, useMemo, useState } from 'react';
import type { BrandKitSummary } from '../../BrandKits/lib/brandKitTypes';
import { useAuthToken } from '../../../services/auth/authService';
import { buildBrandAssetUrlMap, type BrandAssetUrlMap } from './brandAssetUrls';
import { resolveBaseGatewayUrl } from '../../../services/apiClient';
import { protectedBrandMediaPath } from '../../BrandKits/lib/secureBrandMedia';
import { brandMediaLoader } from './brandMediaLoader';

/** Share authenticated bytes; each mounted consumer owns and revokes its own blob URLs. */
export function useAuthenticatedBrandAssetUrls(brandKit: BrandKitSummary | null | undefined, reload=0): BrandAssetUrlMap {
  const token = useAuthToken(), gateway = typeof window === 'undefined' ? '' : resolveBaseGatewayUrl(), brandId = brandKit?.id || '';
  const signature = JSON.stringify(buildBrandAssetUrlMap(brandKit));
  const base: BrandAssetUrlMap = useMemo(() => JSON.parse(signature) as BrandAssetUrlMap, [signature]);
  const publicUrls = useMemo(() => Object.fromEntries(Object.entries(base).filter(([, url]) => !protectedBrandMediaPath(url, brandId))), [base, brandId]);
  const scope = brandId + '\0' + signature + '\0' + gateway + '\0' + token + '\0' + reload;
  const [hydrated, setHydrated] = useState<{scope: string; urls: BrandAssetUrlMap}>({scope: '', urls: {}});
  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];
    if (!token) { brandMediaLoader.clear(); return; }
    if(reload)brandMediaLoader.invalidate(brandId,Object.values(base));
    void (async () => {
      const next: Record<string, string> = {...publicUrls};
      await Promise.all(Object.entries(base).map(async ([id, url]) => {
        if (!protectedBrandMediaPath(url, brandId)) return;
        try {
          const blob = await brandMediaLoader.load(brandId, url, token, gateway);
          if (cancelled) return;
          const objectUrl = URL.createObjectURL(blob);
          created.push(objectUrl); next[id] = objectUrl;
        } catch { /* No automatic retry or unauthenticated img fallback. */ }
      }));
      if (!cancelled) setHydrated({scope, urls: next});
    })();
    return () => { cancelled = true; created.forEach(url => URL.revokeObjectURL(url)); };
  }, [base, brandId, gateway, publicUrls, scope, token, reload]);
  return hydrated.scope === scope ? hydrated.urls : publicUrls;
}
