/**
 * NxClip AI Meme Design System — shared layout DNA, mood colors, font pairing,
 * and the vocabulary every template / scorer / rewriter speaks.
 *
 * KEEP IN SYNC conceptually with the renderer in `meme-svg.ts` (Layout DNA is
 * applied there; this module is the single source of truth for the numbers).
 */

/** Canvas-relative layout tokens every template inherits. */
export const LAYOUT_DNA = {
  /** Outer inset from every canvas edge. */
  safeMargin: 0.06,
  /** Usable content band as a fraction of canvas width. */
  contentWidth: 0.88,
  /** Soft cap on a single text block so lines stay editorial, not full-bleed. */
  maxTextWidth: 0.7,
  /** Corner radius as a fraction of the short edge (~24px on 1080). */
  cornerRadius: 24 / 1080,
  /** Drop-shadow blur as a fraction of the short edge (~24px on 1080). */
  shadowBlur: 24 / 1080,
  /** Default photo overlay strength (0–1). Templates may still override. */
  overlayMin: 0.3,
  overlayMax: 0.6,
  /** Vertical gap between stacked text blocks (~32px on 1080). */
  verticalRhythm: 32 / 1080,
} as const;

export type LayoutDna = typeof LAYOUT_DNA;

/** Resolved pixel values for a concrete canvas. */
export interface LayoutMetrics {
  marginX: number;
  marginY: number;
  contentWidth: number;
  maxTextWidth: number;
  radius: number;
  shadowBlur: number;
  rhythm: number;
  overlayMin: number;
  overlayMax: number;
}

export function layoutMetrics(width: number, height: number): LayoutMetrics {
  const base = Math.min(width, height);
  return {
    marginX: width * LAYOUT_DNA.safeMargin,
    marginY: height * LAYOUT_DNA.safeMargin,
    contentWidth: width * LAYOUT_DNA.contentWidth,
    maxTextWidth: width * LAYOUT_DNA.maxTextWidth,
    radius: base * LAYOUT_DNA.cornerRadius,
    shadowBlur: base * LAYOUT_DNA.shadowBlur,
    rhythm: base * LAYOUT_DNA.verticalRhythm,
    overlayMin: LAYOUT_DNA.overlayMin,
    overlayMax: LAYOUT_DNA.overlayMax,
  };
}

/* ------------------------------------------------------------------ *
 * Mood colors
 * ------------------------------------------------------------------ */

export type MoodId =
  | 'luxury'
  | 'corporate'
  | 'breaking'
  | 'poster'
  | 'old_money'
  | 'cinematic'
  | 'documentary'
  | 'viral'
  | 'chat';

export interface MoodPalette {
  id: MoodId;
  label: string;
  /** Primary copy fill. */
  text: string;
  /** Secondary / deck / subhead. */
  textMuted: string;
  /** Accent (kickers, chips, rules). */
  accent: string;
  /** Dark plate behind type when needed. */
  plate: string;
  /** Outline / stroke for type on busy photos. */
  outline: string;
}

export const MOOD_PALETTES: Record<MoodId, MoodPalette> = {
  luxury: {
    id: 'luxury',
    label: 'Luxury',
    text: '#FFFDF7',
    textMuted: 'rgba(255,253,247,0.88)',
    accent: '#E2BE4A',
    plate: 'rgba(12,10,9,0.42)',
    outline: 'rgba(0,0,0,0.7)',
  },
  corporate: {
    id: 'corporate',
    label: 'Corporate',
    text: '#FFFFFF',
    textMuted: 'rgba(255,255,255,0.88)',
    accent: '#93C5FD',
    plate: 'rgba(15,23,42,0.45)',
    outline: 'rgba(0,0,0,0.65)',
  },
  breaking: {
    id: 'breaking',
    label: 'Breaking News',
    text: '#FFFFFF',
    textMuted: 'rgba(255,255,255,0.9)',
    accent: '#D72638',
    plate: 'rgba(215,38,56,0.92)',
    outline: 'rgba(0,0,0,0.75)',
  },
  poster: {
    id: 'poster',
    label: 'Movie Poster',
    text: '#FFFDF7',
    textMuted: 'rgba(245,215,110,0.92)',
    accent: '#F5D76E',
    plate: 'rgba(0,0,0,0.55)',
    outline: 'rgba(0,0,0,0.8)',
  },
  old_money: {
    id: 'old_money',
    label: 'Old Money',
    text: '#F5F0E6',
    textMuted: 'rgba(245,240,230,0.9)',
    accent: '#C4A574',
    plate: 'rgba(28,25,23,0.4)',
    outline: 'rgba(0,0,0,0.65)',
  },
  cinematic: {
    id: 'cinematic',
    label: 'Cinematic',
    text: '#FFFFFF',
    textMuted: 'rgba(253,230,138,0.95)',
    accent: '#FDE68A',
    plate: 'rgba(0,0,0,0.28)',
    outline: 'rgba(0,0,0,0.72)',
  },
  documentary: {
    id: 'documentary',
    label: 'Documentary',
    text: '#F8FAFC',
    textMuted: 'rgba(248,250,252,0.9)',
    accent: '#BBF7D0',
    plate: 'rgba(6,20,12,0.42)',
    outline: 'rgba(0,0,0,0.45)',
  },
  viral: {
    id: 'viral',
    label: 'Viral',
    text: '#FFFFFF',
    textMuted: 'rgba(255,255,255,0.92)',
    accent: '#F9A8D4',
    plate: 'rgba(8,6,16,0.42)',
    outline: 'rgba(0,0,0,0.72)',
  },
  chat: {
    id: 'chat',
    label: 'Conversation',
    text: '#FFFFFF',
    textMuted: 'rgba(255,255,255,0.9)',
    accent: '#7DD3FC',
    plate: 'rgba(12,18,32,0.35)',
    outline: 'rgba(0,0,0,0.7)',
  },
};

/* ------------------------------------------------------------------ *
 * Font pairing
 * ------------------------------------------------------------------ */

/** Display families that may lead a pair. */
export type DisplayFontId =
  | 'cormorant'
  | 'bodoni'
  | 'anton'
  | 'impact'
  | 'interBold';

/** Body families that may support a display face. */
export type BodyFontId = 'inter' | 'interBold';

/**
 * Allowed display → body pairings. Anything not listed is rejected so we never
 * ship Anton over Bodoni or similar clashes.
 */
export const FONT_PAIRINGS: Record<DisplayFontId, readonly BodyFontId[]> = {
  cormorant: ['inter', 'interBold'],
  bodoni: ['inter', 'interBold'],
  anton: ['inter', 'interBold'],
  impact: ['inter', 'interBold'],
  interBold: ['inter', 'interBold'],
};

export function isValidFontPair(
  display: DisplayFontId,
  body: BodyFontId,
): boolean {
  return (FONT_PAIRINGS[display] || []).includes(body);
}

export function assertFontPair(display: DisplayFontId, body: BodyFontId): void {
  if (!isValidFontPair(display, body)) {
    throw new Error(`Invalid font pair: ${display} + ${body}`);
  }
}

/* ------------------------------------------------------------------ *
 * Safe zones (normalized 0–1 rectangles)
 * ------------------------------------------------------------------ */

export interface RectNorm {
  /** Left edge as a fraction of canvas width. */
  x: number;
  /** Top edge as a fraction of canvas height. */
  y: number;
  w: number;
  h: number;
}

export interface SafeZones {
  /**
   * Where faces / eyes / jewelry / logos should stay. Text must not cover this
   * region — the AI image prompt and the layout both respect it.
   */
  face: RectNorm;
  /** Preferred band(s) for copy. */
  text: RectNorm[];
  /** Open negative space the composition can lean into. */
  negative: RectNorm[];
}

/* ------------------------------------------------------------------ *
 * Headline / structure styles
 * ------------------------------------------------------------------ */

export type HeadlineStyle =
  | 'quote_author' // large quote → small author/stat
  | 'title_deck_kicker' // huge title → deck → tiny category
  | 'bubbles' // stacked chat bubbles
  | 'stat_hook' // upper stat + lower-third hook
  | 'narrator_lines' // stacked documentary lines
  | 'impact_bars' // classic top/bottom
  | 'brand_tagline_cta' // ad chrome
  | 'diptych_labels' // left/right labels
  | 'dialogue_pov' // chat + POV bar
  | 'panel_stack'; // multi-panel cards

/* ------------------------------------------------------------------ *
 * Animation awareness (Qwen / reel motion)
 * ------------------------------------------------------------------ */

export type AnimationPreset =
  | 'slow_push_in'
  | 'slow_dolly'
  | 'dramatic_fade'
  | 'zoom_cuts'
  | 'parallax_drift'
  | 'static_hold';

export const ANIMATION_LABELS: Record<AnimationPreset, string> = {
  slow_push_in: 'Slow Push In',
  slow_dolly: 'Slow Dolly',
  dramatic_fade: 'Dramatic Fade',
  zoom_cuts: 'Zoom Cuts',
  parallax_drift: 'Parallax Drift',
  static_hold: 'Static Hold',
};

/* ------------------------------------------------------------------ *
 * Ideal copy length
 * ------------------------------------------------------------------ */

export interface IdealWordRange {
  /** Inclusive lower bound on total words across primary slots. */
  min: number;
  /** Inclusive upper bound. */
  max: number;
  /** Which slots count toward the word budget (omit = all). */
  primarySlots?: string[];
}

export function countWords(text: string): number {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function isWithinIdealWords(
  texts: Record<string, string>,
  range: IdealWordRange,
): boolean {
  const keys = range.primarySlots || Object.keys(texts);
  const total = keys.reduce((sum, key) => sum + countWords(texts[key] || ''), 0);
  return total >= range.min && total <= range.max;
}
