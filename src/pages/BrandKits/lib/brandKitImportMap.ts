import {
  adaptLegacySeedEnvelope,
  isLegacySeedEnvelope,
} from "./brandKitSeedAdapter";
import {
  BRAND_KIT_BUNDLE_TYPE,
  BRAND_KIT_SCHEMA_VERSION,
  BRAND_KIT_TYPE,
  PORTABLE_LIMITS,
  type ImportIssue,
  type MappedImportKit,
  type PortableBrandKit,
  type PortableColors,
} from "./brandKitPortable";

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
const COLOR_ROLES = ["primary", "secondary", "accent", "background", "text"] as const;

function asString(value: unknown, max = PORTABLE_LIMITS.maxString): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  if (!t) return undefined;
  return t.slice(0, max);
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, PORTABLE_LIMITS.maxArrayItems);
}

function normalizeHex(value: string | undefined, path: string, issues: ImportIssue[]): string | undefined {
  if (!value) return undefined;
  const hex = value.trim().startsWith("#") ? value.trim() : `#${value.trim()}`;
  if (!HEX_RE.test(hex)) {
    issues.push({ level: "error", path, message: `Invalid hex color: ${value}` });
    return undefined;
  }
  return hex.toUpperCase();
}

function fingerprintFor(kit: PortableBrandKit): string {
  const key = JSON.stringify({
    n: kit.brand.name,
    i: kit.brand.industry,
    p: kit.colors?.primary,
    t: kit.brand.tagline,
  });
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return `imp_${Math.abs(hash).toString(16)}_${kit.brand.name.slice(0, 24)}`;
}

function collectUnsupported(raw: Record<string, unknown>, known: Set<string>): string[] {
  return Object.keys(raw).filter((k) => !known.has(k));
}

export function extractPortableKits(value: unknown): {
  kits: PortableBrandKit[];
  unsupportedFields: string[];
  issues: ImportIssue[];
} {
  const issues: ImportIssue[] = [];
  const unsupportedFields: string[] = [];

  if (isLegacySeedEnvelope(value)) {
    const kits = adaptLegacySeedEnvelope(value);
    if (!kits.length) {
      issues.push({
        level: "error",
        path: "$",
        message: "Seed envelope contains no kits",
      });
    }
    return { kits, unsupportedFields, issues };
  }

  if (Array.isArray(value)) {
    if (value.length > PORTABLE_LIMITS.maxKits) {
      issues.push({
        level: "error",
        path: "$",
        message: `Too many kits (max ${PORTABLE_LIMITS.maxKits})`,
      });
      return { kits: [], unsupportedFields, issues };
    }
    const kits: PortableBrandKit[] = [];
    for (const item of value) {
      const one = extractPortableKits(item);
      issues.push(...one.issues);
      unsupportedFields.push(...one.unsupportedFields);
      kits.push(...one.kits);
    }
    return { kits, unsupportedFields, issues };
  }

  if (!value || typeof value !== "object") {
    issues.push({ level: "error", path: "$", message: "Expected a JSON object or array" });
    return { kits: [], unsupportedFields, issues };
  }

  const obj = value as Record<string, unknown>;

  if (obj.type === BRAND_KIT_BUNDLE_TYPE) {
    if (obj.schemaVersion && obj.schemaVersion !== BRAND_KIT_SCHEMA_VERSION) {
      issues.push({
        level: "error",
        path: "$.schemaVersion",
        message: `Unsupported schemaVersion: ${String(obj.schemaVersion)}`,
      });
      return { kits: [], unsupportedFields, issues };
    }
    const list = Array.isArray(obj.kits) ? obj.kits : [];
    return extractPortableKits(list);
  }

  if (obj.type === BRAND_KIT_TYPE || obj.brand || obj.schemaVersion) {
    if (obj.schemaVersion && obj.schemaVersion !== BRAND_KIT_SCHEMA_VERSION) {
      issues.push({
        level: "error",
        path: "$.schemaVersion",
        message: `Unsupported schemaVersion: ${String(obj.schemaVersion)}`,
      });
    }
    unsupportedFields.push(
      ...collectUnsupported(
        obj,
        new Set([
          "schemaVersion",
          "type",
          "brand",
          "colors",
          "typography",
          "voice",
          "creativeGuidelines",
          "advertisingPreferences",
          "assets",
          "guidelines",
        ]),
      ),
    );
    const brandRaw = (obj.brand ?? obj) as Record<string, unknown>;
    const name = asString(brandRaw.name, PORTABLE_LIMITS.maxName);
    if (!name) {
      issues.push({ level: "error", path: "$.brand.name", message: "Brand name is required" });
      return { kits: [], unsupportedFields, issues };
    }
    const kit: PortableBrandKit = {
      schemaVersion: BRAND_KIT_SCHEMA_VERSION,
      type: BRAND_KIT_TYPE,
      brand: {
        name,
        industry: asString(brandRaw.industry, 120),
        description: asString(brandRaw.description, 2000),
        website: asString(brandRaw.website, 2048),
        tagline: asString(brandRaw.tagline, 160),
        targetAudience: asString(brandRaw.targetAudience, 500),
        signatureProduct: asString(brandRaw.signatureProduct, 200),
        personality: asString(brandRaw.personality, 280),
      },
      colors: (obj.colors as PortableColors) || undefined,
      typography: (obj.typography as PortableBrandKit["typography"]) || undefined,
      voice: (obj.voice as PortableBrandKit["voice"]) || undefined,
      creativeGuidelines:
        (obj.creativeGuidelines as PortableBrandKit["creativeGuidelines"]) ||
        undefined,
      advertisingPreferences:
        (obj.advertisingPreferences as Record<string, unknown>) || undefined,
      assets: Array.isArray(obj.assets)
        ? (obj.assets as PortableBrandKit["assets"])
        : undefined,
      guidelines: asString(obj.guidelines, 20_000),
    };
    return { kits: [kit], unsupportedFields, issues };
  }

  issues.push({
    level: "error",
    path: "$",
    message: "Unrecognized Brand Kit JSON shape",
  });
  return { kits: [], unsupportedFields, issues };
}

export function mapPortableKit(kit: PortableBrandKit): MappedImportKit {
  const issues: ImportIssue[] = [...(kit.brand.name ? [] : [])];
  const unsupportedFields: string[] = [];

  if (!kit.brand.name?.trim()) {
    issues.push({ level: "error", path: "brand.name", message: "Name is required" });
  }

  if (kit.advertisingPreferences && Object.keys(kit.advertisingPreferences).length) {
    unsupportedFields.push("advertisingPreferences");
    issues.push({
      level: "warning",
      path: "advertisingPreferences",
      message: "Advertising preferences are stored as guidance notes for now",
    });
  }

  const colors: MappedImportKit["colors"] = [];
  let sort = 0;
  for (const role of COLOR_ROLES) {
    const hex = normalizeHex(kit.colors?.[role], `colors.${role}`, issues);
    if (hex) {
      colors.push({
        role,
        hex,
        name: role[0]!.toUpperCase() + role.slice(1),
        sortOrder: sort++,
      });
    }
  }
  for (const custom of kit.colors?.custom ?? []) {
    const hex = normalizeHex(custom.hex, "colors.custom", issues);
    if (hex) {
      colors.push({
        role: "custom",
        hex,
        name: custom.name || "Custom",
        sortOrder: sort++,
      });
    }
  }

  const typography: MappedImportKit["typography"] = [];
  const typeMap: Array<[string, string | undefined]> = [
    ["heading", kit.typography?.headline],
    ["body", kit.typography?.body],
    ["accent", kit.typography?.accent],
    ["cta", kit.typography?.cta],
  ];
  typeMap.forEach(([role, family], i) => {
    const f = asString(family, 120);
    if (f) {
      typography.push({
        role,
        family: f,
        weight: role === "body" ? "400" : "700",
        sortOrder: i,
      });
    }
  });

  const assets = (kit.assets ?? []).map((a) => ({
    ...a,
    role: a.role || "other",
    requiresReupload: true,
  }));
  if (assets.some((a) => a.externalHint || (a as { url?: string }).url)) {
    issues.push({
      level: "warning",
      path: "assets",
      message: "External asset URLs are ignored — re-upload required",
    });
  }

  const voice: Record<string, unknown> = {
    industry: kit.brand.industry,
    website: kit.brand.website,
    tagline: kit.brand.tagline,
    targetAudience: kit.brand.targetAudience,
    signatureProduct: kit.brand.signatureProduct,
    personality: kit.brand.personality || kit.voice?.personality,
    tone: kit.voice?.tone,
    writingStyle: kit.voice?.writingStyle,
    preferredCta: kit.voice?.preferredCta,
    doSay: kit.voice?.preferredVocabulary,
    dontSay: kit.voice?.prohibitedVocabulary,
    exampleHeadlines: kit.voice?.exampleHeadlines,
    copyGuidance: kit.voice?.copyGuidance,
    creative: kit.creativeGuidelines,
  };
  // Drop undefined
  for (const key of Object.keys(voice)) {
    if (voice[key] === undefined) delete voice[key];
  }

  if (kit.advertisingPreferences) {
    voice.advertisingPreferences = kit.advertisingPreferences;
  }

  const name = kit.brand.name.trim().slice(0, PORTABLE_LIMITS.maxName);
  const portable: PortableBrandKit = { ...kit, brand: { ...kit.brand, name } };

  return {
    fingerprint: fingerprintFor(portable),
    portable,
    createPayload: {
      name,
      description: kit.brand.description,
      guidelines: kit.guidelines,
      voice,
    },
    colors,
    typography,
    assetsRequiringReupload: assets,
    issues,
    unsupportedFields,
  };
}

export function mapImportDocument(value: unknown): MappedImportKit[] {
  const extracted = extractPortableKits(value);
  if (extracted.kits.length > PORTABLE_LIMITS.maxKits) {
    return [
      {
        fingerprint: "overflow",
        portable: {
          schemaVersion: BRAND_KIT_SCHEMA_VERSION,
          type: BRAND_KIT_TYPE,
          brand: { name: "Invalid" },
        },
        createPayload: { name: "Invalid", voice: {} },
        colors: [],
        typography: [],
        assetsRequiringReupload: [],
        issues: [
          {
            level: "error",
            path: "$",
            message: `Too many kits (max ${PORTABLE_LIMITS.maxKits})`,
          },
          ...extracted.issues,
        ],
        unsupportedFields: extracted.unsupportedFields,
      },
    ];
  }
  return extracted.kits.map((kit) => {
    const mapped = mapPortableKit(kit);
    mapped.issues = [...extracted.issues, ...mapped.issues];
    mapped.unsupportedFields = [
      ...new Set([...extracted.unsupportedFields, ...mapped.unsupportedFields]),
    ];
    return mapped;
  });
}

export function isImportable(mapped: MappedImportKit): boolean {
  return !mapped.issues.some((i) => i.level === "error");
}
