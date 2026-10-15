const PRESETS: Array<{ id: string; name: string; hint: string }> = [
  { id: "live-sports-broadcast", name: "Live Sports Broadcast", hint: "Sports action" },
  { id: "esports-broadcast", name: "Esports Broadcast", hint: "Gaming" },
  { id: "movie-trailer", name: "Movie Trailer", hint: "Dramatic" },
  { id: "documentary", name: "Documentary", hint: "Observational" },
  { id: "breaking-news", name: "Breaking News", hint: "Reportage" },
  { id: "event-highlight", name: "Event Highlight", hint: "Summit / demo / conference" },
  { id: "comedy-commentary", name: "Comedy Commentary", hint: "Reactive humor" },
  { id: "travel-documentary", name: "Travel Documentary", hint: "Travel / outdoor" },
  { id: "cinematic-story", name: "Cinematic Story", hint: "Narrative" },
  { id: "product-commercial", name: "Product Commercial", hint: "Product demo" },
  { id: "natural-enhancement", name: "Natural Enhancement", hint: "Light touch" },
];

type Props = {
  disabled?: boolean;
  busy?: boolean;
  /** When true, presets are locked until Analyze completes. */
  lockedUntilAnalyze?: boolean;
  suggestedIds?: string[];
  lastPresetId?: string | null;
  onSelect: (presetId: string) => void;
};

export function ReimaginePresets({
  disabled,
  busy,
  lockedUntilAnalyze,
  suggestedIds = [],
  lastPresetId,
  onSelect,
}: Props) {
  const locked = Boolean(lockedUntilAnalyze);
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-xs font-medium text-white/80">Creative leap · Reimagine as…</div>
        {locked ? (
          <span className="text-[10px] text-amber-200/80">Analyze first</span>
        ) : suggestedIds.length ? (
          <span className="text-[10px] text-emerald-300/80">Best match for this clip</span>
        ) : null}
      </div>
      <p className="text-[11px] text-white/45">
        Full package in one tap. Prefer highlighted chips. Not the same as Advanced mode chips
        (Auto / Broadcast / …).
      </p>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => {
          const suggested = suggestedIds.includes(p.id);
          const selected = lastPresetId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={disabled || busy || locked}
              title={locked ? "Run Analyze first" : p.hint}
              onClick={() => onSelect(p.id)}
              className={
                selected
                  ? "rounded-full bg-emerald-500/90 px-2.5 py-1 text-[11px] text-black disabled:opacity-40"
                  : suggested
                    ? "rounded-full bg-emerald-500/25 px-2.5 py-1 text-[11px] text-emerald-100 ring-1 ring-emerald-400/40 hover:bg-emerald-500/40 disabled:opacity-40"
                    : "rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/85 hover:bg-emerald-500/30 disabled:opacity-40"
              }
            >
              {p.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Highlight presets that match analyze recommendation / context. */
export function suggestReimaginePresets(input: {
  suggestedMode?: string | null;
  creatorContext?: string;
  summary?: string;
}): string[] {
  const text = `${input.creatorContext || ""} ${input.summary || ""}`.toLowerCase();
  const mode = input.suggestedMode || "auto";
  const ids: string[] = [];

  if (/sport|cricket|football|soccer|match|stadium/i.test(text) || mode === "broadcast") {
    ids.push("live-sports-broadcast");
  }
  if (/esport|gaming|gameplay|controller/i.test(text) || mode === "energetic") {
    ids.push("esports-broadcast");
  }
  if (/aws|summit|conference|event|demo|keynote|booth|showcase/i.test(text)) {
    ids.push("event-highlight", "product-commercial");
  }
  if (/travel|street|city|outdoor|trip/i.test(text)) {
    ids.push("travel-documentary");
  }
  if (/food|cook|kitchen|recipe/i.test(text)) {
    ids.push("natural-enhancement");
  }
  if (mode === "comedy" || /comedy|funny|laugh/i.test(text)) {
    ids.push("comedy-commentary");
  }
  if (mode === "cinematic") {
    ids.push("cinematic-story", "documentary", "event-highlight");
  }
  if (mode === "natural") {
    ids.push("natural-enhancement");
  }
  if (!ids.length) {
    ids.push("event-highlight", "natural-enhancement", "documentary");
  }
  return [...new Set(ids)].slice(0, 4);
}
