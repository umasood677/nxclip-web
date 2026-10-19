/** Map Brand Kit / editor font family names to Ad Studio fontId tokens. */
export function fontIdForBrandFamily(family: string): string {
  const key = family.toLowerCase().replace(/\s+/g, "_");
  if (key.includes("playfair")) return "playfair_display";
  if (key.includes("bebas")) return "bebas_neue";
  if (key.includes("anton") || key.includes("impact")) return "anton";
  if (key.includes("inter")) return "inter";
  if (key.includes("montserrat")) return "montserrat";
  return key.slice(0, 48) || "montserrat";
}
