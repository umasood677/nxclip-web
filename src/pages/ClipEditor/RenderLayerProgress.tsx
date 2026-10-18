import { Check, ChevronDown, Circle, Loader2, X } from "lucide-react";
import { cn } from "../../lib/utils";
import type { PersistedSoundDesign } from "./SoundDesignPanel";

export type RenderLayerId =
  | "prepare"
  | "original"
  | "ambience"
  | "voice"
  | "foley"
  | "music"
  | "captions"
  | "effects"
  | "encode";

export type RenderLayer = {
  id: RenderLayerId;
  label: string;
  short: string;
};

export type RenderLayerPhase = "idle" | "running" | "completed" | "failed";

type EdlRow = {
  type?: string;
  enabled?: boolean;
};

function edlHasType(edl: unknown[] | undefined, type: string): boolean {
  if (!Array.isArray(edl)) return false;
  return edl.some((raw) => {
    const row = raw as EdlRow;
    return row?.type === type && row.enabled !== false;
  });
}

/** Ordered burn-in checklist for Final Preview (EDL + polish features). */
export function buildRenderLayers(input: {
  soundDesign?: PersistedSoundDesign | null;
  soundDesignMixActive?: boolean;
  hasBgmTrack?: boolean;
  hasCaptions?: boolean;
  hasEffects?: boolean;
}): RenderLayer[] {
  const edl = Array.isArray(input.soundDesign?.audioEdl)
    ? input.soundDesign!.audioEdl!
    : undefined;
  const components = input.soundDesign?.components;
  const hasEdl = Array.isArray(edl) && edl.length > 0;
  const sdOn = Boolean(input.soundDesignMixActive || hasEdl || input.soundDesign?.audioStoryPlan);

  const layers: RenderLayer[] = [
    { id: "prepare", label: "Prepare assets", short: "Prep" },
    { id: "original", label: "Original audio", short: "SRC" },
  ];

  const includeAmb =
    edlHasType(edl, "ambience") ||
    (sdOn && components?.ambience !== false && !hasEdl);
  if (includeAmb) {
    layers.push({ id: "ambience", label: "Ambience", short: "AMB" });
  }

  const includeVoice =
    edlHasType(edl, "voice") ||
    (sdOn && Boolean(components?.aiCommentary) && !hasEdl);
  if (includeVoice) {
    layers.push({ id: "voice", label: "Commentary", short: "VO" });
  }

  const includeFoley =
    edlHasType(edl, "foley") ||
    (sdOn && components?.aiFoley !== false && !hasEdl);
  if (includeFoley) {
    layers.push({ id: "foley", label: "Foley", short: "SFX" });
  }

  const includeMusic =
    edlHasType(edl, "music") ||
    Boolean(input.hasBgmTrack) ||
    (sdOn && Boolean(components?.backgroundMusic) && !hasEdl);
  if (includeMusic) {
    layers.push({ id: "music", label: "Music", short: "BGM" });
  }

  if (input.hasCaptions) {
    layers.push({ id: "captions", label: "Captions & hooks", short: "CAP" });
  }

  if (input.hasEffects) {
    layers.push({ id: "effects", label: "Effects & polish", short: "FX" });
  }

  layers.push({ id: "encode", label: "Final encode", short: "MP4" });
  return layers;
}

/** Advance checklist while the worker only reports coarse queued/processing. */
export function estimateRenderLayerIndex(opts: {
  layerCount: number;
  startedAtMs: number;
  nowMs?: number;
  renderStatus?: string | null;
}): number {
  const count = Math.max(1, opts.layerCount);
  const status = String(opts.renderStatus || "").toLowerCase();
  // Fresh / queued / idle (or a stale "completed" from a prior job) always start
  // at Prep. Landing on the last layer is reserved for finishRenderLayerProgress.
  if (
    !status ||
    status === "queued" ||
    status === "idle" ||
    status === "completed" ||
    status === "failed"
  ) {
    return 0;
  }

  const elapsed = Math.max(0, (opts.nowMs ?? Date.now()) - opts.startedAtMs);
  // Hold the last layer (encode) until the job actually completes.
  const maxAuto = Math.max(0, count - 2);
  const perLayerMs = Math.max(3500, Math.min(10_000, 75_000 / count));
  return Math.min(maxAuto, Math.floor(elapsed / perLayerMs));
}

type BannerProps = {
  layers: RenderLayer[];
  currentIndex: number;
  phase: RenderLayerPhase;
  expanded: boolean;
  onToggle: () => void;
  className?: string;
};

export function RenderLayerProgressBanner({
  layers,
  currentIndex,
  phase,
  expanded,
  onToggle,
  className,
}: BannerProps) {
  if (!layers.length || phase === "idle") return null;

  const safeIndex = Math.max(0, Math.min(layers.length - 1, currentIndex));
  const doneCount =
    phase === "completed"
      ? layers.length
      : phase === "failed"
        ? safeIndex
        : safeIndex;
  const current = layers[safeIndex];

  const stepLabel =
    phase === "completed"
      ? `${layers.length}/${layers.length}`
      : phase === "failed"
        ? `${Math.min(safeIndex + 1, layers.length)}/${layers.length}`
        : `${Math.min(doneCount + 1, layers.length)}/${layers.length}`;

  const header =
    phase === "completed"
      ? `Ready · ${stepLabel}`
      : phase === "failed"
        ? `Failed · ${current?.short || "layer"}`
        : `${current?.short || "…"} · ${stepLabel}`;

  return (
    <div
      className={cn(
        "sticky top-0 z-40 overflow-hidden rounded-md border shadow-sm backdrop-blur-md",
        phase === "completed"
          ? "border-emerald-500/30 bg-emerald-500/10"
          : phase === "failed"
            ? "border-destructive/35 bg-destructive/10"
            : "border-amber-500/30 bg-amber-500/10",
        className,
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-2.5 py-1 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5"
        aria-expanded={expanded}
      >
        <span
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded",
            phase === "completed"
              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              : phase === "failed"
                ? "bg-destructive/20 text-destructive"
                : "bg-amber-500/20 text-amber-800 dark:text-amber-200",
          )}
        >
          {phase === "running" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : phase === "completed" ? (
            <Check className="h-3 w-3" />
          ) : (
            <X className="h-3 w-3" />
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-foreground">
          {header}
          {phase === "running" ? (
            <span className="ml-1.5 font-normal text-muted-foreground">
              · edits locked
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>

      {expanded ? (
        <ul className="flex flex-wrap gap-x-2 gap-y-0.5 border-t border-border/50 px-2.5 py-1">
          {layers.map((layer, i) => {
            const state =
              phase === "completed" || i < safeIndex
                ? "done"
                : phase === "failed" && i === safeIndex
                  ? "failed"
                  : phase === "running" && i === safeIndex
                    ? "current"
                    : "pending";
            return (
              <li
                key={layer.id}
                className={cn(
                  "inline-flex items-center gap-1 text-[10px]",
                  state === "current" && "font-semibold text-amber-800 dark:text-amber-200",
                  state === "failed" && "font-semibold text-destructive",
                  state === "done" && "text-muted-foreground/80",
                  state === "pending" && "text-muted-foreground/45",
                )}
              >
                {state === "done" ? (
                  <Check className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                ) : state === "current" ? (
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                ) : state === "failed" ? (
                  <X className="h-2.5 w-2.5 text-destructive" />
                ) : (
                  <Circle className="h-2 w-2" />
                )}
                <span>{layer.short}</span>
                {i < layers.length - 1 ? (
                  <span className="text-muted-foreground/30">·</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
