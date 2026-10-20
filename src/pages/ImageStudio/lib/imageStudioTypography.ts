import type { CSSProperties } from 'react';
import {
  CANONICAL_FACE_DEFAULT,
  CANONICAL_FACE_OPTIONS,
  type CanonicalFaceId,
} from '../../../lib/clipTypography/canonicalFaces';
import type { ImageEditTextLayer } from '../types';

/** Map Smart Typography faces onto Image Studio compose fonts (v1 burn set). */
export function faceIdToEditFontId(
  faceId?: string | null,
): NonNullable<ImageEditTextLayer['fontId']> {
  const id = String(faceId || '').toLowerCase();
  if (!id) return 'impact';
  if (id.includes('inter') || id.includes('jetbrains') || id.includes('playfair') || id.includes('caveat')) {
    return 'inter';
  }
  if (
    id.includes('montserrat') ||
    id.includes('poppins') ||
    id.includes('jakarta')
  ) {
    return 'montserrat';
  }
  return 'impact';
}

export function editFontIdToDefaultFaceId(
  fontId?: ImageEditTextLayer['fontId'],
): CanonicalFaceId {
  if (fontId === 'inter') return 'inter-700-normal' as CanonicalFaceId;
  if (fontId === 'montserrat') return 'montserrat-800-normal' as CanonicalFaceId;
  return CANONICAL_FACE_DEFAULT;
}

export function resolveLayerFaceId(layer: ImageEditTextLayer): CanonicalFaceId {
  if (layer.faceId && CANONICAL_FACE_OPTIONS.some((f) => f.id === layer.faceId)) {
    return layer.faceId as CanonicalFaceId;
  }
  return editFontIdToDefaultFaceId(layer.fontId);
}

/** CSS family after FontLoaderService registers the face (`NxClip T2 ${family}`). */
export function cssFamilyForFaceId(faceId: string): {
  family: string;
  weight: number;
  style: string;
} {
  const face = CANONICAL_FACE_OPTIONS.find((f) => f.id === faceId);
  if (!face) {
    return { family: '"Studio Anton", sans-serif', weight: 400, style: 'normal' };
  }
  return {
    family: `"NxClip T2 ${face.family}"`,
    weight: face.weight,
    style: face.style,
  };
}

export function studioFontFamily(fontId?: ImageEditTextLayer['fontId']): string {
  if (fontId === 'montserrat') return '"Studio Montserrat", sans-serif';
  if (fontId === 'inter') return '"Studio Inter", sans-serif';
  return '"Studio Anton", sans-serif';
}

function shadowColorToRgba(hex: string | undefined, alpha: number): string {
  const raw = (hex || '#000000').replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return `rgba(0,0,0,${alpha})`;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function layerPreviewStyle(
  layer: ImageEditTextLayer,
  opts: { useCanonicalFaces: boolean; brightness: number; contrast: number; saturation: number },
): CSSProperties {
  const outline = Math.max(0, Math.min(12, layer.outline ?? 2));
  const shadow = Math.max(0, Math.min(24, layer.shadow ?? 4));
  const letterSpacing = Math.max(0, Math.min(24, layer.letterSpacing ?? 0));
  const lineHeight = Math.max(1, Math.min(2.4, layer.lineHeightRatio ?? 1.1));
  const faceId = resolveLayerFaceId(layer);
  const faceCss = opts.useCanonicalFaces ? cssFamilyForFaceId(faceId) : null;

  return {
    left: `${layer.xPct ?? 50}%`,
    top: `${layer.yPct ?? 50}%`,
    transform:
      layer.align === 'left'
        ? 'translate(0, -50%)'
        : layer.align === 'right'
          ? 'translate(-100%, -50%)'
          : 'translate(-50%, -50%)',
    color: layer.color || '#ffffff',
    fontSize: `${Math.max(2, Math.min(40, layer.fontSizePct ?? 8))}cqh`,
    fontWeight: faceCss?.weight ?? 400,
    fontStyle: faceCss?.style ?? 'normal',
    width: 'max-content',
    fontFamily: faceCss?.family ?? studioFontFamily(layer.fontId),
    textAlign: layer.align || 'center',
    WebkitTextStroke: outline > 0 ? `${0.02 + outline * 0.012}em ${layer.strokeColor || '#000000'}` : undefined,
    paintOrder: 'stroke fill',
    textShadow:
      shadow > 0
        ? `${shadow * 0.04}em ${shadow * 0.04}em ${shadow * 0.02}em ${shadowColorToRgba(layer.shadowColor, 0.65)}`
        : undefined,
    letterSpacing: letterSpacing ? `${letterSpacing * 0.02}em` : undefined,
    lineHeight,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    filter: `brightness(${opts.brightness}%) contrast(${opts.contrast}%) saturate(${opts.saturation}%)`,
  };
}

export const DEFAULT_TEXT_LAYER_STYLE: Pick<
  ImageEditTextLayer,
  | 'xPct'
  | 'yPct'
  | 'fontSizePct'
  | 'color'
  | 'strokeColor'
  | 'shadowColor'
  | 'align'
  | 'fontId'
  | 'faceId'
  | 'outline'
  | 'shadow'
  | 'letterSpacing'
  | 'lineHeightRatio'
> = {
  xPct: 50,
  yPct: 82,
  fontSizePct: 8,
  color: '#FFFFFF',
  strokeColor: '#000000',
  shadowColor: '#000000',
  align: 'center',
  fontId: 'impact',
  faceId: CANONICAL_FACE_DEFAULT,
  outline: 2,
  shadow: 4,
  letterSpacing: 0,
  lineHeightRatio: 1.15,
};
