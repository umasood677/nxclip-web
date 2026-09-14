import { type RefObject } from "react";
import { MIX_METER_BAR_COUNT, useMixAnalyser, useMixGraphTap } from "./useMixAnalyser";

type MixMeterBarsProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  bgmRef: RefObject<HTMLAudioElement | null>;
  tap: boolean;
  animate: boolean;
  videoKey?: string | null;
  bgmKey?: string | null;
  wake?: boolean;
  noiseReduced?: boolean;
};

/** Keep the Web Audio tap alive on polish even when the Audio tab is hidden. */
export function MixGraphTap({
  videoRef,
  bgmRef,
  tap,
  videoKey,
  bgmKey,
  wake,
  noiseReduced,
}: Omit<MixMeterBarsProps, "animate">) {
  useMixGraphTap({
    videoRef,
    bgmRef,
    tap,
    videoKey,
    bgmKey,
    wake,
    noiseReduced,
  });
  return null;
}

/** Isolated so FFT samples do not re-render the rest of Clip Editor. */
export function MixMeterBars({
  videoRef,
  bgmRef,
  tap,
  animate,
  videoKey,
  bgmKey,
}: MixMeterBarsProps) {
  const levels = useMixAnalyser({
    videoRef,
    bgmRef,
    tap,
    animate,
    videoKey,
    bgmKey,
  });

  return (
    <div
      className="flex items-end gap-1 h-[18px]"
      title="Live mix meter — follows clip + music volume and bass"
      aria-hidden
    >
      {Array.from({ length: MIX_METER_BAR_COUNT }, (_, i) => {
        const level = levels[i] ?? 0;
        return (
          <div
            key={i}
            className="w-1 bg-primary rounded-full origin-bottom"
            style={{
              height: `${4 + level * 14}px`,
              opacity: 0.2 + level * 0.8,
            }}
          />
        );
      })}
    </div>
  );
}
