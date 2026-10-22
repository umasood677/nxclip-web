/** Known variation suffixes appended as ` · ${suffix}`. */
export const VARIATION_NAME_SUFFIXES = [
  "Headline",
  "CTA",
  "Color",
  "Layout",
  "Square",
  "Portrait",
  "Background",
] as const;

/**
 * Strip stacked variation suffixes so re-varying a child does not produce
 * `Model editorial draft · CTA · CTA · Color`.
 */
export function variationRootDisplayName(name: string): string {
  let base = String(name || "").trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of VARIATION_NAME_SUFFIXES) {
      const token = ` · ${suffix}`;
      if (base.endsWith(token)) {
        base = base.slice(0, -token.length).trimEnd();
        changed = true;
      }
    }
  }
  return base || "Creative";
}

export function buildVariationDisplayName(
  sourceName: string,
  nameSuffix: string,
): string {
  return `${variationRootDisplayName(sourceName)} · ${nameSuffix}`.slice(0, 160);
}
