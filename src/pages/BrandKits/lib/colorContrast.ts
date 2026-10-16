/** Relative luminance (sRGB) for WCAG contrast checks. */
function luminance(hex: string): number {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) return 0;
  const r = parseInt(cleaned.slice(0, 2), 16) / 255;
  const g = parseInt(cleaned.slice(2, 4), 16) / 255;
  const b = parseInt(cleaned.slice(4, 6), 16) / 255;
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(hexA: string, hexB: string): number {
  const l1 = luminance(hexA);
  const l2 = luminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function contrastLabel(ratio: number): { label: string; ok: boolean } {
  if (ratio >= 7) return { label: "AAA", ok: true };
  if (ratio >= 4.5) return { label: "AA", ok: true };
  if (ratio >= 3) return { label: "AA Large", ok: true };
  return { label: "Low", ok: false };
}

export function normalizeHex(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return withHash.toUpperCase();
}

export function isValidHex(value: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(normalizeHex(value));
}
