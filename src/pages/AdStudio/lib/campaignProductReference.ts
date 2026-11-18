import type { BrandAssetEntry, BrandKitSummary } from "../../BrandKits/lib/brandKitTypes";

export function approvedCampaignProductPhotos(brand: BrandKitSummary) {
  const approved = new Set(brand.voice?.studio?.approvedAssetIds ?? []);
  return (brand.assets ?? []).filter(asset =>
    asset.role === "product_image" && asset.status === "ready" && approved.has(asset.id),
  );
}

export function campaignProductSuggestion(
  brand: BrandKitSummary,
  photos: BrandAssetEntry[],
  campaignText: string,
) {
  const normalize = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const contains = (text: string, phrase: string) => !!phrase && ` ${text} `.includes(` ${phrase} `);
  const text = normalize(campaignText);
  const productNames = (brand.products ?? []).map(product => normalize(product.name)).filter(Boolean);
  const matches = photos.filter(photo => {
    const label = normalize(photo.label ?? "");
    return contains(text, label) || productNames.some(name => contains(text, name) && contains(label, name));
  });
  return matches.length === 1 ? matches[0] : undefined;
}
