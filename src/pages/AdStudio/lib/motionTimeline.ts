/**
 * Timeline geometry and time helpers for Animated Ad Studio (Phase 4B-A).
 * Deterministic — no AI, no DOM.
 */

export function clampTimeMs(timeMs: number, durationMs: number): number {
  if (!Number.isFinite(timeMs) || timeMs < 0) return 0;
  if (!Number.isFinite(durationMs) || durationMs <= 0) return 0;
  return Math.min(timeMs, durationMs);
}

export function frameDurationMs(fps: number): number {
  const f = Number.isFinite(fps) && fps > 0 ? fps : 30;
  return 1000 / f;
}

/** Snap time to nearest frame boundary for the given fps. */
export function snapToFrame(timeMs: number, fps: number): number {
  const frameMs = frameDurationMs(fps);
  return Math.round(timeMs / frameMs) * frameMs;
}

/** Snap with optional grid (ms). Prefer frame snap when gridMs is omitted. */
export function snapTimeMs(
  timeMs: number,
  fps: number,
  opts?: { gridMs?: number; enabled?: boolean },
): number {
  if (opts?.enabled === false) return timeMs;
  if (opts?.gridMs && opts.gridMs > 0) {
    return Math.round(timeMs / opts.gridMs) * opts.gridMs;
  }
  return snapToFrame(timeMs, fps);
}

export function msToPixels(timeMs: number, pxPerSecond: number): number {
  return (timeMs / 1000) * pxPerSecond;
}

export function pixelsToMs(pixels: number, pxPerSecond: number): number {
  if (!pxPerSecond) return 0;
  return (pixels / pxPerSecond) * 1000;
}

export function formatTimecode(timeMs: number, fps = 30): string {
  const clamped = Math.max(0, timeMs);
  const totalSec = clamped / 1000;
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  const frame = Math.floor((clamped % 1000) / frameDurationMs(fps)) % Math.max(1, Math.round(fps));
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:${String(frame).padStart(2, "0")}`;
}

export function formatDurationLabel(durationMs: number): string {
  const sec = durationMs / 1000;
  if (Number.isInteger(sec)) return `${sec}s`;
  return `${sec.toFixed(1)}s`;
}

/** Major ruler ticks every N seconds depending on zoom. */
export function rulerMajorIntervalSec(pxPerSecond: number): number {
  if (pxPerSecond >= 160) return 0.5;
  if (pxPerSecond >= 80) return 1;
  if (pxPerSecond >= 40) return 2;
  return 5;
}

export function buildRulerMarks(
  durationMs: number,
  pxPerSecond: number,
): Array<{ timeMs: number; label: string; major: boolean }> {
  const majorSec = rulerMajorIntervalSec(pxPerSecond);
  const minorSec = majorSec / 2;
  const marks: Array<{ timeMs: number; label: string; major: boolean }> = [];
  const end = Math.max(0, durationMs);
  for (let t = 0; t <= end + 0.5; t += minorSec * 1000) {
    const timeMs = Math.min(Math.round(t), end);
    const sec = timeMs / 1000;
    const major = Math.abs(sec % majorSec) < 1e-6 || Math.abs((sec % majorSec) - majorSec) < 1e-6;
    marks.push({
      timeMs,
      label: major ? formatDurationLabel(timeMs) : "",
      major,
    });
    if (timeMs >= end) break;
  }
  if (!marks.length || marks[marks.length - 1]!.timeMs !== end) {
    marks.push({ timeMs: end, label: formatDurationLabel(end), major: true });
  }
  return marks;
}

export const TIMELINE_ZOOM_MIN = 24;
export const TIMELINE_ZOOM_MAX = 240;
export const TIMELINE_ZOOM_DEFAULT = 64;

export function clampTimelineZoom(pxPerSecond: number): number {
  return Math.min(TIMELINE_ZOOM_MAX, Math.max(TIMELINE_ZOOM_MIN, pxPerSecond));
}

export type LayerTrackSpan = {
  id: string;
  name: string;
  type: string;
  startMs: number;
  endMs: number;
  keyframeTimesMs: number[];
};

export function layerTrackSpans(
  layers: Array<{
    id: string;
    name?: string;
    type: string;
    startMs: number;
    endMs: number;
    animations?: Array<{ keyframes: Array<{ timeMs: number }> }>;
  }>,
): LayerTrackSpan[] {
  return [...layers]
    .slice()
    .sort((a, b) => a.startMs - b.startMs || a.id.localeCompare(b.id))
    .map((layer) => {
      const keyframeTimesMs = new Set<number>();
      for (const anim of layer.animations ?? []) {
        for (const kf of anim.keyframes ?? []) {
          if (Number.isFinite(kf.timeMs)) {
            keyframeTimesMs.add(layer.startMs + kf.timeMs);
          }
        }
      }
      return {
        id: layer.id,
        name: layer.name?.trim() || layer.type,
        type: layer.type,
        startMs: layer.startMs,
        endMs: layer.endMs,
        keyframeTimesMs: [...keyframeTimesMs].sort((a, b) => a - b),
      };
    });
}
