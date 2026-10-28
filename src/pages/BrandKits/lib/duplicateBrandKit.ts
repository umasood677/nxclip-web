import { characterProfilesForDuplicate } from "../guided/brandCharacterModel";
import { brandApi } from "../../../services/apiClient";
import type { BrandKitSummary } from "./brandKitTypes";

/**
 * Client-side duplicate via create + replace APIs.
 * - New kit id + ownership for current user
 * - Colors, typography, voice, guidelines copied
 * - Assets are NOT copied (no cross-user storage keys / asset ids)
 */
export async function duplicateBrandKit(source: BrandKitSummary): Promise<BrandKitSummary> {
  const full = (await brandApi.getKit(source.id)) as BrandKitSummary;
  const baseName = (full.name || source.name || "Brand Kit").trim();
  const copyName = `${baseName} (copy)`.slice(0, 120);

  const voice = full.voice ? structuredClone(full.voice) : undefined;
  if(voice?.studio){voice.studio={...voice.studio,approvedAssetIds:[],characters:characterProfilesForDuplicate(voice.studio.characters||[]),identityApproved:false,guidelinesApproved:false};}
  // Drop any accidental asset id references if present in voice blobs
  if (voice && "assetId" in voice) {
    delete (voice as Record<string, unknown>).assetId;
  }

  let kit = (await brandApi.createKit({
    name: copyName,
    description: full.description ?? undefined,
    guidelines: full.guidelines ?? undefined,
    voice: voice as Record<string, unknown> | undefined,
  })) as BrandKitSummary;

  const colors = (full.colors ?? [])
    .filter((c) => c.hex)
    .map((c, i) => ({
      role: c.role || "custom",
      hex: c.hex,
      name: c.name,
      sortOrder: c.sortOrder ?? i,
    }));
  if (colors.length) {
    kit = (await brandApi.replaceColors(kit.id, colors)) as BrandKitSummary;
  }

  const typography = (full.typography ?? [])
    .filter((t) => t.family)
    .map((t, i) => ({
      role: t.role || "custom",
      family: t.family,
      weight: t.weight,
      style: t.style,
      // Never copy assetId — fonts are family strings only
      sortOrder: t.sortOrder ?? i,
    }));
  if (typography.length) {
    kit = (await brandApi.replaceTypography(kit.id, typography)) as BrandKitSummary;
  }

  return kit;
}
