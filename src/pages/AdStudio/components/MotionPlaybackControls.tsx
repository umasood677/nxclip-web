import React from "react";
import {
  Pause,
  Play,
  RotateCcw,
  SkipBack,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";
import { formatTimecode } from "../lib/motionTimeline";

type Props = {
  currentTimeMs: number;
  durationMs: number;
  fps: number;
  playing: boolean;
  loop: boolean;
  playbackRate: number;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onToggleLoop: () => void;
  onPlaybackRateChange: (rate: number) => void;
  className?: string;
};

const RATES = [0.25, 0.5, 1, 1.5, 2] as const;

export function MotionPlaybackControls({
  currentTimeMs,
  durationMs,
  fps,
  playing,
  loop,
  playbackRate,
  onPlay,
  onPause,
  onRestart,
  onToggleLoop,
  onPlaybackRateChange,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-2",
        className,
      )}
      role="group"
      aria-label="Animation playback. Space bar toggles play and pause."
    >
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="h-8 w-8"
        aria-label="Restart"
        onClick={onRestart}
      >
        <SkipBack size={14} aria-hidden />
      </Button>
      <Button
        type="button"
        size="icon"
        variant={playing ? "default" : "outline"}
        className="h-8 w-8"
        aria-label={playing ? "Pause" : "Play"}
        onClick={() => (playing ? onPause() : onPlay())}
      >
        {playing ? <Pause size={14} aria-hidden /> : <Play size={14} aria-hidden />}
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        aria-label="Restart from beginning"
        onClick={onRestart}
      >
        <RotateCcw size={14} aria-hidden />
      </Button>

      <div
        className="font-mono text-xs tabular-nums text-foreground min-w-[7.5rem]"
        aria-live="polite"
      >
        {formatTimecode(currentTimeMs, fps)}
        <span className="text-muted-foreground"> / </span>
        {formatTimecode(durationMs, fps)}
      </div>

      <Button
        type="button"
        size="sm"
        variant={loop ? "default" : "outline"}
        className="h-8 text-xs"
        aria-pressed={loop}
        onClick={onToggleLoop}
      >
        Loop
      </Button>

      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        Speed
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
          aria-label="Playback speed"
          value={playbackRate}
          onChange={(e) => onPlaybackRateChange(Number(e.target.value))}
        >
          {RATES.map((r) => (
            <option key={r} value={r}>
              {r}×
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
