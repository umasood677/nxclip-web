import { prepareCanonicalLayout, PARITY_FONT_PACKAGE, type CanonicalTypographyLayout } from './canonicalLayout';
import { CANONICAL_FACE_DEFAULT, type CanonicalFaceId } from './canonicalFaces';

/** Draft controls mapped into prepareCanonicalLayout (single engine path). */
export type CanonicalAuthoringDraft = {
  faceId: CanonicalFaceId;
  text: string;
  fontSize: number;
  fill: string;
  /** Outline width in CSS px; stroke color is fixed black in v1 engine. */
  outline: number;
  shadow: number;
  align: 'left' | 'center' | 'right';
  lineHeightRatio: number;
  letterSpacing: number;
  /** Safe-area inset as fraction of frame (0.05–0.2). */
  safeInset: number;
  /** Vertical anchor 0–1 within the safe content box (0=top). */
  verticalAnchor: number;
};

export const DEFAULT_CANONICAL_DRAFT: CanonicalAuthoringDraft = {
  faceId: CANONICAL_FACE_DEFAULT,
  text: '',
  fontSize: 56,
  fill: '#FFFFFF',
  outline: 2,
  shadow: 4,
  align: 'center',
  lineHeightRatio: 1.25,
  letterSpacing: 0,
  safeInset: 0.08,
  verticalAnchor: 0.72,
};

export function aspectToPixelSize(aspect: string | undefined): { width: number; height: number } {
  if (aspect === '16:9') return { width: 1920, height: 1080 };
  if (aspect === '1:1') return { width: 1080, height: 1080 };
  return { width: 1080, height: 1920 };
}

export function draftFromPlan(plan: CanonicalTypographyLayout | undefined, fallbackText = ''): CanonicalAuthoringDraft {
  if (!plan?.layers?.[0]) {
    return { ...DEFAULT_CANONICAL_DRAFT, text: fallbackText };
  }
  const layer = plan.layers[0];
  const text = layer.lines.map((l) => l.text).join('\n');
  const faceOk = PARITY_FONT_PACKAGE.faces.some((f) => f.id === plan.faceId);
  return {
    ...DEFAULT_CANONICAL_DRAFT,
    faceId: (faceOk ? plan.faceId : CANONICAL_FACE_DEFAULT) as CanonicalFaceId,
    text: text || fallbackText,
    fontSize: layer.fontSize,
    fill: layer.fill,
    outline: layer.outline,
    shadow: layer.shadow,
    align: layer.align,
    lineHeightRatio: layer.fontSize > 0 ? layer.lineHeight / layer.fontSize : 1.25,
    letterSpacing: layer.letterSpacing,
  };
}

/** Build a validated layout via the shared prepareCanonicalLayout path (browser metrics). */
export async function buildLayoutFromDraft(
  draft: CanonicalAuthoringDraft,
  opts: { aspect?: string; startMs?: number; endMs?: number },
): Promise<CanonicalTypographyLayout> {
  const text = draft.text.trim() || ' ';
  const { width, height } = aspectToPixelSize(opts.aspect);
  const inset = Math.min(0.2, Math.max(0.05, draft.safeInset));
  const left = Math.round(width * inset);
  const maxWidth = Math.round(width * (1 - 2 * inset));
  const contentTop = Math.round(height * inset);
  const contentBottom = Math.round(height * (1 - inset));
  const contentHeight = Math.max(1, contentBottom - contentTop);
  const fontSize = Math.min(512, Math.max(8, Math.round(draft.fontSize)));
  const lineHeight = Math.min(1024, Math.max(fontSize, Math.round(fontSize * draft.lineHeightRatio)));
  const anchor = Math.min(1, Math.max(0, draft.verticalAnchor));
  const firstBaseline = Math.min(
    contentBottom - 4,
    Math.max(contentTop + fontSize, Math.round(contentTop + contentHeight * anchor)),
  );
  const endMs = Math.max((opts.startMs ?? 0) + 1, opts.endMs ?? 5000);
  return prepareCanonicalLayout({
    faceId: draft.faceId,
    width,
    height,
    layers: [
      {
        id: 'caption',
        startMs: opts.startMs ?? 0,
        endMs,
        fontSize,
        lineHeight,
        letterSpacing: Math.min(32, Math.max(0, draft.letterSpacing)),
        align: draft.align,
        fill: /^#[0-9a-fA-F]{6}$/.test(draft.fill) ? draft.fill : '#FFFFFF',
        outline: Math.min(16, Math.max(0, draft.outline)),
        shadow: Math.min(32, Math.max(0, draft.shadow)),
        text,
        left,
        firstBaseline,
        maxWidth,
      },
    ],
  });
}
