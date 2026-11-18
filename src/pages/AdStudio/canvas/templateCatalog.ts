/**
 * UX-2A.2 M3 — Compact mirror of AD_STUDIO_TEMPLATE_CATALOG_V1 geometry.
 * Source of truth remains libs/contracts; this copy is for FE preview composition
 * only (server TemplateEngine remains authoritative for persisted creatives).
 */

export const AD_STUDIO_TEMPLATE_IDS = [
  "project-workspace",
  "product-hero",
  "model-editorial",
  "product-launch",
  "multi-shade-collection",
  "texture-showcase",
  "lifestyle-placement",
  "seasonal-campaign",
  "promotional-offer",
  "minimal-editorial",
  "social-story",
] as const;

export type AdStudioTemplateId = (typeof AD_STUDIO_TEMPLATE_IDS)[number];

export const PROJECT_WORKSPACE_COPY = {
  primaryHeadline: "Bring Your Work Together",
  supportingCopy: "A clear workspace for organized projects and simple team collaboration.",
  cta: "Explore the Platform",
} as const;

export type MissingAssetPolicy =
  | "blockPreview"
  | "showSlotHint"
  | "allowLogoOnly";

export type TemplateSlotRole = "product" | "logo" | "model" | "campaign";

export type TemplateRegion = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type TemplateLayerRecipe = {
  kind:
    | "background"
    | "shapeAccent"
    | "headline"
    | "supporting"
    | "cta"
    | "imageSlot"
    | "logoSlot";
  fillRole?: "primary" | "text";
  opacity?: number;
  fill?: string;
  cornerRadiusPct?: number;
  label?: string;
  labelColor?: string;
  labelSizePct?: number;
  regionId: string;
  slotId?: TemplateSlotRole;
  zIndex: number;
};

export type AdSceneOutputFormatId =
  | "square_1080"
  | "portrait_1080x1350"
  | "vertical_1080x1920"
  | "landscape_1920x1080";

export type TemplateBackgroundMode = "brandGradient" | "solid" | "slot";

export type TemplateBackgroundDef = {
  mode: TemplateBackgroundMode;
  slotId?: TemplateSlotRole;
};

export type TemplateDef = {
  templateId: AdStudioTemplateId;
  name: string;
  layoutFamily: string;
  /** Supported output formats (mirrors contracts catalog). */
  formats: readonly AdSceneOutputFormatId[];
  missingAssetPolicy: MissingAssetPolicy;
  background: TemplateBackgroundDef;
  slots: Array<{
    slotId: TemplateSlotRole;
    required: boolean;
    maxCount: number;
    label: string;
    objectFit: "cover" | "contain" | "fill";
  }>;
  regions: TemplateRegion[];
  typography: {
    headline: { align: "left" | "center" | "right"; sizeScale: number; weight: number };
    body: { align: "left" | "center" | "right"; sizeScale: number; weight: number };
    cta: { align: "left" | "center" | "right"; sizeScale: number; weight: number };
  };
  layers: TemplateLayerRecipe[];
};

function r(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
): TemplateRegion {
  return { id, x, y, w, h };
}

const ALL_SCENE_FORMATS: readonly AdSceneOutputFormatId[] = [
  "square_1080",
  "portrait_1080x1350",
  "vertical_1080x1920",
  "landscape_1920x1080",
];

const STORY_SCENE_FORMATS: readonly AdSceneOutputFormatId[] = [
  "portrait_1080x1350",
  "vertical_1080x1920",
];

function ty(
  align: "left" | "center" | "right",
): TemplateDef["typography"] {
  return {
    headline: { align, sizeScale: 1, weight: 700 },
    body: { align, sizeScale: 0.55, weight: 400 },
    cta: { align: "center", sizeScale: 0.7, weight: 700 },
  };
}

export const TEMPLATE_CATALOG_V1: readonly TemplateDef[] = [
  {
    templateId: "project-workspace",
    name: "Project workspace",
    layoutFamily: "top-banner",
    formats: ["square_1080", "portrait_1080x1350", "landscape_1920x1080"],
    missingAssetPolicy: "allowLogoOnly",
    background: { mode: "solid" },
    slots: [{ slotId: "logo", required: false, maxCount: 1, label: "Logo", objectFit: "contain" }],
    regions: [
      r("bg", 0, 0, 100, 100),
      r("headline", 6, 13, 51, 21),
      r("supporting", 6, 35, 46, 10),
      r("cta", 6, 47, 34, 6),
      r("project-list", 9, 77, 32, 13),
      r("project-label", 10, 78, 30, 4),
      r("in-progress", 11, 84, 17, 4),
      r("team-card", 72, 82, 24, 10),
      r("team-label", 73, 83, 22, 3),
      r("team-dot-one", 76, 87, 4, 3),
      r("team-dot-two", 82, 87, 4, 3),
      r("team-dot-three", 88, 87, 4, 3),
      r("logo", 6, 3, 18, 7),
    ],
    typography: { ...ty("left"), cta: { ...ty("left").cta, sizeScale: 0.38 } },
    layers: [
      { kind: "background", regionId: "bg", zIndex: 0 },
      { kind: "shapeAccent", regionId: "project-list", zIndex: 2, fill: "#F1F3FF", cornerRadiusPct: 3 },
      { kind: "shapeAccent", regionId: "project-label", zIndex: 3, fill: "#F1F3FF", cornerRadiusPct: 2, label: "My projects", labelColor: "#20265C", labelSizePct: 2.75 },
      { kind: "shapeAccent", regionId: "in-progress", zIndex: 4, fill: "#DEDFFD", cornerRadiusPct: 2, label: "In progress", labelColor: "#4032A9", labelSizePct: 2.15 },
      { kind: "shapeAccent", regionId: "team-card", zIndex: 5, fill: "#F1F3FF", cornerRadiusPct: 3 },
      { kind: "shapeAccent", regionId: "team-label", zIndex: 6, fill: "#F1F3FF", cornerRadiusPct: 2, label: "Team", labelColor: "#20265C", labelSizePct: 2.5 },
      { kind: "shapeAccent", regionId: "team-dot-one", zIndex: 7, fill: "#5845DC", cornerRadiusPct: 3 },
      { kind: "shapeAccent", regionId: "team-dot-two", zIndex: 8, fill: "#9D8AF0", cornerRadiusPct: 3 },
      { kind: "shapeAccent", regionId: "team-dot-three", zIndex: 9, fill: "#558ACF", cornerRadiusPct: 3 },
      { kind: "headline", regionId: "headline", zIndex: 30 },
      { kind: "supporting", regionId: "supporting", zIndex: 31 },
      { kind: "cta", regionId: "cta", zIndex: 32 },
      { kind: "logoSlot", regionId: "logo", slotId: "logo", zIndex: 33 },
    ],
  },
  {
    templateId: "product-hero",
    name: "Product hero",
    layoutFamily: "centered-hero",
    formats: ALL_SCENE_FORMATS,
    missingAssetPolicy: "blockPreview",
    background: { mode: "brandGradient" },
    slots: [
      { slotId: "product", required: true, maxCount: 1, label: "Product image", objectFit: "contain" },
      { slotId: "logo", required: true, maxCount: 1, label: "Logo", objectFit: "contain" },
    ],
    regions: [
      r("bg", 0, 0, 100, 100),
      r("product", 15, 18, 70, 48),
      r("headline", 8, 68, 84, 12),
      r("supporting", 8, 80, 84, 8),
      r("cta", 30, 90, 40, 6),
      r("logo", 78, 4, 16, 8),
    ],
    typography: ty("center"),
    layers: [
      { kind: "background", regionId: "bg", zIndex: 0 },
      { kind: "imageSlot", regionId: "product", slotId: "product", zIndex: 5 },
      { kind: "headline", regionId: "headline", zIndex: 10 },
      { kind: "supporting", regionId: "supporting", zIndex: 11 },
      { kind: "cta", regionId: "cta", zIndex: 20 },
      { kind: "logoSlot", regionId: "logo", slotId: "logo", zIndex: 25 },
    ],
  },
  {
    templateId: "model-editorial",
    name: "Model editorial",
    layoutFamily: "left-editorial",
    formats: ALL_SCENE_FORMATS,
    missingAssetPolicy: "blockPreview",
    background: { mode: "brandGradient" },
    slots: [
      { slotId: "model", required: true, maxCount: 1, label: "Brand model", objectFit: "cover" },
      { slotId: "logo", required: true, maxCount: 1, label: "Logo", objectFit: "contain" },
      { slotId: "product", required: false, maxCount: 1, label: "Product image", objectFit: "contain" },
    ],
    regions: [
      r("bg", 0, 0, 100, 100),
      r("model", 0, 0, 55, 100),
      r("headline", 58, 18, 36, 16),
      r("supporting", 58, 38, 36, 14),
      r("product", 58, 56, 28, 22),
      r("cta", 58, 84, 32, 6),
      r("logo", 82, 4, 14, 7),
    ],
    typography: ty("left"),
    layers: [
      { kind: "background", regionId: "bg", zIndex: 0 },
      { kind: "imageSlot", regionId: "model", slotId: "model", zIndex: 4 },
      { kind: "headline", regionId: "headline", zIndex: 10 },
      { kind: "supporting", regionId: "supporting", zIndex: 11 },
      { kind: "imageSlot", regionId: "product", slotId: "product", zIndex: 12 },
      { kind: "cta", regionId: "cta", zIndex: 20 },
      { kind: "logoSlot", regionId: "logo", slotId: "logo", zIndex: 25 },
    ],
  },
  {
    templateId: "product-launch",
    name: "Product launch",
    layoutFamily: "top-banner",
    formats: ALL_SCENE_FORMATS,
    missingAssetPolicy: "blockPreview",
    background: { mode: "brandGradient" },
    slots: [
      { slotId: "product", required: true, maxCount: 1, label: "Product image", objectFit: "contain" },
      { slotId: "logo", required: true, maxCount: 1, label: "Logo", objectFit: "contain" },
    ],
    regions: [
      r("bg", 0, 0, 100, 100),
      r("banner", 0, 0, 100, 28),
      r("headline", 8, 6, 70, 16),
      r("product", 20, 32, 60, 48),
      r("supporting", 8, 82, 60, 8),
      r("cta", 72, 84, 20, 6),
      r("logo", 82, 4, 14, 7),
    ],
    typography: ty("left"),
    layers: [
      { kind: "background", regionId: "bg", zIndex: 0 },
      { kind: "shapeAccent", regionId: "banner", zIndex: 2 },
      { kind: "headline", regionId: "headline", zIndex: 10 },
      { kind: "imageSlot", regionId: "product", slotId: "product", zIndex: 5 },
      { kind: "supporting", regionId: "supporting", zIndex: 11 },
      { kind: "cta", regionId: "cta", zIndex: 20 },
      { kind: "logoSlot", regionId: "logo", slotId: "logo", zIndex: 25 },
    ],
  },
  {
    templateId: "multi-shade-collection",
    name: "Multi-shade collection",
    layoutFamily: "bottom-stack",
    formats: ALL_SCENE_FORMATS,
    missingAssetPolicy: "showSlotHint",
    background: { mode: "solid" },
    slots: [
      { slotId: "product", required: true, maxCount: 4, label: "Product shades", objectFit: "contain" },
      { slotId: "logo", required: true, maxCount: 1, label: "Logo", objectFit: "contain" },
    ],
    regions: [
      r("bg", 0, 0, 100, 100),
      r("headline", 8, 6, 84, 12),
      r("grid", 8, 22, 84, 52),
      r("supporting", 8, 76, 84, 8),
      r("cta", 30, 88, 40, 6),
      r("logo", 78, 4, 16, 8),
    ],
    typography: ty("center"),
    layers: [
      { kind: "background", regionId: "bg", zIndex: 0 },
      { kind: "headline", regionId: "headline", zIndex: 10 },
      { kind: "imageSlot", regionId: "grid", slotId: "product", zIndex: 5 },
      { kind: "supporting", regionId: "supporting", zIndex: 11 },
      { kind: "cta", regionId: "cta", zIndex: 20 },
      { kind: "logoSlot", regionId: "logo", slotId: "logo", zIndex: 25 },
    ],
  },
  {
    templateId: "texture-showcase",
    name: "Texture showcase",
    layoutFamily: "diagonal-luxury",
    formats: ALL_SCENE_FORMATS,
    missingAssetPolicy: "blockPreview",
    background: { mode: "brandGradient" },
    slots: [
      { slotId: "product", required: true, maxCount: 1, label: "Product image", objectFit: "cover" },
      { slotId: "logo", required: true, maxCount: 1, label: "Logo", objectFit: "contain" },
    ],
    regions: [
      r("bg", 0, 0, 100, 100),
      r("product", 5, 10, 90, 55),
      r("headline", 8, 70, 70, 12),
      r("supporting", 8, 82, 60, 8),
      r("cta", 72, 88, 20, 6),
      r("logo", 78, 4, 16, 8),
    ],
    typography: ty("left"),
    layers: [
      { kind: "background", regionId: "bg", zIndex: 0 },
      { kind: "imageSlot", regionId: "product", slotId: "product", zIndex: 5 },
      { kind: "headline", regionId: "headline", zIndex: 10 },
      { kind: "supporting", regionId: "supporting", zIndex: 11 },
      { kind: "cta", regionId: "cta", zIndex: 20 },
      { kind: "logoSlot", regionId: "logo", slotId: "logo", zIndex: 25 },
    ],
  },
  {
    templateId: "lifestyle-placement",
    name: "Lifestyle placement",
    layoutFamily: "left-editorial",
    formats: ALL_SCENE_FORMATS,
    missingAssetPolicy: "showSlotHint",
    background: { mode: "brandGradient" },
    slots: [
      { slotId: "model", required: false, maxCount: 1, label: "Brand model", objectFit: "cover" },
      { slotId: "campaign", required: false, maxCount: 1, label: "Campaign reference", objectFit: "cover" },
      { slotId: "product", required: true, maxCount: 1, label: "Product image", objectFit: "contain" },
      { slotId: "logo", required: true, maxCount: 1, label: "Logo", objectFit: "contain" },
    ],
    regions: [
      r("bg", 0, 0, 100, 100),
      r("lifestyle", 0, 0, 58, 100),
      r("product", 62, 48, 30, 28),
      r("headline", 62, 12, 32, 14),
      r("supporting", 62, 30, 32, 12),
      r("cta", 62, 84, 28, 6),
      r("logo", 82, 4, 14, 7),
    ],
    typography: ty("left"),
    layers: [
      { kind: "background", regionId: "bg", zIndex: 0 },
      { kind: "imageSlot", regionId: "lifestyle", slotId: "model", zIndex: 3 },
      { kind: "imageSlot", regionId: "lifestyle", slotId: "campaign", zIndex: 3 },
      { kind: "imageSlot", regionId: "product", slotId: "product", zIndex: 6 },
      { kind: "headline", regionId: "headline", zIndex: 10 },
      { kind: "supporting", regionId: "supporting", zIndex: 11 },
      { kind: "cta", regionId: "cta", zIndex: 20 },
      { kind: "logoSlot", regionId: "logo", slotId: "logo", zIndex: 25 },
    ],
  },
  {
    templateId: "seasonal-campaign",
    name: "Seasonal campaign",
    layoutFamily: "top-banner",
    formats: ALL_SCENE_FORMATS,
    missingAssetPolicy: "allowLogoOnly",
    background: { mode: "slot", slotId: "campaign" },
    slots: [
      { slotId: "campaign", required: false, maxCount: 1, label: "Campaign reference", objectFit: "cover" },
      { slotId: "model", required: false, maxCount: 1, label: "Brand model", objectFit: "cover" },
      { slotId: "logo", required: true, maxCount: 1, label: "Logo", objectFit: "contain" },
    ],
    regions: [
      r("bg", 0, 0, 100, 100),
      r("hero", 0, 0, 100, 62),
      r("headline", 8, 66, 84, 12),
      r("supporting", 8, 78, 70, 8),
      r("cta", 8, 90, 36, 6),
      r("logo", 78, 4, 16, 8),
    ],
    typography: ty("left"),
    layers: [
      { kind: "background", regionId: "bg", zIndex: 0 },
      { kind: "imageSlot", regionId: "hero", slotId: "campaign", zIndex: 4 },
      { kind: "imageSlot", regionId: "hero", slotId: "model", zIndex: 4 },
      { kind: "headline", regionId: "headline", zIndex: 10 },
      { kind: "supporting", regionId: "supporting", zIndex: 11 },
      { kind: "cta", regionId: "cta", zIndex: 20 },
      { kind: "logoSlot", regionId: "logo", slotId: "logo", zIndex: 25 },
    ],
  },
  {
    templateId: "promotional-offer",
    name: "Promotional offer",
    layoutFamily: "bottom-stack",
    formats: ALL_SCENE_FORMATS,
    missingAssetPolicy: "blockPreview",
    background: { mode: "solid" },
    slots: [
      { slotId: "product", required: true, maxCount: 1, label: "Product image", objectFit: "contain" },
      { slotId: "logo", required: true, maxCount: 1, label: "Logo", objectFit: "contain" },
    ],
    regions: [
      r("bg", 0, 0, 100, 100),
      r("product", 20, 8, 60, 42),
      r("headline", 8, 54, 84, 12),
      r("supporting", 8, 68, 84, 10),
      r("cta", 20, 84, 60, 8),
      r("logo", 78, 4, 16, 8),
    ],
    typography: ty("center"),
    layers: [
      { kind: "background", regionId: "bg", zIndex: 0 },
      { kind: "imageSlot", regionId: "product", slotId: "product", zIndex: 5 },
      { kind: "headline", regionId: "headline", zIndex: 10 },
      { kind: "supporting", regionId: "supporting", zIndex: 11 },
      { kind: "cta", regionId: "cta", zIndex: 20 },
      { kind: "logoSlot", regionId: "logo", slotId: "logo", zIndex: 25 },
    ],
  },
  {
    templateId: "minimal-editorial",
    name: "Minimal editorial",
    layoutFamily: "top-banner",
    formats: ALL_SCENE_FORMATS,
    missingAssetPolicy: "allowLogoOnly",
    background: { mode: "brandGradient" },
    slots: [
      { slotId: "logo", required: true, maxCount: 1, label: "Logo", objectFit: "contain" },
      { slotId: "product", required: false, maxCount: 1, label: "Product image", objectFit: "contain" },
    ],
    regions: [
      r("bg", 0, 0, 100, 100),
      r("headline", 8, 20, 84, 18),
      r("supporting", 8, 42, 60, 10),
      r("product", 55, 55, 35, 30),
      r("cta", 8, 88, 36, 6),
      r("logo", 8, 6, 20, 8),
    ],
    typography: ty("left"),
    layers: [
      { kind: "background", regionId: "bg", zIndex: 0 },
      { kind: "logoSlot", regionId: "logo", slotId: "logo", zIndex: 25 },
      { kind: "headline", regionId: "headline", zIndex: 10 },
      { kind: "supporting", regionId: "supporting", zIndex: 11 },
      { kind: "imageSlot", regionId: "product", slotId: "product", zIndex: 5 },
      { kind: "cta", regionId: "cta", zIndex: 20 },
    ],
  },
  {
    templateId: "social-story",
    name: "Social story",
    layoutFamily: "centered-hero",
    formats: STORY_SCENE_FORMATS,
    missingAssetPolicy: "showSlotHint",
    background: { mode: "brandGradient" },
    slots: [
      { slotId: "product", required: false, maxCount: 1, label: "Product image", objectFit: "cover" },
      { slotId: "model", required: false, maxCount: 1, label: "Brand model", objectFit: "cover" },
      { slotId: "logo", required: true, maxCount: 1, label: "Logo", objectFit: "contain" },
    ],
    regions: [
      r("bg", 0, 0, 100, 100),
      r("safe", 8, 12, 84, 70),
      r("hero", 12, 18, 76, 48),
      r("headline", 10, 70, 80, 10),
      r("cta", 25, 84, 50, 6),
      r("logo", 38, 4, 24, 6),
    ],
    typography: ty("center"),
    layers: [
      { kind: "background", regionId: "bg", zIndex: 0 },
      { kind: "imageSlot", regionId: "hero", slotId: "product", zIndex: 5 },
      { kind: "imageSlot", regionId: "hero", slotId: "model", zIndex: 5 },
      { kind: "headline", regionId: "headline", zIndex: 10 },
      { kind: "cta", regionId: "cta", zIndex: 20 },
      { kind: "logoSlot", regionId: "logo", slotId: "logo", zIndex: 25 },
    ],
  },
];

export const FORMAT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  square_1080: { width: 1080, height: 1080 },
  portrait_1080x1350: { width: 1080, height: 1350 },
  vertical_1080x1920: { width: 1080, height: 1920 },
  landscape_1920x1080: { width: 1920, height: 1080 },
};

export function isAdStudioTemplateId(v: unknown): v is AdStudioTemplateId {
  return (
    typeof v === "string" &&
    (AD_STUDIO_TEMPLATE_IDS as readonly string[]).includes(v)
  );
}

export function getTemplateDef(id: AdStudioTemplateId): TemplateDef {
  const found = TEMPLATE_CATALOG_V1.find((t) => t.templateId === id);
  if (!found) throw new Error(`unknown template ${id}`);
  return found;
}

export function defaultTemplateIdForLayoutFamily(
  layoutFamily: string | undefined,
): AdStudioTemplateId {
  switch (layoutFamily) {
    case "centered-hero":
      return "product-hero";
    case "left-editorial":
      return "model-editorial";
    case "top-banner":
      return "product-launch";
    case "bottom-stack":
      return "promotional-offer";
    case "diagonal-luxury":
      return "texture-showcase";
    default:
      return "product-hero";
  }
}
