import type { TransitionBeat } from "./clipEnhanceCoach";

export type CoachImpactPack = {
  bgmTrackId: string;
  duckBgm: boolean;
  junctionType: "cut" | "crossfade" | "flash";
  junctionSfx: string;
  label: string;
  enhanceTypes: string[];
};

/** Human labels for Coach impact BGM track ids (mirrors Clip Studio TRACKS). */
export const COACH_BGM_TITLES: Record<string, string> = {
  "1": "Cyberpunk Pulse",
  "2": "Lo-Fi Gaming",
  "3": "Epic Victory",
  "4": "Trap King",
  "5": "Neon Nights",
  "6": "Aggressive Phonk",
  "7": "Summer Vibes",
  "8": "Dark Souls",
  "9": "Future Bass",
  "10": "8-Bit Adventure",
};

export function coachBgmTitle(trackId: string): string {
  return COACH_BGM_TITLES[trackId] || `Track ${trackId}`;
}

/**
 * Dedupe repeated "Focus: …" suffixes from story picks.
 * Do not rewrite sentence punctuation — that used to change Creator Context
 * between Analyze and Apply and blocked Apply with a 400.
 */
export function sanitizeCreatorContext(text: string): string {
  const raw = String(text || "").trim().replace(/\s+/g, " ");
  if (!raw) return "";
  // Keep the last Focus: clause; drop earlier duplicates (story-option re-picks).
  const focusMatches = [...raw.matchAll(/(?:^|[.!?]\s+|—\s*)Focus:\s*([^—]+?)(?=\s*—\s*|$)/gi)];
  if (focusMatches.length <= 1) return raw.slice(0, 500);
  const lastFocus = focusMatches[focusMatches.length - 1]![1]!.trim();
  const withoutFocus = raw
    .replace(/(?:^|[.!?]\s+|—\s*)Focus:\s*[^—]+?(?=\s*—\s*|$)/gi, "")
    .replace(/\s*—\s*—/g, " — ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*—\s*$/g, "")
    .trim();
  const out = withoutFocus
    ? `${withoutFocus} — Focus: ${lastFocus}`
    : `Focus: ${lastFocus}`;
  return out.slice(0, 500);
}

/** Keep in sync with content-service coach-impact.ts */
export function resolveCoachImpactPack(
  mode?: string | null,
  contentType?: string | null,
): CoachImpactPack {
  const m = String(mode || "auto").toLowerCase();
  const c = String(contentType || "other").toLowerCase();

  // Explicit mode wins. Content type is only the Auto fallback.
  if (m === "high_energy") {
    return {
      bgmTrackId: "6",
      duckBgm: true,
      junctionType: "flash",
      junctionSfx: "Impact Hit",
      label: "High-energy impact",
      enhanceTypes: ["Flash", "Zoom Blur", "Whip Pan"],
    };
  }
  if (m === "viral_short") {
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
  if (m === "documentary") {
    return {
      bgmTrackId: "8",
      duckBgm: true,
      junctionType: "crossfade",
      junctionSfx: "Whoosh Soft",
      label: "Cinematic story",
      enhanceTypes: ["Cut", "Zoom Blur", "Flash"],
    };
  }
  if (m === "professional") {
    return {
      bgmTrackId: "2",
      duckBgm: true,
      junctionType: "crossfade",
      junctionSfx: "Whoosh Soft",
      label: "Clean professional",
      enhanceTypes: ["Cut", "Zoom Blur", "Flash"],
    };
  }
  if (c === "gameplay" || c === "reaction") {
    return {
      bgmTrackId: "6",
      duckBgm: true,
      junctionType: "flash",
      junctionSfx: "Impact Hit",
      label: "High-energy impact",
      enhanceTypes: ["Flash", "Zoom Blur", "Whip Pan"],
    };
  }
  if (c === "product-demo" || c === "event-demo") {
    return {
      bgmTrackId: "9",
      duckBgm: true,
      junctionType: "flash",
      junctionSfx: "Flash Pop",
      label: "Viral punch",
      enhanceTypes: ["Flash", "Cut", "Zoom Blur"],
    };
  }
  if (c === "cinematic" || c === "behind-the-scenes") {
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
 * Build Enhance transition cards at Coach segment junctions.
 * Times are relative to the polish/trim window so Apply + live preview
 * seek correctly on the continuous source player (pre-stitch).
 */
export function transitionsFromCoachSegments(
  segments: Array<{ start: number; end: number; purpose?: string }>,
  pack: CoachImpactPack,
  trimStart = 0,
  trimEnd = Number.POSITIVE_INFINITY,
): TransitionBeat[] {
  if (!segments.length || segments.length < 2) return [];
  const windowEnd = Number.isFinite(trimEnd) ? trimEnd : trimStart + 60;
  const span = Math.max(0.5, windowEnd - trimStart);
  const out: TransitionBeat[] = [];
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i]!;
    const next = segments[i + 1];
    // Preview on source: fire near the end of this keep-range in the trim window.
    const abs = Number(seg.end);
    const rel = Math.round(Math.min(span, Math.max(0, abs - trimStart)) * 10) / 10;
    if (rel <= 0.25 || rel >= span - 0.25) continue;
    out.push({
      time: rel,
      type: pack.enhanceTypes[i % pack.enhanceTypes.length]!,
      caption: next?.purpose || seg.purpose || `Beat ${i + 2}`,
      // Visual join preview only — no transition beep/SFX.
    });
  }
  return out;
}
