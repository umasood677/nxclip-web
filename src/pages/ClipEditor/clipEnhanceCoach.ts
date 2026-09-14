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
