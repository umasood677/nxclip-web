import { useMemo, useRef, useState } from 'react';
import { CanonicalCaptionPreview } from './CanonicalCaptionPreview';
import { editorTypography } from '../../lib/clipTypography/editorTypography';
import type { CanonicalTypographyLayout } from '../../lib/clipTypography/layoutContract';
import { cn } from '../../lib/utils';
// Note: editorTypography must be memoized on `raw` — validateTypographyLayout returns a
// new object every call, which would re-paint the canvas on every video timeupdate.

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

type LiveDrag = PositionPatch & { layerId: string };

/** Shift a plan layer's glyph boxes to a new normalized anchor (sync, no remasure). */
function planWithLivePosition(
  plan: CanonicalTypographyLayout,
  live: LiveDrag,
): CanonicalTypographyLayout {
  const layer = plan.layers.find((pl) => pl.id === live.layerId);
  if (!layer?.lines?.length) return plan;

  const inset = 0.08;
  const contentTop = plan.height * inset;
  const contentBottom = plan.height * (1 - inset);
  const contentHeight = Math.max(1, contentBottom - contentTop);
  const xs = layer.lines.map((l) => l.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs.map((x, i) => x + layer.lines[i]!.width));
  const oldAnchorX = Math.min(1, Math.max(0, (minX + maxX) / 2 / plan.width));
  const oldAnchorY = Math.min(
    1,
    Math.max(0, (layer.lines[0]!.baseline - contentTop) / contentHeight),
  );
  const dx = (live.positionX - oldAnchorX) * plan.width;
  const dy = (live.verticalAnchor - oldAnchorY) * contentHeight;
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return plan;

  return {
    ...plan,
    layers: plan.layers.map((pl) =>
      pl.id !== live.layerId
        ? pl
        : {
            ...pl,
            lines: pl.lines.map((ln) => {
              const x = Math.min(plan.width, Math.max(0, ln.x + dx));
              const width = Math.min(Math.max(0, ln.width), Math.max(0, plan.width - x));
              return {
                ...ln,
                // Clamp so live drag never fails layout validation (that blanked the canvas).
                x,
                baseline: Math.min(plan.height, Math.max(0, ln.baseline + dy)),
                width,
              };
            }),
          },
    ),
  };
}

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
  /** Drag commit for a specific layer (fired on pointer up — not every move). */
  onPositionChange?: (layerId: string, patch: PositionPatch) => void;
}) {
  // Stabilize plan identity across parent re-renders (playhead / volume / etc.).
  const state = useMemo(() => editorTypography(raw, enabled), [raw, enabled]);
  const draggingRef = useRef(false);
  const dragLayerIdRef = useRef<string | null>(null);
  const liveDragRef = useRef<LiveDrag | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [liveDrag, setLiveDrag] = useState<LiveDrag | null>(null);

  const displayPlan = useMemo(() => {
    if (!state.plan) return null;
    if (!liveDrag) return state.plan;
    return planWithLivePosition(state.plan, liveDrag);
  }, [state.plan, liveDrag]);

  if (!state.active || locked || finalRender) return null;
  if (state.invalid) {
    return (
      <div role="alert" className="absolute bottom-2 text-xs pointer-events-none">
        Saved typography layout is invalid. Export requires repair.
      </div>
    );
  }
  if (!state.plan || !displayPlan) return null;

  const plan = displayPlan;
  const planW = Math.max(1, plan.width);
  const planH = Math.max(1, plan.height);

  const pointerToPatch = (clientX: number, clientY: number): PositionPatch | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const rect = stage.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return null;
    return {
      positionX: Math.min(0.94, Math.max(0.06, (clientX - rect.left) / rect.width)),
      // Pointer maps to baseline Y (glyphs sit above the baseline).
      verticalAnchor: Math.min(0.94, Math.max(0.06, (clientY - rect.top) / rect.height)),
    };
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
            const padX = Math.max(
              6,
              fontSize * 0.18 + (planLayer?.outline ?? 0) + (planLayer?.shadow ?? 0) * 0.35,
            );
            const padY = Math.max(4, fontSize * 0.22 + (planLayer?.outline ?? 0));

            const live =
              liveDrag?.layerId === layer.id
                ? liveDrag
                : { positionX: layer.positionX, verticalAnchor: layer.verticalAnchor };

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
              leftPct = live.positionX * 100 - widthPct / 2;
              topPct = live.verticalAnchor * 100 - heightPct;
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
                  const patch = pointerToPatch(e.clientX, e.clientY);
                  if (patch) {
                    const next = { layerId: layer.id, ...patch };
                    liveDragRef.current = next;
                    setLiveDrag(next);
                  }
                }}
                onPointerMove={(e) => {
                  if (!draggingRef.current || dragLayerIdRef.current !== layer.id) return;
                  e.preventDefault();
                  const patch = pointerToPatch(e.clientX, e.clientY);
                  if (!patch) return;
                  const next = { layerId: layer.id, ...patch };
                  liveDragRef.current = next;
                  setLiveDrag(next);
                }}
                onPointerUp={(e) => {
                  const committed = liveDragRef.current;
                  draggingRef.current = false;
                  dragLayerIdRef.current = null;
                  liveDragRef.current = null;
                  setLiveDrag(null);
                  if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  }
                  if (committed && committed.layerId === layer.id) {
                    onPositionChange(layer.id, {
                      positionX: committed.positionX,
                      verticalAnchor: committed.verticalAnchor,
                    });
                  }
                }}
                onPointerCancel={() => {
                  draggingRef.current = false;
                  dragLayerIdRef.current = null;
                  liveDragRef.current = null;
                  setLiveDrag(null);
                }}
              />
            );
          })
        : null}
    </div>
  );
}
