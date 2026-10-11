import type { TransitionBeat } from "./clipEnhanceCoach";

export type CoachImpactPack = {
  bgmTrackId: string;
  duckBgm: boolean;
  junctionType: "cut" | "crossfade" | "flash";
  junctionSfx: string;
  label: string;
  enhanceTypes: string[];
};

/** Keep in sync with content-service coach-impact.ts */
export function resolveCoachImpactPack(
  mode?: string | null,
  contentType?: string | null,
): CoachImpactPack {
  const m = String(mode || "auto").toLowerCase();
  const c = String(contentType || "other").toLowerCase();

  if (m === "high_energy" || c === "gameplay" || c === "reaction") {
    return {
      bgmTrackId: "6",
      duckBgm: true,
      junctionType: "flash",
      junctionSfx: "Impact Hit",
      label: "High-energy impact",
      enhanceTypes: ["Flash", "Zoom Blur", "Whip Pan"],
    };
  }
  if (m === "viral_short" || c === "product-demo" || c === "event-demo") {
    return {
      bgmTrackId: "9",
      duckBgm: true,
      junctionType: "flash",
      junctionSfx: "Flash Pop",
      label: "Viral punch",
      enhanceTypes: ["Flash", "Cut", "Zoom Blur"],
    };
  }
  if (m === "event_highlight") {
    return {
      bgmTrackId: "3",
      duckBgm: true,
      junctionType: "cut",
      junctionSfx: "Impact Hit",
      label: "Event highlight",
      enhanceTypes: ["Cut", "Flash", "Whip Pan"],
    };
  }
  if (m === "documentary" || c === "cinematic" || c === "behind-the-scenes") {
    return {
      bgmTrackId: "8",
      duckBgm: true,
      junctionType: "crossfade",
      junctionSfx: "Whoosh Soft",
      label: "Cinematic story",
      enhanceTypes: ["Cut", "Zoom Blur", "Flash"],
    };
  }
  if (
    m === "professional" ||
    c === "interview" ||
    c === "conversation" ||
    c === "testimonial" ||
    c === "tutorial"
  ) {
    return {
      bgmTrackId: "2",
      duckBgm: true,
      junctionType: "crossfade",
      junctionSfx: "Whoosh Soft",
      label: "Clean professional",
      enhanceTypes: ["Cut", "Zoom Blur", "Flash"],
    };
  }
  return {
    bgmTrackId: "7",
    duckBgm: true,
    junctionType: "cut",
    junctionSfx: "Whoosh Soft",
    label: "Balanced short",
    enhanceTypes: ["Cut", "Zoom Blur", "Flash", "Whip Pan"],
  };
}

/**
 * Build Enhance transition cards at Coach segment junctions (stitched-relative times).
 */
export function transitionsFromCoachSegments(
  segments: Array<{ start: number; end: number; purpose?: string }>,
  pack: CoachImpactPack,
): TransitionBeat[] {
  if (!segments.length || segments.length < 2) return [];
  let cursor = 0;
  const out: TransitionBeat[] = [];
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i]!;
    const dur = Math.max(0.2, Number(seg.end) - Number(seg.start));
    cursor += dur;
    const next = segments[i + 1];
    out.push({
      time: Math.round(cursor * 10) / 10,
      type: pack.enhanceTypes[i % pack.enhanceTypes.length]!,
      caption: next?.purpose || seg.purpose || `Beat ${i + 2}`,
      sfx: pack.junctionSfx,
    });
  }
  return out;
}
