import { useRef, type RefObject } from "react";
import { cn } from "../../lib/utils";

export const DEFAULT_TOP_CAPTION_PCT = { x: 50, y: 14 };
export const DEFAULT_BOTTOM_CAPTION_PCT = { x: 50, y: 86 };

export function clampCaptionPct(n: number, min = 6, max = 94): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n * 10) / 10));
}

export function overlayPctOrDefault(
  x: unknown,
  y: unknown,
  fallback: { x: number; y: number },
): { x: number; y: number } {
  return {
    x: Number.isFinite(Number(x)) ? clampCaptionPct(Number(x)) : fallback.x,
    y: Number.isFinite(Number(y)) ? clampCaptionPct(Number(y)) : fallback.y,
  };
}

type DraggableCaptionOverlayProps = {
  text: string;
  xPct: number;
  yPct: number;
  onChange: (xPct: number, yPct: number) => void;
  fontFamily: string;
  stageRef: RefObject<HTMLDivElement | null>;
  label: string;
};

export function DraggableCaptionOverlay({
  text,
  xPct,
  yPct,
  onChange,
  fontFamily,
  stageRef,
  label,
}: DraggableCaptionOverlayProps) {
  const draggingRef = useRef(false);

  const moveToPointer = (clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return;
    onChange(
      clampCaptionPct(((clientX - rect.left) / rect.width) * 100),
      clampCaptionPct(((clientY - rect.top) / rect.height) * 100),
    );
  };

  return (
    <div
      role="slider"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(yPct)}
      className={cn(
        "absolute z-20 max-w-[88%] px-2 text-center cursor-grab active:cursor-grabbing",
        "select-none touch-none rounded-md",
        "hover:ring-2 hover:ring-primary/50 focus-visible:ring-2 focus-visible:ring-primary",
      )}
      style={{
        left: `${xPct}%`,
        top: `${yPct}%`,
        transform: "translate(-50%, -50%)",
        fontFamily,
        fontWeight: 900,
      }}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        draggingRef.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        moveToPointer(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (!draggingRef.current) return;
        e.preventDefault();
        moveToPointer(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        draggingRef.current = false;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      }}
      onPointerCancel={() => {
        draggingRef.current = false;
      }}
    >
      <span className="block text-white text-lg sm:text-xl uppercase leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] pointer-events-none">
        {text}
      </span>
    </div>
  );
}
