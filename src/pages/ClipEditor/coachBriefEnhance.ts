/**
 * Map Creative Brief / content type → Enhance defaults that ARE applied
 * (noise, light color, crop). Punch-ins / tracked reframe stay recommendations.
 */

export type BriefEnhanceDefaults = {
  noiseReduced: boolean;
  colorCorrection: number;
  cropMode: "face" | "center";
  captionStyle: "clean_subtitle" | "kinetic_hormozi";
};

export function enhanceDefaultsFromBrief(
  contentType?: string | null,
  captionStyle?: string | null,
  recommendations?: string[] | null,
): BriefEnhanceDefaults {
  const c = String(contentType || "other").toLowerCase();
  const rec = (recommendations || []).join(" ").toLowerCase();
  const wantsNoise =
    rec.includes("noise") ||
    rec.includes("isolation") ||
    c === "interview" ||
    c === "conversation" ||
    c === "testimonial";
  const wantsColor =
    rec.includes("color") ||
    rec.includes("vibran") ||
    c === "cinematic" ||
    c === "event-demo" ||
    c === "product-demo";
  const faceCrop =
    c === "interview" ||
    c === "conversation" ||
    c === "testimonial" ||
    c === "reaction" ||
    rec.includes("face") ||
    rec.includes("speaker");
  const style =
    captionStyle === "kinetic_hormozi" ||
    c === "gameplay" ||
    c === "reaction" ||
    c === "high_energy"
      ? "kinetic_hormozi"
      : "clean_subtitle";

  return {
    noiseReduced: wantsNoise,
    colorCorrection: wantsColor ? 35 : c === "professional" || c === "tutorial" ? 15 : 0,
    cropMode: faceCrop ? "face" : "center",
    captionStyle: style,
  };
}

/** Split Coach recommendations into applied vs suggestion-only copy. */
export function partitionRecommendations(recs: string[]): {
  appliedHints: string[];
  suggestionOnly: string[];
} {
  const appliedHints: string[] = [];
  const suggestionOnly: string[] = [];
  for (const r of recs) {
    const lower = r.toLowerCase();
    if (
      lower.includes("punch") ||
      lower.includes("reframe") ||
      lower.includes("track") ||
      lower.includes("zoom in") ||
      lower.includes("isolation")
    ) {
      suggestionOnly.push(r);
    } else {
      appliedHints.push(r);
    }
  }
  return { appliedHints, suggestionOnly };
}
