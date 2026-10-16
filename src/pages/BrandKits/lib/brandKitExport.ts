import {
  BRAND_KIT_BUNDLE_TYPE,
  BRAND_KIT_SCHEMA_VERSION,
  BRAND_KIT_TYPE,
  type PortableAssetRef,
  type PortableBrandKit,
  type PortableBrandKitBundle,
} from "./brandKitPortable";
import type { BrandKitSummary } from "./brandKitTypes";

function colorMap(kit: BrandKitSummary) {
  const pick = (role: string) =>
    kit.colors?.find((c) => c.role === role)?.hex?.toUpperCase();
  const custom =
    kit.colors
      ?.filter((c) => c.role === "custom")
      .map((c) => ({ name: c.name, hex: c.hex.toUpperCase() })) ?? [];
  return {
    primary: pick("primary"),
    secondary: pick("secondary"),
    accent: pick("accent"),
    background: pick("background"),
    text: pick("text"),
    ...(custom.length ? { custom } : {}),
  };
}

function typeMap(kit: BrandKitSummary) {
  const pick = (role: string) =>
    kit.typography?.find((t) => t.role === role)?.family;
  return {
    headline: pick("heading"),
    body: pick("body"),
    accent: pick("accent"),
    cta: pick("cta"),
  };
}

function assetRefs(kit: BrandKitSummary): PortableAssetRef[] {
  return (kit.assets ?? [])
    .filter((a) => a.status === "ready")
    .map((a) => ({
      role: a.role || "other",
      label: a.label ?? undefined,
      description: a.description ?? undefined,
      usageGuidance: a.usageGuidance ?? undefined,
      requiresReupload: true,
      // Intentionally omit readUrl, storageKey, asset id, signed URLs
    }));
}

/** Serialize one kit to canonical portable JSON (no secrets / signed URLs). */
export function exportBrandKit(kit: BrandKitSummary): PortableBrandKit {
  const voice = kit.voice ?? {};
  return {
    schemaVersion: BRAND_KIT_SCHEMA_VERSION,
    type: BRAND_KIT_TYPE,
    brand: {
      name: kit.name,
      industry: voice.industry as string | undefined,
      description: kit.description ?? undefined,
      website: voice.website as string | undefined,
      tagline: voice.tagline as string | undefined,
      targetAudience: voice.targetAudience as string | undefined,
      signatureProduct: voice.signatureProduct as string | undefined,
      personality: voice.personality as string | undefined,
    },
    colors: colorMap(kit),
    typography: typeMap(kit),
    voice: {
      tone: voice.tone as string | undefined,
      personality: voice.personality as string | undefined,
      writingStyle: voice.writingStyle as string | undefined,
      preferredCta: voice.preferredCta as string | undefined,
      preferredVocabulary: voice.doSay as string[] | undefined,
      prohibitedVocabulary: voice.dontSay as string[] | undefined,
      exampleHeadlines: voice.exampleHeadlines as string[] | undefined,
      copyGuidance: voice.copyGuidance as string | undefined,
    },
    creativeGuidelines: voice.creative as PortableBrandKit["creativeGuidelines"],
    guidelines: kit.guidelines ?? undefined,
    assets: assetRefs(kit),
  };
}

export function exportBrandKitBundle(kits: BrandKitSummary[]): PortableBrandKitBundle {
  return {
    schemaVersion: BRAND_KIT_SCHEMA_VERSION,
    type: BRAND_KIT_BUNDLE_TYPE,
    kits: kits.map(exportBrandKit),
  };
}

export function stringifyExport(value: unknown, pretty = true): string {
  return JSON.stringify(value, null, pretty ? 2 : 0);
}

export function downloadJson(filename: string, jsonText: string): void {
  const blob = new Blob([jsonText], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function safeExportFilename(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "brand-kit"
  );
}
