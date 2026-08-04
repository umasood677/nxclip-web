/**
 * Pure meme SVG renderer — no framework deps so the identical file can be
 * copied into the web app for a zero-latency live preview.
 *
 * KEEP IN SYNC: nxclip-web/src/pages/ImageStudio/lib/memeSvg.ts
 */

export type MemeSvgAspect = '1:1' | '16:9' | '9:16';

export interface MemeSvgInput {
  templateId: string;
  /** slotId -> text */
  slots: Record<string, string>;
  aspect: MemeSvgAspect;
  /** `data:` URI or absolute href for the base image layer. */
  baseImageHref?: string;
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
] as const;

export interface MemeSvgResult {
  svg: string;
  width: number;
  height: number;
}

/* ------------------------------------------------------------------ *
 * Design tokens
 * ------------------------------------------------------------------ */

const SANS =
  "'Segoe UI Variable Display','Segoe UI',Inter,'Helvetica Neue',Helvetica,Arial,sans-serif";
const IMPACT = "Impact,Haettenschweiler,'Arial Narrow Bold','Arial Black',sans-serif";

/** Approx glyph width as a fraction of font-size, used for auto-fit. */
const CHAR_RATIO_SANS = 0.55;
const CHAR_RATIO_IMPACT = 0.46;

export function canvasSizeForAspect(aspect: MemeSvgAspect): {
  width: number;
  height: number;
} {
  switch (aspect) {
    case '16:9':
      return { width: 1920, height: 1080 };
    case '9:16':
      return { width: 1080, height: 1920 };
    default:
      return { width: 1080, height: 1080 };
  }
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
    minSize = size * 0.42,
    family = SANS,
    weight = 700,
    fill = '#ffffff',
    anchor = 'middle',
    align = 'center',
    lineHeight = 1.16,
    uppercase = false,
    letterSpacing = 0,
    outline,
    opacity = 1,
    charRatio = CHAR_RATIO_SANS,
    shadow,
  } = options;

  const raw = uppercase ? String(text || '').toUpperCase() : String(text || '');
  if (!raw.trim()) {
    return { svg: '', height: 0, fontSize: size, lineCount: 0 };
  }

  let fontSize = size;
  let lines = wrapText(raw, maxWidth / (fontSize * charRatio));
  while (lines.length > maxLines && fontSize > minSize) {
    fontSize = Math.max(minSize, fontSize * 0.92);
    lines = wrapText(raw, maxWidth / (fontSize * charRatio));
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

  const svg = lines
    .map((line, i) => {
      const baseline = firstBaseline + i * step;
      return `<text x="${round(x)}" y="${round(baseline)}" text-anchor="${anchor}" font-family="${family}" font-size="${round(fontSize)}" font-weight="${weight}" fill="${fill}"${spacingAttr}${strokeAttrs}${filterAttr}${opacityAttr}>${escapeXml(line)}</text>`;
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
};

function paletteFor(templateId: string): Palette {
  return PALETTES[templateId] || PALETTES.blank_impact;
}

function defs(templateId: string, width: number, height: number, u: number): string {
  const p = paletteFor(templateId);
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
      <stop offset="100%" stop-color="#000000" stop-opacity="0.55"/>
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
      <feDropShadow dx="0" dy="${round(u * 0.7)}" stdDeviation="${round(u * 1.1)}" flood-color="#000000" flood-opacity="0.45"/>
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
): string {
  if (!baseImageHref) return meshBackground(width, height);
  const scrimLayer = scrim
    ? `<rect width="${width}" height="${height}" fill="#000000" opacity="0.18"/>
       <rect width="${width}" height="${height}" fill="url(#vignette)"/>`
    : '';
  return `<image href="${baseImageHref}" xlink:href="${baseImageHref}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>${scrimLayer}`;
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

/** Small uppercase label chip. */
function chip(
  x: number,
  y: number,
  label: string,
  u: number,
  color: string,
  bg: string,
): string {
  const fontSize = u * 2.6;
  const padX = u * 1.5;
  const w = label.length * fontSize * 0.62 + padX * 2;
  const h = fontSize * 1.9;
  return `<rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" rx="${round(h / 2)}" fill="${bg}"/>
    <text x="${round(x + w / 2)}" y="${round(y + h / 2 + fontSize * 0.36)}" text-anchor="middle" font-family="${SANS}" font-size="${round(fontSize)}" font-weight="800" fill="${color}" letter-spacing="${round(fontSize * 0.12)}">${escapeXml(label.toUpperCase())}</text>`;
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
  u: number;
  slot: (id: string) => string;
  dim: (id: string) => number;
  baseImageHref?: string;
  palette: Palette;
}

function renderBlankImpact(ctx: RenderCtx): string {
  const { width, height, u, baseImageHref } = ctx;
  const bg = backgroundLayer(width, height, baseImageHref);
  const scrimH = height * 0.3;
  const scrims = `<rect x="0" y="0" width="${width}" height="${round(scrimH)}" fill="url(#scrimTop)"/>
    <rect x="0" y="${round(height - scrimH)}" width="${width}" height="${round(scrimH)}" fill="url(#scrimBottom)"/>`;

  const top = textBlock({
    text: ctx.slot('top'),
    x: width / 2,
    y: height * 0.13,
    maxWidth: width * 0.88,
    maxLines: 3,
    size: u * 9.5,
    family: IMPACT,
    weight: 400,
    uppercase: true,
    letterSpacing: u * 0.12,
    charRatio: CHAR_RATIO_IMPACT,
    outline: { color: '#000000', width: u * 0.62 },
    shadow: 'textShadow',
    opacity: ctx.dim('top'),
  });
  const bottom = textBlock({
    text: ctx.slot('bottom'),
    x: width / 2,
    y: height * 0.87,
    maxWidth: width * 0.88,
    maxLines: 3,
    size: u * 9.5,
    family: IMPACT,
    weight: 400,
    uppercase: true,
    letterSpacing: u * 0.12,
    charRatio: CHAR_RATIO_IMPACT,
    outline: { color: '#000000', width: u * 0.62 },
    shadow: 'textShadow',
    opacity: ctx.dim('bottom'),
  });

  return `${bg}${scrims}${top.svg}${bottom.svg}`;
}

function renderDrake(ctx: RenderCtx): string {
  const { width, height, u, baseImageHref, palette } = ctx;
  const bg = backgroundLayer(width, height, baseImageHref);
  const pad = u * 4;
  const gap = u * 3;
  const rowH = (height - pad * 2 - gap) / 2;
  const iconCol = Math.min(width * 0.28, rowH * 0.9);
  const radius = u * 4;

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
      const text = textBlock({
        text: ctx.slot(row.id),
        x: textX,
        y: y + rowH / 2 + u * 1.6,
        maxWidth: textW,
        maxLines: 3,
        size: u * 6,
        anchor: 'start',
        weight: 700,
        fill: '#f8fafc',
        shadow: 'textShadow',
        opacity: ctx.dim(row.id),
      });
      return `${card(pad, y, width - pad * 2, rowH, radius, palette.accent, { fill: row.tint })}
        <line x1="${round(pad + iconCol)}" y1="${round(y + rowH * 0.18)}" x2="${round(pad + iconCol)}" y2="${round(y + rowH * 0.82)}" stroke="rgba(255,255,255,0.12)" stroke-width="${round(u * 0.25)}"/>
        ${icon}
        ${chip(textX, y + rowH * 0.14, row.label, u, i === 0 ? '#fecdd3' : '#bbf7d0', i === 0 ? 'rgba(244,63,94,0.22)' : 'rgba(34,197,94,0.22)')}
        ${text.svg}`;
    })
    .join('');

  return `${bg}${body}`;
}

function renderTwoPanels(ctx: RenderCtx): string {
  const { width, height, u, baseImageHref, palette } = ctx;
  const bg = backgroundLayer(width, height, baseImageHref);
  const pad = u * 4;
  const gap = u * 3;
  const rowH = (height - pad * 2 - gap) / 2;
  const radius = u * 4;

  const rows = [
    { id: 'top', index: '01', accent: '#818cf8', tint: 'rgba(99,102,241,0.14)' },
    { id: 'bottom', index: '02', accent: '#fb923c', tint: 'rgba(249,115,22,0.14)' },
  ];

  const body = rows
    .map((row, i) => {
      const y = pad + i * (rowH + gap);
      const text = textBlock({
        text: ctx.slot(row.id),
        x: width / 2,
        y: y + rowH / 2 + u * 2,
        maxWidth: width - pad * 2 - u * 8,
        maxLines: 3,
        size: u * 6.4,
        weight: 700,
        fill: '#f8fafc',
        shadow: 'textShadow',
        opacity: ctx.dim(row.id),
      });
      return `${card(pad, y, width - pad * 2, rowH, radius, palette.accent, { fill: row.tint })}
        <rect x="${round(pad)}" y="${round(y)}" width="${round(u * 1.1)}" height="${round(rowH)}" rx="${round(u * 0.55)}" fill="${row.accent}" opacity="0.9"/>
        <text x="${round(pad + u * 4)}" y="${round(y + u * 6.4)}" font-family="${SANS}" font-size="${round(u * 3.2)}" font-weight="800" fill="${row.accent}" letter-spacing="${round(u * 0.3)}" opacity="0.85">${row.index}</text>
        ${text.svg}`;
    })
    .join('');

  return `${bg}${body}`;
}

function renderExpandingBrain(ctx: RenderCtx): string {
  const { width, height, u, baseImageHref, palette } = ctx;
  const bg = backgroundLayer(width, height, baseImageHref);
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
      const text = textBlock({
        text: ctx.slot(key),
        x: textX,
        y: y + rowH / 2 + u * 1.2,
        maxWidth: width - textX - pad - u * 2,
        maxLines: 2,
        size: u * 5,
        anchor: 'start',
        weight: 700,
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
  const bg = backgroundLayer(width, height, baseImageHref);

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
  const caption = textBlock({
    text: ctx.slot('caption'),
    x: width / 2,
    y: pad + captionH / 2,
    maxWidth: width - pad * 2 - u * 7,
    maxLines: 2,
    size: u * 5.4,
    weight: 700,
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
    const label = textBlock({
      text: ctx.slot(slotId),
      x: x + btnW / 2,
      y: btnY + btnH / 2,
      maxWidth: btnW * 0.82,
      maxLines: 3,
      size: u * 5,
      weight: 800,
      fill: '#ffffff',
      uppercase: true,
      letterSpacing: u * 0.08,
      shadow: 'textShadow',
      opacity: ctx.dim(slotId),
    });
    return `${shell}${label.svg}`;
  };

  const vsR = u * 4.2;
  const vsCx = width / 2;
  const vsCy = btnY + btnH / 2;
  const vs = `<circle cx="${round(vsCx)}" cy="${round(vsCy)}" r="${round(vsR)}" fill="#05070f" filter="url(#softShadow)"/>
    <circle cx="${round(vsCx)}" cy="${round(vsCy)}" r="${round(vsR)}" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="${round(u * 0.3)}"/>
    <text x="${round(vsCx)}" y="${round(vsCy + vsR * 0.34)}" text-anchor="middle" font-family="${SANS}" font-size="${round(vsR * 0.95)}" font-weight="800" fill="rgba(255,255,255,0.82)" letter-spacing="${round(u * 0.1)}">VS</text>`;

  return `${bg}
    ${captionCard}${caption.svg}
    ${button(pad, 'left', '#e11d48', '#7f1d1d', '#fda4af')}
    ${button(pad + btnW + gap, 'right', '#0284c7', '#0c4a6e', '#7dd3fc')}
    ${vs}`;
}

function renderModernCaption(ctx: RenderCtx): string {
  const { width, height, u, baseImageHref, palette } = ctx;
  const bg = backgroundLayer(width, height, baseImageHref);

  const pad = u * 5;
  const barW = width - pad * 2;
  const title = textBlock({
    text: ctx.slot('title'),
    x: pad + u * 3.5,
    y: 0,
    maxWidth: barW - u * 7,
    maxLines: 2,
    size: u * 7,
    anchor: 'start',
    weight: 800,
    fill: '#f0fdfa',
    letterSpacing: -u * 0.06,
    opacity: ctx.dim('title'),
  });
  const caption = textBlock({
    text: ctx.slot('caption'),
    x: pad + u * 3.5,
    y: 0,
    maxWidth: barW - u * 7,
    maxLines: 3,
    size: u * 4,
    anchor: 'start',
    weight: 500,
    fill: 'rgba(204,251,241,0.86)',
    opacity: ctx.dim('caption'),
  });

  const innerPad = u * 4;
  const rule = title.height > 0 && caption.height > 0 ? u * 3 : 0;
  const barH = innerPad * 2 + title.height + caption.height + rule;
  const barY = height - barH - pad;

  const titleBlock = textBlock({
    text: ctx.slot('title'),
    x: pad + u * 3.5,
    y: barY + innerPad + title.height / 2,
    maxWidth: barW - u * 7,
    maxLines: 2,
    size: u * 7,
    anchor: 'start',
    weight: 800,
    fill: '#f0fdfa',
    letterSpacing: -u * 0.06,
    opacity: ctx.dim('title'),
  });
  const captionBlock = textBlock({
    text: ctx.slot('caption'),
    x: pad + u * 3.5,
    y: barY + innerPad + title.height + rule + caption.height / 2,
    maxWidth: barW - u * 7,
    maxLines: 3,
    size: u * 4,
    anchor: 'start',
    weight: 500,
    fill: 'rgba(204,251,241,0.86)',
    opacity: ctx.dim('caption'),
  });

  const bar = `<rect x="${round(pad)}" y="${round(barY)}" width="${round(barW)}" height="${round(barH)}" rx="${round(u * 4)}" fill="rgba(2,15,14,0.72)" filter="url(#softShadow)"/>
    <rect x="${round(pad)}" y="${round(barY)}" width="${round(barW)}" height="${round(barH)}" rx="${round(u * 4)}" fill="url(#cardA)"/>
    <rect x="${round(pad + 0.5)}" y="${round(barY + 0.5)}" width="${round(barW - 1)}" height="${round(barH - 1)}" rx="${round(u * 4)}" fill="none" stroke="${palette.accent}" stroke-opacity="0.32" stroke-width="${round(u * 0.22)}"/>
    <rect x="${round(pad)}" y="${round(barY + u * 3)}" width="${round(u * 0.9)}" height="${round(barH - u * 6)}" rx="${round(u * 0.45)}" fill="${palette.accent}" opacity="0.9"/>`;

  return `${bg}${bar}${titleBlock.svg}${captionBlock.svg}`;
}

/**
 * Chat-style setup → punchline over a photo, with an optional POV bar at the
 * bottom. Dialogue is text-only so the base image stays visible; POV keeps a
 * light translucent bar for readability.
 */
function renderDialoguePov(ctx: RenderCtx): string {
  const { width, height, u, baseImageHref } = ctx;
  const bg = backgroundLayer(width, height, baseImageHref, true);
  const pad = u * 4.5;
  const textW = width - pad * 2;

  const lines: Array<{
    id: string;
    speaker: string;
    speakerFill: string;
    align: 'start' | 'end';
  }> = [
    {
      id: 'them',
      speaker: 'THEM',
      speakerFill: '#7dd3fc',
      align: 'start',
    },
    {
      id: 'me',
      speaker: 'ME',
      speakerFill: '#f9a8d4',
      align: 'end',
    },
  ];

  // Measure POV bar first so dialogue can sit above it without colliding.
  const povText = ctx.slot('pov');
  const povMeasure = textBlock({
    text: povText,
    x: pad + u * 2,
    y: 0,
    maxWidth: textW - u * 4,
    maxLines: 3,
    size: u * 3.8,
    anchor: 'start',
    weight: 600,
    fill: 'rgba(255,255,255,0.95)',
    opacity: ctx.dim('pov'),
  });
  const povInner = u * 3.2;
  const povH = povText.trim() ? povInner * 2 + povMeasure.height : 0;
  const povY = height - pad - povH;
  const dialogueBottom = povText.trim() ? povY - u * 3 : height - pad;

  const rowGap = u * 3.2;
  const availableH = Math.max(u * 24, dialogueBottom - pad);
  const rowH = (availableH - rowGap) / 2;

  const dialogue = lines
    .map((line, i) => {
      const y = pad + i * (rowH + rowGap);
      const x = line.align === 'start' ? pad : width - pad;
      const speakerSize = u * 2.4;
      const speaker = `<text x="${round(x)}" y="${round(y + speakerSize)}" text-anchor="${line.align === 'start' ? 'start' : 'end'}" font-family="${SANS}" font-size="${round(speakerSize)}" font-weight="800" fill="${line.speakerFill}" letter-spacing="${round(speakerSize * 0.14)}" opacity="${ctx.dim(line.id)}" filter="url(#textShadow)">${escapeXml(line.speaker)}</text>`;
      const block = textBlock({
        text: ctx.slot(line.id),
        x,
        y: y + rowH * 0.62,
        maxWidth: textW * 0.92,
        maxLines: 3,
        size: u * 5,
        anchor: line.align,
        weight: 800,
        fill: '#ffffff',
        outline: { color: 'rgba(0,0,0,0.72)', width: u * 0.35 },
        shadow: 'textShadow',
        opacity: ctx.dim(line.id),
      });
      return `${speaker}${block.svg}`;
    })
    .join('');

  let povBar = '';
  if (povText.trim()) {
    const povBlock = textBlock({
      text: povText,
      x: pad + u * 2.5,
      y: povY + povInner + povMeasure.height / 2,
      maxWidth: textW - u * 5,
      maxLines: 3,
      size: u * 3.8,
      anchor: 'start',
      weight: 600,
      fill: 'rgba(255,255,255,0.95)',
      opacity: ctx.dim('pov'),
    });
    // Soft translucent plate — readable without covering the photo.
    povBar = `<rect x="${round(pad)}" y="${round(povY)}" width="${round(textW)}" height="${round(povH)}" rx="${round(u * 3)}" fill="rgba(8,6,16,0.38)"/>
      <text x="${round(pad + u * 2.5)}" y="${round(povY + u * 3.2)}" font-family="${SANS}" font-size="${round(u * 2.3)}" font-weight="800" fill="#f9a8d4" letter-spacing="${round(u * 0.28)}" opacity="${ctx.dim('pov')}" filter="url(#textShadow)">POV</text>
      ${povBlock.svg}`;
  }

  return `${bg}${dialogue}${povBar}`;
}

const RENDERERS: Record<string, (ctx: RenderCtx) => string> = {
  blank_impact: renderBlankImpact,
  drake: renderDrake,
  two_panels: renderTwoPanels,
  expanding_brain: renderExpandingBrain,
  two_buttons: renderTwoButtons,
  modern_caption: renderModernCaption,
  dialogue_pov: renderDialoguePov,
};

/* ------------------------------------------------------------------ *
 * Entry point
 * ------------------------------------------------------------------ */

export function renderMemeSvg(input: MemeSvgInput): MemeSvgResult {
  const { width, height } = canvasSizeForAspect(input.aspect);
  const u = Math.min(width, height) / 100;
  const placeholders = new Set(input.placeholderSlots || []);

  const ctx: RenderCtx = {
    width,
    height,
    u,
    slot: (id) => input.slots[id] || '',
    dim: (id) => (placeholders.has(id) ? 0.45 : 1),
    baseImageHref: input.baseImageHref,
    palette: paletteFor(input.templateId),
  };

  const render = RENDERERS[input.templateId] || renderBlankImpact;
  const body = render(ctx);
  const watermark = input.watermark
    ? watermarkMark(width, height, u, input.brandLogoHref)
    : '';

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${defs(input.templateId, width, height, u)}
${body}
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
