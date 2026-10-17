/**
 * Resolve Brand Kit asset ids → temporary browser URLs.
 *
 * Uses authenticated Brand Kit DTOs (`readUrl` from GET /brands).
 * Never accepts or returns private storageKey values.
 */

import type { BrandAssetEntry, BrandKitSummary } from "../../BrandKits/lib/brandKitTypes";

const ROLE_ALIASES: Record<string, string[]> = {
  logo: ["logo_primary", "logo_mark", "logo_secondary", "logo_light", "logo_dark"],
  product: ["product_image"],
  model: ["brand_model"],
  campaign: ["campaign_reference"],
};

export type BrandAssetUrlMap = Readonly<Record<string, string>>;

function isReady(asset: BrandAssetEntry): boolean {
  return !asset.status || asset.status === "ready";
}

/** Map assetId → readUrl for ready assets that have a signed/public read URL. */
export function buildBrandAssetUrlMap(
  brand?: BrandKitSummary | null,
): BrandAssetUrlMap {
  const out: Record<string, string> = {};
  for (const asset of brand?.assets ?? []) {
    if (!asset?.id || !isReady(asset)) continue;
    const url = typeof asset.readUrl === "string" ? asset.readUrl.trim() : "";
    if (!url) continue;
    // Reject accidental storage-key-shaped values leaking into readUrl.
    if (url.startsWith("brands/") || !/^https?:\/\//i.test(url)) continue;
    out[asset.id] = url;
  }
  return out;
}

/**
 * Optional secondary index: private storageKey → readUrl for legacy layers
 * that only have storageKey. Never expose the key to <img src>.
 * Uses runtime kit payload when the API includes storageKey for owners.
 */
export function buildBrandAssetUrlMapByStorageKey(
  brand?: BrandKitSummary | null,
): BrandAssetUrlMap {
  const out: Record<string, string> = {};
  for (const asset of brand?.assets ?? []) {
    if (!asset?.id || !isReady(asset)) continue;
    const url = typeof asset.readUrl === "string" ? asset.readUrl.trim() : "";
    if (!url || !/^https?:\/\//i.test(url) || url.startsWith("brands/")) continue;
    const key = (asset as { storageKey?: string }).storageKey?.trim();
    if (key && !/^https?:\/\//i.test(key)) {
      out[key] = url;
    }
  }
  return out;
}

export function resolveLayerAssetUrl(
  assetUrls: BrandAssetUrlMap | undefined,
  storageKeyUrls: BrandAssetUrlMap | undefined,
  layer: { assetId?: string; storageKey?: string },
): string | null {
  const byId = resolveAssetUrl(assetUrls, layer.assetId);
  if (byId) return byId;
  const key = layer.storageKey?.trim();
  if (!key || /^https?:\/\//i.test(key)) return null;
  const byKey = storageKeyUrls?.[key];
  if (byKey && /^https?:\/\//i.test(byKey)) return byKey;
  return null;
}

export type BoundSlotAsset = {
  assetId: string;
  role: string;
  label?: string | null;
};

/** Role-matched ready assets from the kit (stable id order). No storageKey. */
export function listBrandAssetsBySlotRole(
  brand: BrandKitSummary | null | undefined,
  slotRole: string,
): BoundSlotAsset[] {
  const roles = ROLE_ALIASES[slotRole] ?? [slotRole];
  const hits = (brand?.assets ?? []).filter(
    (a) =>
      a?.id &&
      isReady(a) &&
      a.role &&
      roles.includes(a.role) &&
      typeof a.readUrl === "string" &&
      /^https?:\/\//i.test(a.readUrl.trim()),
  );
  return hits
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((a) => ({
      assetId: a.id,
      role: a.role!,
      label: a.label,
    }));
}

export function resolveAssetUrl(
  assetUrls: BrandAssetUrlMap | undefined,
  assetId?: string | null,
): string | null {
  if (!assetId) return null;
  const url = assetUrls?.[assetId];
  if (!url || !/^https?:\/\//i.test(url)) return null;
  return url;
}
