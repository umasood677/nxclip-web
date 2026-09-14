/**
 * Pure meme SVG renderer — no framework deps so the identical file can be
 * copied into the web app for a zero-latency live preview.
 *
 * KEEP IN SYNC with content-service meme-svg.ts / meme-fonts / meme-design-system / meme-smart-crop
 */

import { EmbeddedFaceId, fontFaceCss } from './memeFonts';
import {
  LAYOUT_DNA,
  LayoutMetrics,
  MOOD_PALETTES,
  MoodId,
  MoodPalette,
  RectNorm,
  layoutMetrics,
} from './memeDesignSystem';
import { computeSmartCropPlacement, SubjectFocus } from './memeSmartCrop';
import type { AnimationPreset } from './memeDesignSystem';

export type MemeSvgAspect = '1:1' | '16:9' | '9:16' | '4:5';

export interface MemeSvgInput {
  templateId: string;
  /** slotId -> text */
  slots: Record<string, string>;
  aspect: MemeSvgAspect;
  /** `data:` URI or absolute href for the base image layer. */
  baseImageHref?: string;
  /**
   * Optional second plate for true diptych templates (right panel).
   * When omitted, the right half uses a muted mesh (or the primary image if
   * `baseImageHref` is set and the template needs a fallback).
   */
  secondaryBaseImageHref?: string;
  watermark?: boolean;
  /**
   * Logo used by the watermark, as a `data:` URI. Injected by the caller so
   * this module stays asset-free and identical across backend and web.
   */
  brandLogoHref?: string;
  /** Slot ids rendered dimmed because they hold placeholder copy (FE preview). */
  placeholderSlots?: string[];
  /**
   * Namespaces internal `<defs>` ids. Required when several of these SVGs are
   * inlined into one HTML document, otherwise `url(#glow)` resolves to the
   * first match on the page.
   */
  idPrefix?: string;
  /** Skip the base64 `@font-face` payload (previews that share a page-level font sheet). */
  embedFonts?: boolean;
  /** Override the template's mood palette (ivory / gold / …). */
  mood?: MoodId;
  /** Vision subject focus for safe-zone-aware cover crop. */
  subjectFocus?: SubjectFocus;
  /** When set, prefer these face safe zones over the template catalog. */
  faceSafeZone?: RectNorm;
  /** Embed a lightweight SMIL motion hint for reel-style export/preview. */
  animate?: boolean;
  /** Animation preset override (defaults to template design.animation). */
  animation?: AnimationPreset;
}

/** Every id emitted by `defs()`; used for namespacing. */
const DEF_IDS = [
  'bg',
  'blobA',
  'blobB',
  'vignette',
  'cardA',
  'scrimTop',
  'scrimBottom',
  'softShadow',
  'textShadow',
  'glow',
  'markMono',
  'clipLeft',
  'clipRight',
] as const;

export interface MemeSvgResult {
  svg: string;
  width: number;
  height: number;
}

/* ------------------------------------------------------------------ *
 * Design tokens
 * ------------------------------------------------------------------ */

/**
 * Type ramp. Sizes are a fraction of the canvas base (its short edge) rather
 * than pixels, so one definition covers 1080x1920, 1080x1350, 1080x1080,
 * 1920x1080 and anything we render at in future.
 *
 * On a 1080px base at 9:16 this resolves to roughly:
 * displayXl 96 · displayL 72 · heading 54 · body 42 · caption 36 · micro 24.
 */
const TYPE_SCALE = {
  /** Poster and cover titles. */
  displayXl: 0.089,
  /** Main meme copy — punchlines, quotes, headlines. */
  displayL: 0.067,
  /** Secondary lines, speaker names, button labels. */
  heading: 0.05,
  /** Narration and chat copy. */
  body: 0.039,
  /** Kickers, subheads, small labels. */
  caption: 0.033,
  /** Metadata: chips, indices, watermark-adjacent text. */
  micro: 0.022,
} as const;

export type TypeToken = keyof typeof TYPE_SCALE;

const TOKEN_ORDER: TypeToken[] = [
  'displayXl',
  'displayL',
  'heading',
  'body',
  'caption',
  'micro',
];

/**
 * Per-aspect trim. A square crop shows the same copy at a larger on-screen
 * scale than a 9:16 reel, so the ramp is tuned down as the canvas gets shorter.
 */
const ASPECT_TYPE_SCALE: Record<MemeSvgAspect, number> = {
  '9:16': 1,
  '4:5': 0.88,
  '1:1': 0.79,
  '16:9': 0.89,
};

/** Mood each template inherits from the design system. */
const TEMPLATE_MOOD: Record<string, MoodId> = {
  cinematic_subtitle: 'cinematic',
  conversation_cards: 'chat',
  magazine_headline: 'old_money',
  fake_documentary: 'documentary',
  luxury_quote: 'luxury',
  luxury_ad_chrome: 'luxury',
  dialogue_pov: 'viral',
  rich_vs_reality: 'poster',
  movie_poster: 'poster',
  breaking_news: 'breaking',
  blank_impact: 'corporate',
  drake: 'viral',
  two_panels: 'corporate',
  expanding_brain: 'viral',
  two_buttons: 'viral',
  modern_caption: 'corporate',
};

export { LAYOUT_DNA, layoutMetrics };

/**
 * Font roles. Exported memes are standalone `image/svg+xml` documents, so a
 * face only renders if it is embedded (see `meme-fonts.ts`); the trailing
 * system names are just insurance if the payload is ever stripped.
 */
interface FontRole {
  stack: string;
  weight: number;
  style?: 'italic';
  /** Mean glyph advance as a fraction of font-size, used for the auto-fit. */
  charRatio: number;
  face?: EmbeddedFaceId;
}

const FONTS = {
  /** Body and UI copy. */
  inter: {
    stack: "'Inter','Inter Variable',system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif",
    weight: 400,
    charRatio: 0.52,
    face: 'inter400',
  },
  interBold: {
    stack: "'Inter','Inter Variable',system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif",
    weight: 700,
    charRatio: 0.54,
    face: 'inter700',
  },
  /** Modern meme display face. */
  anton: {
    stack: "'Anton',Impact,Haettenschweiler,'Arial Narrow Bold','Arial Black',sans-serif",
    weight: 400,
    charRatio: 0.44,
    face: 'anton400',
  },
  /** Classic meme lockup — Impact when the viewer has it, Anton everywhere else. */
  impact: {
    stack: "Impact,'Anton',Haettenschweiler,'Arial Narrow Bold','Arial Black',sans-serif",
    weight: 400,
    charRatio: 0.46,
    face: 'anton400',
  },
  /** Cinematic / luxury serif. */
  cormorant: {
    stack: "'Cormorant Garamond','Playfair Display',Garamond,'Palatino Linotype',Palatino,Georgia,serif",
    weight: 600,
    charRatio: 0.42,
    face: 'cormorant600',
  },
  cormorantItalic: {
    stack: "'Cormorant Garamond','Playfair Display',Garamond,'Palatino Linotype',Palatino,Georgia,serif",
    weight: 600,
    style: 'italic',
    charRatio: 0.41,
    face: 'cormorant600Italic',
  },
  /** Editorial Didone for cover titles. */
  bodoni: {
    stack: "'Bodoni Moda',Didot,'Bodoni MT','Playfair Display',Georgia,serif",
    weight: 700,
    charRatio: 0.47,
    face: 'bodoni700',
  },
} as const satisfies Record<string, FontRole>;

export type FontId = keyof typeof FONTS;

/** Caps run wider than mixed case, so tracked uppercase copy needs headroom. */
const UPPERCASE_WIDTH_BOOST = 1.07;

export function canvasSizeForAspect(aspect: MemeSvgAspect): {
  width: number;
  height: number;
} {
  switch (aspect) {
    case '16:9':
      return { width: 1920, height: 1080 };
    case '9:16':
      return { width: 1080, height: 1920 };
    case '4:5':
      return { width: 1080, height: 1350 };
    default:
      return { width: 1080, height: 1080 };
  }
}

/** Resolved pixel size for a token on a given canvas. */
export function typeSize(
  token: TypeToken,
  aspect: MemeSvgAspect,
  base = Math.min(...Object.values(canvasSizeForAspect(aspect))),
): number {
  return base * TYPE_SCALE[token] * ASPECT_TYPE_SCALE[aspect];
}

/* ------------------------------------------------------------------ *
 * Text engine
 * ------------------------------------------------------------------ */

export function escapeXml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Greedy wrap with hard-break for words longer than a line. */
function wrapText(text: string, maxChars: number): string[] {
  const limit = Math.max(4, Math.floor(maxChars));
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  const pushCurrent = () => {
    if (current) {
      lines.push(current);
      current = '';
    }
  };

  for (const word of words) {
    if (word.length > limit) {
      pushCurrent();
      for (let i = 0; i < word.length; i += limit) {
        lines.push(word.slice(i, i + limit));
      }
      continue;
    }
    const next = current ? `${current} ${word}` : word;
    if (next.length <= limit) {
      current = next;
    } else {
      pushCurrent();
      current = word;
    }
  }
  pushCurrent();
  return lines;
}

interface TextBlockOptions {
  text: string;
  x: number;
  /** Block anchor; interpreted per `align`. */
  y: number;
  maxWidth: number;
  maxLines: number;
  size: number;
  minSize?: number;
  family?: string;
  weight?: number;
  style?: 'italic';
  fill?: string;
  anchor?: 'start' | 'middle' | 'end';
  /** `center` treats y as the vertical midpoint, `top` as the cap line. */
  align?: 'center' | 'top';
  lineHeight?: number;
  uppercase?: boolean;
  letterSpacing?: number;
  outline?: { color: string; width: number };
  opacity?: number;
  charRatio?: number;
  shadow?: string;
}

/**
 * What a renderer asks for: a role from the type ramp and a font role, never a
 * pixel size. `minToken` caps how far the auto-fit may shrink before it
 * truncates instead.
 */
interface TextSpec extends Omit<TextBlockOptions, 'size' | 'minSize' | 'family' | 'weight' | 'style' | 'charRatio'> {
  token: TypeToken;
  font?: FontId;
  minToken?: TypeToken;
  /** Tracking as a fraction of the resolved font size. */
  tracking?: number;
}

interface TextBlockResult {
  svg: string;
  height: number;
  fontSize: number;
  lineCount: number;
}

/** Shrinks the font until the copy fits `maxWidth` x `maxLines`, then wraps it. */
function textBlock(options: TextBlockOptions): TextBlockResult {
  const {
    text,
    x,
    y,
    maxWidth,
    maxLines,
    size,
    minSize = size * 0.72,
    family = FONTS.inter.stack,
    weight = 400,
    style,
    fill = '#ffffff',
    anchor = 'middle',
    align = 'center',
    lineHeight = 1.16,
    uppercase = false,
    letterSpacing = 0,
    outline,
    opacity = 1,
    charRatio = FONTS.inter.charRatio,
    shadow,
  } = options;

  const raw = uppercase ? String(text || '').toUpperCase() : String(text || '');
  if (!raw.trim()) {
    return { svg: '', height: 0, fontSize: size, lineCount: 0 };
  }

  // Tracking and caps both widen the line; ignoring them made tracked headings
  // wrap past their box and look off-grid.
  const ratio = uppercase ? charRatio * UPPERCASE_WIDTH_BOOST : charRatio;
  const charsPerLine = (candidate: number) =>
    maxWidth / (candidate * ratio + letterSpacing);

  let fontSize = size;
  let lines = wrapText(raw, charsPerLine(fontSize));
  while (lines.length > maxLines && fontSize > minSize) {
    fontSize = Math.max(minSize, fontSize * 0.92);
    lines = wrapText(raw, charsPerLine(fontSize));
  }
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    const last = lines[maxLines - 1];
    lines[maxLines - 1] = last.length > 1 ? `${last.slice(0, -1)}…` : last;
  }

  const step = fontSize * lineHeight;
  const blockHeight = step * lines.length;
  // Baseline of the first line (~0.76 of size sits above the baseline).
  const firstBaseline =
    align === 'center'
      ? y - blockHeight / 2 + fontSize * 0.78 + (step - fontSize) / 2
      : y + fontSize * 0.78;

  const strokeAttrs = outline
    ? ` stroke="${outline.color}" stroke-width="${round(outline.width)}" stroke-linejoin="round" paint-order="stroke fill"`
    : '';
  const filterAttr = shadow ? ` filter="url(#${shadow})"` : '';
  const spacingAttr = letterSpacing ? ` letter-spacing="${round(letterSpacing)}"` : '';
  const opacityAttr = opacity !== 1 ? ` opacity="${round(opacity)}"` : '';

  // SVG tracking also lands after the final glyph, which drags centred and
  // right-aligned copy off its anchor. Nudge it back so it reads as aligned.
  const anchorX =
    anchor === 'middle' ? x + letterSpacing / 2 : anchor === 'end' ? x + letterSpacing : x;

  const styleAttr = style ? ` font-style="${style}"` : '';

  const svg = lines
    .map((line, i) => {
      const baseline = firstBaseline + i * step;
      return `<text x="${round(anchorX)}" y="${round(baseline)}" text-anchor="${anchor}" font-family="${family}" font-size="${round(fontSize)}" font-weight="${weight}"${styleAttr} fill="${fill}"${spacingAttr}${strokeAttrs}${filterAttr}${opacityAttr}>${escapeXml(line)}</text>`;
    })
    .join('');

  return { svg, height: blockHeight, fontSize, lineCount: lines.length };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/* ------------------------------------------------------------------ *
 * Shared chrome
 * ------------------------------------------------------------------ */

interface Palette {
  /** Background gradient stops, dark -> darker. */
  base: [string, string];
  /** Accent blobs painted over the base. */
  blobs: [string, string];
  accent: string;
  accentSoft: string;
}

const PALETTES: Record<string, Palette> = {
  blank_impact: {
    base: ['#141c2e', '#05070d'],
    blobs: ['#3b82f6', '#8b5cf6'],
    accent: '#60a5fa',
    accentSoft: 'rgba(96,165,250,0.16)',
  },
  drake: {
    base: ['#161326', '#07060f'],
    blobs: ['#f43f5e', '#22c55e'],
    accent: '#a78bfa',
    accentSoft: 'rgba(167,139,250,0.16)',
  },
  two_panels: {
    base: ['#151228', '#07060e'],
    blobs: ['#6366f1', '#f97316'],
    accent: '#818cf8',
    accentSoft: 'rgba(129,140,248,0.16)',
  },
  expanding_brain: {
    base: ['#170f2b', '#06040d'],
    blobs: ['#7c3aed', '#22d3ee'],
    accent: '#c4b5fd',
    accentSoft: 'rgba(196,181,253,0.16)',
  },
  two_buttons: {
    base: ['#101827', '#05070d'],
    blobs: ['#ef4444', '#0ea5e9'],
    accent: '#f87171',
    accentSoft: 'rgba(248,113,113,0.16)',
  },
  modern_caption: {
    base: ['#0b2220', '#04100f'],
    blobs: ['#14b8a6', '#0ea5e9'],
    accent: '#5eead4',
    accentSoft: 'rgba(94,234,212,0.16)',
  },
  dialogue_pov: {
    base: ['#1a1024', '#07040e'],
    blobs: ['#f472b6', '#38bdf8'],
    accent: '#f9a8d4',
    accentSoft: 'rgba(249,168,212,0.16)',
  },
  cinematic_subtitle: {
    base: ['#0f172a', '#020617'],
    blobs: ['#fbbf24', '#3b82f6'],
    accent: '#fde68a',
    accentSoft: 'rgba(253,230,138,0.16)',
  },
  conversation_cards: {
    base: ['#0c1220', '#05070e'],
    blobs: ['#38bdf8', '#f472b6'],
    accent: '#7dd3fc',
    accentSoft: 'rgba(125,211,252,0.16)',
  },
  magazine_headline: {
    base: ['#1c1917', '#0c0a09'],
    blobs: ['#f8fafc', '#b45309'],
    accent: '#fafaf9',
    accentSoft: 'rgba(250,250,249,0.14)',
  },
  fake_documentary: {
    base: ['#14532d', '#052e16'],
    blobs: ['#4ade80', '#facc15'],
    accent: '#bbf7d0',
    accentSoft: 'rgba(187,247,208,0.16)',
  },
  luxury_quote: {
    base: ['#111827', '#030712'],
    blobs: ['#d4af37', '#94a3b8'],
    accent: '#e7e5e4',
    accentSoft: 'rgba(231,229,228,0.14)',
  },
  luxury_ad_chrome: {
    base: ['#18181b', '#09090b'],
    blobs: ['#e4e4e7', '#a16207'],
    accent: '#fafafa',
    accentSoft: 'rgba(250,250,250,0.12)',
  },
  rich_vs_reality: {
    base: ['#1c1917', '#0f172a'],
    blobs: ['#d4af37', '#64748b'],
    accent: '#fde68a',
    accentSoft: 'rgba(253,230,138,0.14)',
  },
};

function paletteFor(templateId: string): Palette {
  return PALETTES[templateId] || PALETTES.cinematic_subtitle || PALETTES.blank_impact;
}

function defs(
  templateId: string,
  width: number,
  height: number,
  u: number,
  layout: LayoutMetrics,
): string {
  const p = paletteFor(templateId);
  const overlay = (layout.overlayMin + layout.overlayMax) / 2;
  return `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stop-color="${p.base[0]}"/>
      <stop offset="100%" stop-color="${p.base[1]}"/>
    </linearGradient>
    <radialGradient id="blobA" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${p.blobs[0]}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${p.blobs[0]}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="blobB" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${p.blobs[1]}" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="${p.blobs[1]}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vignette" cx="50%" cy="45%" r="75%">
      <stop offset="55%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="${round(overlay)}"/>
    </radialGradient>
    <linearGradient id="cardA" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.13)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0.04)"/>
    </linearGradient>
    <linearGradient id="scrimTop" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.62"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="scrimBottom" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.68"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </linearGradient>
    <filter id="softShadow" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="${round(layout.shadowBlur * 0.35)}" stdDeviation="${round(layout.shadowBlur)}" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
    <filter id="textShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="${round(u * 0.35)}" stdDeviation="${round(u * 0.5)}" flood-color="#000000" flood-opacity="0.55"/>
    </filter>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="${round(u * 1.6)}" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="markMono" x="0%" y="0%" width="100%" height="100%">
      <feColorMatrix type="saturate" values="0"/>
    </filter>
    <clipPath id="clipLeft">
      <rect x="0" y="0" width="${round(width / 2)}" height="${height}"/>
    </clipPath>
    <clipPath id="clipRight">
      <rect x="${round(width / 2)}" y="0" width="${round(width / 2)}" height="${height}"/>
    </clipPath>
  </defs>`;
}

/** Mesh-gradient backdrop used whenever there is no base image. */
function meshBackground(width: number, height: number): string {
  const rx = width * 0.62;
  const ry = height * 0.62;
  return `<rect width="${width}" height="${height}" fill="url(#bg)"/>
    <ellipse cx="${round(width * 0.18)}" cy="${round(height * 0.14)}" rx="${round(rx)}" ry="${round(ry)}" fill="url(#blobA)"/>
    <ellipse cx="${round(width * 0.86)}" cy="${round(height * 0.88)}" rx="${round(rx)}" ry="${round(ry)}" fill="url(#blobB)"/>
    <rect width="${width}" height="${height}" fill="url(#vignette)"/>`;
}

function backgroundLayer(
  width: number,
  height: number,
  baseImageHref?: string,
  scrim = true,
  crop?: { faceSafe?: RectNorm; subjectFocus?: SubjectFocus },
): string {
  if (!baseImageHref) return meshBackground(width, height);
  const scrimLayer = scrim
    ? `<rect width="${width}" height="${height}" fill="#000000" opacity="0.18"/>
       <rect width="${width}" height="${height}" fill="url(#vignette)"/>`
    : '';

  let imageLayer: string;
  if (crop?.faceSafe) {
    const place = computeSmartCropPlacement(
      width,
      height,
      crop.faceSafe,
      crop.subjectFocus,
    );
    imageLayer = `<image href="${baseImageHref}" xlink:href="${baseImageHref}" x="${round(place.x)}" y="${round(place.y)}" width="${round(place.w)}" height="${round(place.h)}" preserveAspectRatio="none"/>`;
  } else {
    imageLayer = `<image href="${baseImageHref}" xlink:href="${baseImageHref}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>`;
  }

  return `${imageLayer}${scrimLayer}`;
}

/** Frosted card used by the panel-based templates. */
function card(
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  accent: string,
  opts: { fill?: string; strokeOpacity?: number } = {},
): string {
  const fill = opts.fill || 'url(#cardA)';
  return `<rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" rx="${round(radius)}" fill="rgba(6,8,15,0.55)" filter="url(#softShadow)"/>
    <rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" rx="${round(radius)}" fill="${fill}"/>
    <rect x="${round(x + 0.5)}" y="${round(y + 0.5)}" width="${round(w - 1)}" height="${round(h - 1)}" rx="${round(radius)}" fill="none" stroke="${accent}" stroke-opacity="${opts.strokeOpacity ?? 0.35}" stroke-width="${round(Math.max(1.5, w * 0.002))}"/>`;
}

/** Small uppercase label chip. Callers must `ctx.font('interBold')` so the face embeds. */
function chip(
  x: number,
  y: number,
  label: string,
  fontSize: number,
  color: string,
  bg: string,
): string {
  const face = FONTS.interBold;
  const padX = fontSize * 0.62;
  const tracking = fontSize * 0.12;
  const w = label.length * (fontSize * 0.64 + tracking) + padX * 2;
  const h = fontSize * 1.9;
  return `<rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" rx="${round(h / 2)}" fill="${bg}"/>
    <text x="${round(x + w / 2 + tracking / 2)}" y="${round(y + h / 2 + fontSize * 0.36)}" text-anchor="middle" font-family="${face.stack}" font-size="${round(fontSize)}" font-weight="${face.weight}" fill="${color}" letter-spacing="${round(tracking)}">${escapeXml(label.toUpperCase())}</text>`;
}

function crossIcon(cx: number, cy: number, r: number): string {
  const a = r * 0.46;
  return `<circle cx="${round(cx)}" cy="${round(cy)}" r="${round(r)}" fill="rgba(244,63,94,0.16)" stroke="#fb7185" stroke-width="${round(r * 0.12)}"/>
    <path d="M ${round(cx - a)} ${round(cy - a)} L ${round(cx + a)} ${round(cy + a)} M ${round(cx + a)} ${round(cy - a)} L ${round(cx - a)} ${round(cy + a)}" stroke="#fb7185" stroke-width="${round(r * 0.16)}" stroke-linecap="round"/>`;
}

function checkIcon(cx: number, cy: number, r: number): string {
  const a = r * 0.5;
  return `<circle cx="${round(cx)}" cy="${round(cy)}" r="${round(r)}" fill="rgba(34,197,94,0.16)" stroke="#4ade80" stroke-width="${round(r * 0.12)}"/>
    <path d="M ${round(cx - a)} ${round(cy)} L ${round(cx - a * 0.15)} ${round(cy + a * 0.7)} L ${round(cx + a)} ${round(cy - a * 0.6)}" fill="none" stroke="#4ade80" stroke-width="${round(r * 0.18)}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

/**
 * Corner brand mark: nxClip symbol only (no pill, no wordmark), sized off `u`
 * so it reads the same on every aspect ratio.
 */
export function watermarkMark(
  width: number,
  height: number,
  u: number,
  logoHref?: string,
): string {
  if (!logoHref) return '';

  const size = u * 5.2;
  const margin = u * 3;
  const x = width - size - margin;
  const y = height - size - margin;

  return `<g opacity="0.82">
    <image href="${logoHref}" xlink:href="${logoHref}" x="${round(x)}" y="${round(y)}" width="${round(size)}" height="${round(size)}" preserveAspectRatio="xMidYMid meet"/>
  </g>`;
}

/* ------------------------------------------------------------------ *
 * Templates
 * ------------------------------------------------------------------ */

interface RenderCtx {
  width: number;
  height: number;
  /** 1% of the short edge — layout only; type comes from the ramp. */
  u: number;
  /** Shared Layout DNA metrics for this canvas. */
  layout: LayoutMetrics;
  /** Mood palette (ivory / gold / …) for this template. */
  mood: MoodPalette;
  slot: (id: string) => string;
  dim: (id: string) => number;
  /** Lays out copy from the type ramp and records the font for embedding. */
  text: (spec: TextSpec) => TextBlockResult;
  /** Resolved pixel size for a token, for the few hand-placed `<text>` nodes. */
  size: (token: TypeToken) => number;
  /** Font role lookup; marks the face as used so it gets embedded. */
  font: (id: FontId) => FontRole;
  baseImageHref?: string;
  secondaryBaseImageHref?: string;
  palette: Palette;
  faceSafeZone?: RectNorm;
  subjectFocus?: SubjectFocus;
}

function layerBg(ctx: RenderCtx, scrim = true): string {
  return backgroundLayer(ctx.width, ctx.height, ctx.baseImageHref, scrim, {
    faceSafe: ctx.faceSafeZone,
    subjectFocus: ctx.subjectFocus,
  });
}

function createTypography(
  aspect: MemeSvgAspect,
  base: number,
  usedFaces: Set<EmbeddedFaceId>,
) {
  const size = (token: TypeToken) =>
    base * TYPE_SCALE[token] * ASPECT_TYPE_SCALE[aspect];

  const font = (id: FontId): FontRole => {
    const role = FONTS[id];
    if (role.face) usedFaces.add(role.face);
    return role;
  };

  const text = (spec: TextSpec): TextBlockResult => {
    const role = font(spec.font || 'inter');
    const resolved = size(spec.token);
    // The auto-fit may only walk down to `minToken`; past that the copy is
    // truncated rather than shrunk out of the design system.
    const floorToken =
      spec.minToken ??
      TOKEN_ORDER[Math.min(TOKEN_ORDER.indexOf(spec.token) + 1, TOKEN_ORDER.length - 1)];
    return textBlock({
      ...spec,
      size: resolved,
      minSize: Math.min(resolved, size(floorToken)),
      family: role.stack,
      weight: role.weight,
      style: role.style,
      charRatio: role.charRatio,
      letterSpacing: spec.tracking ? resolved * spec.tracking : spec.letterSpacing,
    });
  };

  return { size, font, text };
}

function renderBlankImpact(ctx: RenderCtx): string {
  const { width, height, u, baseImageHref, layout } = ctx;
  const bg = layerBg(ctx);
  const scrimH = height * 0.3;
  const scrims = `<rect x="0" y="0" width="${width}" height="${round(scrimH)}" fill="url(#scrimTop)"/>
    <rect x="0" y="${round(height - scrimH)}" width="${width}" height="${round(scrimH)}" fill="url(#scrimBottom)"/>`;

  const padY = layout.marginY;
  const shared = {
    x: width / 2,
    maxWidth: Math.min(width * 0.86, layout.maxTextWidth),
    maxLines: 3,
    token: 'displayL' as const,
    font: 'impact' as const,
    uppercase: true,
    tracking: 0.02,
    lineHeight: 1.04,
    // Impact convention: white fill, black outline.
    fill: '#ffffff',
    outline: { color: '#000000', width: u * 0.55 },
    shadow: 'textShadow',
  };

  const top = ctx.text({
    ...shared,
    text: ctx.slot('top'),
    y: padY,
    align: 'top',
    opacity: ctx.dim('top'),
  });
  // Measure first so a three-line punchline still clears the bottom edge and
  // the corner watermark.
  const bottomSize = ctx.text({ ...shared, text: ctx.slot('bottom'), y: 0 });
  const bottom = ctx.text({
    ...shared,
    text: ctx.slot('bottom'),
    y: height - padY - bottomSize.height / 2,
    opacity: ctx.dim('bottom'),
  });

  return `${bg}${scrims}${top.svg}${bottom.svg}`;
}

function renderDrake(ctx: RenderCtx): string {
  const { width, height, u, baseImageHref, palette, layout } = ctx;
  const bg = layerBg(ctx);
  const pad = layout.marginX;
  const gap = u * 3;
  const rowH = (height - pad * 2 - gap) / 2;
  const iconCol = Math.min(width * 0.28, rowH * 0.9);
  const radius = layout.radius;
  ctx.font('interBold');
  const chipSize = ctx.size('caption');

  const rows: Array<{ id: string; label: string; icon: string; tint: string }> = [
    { id: 'reject', label: 'Nope', icon: 'cross', tint: 'rgba(244,63,94,0.10)' },
    { id: 'approve', label: 'Yep', icon: 'check', tint: 'rgba(34,197,94,0.10)' },
  ];

  const body = rows
    .map((row, i) => {
      const y = pad + i * (rowH + gap);
      const iconR = Math.min(iconCol, rowH) * 0.28;
      const iconCx = pad + iconCol / 2;
      const iconCy = y + rowH / 2;
      const textX = pad + iconCol + u * 3;
      const textW = width - textX - pad - u * 3;
      const icon = row.icon === 'cross' ? crossIcon(iconCx, iconCy, iconR) : checkIcon(iconCx, iconCy, iconR);
      const text = ctx.text({
        text: ctx.slot(row.id),
        x: textX,
        y: y + rowH / 2 + u * 1.6,
        maxWidth: textW,
        maxLines: 3,
        token: 'heading',
        font: 'interBold',
        anchor: 'start',
        lineHeight: 1.1,
        tracking: -0.02,
        fill: '#f8fafc',
        shadow: 'textShadow',
        opacity: ctx.dim(row.id),
      });
      return `${card(pad, y, width - pad * 2, rowH, radius, palette.accent, { fill: row.tint })}
        <line x1="${round(pad + iconCol)}" y1="${round(y + rowH * 0.18)}" x2="${round(pad + iconCol)}" y2="${round(y + rowH * 0.82)}" stroke="rgba(255,255,255,0.12)" stroke-width="${round(u * 0.25)}"/>
        ${icon}
        ${chip(textX, y + rowH * 0.14, row.label, chipSize, i === 0 ? '#fecdd3' : '#bbf7d0', i === 0 ? 'rgba(244,63,94,0.22)' : 'rgba(34,197,94,0.22)')}
        ${text.svg}`;
    })
    .join('');

  return `${bg}${body}`;
}

function renderTwoPanels(ctx: RenderCtx): string {
  const { width, height, u, baseImageHref, palette, layout } = ctx;
  const bg = layerBg(ctx);
  const pad = layout.marginX;
  const gap = u * 3;
  const rowH = (height - pad * 2 - gap) / 2;
  const radius = layout.radius;
  const indexFace = ctx.font('interBold');
  const indexSize = ctx.size('caption');

  const rows = [
    { id: 'top', index: '01', accent: '#818cf8', tint: 'rgba(99,102,241,0.14)' },
    { id: 'bottom', index: '02', accent: '#fb923c', tint: 'rgba(249,115,22,0.14)' },
  ];

  const body = rows
    .map((row, i) => {
      const y = pad + i * (rowH + gap);
      const text = ctx.text({
        text: ctx.slot(row.id),
        x: width / 2,
        y: y + rowH / 2 + u * 2,
        maxWidth: width - pad * 2 - u * 8,
        maxLines: 3,
        token: 'heading',
        font: 'interBold',
        lineHeight: 1.1,
        tracking: -0.02,
        fill: '#f8fafc',
        shadow: 'textShadow',
        opacity: ctx.dim(row.id),
      });
      return `${card(pad, y, width - pad * 2, rowH, radius, palette.accent, { fill: row.tint })}
        <rect x="${round(pad)}" y="${round(y)}" width="${round(u * 1.1)}" height="${round(rowH)}" rx="${round(u * 0.55)}" fill="${row.accent}" opacity="0.9"/>
        <text x="${round(pad + u * 4)}" y="${round(y + u * 6.6)}" font-family="${indexFace.stack}" font-size="${round(indexSize)}" font-weight="${indexFace.weight}" fill="${row.accent}" letter-spacing="${round(indexSize * 0.12)}" opacity="0.9">${row.index}</text>
        ${text.svg}`;
    })
    .join('');

  return `${bg}${body}`;
}

function renderExpandingBrain(ctx: RenderCtx): string {
  const { width, height, u, baseImageHref, palette } = ctx;
  const bg = layerBg(ctx);
  const pad = u * 3.5;
  const gap = u * 2.2;
  const rowH = (height - pad * 2 - gap * 3) / 4;
  const radius = u * 3.4;
  const keys = ['level1', 'level2', 'level3', 'level4'];
  const tints = [
    'rgba(76,29,149,0.30)',
    'rgba(109,40,217,0.32)',
    'rgba(124,58,237,0.34)',
    'rgba(34,211,238,0.26)',
  ];
  const accents = ['#a78bfa', '#c4b5fd', '#ddd6fe', '#67e8f9'];

  const body = keys
    .map((key, i) => {
      const y = pad + i * (rowH + gap);
      const meterX = pad + u * 3;
      const meterW = Math.min(u * 12, width * 0.16);
      const dotR = Math.min(rowH * 0.1, u * 1.15);
      const dots = [0, 1, 2, 3]
        .map((d) => {
          const cx = meterX + (meterW / 4) * d + meterW / 8;
          const on = d <= i;
          return `<circle cx="${round(cx)}" cy="${round(y + rowH / 2)}" r="${round(dotR)}" fill="${on ? accents[i] : 'rgba(255,255,255,0.16)'}"${on ? ' filter="url(#glow)"' : ''}/>`;
        })
        .join('');
      const textX = meterX + meterW + u * 3;
      const text = ctx.text({
        text: ctx.slot(key),
        x: textX,
        y: y + rowH / 2 + u * 1.2,
        maxWidth: width - textX - pad - u * 2,
        maxLines: 2,
        token: 'heading',
        font: 'interBold',
        anchor: 'start',
        lineHeight: 1.1,
        tracking: -0.02,
        fill: '#f5f3ff',
        shadow: 'textShadow',
        opacity: ctx.dim(key),
      });
      return `${card(pad, y, width - pad * 2, rowH, radius, palette.accent, { fill: tints[i], strokeOpacity: 0.22 + i * 0.08 })}${dots}${text.svg}`;
    })
    .join('');

  return `${bg}${body}`;
}

function renderTwoButtons(ctx: RenderCtx): string {
  const { width, height, u, baseImageHref, palette } = ctx;
  const bg = layerBg(ctx);

  const pad = u * 5;
  const captionH = height * 0.2;
  const captionCard = card(
    pad,
    pad,
    width - pad * 2,
    captionH,
    u * 3.6,
    palette.accent,
    { fill: 'rgba(2,6,18,0.5)' },
  );
  const caption = ctx.text({
    text: ctx.slot('caption'),
    x: width / 2,
    y: pad + captionH / 2,
    maxWidth: width - pad * 2 - u * 7,
    maxLines: 2,
    token: 'heading',
    font: 'interBold',
    lineHeight: 1.1,
    tracking: -0.02,
    fill: '#f8fafc',
    shadow: 'textShadow',
    opacity: ctx.dim('caption'),
  });

  // Buttons fill the remaining space as a balanced pair with a VS divider.
  const areaTop = pad + captionH + u * 5;
  const areaH = height - areaTop - pad - u * 2;
  const btnH = Math.min(areaH, height * 0.36);
  const btnY = areaTop + (areaH - btnH) / 2;
  const gap = u * 6;
  const btnW = (width - pad * 2 - gap) / 2;
  const radius = u * 3.2;

  const button = (
    x: number,
    slotId: string,
    face: string,
    edge: string,
    ring: string,
  ) => {
    const shell = `<rect x="${round(x)}" y="${round(btnY + u * 1.2)}" width="${round(btnW)}" height="${round(btnH)}" rx="${round(radius)}" fill="${edge}"/>
      <rect x="${round(x)}" y="${round(btnY)}" width="${round(btnW)}" height="${round(btnH)}" rx="${round(radius)}" fill="${face}" filter="url(#softShadow)"/>
      <path d="M ${round(x + radius)} ${round(btnY)} H ${round(x + btnW - radius)} A ${round(radius)} ${round(radius)} 0 0 1 ${round(x + btnW)} ${round(btnY + radius)} V ${round(btnY + btnH * 0.42)} H ${round(x)} V ${round(btnY + radius)} A ${round(radius)} ${round(radius)} 0 0 1 ${round(x + radius)} ${round(btnY)} Z" fill="rgba(255,255,255,0.14)"/>
      <rect x="${round(x + 0.5)}" y="${round(btnY + 0.5)}" width="${round(btnW - 1)}" height="${round(btnH - 1)}" rx="${round(radius)}" fill="none" stroke="${ring}" stroke-opacity="0.6" stroke-width="${round(u * 0.3)}"/>`;
    const label = ctx.text({
      text: ctx.slot(slotId),
      x: x + btnW / 2,
      y: btnY + btnH / 2,
      maxWidth: btnW * 0.82,
      maxLines: 3,
      token: 'heading',
      font: 'anton',
      fill: '#ffffff',
      uppercase: true,
      lineHeight: 1.08,
      tracking: 0.02,
      shadow: 'textShadow',
      opacity: ctx.dim(slotId),
    });
    return `${shell}${label.svg}`;
  };

  const vsR = u * 4.2;
  const vsCx = width / 2;
  const vsCy = btnY + btnH / 2;
  const vsFace = ctx.font('interBold');
  const vsSize = ctx.size('caption');
  const vs = `<circle cx="${round(vsCx)}" cy="${round(vsCy)}" r="${round(vsR)}" fill="#05070f" filter="url(#softShadow)"/>
    <circle cx="${round(vsCx)}" cy="${round(vsCy)}" r="${round(vsR)}" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="${round(u * 0.3)}"/>
    <text x="${round(vsCx + u * 0.05)}" y="${round(vsCy + vsSize * 0.36)}" text-anchor="middle" font-family="${vsFace.stack}" font-size="${round(vsSize)}" font-weight="${vsFace.weight}" fill="rgba(255,255,255,0.88)" letter-spacing="${round(vsSize * 0.08)}">VS</text>`;

  return `${bg}
    ${captionCard}${caption.svg}
    ${button(pad, 'left', '#e11d48', '#7f1d1d', '#fda4af')}
    ${button(pad + btnW + gap, 'right', '#0284c7', '#0c4a6e', '#7dd3fc')}
    ${vs}`;
}

function renderModernCaption(ctx: RenderCtx): string {
  const { width, height, u, baseImageHref, palette, layout } = ctx;
  const bg = layerBg(ctx);

  const pad = layout.marginX;
  const barW = width - pad * 2;
  const titleOptions = {
    text: ctx.slot('title'),
    x: pad + u * 3.5,
    y: 0,
    maxWidth: barW - u * 7,
    maxLines: 2,
    token: 'displayL' as const,
    font: 'interBold' as const,
    anchor: 'start' as const,
    lineHeight: 1.08,
    fill: '#f0fdfa',
    tracking: -0.02,
    opacity: ctx.dim('title'),
  };
  const captionOptions = {
    text: ctx.slot('caption'),
    x: pad + u * 3.5,
    y: 0,
    maxWidth: barW - u * 7,
    maxLines: 3,
    token: 'body' as const,
    font: 'inter' as const,
    anchor: 'start' as const,
    lineHeight: 1.24,
    fill: 'rgba(204,251,241,0.9)',
    opacity: ctx.dim('caption'),
  };
  const title = ctx.text(titleOptions);
  const caption = ctx.text(captionOptions);

  const innerPad = u * 4;
  const rule = title.height > 0 && caption.height > 0 ? u * 3 : 0;
  const barH = innerPad * 2 + title.height + caption.height + rule;
  const barY = height - barH - pad;

  const titleBlock = ctx.text({
    ...titleOptions,
    y: barY + innerPad + title.height / 2,
  });
  const captionBlock = ctx.text({
    ...captionOptions,
    y: barY + innerPad + title.height + rule + caption.height / 2,
  });

  const bar = `<rect x="${round(pad)}" y="${round(barY)}" width="${round(barW)}" height="${round(barH)}" rx="${round(layout.radius)}" fill="rgba(2,15,14,0.72)" filter="url(#softShadow)"/>
    <rect x="${round(pad)}" y="${round(barY)}" width="${round(barW)}" height="${round(barH)}" rx="${round(layout.radius)}" fill="url(#cardA)"/>
    <rect x="${round(pad + 0.5)}" y="${round(barY + 0.5)}" width="${round(barW - 1)}" height="${round(barH - 1)}" rx="${round(layout.radius)}" fill="none" stroke="${palette.accent}" stroke-opacity="0.32" stroke-width="${round(u * 0.22)}"/>
    <rect x="${round(pad)}" y="${round(barY + u * 3)}" width="${round(u * 0.9)}" height="${round(barH - u * 6)}" rx="${round(u * 0.45)}" fill="${palette.accent}" opacity="0.9"/>`;

  return `${bg}${bar}${titleBlock.svg}${captionBlock.svg}`;
}

/**
 * Chat-style setup → punchline over a photo, with an optional POV bar at the
 * bottom. Dialogue is the slot text only (no THEM/ME labels). POV keeps a
 * light translucent bar for readability.
 */
function renderDialoguePov(ctx: RenderCtx): string {
  const { width, height, u, baseImageHref, layout, mood } = ctx;
  const bg = layerBg(ctx, true);
  const pad = layout.marginX;
  const textW = width - pad * 2;

  const lines: Array<{
    id: string;
    align: 'start' | 'end';
  }> = [
    { id: 'them', align: 'start' },
    { id: 'me', align: 'end' },
  ];

  // Measure POV bar first so dialogue can sit above it without colliding.
  const povText = ctx.slot('pov');
  const povFace = ctx.font('anton');
  const povLabelSize = ctx.size('displayXl');
  const povLabelRow = povLabelSize * 1.15;
  const povOptions = {
    text: povText,
    x: pad + u * 3,
    y: 0,
    maxWidth: textW - u * 6,
    maxLines: 3,
    token: 'body' as const,
    font: 'inter' as const,
    anchor: 'start' as const,
    lineHeight: 1.2,
    fill: mood.text,
    opacity: ctx.dim('pov'),
  };
  const povMeasure = ctx.text(povOptions);
  const povInner = u * 3.2;
  const povH = povText.trim()
    ? povInner * 2 + povLabelRow + povMeasure.height
    : 0;
  const povY = height - pad - povH;
  const dialogueBottom = povText.trim() ? povY - u * 3 : height - pad;

  const rowGap = u * 3.2;
  const availableH = Math.max(u * 24, dialogueBottom - pad);
  const rowH = (availableH - rowGap) / 2;

  const dialogue = lines
    .map((line, i) => {
      const y = pad + i * (rowH + rowGap);
      const x = line.align === 'start' ? pad : width - pad;
      const block = ctx.text({
        text: ctx.slot(line.id),
        x,
        y: y + rowH * 0.5,
        maxWidth: textW * 0.92,
        maxLines: 3,
        token: 'displayL',
        font: 'anton',
        anchor: line.align,
        lineHeight: 1.12,
        tracking: -0.02,
        fill: mood.text,
        outline: { color: mood.outline, width: u * 0.35 },
        shadow: 'textShadow',
        opacity: ctx.dim(line.id),
      });
      return block.svg;
    })
    .join('');

  let povBar = '';
  if (povText.trim()) {
    const povBlock = ctx.text({
      ...povOptions,
      y: povY + povInner + povLabelRow + povMeasure.height / 2,
    });
    // Soft translucent plate — readable without covering the photo.
    // POV label kept — it's the viral meme convention for this slot; it gets
    // its own row so it never sits on top of the line itself.
    povBar = `<rect x="${round(pad)}" y="${round(povY)}" width="${round(textW)}" height="${round(povH)}" rx="${round(layout.radius)}" fill="${mood.plate}"/>
      <text x="${round(pad + u * 3)}" y="${round(povY + povInner + povLabelSize * 0.78)}" font-family="${povFace.stack}" font-size="${round(povLabelSize)}" font-weight="${povFace.weight}" fill="${mood.accent}" letter-spacing="${round(povLabelSize * 0.04)}" opacity="${ctx.dim('pov')}" filter="url(#textShadow)">POV</text>
      ${povBlock.svg}`;
  }

  return `${bg}${dialogue}${povBar}`;
}

/** Upper-left stat + elegant lower-third subtitle over the photo. */
function renderCinematicSubtitle(ctx: RenderCtx): string {
  const { width, height, u, baseImageHref, layout, mood } = ctx;
  const bg = layerBg(ctx, true);
  const pad = layout.marginX;

  const label = ctx.text({
    text: ctx.slot('stat_label'),
    x: pad,
    y: pad + u * 3,
    maxWidth: width * 0.42,
    maxLines: 1,
    token: 'caption',
    font: 'interBold',
    anchor: 'start',
    align: 'top',
    fill: mood.accent,
    tracking: 0.12,
    uppercase: true,
    outline: { color: mood.outline, width: u * 0.18 },
    shadow: 'textShadow',
    opacity: ctx.dim('stat_label'),
  });
  const value = ctx.text({
    text: ctx.slot('stat_value'),
    x: pad,
    y: pad + u * 8,
    maxWidth: width * 0.46,
    maxLines: 1,
    token: 'displayL',
    font: 'interBold',
    anchor: 'start',
    align: 'top',
    tracking: -0.02,
    fill: mood.text,
    outline: { color: mood.outline, width: u * 0.32 },
    shadow: 'textShadow',
    opacity: ctx.dim('stat_value'),
  });
  const hook = ctx.text({
    text: ctx.slot('hook'),
    x: width / 2,
    y: height * 0.82,
    maxWidth: Math.min(width * 0.86, layout.maxTextWidth),
    maxLines: 3,
    token: 'displayL',
    font: 'cormorant',
    lineHeight: 1.18,
    fill: mood.text,
    outline: { color: mood.outline, width: u * 0.28 },
    shadow: 'textShadow',
    opacity: ctx.dim('hook'),
  });
  const softBarH = Math.max(hook.height + u * 6, u * 14);
  const softBarY = height * 0.82 - softBarH / 2;
  const softBar = `<rect x="${round(pad)}" y="${round(softBarY)}" width="${round(width - pad * 2)}" height="${round(softBarH)}" rx="${round(layout.radius)}" fill="${mood.plate}"/>`;

  return `${bg}${label.svg}${value.svg}${softBar}${hook.svg}`;
}

/** Two stacked chat rows with speaker labels from slots. */
function renderConversationCards(ctx: RenderCtx): string {
  const { width, height, u, baseImageHref, layout, mood } = ctx;
  const bg = layerBg(ctx, true);
  const pad = layout.marginX;
  const textW = width - pad * 2;
  const rows = [
    { speaker: 'speaker_a', line: 'line_a', align: 'start' as const },
    { speaker: 'speaker_b', line: 'line_b', align: 'end' as const },
  ];
  const gap = u * 5;
  const rowH = (height * 0.42 - gap) / 2;
  const startY = height * 0.12;

  const body = rows
    .map((row, i) => {
      const y = startY + i * (rowH + gap);
      const x = row.align === 'start' ? pad : width - pad;
      const speaker = ctx.text({
        text: ctx.slot(row.speaker),
        x,
        y: y + u * 2,
        maxWidth: textW * 0.55,
        maxLines: 1,
        token: 'caption',
        font: 'interBold',
        anchor: row.align,
        align: 'top',
        fill: mood.accent,
        tracking: 0.12,
        uppercase: true,
        outline: { color: mood.outline, width: u * 0.16 },
        shadow: 'textShadow',
        opacity: ctx.dim(row.speaker),
      });
      const line = ctx.text({
        text: ctx.slot(row.line),
        x,
        y: y + u * 8,
        maxWidth: textW * 0.88,
        maxLines: 3,
        token: 'body',
        font: 'inter',
        anchor: row.align,
        align: 'top',
        lineHeight: 1.16,
        fill: mood.text,
        outline: { color: mood.outline, width: u * 0.3 },
        shadow: 'textShadow',
        opacity: ctx.dim(row.line),
      });
      return `${speaker.svg}${line.svg}`;
    })
    .join('');

  return `${bg}${body}`;
}

/**
 * Cover-story stack: tracked kicker, heavy display headline, hairline rule and
 * a readable subhead. Everything is measured and then laid out bottom-up so the
 * rhythm holds on every aspect instead of drifting on tall canvases.
 */
function renderMagazineHeadline(ctx: RenderCtx): string {
  const { width, height, u, baseImageHref, layout, mood } = ctx;
  const bg = layerBg(ctx, true);
  const cx = width / 2;
  const edgePad = layout.marginY;
  const textMax = Math.min(width * 0.86, layout.maxTextWidth);

  const kickerOptions = {
    text: ctx.slot('kicker'),
    x: cx,
    y: 0,
    maxWidth: textMax,
    maxLines: 1,
    token: 'caption' as const,
    font: 'interBold' as const,
    fill: mood.accent,
    tracking: 0.14,
    uppercase: true,
    align: 'top' as const,
    outline: { color: mood.outline, width: u * 0.16 },
    shadow: 'textShadow',
    opacity: ctx.dim('kicker'),
  };
  const headlineOptions = {
    text: ctx.slot('headline'),
    x: cx,
    y: 0,
    maxWidth: textMax,
    maxLines: 3,
    token: 'displayXl' as const,
    font: 'bodoni' as const,
    fill: mood.text,
    lineHeight: 1.02,
    tracking: -0.02,
    align: 'top' as const,
    outline: { color: mood.outline, width: u * 0.32 },
    shadow: 'textShadow',
    opacity: ctx.dim('headline'),
  };
  const subheadOptions = {
    text: ctx.slot('subhead'),
    x: cx,
    y: 0,
    maxWidth: textMax,
    maxLines: 2,
    token: 'caption' as const,
    font: 'inter' as const,
    lineHeight: 1.24,
    fill: mood.textMuted,
    align: 'top' as const,
    outline: { color: mood.outline, width: u * 0.18 },
    shadow: 'textShadow',
    opacity: ctx.dim('subhead'),
  };

  const kickerSize = ctx.text(kickerOptions);
  const headlineSize = ctx.text(headlineOptions);
  const subheadSize = ctx.text(subheadOptions);

  const kickerGap = kickerSize.height > 0 ? u * 2.6 : 0;
  const ruleGap = subheadSize.height > 0 ? u * 3 : 0;
  const ruleH = subheadSize.height > 0 ? u * 0.2 : 0;
  const stackH =
    kickerSize.height +
    kickerGap +
    headlineSize.height +
    (subheadSize.height > 0 ? ruleGap + ruleH + ruleGap + subheadSize.height : 0);

  // Sit on the lower third, clear of the corner watermark, and never so high
  // that the block floats in the middle of a 9:16 frame.
  const stackBottom = height - edgePad;
  const stackTop = Math.max(height * 0.34, stackBottom - stackH);

  let cursor = stackTop;
  const kicker = ctx.text({ ...kickerOptions, y: cursor });
  cursor += kickerSize.height + kickerGap;
  const headline = ctx.text({ ...headlineOptions, y: cursor });
  cursor += headlineSize.height;

  let rule = '';
  let subhead = { svg: '' };
  if (subheadSize.height > 0) {
    const ruleY = cursor + ruleGap;
    rule = `<line x1="${round(width * 0.34)}" y1="${round(ruleY)}" x2="${round(width * 0.66)}" y2="${round(ruleY)}" stroke="${mood.accent}" stroke-opacity="0.55" stroke-width="${round(ruleH)}"/>`;
    subhead = ctx.text({ ...subheadOptions, y: ruleY + ruleGap });
  }

  const scrimH = Math.min(height * 0.62, height - stackTop + u * 8);
  const scrim = `<rect x="0" y="${round(height - scrimH)}" width="${width}" height="${round(scrimH)}" fill="url(#scrimBottom)"/>`;

  return `${bg}${scrim}${kicker.svg}${headline.svg}${rule}${subhead.svg}`;
}

/** Soft lower-third documentary narrator plate. */
function renderFakeDocumentary(ctx: RenderCtx): string {
  const { width, height, u, baseImageHref, layout, mood } = ctx;
  const bg = layerBg(ctx, true);
  const pad = layout.marginX;
  const textW = width - pad * 2;

  const lineOptions = (slotId: string, font: 'inter' | 'interBold') => ({
    text: ctx.slot(slotId),
    x: width / 2,
    y: 0,
    maxWidth: Math.min(textW - u * 6, layout.maxTextWidth),
    maxLines: 2,
    token: 'body' as const,
    font,
    lineHeight: 1.22,
    fill: mood.text,
    outline: { color: mood.outline, width: u * 0.14 },
    opacity: ctx.dim(slotId),
  });
  const line1Options = lineOptions('line1', 'interBold');
  const line2Options = lineOptions('line2', 'inter');
  const line1 = ctx.text(line1Options);
  const line2 = ctx.text(line2Options);
  const inner = u * 3.5;
  const gap = line1.height > 0 && line2.height > 0 ? u * 2 : 0;
  const plateH = inner * 2 + line1.height + line2.height + gap;
  const plateY = height - pad - plateH;

  const placed1 = ctx.text({
    ...line1Options,
    y: plateY + inner + line1.height / 2,
  });
  const placed2 = ctx.text({
    ...line2Options,
    y: plateY + inner + line1.height + gap + line2.height / 2,
  });
  const plate = `<rect x="${round(pad)}" y="${round(plateY)}" width="${round(textW)}" height="${round(plateH)}" rx="${round(layout.radius)}" fill="${mood.plate}"/>`;

  return `${bg}${plate}${placed1.svg}${placed2.svg}`;
}

/** Compact upper/mid stat + one elegant sentence; center left open. */
function renderLuxuryQuote(ctx: RenderCtx): string {
  const { width, height, u, baseImageHref, layout, mood } = ctx;
  const bg = layerBg(ctx, true);
  const cx = width / 2;

  const stat = ctx.text({
    text: ctx.slot('stat'),
    x: cx,
    y: height * 0.22,
    maxWidth: Math.min(width * 0.7, layout.maxTextWidth),
    maxLines: 1,
    token: 'caption',
    font: 'interBold',
    fill: mood.accent,
    tracking: 0.14,
    uppercase: true,
    outline: { color: mood.outline, width: u * 0.16 },
    shadow: 'textShadow',
    opacity: ctx.dim('stat'),
  });
  const line = ctx.text({
    text: ctx.slot('line'),
    x: cx,
    y: height * 0.78,
    maxWidth: Math.min(width * 0.82, layout.maxTextWidth),
    maxLines: 3,
    token: 'displayL',
    font: 'cormorantItalic',
    lineHeight: 1.2,
    fill: mood.text,
    outline: { color: mood.outline, width: u * 0.28 },
    shadow: 'textShadow',
    opacity: ctx.dim('line'),
  });

  return `${bg}${stat.svg}${line.svg}`;
}

/** Thin brand wordmark, mid tagline, small CTA chip. */
function renderLuxuryAdChrome(ctx: RenderCtx): string {
  const { width, height, u, baseImageHref, layout, mood } = ctx;
  const bg = layerBg(ctx, true);
  const cx = width / 2;
  const pad = layout.marginY;

  const brand = ctx.text({
    text: ctx.slot('brand'),
    x: cx,
    y: pad + u * 5,
    maxWidth: Math.min(width * 0.75, layout.maxTextWidth),
    maxLines: 1,
    token: 'caption',
    font: 'interBold',
    fill: mood.accent,
    tracking: 0.16,
    uppercase: true,
    outline: { color: mood.outline, width: u * 0.16 },
    shadow: 'textShadow',
    opacity: ctx.dim('brand'),
  });
  const ruleY = pad + u * 9;
  const rule = `<line x1="${round(width * 0.38)}" y1="${round(ruleY)}" x2="${round(width * 0.62)}" y2="${round(ruleY)}" stroke="${mood.text}" stroke-opacity="0.55" stroke-width="${round(u * 0.14)}"/>`;
  const tagline = ctx.text({
    text: ctx.slot('tagline'),
    x: cx,
    y: height * 0.72,
    maxWidth: Math.min(width * 0.84, layout.maxTextWidth),
    maxLines: 2,
    token: 'displayL',
    font: 'cormorant',
    lineHeight: 1.2,
    fill: mood.text,
    outline: { color: mood.outline, width: u * 0.26 },
    shadow: 'textShadow',
    opacity: ctx.dim('tagline'),
  });

  const ctaText = ctx.slot('cta').trim();
  let cta = '';
  if (ctaText) {
    ctx.font('interBold');
    const ctaSize = ctx.size('caption');
    const ctaPadX = u * 3.4;
    // Track the advance the text engine actually uses (caps + tracking) so the
    // pill is wide enough for the label instead of forcing it to shrink.
    const ctaAdvance =
      ctaSize * (FONTS.interBold.charRatio * UPPERCASE_WIDTH_BOOST + 0.08);
    const ctaW = Math.min(
      width * 0.72,
      Math.max(u * 28, ctaText.length * ctaAdvance + ctaPadX * 2),
    );
    const ctaH = ctaSize * 2.3;
    const ctaX = (width - ctaW) / 2;
    const ctaY = height - pad - ctaH - u * 4;
    const label = ctx.text({
      text: ctaText,
      x: cx,
      y: ctaY + ctaH / 2,
      maxWidth: ctaW - ctaPadX * 2,
      maxLines: 1,
      token: 'caption',
      font: 'interBold',
      uppercase: true,
      tracking: 0.08,
      fill: '#09090b',
      opacity: ctx.dim('cta'),
    });
    cta = `<rect x="${round(ctaX)}" y="${round(ctaY)}" width="${round(ctaW)}" height="${round(ctaH)}" rx="${round(ctaH / 2)}" fill="${mood.accent}" opacity="0.92" filter="url(#softShadow)"/>${label.svg}`;
  }

  return `${bg}${brand.svg}${rule}${tagline.svg}${cta}`;
}

/**
 * True left/right diptych. Each half gets its own plate (or a tinted mesh) with
 * center-crop so faces stay in-panel. Labels sit in the lower third of each half.
 */
function renderRichVsReality(ctx: RenderCtx): string {
  const { width, height, u, baseImageHref, secondaryBaseImageHref, palette } = ctx;
  const half = width / 2;
  const leftHref = baseImageHref;
  const rightHref = secondaryBaseImageHref || undefined;

  const panelFill = (
    x: number,
    href: string | undefined,
    clip: 'clipLeft' | 'clipRight',
    meshTint: string,
  ) => {
    if (href) {
      // Place a full-height slice centered on this half so subjects stay in-frame.
      return `<g clip-path="url(#${clip})">
        <image href="${href}" xlink:href="${href}" x="${round(x)}" y="0" width="${round(half)}" height="${height}" preserveAspectRatio="xMidYMid slice"/>
        <rect x="${round(x)}" y="0" width="${round(half)}" height="${height}" fill="#000000" opacity="0.14"/>
      </g>`;
    }
    return `<g clip-path="url(#${clip})">
      <rect x="${round(x)}" y="0" width="${round(half)}" height="${height}" fill="url(#bg)"/>
      <rect x="${round(x)}" y="0" width="${round(half)}" height="${height}" fill="${meshTint}"/>
      <ellipse cx="${round(x + half * 0.5)}" cy="${round(height * 0.35)}" rx="${round(half * 0.55)}" ry="${round(height * 0.28)}" fill="url(#blobA)" opacity="0.85"/>
    </g>`;
  };

  const leftPanel = panelFill(0, leftHref, 'clipLeft', 'rgba(212,175,55,0.22)');
  const rightPanel = panelFill(half, rightHref, 'clipRight', 'rgba(100,116,139,0.28)');

  const divider = `<rect x="${round(half - u * 0.2)}" y="0" width="${round(u * 0.4)}" height="${height}" fill="rgba(255,255,255,0.55)"/>`;

  const label = (slotId: string, cx: number) =>
    ctx.text({
      text: ctx.slot(slotId),
      x: cx,
      y: height * 0.88,
      maxWidth: half * 0.86,
      maxLines: 2,
      token: 'heading',
      font: 'interBold',
      fill: '#ffffff',
      uppercase: true,
      lineHeight: 1.08,
      tracking: 0.02,
      outline: { color: 'rgba(0,0,0,0.75)', width: u * 0.32 },
      shadow: 'textShadow',
      opacity: ctx.dim(slotId),
    });

  const leftLabel = label('left', half * 0.5);
  const rightLabel = label('right', half + half * 0.5);

  const leftScrimH = Math.max(leftLabel.height + u * 8, u * 16);
  const rightScrimH = Math.max(rightLabel.height + u * 8, u * 16);
  const leftScrim = `<rect x="0" y="${round(height - leftScrimH)}" width="${round(half)}" height="${round(leftScrimH)}" fill="url(#scrimBottom)"/>`;
  const rightScrim = `<rect x="${round(half)}" y="${round(height - rightScrimH)}" width="${round(half)}" height="${round(rightScrimH)}" fill="url(#scrimBottom)"/>`;

  // Tiny RICH / REALITY chips above the user labels for format clarity.
  ctx.font('interBold');
  const chipSize = ctx.size('caption');
  const chipLeft = chip(u * 3, u * 3, 'Rich', chipSize, '#1c1917', palette.accent);
  const chipRight = chip(
    half + u * 3,
    u * 3,
    'Reality',
    chipSize,
    '#f8fafc',
    'rgba(51,65,85,0.85)',
  );

  return `${leftPanel}${rightPanel}${divider}${leftScrim}${rightScrim}${chipLeft}${chipRight}${leftLabel.svg}${rightLabel.svg}`;
}

/** Cinematic title stack with gold billing — movie poster energy. */
function renderMoviePoster(ctx: RenderCtx): string {
  const { width, height, u, layout, mood } = ctx;
  const bg = layerBg(ctx, true);
  const cx = width / 2;

  const title = ctx.text({
    text: ctx.slot('title'),
    x: cx,
    y: height * 0.62,
    maxWidth: Math.min(width * 0.88, layout.maxTextWidth * 1.15),
    maxLines: 2,
    token: 'displayXl',
    font: 'anton',
    lineHeight: 0.95,
    fill: mood.text,
    tracking: 0.04,
    uppercase: true,
    outline: { color: mood.outline, width: u * 0.35 },
    shadow: 'textShadow',
    opacity: ctx.dim('title'),
  });
  const tagline = ctx.text({
    text: ctx.slot('tagline'),
    x: cx,
    y: height * 0.74,
    maxWidth: Math.min(width * 0.78, layout.maxTextWidth),
    maxLines: 2,
    token: 'caption',
    font: 'inter',
    lineHeight: 1.2,
    fill: mood.textMuted,
    outline: { color: mood.outline, width: u * 0.12 },
    opacity: ctx.dim('tagline'),
  });
  const billing = ctx.text({
    text: ctx.slot('billing'),
    x: cx,
    y: height * 0.88,
    maxWidth: Math.min(width * 0.7, layout.maxTextWidth),
    maxLines: 1,
    token: 'micro',
    font: 'interBold',
    fill: mood.accent,
    tracking: 0.18,
    uppercase: true,
    opacity: ctx.dim('billing'),
  });
  const ruleY = height * 0.8;
  const rule = `<line x1="${round(width * 0.28)}" y1="${round(ruleY)}" x2="${round(width * 0.72)}" y2="${round(ruleY)}" stroke="${mood.accent}" stroke-opacity="0.65" stroke-width="${round(u * 0.18)}"/>`;
  const scrim = `<rect x="0" y="${round(height * 0.48)}" width="${width}" height="${round(height * 0.52)}" fill="url(#scrimBottom)"/>`;

  return `${bg}${scrim}${title.svg}${tagline.svg}${rule}${billing.svg}`;
}

/** Red ticker + bold chyron — breaking news desk. */
function renderBreakingNews(ctx: RenderCtx): string {
  const { width, height, u, layout, mood } = ctx;
  const bg = layerBg(ctx, true);
  const pad = layout.marginX;
  const bandY = height * 0.62;
  const tickerH = u * 7;
  const ticker = `<rect x="0" y="${round(bandY)}" width="${width}" height="${round(tickerH)}" fill="${mood.accent}"/>`;
  const tickerLabel = ctx.text({
    text: ctx.slot('ticker'),
    x: pad + u * 2,
    y: bandY + tickerH / 2,
    maxWidth: width * 0.4,
    maxLines: 1,
    token: 'caption',
    font: 'anton',
    fill: '#FFFFFF',
    tracking: 0.12,
    uppercase: true,
    anchor: 'start',
    opacity: ctx.dim('ticker'),
  });
  const headline = ctx.text({
    text: ctx.slot('headline'),
    x: pad + u * 2,
    y: bandY + tickerH + u * 8,
    maxWidth: width - pad * 2 - u * 4,
    maxLines: 3,
    token: 'displayL',
    font: 'anton',
    lineHeight: 1.05,
    fill: mood.text,
    outline: { color: mood.outline, width: u * 0.22 },
    shadow: 'textShadow',
    anchor: 'start',
    opacity: ctx.dim('headline'),
  });
  const plate = `<rect x="0" y="${round(bandY + tickerH)}" width="${width}" height="${round(height - bandY - tickerH)}" fill="${mood.plate}"/>`;
  const chyron = ctx.text({
    text: ctx.slot('chyron'),
    x: pad + u * 2,
    y: height - pad - u * 3,
    maxWidth: width - pad * 2,
    maxLines: 1,
    token: 'micro',
    font: 'interBold',
    fill: mood.textMuted,
    tracking: 0.08,
    uppercase: true,
    anchor: 'start',
    opacity: ctx.dim('chyron'),
  });

  return `${bg}${plate}${ticker}${tickerLabel.svg}${headline.svg}${chyron.svg}`;
}

function motionHint(
  width: number,
  height: number,
  animation: AnimationPreset,
): string {
  const cx = width / 2;
  const cy = height / 2;
  switch (animation) {
    case 'slow_push_in':
      return `<g opacity="0"><animateTransform attributeName="transform" type="scale" values="1;1.08;1" dur="6s" repeatCount="indefinite" additive="sum"/><animate attributeName="opacity" values="0;0" dur="6s" repeatCount="indefinite"/></g><!-- motion:${animation} focus:${cx},${cy} -->`;
    case 'slow_dolly':
      return `<!-- motion:${animation} dolly -->`;
    case 'dramatic_fade':
      return `<rect width="${width}" height="${height}" fill="#000" opacity="0"><animate attributeName="opacity" values="0.35;0;0.35" dur="5s" repeatCount="indefinite"/></rect><!-- motion:${animation} -->`;
    case 'zoom_cuts':
      return `<!-- motion:${animation} punch-in -->`;
    case 'parallax_drift':
      return `<!-- motion:${animation} drift -->`;
    case 'static_hold':
    default:
      return `<!-- motion:static_hold -->`;
  }
}

const RENDERERS: Record<string, (ctx: RenderCtx) => string> = {
  blank_impact: renderBlankImpact,
  drake: renderDrake,
  two_panels: renderTwoPanels,
  expanding_brain: renderExpandingBrain,
  two_buttons: renderTwoButtons,
  modern_caption: renderModernCaption,
  dialogue_pov: renderDialoguePov,
  cinematic_subtitle: renderCinematicSubtitle,
  conversation_cards: renderConversationCards,
  magazine_headline: renderMagazineHeadline,
  fake_documentary: renderFakeDocumentary,
  luxury_quote: renderLuxuryQuote,
  luxury_ad_chrome: renderLuxuryAdChrome,
  rich_vs_reality: renderRichVsReality,
  movie_poster: renderMoviePoster,
  breaking_news: renderBreakingNews,
};

/* ------------------------------------------------------------------ *
 * Entry point
 * ------------------------------------------------------------------ */

export function renderMemeSvg(input: MemeSvgInput): MemeSvgResult {
  const { width, height } = canvasSizeForAspect(input.aspect);
  const base = Math.min(width, height);
  const u = base / 100;
  const layout = layoutMetrics(width, height);
  const moodId =
    input.mood || TEMPLATE_MOOD[input.templateId] || ('corporate' as MoodId);
  const mood = MOOD_PALETTES[moodId];
  const placeholders = new Set(input.placeholderSlots || []);
  const usedFaces = new Set<EmbeddedFaceId>();
  const typography = createTypography(input.aspect, base, usedFaces);

  const faceSafeZone = input.faceSafeZone;
  const animation = input.animation || ('static_hold' as AnimationPreset);

  const ctx: RenderCtx = {
    width,
    height,
    u,
    layout,
    mood,
    slot: (id) => input.slots[id] || '',
    dim: (id) => (placeholders.has(id) ? 0.45 : 1),
    ...typography,
    baseImageHref: input.baseImageHref,
    secondaryBaseImageHref: input.secondaryBaseImageHref,
    palette: paletteFor(input.templateId),
    faceSafeZone,
    subjectFocus: input.subjectFocus,
  };

  const render = RENDERERS[input.templateId] || renderBlankImpact;
  const body = render(ctx);
  const motion = input.animate ? motionHint(width, height, animation) : '';
  const watermark = input.watermark
    ? watermarkMark(width, height, u, input.brandLogoHref)
    : '';

  // Inlined last: only the faces this template actually asked for travel with
  // the file, which keeps a two-font meme around 50KB instead of 170KB.
  const fonts = input.embedFonts === false ? '' : fontFaceCss(usedFaces);
  const fontStyle = fonts ? `<style type="text/css">${fonts}</style>` : '';

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${fontStyle}
${defs(input.templateId, width, height, u, layout)}
${body}
${motion}
${watermark}
</svg>`;

  if (input.idPrefix) {
    for (const id of DEF_IDS) {
      svg = svg
        .split(`id="${id}"`)
        .join(`id="${input.idPrefix}-${id}"`)
        .split(`url(#${id})`)
        .join(`url(#${input.idPrefix}-${id})`);
    }
  }

  return { svg, width, height };
}
