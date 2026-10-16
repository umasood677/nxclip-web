import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { GripVertical, Volume2, VolumeX } from "lucide-react";
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

const GAIN_LAYERS = new Set<TimelineEdlItem["type"]>(["ambience", "original"]);

const GAIN_MIN_DB = -24;
const GAIN_MAX_DB = 6;

const LAYER_META: Record<
  TimelineEdlItem["type"],
  { short: string; name: string; accent: string; clip: string; muted: string; fill: string }
> = {
  voice: {
    short: "VO",
    name: "Commentary",
    accent: "bg-sky-400",
    clip: "bg-gradient-to-b from-sky-300 to-sky-500 text-sky-950 border-sky-200/50",
    muted: "bg-sky-950/80 text-sky-200/40 border-sky-800/40",
    fill: "bg-sky-400",
  },
  foley: {
    short: "SFX",
    name: "Foley",
    accent: "bg-amber-400",
    clip: "bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950 border-amber-200/50",
    muted: "bg-amber-950/80 text-amber-200/40 border-amber-800/40",
    fill: "bg-amber-400",
  },
  ambience: {
    short: "AMB",
    name: "Ambience",
    accent: "bg-teal-400",
    clip: "bg-gradient-to-b from-teal-300 to-teal-500 text-teal-950 border-teal-200/40",
    muted: "bg-teal-950/80 text-teal-200/40 border-teal-800/40",
    fill: "bg-teal-400",
  },
  music: {
    short: "BGM",
    name: "Music",
    accent: "bg-violet-400",
    clip: "bg-gradient-to-b from-violet-300 to-violet-500 text-violet-950 border-violet-200/40",
    muted: "bg-violet-950/80 text-violet-200/40 border-violet-800/40",
    fill: "bg-violet-400",
  },
  original: {
    short: "SRC",
    name: "Original",
    accent: "bg-zinc-300",
    clip: "bg-gradient-to-b from-zinc-300 to-zinc-500 text-zinc-950 border-zinc-200/40",
    muted: "bg-zinc-900/80 text-zinc-400/50 border-zinc-700/40",
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
  if (rounded > 0) return `+${rounded.toFixed(1)}`;
  return `${rounded.toFixed(1)}`;
}

function gainToPct(gainDb: number): number {
  const clamped = Math.min(GAIN_MAX_DB, Math.max(GAIN_MIN_DB, gainDb));
  return ((clamped - GAIN_MIN_DB) / (GAIN_MAX_DB - GAIN_MIN_DB)) * 100;
}

function pctToGain(pct: number): number {
  const t = Math.min(1, Math.max(0, pct / 100));
  const raw = GAIN_MIN_DB + t * (GAIN_MAX_DB - GAIN_MIN_DB);
  return Math.round(raw * 2) / 2;
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
  fill: string;
  onGainLive: (id: string, gainDb: number) => void;
  onGainCommit: (id: string, gainDb: number) => void;
  onToggleMute: (id: string) => void;
};

function GainLevelBar({
  item,
  disabled,
  fill,
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
        "absolute inset-y-1.5 left-3 right-3 flex items-center gap-3 rounded-lg border px-3",
        item.enabled
          ? "border-white/12 bg-black/40"
          : "border-white/8 bg-black/25 opacity-55",
      )}
    >
      <span className="w-12 shrink-0 font-mono text-[10px] font-semibold tabular-nums text-white/70">
        {formatGain(item.gainDb)}
        <span className="ml-0.5 text-white/35">dB</span>
      </span>

      <div className="relative min-w-0 flex-1">
        <div
          ref={trackRef}
          role="slider"
          aria-valuemin={GAIN_MIN_DB}
          aria-valuemax={GAIN_MAX_DB}
          aria-valuenow={item.gainDb}
          aria-label={`${item.type} volume`}
          tabIndex={disabled ? -1 : 0}
          className={cn(
            "relative h-2.5 touch-none rounded-full bg-white/10",
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
              onGainCommit(item.id, Math.min(GAIN_MAX_DB, item.gainDb + step));
            } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
              e.preventDefault();
              onGainCommit(item.id, Math.max(GAIN_MIN_DB, item.gainDb - step));
            }
          }}
        >
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full opacity-95",
              item.enabled ? fill : "bg-white/20",
            )}
            style={{ width: `${pct}%` }}
          />
          <div
            className={cn(
              "absolute top-1/2 z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white shadow-md",
              dragging && "scale-110",
            )}
            style={{ left: `${pct}%` }}
            aria-hidden
          />
        </div>
        <div className="mt-1 flex justify-between text-[8px] uppercase tracking-wide text-white/25">
          <span>Quiet</span>
          <span>Loud</span>
        </div>
      </div>

      <button
        type="button"
        disabled={disabled}
        title={item.enabled ? "Mute" : "Unmute"}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/50 hover:bg-white/10 hover:text-white disabled:opacity-40"
        onClick={(e) => {
          e.stopPropagation();
          onToggleMute(item.id);
        }}
      >
        {item.enabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

/** Multi-track sound timeline — editor-style lanes under trim. */
export function AudioTimelineEditor({
  durationMs,
  items,
  disabled,
  onChange,
  comfortable,
}: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TimelineEdlItem[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const widthMs = Math.max(1000, durationMs);
  const view = draft || items;
  const railW = comfortable ? "w-[5.5rem]" : "w-[4.75rem]";
  const rowH = comfortable ? "h-14" : "h-12";

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
    const count = comfortable ? 5 : 4;
    return Array.from({ length: count + 1 }, (_, i) => (widthMs * i) / count);
  }, [widthMs, comfortable]);

  const selected = useMemo(
    () => (selectedId ? view.find((it) => it.id === selectedId) : undefined),
    [selectedId, view],
  );

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

  const layerCounts = useMemo(() => {
    const c = { voice: 0, foley: 0, ambience: 0, music: 0, original: 0 };
    for (const it of view) c[it.type] += 1;
    return c;
  }, [view]);

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0a0c10] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      {/* Layer chips + duration */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 bg-black/50 px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {(["voice", "foley", "ambience", "original"] as const).map((t) => {
            const n = layerCounts[t];
            if (t !== "original" && n === 0) return null;
            const meta = LAYER_META[t];
            return (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/70"
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", meta.accent)} />
                {meta.name}
                <span className="font-mono text-white/40">{n || (t === "original" ? 1 : 0)}</span>
              </span>
            );
          })}
        </div>
        <span className="font-mono text-[10px] tabular-nums text-white/40">
          {formatClock(0)} – {formatClock(widthMs)}
        </span>
      </div>

      {/* Time ruler */}
      <div className="flex border-b border-white/8 bg-black/30">
        <div
          className={cn(
            "shrink-0 border-r border-white/8 px-2 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-white/30",
            railW,
          )}
        >
          Time
        </div>
        <div className="relative min-h-[26px] flex-1 overflow-hidden px-1">
          {ticks.map((ms, i) => {
            const isFirst = i === 0;
            const isLast = i === ticks.length - 1;
            const pct = (i / (ticks.length - 1)) * 100;
            return (
              <span
                key={ms}
                className={cn(
                  "absolute top-1 font-mono text-[10px] tabular-nums text-white/45",
                  isFirst && "left-1",
                  isLast && "right-1",
                  !isFirst && !isLast && "-translate-x-1/2",
                )}
                style={
                  !isFirst && !isLast
                    ? { left: `${pct}%` }
                    : isLast
                      ? { right: 4 }
                      : { left: 4 }
                }
              >
                {formatClock(ms)}
              </span>
            );
          })}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between px-1"
            aria-hidden
          >
            {ticks.map((ms) => (
              <span key={`t-${ms}`} className="h-2 w-px bg-white/25" />
            ))}
          </div>
        </div>
      </div>

      <div className="divide-y divide-white/[0.06]">
        {activeLayers.map((layer) => {
          const row = byLayer.get(layer) || [];
          const meta = LAYER_META[layer];
          const layerMuted = row.length > 0 && row.every((it) => !it.enabled);
          const isGainLayer = GAIN_LAYERS.has(layer);

          return (
            <div key={layer} className="flex items-stretch">
              <div
                className={cn(
                  "relative flex shrink-0 flex-col justify-center gap-1 border-r border-white/8 px-2 py-2",
                  railW,
                  "bg-black/25",
                )}
              >
                <span
                  className={cn("absolute inset-y-2 left-0 w-0.5 rounded-full", meta.accent)}
                  aria-hidden
                />
                <div className="pl-1.5">
                  <p className="text-[10px] font-semibold leading-none text-white/85">
                    {meta.name}
                  </p>
                  <p className="mt-0.5 font-mono text-[9px] text-white/35">
                    {meta.short}
                    {row.length > 0 ? ` · ${row.length}` : ""}
                  </p>
                </div>
                {row.length > 0 ? (
                  <button
                    type="button"
                    disabled={disabled}
                    title={layerMuted ? "Unmute layer" : "Mute layer"}
                    className="ml-1.5 flex h-6 w-6 items-center justify-center rounded-md text-white/40 hover:bg-white/10 hover:text-white disabled:opacity-40"
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
                      ? "min-h-[5.5rem]"
                      : comfortable
                        ? "h-[3.75rem]"
                        : "h-14"
                    : rowH,
                  "bg-[#0c0f14]",
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
                    className="pointer-events-none absolute inset-0 opacity-50"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(90deg, transparent, transparent calc(20% - 1px), rgba(255,255,255,0.04) 20%)",
                    }}
                  />
                )}

                {isGainLayer ? (
                  <div
                    className={cn(
                      "absolute inset-0 flex flex-col justify-center gap-1",
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
                      <div key={item.id} className="relative h-11 w-full shrink-0">
                        <GainLevelBar
                          item={item}
                          disabled={disabled || item.id.includes("placeholder")}
                          fill={meta.fill}
                          onGainLive={(id, gainDb) => {
                            setDraft(
                              view.map((it) => (it.id === id ? { ...it, gainDb } : it)),
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
                ) : (
                  row.map((item) => {
                    const left = (item.startMs / widthMs) * 100;
                    const spanMs = Math.max(
                      180,
                      (item.endMs ?? item.startMs + defaultSpanMs(layer)) - item.startMs,
                    );
                    const widthPct = Math.min(100 - left, (spanMs / widthMs) * 100);
                    const label = clipLabel(item);
                    const isFoley = item.type === "foley";
                    const minW = isFoley ? 5 : item.type === "voice" ? 10 : 8;
                    const isSelected = selectedId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={disabled}
                        title={`${label} · ${formatClock(item.startMs)}${
                          item.endMs != null ? `–${formatClock(item.endMs)}` : ""
                        } · drag to move · double-click mute`}
                        onPointerDown={(e) => {
                          e.currentTarget.setPointerCapture(e.pointerId);
                          setDragId(item.id);
                          setSelectedId(item.id);
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
                          "absolute top-1.5 bottom-1.5 overflow-hidden rounded-md border text-left shadow-sm transition-[box-shadow,transform,opacity]",
                          "cursor-grab active:cursor-grabbing",
                          item.enabled ? meta.clip : meta.muted,
                          isSelected && "z-10 ring-2 ring-white/80",
                          dragId === item.id && "z-20 scale-[1.02] shadow-lg",
                          !item.enabled && "opacity-50",
                          isFoley && "px-1",
                          !isFoley && "px-2",
                        )}
                        style={{
                          left: `${left}%`,
                          width: `${Math.max(minW, widthPct)}%`,
                        }}
                      >
                        <span className="flex h-full items-center gap-1">
                          {!isFoley ? (
                            <GripVertical className="h-3 w-3 shrink-0 opacity-40" />
                          ) : null}
                          <span
                            className={cn(
                              "min-w-0 font-semibold leading-tight",
                              comfortable ? "text-[11px]" : "text-[10px]",
                              item.type === "voice" && "line-clamp-2 whitespace-normal",
                              isFoley && "truncate text-[9px]",
                            )}
                          >
                            {label}
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selected && !GAIN_LAYERS.has(selected.type) ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/8 bg-black/40 px-3 py-2 text-[10px] text-white/55">
          <span className="font-semibold text-white/80">{clipLabel(selected)}</span>
          <span className="font-mono tabular-nums text-white/40">
            {formatClock(selected.startMs)}
            {selected.endMs != null ? ` → ${formatClock(selected.endMs)}` : ""}
          </span>
          <span className={selected.enabled ? "text-emerald-300/80" : "text-amber-300/80"}>
            {selected.enabled ? "Audible" : "Muted"}
          </span>
          <span className="text-white/30">Drag to retime · Double-click to mute</span>
        </div>
      ) : (
        <p className="border-t border-white/8 px-3 py-1.5 text-[9px] text-white/30">
          Commentary &amp; Foley: drag to retime · Original &amp; Ambience: use the level slider ·
          Save &amp; Render for Final Preview
        </p>
      )}
    </div>
  );
}
