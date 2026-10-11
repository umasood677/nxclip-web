export type TransitionBeat = {
  time: number;
  type: string;
  caption?: string;
  sfx?: string;
};

export function polishWindow(
  finalTrim: { start: number; end: number } | null | undefined,
  trimStart: number,
  trimEnd: number,
): { start: number; end: number; duration: number } {
  const start = Number.isFinite(finalTrim?.start) ? finalTrim!.start : trimStart;
  const end = Number.isFinite(finalTrim?.end) ? finalTrim!.end : trimEnd;
  const safeStart = Number.isFinite(start) ? Math.max(0, start) : 0;
  const safeEnd = Number.isFinite(end) ? Math.max(safeStart + 0.5, end) : safeStart + 0.5;
  return { start: safeStart, end: safeEnd, duration: safeEnd - safeStart };
}

/** Seconds from the start of the polished clip, never past clip length. */
export function toClipRelativeTime(absoluteSec: number, trimStart: number, trimEnd: number): number {
  const span = Math.max(0.5, trimEnd - trimStart);
  const rel = Number(absoluteSec) - trimStart;
  if (!Number.isFinite(rel)) return 0;
  return Math.round(Math.min(span, Math.max(0, rel)) * 10) / 10;
}

/** Prefer the listed Zoom Blur (if any) so the coach matches the suggestion cards. */
export function pickCoachTransition(items: TransitionBeat[]): TransitionBeat | null {
  if (!items.length) return null;
  const zoom = items.find((s) => /zoom/i.test(s.type));
  return zoom ?? items[items.length - 1] ?? null;
}

const FALLBACK_TRANSITION_TYPES = ["Cut", "Zoom Blur", "Whip Pan", "Flash"] as const;

/**
 * Build Enhance transition cards from AI Coach / AI Scan beats when the
 * dedicated transitions API returns nothing.
 */
export function transitionsFromCoachBeats(
  beats: Array<{ time: number; label?: string }>,
  trimStart: number,
  trimEnd: number,
): TransitionBeat[] {
  const window = polishWindow(null, trimStart, trimEnd);
  const interior = beats
    .map((b) => ({
      time: toClipRelativeTime(Number(b.time), window.start, window.end),
      label: String(b.label || "").replace(/_/g, " "),
    }))
    .filter((b) => Number.isFinite(b.time) && b.time > 0.35 && b.time < window.duration - 0.35)
    .sort((a, b) => a.time - b.time);

  // Dedupe near-identical times (within 0.4s).
  const unique: typeof interior = [];
  for (const beat of interior) {
    const prev = unique[unique.length - 1];
    if (prev && Math.abs(prev.time - beat.time) < 0.4) continue;
    unique.push(beat);
  }

  return unique.slice(0, 4).map((b, i) => ({
    time: b.time,
    type: FALLBACK_TRANSITION_TYPES[i % FALLBACK_TRANSITION_TYPES.length]!,
    caption: b.label || undefined,
    sfx: i % 2 === 0 ? "Whoosh Soft" : undefined,
  }));
}
