import type { BrandKitSummary } from "./brandKitTypes";
export interface BrandImageUploadApi {
  requestAssetUploadUrl: (
    brandId: string,
    input: {
      role: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
      label?: string;
      description?: string;
      usageGuidance?: string;
    },
  ) => Promise<{ uploadUrl: string; assetId: string }>;
  confirmAsset: (brandId: string, assetId: string) => Promise<BrandKitSummary>;
}
/** Shared secure upload protocol. This neither approves an asset nor modifies profile permissions. */
export async function uploadBrandImage(
  api: BrandImageUploadApi,
  put: (url: string, file: File, mimeType: string) => Promise<unknown>,
  brandId: string,
  role: string,
  file: File,
  metadata: {
    label?: string;
    description?: string;
    usageGuidance?: string;
  } = {},
) {
  if (!brandId || !role || !file.type.startsWith("image/") || file.size <= 0)
    throw Error("Choose a non-empty image file for this Brand Kit.");
  const upload = await api.requestAssetUploadUrl(brandId, {
    role,
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
    ...metadata,
  });
  if (!upload.assetId || !upload.uploadUrl)
    throw Error("The secure upload request did not return an asset reference.");
  await put(upload.uploadUrl, file, file.type);
  const kit = await api.confirmAsset(brandId, upload.assetId);
  if (
    kit.id !== brandId ||
    !kit.assets?.some((asset) => asset.id === upload.assetId)
  )
    throw Error(
      "The uploaded asset's Brand Kit association could not be verified. Reload assets before retrying.",
    );
  return { kit, assetId: upload.assetId };
}
