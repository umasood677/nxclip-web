import type { RectNorm } from './memeDesignSystem';

export interface SubjectFocus {
  /** 0–1 horizontal focal point in the source image. */
  x: number;
  /** 0–1 vertical focal point in the source image. */
  y: number;
}

export interface SmartCropPlacement {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Cover-crop the base plate so the subject focus lands near the template's
 * face safe-zone center, while still filling the canvas.
 */
export function computeSmartCropPlacement(
  canvasW: number,
  canvasH: number,
  faceSafe: RectNorm,
  subjectFocus?: SubjectFocus,
  zoom = 1.14,
): SmartCropPlacement {
  const focusX = clamp01(subjectFocus?.x ?? 0.5);
  const focusY = clamp01(subjectFocus?.y ?? 0.42);
  const targetX = clamp01(faceSafe.x + faceSafe.w / 2);
  const targetY = clamp01(faceSafe.y + faceSafe.h / 2);
  const scale = Math.max(1, zoom);
  const w = canvasW * scale;
  const h = canvasH * scale;
  let x = targetX * canvasW - focusX * w;
  let y = targetY * canvasH - focusY * h;
  x = Math.min(0, Math.max(canvasW - w, x));
  y = Math.min(0, Math.max(canvasH - h, y));
  return { x, y, w, h };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}
