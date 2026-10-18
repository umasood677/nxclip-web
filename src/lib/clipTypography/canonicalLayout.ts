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
})})) };
const loader = new FontLoaderService(undefined, 10000, catalog);
export const canonicalBrowserFamily = (faceId: string) => `NxClip T2 Canonical ${faceId.replace(/-\d+-(normal|italic)$/,'')}`;
export async function loadCanonicalLayoutFont(plan: CanonicalTypographyLayout): Promise<void> {
  const face = parity.faces.find(face => face.id === plan.faceId);
  if (!face || face.sha256 !== plan.rendererSha256 || plan.assetVersion !== face.rendererAssetVersion) throw new Error('Canonical font identity/version mismatch');
  await loader.loadFont(plan.faceId.replace(/-\d+-(normal|italic)$/, ''), face.weight, face.style as FontStyle, plan.layers.flatMap(layer => layer.lines.map(line => line.text)).join(''));
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
  layers: Array<Omit<TypographyLayer,'lines'> & {text: string; left: number; firstBaseline: number; maxWidth: number}>;
}): Promise<CanonicalTypographyLayout> {
  const face = parity.faces.find(face => face.id === input.faceId); if (!face) throw new Error('Unknown canonical face');
  // Load full verified bytes before measuring. A failed request never produces fallback geometry.
  await loader.loadFont(input.faceId.replace(/-\d+-(normal|italic)$/, ''), face.weight, face.style as FontStyle, input.layers.map(layer => layer.text).join(''));
  const context = document.createElement('canvas').getContext('2d'); if (!context) throw new Error('Canvas unavailable');
  const layers = input.layers.map(layer => {
    configure(context, input.faceId, layer);
    if (!Number.isFinite(layer.left) || !Number.isFinite(layer.firstBaseline) || layer.maxWidth + layer.left > input.width) throw new Error('Invalid typography region');
    const lines = wrapTypographyText(layer.text, layer.maxWidth, text => context.measureText(text).width).map((text,index) => {
      const width = context.measureText(text).width;
      const offset = layer.align === 'center' ? (layer.maxWidth-width)/2 : layer.align === 'right' ? layer.maxWidth-width : 0;
      return {text,x:layer.left+offset,baseline:layer.firstBaseline+index*layer.lineHeight,width};
    });
    return {id:layer.id,startMs:layer.startMs,endMs:layer.endMs,fontSize:layer.fontSize,lineHeight:layer.lineHeight,letterSpacing:layer.letterSpacing,align:layer.align,fill:layer.fill,outline:layer.outline,shadow:layer.shadow,lines};
  });
  return validateTypographyLayout({version:1,assetVersion:'1.0.0',faceId:face.id,rendererSha256:face.sha256,width:input.width,height:input.height,layers});
}

/** Used by the editor Canvas overlay and the golden fixture; call loadCanonicalLayoutFont first. */
export function drawCanonicalLayout(context: CanvasRenderingContext2D, input: CanonicalTypographyLayout, timeMs: number): void {
  const plan = validateTypographyLayout(input);
  const face = parity.faces.find(face => face.id === plan.faceId); if (!face || face.sha256 !== plan.rendererSha256) throw new Error('Canonical font mismatch');
  const text = plan.layers.flatMap(layer => layer.lines.map(line => line.text)).join('');
  if (loader.getFontLoadStatus(plan.faceId.replace(/-\d+-(normal|italic)$/, ''),face.weight,face.style as FontStyle,text) !== 'loaded') throw new Error('Canonical font not loaded');
  for (const layer of plan.layers) if (timeMs >= layer.startMs && timeMs < layer.endMs) {
    context.save(); configure(context,plan.faceId,layer);
    context.fillStyle=layer.fill; context.strokeStyle='#000000'; context.lineWidth=layer.outline*2; context.lineJoin='round';
    context.shadowColor='#000000'; context.shadowBlur=0; context.shadowOffsetX=layer.shadow; context.shadowOffsetY=layer.shadow;
    for (const line of layer.lines) { if (layer.outline) context.strokeText(line.text,line.x,line.baseline); context.fillText(line.text,line.x,line.baseline); }
    context.restore();
  }
}
