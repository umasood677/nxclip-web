export type HighlightMarker = { time: number; label: string };

export function highlightLabelsForNiche(
  creatorCategory?: string | null,
  niches?: string[],
): string[] {
  const blob = `${creatorCategory ?? ""} ${(niches ?? []).join(" ")}`.toLowerCase();
  if (/\b(game|gaming|esport|fps|valorant|warzone|fortnite)\b/.test(blob)) {
    return ["hook", "clutch", "peak", "win"];
  }
  if (/\b(food|cook|recipe|kitchen)\b/.test(blob)) {
    return ["hook", "prep", "plating", "taste"];
  }
  if (/\b(travel|tour|vlog)\b/.test(blob)) {
    return ["arrival", "vista", "moment", "close"];
  }
  if (/\b(fit|gym|workout)\b/.test(blob)) {
    return ["hook", "effort", "peak", "finish"];
  }
  if (/\b(podcast|talk|interview)\b/.test(blob)) {
    return ["hook", "point", "punchline", "close"];
  }
  if (/\b(fashion|beauty|style)\b/.test(blob)) {
    return ["hook", "look", "detail", "close"];
  }
  return ["hook", "build", "peak", "close"];
}

export function heuristicHighlightMarkers(
  durationSec: number,
  creatorCategory?: string | null,
  niches?: string[],
): HighlightMarker[] {
  const dur = Math.max(0.5, durationSec);
  const labels = highlightLabelsForNiche(creatorCategory, niches);
  return labels.map((label, i) => ({
    time: Math.round(((i + 1) / (labels.length + 1)) * dur * 10) / 10,
    label,
  }));
}

const BEAT_PURPOSE: Record<string, string> = {
  hook: "Open here — first beat that stops the scroll",
  build: "Keep this rise — energy is climbing",
  peak: "Protect this payoff — the moment people rewind",
  close: "End here — last beat before it goes cold",
  clutch: "Protect this clutch",
  win: "End on the win",
  kill: "Protect this peak hit",
  victory: "End on the victory",
  prep: "Keep the setup",
  plating: "Protect the plate-up",
  taste: "End on the reaction",
  arrival: "Open on arrival",
  vista: "Protect the view",
  moment: "Keep this moment",
  effort: "Keep the work",
  finish: "End on the finish",
  point: "Keep the key point",
  punchline: "Protect the punchline",
  look: "Keep the look",
  detail: "Protect the detail",
};

export function beatPurpose(label: string): string {
  return BEAT_PURPOSE[label.toLowerCase()] ?? "A strong beat — snap a trim handle here";
}

/** Keep from the opening beat through the closing beat, with a small pad. */
export function trimWindowFromBeats(
  markers: HighlightMarker[],
  durationSec: number,
): { start: number; end: number } | null {
  if (!markers.length) return null;
  const dur = Math.max(0.5, durationSec);
  const sorted = [...markers]
    .filter((m) => Number.isFinite(m.time))
    .sort((a, b) => a.time - b.time);
  if (!sorted.length) return null;
  const open =
    sorted.find((m) => /hook|arrival|prep|action_start/i.test(m.label)) ?? sorted[0]!;
  const close =
    [...sorted].reverse().find((m) => /close|win|finish|taste|victory/i.test(m.label)) ??
    sorted[sorted.length - 1]!;
  const pad = Math.min(0.35, dur * 0.04);
  const start = Math.max(0, Math.min(dur - 0.5, open.time - pad));
  const end = Math.min(dur, Math.max(start + 0.8, close.time + pad));
  return { start, end };
}

export function markersInDuration(
  markers: HighlightMarker[],
  durationSec: number,
): HighlightMarker[] {
  const dur = Math.max(0.5, durationSec);
  return markers
    .filter((m) => Number.isFinite(m.time) && m.time >= 0 && m.time <= dur + 0.05)
    .map((m) => ({
      time: Math.min(dur, Math.max(0, Number(m.time))),
      label: String(m.label || "peak").slice(0, 40),
    }));
}
