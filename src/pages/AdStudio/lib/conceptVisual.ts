import type { BrandKitSummary } from "../../BrandKits/CreateBrandKitDialog";
import type { AdConcept, ConceptLayoutFamily } from "../types";
import { AD_FORMATS, CONCEPT_LAYOUT_FAMILY_LABELS } from "../types";

/** @deprecated Prefer ConceptLayoutFamily — kept as alias for local call sites. */
export type ConceptLayoutId = ConceptLayoutFamily;

export type ConceptVisualStyle = {
  layout: ConceptLayoutFamily;
  background: string;
  accent: string;
  text: string;
  mutedText: string;
  ctaBg: string;
  ctaText: string;
  headingWeight: number;
  headingSizeScale: number;
  align: "left" | "center" | "right";
  moodLabel: string;
  /** Human-readable canonical layout family label */
  layoutLabel: string;
};

const LAYOUTS: ConceptLayoutFamily[] = [
  "centered-hero",
  "bottom-stack",
  "left-editorial",
  "top-banner",
  "diagonal-luxury",
];

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

function normalizeHex(value: string | undefined | null): string | null {
  if (!value || typeof value !== "string") return null;
  const t = value.trim();
  if (!t) return null;
  const withHash = t.startsWith("#") ? t : `#${t}`;
  return /^#[0-9A-Fa-f]{6}$/.test(withHash) ? withHash.toUpperCase() : null;
}

function isLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 155;
}

function isConceptLayoutFamily(value: unknown): value is ConceptLayoutFamily {
  return typeof value === "string" && (LAYOUTS as string[]).includes(value);
}

/**
 * Prefer server-authoritative layoutFamily (UX-2A.1).
 * Legacy inference (regex + stable hash) only when absent/unsupported.
 */
export function resolveConceptLayout(concept: AdConcept): ConceptLayoutFamily {
  if (isConceptLayoutFamily(concept.layoutFamily)) {
    return concept.layoutFamily;
  }

  const blob = `${concept.composition ?? ""} ${concept.creativeDirection ?? ""} ${concept.title ?? ""}`.toLowerCase();
  // Luxury / product-led cues first so beauty campaigns aren't flattened to generic editorial.
  if (/luxury|dark|matte|premium|cinematic|burgundy|velvet/.test(blob)) {
    return "diagonal-luxury";
  }
  if (/product.?focus|product.?hero|bottom|cta.?first/.test(blob)) return "bottom-stack";
  if (/\beditorial\b|asymmetric|left.?align|split.?layout/.test(blob)) {
    return "left-editorial";
  }
  if (/banner|top.?header|masthead/.test(blob)) return "top-banner";
  if (/center|hero|spotlight/.test(blob)) return "centered-hero";
  return LAYOUTS[hashString(concept.conceptId || concept.title) % LAYOUTS.length]!;
}

export function resolveConceptPalette(
  concept: AdConcept,
  brand?: BrandKitSummary | null,
): { colors: string[]; primary: string; secondary: string; background: string } {
  const fromConcept = (concept.colorRecommendations ?? [])
    .map((c) => normalizeHex(c))
    .filter((c): c is string => !!c);

  const brandPrimary = normalizeHex(
    brand?.colors?.find((c) => c.role === "primary")?.hex,
  );
  const brandSecondary = normalizeHex(
    brand?.colors?.find((c) => c.role === "secondary")?.hex,
  );
  const brandAccent = normalizeHex(
    brand?.colors?.find((c) => c.role === "accent")?.hex,
  );

  const colors = [
    ...fromConcept,
    brandPrimary,
    brandSecondary,
    brandAccent,
  ].filter((c): c is string => !!c);

  const unique = Array.from(new Set(colors));
  while (unique.length < 3) {
    unique.push(["#7F1D1D", "#1C1917", "#F8FAFC"][unique.length]!);
  }

  const primary = unique[0]!;
  const secondary = unique[1]!;
  const background = unique[2]!;
  return { colors: unique.slice(0, 5), primary, secondary, background };
}

export function resolveConceptVisualStyle(
  concept: AdConcept,
  brand?: BrandKitSummary | null,
): ConceptVisualStyle {
  const layout = resolveConceptLayout(concept);
  const layoutLabel = CONCEPT_LAYOUT_FAMILY_LABELS[layout];
  const palette = resolveConceptPalette(concept, brand);
  const bg = layout === "diagonal-luxury" || layout === "bottom-stack"
    ? palette.background
    : palette.secondary;
  const lightBg = isLight(bg);
  const text = lightBg ? "#0F172A" : "#F8FAFC";
  const mutedText = lightBg ? "rgba(15,23,42,0.72)" : "rgba(248,250,252,0.78)";
  const accent = palette.primary;
  const ctaBg = accent;
  const ctaText = isLight(ctaBg) ? "#0F172A" : "#FFFFFF";

  const moodFromDirection = (concept.creativeDirection || "").split(/[.,]/)[0]?.trim();
  const moodLabel =
    moodFromDirection && moodFromDirection.length < 48
      ? moodFromDirection
      : layoutLabel;

  return {
    layout,
    layoutLabel,
    background:
      layout === "diagonal-luxury"
        ? `linear-gradient(155deg, ${palette.background} 0%, ${palette.secondary} 48%, ${palette.primary}55 100%)`
        : layout === "top-banner"
          ? `linear-gradient(180deg, ${palette.primary} 0%, ${palette.secondary} 42%, ${palette.background} 100%)`
          : `linear-gradient(165deg, ${bg} 0%, ${palette.secondary} 100%)`,
    accent,
    text,
    mutedText,
    ctaBg,
    ctaText,
    headingWeight: layout === "diagonal-luxury" || layout === "left-editorial" ? 500 : 700,
    headingSizeScale: layout === "centered-hero" ? 1.05 : layout === "top-banner" ? 0.92 : 1,
    align: layout === "left-editorial" ? "left" : layout === "bottom-stack" ? "left" : "center",
    moodLabel,
  };
}

export function formatForAspect(outputFormat: string) {
  return AD_FORMATS.find((f) => f.id === outputFormat) ?? AD_FORMATS[1];
}

export function brandLogoUrl(brand?: BrandKitSummary | null): string | null {
  const logo = brand?.assets?.find(
    (a) =>
      (a.role === "logo_primary" || a.role === "logo_mark") &&
      (a.status === "ready" || !a.status) &&
      a.readUrl,
  );
  return logo?.readUrl ?? null;
}

export function brandInitials(name?: string | null): string {
  const parts = (name ?? "N").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "N";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}
