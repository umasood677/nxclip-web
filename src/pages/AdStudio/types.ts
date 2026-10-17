export type AdLayerType = "image" | "text" | "shape" | "logo" | "group";

export interface AdSceneCanvas {
  width: number;
  height: number;
  backgroundColor?: string;
}

export interface AdSceneLayerBase {
  id: string;
  type: AdLayerType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  rotation?: number;
  opacity?: number;
  visible?: boolean;
  locked?: boolean;
  name?: string;
}

export interface AdTextLayer extends AdSceneLayerBase {
  type: "text";
  text: string;
  fontFamily?: string;
  fontId?: string;
  fontSize?: number;
  fontWeight?: number | string;
  color?: string;
  align?: "left" | "center" | "right";
  lineHeight?: number;
  letterSpacing?: number;
  uppercase?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  shadow?: { color: string; blur: number; offsetX: number; offsetY: number };
}

export interface AdImageLayer extends AdSceneLayerBase {
  type: "image" | "logo";
  assetId?: string;
  storageKey?: string;
  objectFit?: "cover" | "contain" | "fill";
}

export interface AdShapeLayer extends AdSceneLayerBase {
  type: "shape";
  shape: "rectangle" | "roundedRectangle" | "ellipse";
  fill?: string;
  strokeColor?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  text?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: number;
}

export type AdSceneLayer = AdTextLayer | AdImageLayer | AdShapeLayer | AdSceneLayerBase;

export interface AdSceneGraph {
  schemaVersion: string;
  canvas: AdSceneCanvas;
  layers: AdSceneLayer[];
  /** Optional provenance from TemplateEngine (UX-2A.2). */
  templateId?: string;
  layoutFamily?: string;
}

/** Mirrors @nxclip/contracts ConceptLayoutFamily (UX-2A.1). */
export const CONCEPT_LAYOUT_FAMILIES = [
  "centered-hero",
  "bottom-stack",
  "left-editorial",
  "top-banner",
  "diagonal-luxury",
] as const;

export type ConceptLayoutFamily = (typeof CONCEPT_LAYOUT_FAMILIES)[number];

export const CONCEPT_LAYOUT_FAMILY_LABELS: Record<ConceptLayoutFamily, string> =
  {
    "centered-hero": "Centered hero",
    "bottom-stack": "Product-led stack",
    "left-editorial": "Editorial split",
    "top-banner": "Bold banner",
    "diagonal-luxury": "Luxury editorial",
  };

export interface AdConcept {
  conceptId: string;
  title: string;
  creativeDirection: string;
  primaryHeadline: string;
  supportingCopy: string;
  cta: string;
  visualPrompt: string;
  negativePrompt?: string;
  composition: string;
  /** Server-authoritative layout family when present (UX-2A.1). */
  layoutFamily?: ConceptLayoutFamily;
  /** Optional template id when templates V1 experience is active (UX-2A.2). */
  templateId?: string;
  /**
   * Optional server-authored AdSceneGraph 1.0.
   * When present, SceneStage prefers this over FE preview composition.
   */
  sceneGraph?: AdSceneGraph;
  colorRecommendations: string[];
  typographyRecommendations: string[];
  platformSuitability: string[];
  claimWarnings?: string[];
  explanation?: string;
}

export const AD_FORMATS = [
  { id: "square_1080", label: "Square 1:1", width: 1080, height: 1080 },
  { id: "portrait_1080x1350", label: "Portrait 4:5", width: 1080, height: 1350 },
  { id: "vertical_1080x1920", label: "Vertical 9:16", width: 1080, height: 1920 },
  { id: "landscape_1920x1080", label: "Landscape 16:9", width: 1920, height: 1080 },
] as const;
