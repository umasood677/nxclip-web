/**
 * Live Studio commentary overlay timing.
 * Standalone note ▶ plays the full asset; video-synced overlays must not stop
 * solely on a short EDL endMs when the decoded MP3 is longer.
 */

export type VoiceOverlayClip = {
  id: string;
  startMs: number;
  /** EDL/plan end; may under-report vs decoded media. */
  endMs?: number;
  type: "voice" | "foley";
  /** Decoded HTMLMediaElement.duration in seconds, when known. */
  mediaDurationSec?: number | null;
};

/** Slack so MP3 encoder padding / seek quantization does not cut the last phoneme. */
export const VOICE_OVERLAY_END_SLACK_MS = 200;

/**
 * Audible end for a live overlay clip (keep-window relative ms).
 * Voice: max(EDL end, start + decoded duration + slack).
 * Foley: keep EDL end (SFX is intentionally short).
 */
export function resolveVoiceOverlayEndMs(clip: VoiceOverlayClip): number {
  const edlEnd =
    typeof clip.endMs === "number" && Number.isFinite(clip.endMs)
      ? clip.endMs
      : clip.startMs + 60_000;

  if (clip.type !== "voice") {
    return edlEnd;
  }

  const mediaSec = clip.mediaDurationSec;
  if (
    mediaSec != null &&
    Number.isFinite(mediaSec) &&
    mediaSec > 0 &&
    mediaSec < 600
  ) {
    const mediaEnd =
      clip.startMs + Math.round(mediaSec * 1000) + VOICE_OVERLAY_END_SLACK_MS;
    return Math.max(edlEnd, mediaEnd);
  }

  return edlEnd;
}

/** True when keep-window playhead is inside the audible window (with lead-in). */
export function isOverlayActiveAtKeepMs(
  clip: VoiceOverlayClip,
  keepMs: number,
  leadInMs = 60,
): boolean {
  const end = resolveVoiceOverlayEndMs(clip);
  return keepMs >= clip.startMs - leadInMs && keepMs < end;
}
