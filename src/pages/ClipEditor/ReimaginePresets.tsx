const PRESETS: Array<{ id: string; name: string }> = [
  { id: "live-sports-broadcast", name: "Live Sports Broadcast" },
  { id: "esports-broadcast", name: "Esports Broadcast" },
  { id: "movie-trailer", name: "Movie Trailer" },
  { id: "documentary", name: "Documentary" },
  { id: "breaking-news", name: "Breaking News" },
  { id: "event-highlight", name: "Event Highlight" },
  { id: "comedy-commentary", name: "Comedy Commentary" },
  { id: "travel-documentary", name: "Travel Documentary" },
  { id: "cinematic-story", name: "Cinematic Story" },
  { id: "product-commercial", name: "Product Commercial" },
  { id: "natural-enhancement", name: "Natural Enhancement" },
];

type Props = {
  disabled?: boolean;
  busy?: boolean;
  onSelect: (presetId: string) => void;
};

export function ReimaginePresets({ disabled, busy, onSelect }: Props) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-white/80">Reimagine this clip as…</div>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={disabled || busy}
            onClick={() => onSelect(p.id)}
            className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/85 hover:bg-emerald-500/30 disabled:opacity-40"
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
