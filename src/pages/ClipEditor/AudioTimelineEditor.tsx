import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { GripVertical, Pause, Play, Volume2, VolumeX } from "lucide-react";
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
  /** Clip currently playing via the note preview control. */
  previewingId?: string | null;
  /** Play / stop commentary or Foley for a single timeline note. */
  onPreviewClip?: (item: TimelineEdlItem) => void;
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

/** Full text / name — tooltips + selected detail row. */
function clipDetailLabel(item: TimelineEdlItem): string {
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

/** Compact chip on the note itself (notes are too narrow for full commentary). */
function clipShortLabel(item: TimelineEdlItem, indexInLayer: number): string {
  if (item.type === "voice") {
    const text = item.metadata?.text?.trim() || "";
    if (!text) return `VO ${indexInLayer + 1}`;
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length <= 3) return words.join(" ");
    return `${words.slice(0, 3).join(" ")}…`;
  }
  if (item.type === "foley") {
    const kind = String(item.metadata?.type || item.assetId || "sfx")
      .replace(/[-_]/g, " ")
      .trim();
    const words = kind.split(/\s+/).filter(Boolean);
    if (words.length <= 2) return words.join(" ") || `SFX ${indexInLayer + 1}`;
    return `${words.slice(0, 2).join(" ")}…`;
  }
  return clipDetailLabel(item);
}

function hasPlayableHint(item: TimelineEdlItem): boolean {
  if (item.type === "voice") {
    return Boolean(item.sourceUrl && /^https?:\/\//i.test(item.sourceUrl));
  }
  if (item.type === "foley") {
    return Boolean(item.assetId || item.metadata?.type || item.sourceUrl);
  }
  return true;
}

function defaultSpanMs(type: TimelineEdlItem["type"]): number {
  if (type === "foley") return 450;
  if (type === "voice") return 2200;
  if (type === "ambience" || type === "music" || type === "original") return 4000;
  return 1200;
}

/** Keep clip length when retiming so commentary is not crushed near the keep-window end. */
function itemSpanMs(item: TimelineEdlItem): number {
  const fallback = defaultSpanMs(item.type);
  if (typeof item.endMs === "number" && Number.isFinite(item.endMs)) {
    return Math.max(180, item.endMs - item.startMs);
  }
  return fallback;
}

function fitStartForSpan(startMs: number, spanMs: number, widthMs: number): {
  startMs: number;
  endMs: number;
  clipped: boolean;
} {
  const span = Math.max(180, spanMs);
  let start = Math.max(0, Math.round(startMs));
  let end = start + span;
  let clipped = false;
  if (end > widthMs) {
    start = Math.max(0, widthMs - span);
    end = start + span;
    if (end > widthMs) {
      end = widthMs;
      clipped = true;
    }
  }
  return { startMs: start, endMs: end, clipped };
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
  previewingId,
  onPreviewClip,
}: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TimelineEdlItem[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dragSpanRef = useRef(0);
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
    const rawStart = Math.round((x / rect.width) * widthMs);
    const span = dragSpanRef.current || 180;
    const fitted = fitStartForSpan(rawStart, span, widthMs);
    patchLocal(id, { startMs: fitted.startMs, endMs: fitted.endMs });
  };

  const commitSelectedStartSec = (rawSec: string) => {
    if (!selected || disabled) return;
    const sec = Number(rawSec);
    if (!Number.isFinite(sec)) return;
    const span = itemSpanMs(selected);
    const fitted = fitStartForSpan(Math.round(sec * 1000), span, widthMs);
    commit(
      view.map((it) =>
        it.id === selected.id
          ? { ...it, startMs: fitted.startMs, endMs: fitted.endMs }
          : it,
      ),
    );
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
                  row.map((item, rowIndex) => {
                    const left = (item.startMs / widthMs) * 100;
                    const spanMs = Math.max(
                      180,
                      (item.endMs ?? item.startMs + defaultSpanMs(layer)) - item.startMs,
                    );
                    const widthPct = Math.min(100 - left, (spanMs / widthMs) * 100);
                    const detail = clipDetailLabel(item);
                    const short = clipShortLabel(item, rowIndex);
                    const isFoley = item.type === "foley";
                    const isVoice = item.type === "voice";
                    const canPreview =
                      Boolean(onPreviewClip) && (isVoice || isFoley);
                    const isPreviewing = previewingId === item.id;
                    const audioReady = hasPlayableHint(item);
                    const minW = isFoley
                      ? canPreview
                        ? 7
                        : 5
                      : isVoice
                        ? 10
                        : 8;
                    const isSelected = selectedId === item.id;
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "absolute top-1.5 bottom-1.5 flex overflow-hidden rounded-md border text-left shadow-sm transition-[box-shadow,transform,opacity]",
                          item.enabled ? meta.clip : meta.muted,
                          isSelected && "z-10 ring-2 ring-white/80",
                          dragId === item.id && "z-20 scale-[1.02] shadow-lg",
                          !item.enabled && "opacity-50",
                        )}
                        style={{
                          left: `${left}%`,
                          width: `${Math.max(minW, widthPct)}%`,
                        }}
                      >
                        {canPreview ? (
                          <button
                            type="button"
                            aria-label={
                              isPreviewing
                                ? "Stop preview"
                                : isVoice
                                  ? "Preview commentary"
                                  : "Preview Foley"
                            }
                            title={
                              isPreviewing
                                ? "Stop preview"
                                : isVoice
                                  ? audioReady
                                    ? "Preview this commentary"
                                    : "Generate & preview commentary voice"
                                  : "Preview this Foley"
                            }
                            className={cn(
                              "relative flex h-full w-7 shrink-0 items-center justify-center border-r border-black/20",
                              isPreviewing
                                ? "bg-black/45 text-white"
                                : "bg-black/25 text-white hover:bg-black/40",
                            )}
                            onPointerDown={(e) => {
                              e.stopPropagation();
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onPreviewClip?.(item);
                            }}
                          >
                            {isPreviewing ? (
                              <Pause className="h-3.5 w-3.5" />
                            ) : (
                              <Play className="h-3.5 w-3.5 fill-current" />
                            )}
                            <span
                              className={cn(
                                "absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full",
                                audioReady ? "bg-emerald-300" : "bg-amber-300",
                              )}
                              title={audioReady ? "Audio ready" : "Audio pending"}
                            />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={disabled}
                          title={`${detail}\n${formatClock(item.startMs)}${
                            item.endMs != null ? `–${formatClock(item.endMs)}` : ""
                          }\nDrag to move · double-click mute`}
                          onPointerDown={(e) => {
                            if (disabled) return;
                            e.currentTarget.setPointerCapture(e.pointerId);
                            dragSpanRef.current = itemSpanMs(item);
                            setDragId(item.id);
                            setSelectedId(item.id);
                            setDraft(view);
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            if (disabled) return;
                            commit(
                              view.map((it) =>
                                it.id === item.id
                                  ? { ...it, enabled: !it.enabled }
                                  : it,
                              ),
                            );
                          }}
                          className={cn(
                            "flex min-w-0 flex-1 items-center gap-1 text-left",
                            "cursor-grab active:cursor-grabbing disabled:cursor-not-allowed",
                            isFoley ? "px-1" : "px-1.5",
                          )}
                        >
                          {!isFoley ? (
                            <GripVertical className="h-3 w-3 shrink-0 opacity-40" />
                          ) : null}
                          <span
                            className={cn(
                              "min-w-0 truncate font-semibold leading-tight",
                              comfortable ? "text-[11px]" : "text-[10px]",
                              isFoley && "text-[9px]",
                            )}
                          >
                            {short}
                          </span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selected && !GAIN_LAYERS.has(selected.type) ? (
        <div className="space-y-1.5 border-t border-white/8 bg-black/40 px-3 py-2 text-[10px] text-white/55">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide text-white/70">
              {LAYER_META[selected.type].short}
            </span>
            <label className="inline-flex items-center gap-1 text-white/55">
              Start
              <input
                type="number"
                min={0}
                step={0.1}
                disabled={disabled}
                className="h-6 w-16 rounded border border-white/15 bg-black/40 px-1 font-mono text-[10px] text-white"
                defaultValue={(selected.startMs / 1000).toFixed(1)}
                key={`start-${selected.id}-${selected.startMs}`}
                onBlur={(e) => commitSelectedStartSec(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  }
                }}
              />
              <span className="text-white/35">s</span>
            </label>
            <span className="font-mono tabular-nums text-white/40">
              {formatClock(selected.startMs)}
              {selected.endMs != null ? ` → ${formatClock(selected.endMs)}` : ""}
            </span>
            <span className={selected.enabled ? "text-emerald-300/80" : "text-amber-300/80"}>
              {selected.enabled ? "Audible" : "Muted"}
            </span>
            {selected.type === "voice" ? (
              <span
                className={
                  hasPlayableHint(selected)
                    ? "text-emerald-300/80"
                    : "text-amber-300/80"
                }
              >
                {hasPlayableHint(selected) ? "Voice ready" : "Voice pending — tap ▶ or Retry TTS"}
              </span>
            ) : null}
            {selected.type === "voice" &&
            typeof selected.endMs === "number" &&
            selected.endMs > widthMs - 20 ? (
              <span className="text-amber-200/90">
                Line reaches clip end — drag earlier or shorten so it is not cut off
              </span>
            ) : null}
            {onPreviewClip &&
            (selected.type === "voice" || selected.type === "foley") ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md bg-white/10 px-1.5 py-0.5 font-semibold text-white/80 hover:bg-white/15"
                onClick={() => onPreviewClip(selected)}
              >
                {previewingId === selected.id ? (
                  <Pause className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
                {previewingId === selected.id ? "Stop" : "Preview"}
              </button>
            ) : null}
          </div>
          <p className="text-[12px] font-medium leading-snug text-white/90">
            {clipDetailLabel(selected)}
          </p>
          <p className="text-[9px] text-white/30">
            Drag the note (keeps length) or set Start · mute SRC/AMB/BGM rails for VO+Foley only · ▶
            to preview
          </p>
        </div>
      ) : (
        <p className="border-t border-white/8 px-3 py-1.5 text-[9px] text-white/30">
          Mute Original / Ambience / Music rails for commentary+Foley only · drag VO/SFX to place ·
          Save &amp; Render for Final Preview
        </p>
      )}
    </div>
  );
}
