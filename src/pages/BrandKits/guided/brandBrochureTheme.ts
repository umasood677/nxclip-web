import type { BrandKitSummary } from "../lib/brandKitTypes";
export function brandSectionInk(hex: string) {
  const rgb = hex
    .replace("#", "")
    .match(/../g)
    ?.map((v) => parseInt(v, 16)) || [0, 0, 0];
  const [r, g, b] = rgb.map((v) => {
    const n = v / 255;
    return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05)
    ? "#111318"
    : "#ffffff";
}
export function brandBrochureTheme(kit: BrandKitSummary) {
  const color = (role: string, fallback: string) => {
    const hex = kit.colors?.find((c) => c.role === role)?.hex;
    return hex && /^#[0-9a-f]{6}$/i.test(hex) ? hex : fallback;
  };
  const primary = color("primary", "#31272c"),
    secondary = color("secondary", "#22242b"),
    accent = color("accent", "#c4a574"),
    background = color("background", "#f7f4ed"),
    text = color("text", "#202127");
  return {
    primary,
    secondary,
    accent,
    background,
    text,
    primaryInk: brandSectionInk(primary),
    secondaryInk: brandSectionInk(secondary),
    accentInk: brandSectionInk(accent),
    backgroundInk: brandSectionInk(background),
    textInk: brandSectionInk(text),
  };
}
