import { useRef } from 'react';
import { CanonicalCaptionPreview } from './CanonicalCaptionPreview';
import { editorTypography } from '../../lib/clipTypography/editorTypography';
import { cn } from '../../lib/utils';

type PositionPatch = { positionX: number; verticalAnchor: number };

/** Both editor stages share the same activation/locked/final-render gates. */
export function ClipTypographyOverlay({
  raw,
  timeMs,
  locked,
  finalRender = false,
  enabled,
  aspect = 9 / 16,
  interactive = false,
  positionX = 0.5,
  verticalAnchor = 0.72,
  onPositionChange,
}: {
  raw: unknown;
  timeMs: number;
  locked: boolean;
  finalRender?: boolean;
  enabled?: boolean;
  aspect?: number;
  /** When true, shows a grab handle so placement can be dragged on the clip. */
  interactive?: boolean;
  positionX?: number;
  verticalAnchor?: number;
  onPositionChange?: (patch: PositionPatch) => void;
}) {
  const state = editorTypography(raw, enabled);
  const draggingRef = useRef(false);
  const stageRef = useRef<HTMLDivElement | null>(null);

  if (!state.active || locked || finalRender) return null;
  if (state.invalid) {
    return (
      <div role="alert" className="absolute bottom-2 text-xs">
        Saved typography layout is invalid. Export requires repair.
      </div>
    );
  }
  if (!state.plan) return null;

  const moveToPointer = (clientX: number, clientY: number) => {
    const stage = stageRef.current?.parentElement;
    if (!stage || !onPositionChange) return;
    const rect = stage.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return;
    const x = Math.min(0.94, Math.max(0.06, (clientX - rect.left) / rect.width));
    const y = Math.min(0.94, Math.max(0.06, (clientY - rect.top) / rect.height));
    onPositionChange({ positionX: x, verticalAnchor: y });
  };

  return (
    <>
      <CanonicalCaptionPreview plan={state.plan} timeMs={timeMs} enabled={true} aspect={aspect} />
      {interactive && onPositionChange ? (
        <div
          ref={stageRef}
          role="slider"
          aria-label="Drag caption placement on clip"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(verticalAnchor * 100)}
          className={cn(
            'absolute z-30 min-h-[3.5rem] w-[min(90%,22rem)] max-w-[90%] px-3 py-4 text-center',
            'cursor-grab active:cursor-grabbing select-none touch-none rounded-2xl',
            'border border-transparent hover:border-primary/50 hover:bg-primary/10',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          )}
          style={{
            left: `${positionX * 100}%`,
            top: `${verticalAnchor * 100}%`,
            transform: 'translate(-50%, -50%)',
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
          <span className="pointer-events-none mx-auto block w-fit rounded-full bg-background/80 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary shadow-sm">
            Drag caption
          </span>
        </div>
      ) : null}
    </>
  );
}
