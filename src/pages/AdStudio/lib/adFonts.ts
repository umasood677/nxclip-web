/** Font allowlist for Ad Studio preview — maps to image-edit / clip catalog fonts. */
export const AD_STUDIO_FONTS = [
  { id: "montserrat", family: "Montserrat", label: "Montserrat" },
  { id: "inter", family: "Inter", label: "Inter" },
  { id: "anton", family: "Anton", label: "Anton" },
  { id: "bebas_neue", family: "Bebas Neue", label: "Bebas Neue" },
  { id: "impact", family: "Impact", label: "Impact" },
] as const;

export function resolveAdFontFamily(fontIdOrFamily?: string): string {
  if (!fontIdOrFamily) return "Montserrat, sans-serif";
  const hit = AD_STUDIO_FONTS.find(
    (f) =>
      f.id === fontIdOrFamily ||
      f.family.toLowerCase() === fontIdOrFamily.toLowerCase(),
  );
  return hit ? `${hit.family}, sans-serif` : `${fontIdOrFamily}, sans-serif`;
}
