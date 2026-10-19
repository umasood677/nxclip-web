/** Canonical Clip typography v1. No legacy object is implicitly upgraded. */
export const CANONICAL_TYPOGRAPHY_ENABLED = false;
export interface TypographyLine { text: string; x: number; baseline: number; width: number }
export interface TypographyLayer {
  id: string; startMs: number; endMs: number;
  fontSize: number; lineHeight: number; letterSpacing: number;
  align: 'left' | 'center' | 'right'; fill: string; outline: number; shadow: number;
  /** Optional stroke color (#RRGGBB). Default black when omitted. */
  outlineColor?: string;
  /** Optional shadow color (#RRGGBB). Default black when omitted. */
  shadowColor?: string;
  /** Optional per-layer face; omit to inherit plan-level faceId. */
  faceId?: string;
  lines: TypographyLine[];
}
export interface CanonicalTypographyLayout {
  version: 1; assetVersion: '1.0.0'; faceId: string; rendererSha256: string;
  width: number; height: number; layers: TypographyLayer[];
}
type LayoutObject = Record<'version'|'assetVersion'|'faceId'|'rendererSha256'|'width'|'height'|'layers'|'id'|'startMs'|'endMs'|'fontSize'|'lineHeight'|'letterSpacing'|'align'|'fill'|'outline'|'shadow'|'lines'|'text'|'x'|'baseline',unknown> & Record<string,unknown>;

/** Strict shape/complexity/geometry validation; worker additionally verifies font bytes/glyphs. */
export function validateTypographyLayout(value: unknown): CanonicalTypographyLayout {
  const fail = (): never => { throw new Error('Invalid canonical typography layout v1'); };
  const object = (input: unknown): LayoutObject => input && typeof input === 'object' && !Array.isArray(input) ? input as LayoutObject : fail();
  const number = (input: unknown, low: number, high: number): number => typeof input === 'number' && Number.isFinite(input) && input >= low && input <= high ? input : fail();
  const exactKeys = (input: Record<string, unknown>, keys: string[]) => { if (Object.keys(input).some(key => !keys.includes(key))) fail(); };
  const allowedKeys = (input: Record<string, unknown>, required: string[], optional: string[]) => {
    const allow = new Set([...required, ...optional]);
    if (Object.keys(input).some((key) => !allow.has(key))) fail();
    if (required.some((key) => !(key in input))) fail();
  };
  const hexColor = (input: unknown): string | undefined => {
    if (input === undefined) return undefined;
    if (typeof input !== 'string' || !/^#[a-fA-F0-9]{6}$/.test(input)) fail();
    return input as string;
  };
  const raw = object(value);
  exactKeys(raw, ['version', 'assetVersion', 'faceId', 'rendererSha256', 'width', 'height', 'layers']);
  if (raw.version !== 1 || raw.assetVersion !== '1.0.0' || typeof raw.faceId !== 'string' || !/^[a-z-]+-\d{3}-(normal|italic)$/.test(raw.faceId) || typeof raw.rendererSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(raw.rendererSha256)) fail();
  const width = number(raw.width, 64, 4096), height = number(raw.height, 64, 4096);
  if (!Number.isInteger(width) || !Number.isInteger(height) || !Array.isArray(raw.layers) || raw.layers.length > 128) fail();
  const ids = new Set<string>(); let characters = 0;
  const layers = (raw.layers as unknown[]).map(input => {
    const layer = object(input);
    allowedKeys(
      layer,
      ['id', 'startMs', 'endMs', 'fontSize', 'lineHeight', 'letterSpacing', 'align', 'fill', 'outline', 'shadow', 'lines'],
      ['outlineColor', 'shadowColor', 'faceId'],
    );
    if (typeof layer.id !== 'string' || !/^[a-z0-9-]{1,64}$/.test(layer.id) || ids.has(layer.id) || !['left', 'center', 'right'].includes(String(layer.align)) || typeof layer.fill !== 'string' || !/^#[a-fA-F0-9]{6}$/.test(layer.fill)) fail();
    ids.add(layer.id as string);
    const startMs = number(layer.startMs, 0, 3600000), endMs = number(layer.endMs, 0, 3600000);
    if (endMs <= startMs || !Array.isArray(layer.lines) || layer.lines.length < 1 || layer.lines.length > 64) fail();
    const fontSize = number(layer.fontSize, 8, 512), lineHeight = number(layer.lineHeight, fontSize, 1024);
    const letterSpacing = number(layer.letterSpacing, 0, 32), outline = number(layer.outline, 0, 16), shadow = number(layer.shadow, 0, 32);
    const outlineColor = hexColor(layer['outlineColor']);
    const shadowColor = hexColor(layer['shadowColor']);
    const rawFaceId = layer['faceId'];
    const layerFaceId =
      rawFaceId === undefined
        ? undefined
        : typeof rawFaceId === 'string' && /^[a-z-]+-\d{3}-(normal|italic)$/.test(rawFaceId)
          ? rawFaceId
          : fail();
    const lines = (layer.lines as unknown[]).map(inputLine => {
      const line = object(inputLine); exactKeys(line, ['text', 'x', 'baseline', 'width']);
      if (typeof line.text !== 'string' || line.text.length > 1000 || /[\u0000-\u001f\u007f{}\\]/.test(line.text)) fail();
      characters += (line.text as string).length; if (characters > 16000) fail();
      const x = number(line.x, 0, width), baseline = number(line.baseline, 0, height), lineWidth = number(line.width, 0, width);
      if (x + lineWidth > width + 0.01) fail();
      return { text: line.text as string, x, baseline, width: lineWidth };
    });
    for (let i = 1; i < lines.length; i++) if (Math.abs(lines[i].baseline - lines[i - 1].baseline - lineHeight) > 0.01) fail();
    return {
      id: layer.id as string,
      startMs,
      endMs,
      fontSize,
      lineHeight,
      letterSpacing,
      outline,
      shadow,
      ...(outlineColor ? { outlineColor } : {}),
      ...(shadowColor ? { shadowColor } : {}),
      ...(layerFaceId ? { faceId: layerFaceId } : {}),
      align: layer.align as TypographyLayer['align'],
      fill: layer.fill as string,
      lines,
    };
  });
  return { version: 1, assetVersion: '1.0.0', faceId: raw.faceId as string, rendererSha256: raw.rendererSha256 as string, width, height, layers };
}

/** Greedy explicit wrapping, preserving hard breaks. Does not split grapheme clusters. */
export function wrapTypographyText(text: string, maxWidth: number, measure: (text: string) => number): string[] {
  if (!Number.isFinite(maxWidth) || maxWidth <= 0 || text.length > 16000 || /[\u0000-\u0009\u000b-\u001f\u007f{}\\]/.test(text)) throw new Error('Invalid typography text/wrap width');
  const lines: string[] = [];
  const segments = (word: string) => Array.from(new Intl.Segmenter(undefined, {granularity:'grapheme'}).segment(word), part => part.segment);
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.trim().split(/ +/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (measure(next) <= maxWidth) { line = next; continue; }
      if (line) { lines.push(line); line = ''; }
      for (const cluster of segments(word)) {
        if (measure(cluster) > maxWidth) throw new Error('Glyph exceeds typography region');
        if (line && measure(line + cluster) > maxWidth) { lines.push(line); line = ''; }
        line += cluster;
      }
    }
    if (line) lines.push(line);
    else if (!paragraph.trim()) lines.push('');
  }
  return lines;
}
