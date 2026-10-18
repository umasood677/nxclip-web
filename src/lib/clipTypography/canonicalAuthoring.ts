import { prepareCanonicalLayout, PARITY_FONT_PACKAGE, type CanonicalTypographyLayout } from './canonicalLayout';
import { CANONICAL_FACE_DEFAULT, type CanonicalFaceId } from './canonicalFaces';

/** One caption layer on the clip (style + placement + time range). */
export type CanonicalLayerDraft = {
  id: string;
  faceId: CanonicalFaceId;
  text: string;
  fontSize: number;
  fill: string;
  outline: number;
  shadow: number;
  align: 'left' | 'center' | 'right';
  lineHeightRatio: number;
  letterSpacing: number;
  positionX: number;
  verticalAnchor: number;
  /** Inclusive start within the polished clip (ms from clip start). */
  startMs: number;
  /** Exclusive end within the polished clip (ms from clip start). */
  endMs: number;
};

/** Multi-layer Smart Typography composition. */
export type CanonicalCompositionDraft = {
  safeInset: number;
  layers: CanonicalLayerDraft[];
  activeLayerId: string;
};

/** @deprecated Prefer CanonicalLayerDraft — kept for gradual call-site migration. */
export type CanonicalAuthoringDraft = CanonicalLayerDraft & { safeInset?: number };

export const DEFAULT_LAYER_DRAFT: Omit<CanonicalLayerDraft, 'id' | 'startMs' | 'endMs'> = {
  faceId: CANONICAL_FACE_DEFAULT,
  text: '',
  fontSize: 56,
  fill: '#FFFFFF',
  outline: 2,
  shadow: 4,
  align: 'center',
  lineHeightRatio: 1.25,
  letterSpacing: 0,
  positionX: 0.5,
  verticalAnchor: 0.72,
};

export const DEFAULT_CANONICAL_DRAFT: CanonicalAuthoringDraft = {
  ...DEFAULT_LAYER_DRAFT,
  id: 'caption',
  startMs: 0,
  endMs: 5000,
  safeInset: 0.08,
};

export function aspectToPixelSize(aspect: string | undefined): { width: number; height: number } {
  if (aspect === '16:9') return { width: 1920, height: 1080 };
  if (aspect === '1:1') return { width: 1080, height: 1080 };
  return { width: 1080, height: 1920 };
}

function nextLayerId(existing: string[]): string {
  let n = existing.length + 1;
  let id = `caption-${n}`;
  while (existing.includes(id)) {
    n += 1;
    id = `caption-${n}`;
  }
  return id;
}

export function createLayerDraft(
  opts: {
    existingIds?: string[];
    durationMs: number;
    seed?: Partial<CanonicalLayerDraft>;
  },
): CanonicalLayerDraft {
  const durationMs = Math.max(1000, Math.round(opts.durationMs));
  const startMs = Math.min(
    Math.max(0, Math.round(opts.seed?.startMs ?? 0)),
    Math.max(0, durationMs - 500),
  );
  const endMs = Math.min(
    durationMs,
    Math.max(startMs + 400, Math.round(opts.seed?.endMs ?? Math.min(durationMs, startMs + Math.min(3000, durationMs)))),
  );
  return {
    ...DEFAULT_LAYER_DRAFT,
    ...opts.seed,
    id: opts.seed?.id && /^[a-z0-9-]{1,64}$/.test(opts.seed.id)
      ? opts.seed.id
      : nextLayerId(opts.existingIds ?? []),
    startMs,
    endMs,
    faceId: (opts.seed?.faceId as CanonicalFaceId) || CANONICAL_FACE_DEFAULT,
  };
}

export function createDefaultComposition(durationMs: number, fallbackText = ''): CanonicalCompositionDraft {
  const layer = createLayerDraft({
    durationMs,
    existingIds: [],
    seed: { id: 'caption', text: fallbackText, startMs: 0, endMs: Math.max(1000, durationMs) },
  });
  return { safeInset: 0.08, layers: [layer], activeLayerId: layer.id };
}

export function getActiveLayer(draft: CanonicalCompositionDraft): CanonicalLayerDraft {
  return draft.layers.find((l) => l.id === draft.activeLayerId) ?? draft.layers[0]!;
}

export function draftFromPlan(
  plan: CanonicalTypographyLayout | undefined,
  fallbackText = '',
  durationMs = 5000,
): CanonicalCompositionDraft {
  if (!plan?.layers?.length) {
    return createDefaultComposition(durationMs, fallbackText);
  }
  const faceOk = PARITY_FONT_PACKAGE.faces.some((f) => f.id === plan.faceId);
  const planFace = (faceOk ? plan.faceId : CANONICAL_FACE_DEFAULT) as CanonicalFaceId;
  const inset = 0.08;
  const contentTop = plan.height * inset;
  const contentBottom = plan.height * (1 - inset);
  const contentHeight = Math.max(1, contentBottom - contentTop);

  const layers = plan.layers.map((layer, index) => {
    const text = layer.lines.map((l) => l.text).join('\n');
    const verticalAnchor = Math.min(
      1,
      Math.max(0, (layer.lines[0]?.baseline ?? contentTop + contentHeight * 0.72) - contentTop) / contentHeight,
    );
    const xs = layer.lines.map((l) => l.x);
    const minX = xs.length ? Math.min(...xs) : plan.width * 0.5;
    const maxX = xs.length ? Math.max(...xs) : plan.width * 0.5;
    const positionX = Math.min(1, Math.max(0, (minX + maxX) / 2 / plan.width));
    return {
      ...DEFAULT_LAYER_DRAFT,
      id: /^[a-z0-9-]{1,64}$/.test(layer.id) ? layer.id : `caption-${index + 1}`,
      faceId: planFace,
      text: text || (index === 0 ? fallbackText : ''),
      fontSize: layer.fontSize,
      fill: layer.fill,
      outline: layer.outline,
      shadow: layer.shadow,
      align: layer.align,
      lineHeightRatio: layer.fontSize > 0 ? layer.lineHeight / layer.fontSize : 1.25,
      letterSpacing: layer.letterSpacing,
      positionX,
      verticalAnchor,
      startMs: Math.max(0, Math.round(layer.startMs)),
      endMs: Math.max(Math.round(layer.startMs) + 400, Math.round(layer.endMs)),
    } satisfies CanonicalLayerDraft;
  });

  return {
    safeInset: 0.08,
    layers,
    activeLayerId: layers[0]!.id,
  };
}

/** Build a validated layout. Plan faceId = first layer's face (v1 contract is single-face). */
export async function buildLayoutFromComposition(
  draft: CanonicalCompositionDraft,
  opts: { aspect?: string; durationMs: number },
): Promise<CanonicalTypographyLayout> {
  const durationMs = Math.max(1000, Math.round(opts.durationMs));
  const { width, height } = aspectToPixelSize(opts.aspect);
  const inset = Math.min(0.2, Math.max(0.05, draft.safeInset));
  const insetPx = Math.round(width * inset);
  const maxWidth = Math.round(width * (1 - 2 * inset));
  const contentTop = Math.round(height * inset);
  const contentBottom = Math.round(height * (1 - inset));
  const contentHeight = Math.max(1, contentBottom - contentTop);

  const usable = draft.layers.filter((l) => l.text.trim().length > 0);
  const source = usable.length ? usable : draft.layers.slice(0, 1);
  const primaryFace = source[0]?.faceId ?? CANONICAL_FACE_DEFAULT;

  const layers = source.map((layer, index) => {
    const text = layer.text.trim() || ' ';
    const fontSize = Math.min(512, Math.max(8, Math.round(layer.fontSize)));
    const lineHeight = Math.min(1024, Math.max(fontSize, Math.round(fontSize * layer.lineHeightRatio)));
    const anchorY = Math.min(1, Math.max(0, layer.verticalAnchor));
    const anchorX = Math.min(1, Math.max(0, layer.positionX));
    const firstBaseline = Math.min(
      contentBottom - 4,
      Math.max(contentTop + fontSize, Math.round(contentTop + contentHeight * anchorY)),
    );
    const preferredLeft = Math.round(width * anchorX - maxWidth / 2);
    const left = Math.min(width - insetPx - maxWidth, Math.max(insetPx, preferredLeft));
    const startMs = Math.min(durationMs - 1, Math.max(0, Math.round(layer.startMs)));
    const endMs = Math.min(durationMs, Math.max(startMs + 1, Math.round(layer.endMs)));
    const id = /^[a-z0-9-]{1,64}$/.test(layer.id) ? layer.id : `caption-${index + 1}`;
    return {
      id,
      startMs,
      endMs,
      fontSize,
      lineHeight,
      letterSpacing: Math.min(32, Math.max(0, layer.letterSpacing)),
      align: layer.align,
      fill: /^#[0-9a-fA-F]{6}$/.test(layer.fill) ? layer.fill : '#FFFFFF',
      outline: Math.min(16, Math.max(0, layer.outline)),
      shadow: Math.min(32, Math.max(0, layer.shadow)),
      text,
      left,
      firstBaseline,
      maxWidth,
    };
  });

  return prepareCanonicalLayout({
    faceId: primaryFace,
    width,
    height,
    layers,
  });
}

/** @deprecated Use buildLayoutFromComposition */
export async function buildLayoutFromDraft(
  draft: CanonicalAuthoringDraft,
  opts: { aspect?: string; startMs?: number; endMs?: number },
): Promise<CanonicalTypographyLayout> {
  const durationMs = Math.max(1000, opts.endMs ?? 5000);
  const composition: CanonicalCompositionDraft = {
    safeInset: draft.safeInset ?? 0.08,
    activeLayerId: draft.id || 'caption',
    layers: [
      {
        id: draft.id || 'caption',
        faceId: draft.faceId,
        text: draft.text,
        fontSize: draft.fontSize,
        fill: draft.fill,
        outline: draft.outline,
        shadow: draft.shadow,
        align: draft.align,
        lineHeightRatio: draft.lineHeightRatio,
        letterSpacing: draft.letterSpacing,
        positionX: draft.positionX,
        verticalAnchor: draft.verticalAnchor,
        startMs: opts.startMs ?? draft.startMs ?? 0,
        endMs: opts.endMs ?? draft.endMs ?? durationMs,
      },
    ],
  };
  return buildLayoutFromComposition(composition, { aspect: opts.aspect, durationMs });
}

export function compositionHasMixedFonts(draft: CanonicalCompositionDraft): boolean {
  const faces = new Set(draft.layers.map((l) => l.faceId));
  return faces.size > 1;
}
