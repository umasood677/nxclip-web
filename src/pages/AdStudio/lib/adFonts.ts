/** Font allowlist for Ad Studio preview — maps to image-edit / clip catalog fonts. */
export const AD_STUDIO_FONTS = [
  { id: "montserrat", family: "Montserrat", label: "Montserrat" },
  { id: "playfair_display", family: "Playfair Display", label: "Playfair Display" },
  { id: "inter", family: "Inter", label: "Inter" },
  { id: "playfair_display", family: "Playfair Display", label: "Playfair Display" },
  { id: "playfair", family: "Playfair Display", label: "Playfair Display" },
  { id: "anton", family: "Anton", label: "Anton" },
  { id: "bebas_neue", family: "Bebas Neue", label: "Bebas Neue" },
  { id: "impact", family: "Impact", label: "Impact" },
] as const;

const SERIF_FAMILIES = new Set(["Playfair Display"]);

function normalizeFontKey(fontIdOrFamily: string): string {
  return fontIdOrFamily.toLowerCase().replace(/\s+/g, "_");
}

export function resolveAdFontFamily(fontIdOrFamily?: string): string {
  if (!fontIdOrFamily) return "Montserrat, sans-serif";
  const key = normalizeFontKey(fontIdOrFamily);
  const hit = AD_STUDIO_FONTS.find(
    (f) =>
      f.id === fontIdOrFamily ||
      f.id === key ||
      f.family.toLowerCase() === fontIdOrFamily.toLowerCase() ||
      (key.includes("playfair") && f.id === "playfair_display"),
  );
  if (hit) {
    const stack = SERIF_FAMILIES.has(hit.family) ? "serif" : "sans-serif";
    return `${hit.family}, ${stack}`;
  }
  const fallbackStack = key.includes("playfair") ? "serif" : "sans-serif";
  return `${fontIdOrFamily}, ${fallbackStack}`;
}
