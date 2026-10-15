import { useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { cn } from "../../lib/utils";
import { Button } from "../../components/ui/button";

export type TimelineEdlItem = {
  id: string;
  type: "original" | "voice" | "foley" | "ambience" | "music";
  startMs: number;
  endMs?: number;
  gainDb: number;
  enabled: boolean;
  metadata?: { text?: string };
};

type Props = {
  durationMs: number;
  items: TimelineEdlItem[];
  disabled?: boolean;
  onChange: (items: TimelineEdlItem[]) => void;
  /** Wider / taller rows when docked under clip preview. */
  comfortable?: boolean;
};

const LAYER_ORDER: TimelineEdlItem["type"][] = [
  "voice",
  "foley",
  "ambience",
  "music",
  "original",
];

const LAYER_LABEL: Record<TimelineEdlItem["type"], string> = {
  voice: "VOICE",
  foley: "FOLEY",
  ambience: "AMBIENCE",
  music: "MUSIC",
  original: "ORIGINAL",
};

/** Lightweight drag-edit timeline for Sound Design EDL regions. */
export function AudioTimelineEditor({
  durationMs,
  items,
  disabled,
  onChange,
  comfortable,
}: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TimelineEdlItem[] | null>(null);
  const widthMs = Math.max(1000, durationMs);
  const view = draft || items;
  const rowH = comfortable ? "h-11" : "h-8";
  const clipH = comfortable ? "top-1.5 h-8" : "top-1 h-6";

  const byLayer = useMemo(() => {
    const map = new Map<TimelineEdlItem["type"], TimelineEdlItem[]>();
    for (const t of LAYER_ORDER) map.set(t, []);
    for (const item of view) {
      const list = map.get(item.type) || [];
      list.push(item);
      map.set(item.type, list);
    }
    return map;
  }, [view]);

  const patchLocal = (id: string, patch: Partial<TimelineEdlItem>) => {
    const next = view.map((it) => (it.id === id ? { ...it, ...patch } : it));
    setDraft(next);
    return next;
  };

  const commit = (next: TimelineEdlItem[]) => {
    setDraft(null);
    onChange(next);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>, id: string) => {
    if (disabled || dragId !== id) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max(0, e.clientX - rect.left), rect.width);
    const startMs = Math.round((x / rect.width) * widthMs);
    patchLocal(id, { startMs });
  };

  return (
    <div
      className={cn(
        "space-y-2 rounded-lg border border-white/10 bg-black/30",
        comfortable ? "p-3 sm:p-4" : "p-2",
      )}
    >
      <div className="text-[10px] uppercase tracking-wide text-white/50">
        Audio timeline — drag clips to retiming · toggle to mute
      </div>
      {LAYER_ORDER.map((layer) => {
        const row = byLayer.get(layer) || [];
        if (!row.length && layer !== "original") return null;
        return (
          <div key={layer} className="space-y-1">
            <div className="font-mono text-[10px] text-white/40">{LAYER_LABEL[layer]}</div>
            <div
              className={cn("relative rounded bg-white/5", rowH)}
              onPointerMove={(e) => dragId && onPointerMove(e, dragId)}
              onPointerUp={() => {
                if (dragId && draft) commit(draft);
                setDragId(null);
              }}
              onPointerLeave={() => {
                if (dragId && draft) commit(draft);
                setDragId(null);
              }}
            >
              {row.map((item) => {
                const left = (item.startMs / widthMs) * 100;
                const spanMs = Math.max(
                  200,
                  (item.endMs ?? item.startMs + (layer === "foley" ? 400 : 2000)) -
                    item.startMs,
                );
                const width = Math.min(100 - left, (spanMs / widthMs) * 100);
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={disabled}
                    title={item.metadata?.text || item.id}
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      setDragId(item.id);
                      setDraft(view);
                    }}
                    className={cn(
                      "absolute truncate rounded px-1.5 text-left text-[10px] text-black",
                      clipH,
                      item.enabled ? "bg-emerald-400/80" : "bg-white/20 text-white/50",
                      dragId === item.id && "ring-2 ring-white",
                    )}
                    style={{ left: `${left}%`, width: `${Math.max(4, width)}%` }}
                  >
                    {item.metadata?.text?.slice(0, comfortable ? 48 : 24) || item.type}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-1">
              {row.map((item) => (
                <Button
                  key={`${item.id}-mute`}
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[10px]"
                  disabled={disabled}
                  onClick={() => {
                    const next = view.map((it) =>
                      it.id === item.id ? { ...it, enabled: !it.enabled } : it,
                    );
                    commit(next);
                  }}
                >
                  {item.enabled ? "Mute" : "Unmute"} {item.type}
                </Button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
