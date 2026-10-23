// Generated from canonical contracts by export-intelligent-ad-studio.cjs.
/**
 * Shared Still Ad Studio scene graph contract (schema 1.0).
 * Additive and independent of:
 *  - AD_STUDIO_TEMPLATE_CATALOG_VERSION (template defs)
 *  - AdMotionSceneGraphDto schema 2.0 (animated)
 *  - CanonicalTypographyLayout (Clip Smart Typography T3)
 *
 * Image/logo layers reference Brand Kit via assetId + storageKey only —
 * never persist signed URLs on the graph.
 */

export const AD_SCENE_GRAPH_SCHEMA_VERSION = '1.0' as const;

/** Supported Still Ad Studio output format ids (canvas presets). */
export const AD_SCENE_OUTPUT_FORMAT_IDS = [
  'square_1080',
  'portrait_1080x1350',
  'vertical_1080x1920',
  'landscape_1920x1080',
] as const;

export type AdSceneOutputFormatId =
  (typeof AD_SCENE_OUTPUT_FORMAT_IDS)[number];

export type AdSceneLayerType = 'image' | 'text' | 'shape' | 'logo' | 'group';

export interface AdSceneCanvasDto {
  width: number;
  height: number;
  backgroundColor?: string;
}

export interface AdSceneLayerBaseDto {
  id: string;
  type: AdSceneLayerType;
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

export interface AdSceneImageLayerDto extends AdSceneLayerBaseDto {
  type: 'image' | 'logo';
  /** Brand Kit / ad-studio asset id (stable). */
  assetId?: string;
  /** Private object key — resolve via authorized backend; never a signed URL. */
  storageKey?: string;
  objectFit?: 'cover' | 'contain' | 'fill';
}

export interface AdSceneTextLayerDto extends AdSceneLayerBaseDto {
  type: 'text';
  text: string;
  fontFamily?: string;
  fontId?: string;
  fontSize?: number;
  fontWeight?: number | string;
  color?: string;
  align?: 'left' | 'center' | 'right';
  lineHeight?: number;
  letterSpacing?: number;
  uppercase?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  shadow?: { color: string; blur: number; offsetX: number; offsetY: number };
}

export interface AdSceneShapeLayerDto extends AdSceneLayerBaseDto {
  type: 'shape';
  shape: 'rectangle' | 'roundedRectangle' | 'ellipse';
  fill?: string;
  strokeColor?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  text?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: number;
}

export interface AdSceneGroupLayerDto extends AdSceneLayerBaseDto {
  type: 'group';
  children: string[];
}

export type AdSceneLayerDto =
  | AdSceneImageLayerDto
  | AdSceneTextLayerDto
  | AdSceneShapeLayerDto
  | AdSceneGroupLayerDto;

export interface SceneCreativeMetadata { mood?: string; lighting?: string }
export function validateSceneCreativeMetadata(value: unknown): SceneCreativeMetadata | undefined {
 if(value===undefined)return undefined;if(!value||typeof value!=='object'||Array.isArray(value))throw new AdSceneGraphContractValidationError('invalid creative metadata');
 const out:SceneCreativeMetadata={};for(const [key,item]of Object.entries(value)){if(!['mood','lighting'].includes(key)||typeof item!=='string'||item.length>2000)throw new AdSceneGraphContractValidationError('invalid creative metadata');out[key as keyof SceneCreativeMetadata]=item;}return out;
}
export interface AdSceneGraphDto {
  /** Declared intent only, preserved by existing graph history; never pixel-inferred. */
  creativeMetadata?: SceneCreativeMetadata;
  schemaVersion: typeof AD_SCENE_GRAPH_SCHEMA_VERSION | string;
  canvas: AdSceneCanvasDto;
  layers: AdSceneLayerDto[];
  /**
   * Optional provenance (additive). Ignored by older consumers.
   * templateCatalogVersion ≠ schemaVersion.
   */
  templateId?: string;
  templateVersion?: string;
  templateCatalogVersion?: string;
  layoutFamily?: string;
}

const UNSAFE_URL = /^(javascript|data|vbscript|https?):/i;
const MAX_LAYERS = 80;
const MAX_CANVAS = 4096;
const MIN_CANVAS = 64;

export class AdSceneGraphContractValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdSceneGraphContractValidationError';
  }
}

export function createEmptyAdSceneGraphDto(
  width = 1080,
  height = 1350,
  backgroundColor = '#FFFFFF',
): AdSceneGraphDto {
  return {
    schemaVersion: AD_SCENE_GRAPH_SCHEMA_VERSION,
    canvas: { width, height, backgroundColor },
    layers: [],
  };
}

/**
 * Validate AdSceneGraph 1.0 wire shape (additive fields allowed).
 * Rejects signed/http URLs in assetId/storageKey.
 */
export function validateAdSceneGraphDto(input: unknown): AdSceneGraphDto {
  if (!input || typeof input !== 'object') {
    throw new AdSceneGraphContractValidationError('sceneGraph must be an object');
  }
  const raw = input as Record<string, unknown>;
  const schemaVersion = raw['schemaVersion'];
  if (typeof schemaVersion !== 'string' || !schemaVersion.trim()) {
    throw new AdSceneGraphContractValidationError('schemaVersion is required');
  }
  // Accept 1.0 and forward-compatible 1.x strings; reject motion 2.0 kind graphs here.
  if (raw['kind'] === 'animated') {
    throw new AdSceneGraphContractValidationError(
      'animated motion graphs are not AdSceneGraph 1.0',
    );
  }

  const canvasRaw = raw['canvas'];
  if (!canvasRaw || typeof canvasRaw !== 'object') {
    throw new AdSceneGraphContractValidationError('canvas is required');
  }
  const canvas = canvasRaw as Record<string, unknown>;
  const width = Number(canvas['width']);
  const height = Number(canvas['height']);
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new AdSceneGraphContractValidationError(
      'canvas width/height must be numbers',
    );
  }
  if (
    width < MIN_CANVAS ||
    height < MIN_CANVAS ||
    width > MAX_CANVAS ||
    height > MAX_CANVAS
  ) {
    throw new AdSceneGraphContractValidationError(
      `canvas dimensions must be between ${MIN_CANVAS} and ${MAX_CANVAS}`,
    );
  }
  const layersRaw = raw['layers'];
  if (!Array.isArray(layersRaw)) {
    throw new AdSceneGraphContractValidationError('layers must be an array');
  }
  if (layersRaw.length > MAX_LAYERS) {
    throw new AdSceneGraphContractValidationError(
      `layers exceed maximum of ${MAX_LAYERS}`,
    );
  }

  const ids = new Set<string>();
  const layers: AdSceneLayerDto[] = [];
  for (const entry of layersRaw) {
    if (!entry || typeof entry !== 'object') {
      throw new AdSceneGraphContractValidationError('each layer must be an object');
    }
    const layer = entry as Record<string, unknown>;
    const id = typeof layer['id'] === 'string' ? layer['id'].trim() : '';
    if (!id) {
      throw new AdSceneGraphContractValidationError('layer.id is required');
    }
    if (ids.has(id)) {
      throw new AdSceneGraphContractValidationError(`duplicate layer id: ${id}`);
    }
    ids.add(id);

    const type = layer['type'];
    if (
      type !== 'image' &&
      type !== 'text' &&
      type !== 'shape' &&
      type !== 'logo' &&
      type !== 'group'
    ) {
      throw new AdSceneGraphContractValidationError(
        `unsupported layer type: ${String(type)}`,
      );
    }

    for (const key of ['x', 'y', 'width', 'height', 'zIndex'] as const) {
      if (!Number.isFinite(Number(layer[key]))) {
        throw new AdSceneGraphContractValidationError(
          `layer.${key} must be a number (${id})`,
        );
      }
    }

    const assetId = layer['assetId'];
    if (typeof assetId === 'string' && UNSAFE_URL.test(assetId)) {
      throw new AdSceneGraphContractValidationError(
        `unsafe assetId on layer ${id} (signed URLs not allowed)`,
      );
    }
    const storageKey = layer['storageKey'];
    if (typeof storageKey === 'string' && UNSAFE_URL.test(storageKey)) {
      throw new AdSceneGraphContractValidationError(
        `unsafe storageKey on layer ${id} (signed URLs not allowed)`,
      );
    }
    const text = layer['text'];
    if (typeof text === 'string' && text.length > 4000) {
      throw new AdSceneGraphContractValidationError(`text too long on layer ${id}`);
    }

    layers.push(layer as unknown as AdSceneLayerDto);
  }

  const bg = canvas['backgroundColor'];
  const out: AdSceneGraphDto = {
    schemaVersion: schemaVersion.trim(),
    canvas: {
      width: Math.round(width),
      height: Math.round(height),
      backgroundColor: typeof bg === 'string' ? bg : '#FFFFFF',
    },
    layers,
  };

  const metadata = validateSceneCreativeMetadata(raw['creativeMetadata']);
  if(metadata)out.creativeMetadata=metadata;
  const templateId = raw['templateId'];
  if (typeof templateId === 'string' && templateId.trim()) {
    out.templateId = templateId.trim();
  }
  const templateVersion = raw['templateVersion'];
  if (typeof templateVersion === 'string' && templateVersion.trim()) {
    out.templateVersion = templateVersion.trim();
  }
  const templateCatalogVersion = raw['templateCatalogVersion'];
  if (
    typeof templateCatalogVersion === 'string' &&
    templateCatalogVersion.trim()
  ) {
    out.templateCatalogVersion = templateCatalogVersion.trim();
  }
  const layoutFamily = raw['layoutFamily'];
  if (typeof layoutFamily === 'string' && layoutFamily.trim()) {
    out.layoutFamily = layoutFamily.trim();
  }

  return out;
}

export function isAdSceneOutputFormatId(
  value: unknown,
): value is AdSceneOutputFormatId {
  return (
    typeof value === 'string' &&
    (AD_SCENE_OUTPUT_FORMAT_IDS as readonly string[]).includes(value)
  );
}
