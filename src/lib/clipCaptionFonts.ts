/** FE allowlist for Clip Studio caption fonts (mirrors media-worker OFL pack). */

export const CLIP_CAPTION_FONTS = [
  { id: 'montserrat_black', label: 'Montserrat Black', cssFamily: '"Montserrat", system-ui, sans-serif', previewWeight: 900 },
  { id: 'anton', label: 'Anton', cssFamily: '"Anton", Impact, sans-serif', previewWeight: 400 },
  { id: 'bebas_neue', label: 'Bebas Neue', cssFamily: '"Bebas Neue", Impact, sans-serif', previewWeight: 400 },
  { id: 'inter_bold', label: 'Inter Bold', cssFamily: '"Inter", system-ui, sans-serif', previewWeight: 700 },
  { id: 'impact', label: 'Impact (Anton)', cssFamily: '"Anton", Impact, sans-serif', previewWeight: 400 },
  { id: 'arial_black', label: 'Bold Display', cssFamily: '"Montserrat", Arial Black, sans-serif', previewWeight: 900 },
  { id: 'arial', label: 'Clean Sans', cssFamily: '"Inter", Arial, sans-serif', previewWeight: 700 },
] as const;

export type ClipCaptionFontId = (typeof CLIP_CAPTION_FONTS)[number]['id'];

export const CLIP_CAPTION_FONT_DEFAULT: ClipCaptionFontId = 'montserrat_black';

export function clipCaptionFontCss(fontId?: string | null): string {
  const hit = CLIP_CAPTION_FONTS.find((f) => f.id === fontId);
  return hit?.cssFamily ?? CLIP_CAPTION_FONTS[0].cssFamily;
}
