import { useRef } from 'react';
import { CanonicalCaptionPreview } from './CanonicalCaptionPreview';
import { editorTypography } from '../../lib/clipTypography/editorTypography';
import { cn } from '../../lib/utils';

type PositionPatch = { positionX: number; verticalAnchor: number };

export type TypographyHitLayer = {
  id: string;
  positionX: number;
  verticalAnchor: number;
  startMs: number;
  endMs: number;
  /** Plan font size in layout pixels (e.g. 56 on 1080x1920). */
  fontSize?: number;
  /** Approximate line count for hit height. */
  lineCount?: number;
  text?: string;
};

/** Both editor stages share the same activation/locked/final-render gates. */
export function ClipTypographyOverlay({
  raw,
  timeMs,
  locked,
  finalRender = false,
  enabled,
  aspect = 9 / 16,
  interactive = false,
  layers = [],
  activeLayerId,
  onSelectLayer,
  onPositionChange,
}: {
  raw: unknown;
  timeMs: number;
  locked: boolean;
  finalRender?: boolean;
  enabled?: boolean;
  aspect?: number;
  /** When true, visible text layers are clickable/draggable on the clip. */
  interactive?: boolean;
  layers?: TypographyHitLayer[];
  activeLayerId?: string;
  onSelectLayer?: (layerId: string) => void;
  /** Drag updates for a specific layer (also selects it). */
  onPositionChange?: (layerId: string, patch: PositionPatch) => void;
}) {
  const state = editorTypography(raw, enabled);
  const draggingRef = useRef(false);
  const dragLayerIdRef = useRef<string | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  if (!state.active || locked || finalRender) return null;
  if (state.invalid) {
    return (
      <div role="alert" className="absolute bottom-2 text-xs pointer-events-none">
        Saved typography layout is invalid. Export requires repair.
      </div>
    );
  }
  if (!state.plan) return null;

  const plan = state.plan;
  const planW = Math.max(1, plan.width);
  const planH = Math.max(1, plan.height);

  const moveToPointer = (layerId: string, clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage || !onPositionChange) return;
    const rect = stage.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return;
    const x = Math.min(0.94, Math.max(0.06, (clientX - rect.left) / rect.width));
    // Pointer maps to baseline Y (glyphs sit above the baseline).
    const y = Math.min(0.94, Math.max(0.06, (clientY - rect.top) / rect.height));
    onPositionChange(layerId, { positionX: x, verticalAnchor: y });
  };

  const visibleLayers = layers.filter((l) => timeMs >= l.startMs && timeMs < l.endMs);

  return (
    <div ref={stageRef} className="absolute inset-0 z-20 pointer-events-none">
      <CanonicalCaptionPreview plan={plan} timeMs={timeMs} enabled={true} aspect={aspect} />
      {interactive && onPositionChange
        ? visibleLayers.map((layer) => {
            const active = layer.id === activeLayerId;
            const planLayer = plan.layers.find((pl) => pl.id === layer.id);
            const fontSize = Math.max(16, planLayer?.fontSize ?? layer.fontSize ?? 56);
            const padX = Math.max(6, fontSize * 0.18 + (planLayer?.outline ?? 0) + (planLayer?.shadow ?? 0) * 0.35);
            const padY = Math.max(4, fontSize * 0.22 + (planLayer?.outline ?? 0));

            let leftPct: number;
            let topPct: number;
            let widthPct: number;
            let heightPct: number;

            if (planLayer?.lines?.length) {
              // Hug the measured glyph boxes from the same plan the canvas draws.
              const minX = Math.min(...planLayer.lines.map((ln) => ln.x));
              const maxX = Math.max(...planLayer.lines.map((ln) => ln.x + ln.width));
              const minBase = Math.min(...planLayer.lines.map((ln) => ln.baseline));
              const maxBase = Math.max(...planLayer.lines.map((ln) => ln.baseline));
              const ascent = fontSize * 0.82;
              const descent = fontSize * 0.22;
              const boxLeft = Math.max(0, minX - padX);
              const boxRight = Math.min(planW, maxX + padX);
              const boxTop = Math.max(0, minBase - ascent - padY);
              const boxBottom = Math.min(planH, maxBase + descent + padY);
              leftPct = (boxLeft / planW) * 100;
              topPct = (boxTop / planH) * 100;
              widthPct = Math.max(4, ((boxRight - boxLeft) / planW) * 100);
              heightPct = Math.max(3, ((boxBottom - boxTop) / planH) * 100);
            } else {
              // Empty / not-yet-built layer: compact target at the draft anchor.
              const lines = Math.max(1, layer.lineCount ?? 1);
              heightPct = Math.min(18, ((fontSize * lines * 1.2) / planH) * 100);
              widthPct = 36;
              leftPct = layer.positionX * 100 - widthPct / 2;
              topPct = layer.verticalAnchor * 100 - heightPct;
            }

            return (
              <div
                key={layer.id}
                role="button"
                tabIndex={0}
                aria-label={active ? 'Drag caption on clip' : 'Select and drag caption layer'}
                aria-pressed={active}
                className={cn(
                  'absolute z-30 pointer-events-auto',
                  'cursor-grab active:cursor-grabbing select-none touch-none rounded-md',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
                  active
                    ? 'ring-1 ring-primary/55 bg-primary/10'
                    : 'hover:ring-1 hover:ring-white/35',
                )}
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                  minHeight: '1.1rem',
                }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelectLayer?.(layer.id);
                  draggingRef.current = true;
                  dragLayerIdRef.current = layer.id;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  moveToPointer(layer.id, e.clientX, e.clientY);
                }}
                onPointerMove={(e) => {
                  if (!draggingRef.current || dragLayerIdRef.current !== layer.id) return;
                  e.preventDefault();
                  moveToPointer(layer.id, e.clientX, e.clientY);
                }}
                onPointerUp={(e) => {
                  draggingRef.current = false;
                  dragLayerIdRef.current = null;
                  if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  }
                }}
                onPointerCancel={() => {
                  draggingRef.current = false;
                  dragLayerIdRef.current = null;
                }}
              />
            );
          })
        : null}
    </div>
  );
}
