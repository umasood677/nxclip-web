/**
 * Brand Kit typography catalog — extends Ad Studio preview fonts with
 * export-compatibility hints for the Brand Kit Studio editor.
 */
export type BrandFontEntry = {
  id: string;
  family: string;
  label: string;
  /** When false, export/render may substitute a fallback. */
  exportFaithful: boolean;
  note?: string;
};

export const BRAND_FONT_CATALOG: BrandFontEntry[] = [
  { id: "montserrat", family: "Montserrat", label: "Montserrat", exportFaithful: true },
  { id: "inter", family: "Inter", label: "Inter", exportFaithful: true },
  { id: "anton", family: "Anton", label: "Anton", exportFaithful: true },
  { id: "bebas_neue", family: "Bebas Neue", label: "Bebas Neue", exportFaithful: true },
  {
    id: "impact",
    family: "Impact",
    label: "Impact",
    exportFaithful: false,
    note: "System font — export may substitute a bold condensed sans.",
  },
  { id: "playfair", family: "Playfair Display", label: "Playfair Display", exportFaithful: true },
  { id: "raleway", family: "Raleway", label: "Raleway", exportFaithful: true },
  { id: "roboto", family: "Roboto", label: "Roboto", exportFaithful: true },
  { id: "oswald", family: "Oswald", label: "Oswald", exportFaithful: true },
  { id: "lato", family: "Lato", label: "Lato", exportFaithful: true },
];

export function resolveBrandFontFamily(fontIdOrFamily?: string): string {
  if (!fontIdOrFamily) return "Montserrat, sans-serif";
  const hit = BRAND_FONT_CATALOG.find(
    (f) =>
      f.id === fontIdOrFamily ||
      f.family.toLowerCase() === fontIdOrFamily.toLowerCase(),
  );
  return hit ? `${hit.family}, sans-serif` : `${fontIdOrFamily}, sans-serif`;
}

export function findBrandFont(fontIdOrFamily?: string): BrandFontEntry | undefined {
  if (!fontIdOrFamily) return undefined;
  return BRAND_FONT_CATALOG.find(
    (f) =>
      f.id === fontIdOrFamily ||
      f.family.toLowerCase() === fontIdOrFamily.toLowerCase(),
  );
}
