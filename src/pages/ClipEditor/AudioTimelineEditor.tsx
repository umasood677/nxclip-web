import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "../../lib/utils";

export type TimelineEdlItem = {
  id: string;
  type: "original" | "voice" | "foley" | "ambience" | "music";
  startMs: number;
  endMs?: number;
  gainDb: number;
  enabled: boolean;
  /** Kept so Review edits do not strip TTS/Foley refs before Final Render. */
  assetId?: string;
  sourceUrl?: string;
  metadata?: { text?: string; type?: string };
};

type Props = {
  durationMs: number;
  items: TimelineEdlItem[];
  disabled?: boolean;
  onChange: (items: TimelineEdlItem[]) => void;
  /** Wider dock under trim timeline. */
  comfortable?: boolean;
};

const LAYER_ORDER: TimelineEdlItem["type"][] = [
  "voice",
  "foley",
  "ambience",
  "music",
  "original",
];

/** Layers controlled by a left→right gain slider (not position drag). */
const GAIN_LAYERS = new Set<TimelineEdlItem["type"]>(["ambience", "original"]);

const GAIN_MIN_DB = -24;
const GAIN_MAX_DB = 6;

const LAYER_LABEL: Record<TimelineEdlItem["type"], string> = {
  voice: "VO",
  foley: "SFX",
  ambience: "AMB",
  music: "BGM",
  original: "SRC",
};

const LAYER_TONE: Record<
  TimelineEdlItem["type"],
  { lane: string; clip: string; muted: string; ruler: string; fill: string }
> = {
  voice: {
    lane: "bg-sky-500/10",
    clip: "bg-sky-400/90 text-sky-950 border-sky-200/40",
    muted: "bg-sky-500/20 text-sky-200/50 border-sky-500/20",
    ruler: "text-sky-300/80",
    fill: "bg-sky-400",
  },
  foley: {
    lane: "bg-amber-500/10",
    clip: "bg-amber-400/90 text-amber-950 border-amber-200/40",
    muted: "bg-amber-500/20 text-amber-200/50 border-amber-500/20",
    ruler: "text-amber-300/80",
    fill: "bg-amber-400",
  },
  ambience: {
    lane: "bg-teal-500/10",
    clip: "bg-teal-400/85 text-teal-950 border-teal-200/40",
    muted: "bg-teal-500/20 text-teal-200/50 border-teal-500/20",
    ruler: "text-teal-300/80",
    fill: "bg-teal-400",
  },
  music: {
    lane: "bg-violet-500/10",
    clip: "bg-violet-400/85 text-violet-950 border-violet-200/40",
    muted: "bg-violet-500/20 text-violet-200/50 border-violet-500/20",
    ruler: "text-violet-300/80",
    fill: "bg-violet-400",
  },
  original: {
    lane: "bg-zinc-500/10",
    clip: "bg-zinc-400/70 text-zinc-950 border-zinc-200/30",
    muted: "bg-zinc-500/20 text-zinc-300/40 border-zinc-500/20",
    ruler: "text-zinc-400/80",
    fill: "bg-zinc-300",
  },
};

function formatClock(ms: number): string {
  const s = Math.max(0, ms) / 1000;
  const m = Math.floor(s / 60);
  const rem = s - m * 60;
  return `${m}:${rem.toFixed(1).padStart(4, "0")}`;
}

function formatGain(db: number): string {
  const rounded = Math.round(db * 10) / 10;
  if (rounded > 0) return `+${rounded.toFixed(1)} dB`;
  return `${rounded.toFixed(1)} dB`;
}

function gainToPct(gainDb: number): number {
  const clamped = Math.min(GAIN_MAX_DB, Math.max(GAIN_MIN_DB, gainDb));
  return ((clamped - GAIN_MIN_DB) / (GAIN_MAX_DB - GAIN_MIN_DB)) * 100;
}

function pctToGain(pct: number): number {
  const t = Math.min(1, Math.max(0, pct / 100));
  const raw = GAIN_MIN_DB + t * (GAIN_MAX_DB - GAIN_MIN_DB);
  return Math.round(raw * 2) / 2; // 0.5 dB steps
}

function clipLabel(item: TimelineEdlItem): string {
  if (item.type === "voice" && item.metadata?.text?.trim()) {
    return item.metadata.text.trim();
  }
  if (item.type === "foley") {
    const kind = item.metadata?.type || item.assetId || "foley";
    return String(kind).replace(/[-_]/g, " ");
  }
  if (item.type === "ambience") {
    return String(item.metadata?.type || item.assetId || "ambience").replace(/[-_]/g, " ");
  }
  if (item.type === "music") return item.assetId || "music";
  return "original";
}

function defaultSpanMs(type: TimelineEdlItem["type"]): number {
  if (type === "foley") return 450;
  if (type === "voice") return 2200;
  if (type === "ambience" || type === "music" || type === "original") return 4000;
  return 1200;
}

type GainBarProps = {
  item: TimelineEdlItem;
  disabled?: boolean;
  tone: (typeof LAYER_TONE)[TimelineEdlItem["type"]];
  comfortable?: boolean;
  onGainLive: (id: string, gainDb: number) => void;
  onGainCommit: (id: string, gainDb: number) => void;
  onToggleMute: (id: string) => void;
};

/** Left = quieter, right = louder — fill + handle make direction obvious. */
function GainLevelBar({
  item,
  disabled,
  tone,
  comfortable,
  onGainLive,
  onGainCommit,
  onToggleMute,
}: GainBarProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const pct = gainToPct(item.gainDb);

  const readGainFromEvent = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return item.gainDb;
    const rect = el.getBoundingClientRect();
    const x = Math.min(Math.max(0, clientX - rect.left), rect.width);
    return pctToGain((x / Math.max(1, rect.width)) * 100);
  };

  return (
    <div
      className={cn(
        "absolute inset-y-1 left-2 right-2 flex items-center gap-2 rounded border px-2",
        item.enabled ? "border-white/15 bg-black/35" : "border-white/10 bg-black/20 opacity-60",
      )}
    >
      <span
        className={cn(
          "shrink-0 font-mono text-[9px] font-semibold tabular-nums",
          tone.ruler,
          comfortable ? "w-14" : "w-12",
        )}
        title="Volume (left quieter · right louder)"
      >
        {formatGain(item.gainDb)}
      </span>

      <div className="relative min-w-0 flex-1">
        <div className="mb-0.5 flex justify-between font-mono text-[8px] text-white/30">
          <span>− quieter</span>
          <span>louder +</span>
        </div>
        <div
          ref={trackRef}
          role="slider"
          aria-valuemin={GAIN_MIN_DB}
          aria-valuemax={GAIN_MAX_DB}
          aria-valuenow={item.gainDb}
          aria-label={`${item.type} volume`}
          tabIndex={disabled ? -1 : 0}
          className={cn(
            "relative h-3.5 touch-none rounded-full bg-white/10",
            disabled ? "cursor-not-allowed opacity-50" : "cursor-ew-resize",
          )}
          onPointerDown={(e) => {
            if (disabled) return;
            e.preventDefault();
            e.stopPropagation();
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            setDragging(true);
            onGainLive(item.id, readGainFromEvent(e.clientX));
          }}
          onPointerMove={(e) => {
            if (!dragging || disabled) return;
            onGainLive(item.id, readGainFromEvent(e.clientX));
          }}
          onPointerUp={(e) => {
            if (!dragging) return;
            setDragging(false);
            onGainCommit(item.id, readGainFromEvent(e.clientX));
          }}
          onPointerCancel={() => setDragging(false)}
          onKeyDown={(e) => {
            if (disabled) return;
            const step = e.shiftKey ? 2 : 0.5;
            if (e.key === "ArrowRight" || e.key === "ArrowUp") {
              e.preventDefault();
              const next = Math.min(GAIN_MAX_DB, item.gainDb + step);
              onGainCommit(item.id, next);
            } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
              e.preventDefault();
              const next = Math.max(GAIN_MIN_DB, item.gainDb - step);
              onGainCommit(item.id, next);
            }
          }}
        >
          {/* Fill grows left → right as volume increases */}
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full opacity-90",
              item.enabled ? tone.fill : "bg-white/25",
            )}
            style={{ width: `${pct}%` }}
          />
          {/* Tiny handle at the loudness edge */}
          <div
            className={cn(
              "absolute top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-emerald-300 shadow",
              "ring-1 ring-black/40",
              dragging && "scale-110 bg-white",
            )}
            style={{ left: `${pct}%` }}
            aria-hidden
          >
            <span className="absolute inset-[3px] rounded-full bg-black/25" />
          </div>
        </div>
      </div>

      <button
        type="button"
        disabled={disabled}
        title={item.enabled ? "Mute" : "Unmute"}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-white/45 hover:bg-white/10 hover:text-white disabled:opacity-40"
        onClick={(e) => {
          e.stopPropagation();
          onToggleMute(item.id);
        }}
      >
        {item.enabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
      </button>
    </div>
  );
}

/** Multi-track sound timeline — compact video-editor style lanes. */
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
  const labelW = comfortable ? "w-14" : "w-11";
  const rowH = comfortable ? "h-11" : "h-10";

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

  const ticks = useMemo(() => {
    // Fewer labels so they don't smash together on narrow docks.
    const count = comfortable ? 4 : 3;
    return Array.from({ length: count + 1 }, (_, i) => (widthMs * i) / count);
  }, [widthMs, comfortable]);

  const patchLocal = (id: string, patch: Partial<TimelineEdlItem>) => {
    const next = view.map((it) => (it.id === id ? { ...it, ...patch } : it));
    setDraft(next);
    return next;
  };

  const commit = (next: TimelineEdlItem[]) => {
    setDraft(null);
    onChange(next);
  };

  const commitGain = (id: string, gainDb: number) => {
    const next = view.map((it) => (it.id === id ? { ...it, gainDb } : it));
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

  const activeLayers = LAYER_ORDER.filter((layer) => {
    const row = byLayer.get(layer) || [];
    return row.length > 0 || layer === "original";
  });

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-[#0c0e12] shadow-inner">
      {/* Time ruler */}
      <div className="flex border-b border-white/10 bg-black/40">
        <div
          className={cn(
            "shrink-0 border-r border-white/10 px-1.5 py-1 font-mono text-[9px] text-white/35",
            labelW,
          )}
        >
          TIME
        </div>
        <div className="relative min-h-[22px] flex-1 overflow-hidden px-0.5">
          {ticks.map((ms, i) => {
            const isFirst = i === 0;
            const isLast = i === ticks.length - 1;
            const pct = (i / (ticks.length - 1)) * 100;
            return (
              <span
                key={ms}
                className={cn(
                  "absolute top-0.5 font-mono text-[9px] tabular-nums text-white/40",
                  isFirst && "left-0",
                  isLast && "right-0",
                  !isFirst && !isLast && "-translate-x-1/2",
                )}
                style={
                  !isFirst && !isLast
                    ? { left: `${pct}%` }
                    : isLast
                      ? { right: 0 }
                      : { left: 0 }
                }
              >
                {formatClock(ms)}
              </span>
            );
          })}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between px-0"
            aria-hidden
          >
            {ticks.map((ms) => (
              <span key={`t-${ms}`} className="h-1.5 w-px bg-white/20" />
            ))}
          </div>
        </div>
      </div>

      <div className="divide-y divide-white/5">
        {activeLayers.map((layer) => {
          const row = byLayer.get(layer) || [];
          const tone = LAYER_TONE[layer];
          const layerMuted = row.length > 0 && row.every((it) => !it.enabled);
          const isGainLayer = GAIN_LAYERS.has(layer);

          return (
            <div key={layer} className="flex items-stretch">
              <div
                className={cn(
                  "flex shrink-0 flex-col items-stretch justify-center gap-0.5 border-r border-white/10 px-1 py-1",
                  labelW,
                  tone.lane,
                )}
              >
                <span className={cn("text-center font-mono text-[9px] font-bold", tone.ruler)}>
                  {LAYER_LABEL[layer]}
                </span>
                {row.length > 0 ? (
                  <button
                    type="button"
                    disabled={disabled}
                    title={layerMuted ? "Unmute layer" : "Mute layer"}
                    className="mx-auto flex h-5 w-5 items-center justify-center rounded text-white/45 hover:bg-white/10 hover:text-white disabled:opacity-40"
                    onClick={() => {
                      const enable = layerMuted;
                      commit(
                        view.map((it) =>
                          it.type === layer ? { ...it, enabled: enable } : it,
                        ),
                      );
                    }}
                  >
                    {layerMuted ? (
                      <VolumeX className="h-3 w-3" />
                    ) : (
                      <Volume2 className="h-3 w-3" />
                    )}
                  </button>
                ) : null}
              </div>

              <div
                className={cn(
                  "relative min-w-0 flex-1",
                  isGainLayer
                    ? row.length > 1
                      ? "min-h-[4.5rem]"
                      : comfortable
                        ? "h-12"
                        : "h-11"
                    : rowH,
                  tone.lane,
                )}
                onPointerMove={(e) => {
                  if (!isGainLayer && dragId) onPointerMove(e, dragId);
                }}
                onPointerUp={() => {
                  if (isGainLayer) return;
                  if (dragId && draft) commit(draft);
                  setDragId(null);
                }}
                onPointerLeave={() => {
                  if (isGainLayer) return;
                  if (dragId && draft) commit(draft);
                  setDragId(null);
                }}
              >
                {!isGainLayer && (
                  <div
                    className="pointer-events-none absolute inset-0 opacity-40"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(90deg, transparent, transparent calc(12.5% - 1px), rgba(255,255,255,0.06) 12.5%)",
                    }}
                  />
                )}

                {isGainLayer
                  ? (
                      <div
                        className={cn(
                          "absolute inset-0 flex flex-col justify-center gap-1 py-0.5",
                          row.length > 1 && "py-1",
                        )}
                      >
                        {(row.length
                          ? row
                          : [
                              {
                                id: `ed-${layer}-placeholder`,
                                type: layer,
                                startMs: 0,
                                endMs: widthMs,
                                gainDb: 0,
                                enabled: true,
                              } as TimelineEdlItem,
                            ]
                        ).map((item) => (
                          <div key={item.id} className="relative h-9 w-full shrink-0">
                            <GainLevelBar
                              item={item}
                              disabled={disabled || item.id.includes("placeholder")}
                              tone={tone}
                              comfortable={comfortable}
                              onGainLive={(id, gainDb) => {
                                setDraft(
                                  view.map((it) =>
                                    it.id === id ? { ...it, gainDb } : it,
                                  ),
                                );
                              }}
                              onGainCommit={commitGain}
                              onToggleMute={(id) =>
                                commit(
                                  view.map((it) =>
                                    it.id === id ? { ...it, enabled: !it.enabled } : it,
                                  ),
                                )
                              }
                            />
                          </div>
                        ))}
                      </div>
                    )
                  : row.map((item) => {
                      const left = (item.startMs / widthMs) * 100;
                      const spanMs = Math.max(
                        180,
                        (item.endMs ?? item.startMs + defaultSpanMs(layer)) - item.startMs,
                      );
                      const widthPct = Math.min(100 - left, (spanMs / widthMs) * 100);
                      const label = clipLabel(item);
                      const minW = item.type === "voice" ? 12 : item.type === "foley" ? 7 : 8;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={disabled}
                          title={`${label} · ${formatClock(item.startMs)}${
                            item.endMs != null ? `–${formatClock(item.endMs)}` : ""
                          } · drag to move`}
                          onPointerDown={(e) => {
                            e.currentTarget.setPointerCapture(e.pointerId);
                            setDragId(item.id);
                            setDraft(view);
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            if (disabled) return;
                            commit(
                              view.map((it) =>
                                it.id === item.id ? { ...it, enabled: !it.enabled } : it,
                              ),
                            );
                          }}
                          className={cn(
                            "absolute top-1 bottom-1 overflow-hidden rounded border px-1.5 text-left shadow-sm transition-[box-shadow,opacity]",
                            "cursor-grab active:cursor-grabbing",
                            item.enabled ? tone.clip : tone.muted,
                            dragId === item.id && "z-10 ring-2 ring-white/70 shadow-md",
                            !item.enabled && "opacity-55",
                          )}
                          style={{
                            left: `${left}%`,
                            width: `${Math.max(minW, widthPct)}%`,
                          }}
                        >
                          <span
                            className={cn(
                              "block truncate font-medium leading-tight",
                              comfortable ? "text-[11px]" : "text-[10px]",
                              item.type === "voice" && "whitespace-normal line-clamp-2",
                            )}
                          >
                            {label}
                          </span>
                        </button>
                      );
                    })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="border-t border-white/5 px-2 py-1 text-[9px] text-white/35">
        VO/SFX: drag to retime · AMB/SRC: drag handle right = louder, left = quieter · Save &amp;
        Render for Final Preview
      </p>
    </div>
  );
}
