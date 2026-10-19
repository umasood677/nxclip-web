import parity from './parity-font-lock.json';
import { FONT_MANIFEST, type FontEntry, type FontStyle } from './registry';
import { FontLoaderService } from './FontLoaderService';
import { validateTypographyLayout, wrapTypographyText, type CanonicalTypographyLayout, type TypographyLayer } from './layoutContract';
export { CANONICAL_TYPOGRAPHY_ENABLED, validateTypographyLayout } from './layoutContract';
export type { CanonicalTypographyLayout } from './layoutContract';

export const PARITY_FONT_PACKAGE = parity;
const catalog: {fonts: FontEntry[]} = { fonts: FONT_MANIFEST.fonts.map(font => ({...font, family:`Canonical ${font.id}`, faces:font.faces.map(face => {
  const asset = parity.faces.find(item => item.id === face.id)!;
  return {...face, browser:{availability:'packaged',format:'truetype',runtimeVerified:false,requirements:['Canonical layout v1; activation approval required'],assets:[{path:asset.path,sha256:asset.sha256,url:asset.path.replace(/^public/,''),deliveryRelease:'1.1.0',subset:'full',cssUnicodeRange:asset.inspection.unicodeRanges.join(','),inspection:{...asset.inspection,kind:'static',style:asset.style,axes:{}}}]}};
}))}) };
const loader = new FontLoaderService(undefined, 10000, catalog);
export const canonicalBrowserFamily = (faceId: string) => `NxClip T2 Canonical ${faceId.replace(/-\d+-(normal|italic)$/,'')}`;

function resolveLayerFaceId(plan: Pick<CanonicalTypographyLayout, 'faceId'>, layer: Pick<TypographyLayer, 'faceId'>): string {
  return layer.faceId || plan.faceId;
}

async function loadFace(faceId: string, sampleText: string): Promise<typeof parity.faces[number]> {
  const face = parity.faces.find((item) => item.id === faceId);
  if (!face) throw new Error('Unknown canonical face');
  await loader.loadFont(faceId.replace(/-\d+-(normal|italic)$/, ''), face.weight, face.style as FontStyle, sampleText);
  return face;
}

export async function loadCanonicalLayoutFont(plan: CanonicalTypographyLayout): Promise<void> {
  const faceIds = [...new Set(plan.layers.map((layer) => resolveLayerFaceId(plan, layer)))];
  for (const faceId of faceIds) {
    const face = parity.faces.find((item) => item.id === faceId);
    if (!face) throw new Error('Unknown canonical face');
    if (faceId === plan.faceId && (face.sha256 !== plan.rendererSha256 || plan.assetVersion !== face.rendererAssetVersion)) {
      throw new Error('Canonical font identity/version mismatch');
    }
    const sample = plan.layers
      .filter((layer) => resolveLayerFaceId(plan, layer) === faceId)
      .flatMap((layer) => layer.lines.map((line) => line.text))
      .join('');
    await loader.loadFont(faceId.replace(/-\d+-(normal|italic)$/, ''), face.weight, face.style as FontStyle, sample);
  }
}

function configure(context: CanvasRenderingContext2D, faceId: string, layer: Pick<TypographyLayer,'fontSize'|'letterSpacing'>) {
  const face = parity.faces.find(face => face.id === faceId); if (!face) throw new Error('Unknown canonical face');
  context.font = `${face.style} ${face.weight} ${layer.fontSize}px "${canonicalBrowserFamily(faceId)}"`;
  // libass disables pair kerning for nonzero spacing; make v1 identical explicitly.
  context.fontKerning = layer.letterSpacing ? 'none' : 'normal'; context.textBaseline = 'alphabetic'; context.textAlign = 'left';
  if (!('letterSpacing' in context) && layer.letterSpacing) throw new Error('Browser does not support verified Canvas letter spacing');
  context.letterSpacing = `${layer.letterSpacing}px`;
}

export async function prepareCanonicalLayout(input: {
  faceId: string; width: number; height: number;
  layers: Array<Omit<TypographyLayer,'lines'> & {text: string; left: number; firstBaseline: number; maxWidth: number; faceId?: string}>;
}): Promise<CanonicalTypographyLayout> {
  const primaryFace = parity.faces.find(face => face.id === input.faceId); if (!primaryFace) throw new Error('Unknown canonical face');
  const uniqueFaceIds = [...new Set(input.layers.map((layer) => layer.faceId || input.faceId))];
  for (const faceId of uniqueFaceIds) {
    const sample = input.layers
      .filter((layer) => (layer.faceId || input.faceId) === faceId)
      .map((layer) => layer.text)
      .join('');
    await loadFace(faceId, sample);
  }
  const context = document.createElement('canvas').getContext('2d'); if (!context) throw new Error('Canvas unavailable');
  const layers = input.layers.map(layer => {
    const faceId = layer.faceId || input.faceId;
    configure(context, faceId, layer);
    if (!Number.isFinite(layer.left) || !Number.isFinite(layer.firstBaseline) || layer.maxWidth + layer.left > input.width) throw new Error('Invalid typography region');
    const lines = wrapTypographyText(layer.text, layer.maxWidth, text => context.measureText(text).width).map((text,index) => {
      const width = context.measureText(text).width;
      const offset = layer.align === 'center' ? (layer.maxWidth-width)/2 : layer.align === 'right' ? layer.maxWidth-width : 0;
      return {text,x:layer.left+offset,baseline:layer.firstBaseline+index*layer.lineHeight,width};
    });
    return {
      id:layer.id,startMs:layer.startMs,endMs:layer.endMs,fontSize:layer.fontSize,lineHeight:layer.lineHeight,letterSpacing:layer.letterSpacing,align:layer.align,fill:layer.fill,outline:layer.outline,shadow:layer.shadow,
      ...(layer.outlineColor ? { outlineColor: layer.outlineColor } : {}),
      ...(layer.shadowColor ? { shadowColor: layer.shadowColor } : {}),
      ...(faceId !== input.faceId || layer.faceId ? { faceId } : {}),
      lines,
    };
  });
  return validateTypographyLayout({version:1,assetVersion:'1.0.0',faceId:primaryFace.id,rendererSha256:primaryFace.sha256,width:input.width,height:input.height,layers});
}

/** Used by the editor Canvas overlay and the golden fixture; call loadCanonicalLayoutFont first. */
export function drawCanonicalLayout(context: CanvasRenderingContext2D, input: CanonicalTypographyLayout, timeMs: number): void {
  const plan = validateTypographyLayout(input);
  for (const layer of plan.layers) if (timeMs >= layer.startMs && timeMs < layer.endMs) {
    const faceId = resolveLayerFaceId(plan, layer);
    const face = parity.faces.find(item => item.id === faceId); if (!face) throw new Error('Unknown canonical face');
    if (faceId === plan.faceId && face.sha256 !== plan.rendererSha256) throw new Error('Canonical font mismatch');
    const text = layer.lines.map(line => line.text).join('');
    if (loader.getFontLoadStatus(faceId.replace(/-\d+-(normal|italic)$/, ''),face.weight,face.style as FontStyle,text) !== 'loaded') throw new Error('Canonical font not loaded');
    context.save(); configure(context,faceId,layer);
    const stroke = layer.outlineColor && /^#[0-9a-fA-F]{6}$/.test(layer.outlineColor) ? layer.outlineColor : '#000000';
    const shadow = layer.shadowColor && /^#[0-9a-fA-F]{6}$/.test(layer.shadowColor) ? layer.shadowColor : '#000000';
    context.fillStyle=layer.fill; context.strokeStyle=stroke; context.lineWidth=layer.outline*2; context.lineJoin='round';
    context.shadowColor=shadow; context.shadowBlur=0; context.shadowOffsetX=layer.shadow; context.shadowOffsetY=layer.shadow;
    for (const line of layer.lines) { if (layer.outline) context.strokeText(line.text,line.x,line.baseline); context.fillText(line.text,line.x,line.baseline); }
    context.restore();
  }
}
